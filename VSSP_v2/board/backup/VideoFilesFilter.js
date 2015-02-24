var S = require('string');
var fs = require('fs');
var moment = require('moment');
var util = require('util');
var path = require('path');
var logger = require('./../logger/logger').videoFilesFilterLogger;
var constants = require(__dirname + '/../../constants.js');

var USAGE='VideoFilesFilter <camera name> <video files filter by mins> <output file>';

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

getNodeList = function() {
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
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

startFilteringVideosOfCamera = function(node, videosToFilterByTime, outfile) {
	var startTimeToLookForVideos = moment();
	var userDisplay = 'Scanning Camera store:' + node.node_name + ' Look for videos from:' + startTimeToLookForVideos.format('D/MMM/YYYY HH:mm:ss');
	var t = parseInt(videosToFilterByTime);
	startTimeToLookForVideos = startTimeToLookForVideos.subtract(t, 'minutes');
	
	userDisplay += ' to ' + startTimeToLookForVideos.format('D/MMM/YYYY HH:mm:ss');
	
	console.log(userDisplay);
	var filtered_videos = {};
	filtered_videos['camera'] = node.node_name;
	filtered_videos['filter_by_mins'] = videosToFilterByTime;
	filtered_videos['files'] = [];

	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + node.node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	try {
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			//logger.error('Failed to list the files found under the node. Store for Node:' + node.node_name + ' doesn\'t exist');
			return false;
		}
	} catch(err) {
		//logger.error('Failed to list the files found under the node. Store for Node:' + node.node_name + ' would n\'t be found. Error observed as:' + err.message);
		return false;
	}
	var files = fs.readdirSync(node_store_folder);
	files.forEach(function(file) { 

		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_store_folder + path.sep + file;
			
			try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}
				//index++;
				var extn = path.extname(abs_file);
				if(extn == '.mp4') {
					
					//get the json file for the same video
					var jsonFile = path.dirname(abs_file) + path.sep + path.basename(abs_file, '.mp4') + constants.VIDEO_METADATA_FILE_EXTN;
					
					if(fs.existsSync(jsonFile)) {					
						var videoObject = getJsonObjectFromFile(jsonFile);
						if(videoObject != null) {
							if(videoObject['recording_completed'] == 1 && videoObject['main_file'] == 1) {
								if(videoObject['last_modified'] != null) {
									var fileTime = moment(videoObject['last_modified']);
									if( fileTime.diff(startTimeToLookForVideos) >= 0) {
										//console.log('Video file:' + abs_file + ' taken for backup..');
										filtered_videos['files'].push(abs_file);
									}
								}
							}
						}
					}
				}
			} catch(err) { 
				//logger.error('Error occurred while getting the files:' + err);
			}
		} else {
			//logger.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}		
	});
	if(filtered_videos['files'].length > 0) {
		console.log('Filtered videos:' + util.inspect(filtered_videos));
		try {
			fs.writeFileSync(outfile, JSON.stringify(filtered_videos));
		} catch(err) {
			logger.error('Failed while writing the filtered videos list to given file. Error:' + err);
		}
	}
}

deleteFile = function(jsonFile, videoFile, imgFile) {
	
	try {
		fs.unlinkSync(videoFile);
	} catch(err) {}
	try {
		fs.unlinkSync(jsonFile);	
	} catch(err) {}

	try {
		fs.unlinkSync(imgFile);	
	} catch(err) {}
}

logger.info('Starting the Video Filter...');
if(process.argv.length < 5) {
	logger.error('Failed as mandatory arguments are missing. Usage:' + USAGE + ', Terminating the video recording');
	process.exit(1);
}
var camera_name = process.argv[2];
var videosToFilterByTime = process.argv[3];
var output_file = process.argv[4];

var nodeList = getNodeList();
if(nodeList.length <= 0) {
	logger.error('Failed to scan the video folders as no. of nodes found as:' + nodeList.length);
	process.exit(1);
}
logger.log('No. of cameras:' + nodeList.length);

nodeList.forEach(function(node) {
	if(node.node_name == camera_name) {
		startFilteringVideosOfCamera(node, videosToFilterByTime, output_file);
	}
});
