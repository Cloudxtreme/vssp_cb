var uuid = require('node-uuid');
var nconf = require('nconf');
var url=require('url');
var util = require('util');
var path = require('path');
var endOfLine = require('os').EOL
var exec = require('child_process').exec;
var fs = require('fs');
var S = require('string');
var time_format = require('strftime');
var freeport = require('freeport');
var portchecker = require('portscanner');
var net = require('net');
//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var user = require('./user.js')
var nodehandler = require('./nodehandler.js');
var recordhandler = require('./recordhandler.js');
var motion = require('./MotionDetectRecorder');
//var mailer = require('./../mailer/Mailer');

var logger = require('./../logger/logger').logger;
var request = require('request');
var moment = require('moment');

exports.error_info='';
var recordRequestFile = '';
var lastConnectionLostNotificationTime = 0;
var cameraLostTimeDetails = {};

exports.updateVideoTag = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var obj = null;
	var video_id = req.body.video_id || req.query.video_id;
	var video_file = req.body.video_file || req.query.video_file;
	var video_tag_id = req.body.video_tag_id || req.query.video_tag_id;

	if(S(video_id).isEmpty() || S(video_file).isEmpty() || S(video_tag_id).isEmpty()) {
		response.error_info = 'Mandatory params like File/ID/Tag ID missing';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	try {
		var video_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + video_file;
		
		video_file = S(video_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
		logger.info('Updating video meta-data file:' + video_file);
		if(! fs.existsSync(video_file)) {
			response.error_info = 'Given video file doesnot exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		obj = getJsonObjectFromFile(video_file);
		if(obj != null) {
			obj['tag'] = video_tag_id;
		
			//write it back
			fs.writeFileSync(video_file, JSON.stringify(obj));
		} else {
			response.error_info = 'Failed to update the video tag in the video object.';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
	} catch(err) {
		response.error_info = 'Failed to update the video tag. Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = obj;
	res.json(200, response);
	logger.error(JSON.stringify(response));
}

exports.stopVideoRecording = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;
	
	response['node_id'] = node_id;
	response['node_name'] = node_name;

	//check video record progress
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		
		if(! fs.existsSync(runtime_inprogress_file)) {
			error_info = 'Video Recording is Not in-progress on node:' + node_name + '. Failed in stopping the video record';
			response.error_info = error_info;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}		
	} catch(err) {
	}
	
	var node = getNode(node_name);
	if(node == null) {
		error_info = error_info + ' Failed in stopping the video record';
		response.error_info = error_info;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var profile_name = node.video_profile_id;
	var vp = getVideoProfile(profile_name);
	if(vp == null) {
		error_info = error_info + ' Failed in stopping the video record';
		response.error_info = error_info;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	//var handler = new recordhandler();
	recordhandler.stopVideoRecording(req, res, node, vp);
}

startRecordingWithMotionDetectEnabled = function(req, res, videoBatchID) {
	motion.startMotionDetect(req, res, videoBatchID);
}


isStorageAlertPresent = function() {
	var alertData = getJsonObjectFromFile(constants.ALERT_FILE);
	if(alertData == null) {
		return false;
	}
	if(alertData[constants.STORAGE_ALERT_KEY]) {
		return true;
	}
	return false;
}

exports.startVideoRecording = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	if(isStorageAlertPresent()) {
		var node_name = req.body.node_name;
		
		response.error_info = 'Failed to start the recording in camera:' + node_name + ' as there was an alert on storage. Stopping the video record';
		res.json(200, response);
		logger.error(JSON.stringify(response));	
		return;
	}
	
	var videoBatchID = time_format(constants.FILE_NAME_DATE_TIME_FORMAT);
	var record_service_type = req.body.record_service_type || req.query.record_service_type;
	logger.debug('The record service type is:' + record_service_type);

	if(record_service_type == 2) {	
		storeServiceRequest(req, videoBatchID, true);
	} else {
		storeServiceRequest(req, videoBatchID, false);
	}
	if(record_service_type == 1) {
		logger.debug('Starts the immediate record...');
		startImmediateRecording(req, res);
		return;
	} else if(record_service_type == 2) {	
		scheduleVideoRecording(req, res, videoBatchID);
		return;
	} 
	logger.debug('Unknown Record Service Type..:' + record_service_type);
	response.error_info = 'Unknown Record Service Type..:' + record_service_type;
	res.json(200, response);
	logger.error(JSON.stringify(response));
	return;
}


storeServiceRequest = function(req, batch_id, scheduledRequest) {
	var node_name = req.body.node_name;
	if(S(node_name).isEmpty()) {
		return;
	}
	try {
		var storeServiceRequestFolder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.RECORD_SERVICE_REQUESTS_FOLDER;
		createFolder(constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name, constants.RECORD_SERVICE_REQUESTS_FOLDER);
		
		recordRequestFile = storeServiceRequestFolder + path.sep + 'RecordServiceRequest_' + node_name + '_' + batch_id + '.json';
		var options = req.body;
		options['videoBatchID'] = batch_id;
		options['scheduled_video_record'] = scheduledRequest;
		fs.writeFileSync(recordRequestFile, JSON.stringify(options));
	} catch(err) {
		logger.error('Failed in storing the record request for node:' + node_name + ', Error:' + err);		
	}
}

createFolder = function(parentFolder, folderName) {
	var result = false;
	var f = parentFolder + path.sep + folderName;
	logger.debug('Creating folder:' + f);
	try {
		fs.mkdirSync(f);
		result = true;
	} catch(err) {
		logger.error('Exception while creating folder. Error:' + err);
	}
	return result;
}

function scheduleVideoRecording(req, res, videoBatchID) {
	logger.debug('Schedule the video recording...');
	
	var response = JSON.parse(constants.JSON_RESPONSE);	
	var node_name = req.body.node_name || req.query.node_name;
	var user_id = req.body.user_id || req.query.user_id;
	var node_id = req.body.node_id || req.query.node_id;
	
	/*
	if(updateCronTabForThisScheduleVideoRecord(req, videoBatchID)) {
	} else {
		logger.error('Failed in updating the cron tab for scheduling the video record..');
	}
	*/
	//sendVideoRecordScheduledRequestOptionToServer(req, res, videoBatchID, 'Scheduled', 'Scheduled the video record request');
	updateCronTabForThisScheduleVideoRecord(req, res, videoBatchID);
}


function getFormattedStartTime(startTime) {
	var tokens = startTime.split(':');
	var m = new moment();
	m.minute(parseInt(tokens[1]));
	m.hour(parseInt(tokens[0]));
	
	m.subract('1', 'minute');
	
	return [m.hour(), m.minute()]; 
}

function updateCronTabForThisScheduleVideoRecord(req, res, videoBatchID) {

	try {
		logger.debug('Updating the cron tab for scheduled video record...:' + videoBatchID);
		var response = JSON.parse(constants.JSON_RESPONSE);
		var device_file = constants.DEVICE_FILE; 

		var device = getJsonObjectFromFile(device_file);
		if(device == null) {
			response.error_info = 'Device Configuration not found.';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return false;
		}
		
		var scheduleExecutorCmd = getScheduledExecutionCommand(req, videoBatchID);
		if(scheduleExecutorCmd == null) {
			response.error_info = 'Failed in forming the executor cmd for scheduled video execution';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return false;
		}
		
		var cronCmd = [];
		var record_schedule_type = req.body.record_schedule_type || req.query.record_schedule_type;
		var start_record_time = req.body.start_record_time || req.query.start_record_time;
		//var start_time_tokens = start_record_time.split(':');
		
		var m = new moment();
		var tokens = start_record_time.split(':');
		m.minute(parseInt(tokens[1]));
		m.hour(parseInt(tokens[0]));
		//logger.info('Moment now:' + m.format());
		m.subtract(1, 'minutes');
		//logger.info('Moment after subract:' + m.format());
		
		
		//var start_time_tokens = getFormattedStartTime(start_record_time);	
		//cronCmd.push(start_time_tokens[1]);
		//cronCmd.push(start_time_tokens[0]);
		
		cronCmd.push(m.minute());
		cronCmd.push(m.hour());

		if(record_schedule_type == 'Daily') {
			cronCmd.push('\\*');
			cronCmd.push('\\*');
			cronCmd.push('\\*');
		} else if(record_schedule_type == 'Weekly') {
			var record_schedule_day = req.body.record_schedule_day || req.query.record_schedule_day;
			cronCmd.push('\\*');
			cronCmd.push('\\*');
			cronCmd.push(record_schedule_day);
		} else if(record_schedule_type == 'On Date') {
			var selected_date = req.body.selected_date || req.query.selected_date;
			//logger.info('Selected Date is:' + selected_date);
			var m = new moment(selected_date, 'DD/MM/YYYY');
			//logger.info('Moment date is:' + m.format());
			//logger.info('Date from moment is:' + m.date() + ', Day is:' + m.day());
			var date_tokens = selected_date.split('/');
			
			cronCmd.push(m.date());
			cronCmd.push(m.month() + 1);
			cronCmd.push('\\*');
		}
		cronCmd.push(scheduleExecutorCmd);
		
		logger.debug('Scheduler Cmd is:' + cronCmd.join(' '));
		
		return addScheduledTaskToCronJob(req, cronCmd.join(' '), videoBatchID, res);
	} catch(err) {
		logger.debug('Exception while adding the scheduled task:' + err);
	}
	return '';
}

function updateCronTabFile(cmd, videoBatchID) {
	//videoBatchID = 'path';
	logger.debug('Executing cmd:' + 'crontab -l | grep ' + videoBatchID);
	var cronTabList = exec('crontab -l | grep ' + videoBatchID, function(err, stdout, stderr) {
		if(err) {
			logger.debug('Looks like the crontab video batch id:' + videoBatchID + ' doesn\'t exist');
			return addScheduledTaskToCronJob(cmd, videoBatchID);
		}
		var listOfTasks = stdout.toString();
		var errorData = stderr.toString();
		if(! S(listOfTasks).isEmpty()) {
			error_info = 'The Video batch ID:' + videoBatchID + ' already has been configured for scheduled execution';
			return false;
		}
	});
}

function addScheduledTaskToCronJob(req, cmd, videoBatchID, res) {
	//( crontab -l | grep -v "$croncmd" ; echo "$cronjob" ) | crontab -
	var updatedCmd = S(cmd).replaceAll('\\', '').s; // + '\n';
	logger.debug('Adding the cmd:' + cmd);
	var cronAddCmd = '( crontab -l | grep -v "' + videoBatchID + '" ; echo "' + updatedCmd + '" ) | crontab -';
	var cronTabAddCmd = exec(cronAddCmd, function(err, stdout, stderr) {
		/*
		if(err) {
			logger.error('Failed in adding the scheduled cmd to cron tab. Error:' + err);
			return false;
		}
		logger.debug('Output:' + stdout);
		logger.debug('Error:' + stderr);
		return true;
		*/
		
		setTimeout(function() {
			logger.debug('Checking the scheduled command in the cron job list...');
			checkScheduledCmdInCron(req, res, videoBatchID);
		}, 5000);
	});
}

function checkScheduledCmdInCron(req, res, videoBatchID) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var cronAddCmd = 'crontab -l | grep ' + videoBatchID;
	var cronTabAddCmd = exec(cronAddCmd, function(err, stdout, stderr) {

		if(err) {
			response.error_info = 'Failed in checking the scheduled command in the cron job list. Error:' + err;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return false;
		}
		logger.debug('The response while checking the crontab on grepping the video batch id:' + videoBatchID + ' is:' + stdout.toString());
		if(S(stdout).contains(videoBatchID)) {
			response.status = 'SUCCESS';
			response.error_info = '';
			response['node_id'] = req.body.node_id || req.query.id;
			response.result = false;
			res.json(200, response);
			logger.error(JSON.stringify(response));	
			
			//sendVideoRecordScheduledRequestOptionToServer(req, res, videoBatchID, 'RECORDING SCHEDULED', 'Scheduled the video record request');
		}
		return true;
	});
}

function getScheduledExecutionCommand(req, videoBatchID) {
	var cmd = [];
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		logger.error('Failed to get the device configuration file');
		return null;
	}

	var board_id = device.id;
	var batch_id = videoBatchID;
	var node_name = req.body.node_name || req.query.node_name;
	var user_id = req.body.user_id || req.query.user_id;
	var node_id = req.body.node_id || req.query.node_id;
	var scheduled_record_duration = req.body.scheduled_record_duration || req.query.scheduled_record_duration;		
	var videoProfileID = req.body.video_profile || req.query.video_profile;
	var enable_motion_detect = req.body.enableMotionDetect || req.query.enableMotionDetect;
	var record_service_type = req.body.record_service_type || req.query.record_service_type;
	var motion_detect_sensitive_level = req.body.motion_detect_sensitive_level || req.query.motion_detect_sensitive_level;
	var detect_motion_on_screen = req.body.detect_motion_on_screen || req.query.detect_motion_on_screen;

	//node ScheduledVideoRecorder.js node_name node_id user_id duration videoProfileID parentBatchID
	
//	cmd.push('/bin/bash');
	cmd.push(constants.SCHEDULED_VIDEO_RECORDER_SHELL_SCRIPT);
	cmd.push(constants.SCHEDULED_VIDEO_RECORDER_JS_SCRIPT);
	cmd.push(recordRequestFile);
	/*
	cmd.push(node_name);
	cmd.push(node_id);
	cmd.push(user_id);
	cmd.push(scheduled_record_duration);
	cmd.push(videoProfileID);
	cmd.push(videoBatchID);
	cmd.push(record_service_type);
	cmd.push(enable_motion_detect);
	cmd.push(motion_detect_sensitive_level);
	cmd.push(detect_motion_on_screen);
	*/
	
	
	return cmd.join(' ');
}

getRecordDurationInComparisonWithVideoProfile = function(duration, durationInProfile) {
	var givenDuration = parseInt(duration);
	var profileDuration = parseInt(durationInProfile);
	
	if(givenDuration > profileDuration) {
		return givenDuration;
	}
	return profileDuration;
}

function startImmediateRecording(req, res) {
	
	logger.debug('Immediate video recording starts..');
	var response = JSON.parse(constants.JSON_RESPONSE);	
	var node_name = req.body.node_name || req.query.node_name;
	var user_id = req.body.user_id || req.query.user_id;
	var node_id = req.body.node_id || req.query.node_id;
	var immediate_record_duration = req.body.immediate_record_duration || req.query.immediate_record_duration;
	var videoProfileID = req.body.video_profile || req.query.video_profile;
	var record_service_type = req.body.record_service_type || req.query.record_service_type;
	
	/*
	var record_schedule_type = req.body.record_schedule_type || req.query.record_schedule_type;
	var start_record_time = req.body.start_record_time || req.query.start_record_time;
	var end_record_time = req.body.end_record_time || req.query.end_record_time;
	var record_schedule_day = req.body.record_schedule_day || req.query.record_schedule_day;
	var selected_date = req.body.selected_date || req.query.selected_date;
	*/
	/*
	var dataToPost = 'node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id;
	dataToPost += '&record_duration=' + immediate_record_duration + '&videoProfileID=' + videoProfileID;
	dataToPost += '&record_service_type=' + record_service_type + '&record_schedule_type=' + record_schedule_type;
	dataToPost += '&start_record_time=' + start_record_time + '&end_record_time=' + end_record_time;
	dataToPost += '&record_schedule_day=' + record_schedule_day + '&selected_date=' + selected_date;
	
	console.log('Data is:' + dataToPost);
	*/
	
	response['node_id'] = node_id;
	response['node_name'] = node_name;
	
	var status = false;
	var node = getNode(node_name);
	if(node == null) {
		error_info = error_info + ' Failed in starting the video record';
		response.error_info = error_info;
		res.json(200, response);
		logger.error(JSON.stringify(response));
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
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//check video record progress
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		
		if(fs.existsSync(runtime_inprogress_file)) {
			var stats = fs.statSync(runtime_inprogress_file);
			if(stats.isFile() && stats.size > 0) {
				error_info = 'Already video record is in-progress on node:' + node_name + '. Failed in starting the video record';
				response.error_info = error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;
			}
		}		
	} catch(err) {
		error_info = 'Error occurred while starting the video record on node:' + node_name + '. Error:' + err + ', Failed in starting the video record';
		response.error_info = error_info;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	if(! S(immediate_record_duration).isNumeric()) {
		error_info = 'Video duration is found as invalid (non-numeric). Failed in starting the video record';
		response.error_info = error_info;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}	
	
	if(immediate_record_duration != '0') {
		immediate_record_duration = getRecordDurationInComparisonWithVideoProfile(immediate_record_duration, vp.video_length_duration_in_seconds);
	}
		
	//var videoBatchID = time_format('%d_%m_%y_%H_%M_%S');
	var videoBatchID = time_format(constants.FILE_NAME_DATE_TIME_FORMAT);
	
	var enable_motion_detect = req.body.enableMotionDetect || req.query.enableMotionDetect;

	if(enable_motion_detect == 'on') {
		logger.debug('Starting the video record with motion detect enabled');
		startRecordingWithMotionDetectEnabled(req, res, videoBatchID);
		return;
	}
	logger.debug('Immediate record enabled. Motion Detect is set to OFF');
	
	freeport(function(err, port) {
		if(err) {
			response.error_info = 'Failed in starting the video recording. Error:' + err;
			res.json(200, response);
			logger.error(JSON.stringify(response));			
			return;
		}
		var result = recordhandler.startVideoRecording(node, vp, immediate_record_duration, port, videoBatchID, user_id);
	
		if(! result) {
			response.error_info = recordhandler.error_info;
			res.json(200, response);
			logger.error(JSON.stringify(response));			
			return;
		}
		
		//wait for the inprogress file avaialble or not
		setTimeout(function() {
			isRecordingStarted(req, node_name, port, immediate_record_duration, res, videoBatchID, node);
		}, 10000);
	});
}

function isRecordingStarted(req, node_name, port, duration, res, videoBatchID, node) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	
	
	response['node_id'] = req.body.node_id || req.query.node_id;;
	response['node_name'] = req.body.node_name || req.query.node_name;	
	var status = false;
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		if(! fs.existsSync(runtime_inprogress_file)) {
			logger.debug('The inprogress object for node' + node_name + ' doesn\'t exist');
			response.error_info = 'Failed in starting the video record process in node:' + node_name;
			res.json(200, response);
			logger.error(JSON.stringify(response));			
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
					var msg = 'Video recording started in Camera:' + node.node_name + ' - Video Batch id:' + videoBatchID
					logEventInRecordManager(req, msg);
					sendAlertNotification(req, node, videoBatchID, 'video_start_event');
					sendVideoRecordImmediateRequestOptionToServer(req, res, videoBatchID, duration, 'RECORDING INPROGRESS', 'Successfully started the record service');
					return;
				} else {
					response.error_info = 'Failed in starting the video record process in node:' + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));					
					return;
				}
			});
		}, 2000);
	} catch(err) {
		response.error_info = 'exception occurred while checking the inprogress object for node:' + node_name + ', Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
	return status;
}

