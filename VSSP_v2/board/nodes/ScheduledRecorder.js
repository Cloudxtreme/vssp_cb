var S = require('string');
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');
var http = require('http');
var time_format = require('strftime');
var url = require('url');
var constants = require(__dirname + '/../../constants.js');
var logger = require('./../logger/logger').logger;
var request = require('request');

var record_process;
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
var runtime_inprogress_file = process.argv[16];
logger.debug('Batch id:' + recordBatchID);
logger.debug('User id:' + user_id);
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
	logger.errror('Failed as Max Video recording duration:' + max_video_duration + ' is found as invalid. Terminating the video recording');
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

max_video_duration = parseInt(str_max_video_duration);
video_duration_per_file = parseInt(str_video_duration_per_file);

if(max_video_duration < video_duration_per_file) {
	logger.debug('Max video duration is found to be less than video duration / file. Resetting max video duration to video duration / file');
	max_video_duration = video_duration_per_file;
}
//console.log('Item removed was:'  + process.argv.splice(7, 1));
for(var i = 17; i < process.argv.length; i++) {
	video_record_process_args.push(process.argv[i]);
}
var processList = [];
var recordVideoSeqID = 1;

var current_video_file_name = '';

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
	startVideoRecordingNow();
});


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
		return;
	}
	if(video_record_duration_remaining >= video_duration_per_file) {
		startVideoRecordingForGivenDuration(video_duration_per_file);
	} else if(video_record_duration_remaining < video_duration_per_file) {
		startVideoRecordingForGivenDuration(video_record_duration_remaining);
	}
}

function startVideoRecordingForGivenDuration(video_duration) {
	
	var record_timeout = (video_duration) * 1000;
	var cmds = video_record_process_args.slice();
	var output_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	var output_file= output_folder  + path.sep + constants.VIDEO_RECORD_FILE_PREFIX + device_id + '_' + record_node_id + '_' + recordBatchID + '_' + recordVideoSeqID + S(output_file_extension).ensureLeft('.').s;
	
	recordVideoSeqID++;
	
	logger.debug('record process cmd line options:' + video_record_process_args);
	current_video_file_name = output_file;
	cmds.push(output_file);
	cmds.unshift(video_duration + constants.BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS);	//adding extra time
	cmds.unshift('-t');
	cmds.unshift(video_url);
	cmds.unshift('-i');
	
	logger.debug('Executable:' + executable + ', Running with Cmd line args:' + cmds);
	
	record_process = spawn(executable, cmds, { stdio: 'inherit' });
	//processList.push(spawn(executable, cmds));
	//logger.debug('List of child process:' + processList);
	//record_process.on('exit', function(exitCode, signal) {
	//processList[processList.length - 1].on('exit', function(exitCode, signal) {	
	//	logger.debug("Video Record Process has been terminated with code:%d", exitCode);
	//	logger.debug("Video Record Process has got signal as:%d", signal);
		//captureImageFromVideo(output_file, record_node_name, device.name);
		/*
		setTimeout(function() {
			//Start the next video execution only when stop signal is not set
			if(! stop_signal_received) {
				//startVideoRecordingNextAttempts(0);	//call again for next video
			}
		}, 2000);
		*/
	//});
	
	/*
	record_process.stdout.on('data', function(data) {
	//processList[processList.length - 1].stdout.on('data', function(data) {
		//console.log("Video record The output is:%s", data);
	});
	
	record_process.stderr.on('data', function(data) {
	//processList[processList.length - 1].stderr.on('data', function(data) {
		logger.debug("%s", data);
	});
	*/
	storeRecordingProcessDetails(record_process);
	logger.debug('Setting the video record time out set to:' + record_timeout);
	setTimeout(function() {
		logger.debug("Terminate the recording process as it video duration is reached");
		//killRecordingProcess();
		
		// start the video record before prev video record finish.. We need some overlap between prev video close / current video start
		startVideoRecordingNextAttempts(0);
		if(record_process) {
			//record_process.kill();
		}
	}, record_timeout);
}

function deleteRecordingProcessDetails() {
	var recording_progress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + '_' + recordBatchID + '_recorder' + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
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
	var recording_progress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + '_' + recordBatchID + '_recorder' + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
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
		logger.debug('Killing the record process..');
		if(record_process.stdin) {
			logger.debug('Process stdin is ACTIVE');
			record_process.stdin.resume();
			for(var count = 0; count < 1; count++) {
				try {
					if(record_process.stdin) {
						logger.debug('Sending quit command:' + count);
						record_process.stdin.write("q\n");
						//record_process.stdin.end();		
					}				
				} catch(err) { 
					logger.error('Error occurred while sending the quit command at count:' + count);
				}
			}
			logger.debug('Send the quit command to running process...');
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
	
	killRecordingProcess();

	cleanRecordEnvironmentAndExit();
	sendResponse(res, constants.VIDEO_RECORD_STOP_RESPONSE + ':' + current_video_file_name);

	process.exit(0);
}



function cleanRecordEnvironmentAndExit() {
	//var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + record_node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	if(fs.existsSync(runtime_inprogress_file)) {
		//Delete this file now
		try {
			fs.unlinkSync(runtime_inprogress_file);
		} catch(err) { }
	}

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
	try {		
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
			logger.error('Exception occurred while parsing the json object. Error:' + err);
		}
	} catch(err) {
		logger.error('Exception occurred while getting the json object. Error:' + err);
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

