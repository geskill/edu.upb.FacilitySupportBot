var basicBot = require("./basicBot");

/*
 * Recast.ai
 */
var recastai = require('botkit-middleware-recastai')({
    request_token: process.env.APP_RECASTAI_REQUEST_ACCESS_TOKEN,
    confidence: 0.2
});
basicBot.controller.middleware.receive.use(recastai.receive);

basicBot.controller.hears(['default'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {
    var id = basicBot.bot.getUserId(message);
    basicBot.bot.defaultReply(message, id, true);
});

basicBot.controller.hears(['provide-address'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    basicBot.controller.storage.users.get(id, function (err, user) {
        var city, zipcode, street, time;
        if (user) {
            city = user.city;
            street = user.street;
            time = user.time;
        }

        for (let entity of message.entities) {
            switch (entity.name) {
                case 'city_name':
                    city = entity.raw;
                    break;
                case 'zipcode':
                    zipcode = entity.raw;
                    break;
                case 'street':
                    street = entity.raw;
                    break;
                case 'datetime':
                    time = entity.iso;
                    break;
            }
        }

        if (!city && zipcode) {
            city = zipcode;
        }

        basicBot.bot.saveAndStandardizeAddress(message, id, city, street, time);
    });

});

basicBot.controller.hears(['provide-incident-and-position'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
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
            switch (entity.name) {
                case 'reference':
                    reference = entity.raw;
                    break;
                case 'symptom':
                    symptom = entity.raw;
                    break;
                case 'position':
                    position = entity.raw;
                    break;
                case 'orientation':
                    orientation = entity.raw;
                    break;
                case 'floor':
                    floor = entity.raw;
                    break;
                case 'room-number':
                    number = entity.raw;
                    break;
            }
        }

        basicBot.bot.saveIncidentAndPosition(message, id, reference, symptom, position, orientation, floor, number);
    });

});

basicBot.controller.hears(['provide-incident-time'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    basicBot.controller.storage.users.get(id, function (err, user) {
        var time;
        if (user) {
            time = user.time;
        }

        for (let entity of message.entities) {
            switch (entity.name) {
                case 'datetime':
                    time = entity.iso;
                    break;
            }
        }

        basicBot.bot.saveIncidentTime(message, id, time);
    });

});

basicBot.controller.hears(['provide-personal-information'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    basicBot.controller.storage.users.get(id, function (err, user) {
        var name, lastName, email, phone;
        if (user) {
            name = user.name;
            email = user.email;
            phone = user.phone;
        }

        for (let entity of message.entities) {
            switch (entity.name) {
                case 'person':
                case 'name':
                    name = entity.raw;
                    break;
                case 'email':
                    email = entity.raw;
                    break;
                case 'phone':
                case 'phonenumber':
                    phone = entity.raw;
                    break;
            }
        }

        basicBot.bot.saveIncidentPersonalInformation(message, id, name, email, phone);
    });

});