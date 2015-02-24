var uuid = require('node-uuid');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var freeport = require('freeport');

var request = require('request');
var http = require('http');
//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var user = require('./user.js')
var nodehandler = require('./nodehandler.js');
exports.error_info='';
var time_format = require('strftime');
var logger = require('./../logger/logger').logger;
var rMmgr = require('./recordmanager');

getVideoExecutorProfile = function(vp) {

	var ve = null;
	if(S(vp.record_using).isEmpty()) {
		error_info = 'Failed in getting the Video Executor Profile. Executor is NOT found.';
		logger.error(error_info);
		return ve;		
	}

	var video_executor_file_name = constants.VSSP_VIDEO_EXECUTOR_BASE_FOLDER + path.sep + vp.record_using + constants.VSSP_VIDEO_EXECUTOR__FILE_EXTN;
	var stats = fs.statSync(video_executor_file_name);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the Video Executor Profile. Video Executor profile for:' + vp.record_using + ' is not found';		
		logger.error(error_info);
		return ve;
	}

	ve = getJsonObjectFromFile(video_executor_file_name);
	if(ve == null) {
		error_info = 'Failed in getting the Video Executor Profile. Video Executor Profile content is found as null';		
		logger.error(error_info);
		return ve;
	}	
	logger.debug('Successfully got the video executor profile for:' + vp.record_using);	
	return ve;
}

getRecordDurationInComparisonWithVideoProfile = function(duration, durationInProfile) {
	var givenDuration = parseInt(duration);
	var profileDuration = parseInt(durationInProfile);
	
	if(givenDuration > profileDuration) {
		return givenDuration;
	}
	return profileDuration;
}

exports.startContinuousVideoRecording = function(node, vp, port, duration, videoBatchID, user_id) {

	var status = false;

	logger.debug('User ID:' + user_id);
	logger.debug('Node URL:' + node.node_url);
	logger.debug('Record length for single file:' + vp.video_length_duration_in_seconds);
	logger.debug('Record using executable:' + vp.record_using);
	logger.debug('Video output extension:' + vp.video_file_extension);
	
	var ve = getVideoExecutorProfile(vp);
	if(ve == null) {
		logger.error('Failed in getting the video recorder executor');
		return status;
	}
	
	var exec_option= ve.executable;
	logger.debug('Plug-in cmdline options:' + ve.args);
	
	//node recorder.js node1 7001 4 2 ffmpeg http://10.203.38.90/video $CUR_FOLDER mp4
	//node constants.RECORD_JS_SCRIPT node.node_name, 
	logger.debug('Controller port found as:' + port);
	var args = [];
	args.push(constants.RECORD_JS_SCRIPT);
	//args.push(node.node_name);
	args.push(node.node_name);
	args.push(node.node_id);
	args.push(port);
	args.push(duration);
	args.push(vp.video_length_duration_in_seconds);
	args.push(getAbsoluteExecutableFile(exec_option));
	
	args.push(node.node_url);
	
	args.push(constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name);
	args.push(vp.video_file_extension);
	args.push(vp.video_width);
	args.push(vp.video_height);
	args.push(vp.video_frames_per_second);
	args.push(videoBatchID);
	args.push(user_id);	
	var plugin_cmd_line_args = ve.args;
	logger.info('Cmd line args length:' + plugin_cmd_line_args.length);
	for(var i = 0; i < plugin_cmd_line_args.length; i++) {
		var item = plugin_cmd_line_args[i];
		//logger.info('Processing cmd line:' + item);
		if(item == '<FPS>') {
			args.push(vp.video_frames_per_second);
		} else if(item == '<SCREEN_SIZE>') {
			args.push(vp.video_width + 'x' + vp.video_height);
		} else if(S(item).contains('<CHANGE_TITLE>')) {
			item = item.replace("<CHANGE_TITLE>", constants.VIDEO_TITLE);
			//item = item.replace("<CHANGE_COMMENT>", 'Recorded using: ' + constants.VIDEO_TITLE + ' Recording service..');
			args.push(item);
		} else {		
			item = item.replace("<COMMA>", ",");
			args.push(item);
		}
	}
	
	logger.debug('Launching the recording process with args:' + args);
	record_handler_process = spawn('node', args, { stdio: 'inherit' });
	record_handler_process.on('exit', function(exitCode, signal) {
		logger.debug('The recorder process has exit with exit code:%d, %d', exitCode, signal);
	});
	
	status = true;
	logger.debug('Started the video recording successfully');
	return status;	
}

