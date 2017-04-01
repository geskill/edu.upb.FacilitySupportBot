// read from '.env'-file
require('dotenv').config();

var limdu = require('limdu');
var decisionTree = limdu.classifiers.DecisionTree.bind(this, {});

var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree
});

var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree
});

var incidentTypeToJobsMapping = require('./jobs.json');

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

var defaultReply = function (message, id, error) {
    controller.storage.users.get(id, function (err, user) {
        if (error) {
            user.errorCount += 1;
            if (user.errorCount >= 2) {
                bot.reply(message, 'Sorry, your information could not be recognized. Please try again and use a different wording.');
            }
            if (user.errorCount >= 3) {
                serviceReply(message, id);
            }
        } else {
            user.errorCount = 0;
        }

        if (!user || !user.city || !user.street) {
            bot.reply(message, 'What is the address of your current location?');
        } else if (!user.type || !user.priority) {
            bot.reply(message, 'What happened in ' + user.city + ' and where exactly?');
        } else if (!user.time) {
            bot.reply(message, 'When did it happen?');
        } else if (!user.urgency) {
            bot.reply(message, 'Are there people in danger? (Eg locked in elevators)');
        } else if (!user.name || !user.email || !user.phone) {
            bot.reply(message, 'Can you please tell me your name and contact?');
        } else {
            // TODO: Improve finished info
            bot.reply(message, 'Thank you very much, Mrs. Mustermann, your message has been recorded. The technician will be informed and will contact you if you have any questions.');
        }
    });
};

var serviceReply = function (message, id) {
    bot.reply(message, 'Please hold on. A service employee will soon take on the conversation.');
};

