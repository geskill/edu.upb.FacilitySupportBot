# edu.upb.FacilitySupportBot
A support bot for incidents in facilities.

### Prerequisites
* Download [Visual Studio Code](https://code.visualstudio.com/)
* Download [Bot Framework Channel Emulator](https://emulator.botframework.com/)

### Testing
Download this repository.

Start Visual Studio Code:
* Open the downloaded project folder
* Open the integrated terminal
* Install dependencies, type `npm install`
* Start the bot, type `node bot.js`
* Note the endpoint address (eg. http://127.0.0.1:3000/botframework/receive)

Start Framework Channel Emulator:
* Enter the endpoint address
* For localhost debugging you will not typically need to enter MSA appId or password, although it is supported if your bot requires it. (For more information: [Connect to a bot running on localhost](https://github.com/Microsoft/BotFramework-Emulator/wiki/Getting-Started#connect-to-a-bot-running-on-localhost))
* Start chatting ...