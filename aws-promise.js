'use strict';
/*jshint esversion: 6, node:true */

var AWS = require('aws-sdk');

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

AWS.setRegion = function(region) {
  AWS.config.update({region: region });
};

module.exports = AWS;