var S = require('string');
var fs = require('fs');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var path = require('path');
var http = require('http');
var time_format = require('strftime');
var url = require('url');
var constants = require(__dirname + '/../../constants.js');
var logger = require('./../logger/logger').logger;
var request = require('request');
var user = require('./user.js');
var nodehandler = require('./nodehandler.js');
var freeport = require('freeport');
exports.error_info = '';

var motion_process;
var outputFileExtn = '';
function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//console.log('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}

exports.startMotionDetect = function(req, res, videoBatchID) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}	
	var device = getDevice();
	
	var node_name = req.body.node_name || req.query.node_name;
	var user_id = req.body.user_id || req.query.user_id;
	var node_id = req.body.node_id || req.query.node_id;
	var immediate_record_duration = req.body.immediate_record_duration || req.query.immediate_record_duration;
	var videoProfileID = req.body.video_profile || req.query.video_profile;
	var record_service_type = req.body.record_service_type || req.query.record_service_type;
	var motion_detect_sensitive_level = req.body.motion_detect_sensitive_level || req.query.motion_detect_sensitive_level;
	var detect_motion_on_screen = req.body.detect_motion_on_screen || req.query.detect_motion_on_screen;
	var recordBatchID = videoBatchID;
	var recordVideoSeqID = 1;
	var outputFile = getVideoFolderForNode(node_name) + constants.VIDEO_RECORD_FILE_PREFIX + device.id + '_' + node_id + '_' + recordBatchID + '_' + recordVideoSeqID;
	
	//var cmd = getMotionEventStartCmd(req);
	logger.info('Start Motion Detect....implementation...');
	
	//cleanup the motion tmp image folder
	cleanMotionTmpFolder(getMotionTargetImageDir(node_name));

	//Check whether already motion detect service is running on that node
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + node_name + constants.MOTION_INPROGRESS_STORE_FILE_SUFFIX;
	
	if(isFileExists(runtime_inprogress_file)) {
		response.error_info = 'Failed in starting the Motion Detect server. Looks like already the Motion Detect Server for this Node is running';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
	}
	
	var vp = getVideoProfile(videoProfileID);
	if(vp == null) {
		response.error_info = 'Failed to get the video profile for:' + videoProfileID;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
	}
	var executor = getVideoExecutorProfile(vp);
	if(executor == null) {
		response.error_info = 'Failed to get the video profile executor for:' + videoProfileID;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
	}
	
	//append with the extension
	outputFileExtn = vp.video_file_extension;
	outputFile += '.' + vp.video_file_extension;
	
	if(! createMotionConfig(node_name, outputFile, motion_detect_sensitive_level, detect_motion_on_screen)) {
		response.error_info = error_info;
		res.json(200, response);
		logger.error(JSON.stringify(response));			
		return;
	}
		
	logger.info('Successfully created the motion conf for node:' + node_name);
	var motion_conf_file = getMotionConfigFile(node_name);
	var pid = startMotionServer(motion_conf_file);
	setTimeout(function() {
		logger.debug('Checking for the Motion detect server...');
		checkForMotionDetect(pid, node_id, node_name, user_id, req, res, immediate_record_duration, videoBatchID, outputFile, executor);
	}, 2000);
	
}

cleanMotionTmpFolder = function(folder) {
	//create the folder now
	
	rmDir(folder);
	try {
		fs.mkdirSync(folder);
	} catch(e) {
		logger.error('Failed to create the folder:' + folder + ', Error:' + e);
	}
}


rmDir = function(dirPath) {
	//logger.debug('Removing dir:' + dirPath);
	try { 
		var files = fs.readdirSync(dirPath); }
	catch(e) { 
		logger.error('exception while removing dir:' + dirPath);
		return; 
	}
	if (files.length > 0)
		for (var i = 0; i < files.length; i++) {
			var filePath = dirPath + '/' + files[i];
			//logger.debug('Checking file:' + filePath);
			if (fs.statSync(path.normalize(filePath)).isFile()) {
				fs.unlinkSync(filePath);
				//logger.debug('Deleted the file:' + filePath);
			} else {
				rmDir(filePath);
			}
		}
	fs.rmdirSync(dirPath);
};

