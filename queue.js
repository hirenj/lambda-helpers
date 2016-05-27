'use strict';
/*jshint esversion: 6, node:true */

var AWS = require('./aws-promise');
var sqs = new AWS.SQS();

var sqs_get_queue = function(queue) {
  if (queue.match(/^https/)) {
    return Promise.resolve(queue);
  }
  return sqs.getQueueUrl({'QueueName' : queue }).promise().then(function(result) {
      return result.QueueUrl;
  });
};

var sqs_create_queue = function(queue,timeout) {
  const queue_details = { 'QueueName' : queue,
                        'Attributes' : {
                          'VisibilityTimeout' : (timeout || 300)+''
                        }
                      };
  return sqs.createQueue(queue_details).promise().then(function(result) {
    return result.QueueUrl;
  });
};

var sqs_send_message = function(queueUrl, message) {
  const params = {'QueueUrl' : queueUrl , 'MessageBody' : JSON.stringify(message) };
  return sqs.sendMessage(params).promise();
};

var sqs_get_active_messages = function(queueUrl) {
  const params = {
                'QueueUrl' : queueUrl,
                'AttributeNames' : ['ApproximateNumberOfMessagesNotVisible',
                                    'ApproximateNumberOfMessages'
                                   ]
                  };
  return sqs.getQueueAttributes(params).promise().then(function(data) {
    return ([ parseInt(data.Attributes.ApproximateNumberOfMessagesNotVisible),
              parseInt(data.Attributes.ApproximateNumberOfMessages) ] );
  });
};

var sqs_delete_message = function(queueUrl,receiptHandle) {
  const params = {'QueueUrl' : queueUrl, 'ReceiptHandle' : receiptHandle };
  return sqs.deleteMessage(params).promise();
};

var sqs_reset_timeout = function(queueUrl,receiptHandle) {
  var params = {'QueueUrl' : queueUrl, 'ReceiptHandle' : receiptHandle, 'VisibilityTimeout' : '0' };
  return sqs.changeMessageVisibility(params).promise();
};

var sqs_receive_messages = function(queueUrl,number) {
  const params = {  'QueueUrl' : queueUrl ,
                    'MaxNumberOfMessages': number
                  };
  return sqs.receiveMessage(params).promise().then(function(data) {
    (data.Messages || []).forEach(function(message) {
      message.finalise = function() {
        return sqs_delete_message(queueUrl, message.ReceiptHandle );
      };
      message.unshift = function() {
        return sqs_reset_timeout(queueUrl, message.ReceiptHandle );
      };
    });
    return (data.Messages || []);
  });
};

var Queue = function Queue(name) {
  this.name = name;
};

Queue.prototype.ensureQueue = function ensureQueue(queue) {
  if (this.queue) {
    return this.queue;
  }
  sqs_get_queue(queue).then(function(queueUrl) {
    if (! queueUrl ) {
      return sqs_create_queue(queue);
    }
    return queueUrl;
  });
};

Queue.prototype.getQueue = function getQueue(queue) {
  if (this.queue) {
    return this.queue;
  }
  this.queue = sqs_get_queue(queue);
  return this.queue;
};

Queue.prototype.sendMessage = function sendMessage(message) {
  return this.getQueue(this.name).then(function(queueUrl) {
    return sqs_send_message(queueUrl,message);
  });
};

Queue.prototype.getActiveMessages = function getActiveMessages() {
  return this.getQueue(this.name).then(function(queueUrl) {
    return sqs_get_active_messages(queueUrl);
  });
};

Queue.prototype.shift = function shift(number) {
  return this.getQueue(this.name).then(function(queueUrl) {
    return sqs_receive_messages(queueUrl,number);
  });
};

Queue.prototype.finalise = function finalise(receiptHandle) {
  return this.getQueue(this.name).then(function(queueUrl) {
    return sqs_delete_message(queueUrl, receiptHandle );
  });
};

Queue.prototype.unshift = function finalise(receiptHandle) {
  return this.getQueue(this.name).then(function(queueUrl) {
    return sqs_reset_timeout(queueUrl, receiptHandle );
  });
};


exports.queue = Queue;