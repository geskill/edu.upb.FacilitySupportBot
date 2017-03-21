// read from '.env'-file
require('dotenv').config();

var Botkit = require('botkit');

var controller = Botkit.botframeworkbot({
    debug: process.env.APP_DEBUG || true,
    hostname: process.env.APP_HOSTNAME || '127.0.0.1'
});

var bot = controller.spawn({
    appId: process.env.APP_BOT_ID || 'c8ab93a2-4cfb-4d3a-86a9-1f0a350f6b65',
    appPassword: process.env.APP_BOT_PASSWORD
});

var googleMapsClient = require('@google/maps').createClient({
    key: process.env.APP_GOOGLE_MAPS_API_KEY
});

var listReply = function (message, title, elements) {
    bot.reply(message, { 'text': '', 'attachments': [{ 'contentType': 'application/vnd.microsoft.card.hero', 'content': { 'text': title, 'buttons': elements } }] });
};

var defaultReply = function (message) {
    // TODO: build default reply based upon already answered questions // todo questions
    var identity = message.address.user;
    bot.reply(message, 'Hello ' + identity.name + ', what is the address of your current location?');
};

var saveAddress = function (message, id, city, street) {
    controller.storage.users.save({ id: id, city: city, street: street }, function (err) {
        if (!city) {
            bot.reply(message, 'What is the name of the city you are located at?');
        } else if (!street) {
            bot.reply(message, 'What is the name and number of the street you are located at?');
        } else {
            // TODO: check, whether What and where is already checked
            bot.reply(message, 'What happened in ' + city + ' and where exactly?');
        }
    });
};

var saveAndStandardizeAddress = function (message, id, city, street) {
    if (city && street) {
        googleMapsClient.geocode({
            address: city + ', ' + street
        }, function (err, response) {
            if (!err) {
                switch (response.json.results.length) {
                    case 0:
                        askAddressError(message);
                        break;
                    case 1:
                        {
                            var streetnumber;
                            for (let address_component of response.json.results[0].address_components) {
                                for (let type of address_component.types) {
                                    if (type == 'street_number') {
                                        streetnumber = address_component.long_name;
                                    } else if (type == 'route') {
                                        street = address_component.long_name;
                                    } else if (type == 'locality') {
                                        city = address_component.long_name;
                                    }
                                }
                            }
                            street += ' ' + streetnumber;
                            saveAddress(message, id, city, street);
                            break;
                        }
                    default:
                        {
                            var choices = [];
                            for (let result of response.json.results) {
                                choices.push({
                                    'type': 'imBack',
                                    'title': result.formatted_address,
                                    'value': "I am in " + result.formatted_address
                                });
                            }

                            listReply(message, 'It seems there are multiple choices on your location, please select:', choices);
                        }
                }
            } else {
                askAddressError(message);
            }
        });
    } else {
        saveAddress(message, id, city, street);
    }
};

var askAddressError = function (message) {
    bot.reply(message, 'It seems the address does not exists. What is the address of your current location?');
};

// if you are already using Express, you can use your own server instance...
// see 'Use BotKit with an Express web server'
controller.setupWebserver(process.env.PORT || 3000, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver, bot, function () {
        console.log('This bot is online!!!');
    });
});

// your bot was added to a conversation or other conversation metadata changed
controller.on('conversationUpdate', function (bot, message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id == message.address.bot.id) {
                // Bot is joining conversation
                // - For WebChat channel you'll get this on page load.
                // bot.reply(message, 'Hello, what is the address of your current location?');

            } else {
                // User is joining conversation
                // - For WebChat channel this will be sent when user sends first message.
                // - When a user joins a conversation the address.user field is often for
                //   essentially a system account so to ensure we're targeting the right 
                //   user we can tweek the address object to reference the joining user.
                // - If we wanted to send a private message to teh joining user we could
                //   delete the address.conversation field from the cloned address.
                defaultReply(message);
            }
        });
    }
});

/*
 * Microsoft LUIS
 */
var luis = require('botkit-middleware-luis');
var luisOptions = { serviceUri: process.env.APP_LUIS_SERVICE_URI };
controller.middleware.receive.use(luis.middleware.receive(luisOptions));

controller.hears(['LUIS'], ['direct_message', 'direct_mention', 'mention', 'message_received'], luis.middleware.hereIntent, function (bot, message) {

    var id = message.address.user.name;
    if (message.topIntent.score < 0.5) {
        defaultReply(message);
    } else {
        switch (message.topIntent.intent) {
            case 'ProvideLocation':
                controller.storage.users.get(id, function (err, user) {
                    var city, street;
                    if (user) {
                        city = user.city;
                        street = user.street;
                    }

                    for (let entity of message.entities) {
                        switch (entity.type) {
                            case 'builtin.geography.city':
                                city = entity.entity;
                                break;
                            case 'StreetAndNumber':
                                street = entity.entity;
                                break;
                        }
                    }

                    saveAndStandardizeAddress(message, id, city, street);
                });
                break;
            
            default:
                defaultReply(message);
        }
    }
});


/*

// user said hello
controller.hears(['hello'], 'message_received', function (bot, message) {

    bot.reply(message, 'Hey there.');

});

controller.hears(['cookies'], 'message_received', function (bot, message) {

    bot.startConversation(message, function (err, convo) {

        convo.say('Did someone say cookies!?!!');
        convo.ask('What is your favorite type of cookie?', function (response, convo) {
            convo.say('Golly, I love ' + response.text + ' too!!!');
            convo.next();
        });
    });
});

*/