isFileExists = function(file) {
	var result = false;
	try {
		result = fs.existsSync(file);
	} catch(err) {
	}
	return result;
}

checkForMotionDetect = function(pid, node_id, node_name, user_id, req, res, immediate_record_duration, videoBatchID, outputFile, executor) {
	var response = JSON.parse(constants.JSON_RESPONSE);	
	var cmd = 'ps -e | grep ' + pid;
	var p = exec(cmd, function(err, stdout, stderr) {
		
		if(err) {
			response.error_info = 'Failed in starting the Motion Detect server. Error:' + err;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		if(! S(stdout.toString()).contains(constants.MOTION_EXECUTABLE)) {
			response.error_info = 'Failed in starting the Motion Detect server. ' + constants.MOTION_EXECUTABLE + ' Server is not started';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		logger.info('Successfully started the Motion Detect server...');
		if(! createMotionRuntimProgressFile(node_name, pid, user_id)) {
			response.error_info = 'Failed in starting the Motion Detect server. Failed to create runtime inprogress file';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		sendVideoRecordImmediateRequestOptionToServer(req, res, videoBatchID, 'MOTION DETECTION INPROGRESS', 'Successfully started the record service via Motion Detect');
		
		/*
		response.status = 'SUCCESS';
		response.error_info = '';
		res.json(200, response);
		logger.info(JSON.stringify(response));
		*/		
		var duration = immediate_record_duration * 1000;	//convert to ms
		setTimeout(function() {
			stopMotionDetectAndCopyFile(pid, node_id, node_name, user_id, videoBatchID, outputFile, executor);
		}, duration);

	});
}

function sendVideoRecordImmediateRequestOptionToServer(req, res, videoBatchID, status, comments) {
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
	var service_name = 'Video Record Immediate Service - Motion Detect';
	var service_desc = 'Video record service- Motion Detect started immediately';

	
	var dataToPost = 'batch_id=' + batch_id + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&record_duration=' + immediate_record_duration + '&video_profile=' + videoProfileID;
	dataToPost += '&record_service_type=' + record_service_type;
	/*
	+ '&record_schedule_type=' + record_schedule_type;
	dataToPost += '&start_record_time=' + start_record_time + '&end_record_time=' + end_record_time;
	dataToPost += '&record_schedule_day=' + record_schedule_day + '&selected_date=' + selected_date;
	*/
	dataToPost += '&service_name=' + service_name + '&service_desc=' + service_desc + '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	logger.debug('The data to: storeVideoRecordServiceOptions and  post is:' + dataToPost);
	
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
			//logger.debug('Server response for posting Motion Detect request is:' + body);
			
			try {
				var results = JSON.parse(body);
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
}

function sendVideoRecordCompleteResponseToServer(videoBatchID, node_name, node_id, user_id, status, comments) {
	
	logger.debug('Sending the video record update status to server..');
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		logger.error('Device Configuration not found for sending the video record status to server.');
		return;
	}

	var board_id = device.id;
	var batch_id = videoBatchID;
	
	var dataToPost = 'batch_id=' + batch_id + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	logger.debug('The data to post at the end of recording is:' + dataToPost + ' to server: updateVideoRecordServiceOptions');
	
	var site_url = device.site_server + 'updateVideoRecordServiceOptions';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				logger.error('Failed to establish connection to Server while updating the video record service. Error:' + e.message);
			} else {
				
				try {
					var results = JSON.parse(body);
					logger.info(JSON.stringify(results));
				} catch(ex) {}
			}
		});
}

