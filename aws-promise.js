'use strict';
/*jshint esversion: 6, node:true */

var AWS = require('aws-sdk');

AWS.config.update({region: 'us-east-1'});

var promisify = function(aws) {
  aws.Request.prototype.promise = function() {
    return new Promise(function(accept, reject) {
      this.on('complete', function(response) {
        if (response.error) {
          reject(response.error);
        } else {
          accept(response.data);
        }
      });
      this.send();
    }.bind(this));
  };
};

promisify(AWS);

module.exports = AWS;