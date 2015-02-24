
/**
 * Module dependencies.
 */

var fs = require('fs-extra')
  , util = require('util')
  , path = require('path')
  , S = require('string')
  , spawn = require('child_process').spawn
  , logger = require('./../logger/logger').videoMergerLogger
  , constants = require(__dirname + '/../../constants.js');

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

startScanAndMergeIndividualVideo = function() {	
	var cameras = getNodeList();
	cameras.forEach(function(camera) {
		logger.info('Starting the video merger for camera:' + camera.node_name);
		setTimeout(function() {
			var logFile = constants.VSSP_BASE_FOLDER + path.sep + 'logs' + path.sep + 'VideoMergerCameraLog_' + camera.node_name + '.log';
			var cmdArgs = [constants.VIDEO_MERGER_FOR_CAMERA, constants.VIDEO_MERGER_CHILD_APP, camera.node_name, logFile];
			var p = spawn('/bin/bash', cmdArgs);
			logger.info('Started the Video Merger for Camera:' + camera.node_name + ' and its PID is:' + p.pid);
		}, 2000);
	});
}

startScanAndMergeIndividualVideo();