exports.startVideoRecording = function(node, vp, duration, port, videoBatchID, user_id) {

	var status = false;

	logger.debug('User ID:' + user_id);
	logger.debug('Node URL:' + node.node_url);
	logger.debug('Record length for single file:' + vp.video_length_duration_in_seconds);
	logger.debug('Record using executable:' + vp.record_using);
	logger.debug('Video output extension:' + vp.video_file_extension);
	
	var ve = getVideoExecutorProfile(vp);
	if(ve == null) {
		logger.error('Failed in getting the video recorder executor');
		return status;
	}
	
	var exec_option= ve.executable;
	logger.debug('Plug-in cmdline options:' + ve.args);
	
	//node recorder.js node1 7001 4 2 ffmpeg http://10.203.38.90/video $CUR_FOLDER mp4
	//node constants.RECORD_JS_SCRIPT node.node_name, 
	logger.debug('Controller port found as:' + port);
	var args = [];
	args.push(constants.RECORD_JS_SCRIPT);
	//args.push(node.node_name);
	args.push(node.node_name);
	args.push(node.node_id);
	args.push(port);
	args.push(duration);
	args.push(vp.video_length_duration_in_seconds);
	args.push(getAbsoluteExecutableFile(exec_option));
	
	args.push(node.node_url);
	
	args.push(constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name);
	args.push(vp.video_file_extension);
	args.push(vp.video_width);
	args.push(vp.video_height);
	args.push(vp.video_frames_per_second);
	args.push(videoBatchID);
	args.push(user_id);	
	var plugin_cmd_line_args = ve.args;
	logger.info('Cmd line args length:' + plugin_cmd_line_args.length);
	for(var i = 0; i < plugin_cmd_line_args.length; i++) {
		var item = plugin_cmd_line_args[i];
		//logger.info('Processing cmd line:' + item);
		if(item == '<FPS>') {
			args.push(vp.video_frames_per_second);
		} else if(item == '<SCREEN_SIZE>') {
			args.push(vp.video_width + 'x' + vp.video_height);
		} else if(S(item).contains('<CHANGE_TITLE>')) {
			item = item.replace("<CHANGE_TITLE>", constants.VIDEO_TITLE);
			//item = item.replace("<CHANGE_COMMENT>", 'Recorded using: ' + constants.VIDEO_TITLE + ' Recording service..');
			args.push(item);
		} else {		
			item = item.replace("<COMMA>", ",");
			args.push(item);
		}
	}
	
	logger.debug('Launching the recording process with args:' + args);
	record_handler_process = spawn('node', args, { stdio: 'inherit' });
	record_handler_process.on('exit', function(exitCode, signal) {
		logger.debug('The recorder process has exit with exit code:%d, %d', exitCode, signal);
	});
	
	status = true;
	logger.debug('Started the video recording successfully');
	return status;	
}

getAbsoluteExecutableFile = function(fileName) {

	/*
	if(fs.existsSync(fileName)) {
		return fileName;
	}
	
	fileName = constants.VSSP_BASE_FOLDER + fileName;
	*/
	//It is expected that the executable must be configured in the environment.
	return fileName;
}