logEventInRecordManager = function(req, msg) {
	
	var logData = time_format('%F %T') + ',' + user.getUserDetails(req) + ',';
	logData +=  msg + '\n';
	try {
		fs.appendFileSync(constants.SYSTEM_ACTIVITY_LOG_FILE, logData);
	} catch(err) {
	
	}
}

sendCameraLostAlertNotification = function(node, option, cameralosttime) {
	
	if(constants.ENABLE_VIDEO_RECORD_FAILURE_NOTIFICATION == 0) {
		logger.info('Video Record Failure Alert notification is disabled.');
		return;
	}
	
	if(node == null || S(option).isEmpty()) {
		logger.error('Mandatory input arguments for sending the event notification found to be null / empty');
		return;
	}
	if(S(cameralosttime).isEmpty()) {
		cameralosttime = '';
	}
	var response = JSON.parse(constants.JSON_RESPONSE);
	var notification_server_url = 'http://localhost:' + constants.SYSTEM_NOTIFICATION_SERVER_PORT + '/notify/handleRecordEvents';
	var dataToPost = 'camera_lost_time=' + cameralosttime + '&node_name=' + node.node_name + '&option=' + option;
	logger.debug('The data to post is:' + dataToPost + ' to:' + notification_server_url);
	
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : notification_server_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish notification connection to Server. Error:' + e.message;
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				logger.info('Successfully sent the event to notification server on camera lost, response:' + util.inspect(results));
				return;
			} catch(ex) {
				logger.error('Exception occurred while sending the event to notification server for camera lost. Error:' + ex);
			}
		});
}

