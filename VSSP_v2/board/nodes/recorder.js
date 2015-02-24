var S = require('string');
var fs = require('fs');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var path = require('path');
var http = require('http');
var time_format = require('strftime');
var url = require('url');
var util = require('util');
var constants = require(__dirname + '/../../constants.js');
var logger = require('./../logger/logger').logger;
var request = require('request');
var net = require('net');
var shell = require('shelljs');

var record_process;
var terminateProcessAfterRecordingCompleted = false;
var stop_signal_received;
if(process.argv.length < 11) {
	logger.error('Failed as mandatory arguments are missing. Terminating the video recording');
	process.exit(1);
}
logger.debug('Input args found as:' + process.argv);
process.on('exit', function(exitCode, signal) {
	logger.error('Cleaning the record environment on process exit code:%d, Terminate signal:%d', exitCode, signal);
	cleanRecordEnvironmentAndExit();
});

var video_record_duration_remaining;
var video_record_process_args = [];

var record_node_name = process.argv[2];
logger.debug('Checking the node name:'+ record_node_name);
if(S(record_node_name).isEmpty()) {
	logger.error('Failed as Video Record Node name is found as null / empty. Terminating the video recording');
	process.exit(1);
}

var record_node_id = process.argv[3];
logger.debug('Checking the node id:'+ record_node_id);
if(S(record_node_id).isEmpty()) {
	logger.error('Failed as Video Record Node ID is found as null / empty. Terminating the video recording');
	process.exit(1);
}

var record_controller_port = process.argv[4];
logger.debug('Checking the controller port:'+ record_controller_port);
if(! S(record_controller_port).isNumeric()) {
	logger.error('Failed as Video Record Controller port:' + record_controller_port + ' is found as invalid. Terminating the video recording');
	process.exit(1);
}

var str_max_video_duration=process.argv[5];
var str_video_duration_per_file=process.argv[6];

var executable=process.argv[7];
var video_url=process.argv[8];

var output_folder=process.argv[9];
var output_file_extension=process.argv[10];

var video_width=process.argv[11];
var video_height=process.argv[12];
var video_fps=process.argv[13];
var recordBatchID = process.argv[14]; //time_format('%d_%m_%y_%H_%M_%S');
var user_id = process.argv[15];
logger.debug('Batch id:' + recordBatchID);
logger.debug('User id:' + user_id);

var tmpMJPEGFolder = '';
var device = getDevice();
if(device == null) {
	logger.error('Failed to get the device details as it is found as null');
	process.exit(1);	
}

var device_id = device.id;
if(S(device_id).isEmpty()) {
	logger.error('Failed to get the device id from the device details as it is found as null');
	process.exit(1);	
}

logger.debug('Checking the Max Video Duration requested:'+ str_max_video_duration);
if(! S(str_max_video_duration).isNumeric()) {
	logger.errror('Failed as Max Video recording duration:' + str_max_video_duration + ' is found as invalid. Terminating the video recording');
	process.exit(1);
}

logger.debug('Checking the Video Duration/File:'+ str_video_duration_per_file);
if(! S(str_video_duration_per_file).isNumeric()) {
	logger.error('Failed as Video recording/file duration:' + video_duration_per_file + ' is found as invalid. Terminating the video recording');
	process.exit(1);
}

logger.debug('Checking the Video Recorder Executable:'+ executable);
if(S(executable).isEmpty()) {
	logger.error('Failed as Video Recorder Executable is found as null / empty. Terminating the video recording');
	process.exit(1);
}

logger.debug('Checking the Video URL:'+ video_url);
if(S(video_url).isEmpty()) {
	logger.error('Failed as Video URL is found as null / empty. Terminating the video recording');
	process.exit(1);
}

logger.debug('Checking the output folder:' + output_folder);
if(S(output_folder).isEmpty()) {
	logger.error('Failed as output folder in which videos to be stored is found as null / empty. Terminating the video recording');
	process.exit(1);
}

try {
	var stats = fs.statSync(output_folder);
	if(! stats.isDirectory()) {
		logger.error('Failed as output folder:' + output_folder + ' doesn\'t exist. Terminating the video recording');
		process.exit(1);
	}
} catch(err) {
	logger.error('Failed as output folder:' + output_folder + ' doesn\'t exist. Error:' + err + '. Terminating the video recording');
	process.exit(1);
}

logger.debug('Checking the video file extension:' + output_file_extension);
if(S(output_file_extension).isEmpty()) {
	logger.error('Failed as output video file extension is found as null / empty. Terminating the video recording');
	process.exit(1);
}

video_duration_per_file = parseInt(str_video_duration_per_file);
max_video_duration = parseInt(str_max_video_duration);
if(max_video_duration != 0) {
	max_video_duration = parseInt(str_max_video_duration);


	if(max_video_duration < video_duration_per_file) {
		logger.debug('Max video duration is found to be less than video duration / file. Resetting max video duration to video duration / file');
		max_video_duration = video_duration_per_file;
	}
} else {
	logger.debug('Continuous recording is enabled..');
}
//console.log('Item removed was:'  + process.argv.splice(7, 1));
for(var i = 16; i < process.argv.length; i++) {
	
	var param = process.argv[i]; //
	if(! S(param).isEmpty()) {
		param = param.replace("<COMMA>", ',');
	}
	video_record_process_args.push(param);
}
var processList = [];
var recordVideoSeqID = 1;

