'use strict';
/*jshint esversion: 6, node:true */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var AWS = require('./aws-promise');

function LocalEmitter() {
  EventEmitter.call(this);
}

util.inherits(LocalEmitter, EventEmitter);

var notifier = new LocalEmitter();

var subscribe_local = function subscribe_local(params,cb) {
	notifier.on(params.topic,cb);
	return Promise.resolve(true);
};

var publish_local = function publish_local(params) {
	notifier.emit(params.topic,{'Records' : [{'Sns' : { 'Message' : params.Message } }]});
	return Promise.resolve(true);
};

var topic_arns = {};

var sns_get_arn = function(params) {
	if (params.topic.match(/^arn:/)){
		return Promise.resolve(params.topic);
	}
	if (topic_arns[params.topic]) {
		return topic_arns[params.topic];
	}
	var sns = new AWS.SNS();

	topic_arns[params.topic] = sns.listTopics.promise().then(function(topicarns) {
		var arns = topicarns.Topics.filter((arn) => arn.TopicArn.split(':').reverse()[0] == params.topic);
		return arns[0].TopicArn;
	});
	return topic_arns[params.topic];
};

var publish_sns = function(params) {
	return sns_get_arn(params).then(function(arn) {
		params.TopicArn = arn;
		delete params.topic;
		var sns = new AWS.SNS();
		return sns.publish(params).promise();
	});
};

var subscribe = function subscribe(params) {
	if (! exports.use_aws) {
		return subscribe_local(params);
	}
};

var publish = function publish(params) {
	if (! exports.use_aws) {
		return publish_local(params);
	}
	return publish_sns(params);
};


exports.subscribe = subscribe;
exports.publish = publish;
exports.use_aws = true;