var saveConversationStart = function (message, id) {
    controller.storage.users.save({ id: id, conversationStartDate: Date.now(), errorCount: 0 }, function (err) {
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

var saveIncidentAndPosition = function (message, id, reference, symptom, position, area, number) {
    controller.storage.users.get(id, function (err, user) {
        if (reference) { user.reference = reference; }
        if (symptom) { user.symptom = symptom; }
        if (position) { user.position = position; }
        if (area) { user.area = area; }
        if (number) { user.number = number; }
        var positionsNeedNone = ['basement', 'boiler room', 'boxroom', 'building', 'building wall', 'café', 'cafeteria',
            'cellar', 'customer area', 'dining hall', 'entire building', 'entrance area', 'entrance hall', 'entrance room',
            'entrance stairway', 'facade', 'facility', 'foyer', 'front door', 'garden', 'hallway', 'here', 'information area',
            'lavatory', 'lobby', 'lounge', 'outside', 'parking lot', 'reception', 'reception area', 'roller door', 'roof',
            'security area', 'sidewalk', 'storage room', 'storage space', 'store room', 'storeroom', 'technical room',
            'trash', 'washroom', 'whole building'];
        var positionsNeedNumber = ['hall', 'office', 'open-plan office', 'room', 'work place', 'workplace', 'workstation'];
        controller.storage.users.save(user, function (err) {
            if (!user.reference || !user.symptom) {
                bot.reply(message, 'What exactly happened?');
            } else if (!user.position) {
                bot.reply(message, 'Where exactly?');
            } else if (positionsNeedNumber.includes(user.position)) {
                bot.reply(message, 'Whats your room number?');
            } else if (!positionsNeedNone.includes(user.position)) {
                bot.reply(message, 'Whats your area or floor?');
            } else {
                classifyIncidentType(message, id);
            }
        });
    });
};

var classifyIncidentType = function (message, id) {
    controller.storage.users.get(id, function (err, user) {
        var reference, symptom, position;
        reference = user.reference;
        symptom = user.symptom;
        position = user.position;

        // TODO: select reference, symptom
        var intentTypes = intentTypeClassifier.classify({ 'reference': 'A', 'symptom': 'B' });

        switch (intentTypes.length) {
            case 0:
                var choices = [];
                choices.push({
                    'type': 'postBack',
                    'title': 'Defect',
                    'value': 'provide-incident-type-defect'
                });
                choices.push({
                    'type': 'postBack',
                    'title': 'Retry',
                    'value': 'delete-incident-information'
                });
                choices.push({
                    'type': 'postBack',
                    'title': 'Contact service',
                    'value': 'contact'
                });

                listReply(message, 'The incident could not be classified. Please select or answer "what happened and where?" again:', choices);
                break;
            case 1:
                classifyIncidentPriority(message, id, intentTypes[0]);
                break;
            default:
                {
                    var choices = [];
                    for (let type of intentTypes) {
                        choices.push({
                            'type': 'postBack',
                            'title': type,
                            'value': 'provide-incident-type-' + type.toLowerCase()
                        });
                    }
                    choices.push({
                        'type': 'postBack',
                        'title': 'Contact service',
                        'value': 'contact'
                    });

                    listReply(message, 'There are multiple choices on your incident type. Please select or contact service if not listed below:', choices);
                }
        }
    });
};

var deleteIncidentInformation = function (message, id) {
    controller.storage.users.get(id, function (err, user) {
        delete user.reference;
        delete user.symptom;
        controller.storage.users.save(user, function (err) {
            defaultReply(message, id);
        });
    });
};

var classifyIncidentPriority = function (message, id, type) {
    controller.storage.users.get(id, function (err, user) {
        var position;
        position = user.position;

        var intentPriorities = intentTypeClassifier.classify({ 'type': type, 'position': position });

        switch (intentTypes.length) {
            case 0:
                // TODO: was überlegen
                break;
            case 1:
                saveIncidentTypeAndPriority(message, id, type, intentPriorities[0]);
                break;
            default:
                {
                    // TODO: was überlegen
                }
        }
    });
};

var saveIncidentTypeAndPriority = function (message, id, type, priority) {
    controller.storage.users.get(id, function (err, user) {
        if (type) { user.type = type; }
        if (priority) { user.priority = priority; }
        controller.storage.users.save(user, function (err) {
            defaultReply(message, id);
        });
    });
};

var saveIncidentTime = function (message, id, time) {
    controller.storage.users.get(id, function (err, user) {
        if (time) { user.time = time; }
        controller.storage.users.save(user, function (err) {
            defaultReply(message, id);
        });
    });
};

var saveIncidentUrgency = function (message, id, urgency) {
    controller.storage.users.get(id, function (err, user) {
        if (urgency) { user.urgency = urgency; }
        controller.storage.users.save(user, function (err) {
            defaultReply(message, id);
        });
    });
};

var saveIncidentPersonalInformation = function (message, id, name, email, phone) {
    controller.storage.users.get(id, function (err, user) {
        if (name) { user.name = name; }
        if (email) { user.email = email; }
        if (phone) { user.phone = phone; }
        controller.storage.users.save(user, function (err) {
            defaultReply(message, id);
        });
    });
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
        defaultReply(message, id, true);
    } else {
        switch (message.topIntent.intent) {
            case 'ProvideLocation':
                {
                    controller.storage.users.get(id, function (err, user) {
                        var city, zipcode, street, number;
                        if (user) {
                            city = user.city;
                            street = user.street;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case 'City':
                                    city = entity.entity;
                                    break;
                                case 'Zipcode':
                                    zipcode = entity.entity;
                                    break;
                                case 'Street':
                                    street = entity.entity;
                                    break;
                                case 'Number':
                                    number = entity.entity;
                                    break;
                            }
                        }

                        if (!city && zipcode) {
                            city = zipcode;
                        }

                        if (!street.match(/\d+/g)) {
                            street += number;
                        }

                        saveAndStandardizeAddress(message, id, city, street);
                    });
                    break;
                }
            case 'ProvideIncidentAndPosition':
                {
                    controller.storage.users.get(id, function (err, user) {
                        var reference, symptom, position, area, number;
                        if (user) {
                            reference = user.reference;
                            symptom = user.symptom;
                            position = user.position;
                            area = user.area;
                            number = user.number;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case 'Reference':
                                    reference = entity.entity;
                                    break;
                                case 'Symptom':
                                    symptom = entity.entity;
                                    break;
                                case 'Position':
                                    position = entity.entity;
                                    break;
                                case 'AreaOrFloor':
                                    area = entity.entity;
                                    break;
                                case 'Number':
                                    number = entity.entity;
                                    break;
                            }
                        }

                        saveIncidentAndPosition(message, id, reference, symptom, position, area, number);
                    });
                    break;
                }
            case 'ProvideIncidentTime':
                {
                    controller.storage.users.get(id, function (err, user) {
                        var time;
                        if (user) {
                            time = user.time;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case '???':
                                    time = entity.entity;
                                    break;
                            }
                        }

                        saveIncidentTime(message, id, time);
                    });
                    break;
                }
            case 'ProvideIncidentUrgency':
                {
                    controller.storage.users.get(id, function (err, user) {
                        var urgency;
                        if (user) {
                            urgency = user.urgency;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case '???':
                                    urgency = entity.entity;
                                    break;
                            }
                        }

                        saveIncidentUrgency(message, id, urgency);
                    });
                    break;
                }
            case 'ProvidePersonalInformation':
                {
                    controller.storage.users.get(id, function (err, user) {
                        var name, email, phone;
                        if (user) {
                            name = user.name;
                            email = user.email;
                            phone = user.phone;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case 'Name':
                                    name = entity.entity;
                                    break;
                                case 'Email':
                                    email = entity.entity;
                                    break;
                                case 'Phone':
                                    phone = entity.entity;
                                    break;
                            }
                        }

                        saveIncidentPersonalInformation(message, id, name, email, phone);
                    });
                    break;
                }
            default:
                defaultReply(message, id, true);
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