var current_video_file_name = '';

getNode = function(node_name) {
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	var contents = fs.readFileSync(node_store_file);
	try {
		var node = JSON.parse(contents);
		return node;
	} catch(err) {
		logger.error('Exception occurred while getting the node details. Error:' + err);
	}
	return null;
}

http.createServer(function (req, res) {
	pathname = url.parse(req.url, true).pathname;
	if(! S(pathname).isEmpty()) {
		checkPathAndStopRecording(res, pathname);
	} else {
		logger.debug('Ignoring the request:' + pathname);
		sendError(res, 'Ignoring the request');
	}
	
}).listen(record_controller_port, function(err) {
	if(err) {
		logger.error('Failed to start the listener at port:' + record_controller_port + ', Error:' + err + ', Terminating the Video recording');
		process.exit(1);
	}
	
	if(! createRuntimProgressFile()) {
		logger.error('Unable to start the video recording as there might be a video record in-progress in node:' + record_node_name + ', Terminating the Video recording');
		process.exit(1);
	}
	logger.debug('Successfully started the record controller listener..at port:' + record_controller_port);

	stop_signal_received = false;
	video_record_duration_remaining = max_video_duration;
	if(max_video_duration != 0) {
		terminateProcessAfterRecordingCompleted = true;
		startVideoRecordingNow();
	} else {
		startContinuousVideoRecordingNow();
	}
});



