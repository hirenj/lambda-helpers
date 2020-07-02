'use strict';
/*jshint esversion: 6, node:true */

var fs = require('fs');
var AWS = require('./aws-promise');

var getSecretKmsLocal = function getSecretKmsLocal(filename) {
  return new Promise(function(resolve,reject) {
    fs.readFile(filename,function(err,data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(JSON.parse(data));
    });
  });
};

var getSecretS3 = function getSecretS3(bucket) {
  var s3 = new AWS.S3();
  var params = {
    Bucket: bucket,
    Key: 'conf/creds.kms.json.encrypted'
  };
  return s3.getObject(params).promise().then(function(result) {
    return JSON.parse(result.Body.toString());
  });
};

var getEncryptedSecret = function getEncryptedSecret(bucket) {
  var kms = new AWS.KMS();

  var secretPath = './creds.kms.json.encrypted';
  return getSecretKmsLocal(secretPath).catch(function() {
    console.log('No bundled KMS credentials, checking on S3');
    return getSecretS3(bucket);
  }).then(function(encryptedSecret) {
    if ( encryptedSecret.store !== 'kms') {
      throw new Error('Not a kms encrypted secret');
    }

    delete encryptedSecret.store;
    delete encryptedSecret.KeyId;
    encryptedSecret.CiphertextBlob = new Buffer(encryptedSecret.CiphertextBlob, 'base64');
    return kms.decrypt(encryptedSecret).promise();
  }).then(function(data) {
    var decryptedSecret = data.Plaintext.toString();
    return decryptedSecret;
  });
};

var readLocalSecret = function readLocalSecret() {
  throw new Error('Unsupported');
};

exports.use_kms = true;

exports.getSecret = function getSecret(bucket) {
	if ( exports.use_kms ) {
		return getEncryptedSecret(bucket);
	}
	return readLocalSecret();
};