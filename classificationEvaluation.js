var fs = require('fs');
var limdu = require('limdu');

var incidentClassification = require('./classification.json');

fs.existsSync('./evaluation') || fs.mkdirSync('./evaluation')

var fileName = './evaluation\\' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-') + '.txt';

fs.writeFileSync(fileName, ''); // create new empty file

var classificationEvaluation = function (classifier, testset, label) {

    fs.appendFileSync(fileName, 'Classification test for: ' + label + '\r\n');

    var first = 0, second = 0, thirdToFifth = 0, other = 0;

    for (let test of testset) {
        var result = classifier.classify(test.input);
        fs.appendFileSync(fileName, result + '\r\n');

        if (result[0] === test.output) {
            first++;
        } else if (result[1] === test.output) {
            second++;
        } else if ((result[2] === test.output) || (result[3] === test.output) || (result[4] === test.output)) {
            thirdToFifth++;
        } else {
            other++;
        }
    }

    var text = '';
    text += '=============\r\n';
    text += label + '\r\n';
    text += '-------------\r\n';
    text += '  1 | ' + first + '\r\n';
    text += '-------------\r\n';
    text += '  2 | ' + second + '\r\n';
    text += '-------------\r\n';
    text += '3-5 | ' + thirdToFifth + '\r\n';
    text += '-------------\r\n';
    text += '6-* | ' + other + '\r\n';
    text += '=============\r\n\r\n\r\n';

    console.log(text);
    fs.appendFileSync(fileName, text);
};

/*
 * Type classification
 */

var decisionTree1 = limdu.classifiers.DecisionTree.bind(this, {});
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree1
});
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
    if (!set.input.reference)
        set.input.reference = set.input.position;
    delete set.input.position;
    set.output = set.output.type;
}
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);
for (let set of incidentTypeClassification.testset) {
    if (!set.input.reference)
        set.input.reference = set.input.position;
    delete set.input.position;
    set.output = set.output.type;
}
classificationEvaluation(intentTypeClassifier, incidentTypeClassification.testset, 'ID3 - default');

var decisionTree1 = limdu.classifiers.DecisionTree.bind(this, {});
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree1
});
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
    set.output = set.output.type;
}
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);
for (let set of incidentTypeClassification.testset) {
    set.output = set.output.type;
}
classificationEvaluation(intentTypeClassifier, incidentTypeClassification.testset, 'ID3 - 1');

var decisionTree1 = limdu.classifiers.DecisionTree.bind(this, {});
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree1
});
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
    delete set.input.position;
    set.output = set.output.type;
}
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);
for (let set of incidentTypeClassification.testset) {
    delete set.input.position;
    set.output = set.output.type;
}
classificationEvaluation(intentTypeClassifier, incidentTypeClassification.testset, 'ID3 - 2');

var winnow1 = limdu.classifiers.Winnow.bind(0, { retrain_count: 10 });
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: winnow1
});
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
    if (!set.input.reference) {
        set.input[set.input.position] = 1;
    } else {
        set.input[set.input.reference] = 1;
    }
    set.input[set.input.symptom] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.type;
}
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);
for (let set of incidentTypeClassification.testset) {
    if (!set.input.reference) {
        set.input[set.input.position] = 1;
    } else {
        set.input[set.input.reference] = 1;
    }
    set.input[set.input.symptom] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.type;
}
classificationEvaluation(intentTypeClassifier, incidentTypeClassification.testset, 'Winnow - default');

var winnow1 = limdu.classifiers.Winnow.bind(0, { retrain_count: 10 });
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: winnow1
});
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
    set.input[set.input.reference] = 1;
    set.input[set.input.symptom] = 1;
    set.input[set.input.position] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.type;
}
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);
for (let set of incidentTypeClassification.testset) {
    set.input[set.input.reference] = 1;
    set.input[set.input.symptom] = 1;
    set.input[set.input.position] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.type;
}
classificationEvaluation(intentTypeClassifier, incidentTypeClassification.testset, 'Winnow - 1');

