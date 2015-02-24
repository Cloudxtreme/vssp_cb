var uuid = require('node-uuid');
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var os = require('os');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var strftime = require('strftime');
var request = require('request');
var logger = require('./../logger/logger').localLogger;

//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var user = require(__dirname + '/../nodes/user.js')
var nodehandler = require(__dirname + '/../nodes/nodehandler.js');

var error_info = '';
var server_host = 'http://localhost:' + constants.BOARD_PORT;

var args = process.argv;
logger.info('Cmd line args:' + args.slice(2));

var task = args[2];
if(S(task).isEmpty()) {
	logger.error('Task is not defined in the arguments. Terminating the exection.');
	process.exit(1);
}

var username = args[3];
if(S(username).isEmpty()) {
	logger.error('Username to be handled is NOT given. Terminating the execution...');
	process.exit(1);
}

var authenticatedKey = '';
var userid = '';
var device = getDevice();
if(device == null) {
	logger.error('Failed in getting the device configuration... Terminating the execution...');
	process.exit(1);
}

var userDetails = device.users[0];
var localUser = userDetails['username'];
var localPassword = userDetails['password'];

if(S(localUser).isEmpty() || S(localPassword).isEmpty()) {
	logger.error('Failed in getting the username/pwd to handle user services. Terminating the execution.');
	process.exit(1);
}

localPassword = user.decryptPassword(localPassword, device);
if(task === 'createnormaluser') {
	authenticate(localUser, localPassword, createNormalUser);
} else if(task === 'deletenormaluser') {
	authenticate(localUser, localPassword, deleteNormalUser);
} else if(task === 'createadminuser') {
	authenticate(localUser, localPassword, createAdminUser);
} else {
	logger.error('Unknown task:' + task + ', Terminating the execution..');
	process.exit(1);
}

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	return getJsonObjectFromFile(device_file);
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//console.log('reading the file:' + file_name);
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

function createNormalUser() {
	logger.info('Creating normal user...');
	var password = args[4];
	if(S(password).isEmpty()) {
		logger.error('Password for the user is NOT given. Terminating the execution...');
		process.exit(1);
	}

	var email = args[5];
	if(S(email).isEmpty()) {
		logger.error('Email for the user is NOT given. Terminating the execution...');
		process.exit(1);
	}	
	
	var data =  'username=' + username +  '&password=' + password + '&email=' + email + '&auth_id=' + authenticatedKey;
	
	var url = server_host + '/board/createUser';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				error_info = 'Failed to establish connection to Server. Error:' + e.message + ', Terminating the execution...';
				logger.error(error_info);
				return;		
			}
			
			try {
				//logger.info(s_response);
				
				var results = JSON.parse(body);
				logger.info(JSON.stringify(results));

				//extract data
				if(results.status != 'SUCCESS') {
					logger.error('Failure in adding the normal user:' + username + ', Terminating the execution...')
					process.exit(1);
				}
				logger.info('Successfully added the user:' + username);
				signOut(userid);
			} catch(ex) {
				logger.info('Exception occurred while creating the normal user:' + username + ', Error:' + ex);
			}
		});	
}

function deleteNormalUser() {
	logger.info('Deleting normal user...');
	var data =  'username=' + username + '&auth_id=' + authenticatedKey;
	
	var url = server_host + '/board/deleteUser';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				error_info = 'Failed to establish connection to Server. Error:' + e.message + ', Terminating the execution...';
				logger.error(error_info);
				return;		
			}
			
			try {
				//logger.info(s_response);
				
				var results = JSON.parse(body);
				logger.info(JSON.stringify(results));

				//extract data
				if(results.status != 'SUCCESS') {
					logger.error('Failure in deleting the normal user:' + username + ', Terminating the execution...')
					process.exit(1);
				}
				logger.info('Successfully deleted the user:' + username);
				signOut(userid);
			} catch(ex) {
				logger.info('Exception occurred while deleting the normal user:' + username + ', Error:' + ex);
			}
		});	
}

function createAdminUser() {
	logger.info('Creating admin user...');
	var password = args[4];
	if(S(password).isEmpty()) {
		logger.error('Password for the user is NOT given. Terminating the execution...');
		process.exit(1);
	}

	var email = args[5];
	if(S(email).isEmpty()) {
		logger.error('Email for the user is NOT given. Terminating the execution...');
		process.exit(1);
	}	
	
	var data =  'username=' + username +  '&password=' + password + '&email=' + email + '&auth_id=' + authenticatedKey + '&type=admin';
	
	var url = server_host + '/board/createUser';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				error_info = 'Failed to establish connection to Server. Error:' + e.message + ', Terminating the execution...';
				logger.error(error_info);
				return;		
			}
			
			try {
				//logger.info(s_response);
				
				var results = JSON.parse(body);
				logger.info(JSON.stringify(results));

				//extract data
				if(results.status != 'SUCCESS') {
					logger.error('Failure in adding the admin user:' + username + ', Terminating the execution...')
					process.exit(1);
				}
				logger.info('Successfully added the admin user:' + username);
				signOut(userid);
			} catch(ex) {
				logger.info('Exception occurred while creating the admin user:' + username + ', Error:' + ex);
			}
		});	
}
function signOut(userid) {
	
	var auth_url = server_host + '/signOut';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : auth_url,
		body: 'auth_id=' + authenticatedKey
		}, function(e, s_response, body) {
			logger.info('Signed out successfully');
			process.exit(0);
		});
}

function authenticate(user, password, fnCall) {
	logger.info('Authentication with user:' + user  + ' with password:' + password + ' in-progress...');
	var dataToPost = 'username=' + user + '&password=' + password;
	
	var auth_url = server_host + '/board/userauthenticate';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : auth_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				error_info = 'Failed to establish connection to Server. Error:' + e.message;
				logger.error(error_info);
				return;		
			}
			
			try {
				//logger.info(s_response);
				
				var results = JSON.parse(body);
				//logger.info(JSON.stringify(results));

				//extract data
				if(results.status != 'SUCCESS') {
					logger.error('Failure in authenticating the user:' + user + ', Terminating the execution...')
					process.exit(1);
				}
				logger.info('Authentication success. Response:' + util.inspect(results));
				var tokens = results['vssp_user'].split(':');
				authenticatedKey = tokens[0];
				userid = tokens[2];
				//start record
				fnCall();
			} catch(ex) {
				logger.error('Exception occurred in authentication.' + ex);
			}
		});	
}

