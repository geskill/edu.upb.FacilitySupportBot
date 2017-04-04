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

basicBot.controller.hears(['provide-location'], ['direct_message', 'direct_mention', 'mention', 'message_received'], recastai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    basicBot.controller.storage.users.get(id, function (err, user) {
        var city, street;
        if (user) {
            city = user.city;
            street = user.street;
            time = user.time;
        }

        if (message.entities['zip-code']) {
            city = message.entities['zip-code'];
        }
        if (message.entities['geo-city']) {
            city = message.entities['geo-city'];
        }
        if (message.entities['street-address']) {
            street = message.entities['street-address'].join(' ');
        }
        if (message.entities['datetime']) {
            time = message.entities['datetime'];
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

        if (message.entities['datetime']) {
            time = message.entities['datetime'];
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

        if (message.entities['person']) {
            lastName = message.entities['person'];
        }
        if (message.entities['name']) {
            name = message.entities['name'];
        }
        if (message.entities['email']) {
            email = message.entities['email'];
        }
        if (message.entities['phone']) {
            phone = message.entities['phone'];
        }
        if (message.entities['phonenumber']) {
            phone = message.entities['phonenumber'];
        }

        basicBot.bot.saveIncidentPersonalInformation(message, id, name, email, phone);
    });

});