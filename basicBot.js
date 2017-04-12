// read from '.env'-file
require('dotenv').config();

var incidentTypeToJobsMapping = require('./jobs.json');
var incidentTypeToTimeMapping = require('./time.json');
var positionDefinitions = require('./positionDefinitions.json');

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

var limdu = require('limdu');
var decisionTree1 = limdu.classifiers.DecisionTree.bind(this, {});
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree1
});

var incidentClassification = require('./classification.json');
let incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
    if (!set.input.reference)
        set.input.reference = set.input.position;
    delete set.input.position;
    set.output = set.output.type;
}
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);

var decisionTree2 = limdu.classifiers.DecisionTree.bind(this, {});
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree2
});

let priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of priorityTypeClassification.trainset) {
    if (!set.input.position)
        set.input.position = set.input.reference;
    delete set.input.reference;
    set.output = set.output.priority;
}
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);

var includeThe = function (text) {
    var text = text.trim();
    return text.startsWith('the') ? text : 'the ' + text;
};

bot.listReply = function (message, title, elements) {
    bot.reply(message, { 'text': '', 'attachments': [{ 'contentType': 'application/vnd.microsoft.card.hero', 'content': { 'text': title, 'buttons': elements } }] });
};

bot.getUserId = function (message) {
    return message.address.user.name;
};

bot.defaultReply = function (message, id, error) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (error) {
            user.errorCount += 1;
            if (user.errorCount >= 2) {
                bot.reply(message, 'Sorry, your information could not be recognized. Please try again and use a different wording.');
            }
            if (user.errorCount >= 3) {
                bot.serviceReply(message, id);
            }
        } else {
            user.errorCount = 0;
        }

        if (!user || !user.city || !user.street) {
            bot.reply(message, 'What is the address of your current location?');
        } else if (!user.type || (!user.priority && !user.urgency)) {
            bot.reply(message, 'What happened in ' + user.city + ' and where exactly?');
        } else if (!user.time) {
            bot.reply(message, 'When did it happen?');
        } else if (!user.name && !user.email && !user.phone) {
            bot.reply(message, 'Can you please tell me your name and contact?');
        } else {
            var jobs;
            if (user.jobs.length > 1) {
                jobs = user.jobs.slice(0, -1).join(', ') + ' or ' + user.jobs.slice(-1);
            } else {
                jobs = user.jobs[0];
            }

            var time;
            if (user.priority) {
                time = incidentTypeToTimeMapping.priority[user.priority];
            } else {
                time = incidentTypeToTimeMapping.urgency[user.urgency];
            }

            // TODO: Improve
            bot.reply(message, 'Thank you very much, Sir or Madam ' + (user.name || id) + ', your message has been recorded. The ' +
                jobs + ' will be informed and will contact you if you have any questions. (' +
                (user.priority ? 'priority' : 'urgency') + ' lvl ' + (user.priority ? user.priority : user.urgency) + ' [ETA ' + time + '])');
        }
    });
};

bot.serviceReply = function (message, id) {
    bot.reply(message, 'Please hold on. A service employee will soon take on the conversation.');
};

bot.saveConversationStart = function (message, id, added) {
    var user = { id: id, conversationStartDate: Date.now(), errorCount: 0 };
    bot.botkit.storage.users.save(user, function (err) {
        if (added) {
            bot.reply(message, 'Hello ' + id + ', what is the address of your current location?');
        }
    });
    return user;
};

bot.saveAddress = function (message, id, city, street) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (city) { user.city = city; }
        if (street) { user.street = street; }
        bot.botkit.storage.users.save(user, function (err) {
            if (!city) {
                bot.reply(message, 'What is the name of the city you are located at?');
            } else if (!street) {
                bot.reply(message, 'What is the name and number of the street you are located at?');
            } else {
                bot.defaultReply(message, id);
            }
        });
    });
};

bot.saveAndStandardizeAddress = function (message, id, city, street, time) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (time) { user.time = time; }
        bot.botkit.storage.users.save(user, function (err) { });
    });
    if (city && street) {
        googleMapsClient.geocode({
            address: city + ', ' + street
        }, function (err, response) {
            if (!err) {
                switch (response.json.results.length) {
                    case 0:
                        bot.askAddressError(message);
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
                            console.log('info: Recognized address: ' + city + ' ' + street);
                            bot.saveAddress(message, id, city, street);
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

                            bot.listReply(message, 'There are multiple choices on your location, please select (if you can not find your address please write it again):', choices);
                        }
                }
            } else {
                // Google service error
                bot.askAddressError(message);
            }
        });
    } else {
        bot.saveAddress(message, id, city, street);
    }
};