stopMotionDetectAndCopyFile = function(pid, node_id, node_name, user_id, videoBatchId, outputFile, executor) {
	logger.debug('Stopping the motion detect server...');
	process.kill(pid, 'SIGINT');
	logger.debug('Send the SIGINT signal to motion server');
	
	setTimeout(function() {
		//remove the inprogress file
		clearEnvironment(node_name);
		
		var tmpMotionImageFolder = getMotionTargetImageDir(node_name);
		convertMotionVideoToActualVideo(node_id, node_name, user_id, videoBatchId, tmpMotionImageFolder, outputFile, executor);
		
	}, 5000);
	
	//copyFileSync(tmpVideosFolderFile, actualVideosFolderFile);
	//logger.info('Copying the video file to videos folder of:' + node_name + ' is done');
}

convertMotionVideoToActualVideo = function(node_id, node_name, user_id, videoBatchId, imgFolder, outputFile, executor) {

	
	var motionVideoFile = path.normalize(imgFolder + path.basename(outputFile, outputFileExtn) + 'avi');
	
	if(! fs.existsSync(motionVideoFile)) {
		logger.debug('The motion file:' + motionVideoFile + ' doesn\'t exist. No motion detected with the given sensitive level');
		sendVideoRecordCompleteResponseToServer(videoBatchId, node_name, node_id, user_id, 'NO MOTION DETECTED', 'No Motion is detected.');
		return;
	}
	
	var cmd = constants.MOTION_TO_ACTUAL_VIDEO_PGM + ' ' + executor.executable + ' ' + motionVideoFile + ' ' + outputFile;
	logger.debug('Converting the motion to actual video.. using:' + cmd);
	var p = exec(cmd, function(err, stdout, stderr) {
		if(err) {
			logger.error('Failed in converting motion video to actual video for node:' + node_name + ', Err:' + err);
			return;
		}
		
		//The output is thrown from ffmpeg via stderr channel only.... Dont use stderr for detecting errors.
		/*
		if(! S(stderr).isEmpty()) {
			logger.error('Failed in sequencing the images to create video for node:' + node_name +', Err:' + stderr);
			return;
		}
		*/
		logger.debug('The Std Err is:' + stderr.toString());
		logger.debug('The Std out is:' + stdout.toString());
		//Looks like the images are sequenced
		logger.info('Successfully created the video on node:'+  node_name + ' and file is:' + outputFile);
		
		sendVideoRecordCompleteResponseToServer(videoBatchId, node_name, node_id, user_id, 'MOTION DETECTION COMPLETED', 'Successfully completed the video record using Motion detect');
		//createVideoFromImagesFromFolder(node_name, imgFolder, outputFile, executor);
	});
}

createVideoFromImagesFromFolder = function(node_name, imgFolder, outputFile, executor) {
	logger.debug('Creating video:' + outputFile + ' from image folder:' + imgFolder + ' using:' + executor.executable);
	
	var cmd = executor.executable + ' -r 25 -qscale 2  -i ' + imgFolder + 'Image_%09d.jpg'  + ' -y ' + outputFile;
	var p = exec(cmd, function(err, stdout, stderr) {
		if(err) {
			logger.error('Failed in creating the video from images on node:' + node_name + ', Err:' + err);
			return;
		}
		
		if(! S(stderr).isEmpty()) {
			logger.error('Failed in creating the video from images on node:' + node_name + ', Err:' + stderr);
			return;
		}
		logger.debug('The Std Err is:' + stderr.toString());
		logger.debug('The Std out is:' + stdout.toString());
		
		if(! fs.exists(outputFile)) {
			logger.error('Failed to create the video as the output file:' + outputFile + ' doesn\'t exist after executor');
			return;
		}
		cleanFolder(imgFolder);
		logger.info('Successfully created video from the image files on node:' + node_name);
	});
}

getMotionEventStartCmd = function(req) {
	var cmd = constants.MOTION_EVENT_START_CMD;
	var user_id = req.body.user_id || req.query.user_id;
	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;
	var duration = req.body.immediate_record_duration || req.query.immediate_record_duration;
	var videoProfileID = req.body.video_profile || req.query.video_profile;
	var record_service_type = req.body.record_service_type || req.query.record_service_type;
		
	cmd += node_name + ' ' + node_id + ' ' + user_id + ' ' + duration + ' ' + videoProfileID;
	logger.info('The motion detect cmd is:' + cmd);
	return cmd;
}