sendAlertNotification = function(req, node, videoBatchID, option) {
	
	if(constants.ENABLE_VIDEO_START_STOP_NOTIFICATION == 0) {
		logger.info('Video Start Alert notification is disabled.');
		return;
	}
	
	if(node == null || S(option).isEmpty()) {
		logger.error('Mandatory input arguments for sending the event notification found to be null / empty');
		return;
	}
	if(S(videoBatchID).isEmpty()) {
		videoBatchID = '';
	}
	var response = JSON.parse(constants.JSON_RESPONSE);
	var notification_server_url = 'http://localhost:' + constants.SYSTEM_NOTIFICATION_SERVER_PORT + '/notify/handleRecordEvents';
	var dataToPost = 'videoBatchID=' + videoBatchID + '&node_name=' + node.node_name + '&option=' + option;
	logger.debug('The data to post is:' + dataToPost + ' to:' + notification_server_url);
	
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : notification_server_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish notification connection to Server. Error:' + e.message;
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				logger.info('Successfully sent the event to notification server, response:' + util.inspect(results));
				return;
			} catch(ex) {
				logger.error('Exception occurred while sending the event to notification server. Error:' + ex);
			}
		});
}

function sendVideoRecordImmediateRequestOptionToServer(req, res, videoBatchID, duration, status, comments) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	
	response['node_id'] = req.body.node_id || req.query.node_id;;
	response['node_name'] = req.body.node_name || req.query.node_name;	
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		response.error_info = 'Device Configuration not found.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var board_id = device.id;
	var batch_id = videoBatchID;
	var node_name = req.body.node_name || req.query.node_name;
	var user_id = req.body.user_id || req.query.user_id;
	var node_id = req.body.node_id || req.query.node_id;

	response.status = 'SUCCESS';
	response.error_info = '';
	response['node_id'] = req.body.node_id || req.query.node_id;;
	response['node_name'] = req.body.node_name || req.query.node_name;	
	res.json(200, response);
	logger.info(JSON.stringify(response));

	/*
	var immediate_record_duration = duration; //req.body.immediate_record_duration || req.query.immediate_record_duration;
	

	var enableNotification = req.body.enableNotification || req.query.enableNotification;
	var emailList = req.body.emailList || req.query.emailList;
	
	var videoProfileID = req.body.video_profile || req.query.video_profile;
	var record_service_type = req.body.record_service_type || req.query.record_service_type;
	*/
	
	/*
	var record_schedule_type = req.body.record_schedule_type || req.query.record_schedule_type;
	var start_record_time = req.body.start_record_time || req.query.start_record_time;
	var end_record_time = req.body.end_record_time || req.query.end_record_time;
	var record_schedule_day = req.body.record_schedule_day || req.query.record_schedule_day;
	var selected_date = req.body.selected_date || req.query.selected_date;	
	*/
	
	/*
	var service_name = 'Video Record Immediate Service';
	var service_desc = 'Video record service starts immediately';
	var dataToPost = 'batch_id=' + batch_id + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&record_duration=' + immediate_record_duration + '&video_profile=' + videoProfileID;
	dataToPost += '&record_service_type=' + record_service_type;
	dataToPost += '&enableNotification=' + enableNotification;
	dataToPost += '&emailList=' + emailList;
	*/

	/*
	+ '&record_schedule_type=' + record_schedule_type;
	dataToPost += '&start_record_time=' + start_record_time + '&end_record_time=' + end_record_time;
	dataToPost += '&record_schedule_day=' + record_schedule_day + '&selected_date=' + selected_date;
	*/
	
	/*
	dataToPost += '&service_name=' + service_name + '&service_desc=' + service_desc + '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	logger.debug('The data to post is:' + dataToPost);
	
	var site_url = device.site_server + 'storeVideoRecordServiceOptions';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish connection to Server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				results['node_id'] = req.body.node_id || req.query.node_id;;
				results['node_name'] = req.body.node_name || req.query.node_name;	
				res.json(200, results);
				logger.info(JSON.stringify(results));
				return;
			} catch(ex) {
			
			}
			//response.status = 'SUCCESS';
			//response.error_info = '';
			//response.result = 'Server connection successful';
			response.error_info = 'Failed to post the video service request details to server';
			res.json(200, response);
			logger.error(JSON.stringify(response));
		});
	*/
}