exports.stopVideoRecording = function(req, res, node, vp) {

	var status = false;
	var response_data = JSON.parse(constants.JSON_RESPONSE);
	
	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;
	
	response_data['node_id'] = node_id;
	response_data['node_name'] = node_name;
	
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	var node_inprogress_object = getJsonObjectFromFile(runtime_inprogress_file);
	if(node_inprogress_object == null) {
		response_data.error_info = 'Failed in getting the node record inprogress details from runtime file for node:' + node.node_name;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//get port; and pid of the process;
	var controller_port = node_inprogress_object.record_controller_port;
	var pid = node_inprogress_object.pid;
	var videoBatchID = node_inprogress_object.video_batch_id;
	logger.debug('Controller port:' + controller_port);
	logger.debug('The recording process PID is:' + pid);
	
	try {
		//send the signal and wait for exit response from recorder object; constants.VIDEO_RECORD_STOP_RESPONSE
		response_data.status = 'SUCCESS';
		var url = 'http://localhost:' + controller_port + constants.VIDEO_RECORD_CONTROLLER_STOP_SIGNAL;
		logger.debug('Sending signal to:' + url);
		request(url, function(e, response, body) {
			
			if(e)  {
				response_data.error_info = 'Failed in sending the video stop signal to node:' + node.node_name + ', probably video recording would have been killed. Error Signal is:' + e;
				cleanRecordEnvironment(node.node_name);
				res.json(200, response_data);
				logger.error(JSON.stringify(response));
				return;
			}
			body = S(body).trim();
			logger.debug('Response is received as:' + body);
			if(S(body).isEmpty()) {
			
				/*
				res.status(200);
				res.send('Failed in stopping the video record at node:' + node.node_name);
				return;
				*/
				logger.debug('The response from the child process is found to be empty');
				killChildProcess(req, res, node.node_name, pid, false, videoBatchID, '');
			} else {
			
				if(S(body).startsWith(constants.VIDEO_RECORD_STOP_RESPONSE)) {
					
					logger.debug('Expected response has been received from the child process.');
					
					var current_video_file_name = S(body).replaceAll(constants.VIDEO_RECORD_STOP_RESPONSE + ':', '');
					logger.debug('The current video file name is:' + current_video_file_name);
					/*
					res.status(200);
					res.send('Successfully stopped the video recording at node:' + node.node_name);
					return;
					*/
					killChildProcess(req, res, node.node_name, pid, true, videoBatchID, current_video_file_name);

				} else {
				logger.debug('Expected response has NOT been received from the child process.');
					/*
					res.status(200);
					res.send('Failed in stopping the video record at node:' + node.node_name);
					return;	
					*/
					killChildProcess(req, res, node.node_name, pid, false, videoBatchID, '');								
				}
			}			
			
			/*
			var requestOptions = {
				host : 'localhost',
				port : ,
				path : constants.VIDEO_RECORD_CONTROLLER_STOP_SIGNAL,
			};
		
			var responseData = '';
			var req = http.request(requestOptions, function(response) {
			
				response.on('data', function(chunk) {
					responseData += chunk;
				});
				response.on('error', function(data) {
					console.log('error occurred');
					response_data.error_info = 'Failed in sending the video stop signal to node:' + node.node_name + ", probably video recording would have been killed. Cleanup the environment now.";
					cleanRecordEnvironment(node.node_name);
					res.json(200, response_data);
					return;
				});
				response.on('end', function() {

				});
			});
			*/
		});
		logger.debug('Stop signal has been sent...');
	} catch(err) {
	
		response_data.error_info = 'Failed in sending the video stop signal to node:' + node.node_name + ", probably video recording would have been killed. Cleanup the environment now.";
		cleanRecordEnvironment(node.node_name);
		res.json(200, response_data);
		logger.error(JSON.stringify(response));
		return;
	}
}

function cleanRecordEnvironment(node_name) {
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	
	if(fs.existsSync(runtime_inprogress_file)) {
		//Delete this file now
		try {
			fs.unlinkSync(runtime_inprogress_file);
		} catch(err) { }
	}
	logger.debug('Cleaned up the record environment for node:' + node_name);
}

function getNode(node_name) {
	var node = null;
	if(S(node_name).isEmpty() || S(node_name).contains(' ')) {
		error_info = 'Failed in getting the node. Node name could be null / cannot have spaces.';
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

logEventInRecordHandler = function(req, node_name, videoBatchID) {

	var logData = time_format('%F %T') + ',' + user.getUserDetails(req) + ',';
	logData += 'Video recording stopped in Camera:' + node_name + ' - Video Batch id:' + videoBatchID + '\n';
	try {
		fs.appendFileSync(constants.SYSTEM_ACTIVITY_LOG_FILE, logData);
	} catch(err) {
	
	}
}

function killChildProcess(req, res, node_name, pid, success, videoBatchID, current_video_file_name) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;
	
	response['node_id'] = node_id;
	response['node_name'] = node_name;
	
	logEventInRecordHandler(req, node_name, videoBatchID);
	
	var killCmd = 'kill -9 ';
	if(process.platform === 'win32') {
		killCmd = 'taskkill /F /PID ';
	}
	try {
		//var kill_process = spawn('kill', [-9, pid], {stdio : 'inherit'});
		/*
		var kill_process = exec(killCmd + pid, function(err, stdout, stderr) {
			

			stopRecordingProcessDetails(req, res, node_name, pid, success, videoBatchID, current_video_file_name);
			if(err != null) {
				logger.error('Exec error:' + err);
				return;
			}
			logger.debug('Output:' + stdout.toString());
			logger.debug('Error:' + stderr.toString());
			//logger.debug('MetaData Capture process has been completed');
		});
		*/
		logger.debug('Stop command has been sent...');
		//process.kill(pid);
		/*
		if(kill_process && (! success)) {	//on failure
			kill_process.stdout.on('data', function(data) {
				console.log('Killing child process output:' + data);
			});
		
			kill_process.stderr.on('data', function(data) {
				console.log('Killing child process error:' + data);
			});
		}
		*/
		
		
		if(success) {
			
			response.status = 'SUCCESS';
			response.error_info = '';
			response.result = 'Successfully stopped the video recording at node:' + node_name;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		} else {
			response.status = 'SUCCESS';
			response.error_info = '';
			response.result = 'Failed in stopping the video record at node:' + node_name;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
	} catch(err) {
		response.error_info = '';
		response.result = 'Failed in stopping the video record at node:' + node_name + ', Error:' + err;
		res.json(200, response);	
		logger.error(JSON.stringify(response));
	}
	
	//sending mail notification
	//req, node, videoBatchID, option
	var node = getNode(node_name);
	if(node != null) {
		sendAlertNotification(req, node, videoBatchID, 'video_stop_event');
	} else {
		logger.info('Failed to get the node to send the alert notification');
	}
}

sendAlertNotification = function(req, node, videoBatchID, option) {
	
	if(constants.ENABLE_VIDEO_START_STOP_NOTIFICATION == 0) {
		logger.info('Video Record Stop Alert notification is disabled.');
		return;
	}
	if(node == null || S(videoBatchID).isEmpty() || S(option).isEmpty()) {
		logger.error('Mandatory input arguments for sending the event notification found to be null / empty');
		return;
	}	
	var response = JSON.parse(constants.JSON_RESPONSE);
	var notification_server_url = 'http://localhost:' + constants.SYSTEM_NOTIFICATION_SERVER_PORT + '/notify/handleRecordEvents';
	var dataToPost = 'videoBatchID=' + videoBatchID + '&node_name=' + node.node_name + '&option=' + option;
	logger.debug('The data to post for stopping the video record is:' + dataToPost + ' to:' + notification_server_url);
	
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
				logger.info('Successfully sent the event to notification server. Response:' + util.inspect(results));
				return;
			} catch(ex) {
				logger.error('Exception occurred while sending the event to notification server. Error:' + ex);
			}
		});
}


