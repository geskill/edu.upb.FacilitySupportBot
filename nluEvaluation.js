// read from '.env'-file
require('dotenv').config();

var fs = require('fs');

var Levenshtein = require('levenshtein');

var incidents = require('./nlu.json');

fs.existsSync('./evaluation') || fs.mkdirSync('./evaluation')

var fileName = './evaluation\\nlu-' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-') + '.txt';

var botNames = {
    apiai: 'apiai',
    luis: 'luis',
    recast: 'recast'
};

var totalCount = 0, currentCount = 0;

fs.writeFileSync(fileName, ''); // create new empty file

console.log('the evaluation takes about 10 minutes.');


var lastStep = -1;
var nluResult = function (response, sentence, intent, reference, symptom, position, orientation, floor, number, confidence, label) {

    for (let set of incidents.testset) {
        if ((sentence === set.input.sentence) || (sentence === set.input['second sentence'])) {

            if (!set[label]) {
                set[label] = {};
            }

            if (reference) {
                set[label].reference = reference.trim().toLowerCase();
            }
            if (symptom) {
                set[label].symptom = symptom.trim().toLowerCase();
            }
            if (position) {
                set[label].position = position.trim().toLowerCase();
            }
            if (orientation) {
                set[label].orientation = orientation.trim().toLowerCase();
            }
            if (floor) {
                set[label].floor = floor.trim().toLowerCase();
            }
            if (number) {
                set[label].number = number.trim().toLowerCase();
            }

            break;
        }
    }

    currentCount--;

    var steps = 10;
    var percentage = (totalCount - currentCount) / totalCount * 100;
    var currentStep = Math.floor(percentage / steps);
    if (currentStep > lastStep) {
        console.log(percentage.toFixed(2) + '%');
        lastStep = currentStep;
    }

    if (currentCount === 0) {
        nluEvaluation();
    }

};

function n(n) {
    return n > 9 ? '' + n : ' ' + n;
}