function startContinuousVideoRecordingNow() {
	startContinuousVideoRecordingForGivenDuration(video_duration_per_file);
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

function startContinuousVideoRecordingForGivenDuration(video_duration) {
	
	if(stop_signal_received) {
		logger.debug('Stop recording signal has been received. Stopping the next schedule video record..');
		return;
	}
	
	if(isStorageAlertPresent()) {
		logger.error('Failed to start the recording in camera:' + record_node_name + ' as there was an alert on storage. Stopping the video record');
		
		stop_signal_received = true;
		logger.debug('Stoppping the video record');
		cleanRecordEnvironmentAndExit();		
		return;
	} else {
		//logger.info('Storage alert is NOT present.. Continue recording...');
	}
	var record_timeout = (video_duration) * 1000;
	
	var output_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	var output_file= output_folder  + path.sep + constants.VIDEO_RECORD_FILE_PREFIX + device_id + '_' + record_node_id + '_' + recordBatchID + '_' + recordVideoSeqID + S(output_file_extension).ensureLeft('.').s;
	
	//createMetaDataFileForVideoFile(output_file, record_node_id, record_node_name, recordBatchID, device_id, recordVideoSeqID);
	//recordVideoSeqID++;
	
	//logger.debug('record process cmd line options:' + video_record_process_args);
	current_video_file_name = output_file;
	/*
	var cmds = video_record_process_args.slice();
	cmds.push(output_file);
	cmds.unshift(video_duration + constants.BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS);	//adding extra time
	cmds.unshift('-t');
	cmds.unshift(video_url);
	cmds.unshift('-i');
	
	logger.debug('Continuous record...Executable:' + executable + ', Running with Cmd line args:' + cmds);
	
	//record_process = spawn(executable, cmds, { stdio: 'inherit' });
	record_process = spawn(executable, cmds);
	record_process.on('exit', function(exitCode, signal) {
		logger.debug('exit signal from recording process...:' + exitCode + ' of file:' + output_file);
		updateMetaDataofCompletedVideo(output_file);
	});

	//send the request for file merging after 3 seconds
	
	//addVideoFileForMerging(record_node_name, output_file);

	storeRecordingProcessDetails(record_process);
	*/
	checkCameraAliveAndRecord(video_url, output_file, video_duration, recordVideoSeqID, invokeVideoRecord);
	
	//logger.debug('Setting the video record time out set to:' + record_timeout);
	if(stop_signal_received) {
		logger.debug('Stop recording signal has been received. Stopping the next schedule video record..');
		return;
	}
	setTimeout(function() {
		logger.debug("Video duration is reached for this slot");
		//killRecordingProcess();
		
		// start the video record before prev video record finish.. We need some overlap between prev video close / current video start
		startContinuousVideoRecordingNow();
	}, record_timeout);
}

createFolder = function(fldr) {
	
	var f = path.resolve(fldr);

	try {
		if(fs.existsSync(f)) {
			var stat = fs.statSync(f);
			if(! stat.isDirectory()) {
				logger.info('Looks like the file is found, folder is not found. Creating it now..');
			//if(! fs.existsSync(f)) {
				fs.mkdirSync(f);
				result = true;
			} else {
				//logger.info('Folder is found.');
				result = true;
			}
		} else {
			logger.info('Looks like the folder:' + fldr + ' is not found. Creating it now..');
		//if(! fs.existsSync(f)) {
			fs.mkdirSync(f);
			result = true;
		}
	} catch(err) {
		logger.error(util.inspect(err));
		logger.error('Exception while creating folder. Error:' + err);
	}
}

getMJpegTmpOutputFolder = function(node_name) {
	var folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MJPEG_STORE_FOR_NODE + path.sep;
	folder += time_format('%d_%m_%y_%H_%M_%S');
	folder = path.resolve(folder);
	createFolder(folder);
	return folder;
}

updateVideoRecordDetails = function(video_file, name, value) {
	
	try {
		var jsonFile =S(video_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
		var metaData = getJsonObjectFromFile(jsonFile);
		if(metaData == null) {
			logger.error('ERROR:Failed to get the Json object from the json file while updating the video record');
			return;
		}
		metaData[name] = value;
		fs.writeFileSync(jsonFile, JSON.stringify(metaData));	
	} catch(err) {
		logger.error('Exception occurred while updating hte video record details. Error:' + err);
	}
}

invokeVideoRecord = function(status, file, video_duration, videoSeqID) {

	if(stop_signal_received) {
		logger.debug('Stop recording signal has been received. returning from invokeVideoRecord..');
		return;
	}
	if(status) {

		createMetaDataFileForVideoFile(file , record_node_id, record_node_name, recordBatchID, device_id, videoSeqID);	
		recordVideoSeqID++;
	
		var node = getNode(record_node_name);
		var cmds = video_record_process_args.slice();
		if(node['video_recorder_type'] == 0) {		//rtsp
			
			logger.info('Starting RTSP Recording..');
			tmpMJPEGFolder = '';
			cmds.push(file);
			cmds.unshift(video_duration + constants.BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS);	//adding extra time
			cmds.unshift('-t');
			cmds.unshift(video_url);
			cmds.unshift('-i');
			
			updateVideoRecordDetails(file, 'video_captured', 0);
			
			//logger.debug('Continuous record...Executable:' + executable + ', Running with Cmd line args:' + cmds);
		} else if(node['video_recorder_type'] == 1) {	//MJPEG
			
			logger.info('Starting MJPEG Recording...');
			
			tmpMJPEGFolder = ''; //getMJpegTmpOutputFolder(record_node_name);
			executable = '/bin/bash'; //'node';
			cmds.length = 0;
			//cmds.push(constants.MJPEG_VIDEO_CAPTURE_PGM);
			//cmds.push(constants.MJPEG_IMAGE_CAPTURE_PGM);
			cmds.push(constants.MJPEG_VIDEO_CAPTURE);
			if(node == null) {
				logger.debug('Failed to get the node details while creating the video recorder for MJPEG');
				return;
			}
			//cmds.push(record_node_name);
			cmds.push(video_url);
			cmds.push(node.node_username);
			cmds.push(node.node_password);
			cmds.push(constants.MJPEG_FPS);
			cmds.push(video_duration + constants.BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS);
			//cmds.push(tmpMJPEGFolder);
			cmds.push(file);
			//logger.debug('Continuous record...Executable:' + executable + ', Running with Cmd line args:' + cmds);
			
			updateVideoRecordDetails(file, 'video_captured', 0);
			updateVideoRecordDetails(file, 'mjpeg_img_tmp_folder', tmpMJPEGFolder);
		}
		
		//record_process = spawn(executable, cmds, { stdio: 'inherit' });
		record_process = spawn(executable, cmds);
		logger.info('Executing cmd:' + executable + ' params:' + cmds);
		record_process.on('exit', function(exitCode, signal) {
			logger.debug('exit signal from recording process...:' + exitCode + ' of file:' + file);
			updateMetaDataofCompletedVideo(file, node['video_recorder_type'], tmpMJPEGFolder);
			
			if(stop_signal_received) {
				logger.info('Stop recording signal has been received. Terminating the recording process...after saving the metadata.');
				cleanRecordEnvironmentAndExit();
				setTimeout(function() {
					logger.info('Recording process in getting exit..');
					process.exit(0);
				}, 100);
			}
			//file_list.push(file);
		});
		//sendRecordStartedRequestForVideoMerge(file, node['video_recorder_type'], tmpMJPEGFolder);
		/*
		record_process.stderr.on('data', function(data) {
			logger.debug('STDERR from Recording process...:' + data);
		});
		record_process.stdout.on('data', function(data) {
			logger.debug('STDOUT from Recording process...:' + data);
		});
		*/
		storeRecordingProcessDetails(record_process);
	} else {
		logger.error('Found as Camera is down while recording...Setting new batch id & video sequence');
		logEventInRecordManager('Camera:' + record_node_name + ' went down while recording is in-progress');
		recordBatchID = time_format(constants.FILE_NAME_DATE_TIME_FORMAT);
		recordVideoSeqID = 1;
		
		/*
		copyFile(constants.NO_SIGNAL_VIDEO, file, function(err) {
			if(err) {
				logger.error('Failed to copy the Default No Signal from camera file. Err:' + err);
				return;
			}
			logger.info('Successfully created the No Signal From Video file');		
			updateMetaDataofCompletedVideo(file);
		});
		*/
	}
}

function startVideoRecordingNow() {
	logger.debug('Remaining First :%d\tCurrent Video file:%d', video_record_duration_remaining, video_duration_per_file);
	startVideoRecordingForGivenDuration(video_duration_per_file);
}

function startVideoRecordingNextAttempts(next_attempts) {
	
	//stop signal received.
	if(stop_signal_received) {
		return;
	}
	
	video_record_duration_remaining = video_record_duration_remaining - video_duration_per_file;
	logger.debug('Remaining:%d\tCurrent Video file:%d', video_record_duration_remaining, video_duration_per_file);
	if(video_record_duration_remaining <= 0) {
		logger.error('Video recording for the given amount of time is completed. Terminating it now.');
		cleanRecordEnvironmentAndExit();
		logger.debug('Going to delete the recording process details..');
		deleteRecordingProcessDetails();
		logger.debug('Sending the video record complete response..');
		sendVideoRecordCompleteResponseToServer('RECORDING COMPLETED', 'Video recording has been completed');
		logger.debug('Done..');
		
		if(terminateProcessAfterRecordingCompleted) {
			logger.debug('Since Recording has been complete for the given duration, Terminating the recorder process..now..');
			process.exit(0);
		}
		return;
	}
	if(video_record_duration_remaining >= video_duration_per_file) {
		startVideoRecordingForGivenDuration(video_duration_per_file);
	} else if(video_record_duration_remaining < video_duration_per_file) {
		startVideoRecordingForGivenDuration(video_record_duration_remaining);
	}
}

function createMetaDataFileForVideoFile(file, record_node_id, node_name, recordBatchID, device_id, recordVideoSeqID) {
	var extn = path.extname(file);
	var jsonFile = file.replace(extn, constants.VIDEO_METADATA_FILE_EXTN);
	var metaData = {};
	//metaData['ctime'] = time_format('%F %T');
	metaData['ctime'] = time_format(constants.CAPTURE_VIDEO_DATE_TIME_FORMAT);
	
	metaData['recording_started_time'] = time_format(constants.CAPTURE_VIDEO_DATE_TIME_FORMAT);

	metaData['timestamp'] = new Date().getTime();
	metaData['Node_id'] = record_node_id;
	metaData['Node'] = node_name;
	metaData['Board_id'] = device_id;
	metaData['Batch_id'] = recordBatchID;
	metaData['video_merged'] = 0;
	metaData['recording_completed'] = 0;
	metaData['sequence'] = recordVideoSeqID;
	metaData['tag'] = -1;
	metaData['user'] = user_id;
	metaData['video_file_name'] = path.basename(file);
	metaData['json_file_name'] = path.basename(jsonFile);
	var node = getNode(node_name);
	if(node != null) {
		metaData['video_recorder_type'] = node['video_recorder_type'];
	} else {
		metaData['video_recorder_type'] = -1;
	}
	
	
	
	try {
		fs.writeFileSync(jsonFile, JSON.stringify(metaData));
	} catch(err) {
		//logger.error('Failed in creating the json meta data file for the video file:' + path.basename(videoFileName));
	}
}

function updateMetaDataofCompletedVideo(video_file, video_recorder_type, tmpOutputFolder) {

	var jsonFile =S(video_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
	
	try {
		var metaData = getJsonObjectFromFile(jsonFile);
		if(metaData != null) {
			metaData['recording_completed'] = 1;
			if(metaData['video_recorder_type'] == 1) {		//MJPEG
				metaData['image_captured'] = 1;	//only folder will exist
				metaData['video_captured'] = 1;	//with latest python code
			} else if(metaData['video_recorder_type'] == 0) {		//RTSP
				metaData['video_captured'] = 1;
			}		
		}
		fs.writeFileSync(jsonFile, JSON.stringify(metaData));
		//sendRecordCompletedRequestForVideoMerge(video_file, metaData['video_recorder_type'], tmpOutputFolder);
		//mergeWithPreviousFile(video_file, jsonFile, metaData);
	} catch(err) {
		logger.error('Exception while updating the MetaData Of Completed video for file:' + video_file + ', error:' + err);
	
	}
}

/*
sendRecordStartedRequestForVideoMerge = function(file, video_recorder_type, tmpOutputFolder) {
	logger.info('Sending recordm started request for video file merge for:' + file);
	var site_url = 'http://localhost:' + constants.VIDEO_MERGER_SERVICE_PORT + '/board/mergeFile?state=recording_started';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: 'file=' + file + '&video_recorder_type=' + video_recorder_type + '&tmpOutputFolder=' + tmpOutputFolder
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish connection to Server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				logger.debug('The video file merge response for scheduled request is:' + body);
			} catch(ex) {
				logger.error('Exception occurred while handling the server response for video file merge. Error:' + ex);
			}
		});
}


sendRecordCompletedRequestForVideoMerge = function(file, video_recorder_type, tmpOutputFolder) {
	logger.info('Sending request for video file merge for:' + file);
	var site_url = 'http://localhost:' + constants.VIDEO_MERGER_SERVICE_PORT + '/board/mergeFile?state=recording_completed';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: 'file=' + file + '&video_recorder_type=' + video_recorder_type + '&tmpOutputFolder=' + tmpOutputFolder
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish connection to Server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				logger.debug('The video file merge response for scheduled request is:' + body);
			} catch(ex) {
				logger.error('Exception occurred while handling the server response for video file merge. Error:' + ex);
			}
		});
}
*/

deleteFile = function(file) {
	try {
		fs.unlinkSync(file);
	} catch(err) {
	
	}
}

function mergeWithPreviousFile(video_file, jsonFile, metaData) {
	//var metaData = getJsonObjectFromFile(jsonFile);
	
	if(metaData == null) {
		return;
	}
	var seqID = metaData['sequence'];
	

	var camera = metaData['Node'];
	var fileNameAlone = path.basename(video_file);
	//var fileNameAloneWithOutSequenceID = fileNameAlone.substring(0, fileNameAlone.lastIndexOf('_' + seqID));
	var fileNameAloneWithOutSequenceID = constants.MAIN_VIDEO_RECORD_FILE_PREFIX +  metaData['Board_id'] + '_' +  metaData['Node_id'] + '_' + metaData['Batch_id'];
	
	//To get new video batch file for every MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS configured
	var hrsIndex = Math.floor((seqID * 60)/constants.MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS) + 1;
	var pathName = path.dirname(video_file);
	var videoBatchFile = pathName + path.sep + fileNameAloneWithOutSequenceID + '_' + hrsIndex + '.mp4';
	var tmpOutputFile = pathName + path.sep + fileNameAloneWithOutSequenceID + '_tmp.mp4';
	
	if(! fs.existsSync(videoBatchFile)) {
		logger.info('This is the first file in the sequence. Creating the file');
		copyFile(video_file, videoBatchFile, function(err) {
			if(err) {
				logger.error('Failed to create first video batch file. Err:' + err);
				return;
			}
			logger.info('Successfully created the video sequence initial file:' + videoBatchFile);
			
			//create json file for the video Batch file
			var videoBatchJsonFile = S(videoBatchFile).replaceAll('.mp4', '.json').s;
			try {
				var videoBatchJson = metaData;
				videoBatchJson['main_file'] = 1;
				videoBatchJson['last_modified'] = new Date().getTime();;
				delete 'sequence' in videoBatchJson;
				fs.writeFileSync(videoBatchJsonFile, JSON.stringify(videoBatchJson));
			} catch(err) {
				logger.error('Exception while creating the video batch json file. Error:' + err);
			}
			captureMetaDataFromOriginalVideoFile(camera, videoBatchFile);

			//delete the file
			deleteFile(jsonFile);
			deleteFile(video_file);
			logger.info('Deleted the first recorded file');
		});
		return;
	}
	
	var mergeFile = getMergeInputFileList(camera, videoBatchFile, video_file);
	
	logger.info('Org file:' + videoBatchFile);
	logger.info('File to join:' + video_file);
	logger.info('Tmp output file:' + tmpOutputFile);
	logger.info('Merge File:' + mergeFile);
	logger.info('Meta-data file:' + jsonFile);
	
	/*
	var args = [mergeFile];
	args.push(tmpOutputFile);
	args.push(constants.VIDEO_TITLE);
	*/
	//var folder = inputFolder + path.sep + constants. MJPEG_IMAGE_FILENAME_START + constants.MJPEG_IMAGE_SEQ_FORMAT + '.jpg'
	var cmd = constants.VIDEO_MERGER_PGM + ' "' + mergeFile + '" "' + tmpOutputFile + '" "' + constants.VIDEO_TITLE + '" ';
	logger.info('Launching the video merger pgm:' + cmd);
	var ffmpegProcess = exec(cmd, function(err, stdout, stderr) {
		logger.info('Err from FFMPEG Video Merge is:' + err);
		logger.info('STDOUT from FFMPEG is:' + stdout);
		logger.info('STDERR from FFMPEG is:' + stderr);
		
		if(fs.existsSync(tmpOutputFile)) {
			
			logger.info('Copying the tmp Output file to original video batch file');
			copyFile(tmpOutputFile, videoBatchFile, function(err) {
				if(err) {
					logger.error('Failed to copy tmp output file to original batch file. Err:' + err);
					return;
				}
				logger.info('Successfully copied tmp video file to original video batch file');
				logger.info('time to delete the tmp / video file..../ tmp output file');
				
				var videoBatchJsonFile = S(videoBatchFile).replaceAll('.mp4', '.json').s;
				try {
					var metaData = getJsonObjectFromFile(videoBatchJsonFile);
					metaData['last_modified'] = new Date().getTime();;
					fs.writeFileSync(videoBatchJsonFile, JSON.stringify(metaData));
				} catch(err) {
					logger.error('Exception while updating the modified time of the video batch json file. Error:' + err);
				}
				
				//delete the file
				deleteFile(tmpOutputFile);
				deleteFile(video_file);
				deleteFile(mergeFile);
				deleteFile(jsonFile);
				logger.info('Successfully deleted the tmp video/meta-data files..');
				
				//Call meta-data generator for this original video batch file
				captureMetaDataFromOriginalVideoFile(camera, videoBatchFile);
				
			});
		} else {
			logger.error('Tmp Merged Output file:' + tmpOutputFile + ' doesnt exist.. File:' + video_file + ' NOT MERGED');
			deleteFile(mergeFile);
		}		
	});
	
	
	/*
	var p = spawn(constants.VIDEO_MERGER_PGM, args, { stdio: 'inherit' });
	p.on('exit', function(exitCode, signal) {
		logger.debug('exit signal from record merge process...:' + exitCode + ' for video:' + video_file);
		
		if(fs.existsSync(tmpOutputFile)) {
			
			logger.info('Copying the tmp Output file to original video batch file');
			copyFile(tmpOutputFile, videoBatchFile, function(err) {
				if(err) {
					logger.error('Failed to copy tmp output file to original batch file. Err:' + err);
					return;
				}
				logger.info('Successfully copied tmp video file to original video batch file');
				logger.info('time to delete the tmp / video file..../ tmp output file');
				
				var videoBatchJsonFile = S(videoBatchFile).replaceAll('.mp4', '.json').s;
				try {
					var metaData = getJsonObjectFromFile(videoBatchJsonFile);
					metaData['last_modified'] = new Date().getTime();;
					fs.writeFileSync(videoBatchJsonFile, JSON.stringify(metaData));
				} catch(err) {
					logger.error('Exception while updating the modified time of the video batch json file. Error:' + err);
				}
				
				//delete the file
				deleteFile(tmpOutputFile);
				deleteFile(video_file);
				deleteFile(mergeFile);
				deleteFile(jsonFile);
				logger.info('Successfully deleted the tmp video/meta-data files..');
				
				//Call meta-data generator for this original video batch file
				captureMetaDataFromOriginalVideoFile(camera, videoBatchFile);
				
			});
		} else {
			logger.error('Tmp Merged Output file:' + tmpOutputFile + ' doesnt exist.. File:' + video_file + ' NOT MERGED');
			deleteFile(mergeFile);
		}
	});
	*/
}

captureMetaDataFromOriginalVideoFile = function(camera, originalVideoBatchFile) {

	var metaDataCaptureArgs = [];
	var device = getDevice();
	if(device == null) {
		logger.error('Failed in getting the device name');
		return;
	}
	metaDataCaptureArgs.push(constants.CAPTURE_METADATA_FROM_ORIGINAL_VIDEO_BATCH_FILE);
	metaDataCaptureArgs.push(originalVideoBatchFile);
	metaDataCaptureArgs.push(camera);
	metaDataCaptureArgs.push(device.name);

	//imgCaptureArgs.unshift('sudo');
	
	//logger.info('Launching the image capture with args:' + imgCaptureArgs);
	//imgCaptureProcess = spawn('node', imgCaptureArgs, {detached:true});
	logger.info('Creating the meta-data for Video batch file:' + originalVideoBatchFile + ' with args:' + metaDataCaptureArgs);
	metadatacapture_process = spawn('node', metaDataCaptureArgs, { stdio: 'inherit' });
	metadatacapture_process.on('exit', function(exitCode, signal) {
		logger.debug('METADATA CAPTURE:exit signal from metadata capture process...:' + exitCode + ' of file:' + originalVideoBatchFile);
	});
	
	metadatacapture_process.on('error', function (err) {
		logger.error('Error occurred while launching the metadata capture process for video batch file:' + originalVideoBatchFile + ', Error:' + err);
	});
	logger.info('Started the meta-data capture process..for Video batch file:' + originalVideoBatchFile);
}

function copyFile(source, target, cb) {
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
}

getMergeInputFileList = function(camera, file1, file2) {
	var file = constants.VSSP_STORE_BASE_FOLDER + path.sep + camera + path.sep + constants.TMP_STORE_FOR_NODE;
	file = file + path.sep + 'VideoMerge_' + time_format('%d_%m_%y_%H_%M_%S') + '.txt';
	
	try {
		var data = 'file ' + file1 + '\n';
		data += 'file ' + file2 + '\n';
		
		fs.writeFileSync(file, data);
	} catch(err) {
	
	}
	return file;
}

function startVideoRecordingForGivenDuration(video_duration) {
	
	if(stop_signal_received) {
		logger.debug('Stop recording signal has been received. Stopping the next schedule video record..');
		return;
	}

	if(isStorageAlertPresent()) {
		logger.error('Failed to start the recording in camera:' + record_node_name + ' as there was an alert on storage. Stopping the video record');
		
		stop_signal_received = true;
		logger.debug('Stoppping the video record');
		cleanRecordEnvironmentAndExit();		
		return;
	}	
	var record_timeout = (video_duration) * 1000;
	var output_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	var output_file= output_folder  + path.sep + constants.VIDEO_RECORD_FILE_PREFIX + device_id + '_' + record_node_id + '_' + recordBatchID + '_' + recordVideoSeqID + S(output_file_extension).ensureLeft('.').s;
	
	//createMetaDataFileForVideoFile(output_file , record_node_id, record_node_name, recordBatchID, device_id, recordVideoSeqID);	
	//recordVideoSeqID++;
	
	//logger.debug('record process cmd line options:' + video_record_process_args);
	current_video_file_name = output_file;
	/*
	var cmds = video_record_process_args.slice();
	cmds.push(output_file);
	cmds.unshift(video_duration + constants.BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS);	//adding extra time
	cmds.unshift('-t');
	cmds.unshift(video_url);
	cmds.unshift('-i');
	
	logger.debug('Executable:' + executable + ', Running with Cmd line args:' + cmds);
	
	record_process = spawn(executable, cmds, { stdio: 'inherit' });
	record_process.on('exit', function(exitCode, signal) {
		logger.debug('exit signal from recording process...:' + exitCode + ' for video:' + output_file);
		updateMetaDataofCompletedVideo(output_file);
	});

	//addVideoFileForMerging(record_node_name, output_file);

	storeRecordingProcessDetails(record_process);
	*/
	checkCameraAliveAndRecord(video_url, output_file, video_duration, recordVideoSeqID, invokeVideoRecord);

	if(stop_signal_received) {
		logger.debug('Stop recording signal has been received. Stopping the next schedule video record..');
		return;
	}
	//logger.debug('Setting the video record time out set to:' + record_timeout);
	setTimeout(function() {
		logger.debug("Terminate the recording process as it video duration is reached");
		//killRecordingProcess();
		
		// start the video record before prev video record finish.. We need some overlap between prev video close / current video start
		startVideoRecordingNextAttempts(0);
	}, record_timeout);
}

function deleteRecordingProcessDetails() {
	var recording_progress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + '_recorder' + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	if(fs.existsSync(recording_progress_file)) {
		//Delete this file now
		try {
			fs.unlinkSync(recording_progress_file);
		} catch(err) { }
	}
}

function storeRecordingProcessDetails(processDetails) {
	//record_node_name
	var result = false;
	var recording_progress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + '_recorder' + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	var runtime_details = {};
	
	runtime_details.node_name = record_node_name;
	runtime_details.pid = processDetails.pid;
	runtime_details.started_at = time_format('%d_%m_%y_%H_%M_%S');
	runtime_details.video_batch_id = recordBatchID;
	runtime_details.user_id = user_id;
	try {
		fs.writeFileSync(recording_progress_file, JSON.stringify(runtime_details));
		result = true;
	} catch(err) {
		logger.error('Failed in storing the recorder status to file. Error:' + err);
	}
	return result;
}

function sendError(res, msg) {
	res.end(msg + '\n');
}

function sendResponse(res, msg) {
	res.end(msg + '\n');
}

function killRecordingProcess() {
	

	//if(record_process) {
	try {
		//Terminate the execution now to process;
		//logger.debug('Killing the record process..');
		if(record_process.stdin) {
			logger.debug('Process stdin is ACTIVE');
			record_process.stdin.resume();
			for(var count = 0; count < 1; count++) {
				try {
					if(record_process.stdin) {
						//logger.debug('Sending quit command:' + count);
						record_process.stdin.write("q\n");
						//record_process.stdin.end();		
					}				
				} catch(err) { 
					logger.error('Error occurred while sending the quit command at count:' + count);
				}
			}
			//logger.debug('Send the quit command to running process...');
		} else {
			logger.debug('Process stdin NOT  active...');
		}
	} catch(err) {
		logger.debug('Failed to kill the recording process..');
	}
}

function checkPathAndStopRecording(res, pathname) {
	if(S(pathname).isEmpty()) {
		logger.error('Stop signal found as null / empty');
		sendError(res, 'Stop signal found as null / empty');
		return;
	}
	logger.debug('Stop signal url received as:' + S(pathname).trim());
	logger.debug('Comparing with expected signal:' + constants.VIDEO_RECORD_CONTROLLER_STOP_SIGNAL);
	if(S(pathname).trim() != constants.VIDEO_RECORD_CONTROLLER_STOP_SIGNAL) {
		logger.error('Ignore as this is not valid record stop signal');
		sendError(res, 'Ignore as this is not valid record stop signal');
		return;
	}
	
	stop_signal_received = true;
	logger.debug('Stoppping the video record');
	
	//killRecordingProcess();

	cleanRecordEnvironmentAndExit();
	sendResponse(res, constants.VIDEO_RECORD_STOP_RESPONSE + ':' + current_video_file_name);

	//process.exit(0);
}

function cleanRecordEnvironmentAndExit() {
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	if(fs.existsSync(runtime_inprogress_file)) {
		//Delete this file now
		try {
			fs.unlinkSync(runtime_inprogress_file);
		} catch(err) { }
	}

	//look for the latest file video record and if doesnt existl clean the json file
	/*
	var jsonFile = S(current_video_file_name).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN);
	if(! fs.existsSync(current_video_file_name)) {
		logger.debug('Video file doesnt exist. Deleting the metadata file..');
		try {
			fs.unlinkSync(jsonFile);
		} catch(err) { }
	} else {
		var videoObject = getJsonObjectFromFile(jsonFile);
		if(videoObject == null) {
			return;
		}
		if(videoObject['video_recorder_type'] == "0") {	//for RTSP
			if(videoObject['video_captured'] == 0) { // 	video captured is not complete.
				
				//delete both
				deleteFile(jsonFile);
				deleteFile(current_video_file_name);
			}
		}
	}
	*/
	logger.debug('Cleaned up the record environment for node:' + record_node_name);
}

function createRuntimProgressFile() {
	var result = false;
	var runtime_details = {};
	
	runtime_details.node_name = record_node_name;
	runtime_details.record_controller_port = record_controller_port;
	runtime_details.pid = process.pid;
	runtime_details.started_at = time_format('%d_%m_%y_%H_%M_%S');
	runtime_details.video_batch_id = recordBatchID;
	runtime_details.user_id = user_id;
	//store this file
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		
		if(fs.existsSync(runtime_inprogress_file)) {
			var stats = fs.statSync(runtime_inprogress_file);
			if(stats.isFile() && stats.size > 0) {
				logger.error('Failed in starting the video record. Already video record is in-progress on node:' + record_node_name);
				return result;
			}
		}		
		fs.writeFileSync(runtime_inprogress_file, JSON.stringify(runtime_details));
		result = true;
	} catch(err) {
		logger.error('Failed in starting the video record. Unable to create runtime node video status to file. Error:' + err);
	}
	return result;
}

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//console.log('Loading file:' + device_file);
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
			//logger.error('Exception occurred while parsing the json object. Error:' + err);
		}
	} catch(err) {
		//logger.error('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

function sendVideoRecordCompleteResponseToServer(status, comments) {
	
	logger.debug('Sending the video record update status to server..');
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		logger.error('Device Configuration not found for sending the video record status to server.');
		return;
	}
	/*
	var board_id = device.id;
	var batch_id = recordBatchID;
	var node_name = record_node_name;
	var node_id = record_node_id;
	
	var dataToPost = 'batch_id=' + batch_id + '&node_name=' + node_name + '&user_id=' + user_id + '&node_id=' + node_id + '&board_id=' + board_id;
	dataToPost += '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	logger.debug('The data to post at the end of recording is:' + dataToPost);
	
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
			process.exit(0);
		});
	*/
}