function deleteRecordingProcessDetails(node_name) {
	var recording_progress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + '_recorder' + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	if(fs.existsSync(recording_progress_file)) {
		//Delete this file now
		try {
			fs.unlinkSync(recording_progress_file);
		} catch(err) { }
	}
}


function stopRecordingProcessDetails(req, res, node_name, pid, success, videoBatchID, current_video_file_name) {
	//record_node_name
	logger.debug('Killing the recorder process now..');
	var result = false;
	var recording_progress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + '_recorder' + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	var record_inprogress_object = getJsonObjectFromFile(recording_progress_file);
	if(record_inprogress_object == null) {
		logger.debug('Looks like the recording process status file doesn\'t exist');
		return result;
	}
	var pid = record_inprogress_object.pid;
	var killCmd = 'kill -9 ';
	if(process.platform === 'win32') {
		killCmd = 'taskkill /F /PID ';
	}
	try {
		logger.debug('Killing the recorder process using cmd:' + killCmd + pid);
		//var kill_process = spawn('kill', [-9, pid], {stdio : 'inherit'});
		var kill_process = exec(killCmd + pid, function(err, stdout, stderr) {
			
			//Delete the file after 2 seconds as the process might be using this resource
			setTimeout( function() { 
				deleteFile(current_video_file_name) 
			}, 2000);
			
			deleteRecordingProcessDetails(node_name);
			sendVideoRecordStopResponseToServer(req, res, videoBatchID, 'RECORDING STOPPED', 'Successfully stopped the record service');
			if(err != null) {
				logger.error('Exec error:' + err);
				return;
			}
			logger.debug('Recorder Process Kill Output:' + stdout.toString());
			logger.debug('Recorder Process Kill Error:' + stderr.toString());
			//logger.debug('MetaData Capture process has been completed');
		});	
	} catch(err) {
		logger.error('Exception occurred while killing the recorder process... Error:'  + err);
	}
}

