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
var logger = require('./../logger/logger').scheduledExecutionLogger;
var request = require('request');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
exports.error_info='';

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//logger.info('reading the file:' + file);
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
		}
	} catch(err) {
		logger.info('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

//Format is
//node ScheduledVideoRecorder.js node_name node_id user_id duration videoProfileID parentBatchID
logger.info('The args:' + process.argv);
/*
if(process.argv.length < 12) {
	logger.info('Failed as mandatory arguments are missing. Terminating the scheduled video recording');
	process.exit(1);
}
*/
logger.info('Input args found as:' + process.argv);
process.on('exit', function(exitCode, signal) {
	logger.info('Scheduled Video recording is terminated with exitCode:%d, Terminate signal:%d', exitCode, signal);
});
logger.info('The input file is:' + process.argv[2]);
var requestFile = getJsonObjectFromFile(process.argv[2])

if(requestFile == null) {
	logger.info('Failed to get the video record request file:' + requestFile + ' from arguments. Terminating the scheduled video recording');
	process.exit(1);
}

var node_name = requestFile['node_name']; //process.argv[2];
logger.info('Checking the node name:'+ node_name);
if(S(node_name).isEmpty()) {
	logger.info('Failed as Video Record Node name is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var status = false;
var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
try {
	status = fs.existsSync(runtime_inprogress_file);
} catch(err) {
}

if(status) {
	logger.info('Recording is already in-progress in node:' + node_name + ', Hence ignoring the current scheduled video record');
	process.exit(0);
}


var node_id =  requestFile['node_id']; //process.argv[3];
logger.info('Checking the node id:'+ node_id);
if(S(node_id).isEmpty()) {
	logger.info('Failed as Video Record Node ID is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var user_id = requestFile['user_id'];; //process.argv[4];
logger.info('Checking the user id:'+ user_id);
if(S(user_id).isEmpty()) {
	logger.info('Failed as User ID is found as null / empty. Terminating the Scheduled video recording');
	process.exit(1);
}

var duration =  requestFile['scheduled_record_duration'];; //process.argv[5];
logger.info('Checking the Duration:'+ duration);
if(! S(duration).isNumeric()) {
	logger.info('Video duration is found as invalid (non-numeric). Failed in starting the video record');
	process.exit(1);
}

var args = [constants.START_VIDEO_RECORD_PGM];
args.push(node_name);
args.push(duration);

logger.info('Args:' + args);
var executable = '/bin/bash';
var record_process = spawn(executable, args);
logger.info('Record Process in Scheduled Execution:' + record_process.pid);
record_process.on('exit', function(exitCode, signal) {
	logger.info('exit signal from recording process...:' + exitCode + ' with signal:' + signal);
});

