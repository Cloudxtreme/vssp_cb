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

var nodeName = args[3];
if(S(nodeName).isEmpty()) {
	logger.error('Node name in which the recording to be started is NOT given. Terminating the execution...');
	process.exit(1);
}

var node = getNode(nodeName);
if(node == null) {
	logger.error('Failed in getting the node name details for node:' + nodeName + '. Terminating the execution...');
	process.exit(1);
}

var authenticatedKey = '';
var userid = '';
var device = getDevice();
if(device == null) {
	logger.error('Failed in getting the device configuration... Terminating the execution...');
	process.exit(1);
}

/*
var userDetails = device.users[0].split(':');

var userName = userDetails[0];
var password = userDetails[1];
*/
var userDetails = device.users[0];

var userName = userDetails['username'];
var password = userDetails['password'];

if(S(userName).isEmpty() || S(password).isEmpty()) {
	logger.error('Failed in getting the username/pwd to handle the video record start/stop services. Terminating the execution.');
	process.exit(1);
}

password = user.decryptPassword(password, device);

if(task === 'recordstart') {
	var duration = args[4];
	if(S(duration).isEmpty()) {
		logger.info('Duration is not given. Starting continuous recording..');
		duration = 0;
	} else {
		if(! S(duration).isNumeric()) {
			logger.error('Record duration is invalid. Terminating the execution...');
			process.exit(1);
		}
	}
	authenticate(userName, password, startRecord);
} else if(task === 'recordstop') {
	authenticate(userName, password, stopRecord);
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

function getNode(node_name) {
	var node = null;
	if(S(node_name).isEmpty() || S(node_name).contains(' ')) {
		error_info = 'Failed in getting the node. Node name could be null / cannot have spaces.';
		logger.debug(error_info);
		return node;		
	}

	if(! nodehandler.isNodePresent(node_name)) {
		error_info = 'Failed in getting the node. Node:' + node_name + ' doesn not present';		
		logger.debug(error_info);
		return node;
	}
	
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	var stats = fs.statSync(node_store_file);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the node. Node specification is not found';		
		logger.debug(error_info);
		return node;
	}

	var node = getJsonObjectFromFile(node_store_file);
	if(node == null) {
		error_info = 'Failed in getting the node. Node specification object content is found as null';	
		logger.debug(error_info);
		return node;
	}
	logger.debug('Successfully got the node for:' + node_name);	
	return node;
}

function stopRecord() {
	logger.info('Stopping the recording..');
	var data =  'user_id=' + userid +  '&node_id=' + node.node_id + '&node_name=' + node.node_name + '&auth_id=' + authenticatedKey;
	
	var video_record_stop_url = server_host + '/board/stopVideoRecording';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : video_record_stop_url,
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
					logger.error('Failure in stopping the video record at node:' + node.node_name + ', Terminating the execution...')
					process.exit(1);
				}
				logger.info('Successfully stopped the video recording in node:' + node.node_name);
				signOut(userid);
			} catch(ex) {
			
			}
		});		
}

function startRecord() {
	logger.info('Starting video record...');
	var data =  'user_id=' + userid +  '&node_id=' + node.node_id + '&node_name=' + node.node_name + '&immediate_record_duration=' + duration +'&video_profile=1&record_service_type=1&record_schedule_type=\'\'&start_record_time=\'\'&end_record_time=\'\'&scheduled_record_duration=\'\'&record_schedule_day=\'\'&selected_date=\'\'&auth_id=' + authenticatedKey;
	data += '&enableMotionDetect=off';
	data += '&motion_detect_sensitive_level=min';
	data += '&detect_motion_on_screen=off';
	data += '&enableNotification=off';
	data += '&emailList=\' \'';

	var video_record_url = server_host + '/board/startVideoRecording';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : video_record_url,
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
					logger.error('Failure in authenticating the user:' + user + ', Terminating the execution...')
					process.exit(1);
				}
				logger.info('Successfully started the execution. in node:' + node.node_name);
				signOut(userid);
			} catch(ex) {
			
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
	logger.info('Authentication in-progress...');
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

