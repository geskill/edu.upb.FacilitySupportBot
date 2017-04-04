var basicBot = require("./basicBot");

/*
 * Google Api.ai
 */
var apiai = require('botkit-middleware-apiai')({
    token: process.env.APP_APIAI_CLIENT_ACCESS_TOKEN,
    skip_bot: true // or false. If true, the middleware don't send the bot reply/says to api.ai
});
basicBot.controller.middleware.receive.use(apiai.receive);

basicBot.controller.hears(['None'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {
    basicBot.bot.defaultReply(message, id, true);
});

basicBot.controller.hears(['ProvideAddress'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    basicBot.controller.storage.users.get(id, function (err, user) {
        var city, street, time;
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
        if (message.entities['date-time']) {
            time = message.entities['date-time'];
        }

        basicBot.bot.saveAndStandardizeAddress(message, id, city, street, time);
    });

});

basicBot.controller.hears(['ProvideIncidentAndPosition'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

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

basicBot.controller.hears(['ProvideIncidentTime'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    basicBot.controller.storage.users.get(id, function (err, user) {
        var time;
        if (user) {
            time = user.time;
        }

        if (message.entities['date']) {
            time = message.entities['date'];
        }
        if (message.entities['time']) {
            if (time) { time += ' '; }
            time += message.entities['time'];
        }
        if (message.entities['time-period']) {
            if (time) { time += ' '; }
            time += message.entities['time-period'];
        }

        basicBot.bot.saveIncidentTime(message, id, time);
    });

});

basicBot.controller.hears(['ProvidePersonalInformation'], ['direct_message', 'direct_mention', 'mention', 'message_received'], apiai.hears, function (bot, message) {

    var id = basicBot.bot.getUserId(message);
    basicBot.controller.storage.users.get(id, function (err, user) {
        var name, givenName, lastName, email, phone;
        if (user) {
            name = user.name;
            email = user.email;
            phone = user.phone;
        }

        if (message.entities['given-name']) {
            givenName = message.entities['given-name'];
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

        if (!name || (givenName && lastName)) {
            name = (givenName + ' ' + lastName).trim();
        } else if (!name.includes(' ')) {
            name = (givenName || lastName).trim();
        } else {
            // replace based upon name (only working for first / last name names)
            if (givenName) { // replace first name
                name = givenName + ' ' + givenName.split(' ').pop();
            } else { // replace last name
                name = givenName.split(' ').shift() + ' ' + lastName;
            }
        }

        basicBot.bot.saveIncidentPersonalInformation(message, id, name, email, phone);
    });
});