addVideoFileForMerging = function(node_name, video_file) {

	setTimeout(function() {
			//send the request once the file is created
			var url = 'http://localhost:' + constants.VIDEO_MERGER_SERVICE_PORT + constants.VIDEO_MERGER_ADD_REQUEST;
			var data = 'node_name=' + node_name + '&video_file=' + video_file;
			logger.debug('Sending video merge request to server:' + url + ' with data:' + data);
			if(fs.existsSync(video_file)) {
				
				request.post({
					headers : {
						'content-type' : 'application/x-www-form-urlencoded'
					},
					url : url,
					body: data
					}, function(e, s_response, body) {
						logger.info('Response for file merging is:' + util.inspect(body));
					});
			} else {
				logger.debug('Video file doesnot exist');
			}
		}, 10000);
}

//var output_file= output_folder  + path.sep + constants.VIDEO_RECORD_FILE_PREFIX + time_format('%d_%m_%y_%H_%M_%S') + S(output_file_extension).ensureLeft('.').s;

/*
var len = parseInt(video_duration);
var len_ms = len * 1000;

record_process = spawn(executable, params);

timer = setTimeout(function() {
	try {
	
		record_process.stdin.resume();
		record_process.stdin.write("q" + "\n");	
	} catch(e) { console.log("Exception occurred. Err:" + e); }
}, len_ms);

*/

