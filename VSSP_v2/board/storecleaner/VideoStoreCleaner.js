var S = require('string');
var fs = require('fs');
var moment = require('moment');
var util = require('util');
var path = require('path');
var logger = require('./../logger/logger').cleanLogger;
var constants = require(__dirname + '/../../constants.js');
var fsextended = require('fs-extended');
var schedule = require('node-schedule');

var startDateToMaintain = moment();
startDateToMaintain.subtract(constants.DAYS_TO_KEEP_VIDEO_FILES, 'days');

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

/*
scanAndCleanVideoStoreFolder = function(node) {
	console.log('Scanning Camera store:' + node.node_name);
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
							if(videoObject['timestamp'] != null) {
								var fileTime = moment(videoObject['timestamp']);
								if( fileTime.diff(startDateToMaintain) < 0) {
									logger.info('File:' + jsonFile + ' is older by:' + startDateToMaintain.diff(fileTime) + ' ms');
									
									var imgFile = '';
									if(videoObject['Normal_Image'] != null) {
										imgFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + videoObject['Normal_Image'];
									}
									deleteFile(jsonFile, abs_file, imgFile);
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
}*/


filterFiles = function(itemPath, stat) {
	var baseName = path.basename(itemPath);
	//logger.info('Checking file:' + itemPath + ' and its base name is:' + baseName);
	//&& S(baseName).startsWith(constants.MAIN_VIDEO_RECORD_FILE_PREFIX) 
	if(S(baseName).startsWith(constants.MAIN_VIDEO_RECORD_FILE_PREFIX) 
		&& S(baseName).endsWith('.json') 
			&& stat.size > 0 
			&& stat.isFile()) {
		
		var videoObject = getJsonObjectFromFile(itemPath);
		if(videoObject == null) {
			return false;
		}
		if ('timestamp' in videoObject
			&& 'json_file_name' in videoObject) {
			return true;
		}
	}
	return false; 
}

mapFiles = function(dirPath, stat) {
	return {
		path: dirPath,
		mtime : stat.mtime,
		ctime : stat.ctime
	};
}

compareFileModificationTime = function(a, b) {
	return a.mtime < b.mtime ? -1 : 1
}

compareFileCreationTime = function(a, b) {
	return a.ctime < b.ctime ? -1 : 1
}

compareVideoObjectBasedOnCreationFile = function(a, b) {
	return a.timestamp < b.timestamp ? -1 : 1;
}

scanAndCleanVideoStoreFolder = function(camera) {
	
	logger.info('Scanning camera:' + camera['node_name']);
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + camera['node_name'] + path.sep + constants.VIDEO_STORE_FOR_NODE;
	
	//var files = fs.readdirSync(node_store_folder);
	
	var files = fsextended.listAllSync(node_store_folder, { filter: filterFiles, map : mapFiles, sort : compareFileCreationTime });
	logger.info('No. of json files in the current camera store is:' + files.length);
	
	if(files.length > 0) {
		var videoObjects = [];
		files.forEach(function(fileObject) { 
			//logger.info('File after filter is:' + util.inspect(fileObject));
			abs_file = fileObject.path;
			videoObjects.push(getJsonObjectFromFile(abs_file));
		});
		videoObjects.sort(compareVideoObjectBasedOnCreationFile);
		
		videoObjects.forEach(function(videoObject) {
			if(videoObjects.length > 0 && videoObject != null) {
				//logger.info('Processing file with Timestamp:' + videoObject['timestamp'] + ', file:' + videoObject['video_file_name']  + ', json file:' +  videoObject['json_file_name']);
				
				if(videoObject['timestamp'] != null) {
					var fileTime = moment(videoObject['timestamp']);
					var daysDiff = fileTime.diff(startDateToMaintain);
					
					logger.info('File:' + videoObject['json_file_name'] + ' is older by:' + daysDiff);
					if( daysDiff < 0) {
						logger.info('File:' + videoObject['json_file_name'] + ' is older by:' + startDateToMaintain.diff(fileTime) + ' ms. Deleting it now..');
						
						var imgFile = '';
						if(videoObject['Normal_Image'] != null) {
							imgFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + videoObject['Normal_Image'];
						}
						
						jsonFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + videoObject['json_file_name'];
						var video_file = S(jsonFile).replaceAll('.json', '.mp4').s;
						deleteGivenFiles(jsonFile, video_file, imgFile);
					}
				}				
			}
		});
	} else {
		logger.info('No video json files found for camera:' + camera['node_name']);
	}	
}

deleteGivenFiles = function(jsonFile, videoFile, imgFile) {
	
	try {
		logger.info('Deleting Video file:' + videoFile);
		fs.unlinkSync(videoFile);
	} catch(err) {
		logger.error('Failed to delete the video file:' + videoFile  +', Error:' + err);
	}
	try {
		logger.info('Deleting Video Meta-Data file:' + jsonFile);
		fs.unlinkSync(jsonFile);	
	} catch(err) {
		logger.error('Failed to delete the video meta-data file:' + jsonFile  +', Error:' + err);
	}

	try {
		logger.info('Deleting Image file:' + imgFile);
		fs.unlinkSync(imgFile);	
	} catch(err) {
		logger.error('Failed to delete the Image file:' + imgFile  +', Error:' + err);
	}
}

checkAndCleanFilesInAllCameras = function() {
	logger.info('Starting the Video Cleaner now...');
	var nodeList = getNodeList();
	if(nodeList.length <= 0) {
		logger.error('Failed to scan the video folders as no. of nodes found as:' + nodeList.length);
		process.exit(1);
	}
	logger.log('No. of cameras:' + nodeList.length);

	nodeList.forEach(function(node) {
		scanAndCleanVideoStoreFolder(node);
	});
}

//Run on every day morning 1:01...
var rule = new schedule.RecurrenceRule();
rule.hour = 1;
rule.minute = 1;

//'1 * * * *'
logger.info('Scheduling the Store Clean job at:' + util.inspect(rule));
var j = schedule.scheduleJob(rule, function() {
	logger.info('Running the clean-up video files task. Cleaning up files older than last:'  + constants.DAYS_TO_KEEP_VIDEO_FILES + ' days');
	checkAndCleanFilesInAllCameras();
});
