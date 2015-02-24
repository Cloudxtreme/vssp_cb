var S = require('string');
var fs = require('fs');
var ts = require('timespan');
var util = require('util');
var path = require('path');
var exec = require('child_process').exec;
var nl = require('os').EOL;
var time_format = require('strftime');
var waitpid = require('waitpid');
var logger = require('./../logger/logger').videoMergerLogger;
var constants = require(__dirname + '/../../constants.js');
var captureVideoMetaData = require(__dirname + '/../metadata/captureMetaDataFromVideo.js');

var inputVideosForProcessing = {};
var metaDataVideos = {};
var mergedVideos = {};

var device = getDevice();
if(device == null) {
	//logger.info('Looks like device conf not found..');
	logger.info('Failed to get the Device object. Terminating the Video merger..');
	process.exit(1);
}

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//logger.info('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//logger.info('reading the file:' + file_name);
		if(! fs.existsSync(file_name)) {
			return obj;
		}
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
			logger.info('Exception occurred while parsing the json object. Error:' + err);
		}
	} catch(err) {
		logger.info('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

getVideoBatchIdFile = function(node, metaDataFile) {
	var fileList = [];
	if(node == null || metaDataFile == null) {
		//logger.info('Node or metadata for video object not found');
		return fileList;
	}
	
	var videoStoreFolder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	var fileNamePattern = constants.VIDEO_RECORD_FILE_PREFIX +  device.id + '_' + node.node_id + '_' + metaDataFile.Batch_id + '_';
	
	//logger.info('Reading dir:' + videoStoreFolder + ', file name pattern:' + fileNamePattern);
	var files = fs.readdirSync(videoStoreFolder);
	
	files.filter(function(file) { 
		return S(file).startsWith(fileNamePattern) && S(file).endsWith(constants.VIDEO_METADATA_FILE_EXTN); 
		}).forEach(function(file) { 
			//logger.info('File that matches the input:' +  fileNamePattern + ' is:' + file);
			
			var videoObject = getJsonObjectFromFile(videoStoreFolder + path.sep + file);
			if(videoObject != null) {
				fileList.push(videoObject);
			}
		});
	return fileList;
}

scanAndUpdateVideoMetaDataOfCamera = function(node) {
	logger.info('Scanning Camera store:' + node.node_name);
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + node.node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	try {
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			//logger.info('Failed to list the files found under the node. Store for Node:' + node.node_name + ' doesn\'t exist');
			return false;
		}
	} catch(err) {
		//logger.info('Failed to list the files found under the node. Store for Node:' + node.node_name + ' would n\'t be found. Error observed as:' + err.message);
		return false;
	}
	var files = fs.readdirSync(node_store_folder);
	var index = 0;
	files.forEach(function(file) { 

		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_store_folder + path.sep + file;
			
			//try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}

				var extn = path.extname(abs_file);
				if(extn == '.mp4') {
					
					//get the json file for the same video
					var jsonFile = path.dirname(abs_file) + path.sep + path.basename(abs_file, '.mp4') + constants.VIDEO_METADATA_FILE_EXTN;
					
					if(fs.existsSync(jsonFile)) {	
						var videoObject = getJsonObjectFromFile(jsonFile);
						if(videoObject != null) {
							/*
							var batchFileVideos = getVideoBatchIdFile(node, videoObject);
							if(batchFileVideos.length > 0) {
								handleVideoBatchFileList(batchFileVideos, videoObject.Batch_id, node);
								index++;
							}
							*/
							if(videoObject['Duration'] == null && videoObject['recording_completed'] == 1) {
								logger.info('Video:' + abs_file + ' duration not found. Capturing it now..');
								startMetaDataCaptureProcess(abs_file, node, device.name);
							} else {
								logger.info('Video:' + abs_file + ' duration:' + videoObject['Duration']);
							}
						} else {
							logger.info('Video object is null');
						}
					} else {
						logger.info('Video OBject:' + jsonFile + ' has not been found..');
					}
				}
			//} catch(err) { 
			//	logger.info('Error occurred while getting the files:' + err);
			//}
		} else {
			//console.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}		
	});
}

handleVideoBatchFileList = function(video_list, batch_id, node) {
	video_list.sort(dynamicSort('timestamp'));
	
	//logger.info('Batch file video list is:' + util.inspect(video_list) + ' for batch id:' + batch_id);
	var totalFileDuration = 0;
	var videoFilesToMerge = [];
	var consolidated_video_index = 1;
	logger.info('No. of input videos for processing:' + video_list.length);
	video_list.forEach(function(video) {
		var fileDuration = getFileVideoDuration(video);
		//logger.info('Duration found for:' + video.Name + ' is:' + fileDuration);
		if(S(fileDuration).isNumeric()) {
			totalFileDuration += fileDuration;
			
			if(totalFileDuration < constants.MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS) {
				videoFilesToMerge.push(video);
			} else {
				//process the files now
				logger.info('Maximum file duration for merge:' + totalFileDuration + ' reached. Creating the merged video...now...with files:' + videoFilesToMerge.length);
				processAndMergeVideoFiles(videoFilesToMerge.slice(0), batch_id, node, consolidated_video_index);	
				logger.info('Clearing all the videos...captured now..');
				consolidated_video_index++;
				var originalLength = videoFilesToMerge.length;
				for(var i = 0; i < originalLength; i++) {
					videoFilesToMerge.pop();
				}
				totalFileDuration = 0;
				videoFilesToMerge.push(video);
			}
		} else {
			//logger.info('File Duration is found to be invalid');
		}
	});
	/*
	logger.info('Remaining videos:' + videoFilesToMerge.length);
	//perform remaining video merging only when we have already merged one set...before
	if(consolidated_video_index > 1) {
		//for remaining video files
		processAndMergeVideoFiles(videoFilesToMerge.slice(0), batch_id, node, consolidated_video_index);			
		logger.info('Total Duration for batch id:' + batch_id + ' is:' + totalFileDuration);
	}
	*/
}

processAndMergeVideoFiles = function(videoList, batchID, node, consolidated_video_index) {
	
	if(videoList.length <= 0) {
		logger.info('Video list for merging is found to be empty');
		return;
	}
	
	var inputFile = getMergedInputFile(videoList, batchID, node);
	if(S(inputFile).isEmpty()) {
		logger.info('Failed to create the input video file list for merging..');
		return;
	}
	logger.info('No. of input files for merging...:' + videoList.length);
	var outputFile = getMergedOutputFile(batchID, node, consolidated_video_index, videoList[0]);
	logger.info('Saving the merged video file into:' + outputFile);
	var args = [];
	args.push('bash');
	args.push(constants.VIDEO_MERGER_PGM);
	args.push(inputFile);
	args.push(outputFile);
	args.push(constants.VIDEO_TITLE);
	var p = exec(args.join(' '), function(err, stdout, stderr) {
		if(err) {
			logger.info('Error occurred while calling the video merger. Err:' + err);
			return;
		}
		logger.info('Std out is:' + stdout);
		logger.info('Std Err is:' + stderr);
		setMergedOutputJsonFile(outputFile, videoList[0]);
		clearFilesForMergedVideos(videoList);
	});
	logger.info('Video merge for batch id:' + batchID + '  process pid is:' + p.pid);
	//var status = waitpid(p.pid);
	//logger.info('The child process waitpid status is:' + status);
}

clearFilesForMergedVideos = function(videoList) {
	var index = 0;
	//retain the first video list object as that is the merged video.
	videoList.forEach(function(video) {
		if(index != 0) {
			var node_name = video.Node;
			var videoFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + video.Path;
			var imageFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + video.Normal_Image;
			var jsonFile = S(videoFile).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
			logger.info('Deleting json:' + jsonFile);
			deleteFile(jsonFile, videoFile, imageFile);
		} else {
			logger.info('Ignoring the video file deletion of:' + video.Path);
		}
		index++;
	});
}

setMergedOutputJsonFile = function(video_file, video_object) {

	var output_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + video_object['Path'];
	var jsonFile = S(video_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
	try {
		fs.writeFileSync(output_file, fs.readFileSync(video_file));
		fs.unlinkSync(video_file);
		
		var merged_json_object = getJsonObjectFromFile(jsonFile);
		if(merged_json_object != null) {
			merged_json_object['video_merged'] = 1;
			fs.writeFileSync(jsonFile, JSON.stringify(merged_json_object));
		}
		
		var jsonOriginalFile = S(output_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
		fs.writeFileSync(jsonOriginalFile, fs.readFileSync(jsonFile));
		fs.unlinkSync(jsonFile);
		
	} catch(err) {
	}
}

getMergedOutputFile = function(batchID, node, consolidated_video_index, first_video_meta_data_object) {

	/*
	var output_file_extension = 'mp4';
	var output_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	var output_file= output_folder  + path.sep + constants.VIDEO_RECORD_FILE_PREFIX + device.id + '_' + node.node_id + '_' + batchID + '_Merged_' + consolidated_video_index + S(output_file_extension).ensureLeft('.').s;
	
	var jsonFile = S(output_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
	
	try {
		var merged_json_object = {};
		merged_json_object['ctime'] = first_video_meta_data_object['ctime'];
		merged_json_object['timestamp'] = first_video_meta_data_object['timestamp'];
		merged_json_object['Node_id'] = first_video_meta_data_object['Node_id'];
		merged_json_object['Node'] = first_video_meta_data_object['Node'];
		merged_json_object['Board_id'] = first_video_meta_data_object['Board_id'];
		merged_json_object['Batch_id'] = first_video_meta_data_object['Batch_id'];
		merged_json_object['video_merged'] = 1;
		merged_json_object['recording_completed'] = 1;
		merged_json_object['sequence'] = consolidated_video_index;
		
		fs.writeFileSync(jsonFile, JSON.stringify(merged_json_object));
	} catch(err) {
	
	}
	*/
	
	

	var output_file = constants.VSSP_STORE_BASE_FOLDER + path.sep +  first_video_meta_data_object['Node'] + path.sep +  constants.TMP_STORE_FOR_NODE + path.sep + 'MergedVideo_' +  time_format('%d_%m_%y_%H_%M_%S_%L') + '.mp4';

	var jsonFile = S(output_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
	try {
		var merged_json_object = {};
		merged_json_object['ctime'] = first_video_meta_data_object['ctime'];
		merged_json_object['timestamp'] = first_video_meta_data_object['timestamp'];
		merged_json_object['Node_id'] = first_video_meta_data_object['Node_id'];
		merged_json_object['Node'] = first_video_meta_data_object['Node'];
		merged_json_object['Board_id'] = first_video_meta_data_object['Board_id'];
		merged_json_object['Batch_id'] = first_video_meta_data_object['Batch_id'];
		merged_json_object['video_merged'] = 0;
		merged_json_object['recording_completed'] = 1;
		merged_json_object['sequence'] = consolidated_video_index;
		
		fs.writeFileSync(jsonFile, JSON.stringify(merged_json_object));
	} catch(err) {
	
	}
	//output_file += '_Merged';
	logger.debug('Merged video output file is:' + output_file);
	return output_file;
}

getMergedInputFile = function(videoList, batchID, node) {

	var fileList = '';
	videoList.forEach(function(video) {
		fileList += 'file ' + constants.VSSP_STORE_BASE_FOLDER + path.sep + video.Path + nl;
	});
	var fileListInput = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.TMP_STORE_FOR_NODE;
	fileListInput += path.sep + 'MergeVideosInputFileList_' + time_format('%d_%m_%y_%H_%M_%S') + '.txt'
	
	try {
		fs.writeFileSync(fileListInput, fileList);
	} catch(err) {
		logger.info('Failed to create the input file list for merging videos. Error:' + err);
		fileListInput = '';
	}
	return fileListInput;
}

getFileVideoDuration = function(video) {
	if(video['Duration']) {
		var duration = video['Duration'];
		if(S(duration).isEmpty()) {
			logger.info('Duration is empty');
			return;
		}
		if(duration.indexOf('.') != -1) {
			duration =  duration.replace('.', ':'); //(0, duration.indexOf('.'));
		}
		var tokens = duration.split(':');
		var fileDurationObj = new ts.TimeSpan(0, tokens[2], tokens[1], tokens[0]);
		return fileDurationObj.totalSeconds();
	}
	return 0;
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
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

/*
var nodeList = getNodeList();
if(nodeList.length <= 0) {
	logger.info('Failed to scan the video folders as no. of nodes found as:' + nodeList.length);
	process.exit(1);
}
logger.info('No. of cameras:' + nodeList.length);

nodeList.forEach(function(node) {
	scanAndMergeVideoFilesInCamera(node);
});
*/

startHandleMetaDataVideosProcessing = function() {

	setInterval(function() {
		var node_list = getNodeList();
		if(node_list.length > 0) {
			node_list.forEach(function(node) {
				try {
					scanAndUpdateVideoMetaDataOfCamera(node);
					handleMergeVideoProcessingForNode(node);
				} catch(err) {
					logger.info('Exception occurred while handling the video merge for camera:' + node.node_name);
				}
			});
		}
	}, constants.VIDEO_PROCESSING_FREQ_SECONDS * 1000);
}

exports.init = function() {
	startHandleMetaDataVideosProcessing();
}

//start the video meta data handling
startHandleMetaDataVideosProcessing();

getNodeList = function() {
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
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

startMetaDataCaptureProcess = function(video_file, node, device_name) {
	/*
	var cmdToCall = constants.CAPTURE_METADATA_FROM_VIDEO_PGM + ' ' + video_file;
	logger.info('Cmd:' + cmdToCall);
	var p = exec(cmdToCall, function(err, stdout, stderr) {
		if(err) {
			logger.info('Error occurred while capturing the metadata. Error:' + err);
			return;
		}
	});
	
	logger.info('waiting for the metaData Capture process:' + p.pid + ' to complete.');
	var status = waitpid(p.pid);
	logger.info('MetaData Capture has been completed... status:' + util.inspect(status));
	*/
	captureVideoMetaData.captureImageFromVideo(video_file, node, device_name);
}

handleMergeVideoProcessingForNode = function(node) {
	logger.info('Scanning Camera store for Video Merging:' + node.node_name);
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + node.node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	try {
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			//logger.info('Failed to list the files found under the node. Store for Node:' + node.node_name + ' doesn\'t exist');
			return false;
		}
	} catch(err) {
		//logger.info('Failed to list the files found under the node. Store for Node:' + node.node_name + ' would n\'t be found. Error observed as:' + err.message);
		return false;
	}
	var files = fs.readdirSync(node_store_folder);
	var index = 0;
	
	var video_batch_id_list =  {};

	files.forEach(function(file) { 

		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_store_folder + path.sep + file;
			
			//try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}

				var extn = path.extname(abs_file);
				if(extn == '.mp4') {
					
					//get the json file for the same video
					var jsonFile = path.dirname(abs_file) + path.sep + path.basename(abs_file, '.mp4') + constants.VIDEO_METADATA_FILE_EXTN;
					
					if(fs.existsSync(jsonFile)) {	
						var videoMetaData = getJsonObjectFromFile(jsonFile);
						if(videoMetaData != null) {
							if(videoMetaData['Duration'] != null) {
								
								if(videoMetaData['video_merged'] == 0 && videoMetaData['recording_completed'] == 1) {
									var batch_id_list = video_batch_id_list[videoMetaData['Batch_id']];
									if(batch_id_list == null) {
										batch_id_list = [];
									}				
									batch_id_list.push(videoMetaData);
									video_batch_id_list[videoMetaData['Batch_id']] = batch_id_list;
								}
							}
						}
					} else {
						logger.info('Video OBject:' + jsonFile + ' has not been found..');
					}
				}
			//} catch(err) { 
			//	logger.info('Error occurred while getting the files:' + err);
			//}
		} else {
			//console.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}		
	});

	/*
	var video_store_merging_processing = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + constants.VIDEOS_FOR_MERGING_PROCESSING;	
	
	var video_merge_store_file = getJsonObjectFromFile(video_store_merging_processing);
	if(video_merge_store_file == null) {
		return;
	}
	
	var video_merge_input_list = [];
	var video_batch_id_list =  {};
	var videoList = video_merge_store_file['videos'];
	videoList.forEach(function(video_file) {
		
		var jsonFile = video_file.replace('.mp4', constants.VIDEO_METADATA_FILE_EXTN);
		if(! fs.existsSync(jsonFile)) {
			removeVideoFromMergeDataList(node, video_file);
		} else {
			if(fs.existsSync(video_file)) {		//meta data / video file must be there
				var videoMetaData = getJsonObjectFromFile(jsonFile);
				
				if(videoMetaData['Duration'] == null) {
					removeVideoFromMergeDataList(node, video_file);
				} else {
					var batch_id_list = video_batch_id_list[videoMetaData['Batch_id']];
					if(batch_id_list == null) {
						batch_id_list = [];
					}				
					batch_id_list.push(videoMetaData);
					video_batch_id_list[videoMetaData['Batch_id']] = batch_id_list;
				}
			}
		}			
	});
	*/
	//logger.info('Batch id list :' + util.inspect(video_batch_id_list));
	
	for(batch_id in video_batch_id_list) {
		logger.info('Creating merged video on Node:' + node.node_name + ':Batch id is:' + batch_id);
		var video_list = video_batch_id_list[batch_id];
		if(video_list.length > 0) {
			handleVideoBatchFileList(video_list, batch_id, node);
		} else {
			logger.info('Input video list is empty');
		}
	}
	
}

handleMetaDataProcessingForNode = function(node) {
	
	//logger.info('Handling metaData for node:'+ node.node_name);
	
	var video_store_metadata_processing = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + constants.VIDEOS_FOR_METADATA_PROCESSING;	
	
	var video_store_file = getJsonObjectFromFile(video_store_metadata_processing);
	if(video_store_file == null) {
		return;
	}
	var videoList = video_store_file['videos']
	
	videoList.forEach(function(video_file) {
		
		var jsonFile = video_file.replace('.mp4', constants.VIDEO_METADATA_FILE_EXTN);
		if(! fs.existsSync(jsonFile)) {
		
			//since metadata file doesn't exist, no point in having this
			removeVideoFromMetaDataList(node, video_file);
		} else {
			if(fs.existsSync(video_file)) {		//meta data / video file must be there
				var videoMetaData = getJsonObjectFromFile(jsonFile);
				if(videoMetaData != null) {
					if(videoMetaData['Duration'] == null) {
						startMetaDataCaptureProcess(video_file, node, device.name);
					} else {
						
						//meta data has been captured. Move it to file merger..
						removeVideoFromMetaDataList(node, video_file);
					}
				}
			}	
		}
	});
}

removeVideoFromMergeDataList = function(node, video_file) {
	var video_store_merging_processing = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + constants.VIDEOS_FOR_MERGING_PROCESSING;	
	
	var video_merge_store_file = getJsonObjectFromFile(video_store_merging_processing);
	if(video_merge_store_file == null) {
		return;
	}
	var videoList = video_merge_store_file['videos'];
	try {
		var index = videoList.indexOf(video_file);
		if(index != -1) {
			videoList.splice(index, 1);
			video_merge_store_file['videos'] = videoList;
			fs.writeFileSync(video_store_merging_processing, JSON.stringify(video_merge_store_file));
		}
	} catch(err) {
	}
}


removeVideoFromMetaDataList = function(node, video_file) {
	
	var video_store_metadata_processing = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + constants.VIDEOS_FOR_METADATA_PROCESSING;	
	
	var video_store_file = getJsonObjectFromFile(video_store_metadata_processing);
	if(video_store_file == null) {
		return;
	}
	var videoList = video_store_file['videos']
	
	try {
		var index = videoList.indexOf(video_file);
		if(index != -1) {
			videoList.splice(index, 1);
			video_store_file['videos'] = videoList;
			fs.writeFileSync(video_store_metadata_processing, JSON.stringify(video_store_file));
		}
	} catch(err) {
	}

	//add it for video file merging
	var video_store_merging_processing = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + constants.VIDEOS_FOR_MERGING_PROCESSING;	
	
	try {
		var video_merge_store_file = getJsonObjectFromFile(video_store_merging_processing);
		if(video_merge_store_file == null) {
			video_merge_store_file = {};
			video_merge_store_file['videos'] = [];
		}
		var videoList = video_merge_store_file['videos']
		videoList.push(video_file);
	
		fs.writeFileSync(video_store_merging_processing, JSON.stringify(video_merge_store_file));
	} catch(err) {
		logger.info('Failed to store the removed video from metadata to video merge..' + err);
	}
	
}

exports.initializeVideoMergeForCamera = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;
	
	if(S(node_name).isEmpty()) {
		response.error_info = 'Failed to start merged video as the node name found to be null / empty .';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var alreadyInProgressStatus = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + constants.MERGE_VIDEO_INPROGRESS_FILE;
	try {
		
		if(fs.existsSync (alreadyInProgressStatus)) {
			response.error_info = 'Failed to start merged video as already video merging is in-progress.';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		var status = {};
		status['node_name'] = node_name;
		status['ctime'] = time_format('%F %T');
		status['timestamp'] = new Date().getTime();
		status['videos'] = [];
		
		if(! addVideoToStoreFile(status)) {
			response.error_info = 'Failed to create the video merging is in-progress file.';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		response.error_info = '';
		response.result = '';
		response.status = 'SUCCESS';
		
		res.json(200, response);
		return;
	} catch(err) {
		response.error_info = 'Failed to create the video merging. Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
}

addVideoToStoreFile = function(status) {
	
	var inprogressStatusFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + status['node_name'] + path.sep + constants.TMP_STORE_FOR_NODE + constants.MERGE_VIDEO_INPROGRESS_FILE;
	try {
		fs.writeFileSync(inprogressStatusFile, JSON.stringify(status));
		return true;
	} catch(err) {
	
	}
	return false;
}

exports.addVideoForMetaDataProcessing = function(req, res) {
	
	var response = JSON.parse(constants.JSON_RESPONSE);
	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;
	var video_file = req.body.video_file || req.query.video_file;
	
	if(S(node_name).isEmpty()) {
		response.error_info = 'Failed to add video for creating merged video as the node name found to be null / empty .';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	if(S(video_file).isEmpty()) {
		response.error_info = 'Failed to add video for creating merged video as the video file found to be null / empty .';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	if(! fs.existsSync(video_file)) {
		response.error_info = 'Failed to add video for creating merged video as the video file doesnot exist.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var video_store_metadata_processing = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + constants.VIDEOS_FOR_METADATA_PROCESSING;	
	
	var video_store_file = getJsonObjectFromFile(video_store_metadata_processing);
	if(video_store_file == null) {
		video_store_file = {};
		video_store_file['videos'] = [];
	}
	video_store_file['videos'].push(video_file);
	
	try {
		fs.writeFileSync(video_store_metadata_processing, JSON.stringify(video_store_file));
	} catch(err) {
	}
	
	logger.info('File list for node:' + node_name+ 'is:' + util.inspect(video_store_file));
	response.error_info = '';
	response.result = 'Successfully added the video to the store for metaData Processing';
	response.status = 'SUCCESS';
	
	res.json(200, response);
}

exports.completeVideoMergeForCamera = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var node_name = req.body.node_name || req.query.node_name;
	var node_id = req.body.node_id || req.query.node_id;
	
	if(S(node_name).isEmpty()) {
		response.error_info = 'Failed to complete video as the node name found to be null / empty .';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var merge_video_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.TMP_STORE_FOR_NODE + constants.MERGE_VIDEO_INPROGRESS_FILE;
	try {
		
		if(! fs.existsSync(merge_video_store_file)) {
			response.error_info = 'Failed to complete the video to merged video as it was not started.';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		var video_store_file = getJsonObjectFromFile(merge_video_store_file);
		if(video_store_file == null) {
			response.error_info = 'Failed to complete the video as it found as null';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		processVideoStoreFile(merge_video_store_file);
		
		response.error_info = '';
		response.result = 'Successfully added the video to the store for merging';
		response.status = 'SUCCESS';
		
		res.json(200, response);
		return;
	} catch(err) {
		response.error_info = 'Failed to create the video merging. Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
}

processVideoStoreFile = function(store_file) {
	
	if(S(store_file).isEmpty()) {
		logger.error('Failed as the store file is found to be null / empty');
		return false;
	}
	var store_data = getJsonObjectFromFile(store_file);
	if(store_data == null) {
		logger.error('Failed to get the store file object as it is found as null');
		return false;
	}
	
	var videos = store_data['videos'];
	
	
	return true;

}