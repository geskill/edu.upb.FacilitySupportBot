// read from ".env"-file
require('dotenv').config();

var Botkit = require('botkit');

var controller = Botkit.botframeworkbot({
    debug: process.env.DEBUG || true,
    hostname: process.env.HOSTNAME || '127.0.0.1'
});

var bot = controller.spawn({
    appId: process.env.APP_ID || 'c8ab93a2-4cfb-4d3a-86a9-1f0a350f6b65',
    appPassword: process.env.APP_PASSWORD
});

// if you are already using Express, you can use your own server instance...
// see "Use BotKit with an Express web server"
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
                // bot.reply(message, "Hello, what is the address of your current location?");

            } else {
                // User is joining conversation
                // - For WebChat channel this will be sent when user sends first message.
                // - When a user joins a conversation the address.user field is often for
                //   essentially a system account so to ensure we're targeting the right 
                //   user we can tweek the address object to reference the joining user.
                // - If we wanted to send a private message to teh joining user we could
                //   delete the address.conversation field from the cloned address.
                var address = Object.create(message.address);
                identity = address.user;

                bot.reply(message, "Hello " + identity.name + ", what is the address of your current location?");
            }
        });
    }
});

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