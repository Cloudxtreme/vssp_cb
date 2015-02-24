var constants = require('./../constants');
var fs = require('fs');
var crypto = require('crypto');
var time_format = require('strftime');
var store=__dirname

exports.test_folder=store
console.log('test is:' + this.test_folder);

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//console.log('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//logger.debug('reading the file:' + file_name);
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
			console.error('Exception occurred while parsing the json object. Error:' + err);
		}
	} catch(err) {
		console.error('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

encryptPassword = function(pwd, device) {

	var key = new Buffer(device.name).toString('base64');
	var cipher = crypto.createCipher(constants.USER_PWD_ENCRYPT_ALG, key);  
	var encrypted = cipher.update(pwd, 'utf8', 'base64') + cipher.final('base64');
	return encrypted;
}

decryptPassword = function(pwd, device) {

	var key = new Buffer(device.name).toString('base64');
	var cipher = crypto.createDecipher(constants.USER_PWD_ENCRYPT_ALG, key);  
	var decrypted = cipher.update(pwd, 'base64', 'utf8') + cipher.final('utf8');
	return decrypted;
}

console.log('Time:' + time_format('%s'));

/*
var data = 'helloworlddxfzj\'klds jfkdfjg kjdfskgjdsf \'kdsfjgdslkfng;kdf dsfj ksm fds';
var eData = encryptPassword(data, getDevice());
console.log('enc data:' + eData);

var dData = decryptPassword(eData, getDevice());
console.log('dec data:' + dData);
*/