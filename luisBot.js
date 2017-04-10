var basicBot = require("./basicBot");

/*
 * Microsoft LUIS
 */
var luis = require('botkit-middleware-luis');
var luisOptions = { serviceUri: process.env.APP_LUIS_SERVICE_URI };
basicBot.controller.middleware.receive.use(luis.middleware.receive(luisOptions));

basicBot.controller.hears(['LUIS'], ['direct_message', 'direct_mention', 'mention', 'message_received'], luis.middleware.hereIntent, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    if (message.topIntent.score < 0.5) {
        basicBot.bot.defaultReply(message, id, true);
    } else {
        switch (message.topIntent.intent) {
            case 'ProvideAddress':
                {
                    basicBot.controller.storage.users.get(id, function (err, user) {
                        var city, zipcode, street, number, time;
                        if (user) {
                            city = user.city;
                            street = user.street;
                            time = user.time;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case 'City':
                                    city = entity.entity;
                                    break;
                                case 'Zipcode':
                                    zipcode = entity.entity;
                                    break;
                                case 'StreetAndNumber':
                                    street = entity.entity;
                                    break;
                                case 'builtin.datetime.date':
                                    time = entity.entity;
                                    break;
                                case 'builtin.datetime.time':
                                    time = entity.entity;
                                    break;
                            }
                        }

                        if (!street) {
                            for (let entity of message.entities) {
                                switch (entity.type) {
                                    case 'Street':
                                        street = entity.entity;
                                        break;
                                    case 'Number':
                                        number = entity.entity;
                                        break;
                                }
                            }
                        }

                        if (!city && zipcode) {
                            city = zipcode;
                        }

                        if (!street.match(/\d+/g)) {
                            street += number;
                        }

                        basicBot.bot.saveAndStandardizeAddress(message, id, city, street, time);
                    });
                    break;
                }
            case 'ProvideIncidentAndPosition':
                {
                    basicBot.controller.storage.users.get(id, function (err, user) {
                        var reference, symptom, position, orientation, floor, number;
                        if (user) {
                            reference = user.reference;
                            symptom = user.symptom;
                            position = user.position;
                            orientation = user.orientation;
                            floor = user.floor;
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
                                case 'Orientation':
                                    orientation = entity.entity;
                                    break;
                                case 'Floor':
                                    floor = entity.entity;
                                    break;
                                case 'Number':
                                    number = entity.entity;
                                    break;
                            }
                        }

                        basicBot.bot.saveIncidentAndPosition(message, id, reference, symptom, position, orientation, floor, number);
                    });
                    break;
                }
            case 'ProvideIncidentTime':
                {
                    basicBot.controller.storage.users.get(id, function (err, user) {
                        var time;
                        if (user) {
                            time = user.time;
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case 'builtin.datetime.date':
                                case 'builtin.datetime.time':
                                    time = '';
                            }
                        }

                        for (let entity of message.entities) {
                            switch (entity.type) {
                                case 'builtin.datetime.date':
                                    if (time !== '') time += ' ';
                                    time += entity.entity;
                                    break;
                                case 'builtin.datetime.time':
                                    if (time !== '') time += ' ';
                                    time += entity.entity;
                                    break;
                            }
                        }

                        basicBot.bot.saveIncidentTime(message, id, time);
                    });
                    break;
                }
            case 'ProvidePersonalInformation':
                {
                    basicBot.controller.storage.users.get(id, function (err, user) {
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
                                case 'builtin.email':
                                    email = entity.entity;
                                    break;
                                case 'Number':
                                    phone = entity.entity;
                                    break;
                            }
                        }

                        basicBot.bot.saveIncidentPersonalInformation(message, id, name, email, phone);
                    });
                    break;
                }
            default:
                basicBot.bot.defaultReply(message, id, true);
        }
    }
});