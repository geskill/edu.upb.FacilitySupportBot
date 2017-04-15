/*
 * # Initialization
 */

// required for initial read from '.env'-file - used to set-up environment variables
require('dotenv').config();

// initialize use of node.js utils - used for printf string format
const util = require('util');

// read incident type to jobs mapping
var incidentTypeToJobsMapping = require('./jobs.json');

// read priority to estimated time mapping
var incidentTypeToTimeMapping = require('./time.json');

// read position definitions that need i.e. a room number or floor number
var positionDefinitions = require('./positionDefinitions.json');

// initialize Botkit
var Botkit = require('botkit');

// create a new Microsoft Bot Framework instance
var controller = Botkit.botframeworkbot({
    debug: process.env.APP_DEBUG || true, // set debug log to true
    hostname: process.env.APP_HOSTNAME || '127.0.0.1' // set default hostname, required on windows
});

// create a new Bot Framework instance
var bot = controller.spawn({
    appId: process.env.APP_BOT_ID || 'c8ab93a2-4cfb-4d3a-86a9-1f0a350f6b65', // credentials from the Microsoft Bot Directory
    appPassword: process.env.APP_BOT_PASSWORD
});

// create a new instance for using Google Maps service
var googleMapsClient = require('@google/maps').createClient({
    key: process.env.APP_GOOGLE_MAPS_API_KEY
});

/*
 * ## Classification
 */

// create a new instance for using Limdu.js (classification library)
var limdu = require('limdu');

// read incident type and priority classification definitions
var incidentClassification = require('./classification.json');

/*
 * ### Classification incident type
 */

// create new decision tree type classifier
var decisionTree1 = limdu.classifiers.DecisionTree.bind(this, {});

// create new classifier for incident type based upon decision tree type classifier
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree1
});

// copy the classification definitions (deep clone hack) - used for modify the data - see loop
let incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification));

// loop trough all train-set data to use position value as reference if and only if reference value is undefined/empty
for (let set of incidentTypeClassification.trainset) {
    if (!set.input.reference)
        set.input.reference = set.input.position;
    delete set.input.position;
    set.output = set.output.type; // redefine output to classify only the incident type
}

// train the incident type classifier based on the modified definition
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);

/*
 * ### Classification priority
 */

// create new decision tree type classifier
var decisionTree2 = limdu.classifiers.DecisionTree.bind(this, {});

// create new classifier for priority based upon decision tree type classifier
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree2
});

// copy the classification definitions (deep clone hack) - used for modify the data - see loop
let priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification));

// loop trough all train-set data to use reference value as position if and only if position value is undefined/empty
for (let set of priorityTypeClassification.trainset) {
    if (!set.input.position)
        set.input.position = set.input.reference;
    delete set.input.reference;
    set.output = set.output.priority; // redefine output to classify only the priority
}

// train the priority classifier based on the modified definition
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);

/*
 * # Helper functions
 */

/**
 * adds a 'the' to the beginning of the string if not existing
 * @param {*} text 
 */
var includeThe = function (text) {
    var text = text.trim();
    return text.startsWith('the') ? text : 'the ' + text;
};

/*
 * # Reply definitions
 */