var nluEvaluation = function () {

    for (let botName in botNames) {

        var results = {
            'reference':
            {
                'first': 0,
                'second': 0,
                'thirdToFifth': 0,
                'other': 0,
            },
            'symptom':
            {
                'first': 0,
                'second': 0,
                'thirdToFifth': 0,
                'other': 0,
            },
            'position':
            {
                'first': 0,
                'second': 0,
                'thirdToFifth': 0,
                'other': 0,
            },
            'orientation':
            {
                'first': 0,
                'second': 0,
                'thirdToFifth': 0,
                'other': 0,
            },
            'floor':
            {
                'first': 0,
                'second': 0,
                'thirdToFifth': 0,
                'other': 0,
            },
            'number':
            {
                'first': 0,
                'second': 0,
                'thirdToFifth': 0,
                'other': 0,
            }
        };

        for (let set of incidents.testset) {

            if (set.output.reference) {
                var a = set.output.reference.toLowerCase(), b = set[botName].reference
                if (!b) {
                    results.reference.other++;
                } else if (a !== b) {
                    var distance = new Levenshtein(a, b).distance;
                    if (distance < 3) {
                        results.reference.second++;
                    } else if (distance < 6) {
                        results.reference.thirdToFifth++;
                    } else {
                        results.reference.other++;
                    }
                } else {
                    results.reference.first++;
                }
            }

            if (set.output.symptom) {
                var a = set.output.symptom.toLowerCase(), b = set[botName].symptom
                if (!b) {
                    results.symptom.other++;
                } else if (a !== b) {
                    var distance = new Levenshtein(a, b).distance;
                    if (distance < 3) {
                        results.symptom.second++;
                    } else if (distance < 6) {
                        results.symptom.thirdToFifth++;
                    } else {
                        results.symptom.other++;
                    }
                } else {
                    results.symptom.first++;
                }
            }

            if (set.output.position) {
                var a = set.output.position.toLowerCase(), b = set[botName].position
                if (!b) {
                    results.position.other++;
                } else if (a !== b) {
                    var distance = new Levenshtein(a, b).distance;
                    if (distance < 3) {
                        results.position.second++;
                    } else if (distance < 6) {
                        results.position.thirdToFifth++;
                    } else {
                        results.position.other++;
                    }
                } else {
                    results.position.first++;
                }
            }

            if (set.output.orientation) {
                var a = set.output.orientation.toLowerCase(), b = set[botName].orientation
                if (!b) {
                    results.orientation.other++;
                } else if (a !== b) {
                    var distance = new Levenshtein(a, b).distance;
                    if (distance < 3) {
                        results.orientation.second++;
                    } else if (distance < 6) {
                        results.orientation.thirdToFifth++;
                    } else {
                        results.orientation.other++;
                    }
                } else {
                    results.orientation.first++;
                }
            }

            if (set.output.floor) {
                var a = set.output.floor.toLowerCase(), b = set[botName].floor
                if (!b) {
                    results.floor.other++;
                } else if (a !== b) {
                    var distance = new Levenshtein(a, b).distance;
                    if (distance < 3) {
                        results.floor.second++;
                    } else if (distance < 6) {
                        results.floor.thirdToFifth++;
                    } else {
                        results.floor.other++;
                    }
                } else {
                    results.floor.first++;
                }
            }

            if (set.output.number) {
                var a = set.output.number.toLowerCase(), b = set[botName].number
                if (!b) {
                    results.number.other++;
                } else if (a !== b) {
                    var distance = new Levenshtein(a, b).distance;
                    if (distance < 3) {
                        results.number.second++;
                    } else if (distance < 6) {
                        results.number.thirdToFifth++;
                    } else {
                        results.number.other++;
                    }
                } else {
                    results.number.first++;
                }
            }
        }

        var text = '';
        text += '=====================================================================\r\n';
        text += botName + '\r\n';
        text += '=====================================================================\r\n';
        text += '    | reference | symptom | position | orientation | floor | number |\r\n';
        text += '---------------------------------------------------------------------\r\n';
        text += '  1 |        ' + n(results.reference.first) + ' |      ' + n(results.symptom.first) + ' |       ' + n(results.position.first) + ' |          ' + n(results.orientation.first) + ' |    ' + n(results.floor.first) + ' |     ' + n(results.number.first) + ' |\r\n';
        text += '---------------------------------------------------------------------\r\n';
        text += '  2 |        ' + n(results.reference.second) + ' |      ' + n(results.symptom.second) + ' |       ' + n(results.position.second) + ' |          ' + n(results.orientation.second) + ' |    ' + n(results.floor.second) + ' |     ' + n(results.number.second) + ' |\r\n';
        text += '---------------------------------------------------------------------\r\n';
        text += '3-5 |        ' + n(results.reference.thirdToFifth) + ' |      ' + n(results.symptom.thirdToFifth) + ' |       ' + n(results.position.thirdToFifth) + ' |          ' + n(results.orientation.thirdToFifth) + ' |    ' + n(results.floor.thirdToFifth) + ' |     ' + n(results.number.thirdToFifth) + ' |\r\n';
        text += '---------------------------------------------------------------------\r\n';
        text += '  * |        ' + n(results.reference.other) + ' |      ' + n(results.symptom.other) + ' |       ' + n(results.position.other) + ' |          ' + n(results.orientation.other) + ' |    ' + n(results.floor.other) + ' |     ' + n(results.number.other) + ' |\r\n';
        text += '=====================================================================\r\n\r\n\r\n';

        console.log(text);
        fs.appendFileSync(fileName, text);
    }
    fs.writeFileSync(fileName + '.json', JSON.stringify(incidents), 'utf-8');
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
        nluResult(res, message, res.intent() ? res.intent().slug : '',
            res.all('reference') ? res.all('reference')[0].raw : '',
            res.all('symptom') ? res.all('symptom')[0].raw : '',
            res.all('position') ? res.all('position')[0].raw : '',
            res.all('orientation') ? res.all('orientation')[0].raw : '',
            res.all('floor') ? res.all('floor')[0].raw : '',
            res.all('room-number') ? res.all('room-number')[0].raw : '',
            res.intent() ? res.intent().confidence : 0, botNames.recast);
    });
};

/*
 * Calls
 */
for (let set of incidents.testset) {
    totalCount += Object.keys(botNames).length;
    if (set.input['second sentence'] !== '') {
        totalCount += Object.keys(botNames).length;
    }
}
currentCount = totalCount;

var i = 0;
for (let set of incidents.testset) {

    setTimeout(function (msg) {

        if (botNames.apiai) {
            handleApiai(msg);
        }
        if (botNames.luis) {
            handleLuis(msg);
        }
        if (botNames.recast) {
            handleRecast(msg);
        }
    }, 10000 * i, set.input.sentence);
    i++;
}

var i = 0;
for (let set of incidents.testset) {

    if (set.input['second sentence'] !== '') {
        setTimeout(function (msg) {

            if (botNames.apiai) {
                handleApiai(msg);
            }
            if (botNames.luis) {
                handleLuis(msg);
            }
            if (botNames.recast) {
                handleRecast(msg);
            }
        }, 10000 * i, set.input['second sentence']);
        i++;
    }
}
