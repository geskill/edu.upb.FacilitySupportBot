// read from '.env'-file
require('dotenv').config();

var fs = require('fs');

var incidents = require('./nlu.json');

fs.existsSync('./evaluation') || fs.mkdirSync('./evaluation')

var fileName = './evaluation\\nlu-' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-') + '.txt';

var botNames = {
    apiai: 'apiai',
    luis: 'luis',
    recast: 'recast'
};

var totalCount = 0;

fs.writeFileSync(fileName, ''); // create new empty file

var nluResult = function (response, sentence, intent, reference, symptom, position, orientation, floor, number, confidence, label) {

    for (let set of incidents.testset) {
        if ((sentence === set.input.sentence) || (sentence === set.input['second sentence'])) {

            if (!set[label]) {
                set[label] = {};
            }

            if (reference) {
                set[label].reference = reference;
            }
            if (symptom) {
                set[label].symptom = symptom;
            }
            if (position) {
                set[label].position = position;
            }
            if (orientation) {
                set[label].orientation = orientation;
            }
            if (floor) {
                set[label].floor = floor;
            }
            if (number) {
                set[label].number = number;
            }

            break;
        }
    }

    totalCount -= 1;

    if (totalCount = 0) {
        nluEvaluation();
    }

};

var nluEvaluation = function () {

    for (let botName of botNames) {

    }




}

/*
 * Api.ai
 */
var uuid = require('uuid');
var apiaiService = require('apiai');
var api = apiaiService(process.env.APP_APIAI_CLIENT_ACCESS_TOKEN);
var handleApiai = function (message) {
    apiRequest = api.textRequest(message, { sessionId: uuid.v1() });

    apiRequest.on('response', function (response) {
        nluResult(response, message, response.result.metadata.intentName,
            response.result.parameters['Reference'],
            response.result.parameters['Symptom'],
            response.result.parameters['Position'],
            response.result.parameters['Orientation'],
            response.result.parameters['Floor'],
            response.result.parameters['RoomNumber'],
            response.result.score, botNames.apiai);
    });

    apiRequest.end();
};

/*
 * LUIS
 */
var request = require('request');

var serviceUri = process.env.APP_LUIS_SERVICE_URI.trim();
if (serviceUri.lastIndexOf('&q=') != serviceUri.length - 3) {
    serviceUri += '&q=';
}

var handleLuis = function (message) {
    var uri = serviceUri + encodeURIComponent(message);
    request.get(uri, function (err, res, body) {
        try {
            if (!err) {
                var result = JSON.parse(body);

                var reference, symptom, position, orientation, floor, number;

                for (let entity of result.entities) {
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

                nluResult(result, message, result.topScoringIntent.intent,
                    reference, symptom, position, orientation, floor, number,
                    result.topScoringIntent.score, botNames.luis);

            } else {
                console.error(err.toString());
            }
        } catch (e) {
            console.error(e.toString());
        }
    });
};

/*
 * Recast.ai
 */
var recastaiClient = require('recastai');
var clientRequest = new recastaiClient.request(process.env.APP_RECASTAI_REQUEST_ACCESS_TOKEN, 'en');

var handleRecast = function (message) {
    clientRequest.analyseText(message).then(function (res) {
        nluResult(res, message, res.intent().slug,
            res.all('reference') ? res.all('reference')[0].raw : '',
            res.all('symptom') ? res.all('symptom')[0].raw : '',
            res.all('position') ? res.all('position')[0].raw : '',
            res.all('orientation') ? res.all('orientation')[0].raw : '',
            res.all('floor') ? res.all('floor')[0].raw : '',
            res.all('room-number') ? res.all('room-number')[0].raw : '',
            res.intent().confidence, botNames.recast);
    });
};

/*
 * Calls
 */
for (let set of incidents.testset) {
    // handleApiai(set.input.sentence);
    // handleLuis(set.input.sentence);
    handleRecast(set.input.sentence);
    totalCount += 3;
    break;
}

/*
for (let set of incidents.testset) {
    if (set.input['second sentence'] !== '') {
        handleApiai(set.input['second sentence']);
        handleLuis(set.input['second sentence']);
        handleRecast(set.input['second sentence']);
        totalCount += 3;
    }
}
*/