function sendVideoRecordScheduledRequestOptionToServer(req, res, videoBatchID, status, comments) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		response.error_info = 'Device Configuration not found.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var board_id = device.id;
	var batch_id = videoBatchID;
	var node_name = req.body.node_name || req.query.node_name;
	var user_id = req.body.user_id || req.query.user_id;
	var node_id = req.body.node_id || req.query.node_id;
	
	var videoProfileID = req.body.video_profile || req.query.video_profile;
	var record_service_type = req.body.record_service_type || req.query.record_service_type;
	var record_schedule_type = req.body.record_schedule_type || req.query.record_schedule_type;
	var start_record_time = req.body.start_record_time || req.query.start_record_time;
	var end_record_time = req.body.end_record_time || req.query.end_record_time;
	var record_schedule_day = req.body.record_schedule_day || req.query.record_schedule_day;
	var selected_date = req.body.selected_date || req.query.selected_date;
	var scheduled_record_duration = req.body.scheduled_record_duration || req.query.scheduled_record_duration;
	var service_name = 'Video Record Scheduled Service';
	var service_desc = 'Video record Scheduled Service';
	var enableNotification = req.body.enableNotification || req.query.enableNotification;
	var emailList = req.body.emailList || req.query.emailList;

	
	var dataToPost = 'batch_id=' + batch_id + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&record_duration=' + scheduled_record_duration + '&video_profile=' + videoProfileID;
	dataToPost += '&record_service_type=' + record_service_type + '&record_schedule_type=' + record_schedule_type;
	dataToPost += '&start_record_time=' + start_record_time + '&end_record_time=' + end_record_time;
	dataToPost += '&record_schedule_day=' + record_schedule_day + '&selected_date=' + selected_date;

	dataToPost += '&service_name=' + service_name + '&service_desc=' + service_desc + '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	dataToPost += '&enableNotification=' + enableNotification;
	dataToPost += '&emailList=' + emailList;
	
	logger.debug('The data to post is:' + dataToPost);
	
	var site_url = device.site_server + 'storeVideoRecordServiceOptions';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish connection to Server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				logger.debug('The server response for scheduled request is:' + body);
				results['result'] = false;	// so that record options enabled at the client end
				//if(results.status == 'SUCCESS') {
					//updateCronTabForThisScheduleVideoRecord(req, res, videoBatchID);
				//	return;
				//} else {
					res.json(200, results);
					logger.info(JSON.stringify(results));
					return;
				//}
			} catch(ex) {
				logger.error('Exception occurred while handling the server response. Error:' + ex);
			}
			//response.status = 'SUCCESS';
			//response.error_info = '';
			//response.result = 'Server connection successful';
			response.error_info = 'Failed to post the scheduled video service request details to server';
			res.json(200, response);
			logger.error(JSON.stringify(response));
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

