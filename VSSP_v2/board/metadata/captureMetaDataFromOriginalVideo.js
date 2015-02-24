var S = require('string');
var fs = require('fs');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
//var execSync = require("exec-sync");
//var sh = require('execSync');

var path = require('path');
var http = require('http');
var time_format = require('strftime');
var url = require('url');
var util = require('util');
var request = require('request');
var disk = require('diskspace');
//var waitpid  = require('waitpid');
var constants = require(__dirname + '/../../constants.js');
var logger = require('./../logger/logger').videoMergerLogger;
var node_handler = require('./../nodes/nodehandler');

/*
var videoFileName = process.argv[2];
logger.info('Capturing meta data for video:' + videoFileName);

if(S(videoFileName).isEmpty()) {
	logger.error('Failed in capturing the meta-data as the given video file name found as null / empty.');
	process.exit(1);
}

if(! fs.existsSync(videoFileName)) {
	logger.error('Failed in capturing the meta-data as the given video file name is NOT found.');
	process.exit(1);
}
*/	

var orgVideoBatchFile = process.argv[2];
var node_name = process.argv[3];
var device_name = process.argv[4];


function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//logger.info('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//logger.info('reading the file:' + file_name);
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

getNodeList = function() {
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;

	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//logger.info('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//logger.info('contents:' + contents);
			var node = JSON.parse(contents);
			node_list.push(node);
		} catch(err) {
		}
	});	
	return node_list;
}

getNode = function(node_name) {
	
	if(S(node_name).isEmpty()) {
		return null;
	}
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	var nodeFile = node_store_folder + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;

	var contents = fs.readFileSync(nodeFile);
	try {
		//logger.info('contents:' + contents);
		var node = JSON.parse(contents);
		return node;
	} catch(err) {
	}
	return null;
}

captureImageFromVideo = function(file, node, device_name) {
	
	//create image folder for this video; it is like the file name
	var imgFile = getImageFile(file);
	if(S(imgFile).isEmpty()) {
		logger.error('Failed in getting the image file to store');
		return false;
	}
	var executable = getExecutableFromExecutor(node);
	if(S(executable).isEmpty()) {
		logger.error('Failed in getting the executable for the node:' + node.node_name);
		return false;
	}
	var imgCaptureArgs = [];
	imgCaptureArgs.push(constants.CAPUTE_IMAGE_FROM_VIDEO_JS_SCRIPT);
	imgCaptureArgs.push(executable);
	imgCaptureArgs.push('-itsoffset');
	imgCaptureArgs.push(constants.IMAGE_POSITION_FROM_VIDEO);
	imgCaptureArgs.push('-i');
	imgCaptureArgs.push(file);
	imgCaptureArgs.push('-vcodec');
	imgCaptureArgs.push('mjpeg');
	imgCaptureArgs.push('-vframes');
	imgCaptureArgs.push(1);
	imgCaptureArgs.push('-an');
	imgCaptureArgs.push('-f');
	imgCaptureArgs.push('rawvideo');
	imgCaptureArgs.push('-s');
	imgCaptureArgs.push(constants.IMAGE_SIZE);
	imgCaptureArgs.push('-y');
	imgCaptureArgs.push(imgFile);
	imgCaptureArgs.push(node.node_name);	
	imgCaptureArgs.push(device_name);	
	imgCaptureArgs.unshift('node');
	//imgCaptureArgs.unshift('sudo');
	
	//logger.info('Launching the image capture with args:' + imgCaptureArgs);
	//imgCaptureProcess = spawn('node', imgCaptureArgs, {detached:true});
	
	imgCaptureProcess = exec(imgCaptureArgs.join(' '), function(err, stdout, stderr) {
		if(err != null) {
			logger.error('Exec error:' + err);
			return;
		}
		
		//logger.info('MetaData Capture process has been completed');
	});	
	
	imgCaptureProcess.on('error', function (err) {
		logger.error('Error occurred while launching the script to capture the image', err);
	});
	//logger.info('Waiting for the metaData capture process to complete...');
	/*
	var proc_status = waitpid(imgCaptureProcess.pid);
	logger.info('status of the waiting process is:' + util.inspect(proc_status));
	process.exit(0);
	*/
	//logger.info('The image capture process pid is:%d', imgCaptureProcess.pid);
	
	//execSync(imgCaptureArgs.join(' '));
	//var code = sh.run(imgCaptureArgs.join(' '));
	//imgCaptureProcess.unref();
	status = true;
	//logger.info('Completed the image capture');
	return status;	
}

