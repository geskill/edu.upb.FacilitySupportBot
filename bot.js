// read from '.env'-file
require('dotenv').config();

var limdu = require('limdu');
var MyDecisionTree = limdu.classifiers.DecisionTree.bind(this, {});

var intentClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
	binaryClassifierType: MyDecisionTree
});

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

var getUserId = function (message) {
    return message.address.user.name;
};

var defaultReply = function (message, id) {
    controller.storage.users.get(id, function (err, user) {
        if (!user || !user.city || !user.street) {
            bot.reply(message, 'What is the address of your current location?');
        } else {
            // TODO add more 'states'
            bot.reply(message, 'What happened in ' + user.city + ' and where exactly?');
        }
    });
};

var saveConversationStart = function (message, id) {
    controller.storage.users.save({ id: id, conversationStartDate: Date.now() }, function (err) {
        bot.reply(message, 'Hello ' + id + ', what is the address of your current location?');
    });
};

var saveAddress = function (message, id, city, street) {
    controller.storage.users.get(id, function (err, user) {
        user.city = city;
        user.street = street;
        controller.storage.users.save(user, function (err) {
            if (!city) {
                bot.reply(message, 'What is the name of the city you are located at?');
            } else if (!street) {
                bot.reply(message, 'What is the name and number of the street you are located at?');
            } else {
                defaultReply(message, id);
            }
        });
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
                                    switch (type) {
                                        case 'street_number':
                                            streetnumber = address_component.long_name;
                                            break;
                                        case 'route':
                                            street = address_component.long_name;
                                            break;
                                        case 'locality':
                                            city = address_component.long_name;
                                            break;
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
                                    'value': 'I am in ' + result.formatted_address
                                });
                            }

                            listReply(message, 'There are multiple choices on your location, please select (if you can not find your address please write it again):', choices);
                        }
                }
            } else {
                // Google service error
                askAddressError(message);
            }
        });
    } else {
        saveAddress(message, id, city, street);
    }
};

var askAddressError = function (message) {
    bot.reply(message, 'The address could not be found. Please write it again.');
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
                saveConversationStart(message, getUserId(message));
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

    var id = getUserId(message);
    if (message.topIntent.score < 0.5) {
        defaultReply(message, id);
    } else {
        switch (message.topIntent.intent) {
            case 'ProvideLocation':
                {
                    controller.storage.users.get(id, function (err, user) {
                        var city, street;
                        if (user) {
                            city = user.city;
                            street = user.street;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                // TODO: add: case 'ZipCode':
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
                }
            default:
                defaultReply(message, id);
        }
    }
});

/*
 * Google Api.ai
 *
var apiai = require('botkit-middleware-apiai')({
    token: process.env.APP_APIAI_CLIENT_ACCESS_TOKEN,
    skip_bot: true // or false. If true, the middleware don't send the bot reply/says to api.ai
});
controller.middleware.receive.use(apiai.receive);

// apiai.hears for intents. in this example is 'hello' the intent
controller.hears(['ProvideLocation'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

    var id = getUserId(message);
    controller.storage.users.get(id, function (err, user) {
        var city, street;
        if (user) {
            city = user.city;
            street = user.street;
        }

        // date-time

        if (message.entities['zip-code']) {
            city = message.entities['zip-code'];
        }
        if (message.entities['geo-city']) {
            city = message.entities['geo-city'];
        }
        if (message.entities['street-address']) {
            street = message.entities['street-address'].join(' ');
        }

        saveAndStandardizeAddress(message, id, city, street);
    });

});

/*
 * Recast.ai
 *
var recastai = require('botkit-middleware-recastai')({
    request_token: process.env.APP_RECASTAI_REQUEST_ACCESS_TOKEN,
    confidence: 0.4
});
controller.middleware.receive.use(recastai.receive);

controller.hears(['default'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {
    defaultReply(message, id);
});

controller.hears(['provide-location'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {

    var id = getUserId(message);
    controller.storage.users.get(id, function (err, user) {
        var city, street;
        if (user) {
            city = user.city;
            street = user.street;
        }

        // date-time

        if (message.entities['zip-code']) {
            city = message.entities['zip-code'];
        }
        if (message.entities['geo-city']) {
            city = message.entities['geo-city'];
        }
        if (message.entities['street-address']) {
            street = message.entities['street-address'].join(' ');
        }

        saveAndStandardizeAddress(message, id, city, street);
    });

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