isCameraRecordingInProgress = function(node_name) {
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	var status = false;
	try {
		status = fs.existsSync(runtime_inprogress_file);
	} catch(err) {
		logger.info('Exception while checking the record inprogress in camera. Err:' + err);
	}
	return status;
}

getNodes = function() {
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		logger.info('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			node_list.push(node);
		} catch(err) {
		}
	});	 
	return node_list;
}



exports.startCameraAliveMonitor = function() {
	logger.info('Starting the monitor with interval of every:' + constants.CAMERA_ALIVE_WHILE_RECORDING_MONITOR_INTERVAL_SECONDS + ' seconds');
	var intervalTimer = setInterval(function() {
		checkAllCamerasAliveStatus();
	}, constants.CAMERA_ALIVE_WHILE_RECORDING_MONITOR_INTERVAL_SECONDS  * 1000);
}

checkAllCamerasAliveStatus = function() {
	//logger.info('Scanning all the cameras...');
	var nodes = getNodes();
	if(nodes == null || nodes.length <= 0) {
		logger.info('No. of nodes found to be null / empty.');
		return;
	}
	
	nodes.forEach(function(node) {
		//logger.info('Checking in camera:' + node.node_name);
		var cameraRecordInProgress = isCameraRecordingInProgress(node.node_name);	
		if(cameraRecordInProgress) {
			checkCameraAlive(node);
		}
	});
}