bot.saveIncidentAndPosition = function (message, id, reference, symptom, position, orientation, floor, number) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (reference) { user.reference = reference; }
        if (symptom) { user.symptom = symptom; }
        if (position) { user.position = position; }
        if (orientation) { user.orientation = orientation; }
        if (floor) { user.floor = floor; }
        if (number) { user.number = number; }
        bot.botkit.storage.users.save(user, function (err) {
            if (!user.reference && !user.symptom) { // reference or symptom is required
                if (!user.position && !user.floor) {
                    bot.reply(message, 'What exactly happened?');
                } else {
                    bot.reply(message, 'What exactly happened in ' + includeThe(user.position || user.floor) + '?');
                }
            } else if (!user.position && !user.orientation && !user.floor) { // position, orientation or floor is required
                if (!user.reference) {
                    bot.reply(message, 'Where exactly?');
                } else {
                    bot.reply(message, 'Where exactly is ' + includeThe(user.reference) + '?');
                }
            } else if (user.position && positionDefinitions.PositionNeedNumber.includes(user.position) && !user.number) { // for rooms
                bot.reply(message, 'Whats ' + includeThe(user.position) + ' number?');
            } else if (user.position && positionDefinitions.PositionNeedFloor.includes(user.position) && !user.floor) { // for rooms once in the floor
                bot.reply(message, 'Whats the floor of ' + includeThe(user.position) + ' ?');
            } else if (user.position && !positionDefinitions.PositionNeedNothing.includes(user.position) && !user.orientation && !user.floor && !user.number) { // for rooms that need further information
                bot.reply(message, 'Whats the orientation or floor of ' + includeThe(user.position) + ' ?');
            } else {
                bot.classifyIncidentType(message, id);
            }
        });
    });
};

bot.classifyIncidentType = function (message, id) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        var reference;
        reference = user.reference || user.position;

        var intentTypes = intentTypeClassifier.classify({ 'reference': reference, 'symptom': user.symptom });

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

                bot.listReply(message, 'The incident could not be classified. Please select or answer "what happened and where?" again:', choices);
                break;
            case 1:
                console.log('info: Classified type: ' + intentTypes[0]);
                bot.classifyIncidentPriority(message, id, intentTypes[0]);
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

                    bot.listReply(message, 'There are multiple choices on your incident type. Please select or contact service if not listed below:', choices);
                }
        }
    });
};

bot.deleteIncidentInformation = function (message, id) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        delete user.reference;
        delete user.symptom;
        bot.botkit.storage.users.save(user, function (err) {
            bot.defaultReply(message, id);
        });
    });
};

bot.classifyIncidentPriority = function (message, id, type) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        var position;
        position = user.position || user.reference;

        var intentPriorities = priorityTypeClassifier.classify({ 'symptom': user.symptom, 'position': position });

        switch (intentPriorities.length) {
            case 1:
                console.log('info: Classified priority: ' + intentPriorities[0]);
                bot.saveIncidentTypeAndPriority(message, id, type, intentPriorities[0]);
                break;
            default:
                bot.saveIncidentType(message, id, type);
        }
    });
};

bot.saveIncidentType = function (message, id, type) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (type) { user.type = type; user.jobs = incidentTypeToJobsMapping[type]; }
        bot.botkit.storage.users.save(user, function (err) {
            var choices = [];
            choices.push({
                'type': 'postBack',
                'title': 'Yes',
                'value': 'provide-incident-user-urgency-1'
            });
            choices.push({
                'type': 'postBack',
                'title': 'No',
                'value': 'provide-incident-user-urgency-2'
            });

            bot.listReply(message, 'Are there people in danger? (Eg locked in elevators):', choices);
        });
    });
};

bot.saveIncidentTypeAndPriority = function (message, id, type, priority) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (type) { user.type = type; user.jobs = incidentTypeToJobsMapping[type]; }
        if (priority) { user.priority = priority; }
        bot.botkit.storage.users.save(user, function (err) {
            bot.defaultReply(message, id);
        });
    });
};

bot.saveIncidentTime = function (message, id, time) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (time) { user.time = time; }
        bot.botkit.storage.users.save(user, function (err) {
            bot.defaultReply(message, id);
        });
    });
};

bot.saveIncidentUrgency = function (message, id, urgency) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (urgency) { user.urgency = urgency; }
        bot.botkit.storage.users.save(user, function (err) {
            bot.defaultReply(message, id);
        });
    });
};

bot.saveIncidentPersonalInformation = function (message, id, name, email, phone) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (name) { user.name = name; }
        if (email) { user.email = email; }
        if (phone) { user.phone = phone; }
        bot.botkit.storage.users.save(user, function (err) {
            bot.defaultReply(message, id);
        });
    });
};

bot.askAddressError = function (message) {
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
                bot.saveConversationStart(message, bot.getUserId(message), true);
            }
        });
    }
});

/*
 * Rule-based / pattern matching
 */

controller.hears(['contact'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.serviceReply(message, id);
});

controller.hears(['provide-incident-type-(.*)'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.classifyIncidentPriority(message, id, message.match[1]);
});

controller.hears(['delete-incident-information'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.deleteIncidentInformation(message, id);
});

controller.hears(['provide-incident-user-urgency-(.*)'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.saveIncidentUrgency(message, id, message.match[1]);
});

module.exports.controller = controller;
module.exports.bot = bot;