startMotionServer = function(conf_file) {
	
	var cmd = constants.MOTION_EXECUTABLE;
	motion_process = spawn(constants.MOTION_EXECUTABLE, ['-c', conf_file]);
	logger.info('Motion executable has been started and its pid is:' + motion_process.pid);
	return motion_process.pid;
}

function createMotionRuntimProgressFile(node_name, pid, user_id) {
	var result = false;
	var runtime_details = {};
	
	runtime_details.node_name = node_name;
	runtime_details.pid = pid;
	runtime_details.started_at = time_format('%d_%m_%y_%H_%M_%S');
	runtime_details.user_id = user_id;
	//store this file
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + node_name + constants.MOTION_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		
		if(fs.existsSync(runtime_inprogress_file)) {
			var stats = fs.statSync(runtime_inprogress_file);
			if(stats.isFile() && stats.size > 0) {
				logger.error('Failed in starting the video record. Already video record is in-progress on node:' + node_name);
				return result;
			}
		}		
		fs.writeFileSync(runtime_inprogress_file, JSON.stringify(runtime_details));
		result = true;
	} catch(err) {
		logger.error('Failed in starting the video record. Unable to create runtime node video status to file. Error:' + err);
	}
	logger.info('Created the runtime progress file:' + runtime_inprogress_file);
	return result;
}

createMotionConfig = function(node_name, outputFile, motion_detect_sensitive_level, detect_motion_on_screen) {
	if(S(node_name).isEmpty()) {
		error_info = 'Failed as the node name found as empty while creating the motion config file';
		return false;
	}
	if(! createAndUpdateMotionConfigFile(node_name, outputFile, motion_detect_sensitive_level, detect_motion_on_screen)) {
		logger.error('Failed in creating/updating the motion config for node:' + node_name);
		return false;
	}
	
	/*
	copyFile(constants.MOTION_TEMPLATE_CONF, motion_conf_file, function(err) {
			
			if(err) {
				response.error_info = 'Failed in creating the Motion Conf file for node:' + node_name + ', Error:' + err;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return false;
			}
			return true
	    });	
	*/
	return true;
}

getMotionTargetImageDir = function(node_name) {
	return path.normalize(constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + constants.MOTION_TEMP_IMAGES_FOLDER + path.sep);
}

getVideoFolderForNode = function(node_name) {
	return path.normalize(constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.VIDEO_STORE_FOR_NODE + path.sep);
}

getMotionConfigFile = function(node_name) {
	return path.normalize(constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + node_name + '_motion.conf');
}

getMotionPIDFile = function(node_name) {
	return path.normalize(constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + node_name + '_motion_pid.pid');
}

