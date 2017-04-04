var basicBot = require("./basicBot");

/*
 * Recast.ai
 */
var recastai = require('botkit-middleware-recastai')({
    request_token: process.env.APP_RECASTAI_REQUEST_ACCESS_TOKEN,
    confidence: 0.4
});
basicBot.controller.middleware.receive.use(recastai.receive);

basicBot.controller.hears(['default'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {
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
        var reference, symptom, position, area, number;
        if (user) {
            reference = user.reference;
            symptom = user.symptom;
            position = user.position;
            area = user.area;
            number = user.number;
        }

        if (message.entities['Reference']) {
            reference = message.entities['Reference'];
        }
        if (message.entities['Symptom']) {
            symptom = message.entities['Symptom'];
        }
        if (message.entities['Position']) {
            position = message.entities['Position'];
        }
        if (message.entities['AreaOrFloor']) {
            area = message.entities['AreaOrFloor'];
        }
        if (message.entities['RoomNumber']) {
            number = message.entities['RoomNumber'];
        }

        basicBot.bot.saveIncidentAndPosition(message, id, reference, symptom, position, area, number);
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