const
    INFORMATION_ERROR = 'Sorry, your information could not be recognized. Please try again and use a different wording.',
    ADDRESS_ERROR = 'The address could not be found. Please write it again.',

    GREETINGS = 'Hello %s, what is the address of your current location?',

    ASK_CURRENT_ADDRESS = 'What is the address of your current location?',
    ASK_INCIDENT_AND_POSITION = 'What happened in %s and where exactly?',
    ASK_TIME = 'When did it happen?',
    ASK_CONTACT = 'Can you please tell me your name and contact?',

    ASK_NAME_OF_CITY = 'What is the name of the city you are located at?',
    ASK_NAME_AND_NUMBER_OF_STREET = 'What is the name and number of the street you are located at?',

    ASK_ADDRESS_MULTIPLE_CHOICES = 'There are multiple choices on your location, please select (if you can not find your address please write it again):',

    ASK_INCIDENT_DETAILS = 'What exactly happened?',
    ASK_INCIDENT_DETAILS_PLUS_POSITION = 'What exactly happened in %s ?',

    ASK_INCIDENT_POSITION = 'Where exactly?',
    ASK_INCIDENT_POSITION_DETAIL = 'Where exactly is %s ?',

    ASK_INCIDENT_POSITION_ROOM_NUMBER = 'Whats %s number?',
    ASK_INCIDENT_POSITION_FLOOR_NUMBER = 'Whats the floor of %s ?',
    ASK_INCIDENT_POSITION_ORIENTATION_FLOOR = 'Whats the orientation or floor of % ?',

    ASK_INCIDENT_TYPE_NONE = 'The incident could not be classified. Please select or answer "what happened and where?" again:',
    ASK_INCIDENT_TYPE_MULTIPLE = 'There are multiple choices on your incident type. Please select or contact service if not listed below:',

    ASK_USER_URGENCY = 'Are there people in danger? (Eg locked in elevators):',

    INFORMATION_COMPLETE = 'Thank you very much, Sir or Madam %s, your message about the incident was received. The %s will be informed and will contact you if questions occur.',

    SERVICE_REPLY = 'Please hold on. A service employee will soon take on the conversation.';

/*
 * # Bot additions/extensions
 */

/**
 * reply with a list of elements
 * 
 * see: https://blogs.msdn.microsoft.com/tsmatsuz/2016/08/31/microsoft-bot-framework-messages-howto-image-html-card-button-etc/
 * ~ not well documented for node.js, but see C# lib or rest definition ~
 * 
 * @param {Object} message The message object
 * @param {string} title The title
 * @param {Object[]} elements The list of elements
 */
bot.listReply = function (message, title, elements) {
    bot.reply(message, { 'text': '', 'attachments': [{ 'contentType': 'application/vnd.microsoft.card.hero', 'content': { 'text': title, 'buttons': elements } }] });
};

/**
 * return the job titles mapped to the incident type in a readable format
 * 
 * @param {string} type The incident type
 */
bot.getJobTitles = function (type) {
    var jobs = incidentTypeToJobsMapping[type];
    if (jobs.length > 1) {
        return jobs.slice(0, -1).join(', ') + ' or ' + jobs.slice(-1);
    } else {
        return jobs[0];
    }
};

/**
 * get user id / name
 * default way for Bot Framework / Skype nickname
 * 
 * @param {Object} message The message object
 */
bot.getUserId = function (message) {
    return message.address.user.name;
};

/**
 * default reply-'loop'
 * is always called when an information block is complete or no better alternative exists
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {boolean} [error=false] The error flag
 */
bot.defaultReply = function (message, id, error) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (error) {
            user.errorCount += 1;
            if (user.errorCount >= 2) {
                bot.reply(message, INFORMATION_ERROR);
            }
            if (user.errorCount >= 3) {
                bot.serviceReply(message, id);
            }
        } else {
            user.errorCount = 0;
        }

        if (!user || !user.city || !user.street) {
            bot.reply(message, ASK_CURRENT_ADDRESS);
        } else if (!user.type || (!user.priority && !user.urgency)) {
            bot.reply(message, util.format(ASK_INCIDENT_AND_POSITION, user.city));
        } else if (!user.time) {
            bot.reply(message, ASK_TIME);
        } else if (!user.name && !user.email && !user.phone) {
            bot.reply(message, ASK_CONTACT);
        } else {
            var time;
            if (user.priority) {
                time = incidentTypeToTimeMapping.priority[user.priority];
            } else {
                time = incidentTypeToTimeMapping.urgency[user.urgency];
            }

            bot.reply(message, util.format(INFORMATION_COMPLETE, (user.name || id), bot.getJobTitles(user.type)) +
                ' (' + (user.priority ? 'priority' : 'urgency') + ' lvl ' + (user.priority ? user.priority : user.urgency) + ' [ETA ' + time + '])');
        }
    });
};

/**
 * dummy function to indicate that here could be a connection to a real person messaging service
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 */
bot.serviceReply = function (message, id) {
    bot.reply(message, SERVICE_REPLY);
};

/**
 * initial conversation start function
 * creates the user object to save conversation start date and error count
 * furthermore replies with user greeting if user is added
 * else no message is displayed (i.e. for debugging reasons)
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {boolean} [added=false] The added flag (used if conversation started)
 */
