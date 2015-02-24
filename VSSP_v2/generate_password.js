var uuid = require('node-uuid');
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var os = require('os');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var logger = require('./board/logger/logger').logger;

//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require('./constants.js');
var user = require('./board/nodes/user.js')


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
			logger.error('Exception occurred while parsing the json object. Error:' + err);
		}
	} catch(err) {
		logger.error('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}
 
var device = getDevice();
if(device == null) {
	console.log('Failed to generate the password because failed to find the device file');
	process.exit(1);
}

var pwd = process.argv[2];
if(S(pwd).isEmpty()) {
	console.log('Password is not given. Failed to generate password');
	process.exit(1);
}

var password = user.encryptPassword(pwd, device);
console.log('Generated password is:' + password);