function createAndUpdateMotionConfigFile(node_name, outputFile, motion_detect_sensitive_level, detect_motion_on_screen) {
	var motion_conf_file = getMotionConfigFile(node_name);
	
	//delete any conf file that is existing previously...
	if(! deleteFile(motion_conf_file)) {
		logger.error('Failed in deleting the motion conf file that is existing previously..');
		//return false;
	}
	
	var node = getNode(node_name);
	if(node == null) {
		logger.error('Failed to create/update the Motion conf file for node:' + node_name);
		return false;
	}
	
	try {
	
		var videoFile = path.basename(outputFile, '.' + outputFileExtn);
		//fs.createReadStream(constants.MOTION_TEMPLATE_CONF).pipe(fs.createWriteStream(motion_conf_file));
		copyFileSync(constants.MOTION_TEMPLATE_CONF, motion_conf_file);
		
		var data = fs.readFileSync(motion_conf_file);
		data = S(data).replaceAll('<REPLACE_PID_FILE>', getMotionPIDFile(node_name)).s;
		//data = S(data).replaceAll('<REPLACE_MAX_FRAMES_PER_SECOND>', constants.MOTION_FPS).s;
		data = S(data).replaceAll('<REPLACE_IMAGES_TARGET_DIR>', getMotionTargetImageDir(node_name)).s;
		data = S(data).replaceAll('<REPLACE_VIDEO_FILENAME>', videoFile).s;
		data = S(data).replaceAll('<REPLACE_CAMERA_URL>', node.node_image_url).s;
		
		if(detect_motion_on_screen == 'on') {
			data = S(data).replaceAll('<REPLACE_DETECT_CHANGES_ON_IMAGE>', 'on');
		} else {
			data = S(data).replaceAll('<REPLACE_DETECT_CHANGES_ON_IMAGE>', 'off');
		}
		
		if(motion_detect_sensitive_level == 'min') {
			data = S(data).replaceAll('<REPLACE_IMAGE_PIXEL_CHANGE_DETECTION>', constants.MOTION_DETECT_SENSITIVITY_MINIMUM_LEVEL);
		} else if(motion_detect_sensitive_level == 'medium') {
			data = S(data).replaceAll('<REPLACE_IMAGE_PIXEL_CHANGE_DETECTION>', constants.MOTION_DETECT_SENSITIVITY_MEDIUM_LEVEL);
		} else if(motion_detect_sensitive_level == 'high') {
			data = S(data).replaceAll('<REPLACE_IMAGE_PIXEL_CHANGE_DETECTION>', constants.MOTION_DETECT_SENSITIVITY_HIGH_LEVEL);
		} else {
			logger.debug('Motion detect sensitive is found to be invalid. resetting it to min value');
			data = S(data).replaceAll('<REPLACE_IMAGE_PIXEL_CHANGE_DETECTION>', constants.MOTION_DETECT_SENSITIVITY_MINIMUM_LEVEL);
		}
		
		if(! S(node.node_username).isEmpty()) {
			data = S(data).replaceAll('; netcam_userpass <REPLACE_CAMERA_USERNAME_PASSWORD>', ' netcam_userpass ' + node.node_username + ':' + node.node_password).s;
		}
		data = S(data).replaceAll('<REPLACE_CAMERA_NAME>', node.node_name).s;
		//data = S(data).replaceAll('<REPLACE_EVENT_START_CMD>',cmd).s;
		//data = S(data).replaceAll('<REPLACE_EVENT_END_CMD>', constants.MOTION_EVENT_END_CMD).s;
		
		//write it back to conf file now

	
		fs.writeFileSync(motion_conf_file, data);
	} catch(err) {
		logger.error('Exception while writing the updated conf back to file. Error:' + err);
		return false;
	}
	return true;
}

clearEnvironment = function(node_name) {
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + node_name + constants.MOTION_INPROGRESS_STORE_FILE_SUFFIX;
	deleteFile(runtime_inprogress_file);
}

function copyFileSync(source, target) {
	/*
	var cbCalled = false;
	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		done(err);
	});
	wr.on("close", function(ex) {
		done();
	});
	rd.pipe(wr);

	function done(err) {
		if (! cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
	*/
  BUF_LENGTH = 64*1024;
  var buff = new Buffer(BUF_LENGTH);
  fdr = fs.openSync(source, "r");
  fdw = fs.openSync(target, "w");
  bytesRead = 1
  pos = 0
  while(bytesRead > 0) {
    bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
    fs.writeSync(fdw,buff,0,bytesRead);
    pos += bytesRead;
  }
  fs.closeSync(fdr);
  fs.closeSync(fdw);
}

deleteFile = function(file) {
	file = path.normalize(file);
	logger.debug('Deleting file:' + file);
	try {
		fs.unlinkSync(file);
	} catch(err) {
		logger.error('Failed in deleting the file:' + file + ', Err:' + err);
		return false;
	}
	return true;
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
