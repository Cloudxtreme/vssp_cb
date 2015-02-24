var uuid = require('node-uuid');
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var time_format = require('strftime');
var freeport = require('freeport');
var portchecker = require('portscanner');
//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var user = require('./user.js')
var stringutils = require(__dirname + '/../../utils/stringutils.js');
var nodehandler = require('./nodehandler.js');
var recordhandler = require('./MotionDetectVideoRecorderHandler.js');
var logger = require('./../logger/logger').logger;
var request = require('request');
exports.error_info='';

//Format is
//node ScheduledVideoRecorder.js node_name node_id user_id duration videoProfileID parentBatchID
logger.debug('The args:' + process.argv);
if(process.argv.length < 7) {
	logger.error('Failed as mandatory arguments are missing. Terminating the scheduled video recording');
	process.exit(1);
}
logger.debug('Input args found as:' + process.argv);
process.on('exit', function(exitCode, signal) {
	clearEnvironment();
	logger.error('Motion Detect Video recording is terminated with exitCode:%d, Terminate signal:%d', exitCode, signal);
});

var node_name = S(process.argv[2]).trim().s;
logger.debug('Checking the node name:'+ node_name);
if(S(node_name).isEmpty()) {
	logger.error('Failed as Video Record Node name is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var node_id = S(process.argv[3]).trim().s;
logger.debug('Checking the node id:'+ node_id);
if(S(node_id).isEmpty()) {
	logger.error('Failed as Video Record Node ID is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var user_id = S(process.argv[4]).trim().s;
logger.debug('Checking the user id:'+ user_id);
if(S(user_id).isEmpty()) {
	logger.error('Failed as User ID is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var duration = S(process.argv[5]).trim().s;
logger.debug('Checking the Duration:'+ duration);
if(! S(duration).isNumeric()) {
	logger.error('Video duration is found as invalid (non-numeric). Failed in starting the video record');
	process.exit(1);
}

var profileID = S(process.argv[6]).trim().s;
logger.debug('Checking the Video Profile ID:'+ profileID);
if(S(profileID).isEmpty()) {
	logger.error('Video Profile ID is found as null / empty. Failed in starting the video record');
	process.exit(1);
}

startVideoRecording(node_name, user_id, node_id, duration, profileID);

function startVideoRecording(node_name, user_id, node_id, duration, videoProfileID) {

	var status = false;
	var node = getNode(node_name);
	if(node == null) {
		error_info = error_info + ' Failed in starting the video record';
		logger.error(error_info);
		return;
	}
		
	//Get the video profile that user has selected
	//var profile_name = node.video_profile_id;
	logger.debug('User selected video profile is:' + videoProfileID);
	var profile_name = videoProfileID;
	var vp = getVideoProfile(profile_name);
	if(vp == null) {
		error_info = error_info + ' Failed in starting the video record';
		response.error_info = error_info;
		logger.error(error_info);
		return;
	}
		
	//Dont check the video recording progress as we might want to do this for scheduled recording
	/*
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		
		if(fs.existsSync(runtime_inprogress_file)) {
			var stats = fs.statSync(runtime_inprogress_file);
			if(stats.isFile() && stats.size > 0) {
				error_info = 'Already video record is in-progress on node:' + node_name + '. Failed in starting the video record';
				logger.error(error_info);
				return;
			}
		}		
	} catch(err) {
		error_info = 'Error occurred while starting the video record on node:' + node_name + '. Error:' + err + ', Failed in starting the video record';
		logger.error(error_info);
		return;
	}
	*/
	
	if(! S(duration).isNumeric()) {
		error_info = 'Video duration is found as invalid (non-numeric). Failed in starting the video record';
		logger.error(error_info);
		return;
	}	
	var videoBatchID = time_format('%d_%m_%y_%H_%M_%S');
	freeport(function(err, port) {
		if(err) {
			error_info = 'Failed in starting the video recording. Error:' + err;
			logger.error(error_info);
			return;
		}
		var result = recordhandler.startVideoRecording(node, vp, duration, port, videoBatchID, user_id);
	
		if(! result) {
			error_info = recordhandler.error_info;
			logger.error(error_info);
			return;
		}
		
		//wait for the inprogress file avaialble or not
		setTimeout(function() {
			isRecordingStarted(node_name, node_id, user_id, duration, port, duration, videoProfileID, videoBatchID);
		}, 10000);
	});
}

function isRecordingStarted(node_name, node_id, user_id, duration, port, duration, videoProfileID, videoBatchID) {
	var status = false;
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + '_' + videoBatchID + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX
	try {
		if(! fs.existsSync(runtime_inprogress_file)) {
			logger.debug('The inprogress object for node' + node_name + ' doesn\'t exist');
			error_info = 'Failed in starting the video record process in node:' + node_name;
			logger.error(error_info);			
			return status;
		}
		
		setTimeout(function() {
			portchecker.checkPortStatus(port, 'localhost', function(error, status) {
				// Status is 'open' if currently in use or 'closed' if available
				logger.debug('Port status is:' + status);
				
				if(status === 'open') {
					/*
					response.status = 'SUCCESS';
					response.error_info = '';
					response.result = 'Success in starting the video record in node:' + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));		
					*/					
					sendVideoRecordScheduledRequestOptionToServer(node_name, node_id, user_id, duration, videoProfileID, videoBatchID, 'MOTION DETECTION INPROGRESS', 'Successfully started the record service');
					return;
				} else {
					error_info = 'Failed in starting the scheduled video record process in node:' + node_name;
					logger.error(error_info);					
					return;
				}
			});
		}, 2000);
	} catch(err) {
		error_info = 'exception occurred while checking the inprogress object for node:' + node_name + ', Error:' + err;
		logger.error(error_info);
	}
	return status;
}

function sendVideoRecordScheduledRequestOptionToServer(node_name, node_id, user_id, duration, videoProfileID, videoBatchID, status, comments) {
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		error_info = 'Device Configuration not found.';
		logger.error(error_info);
		return;
	}

	var board_id = device.id;
	var service_name = 'Motion Detect Video Record Scheduled Service';
	var service_desc = 'Motion Detect Video record schedule service starts now';
	
	var dataToPost = 'batch_id=' + videoBatchID + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&duration=' + duration + '&video_profile=' + videoProfileID;
	dataToPost += '&parent_batch_id=' + parentBatchID;
	dataToPost += '&service_name=' + service_name + '&service_desc=' + service_desc + '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	logger.debug('The data to post is:' + dataToPost);
	
	var site_url = device.site_server + 'storeMotionDetectVideoRecordServiceOptions';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				error_info = 'Failed to establish connection to Server. Error:' + e.message;
				logger.error(error_info);
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				logger.info(JSON.stringify(results));
				return;
			} catch(ex) {
			
			}
			//response.status = 'SUCCESS';
			//response.error_info = '';
			//response.result = 'Server connection successful';
			error_info = 'Failed to post the scheduled video service request details to server';
			logger.error(error_info);
		});
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

function getVideoProfile(profile_name) {
	
	var vp = null;
	if(S(profile_name).isEmpty() || S(profile_name).contains(' ')) {
		error_info = 'Failed in getting the Video Profile. Profile Name found as null / cannot have spaces.';
		logger.debug(error_info);
		return vp;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
	var stats = fs.statSync(profile_file_name);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the Video Profile. Video profile:' + profile_name + ' is not found';		
		logger.debug(error_info);
		return vp;
	}

	vp = getJsonObjectFromFile(profile_file_name);
	if(vp == null) {
		error_info = 'Failed in getting the Video Profile. Video Profile content is found as null';		
		logger.debug(error_info);
		return vp;
	}	
	logger.debug('Successfully got the video profile for:' + profile_name);	
	return vp;
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
		}
	} catch(err) {
		logger.error('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

clearEnvironment = function() {
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + node_name + constants.MOTION_INPROGRESS_STORE_FILE_SUFFIX;
	deleteFile(runtime_inprogress_file);
}

deleteFile = function(file) {
	try {
		if(fs.exists(file)) {
			fs.unlinkSync(file);
		}
	} catch(err) {
		logger.error('Failed in deleting the file:' + file + ', Err:' + err);
		return false;
	}
	return true;
}