bot.saveConversationStart = function (message, id, added) {
    var user = { id: id, conversationStartDate: Date.now(), errorCount: 0 };
    bot.botkit.storage.users.save(user, function (err) {
        if (added) {
            bot.reply(message, util.format(GREETINGS, id));
        }
    });
    return user;
};

/**
 * function to be called when street address is not found
 * or google maps service has problems
 * 
 * @param {Object} message The message object
 */
bot.addressNotFoundError = function (message) {
    bot.reply(message, ADDRESS_ERROR);
};

/**
 * save address after standardization
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} city The city
 * @param {string} street The street
 */
bot.saveAddress = function (message, id, city, street) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (city) { user.city = city; }
        if (street) { user.street = street; }
        bot.botkit.storage.users.save(user, function (err) {
            if (!city) {
                bot.reply(message, ASK_NAME_OF_CITY);
            } else if (!street) {
                bot.reply(message, ASK_NAME_AND_NUMBER_OF_STREET);
            } else {
                bot.defaultReply(message, id);
            }
        });
    });
};

/**
 * extract the city and street name inclusive the street number from the Google Maps service call
 * 
 * @param {Object} addressComponents The Google Maps address component object
 * @param {string} [city] The city
 * @param {string} [street] The street
 */
bot.extractCityAndStreetFromGoogleResponse = function (addressComponents, city, street) {
    var streetNumber;
    for (let addressComponent of addressComponents) {
        for (let type of addressComponent.types) {
            switch (type) {
                case 'street_number':
                    streetNumber = addressComponent.long_name;
                    break;
                case 'route':
                    street = addressComponent.long_name;
                    break;
                case 'locality':
                    city = addressComponent.long_name;
                    break;
            }
        }
    }
    street += ' ' + streetNumber;
    return { 'city': city, 'street': street };
};

/**
 * save address and standardize if information (city and street) is complete
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} city The city
 * @param {string} street The street
 * @param {string} time The time
 */
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
                        bot.addressNotFoundError(message);
                        break;
                    case 1:
                        {
                            var address = bot.extractCityAndStreetFromGoogleResponse(response.json.results[0].address_components, city, street);
                            console.log('info: Recognized address: ' + address.city + ' ' + address.street);
                            bot.saveAddress(message, id, address.city, address.street);
                            break;
                        }
                    default:
                        {
                            bot.botkit.storage.users.get(id, function (err, user) {
                                user.possibleAddress = []; // clean buffer
                                var choices = [];
                                for (let [index, result] of response.json.results.entries()) { // nice kind of loop def. ES6

                                    choices.push({
                                        'type': 'postBack',
                                        'title': result.formatted_address,
                                        'value': 'provide-address-' + index
                                    });

                                    user.possibleAddress.push(bot.extractCityAndStreetFromGoogleResponse(result.address_components)); // buffer address results
                                }

                                bot.botkit.storage.users.save(user, function (err) {
                                    // possible results
                                    bot.listReply(message, ASK_ADDRESS_MULTIPLE_CHOICES, choices);
                                });
                            });
                        }
                }
            } else {
                // Google service error
                bot.addressNotFoundError(message);
            }
        });
    } else {
        bot.saveAddress(message, id, city, street);
    }
};

/**
 * save incident and position
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} reference The reference
 * @param {string} symptom The symptom
 * @param {string} position The position
 * @param {string} orientation The orientation
 * @param {string} floor The floor
 * @param {string} number The number
 */
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
                    bot.reply(message, ASK_INCIDENT_DETAILS);
                } else {
                    bot.reply(message, util.format(ASK_INCIDENT_DETAILS_PLUS_POSITION, includeThe(user.position || user.floor)));
                }
            } else if (!user.position && !user.orientation && !user.floor) { // position, orientation or floor is required
                if (!user.reference) {
                    bot.reply(message, ASK_INCIDENT_POSITION);
                } else {
                    bot.reply(message, util.format(ASK_INCIDENT_POSITION_DETAIL, includeThe(user.reference)));
                }
            } else if (user.position && positionDefinitions.PositionNeedNumber.includes(user.position) && !user.number) { // for rooms
                bot.reply(message, util.format(ASK_INCIDENT_POSITION_ROOM_NUMBER, includeThe(user.position)));
            } else if (user.position && positionDefinitions.PositionNeedFloor.includes(user.position) && !user.floor) { // for rooms once in the floor
                bot.reply(message, util.format(ASK_INCIDENT_POSITION_FLOOR_NUMBER, includeThe(user.position)));
            } else if (user.position && !positionDefinitions.PositionNeedNothing.includes(user.position) && !user.orientation && !user.floor && !user.number) { // for rooms that need further information
                bot.reply(message, util.format(ASK_INCIDENT_POSITION_ORIENTATION_FLOOR, includeThe(user.position)));
            } else {
                bot.classifyIncidentType(message, id);
            }
        });
    });
};