var winnow1 = limdu.classifiers.Winnow.bind(0, { retrain_count: 10 });
var intentTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: winnow1
});
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
    set.input[set.input.reference] = 1;
    set.input[set.input.symptom] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.type;
}
intentTypeClassifier.trainBatch(incidentTypeClassification.trainset);
for (let set of incidentTypeClassification.testset) {
    set.input[set.input.reference] = 1;
    set.input[set.input.symptom] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.type;
}
classificationEvaluation(intentTypeClassifier, incidentTypeClassification.testset, 'Winnow - 2');

/*
 * Priority classification
 */

var decisionTree2 = limdu.classifiers.DecisionTree.bind(this, {});
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree2
});
var priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of priorityTypeClassification.trainset) {
    if (!set.input.position)
        set.input.position = set.input.reference;
    delete set.input.reference;
    set.output = set.output.priority;
}
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);
for (let set of priorityTypeClassification.testset) {
    if (!set.input.reference)
        set.input.reference = set.input.position;
    delete set.input.position;
    set.output = set.output.priority;
}
classificationEvaluation(priorityTypeClassifier, priorityTypeClassification.testset, 'ID3 - default');

var decisionTree2 = limdu.classifiers.DecisionTree.bind(this, {});
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree2
});
var priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of priorityTypeClassification.trainset) {
    set.output = set.output.priority;
}
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);
for (let set of priorityTypeClassification.testset) {
    set.output = set.output.priority;
}
classificationEvaluation(priorityTypeClassifier, priorityTypeClassification.testset, 'ID3 - 1');

var decisionTree2 = limdu.classifiers.DecisionTree.bind(this, {});
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: decisionTree2
});
var priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of priorityTypeClassification.trainset) {
    delete set.input.reference;
    set.output = set.output.priority;
}
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);
for (let set of priorityTypeClassification.testset) {
    delete set.input.reference;
    set.output = set.output.priority;
}
classificationEvaluation(priorityTypeClassifier, priorityTypeClassification.testset, 'ID3 - 2');

var winnow2 = limdu.classifiers.Winnow.bind(0, { retrain_count: 10 });
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: winnow2
});
var priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of priorityTypeClassification.trainset) {
    if (!set.input.position) {
        set.input[set.input.reference] = 1;
    } else {
        set.input[set.input.position] = 1;
    }
    set.input[set.input.symptom] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.priority;
}
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);
for (let set of priorityTypeClassification.testset) {
    if (!set.input.position) {
        set.input[set.input.reference] = 1;
    } else {
        set.input[set.input.position] = 1;
    }
    set.input[set.input.symptom] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.priority;
}
classificationEvaluation(priorityTypeClassifier, priorityTypeClassification.testset, 'Winnow - default');

var winnow2 = limdu.classifiers.Winnow.bind(0, { retrain_count: 10 });
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: winnow2
});
var priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of priorityTypeClassification.trainset) {
    set.input[set.input.reference] = 1;
    set.input[set.input.symptom] = 1;
    set.input[set.input.position] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.priority;
}
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);
for (let set of priorityTypeClassification.testset) {
    set.input[set.input.reference] = 1;
    set.input[set.input.symptom] = 1;
    set.input[set.input.position] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.priority;
}
classificationEvaluation(priorityTypeClassifier, priorityTypeClassification.testset, 'Winnow - 1');

var winnow2 = limdu.classifiers.Winnow.bind(0, { retrain_count: 10 });
var priorityTypeClassifier = new limdu.classifiers.multilabel.BinaryRelevance({
    binaryClassifierType: winnow2
});
var priorityTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of priorityTypeClassification.trainset) {
    set.input[set.input.symptom] = 1;
    set.input[set.input.position] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.priority;
}
priorityTypeClassifier.trainBatch(priorityTypeClassification.trainset);
for (let set of priorityTypeClassification.testset) {
    set.input[set.input.symptom] = 1;
    set.input[set.input.position] = 1;
    delete set.input.reference;
    delete set.input.symptom;
    delete set.input.position;
    set.output = set.output.priority;
}
classificationEvaluation(priorityTypeClassifier, priorityTypeClassification.testset, 'Winnow - 2');

console.log('done. see: ' + fileName);