getImageFile = function(file) {
	var fileName = path.basename(file);
	fileName = path.basename(fileName, path.extname(fileName));
	fileName = S(fileName).replaceAll(' ', '_').s;
	var folderName = path.dirname(file);
	
	//img folder 
	var imgFolderName = path.normalize(folderName + '/../' + constants.IMAGE_STORE_FOR_NODE); //fileName;
	//logger.info('Image folder name found as:' + imgFolderName);
	//fs.mkdirSync(imgFolderName);
	if(! fs.existsSync(imgFolderName)) {
		logger.error("Failed to create the img folder for video file");
		return '';
	}
	return imgFolderName + path.sep + fileName + constants.IMAGE_FILE_EXTN;
}



function getVideoProfile(profile_name) {
	
	var vp = null;
	if(S(profile_name).isEmpty() || S(profile_name).contains(' ')) {
		error_info = 'Failed in getting the Video Profile. Profile Name found as null / cannot have spaces.';
		logger.error(error_info);
		return vp;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
	var stats = fs.statSync(profile_file_name);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the Video Profile. Video profile:' + profile_name + ' is not found';		
		logger.error(error_info);
		return vp;
	}

	vp = getJsonObjectFromFile(profile_file_name);
	if(vp == null) {
		error_info = 'Failed in getting the Video Profile. Video Profile content is found as null';		
		logger.error(error_info);
		return vp;
	}	
	//logger.info('Successfully got the video profile for:' + profile_name);	
	return vp;
}

getAbsoluteExecutableFile = function(fileName) {

	//It is expected that the recorder executable must be on the environment path
	/*
	if(fs.existsSync(fileName)) {
		return fileName;
	}
	
	fileName = constants.VSSP_BASE_FOLDER + fileName;
	*/
	
	return fileName;
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
	//logger.info('Successfully got the video executor profile for:' + vp.record_using);	
	return ve;
}

getExecutableFromExecutor = function(node) {
	var profile_name = node.video_profile_id;
	var vp = getVideoProfile(profile_name);
	if(vp == null) {
		logger.error('Failed in getting the video profile for the node:' + node.node_name);
		return null;
	}
	var ve = getVideoExecutorProfile(vp);
	if(ve == null) {
		logger.error('Failed in getting the video executor');
		return null;
	}
	return getAbsoluteExecutableFile(ve.executable);
}

cleanUpEnvironment = function() {
	try {
		fs.unlinkSync(constants.SCHEDULER_RUN_INPROGRESS);
	} catch(err) {
	
	}
}

var node = getNode(node_name);
if(node == null) {
	logger.error('Failed to get the node name:' + node_name + ', Terminating the Original Video Batch File MetaData capture');
	process.exit(1);
}
captureImageFromVideo(orgVideoBatchFile, node, device_name);


/*
//logger.info('Capturing the metaData...');
var extn = path.extname(videoFileName);
var jsonFile = videoFileName.replace(extn, constants.VIDEO_METADATA_FILE_EXTN);

var metaData = getJsonObjectFromFile(jsonFile);
if(metaData == null) {
	logger.error('Failed in getting the info object of the given video');
	process.exit(1);
}
//logger.info('Json file:' + util.inspect(metaData));

var node = getNode(metaData['Node']);
if(node == null) {
	logger.error('Failed to get the node for the given video file');
	process.exit(1);
}
//logger.info('Node is:' + util.inspect(node));

var device = getDevice();
if(device == null) {
	logger.error('Failed to get the device');
	process.exit(1);
}

captureImageFromVideo(videoFileName, node, device.name);


process.on('exit', function(exitCode, signal) {
	logger.info('Process exit code:%d, Signal:%d', exitCode, signal);
});

*/


