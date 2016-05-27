'use strict';
/*jshint esversion: 6, node:true */

var keytar = require('keytar');

var crypto = require('crypto');

var algorithm = 'aes-256-ctr';

var encrypt = function encrypt(buffer,password){
  var cipher = crypto.createCipher(algorithm,password);
  var crypted = Buffer.concat([cipher.update(buffer),cipher.final()]);
  return crypted;
};
 
var decrypt = function decrypt(buffer,password){
  var decipher = crypto.createDecipher(algorithm,password);
  var dec = Buffer.concat([decipher.update(buffer) , decipher.final()]);
  return dec;
};

/** Sync */
var make_password = function make_password(size) {
  const buf = crypto.randomBytes(size);
  return Promise.resolve(buf.toString('base64'));
};

var get_main_password = function() {
  var master_pass = keytar.getPassword('kmish','master');
  if (! master_pass) {
    return make_password(30).then(function(token) {
      keytar.addPassword('kmish','master',token);
    }).then(get_main_password);
  }
  return Promise.resolve(master_pass);
};

var decrypt_data = function decrypt_data(params,callback) {
  var data_string = params.CiphertextBlob;
  var data = JSON.parse((new Buffer(data_string,'base64')).toString());
  var result = get_main_password().then(function(password) {
    var unwrapped_key = decrypt(new Buffer(data.key,'base64'),password).toString('base64');
    var unencrypted = decrypt(new Buffer(data.data,'base64'),unwrapped_key).toString('utf8');
    var res = {
      'KeyId' : 'Some Key',
      'Plaintext' : unencrypted
    };
    if (callback) {
      callback(null,res);
    }
    return res;
  }).catch(function(err) {
    console.error(err);
    console.log(err.stack);
    if (callback) {
      callback(err);
    } else {
      throw err;
    }
  });
  return { promise: () => result };
};

var encrypt_data = function encrypt_data(params,callback) {
  var data_string = params.PlainText;
  var result = get_main_password().then(function(password) {
    return make_password(30).then(function(unwrapped_key) {
      var encrypted_data = encrypt(new Buffer(data_string,'utf8'),unwrapped_key).toString('base64');
      var encrypted_key = encrypt(new Buffer(unwrapped_key,'base64'),password).toString('base64');
      var data = new Buffer(JSON.stringify({'key' : encrypted_key, 'data' : encrypted_data })).toString('base64');
      if (callback) {
        callback(null,data);
      }
      return data;
    });
  }).catch(function(err){
    console.error(err);
    console.log(err.stack);
    if (callback) {
      callback(err);
    } else {
      throw err;
    }
  });
  return { promise: () => result };
};


exports.decrypt = decrypt_data;
exports.encrypt = encrypt_data;