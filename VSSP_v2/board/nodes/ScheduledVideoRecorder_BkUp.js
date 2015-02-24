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
var nodehandler = require('./nodehandler.js');
var recordhandler = require('./ScheduledVideoRecorderHandler.js');
var motionDetector = require('./ScheduledMotionDetectRecorder.js');
var logger = require('./../logger/logger').logger;
var request = require('request');
exports.error_info='';

//Format is
//node ScheduledVideoRecorder.js node_name node_id user_id duration videoProfileID parentBatchID
console.log('The args:' + process.argv);
/*
if(process.argv.length < 12) {
	logger.error('Failed as mandatory arguments are missing. Terminating the scheduled video recording');
	process.exit(1);
}
*/
console.log('Input args found as:' + process.argv);
process.on('exit', function(exitCode, signal) {
	logger.error('Scheduled Video recording is terminated with exitCode:%d, Terminate signal:%d', exitCode, signal);
});
console.log('The input file is:' + process.argv[2]);
var requestFile = getJsonObjectFromFile(process.argv[2])

if(requestFile == null) {
	logger.error('Failed to get the video record request file:' + requestFile + ' from arguments. Terminating the scheduled video recording');
	process.exit(1);
}

var node_name = requestFile['node_name']; //process.argv[2];
console.log('Checking the node name:'+ node_name);
if(S(node_name).isEmpty()) {
	logger.error('Failed as Video Record Node name is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var node_id =  requestFile['node_id']; //process.argv[3];
console.log('Checking the node id:'+ node_id);
if(S(node_id).isEmpty()) {
	logger.error('Failed as Video Record Node ID is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var user_id = requestFile['user_id'];; //process.argv[4];
console.log('Checking the user id:'+ user_id);
if(S(user_id).isEmpty()) {
	logger.error('Failed as User ID is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var duration =  requestFile['scheduled_record_duration'];; //process.argv[5];
console.log('Checking the Duration:'+ duration);
if(! S(duration).isNumeric()) {
	logger.error('Video duration is found as invalid (non-numeric). Failed in starting the video record');
	process.exit(1);
}


var profileID = requestFile['video_profile'];; //process.argv[6];
console.log('Checking the Video Profile ID:'+ profileID);
if(S(profileID).isEmpty()) {
	logger.error('Video Profile ID is found as null / empty. Failed in starting the video record');
	process.exit(1);
}

var parentBatchID = requestFile['videoBatchID'];; //process.argv[7];
console.log('Checking the Parent batch id:'+ parentBatchID);
if(S(parentBatchID).isEmpty()) {
	logger.error('Parent batch id is found as null / empty. Failed in starting the video record');
	process.exit(1);
}

var record_service_type = requestFile['record_service_type'];; //process.argv[8];
console.log('Checking the Parent batch id:'+ record_service_type);
if(S(record_service_type).isEmpty()) {
	logger.error('Record_service_type is found as null / empty. Failed in starting the video record');
	process.exit(1);
}

var motion_detect = requestFile['enableMotionDetect'];; //process.argv[9];
console.log('Checking the Motion Detect Enabled:'+ motion_detect);
if(S(motion_detect).isEmpty()) {
	logger.error('Motion Detect Enabled option is found as null / empty. Failed in starting the video record');
	process.exit(1);
}

var motion_detect_sensitive_level = requestFile['motion_detect_sensitive_level'];; //process.argv[10];
console.log('Checking the Motion Detect sensitivity:'+ motion_detect_sensitive_level);
if(S(motion_detect_sensitive_level).isEmpty()) {
	logger.error('Motion Detect Sensitive Enabled option is found as null / empty. Failed in starting the video record');
	process.exit(1);
}

var detect_motion_on_screen = requestFile['detect_motion_on_screen'];; //process.argv[11];
console.log('Checking the Motion Detect On Screen Enabled:'+ detect_motion_on_screen);
if(S(detect_motion_on_screen).isEmpty()) {
	logger.error('Motion Detect On Screen Enabled option is found as null / empty. Failed in starting the video record');
	process.exit(1);
}


startScheduledRecording(node_name, user_id, node_id, duration, profileID, parentBatchID, record_service_type, motion_detect_sensitive_level, detect_motion_on_screen);

function startScheduledRecordingWithMotionDetectEnabled(videoBatchID, motion_detect_sensitive_level, detect_motion_on_screen) {
	motionDetector.startMotionDetect(node_name, node_id, user_id, duration, profileID, videoBatchID, parentBatchID, record_service_type, motion_detect_sensitive_level, detect_motion_on_screen);
}

function startScheduledRecording(node_name, user_id, node_id, duration, videoProfileID, parentBatchID, record_service_type, motion_detect_sensitive_level, detect_motion_on_screen) {

	var status = false;
	var node = getNode(node_name);
	if(node == null) {
		error_info = error_info + ' Failed in starting the video record';
		logger.error(error_info);
		return;
	}
		
	//Get the video profile that user has selected
	//var profile_name = node.video_profile_id;
	console.log('User selected video profile is:' + videoProfileID);
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
	if(motion_detect == 'on') {
		console.log('Starting the scheduled video record with motion detect enabled');
		startScheduledRecordingWithMotionDetectEnabled(videoBatchID, motion_detect_sensitive_level, detect_motion_on_screen);
		return;
	}
	console.log('Scheduled record enabled. Motion Detect is set to OFF');
	
	
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
			isRecordingStarted(node_name, node_id, user_id, duration, port, duration, videoProfileID, videoBatchID, parentBatchID, record_service_type);
		}, 10000);
	});
}

function isRecordingStarted(node_name, node_id, user_id, duration, port, duration, videoProfileID, videoBatchID, parentBatchID, record_service_type) {
	var status = false;
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + '_' + videoBatchID + constants.SCHEDULED_RECORD_INPROGRESS_STORE_FILE_SUFFIX
	try {
		if(! fs.existsSync(runtime_inprogress_file)) {
			console.log('The inprogress object for node' + node_name + ' doesn\'t exist');
			error_info = 'Failed in starting the video record process in node:' + node_name;
			logger.error(error_info);			
			return status;
		}
		
		setTimeout(function() {
			portchecker.checkPortStatus(port, 'localhost', function(error, status) {
				// Status is 'open' if currently in use or 'closed' if available
				console.log('Port status is:' + status);
				
				if(status === 'open') {
					/*
					response.status = 'SUCCESS';
					response.error_info = '';
					response.result = 'Success in starting the video record in node:' + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));		
					*/					
					sendVideoRecordScheduledRequestOptionToServer(node_name, node_id, user_id, duration, videoProfileID, videoBatchID, parentBatchID, record_service_type, 'RECORDING INPROGRESS', 'Successfully started the record service');
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

function sendVideoRecordScheduledRequestOptionToServer(node_name, node_id, user_id, duration, videoProfileID, videoBatchID, parentBatchID, record_service_type,  status, comments) {
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		error_info = 'Device Configuration not found.';
		logger.error(error_info);
		return;
	}

	var board_id = device.id;
	var service_name = 'Video Record Scheduled Service';
	var service_desc = 'Video record schedule service starts now';
	
	var dataToPost = 'batch_id=' + videoBatchID + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&duration=' + duration + '&video_profile=' + videoProfileID;
	dataToPost += '&parent_batch_id=' + parentBatchID;
	dataToPost += '&record_service_type=' + record_service_type;
	dataToPost += '&service_name=' + service_name + '&service_desc=' + service_desc + '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	console.log('The data to post is:' + dataToPost);
	
	var site_url = device.site_server + 'storeVideoRecordScheduledServiceOptions';
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
		console.log(error_info);
		return node;		
	}

	if(! nodehandler.isNodePresent(node_name)) {
		error_info = 'Failed in getting the node. Node:' + node_name + ' doesn not present';		
		console.log(error_info);
		return node;
	}
	
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	var stats = fs.statSync(node_store_file);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the node. Node specification is not found';		
		console.log(error_info);
		return node;
	}

	var node = getJsonObjectFromFile(node_store_file);
	if(node == null) {
		error_info = 'Failed in getting the node. Node specification object content is found as null';	
		console.log(error_info);
		return node;
	}
	console.log('Successfully got the node for:' + node_name);	
	return node;
}

function getVideoProfile(profile_name) {
	
	var vp = null;
	if(S(profile_name).isEmpty() || S(profile_name).contains(' ')) {
		error_info = 'Failed in getting the Video Profile. Profile Name found as null / cannot have spaces.';
		console.log(error_info);
		return vp;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
	var stats = fs.statSync(profile_file_name);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the Video Profile. Video profile:' + profile_name + ' is not found';		
		console.log(error_info);
		return vp;
	}

	vp = getJsonObjectFromFile(profile_file_name);
	if(vp == null) {
		error_info = 'Failed in getting the Video Profile. Video Profile content is found as null';		
		console.log(error_info);
		return vp;
	}	
	console.log('Successfully got the video profile for:' + profile_name);	
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