checkCameraAlive = function(node) {
	if(node == null) {
		logger.info('Failed to check the camera alive as the given node object is found to be null');
		return;
	}
	
	var node_url = node.node_url;
	//logger.info('Checking url:' + node_url);
	if(S(node_url).isEmpty()) {
		logger.info('Failed to check the camera alive as the given node url is found to be null/empty');
		return;
	}
	
	var url_data = url.parse(node_url);
	var port = url_data.port;
	if(url_data.port == null) {
		port = 80;
	}
	try {
		var sock = new net.Socket();
		sock.setTimeout(2500);
		sock.on('connect', function() {
			//logger.info(url_data.hostname + ':' + url_data.port+' is up.');
			if(cameraLostTimeDetails[node.node_name]) {
				logger.info('Camera:' + node.node_name + ' has become alive...');
				delete cameraLostTimeDetails[node.node_name];
			}
			sock.destroy();
		}).on('error', function(e) {
			logger.info('Camera:' + node.node_name + ' is Down...');
			//logger.info(url_data.hostname + ':' + url_data.port + ' is down: ' + e.message);
			notifyCameraNotFoundAlertWhileRecording(node);
		}).on('timeout', function(e) {
			logger.info('Camera:' + node.node_name + ' is Down...');
			//logger.info(url_data.hostname + ':' + url_data.port +' is down: timeout');
			notifyCameraNotFoundAlertWhileRecording(node);
		}).connect(port, url_data.hostname);
	} catch(err) {
		logger.info('Exception while checking the camera alive status. Error:' + err);
	}
}