/**
 * classify incident type
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 */
bot.classifyIncidentType = function (message, id) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        var reference;
        reference = user.reference || user.position || '';

        var intentTypes = intentTypeClassifier.classify({ 'reference': reference, 'symptom': user.symptom || '' });

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

                bot.listReply(message, ASK_INCIDENT_TYPE_NONE, choices);
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

                    bot.listReply(message, ASK_INCIDENT_TYPE_MULTIPLE, choices);
                }
        }
    });
};

/**
 * delete the incident information (reference and symptom)
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 */
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

/**
 * classify the incident priority
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} type The incident type
 */
bot.classifyIncidentPriority = function (message, id, type) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        var position;
        position = user.position || user.reference || '';

        var intentPriorities = priorityTypeClassifier.classify({ 'symptom': user.symptom || '', 'position': position });

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

/**
 * save incident type
 *
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} type The incident type
 */
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

            bot.listReply(message, ASK_USER_URGENCY, choices);
        });
    });
};

/**
 * save incident type and priority 
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} type The incident type
 * @param {number} priority The incident priority
 */
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

/**
 * save incident time
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} time The time
 */
bot.saveIncidentTime = function (message, id, time) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (time) { user.time = time; }
        bot.botkit.storage.users.save(user, function (err) {
            bot.defaultReply(message, id);
        });
    });
};

/**
 * save incident user urgency
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {number} urgency The urgency
 */
bot.saveIncidentUrgency = function (message, id, urgency) {
    bot.botkit.storage.users.get(id, function (err, user) {
        if (!user) { user = bot.saveConversationStart(message, id); }
        if (urgency) { user.urgency = urgency; }
        bot.botkit.storage.users.save(user, function (err) {
            bot.defaultReply(message, id);
        });
    });
};

/**
 * save personal information
 * 
 * @param {Object} message The message object
 * @param {string} id The user id
 * @param {string} name The name
 * @param {string} email The email
 * @param {string} phone The phone
 */
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

/**
 * Start the webserver
 * 
 * if you are already using Express, you can use your own server instance...
 * see 'Use BotKit with an Express web server'
 */
controller.setupWebserver(process.env.PORT || 3000, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver, bot, function () {
        console.log('This bot is online!!!');
    });
});

/**
 * The bot was added to a conversation or other conversation metadata changed
 */
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
 * # Rule-based / pattern matching
 */

/**
 * user selects option contact service
 */
controller.hears(['contact'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.serviceReply(message, id);
});

/**
 * user selects option to define address
 */
controller.hears(['provide-address-(.*)'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.botkit.storage.users.get(id, function (err, user) {
        var address = user.possibleAddress[message.match[1]]; // read from buffer
        bot.saveAddress(message, id, address.city, address.street);
    });

});

/**
 * user selects option to define incident type
 */
controller.hears(['provide-incident-type-(.*)'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.classifyIncidentPriority(message, id, message.match[1]);
});

/**
 * user selects option to delete incident information
 */
controller.hears(['delete-incident-information'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.deleteIncidentInformation(message, id);
});

/**
 * user selects option to define user urgency
 */
controller.hears(['provide-incident-user-urgency-(.*)'], ['direct_message', 'direct_mention', 'mention', 'message_received'], function (bot, message) {
    var id = bot.getUserId(message);
    bot.saveIncidentUrgency(message, id, message.match[1]);
});

// export controller and bot to use with NLU-service
module.exports.controller = controller;
module.exports.bot = bot;