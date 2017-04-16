var C45 = require('c4.5');

var incidentClassification = require('./classification.json');

var features = ['attr1', 'attr2'];
var featureTypes = ['category', 'category'];

/*
 * Classification of type
 */

console.log('c4.5: type');

var trainingData = [];
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
	var o = [];
	o.push(set.input.reference || set.input.position);
	o.push(set.input.symptom);
	o.push(set.output.type);

	trainingData.push(o);
}

var target = 'type';
var c45 = C45();

c45.train({
	data: trainingData,
	target: target,
	features: features,
	featureTypes: featureTypes
}, function (error, model) {
	if (error) {
		console.error(error);
		return false;
	}

	var successCount = 0;
	var errorCount = 0;

	var testData = [];
	for (let set of incidentTypeClassification.testset) {
		var o = [];
		o.push(set.input.reference || set.input.position);
		o.push(set.input.symptom);
		o.push(set.output.type);

		var result = model.classify(o);

		if (result === set.output.type) {
			successCount++;
		} else {
			errorCount++;
		}

		// console.log(model.classify(o));

	}
	console.log('success: ' + successCount);
	console.log('error: ' + errorCount);
});


/*
 * Classification of priority
 */

console.log('c4.5: priority');

var trainingData = [];
var incidentTypeClassification = JSON.parse(JSON.stringify(incidentClassification)); // deep clone hack
for (let set of incidentTypeClassification.trainset) {
	var o = [];
	o.push(set.input.position || set.input.reference);
	o.push(set.input.symptom);
	o.push(set.output.priority);

	trainingData.push(o);
}

var target = 'type';
var c45 = C45();

c45.train({
	data: trainingData,
	target: target,
	features: features,
	featureTypes: featureTypes
}, function (error, model) {
	if (error) {
		console.error(error);
		return false;
	}

	var successCount = 0;
	var errorCount = 0;

	var testData = [];
	for (let set of incidentTypeClassification.testset) {
		var o = [];
		o.push(set.input.position || set.input.reference);
		o.push(set.input.symptom);
		o.push(set.output.priority);

		var result = model.classify(o);

		if (result === set.output.priority) {
			successCount++;
		} else {
			errorCount++;
		}

		// console.log(model.classify(o));

	}
	console.log('success: ' + successCount);
	console.log('error: ' + errorCount);
});