controller.hears(['None'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {
    defaultReply(message, id, true);
});

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

controller.hears(['ProvideIncidentAndPosition'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

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

controller.hears(['ProvideIncidentTime'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

    var id = getUserId(message);
    controller.storage.users.get(id, function (err, user) {
        var time;
        if (user) {
            time = user.time;
        }

        if (message.entities['TODO']) {
            time = message.entities['TODO'];
        }

        saveIncidentTime(message, id, time);
    });

});

controller.hears(['ProvideIncidentUrgency'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

    var id = getUserId(message);
    controller.storage.users.get(id, function (err, user) {
        var urgency;
        if (user) {
            urgency = user.urgency;
        }

        if (message.entities['TODO']) {
            urgency = message.entities['TODO'];
        }

        saveIncidentUrgency(message, id, urgency);
    });

});

controller.hears(['ProvidePersonalInformation'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

    var id = getUserId(message);
    controller.storage.users.get(id, function (err, user) {
        var name, lastName, email, phone;
        if (user) {
            name = user.name;
            email = user.email;
            phone = user.phone;
        }

        if (message.entities['given-name']) {
            name = message.entities['given-name'];
        }
        if (message.entities['last-name']) {
            lastName = message.entities['last-name'];
        }
        if (message.entities['email']) {
            email = message.entities['email'];
        }
        if (message.entities['phone-number']) {
            phone = message.entities['phone-number'];
        }

        // if ()

        saveIncidentPersonalInformation(message, id, name, email, phone);
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
    defaultReply(message, id, true);
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

controller.hears(['provide-personal-information'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {

    var id = getUserId(message);
    controller.storage.users.get(id, function (err, user) {
        var name, lastName, email, phone;
        if (user) {
            name = user.name;
            email = user.email;
            phone = user.phone;
        }

        if (message.entities['given-name']) {
            name = message.entities['given-name'];
        }
        if (message.entities['last-name']) {
            lastName = message.entities['last-name'];
        }
        if (message.entities['email']) {
            email = message.entities['email'];
        }
        if (message.entities['phone-number']) {
            phone = message.entities['phone-number'];
        }

        // if ()

        saveIncidentPersonalInformation(message, id, name, email, phone);
    });

});

/*
 * Rule-based / pattern matching
 */

controller.hears(['contact'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = getUserId(message);
    serviceReply(message, id);
});

controller.hears(['provide-incident-type-(.*)'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = getUserId(message);
    saveIncidentType(message, id, message.match[1]);
});

controller.hears(['delete-incident-information'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = getUserId(message);
    deleteIncidentInformation(message, id);
});