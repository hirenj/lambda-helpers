"use strict";

const https = require('https');

exports.AWS = require('./aws-promise');
exports.events = require('./events');

exports.get_file = function(url) {
	return new Promise(function(resolve,reject) {
		https.get(url, function(res) {
			res.setEncoding('utf8');
			let body = '';
			res.on('data', (chunk) => body += chunk);
			res.on('end', function() {
				body = JSON.parse(body);
				resolve(body);
			});
		}).on('error',function(err) {
			reject(err);
		});
	});
};