logEventInRecordManager = function(msg) {
	
	var logData = time_format('%F %T') + ',' + user_id + ',';
	logData +=  msg + '\n';
	try {
		fs.appendFileSync(constants.SYSTEM_ACTIVITY_LOG_FILE, logData);
	} catch(err) {
	
	}
}

checkCameraAliveAndRecord = function(node_url, file, video_duration, videoSeqID, cb) {
	var url_data = url.parse(node_url);
	var port = url_data.port;
	if(url_data.port == null) {
		port = 80;
	} else {
	
	}
	logger.debug('Checking Camera:' + url_data.hostname + ':' + port);
	try {
	
		var sock = new net.Socket();
		sock.setTimeout(2500);
		sock.on('connect', function() {
			sock.destroy();
			cb(true, file, video_duration, videoSeqID);
		}).on('error', function(e) {
			logger.info('Camera URL:' + node_url + ' is Down...');
			cb(false, file, video_duration, videoSeqID);
		}).on('timeout', function(e) {
			logger.info('Camera URL:' + node_url + ' is Down...');
			cb(false, file, video_duration, videoSeqID);
		}).connect(port, url_data.hostname);
	} catch(err) {
		logger.info('Exception while checking the camera alive status. Error:' + err);
		cb(false, file, video_duration, videoSeqID);
	}
}
