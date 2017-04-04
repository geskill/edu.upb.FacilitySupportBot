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
            case 'ProvideLocation':
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
                                case 'Street':
                                    street = entity.entity;
                                    break;
                                case 'Number':
                                    number = entity.entity;
                                    break;
                                case '!!!!':
                                    time = entity.entity;
                                    break;
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

                        basicBot.bot.saveIncidentAndPosition(message, id, reference, symptom, position, area, number);
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
                                case '???':
                                    time = entity.entity;
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
                                case 'Email':
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