function deleteFile(file_to_delete) {
	try {
		//delete the current file name as it might have been half-way
		logger.debug('After normalizing the file name is:' + file_to_delete);
		if(! S(file_to_delete).isEmpty()) {
			file_to_delete = path.normalize(file_to_delete);
			if(fs.existsSync(file_to_delete)) {
				logger.debug('Deleting the  file:' + file_to_delete);
				fs.unlinkSync(file_to_delete);
			} else {
				logger.debug('File:' + file_to_delete + ' looks like doesn\'t exist');
			}
		}
	} catch(err) {
		logger.debug('Exception while deleting the file. Error:' + err);
	}
			
	var jsonFile = S(file_to_delete).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN);
	jsonFile = path.normalize(jsonFile);
	logger.debug('Deleting the meta data file:' + jsonFile);
	if(fs.existsSync(jsonFile)) {
		try {
			fs.unlinkSync(jsonFile);
		} catch(err) {
			logger.debug('Failed to delete metadata file:' + jsonFile + ', Err:' + err);
		}
	} else {
		logger.debug('metadata file:' + jsonFile + ' doesnt exist');
	}
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

function sendVideoRecordStopResponseToServer(req, res, videoBatchID, status, comments) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;

	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = 'Updated the video service request';
	response['node_id'] = node_id;
	response['node_name'] = node_name;
	res.json(200, response);
	logger.info(JSON.stringify(response));
	
	/*
	response['node_id'] = node_id;
	response['node_name'] = node_name;

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
	
	var dataToPost = 'batch_id=' + batch_id + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	logger.debug('The data to post is:' + dataToPost);
	
	var site_url = device.site_server + 'updateVideoRecordServiceOptions';
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
	
				results['node_id'] = node_id;
				results['node_name'] = node_name;
				res.json(200, results);
				logger.info(JSON.stringify(results));
				return;
			} catch(ex) {
			
			}
			//response.status = 'SUCCESS';
			//response.error_info = '';
			//response.result = 'Server connection successful';
			response.error_info = 'Failed to post the video service update details to server';
			res.json(200, response);
			logger.error(JSON.stringify(response));
		});
	*/
}