notifyCameraNotFoundAlertWhileRecording = function(node) {
	
	//Is this first time notification...
	var cameraLostDetails = cameraLostTimeDetails[node.node_name];
	if(cameraLostDetails == undefined || cameraLostDetails == null) {
		cameraLostDetails = {};
		cameraLostDetails['camera_lost_time'] = time_format('%F %T');
		cameraLostDetails['last_connection_lost_notification_time'] = time_format('%s');
		cameraLostTimeDetails[node.node_name] = cameraLostDetails;

		sendCameraLostAlertNotification(node, 'connection_to_camera_lost', cameraLostDetails['camera_lost_time'] );
	} else {
		
		var currentTimeInSeconds = time_format('%s');
		lastConnectionLostNotificationTime = cameraLostDetails['last_connection_lost_notification_time'];
		if(currentTimeInSeconds - lastConnectionLostNotificationTime >= constants.CAMERA_LOST_ALERT_NOTIFICATION_INTERVAL_SECONDS) {
			//need to send the alert now
			var cameraLostDetails = cameraLostTimeDetails[node.node_name];
			sendCameraLostAlertNotification(node,  'connection_to_camera_lost', cameraLostDetails['camera_lost_time']);
			cameraLostDetails['last_connection_lost_notification_time'] = time_format('%s');
		}
	}
}


