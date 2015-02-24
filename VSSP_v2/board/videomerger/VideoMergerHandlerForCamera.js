
/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs-extra')
  , util = require('util')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , S = require('string')
  //, passport = require('passport')
  //LocalStrategy = require('passport-local').Strategy  
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , logger = require('./../logger/logger').videoMergerCameraLogger
  , constants = require(__dirname + '/../../constants.js')
  , time_format = require('strftime')
  , portchecker = require('portscanner')
  , net = require('net')
  , request = require('request')
  , execxi = require('execxi')
  , shell = require('shelljs')
  , fsextended = require('fs-extended')
  , moment = require('moment');

  

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//console.log('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}
var device = getDevice();

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//console.log('reading the file:' + file_name);
		if(! fs.existsSync(file_name)) {
			return obj;
		}
		var contents = fs.readFileSync(file_name);
		//try {
			obj = JSON.parse(contents);
		//} catch(err) {
			//console.log('Exception occurred while parsing the json object. Error:' + err);
		//}
	} catch(err) {
		console.log('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

checkWhetherTheVideoFileHasGotDuration = function(file) {
	
	try {
		var checkTimeBefore = new moment();
		var cmd =  '/bin/bash ' + constants.GET_VIDEO_DURATION_PGM + ' ' + file; //'ffmpeg -i ' + file;
		var exitCode = shell.exec(cmd).code;
		var checkTimeAfter = new moment();
		//if(S(response).contains('Duration')) {
		if(exitCode == 0) {
			console.log('File:' + file + ' has got Duration. Valid Video file. Time taken:' + checkTimeAfter.diff(checkTimeBefore)/1000 + ' seconds');
			return true;
		} else {
			console.log('File:' + file + ' has NOT got Duration. Invalid Video file. Time taken:' + checkTimeAfter.diff(checkTimeBefore)/1000 + ' seconds');
		}
	} catch(err) {
		console.log('Exception while getting the video file duration. Error:' + err);
	}
	return false;
}

copyVideoNotFoundToOriginalFile = function(file) {
	console.log('Creating NoVideo file for:' + file);
	try {
		fs.copySync(constants.NO_SIGNAL_VIDEO, file);
		return true;
	} catch(err) {
		console.log('Failed to create NoVideo file. Error:' + err);
	}
	return false;
}

function mergeWithMainFile(jsonFile, metaData) {
	
	var currentTime = new moment();
	var video_file = S(jsonFile).replaceAll(constants.VIDEO_METADATA_FILE_EXTN, '.mp4').s;
	console.log(currentTime.format("h:mm:ss") + "\t:Merging file:" + path.basename(video_file));
	try {
		/*
		//This must be video_recorder_type = 0; RTSP
		var stats = fs.statSync(video_file);
		if(stats == null) {
			console.log('ERROR:VIDEO_FILE NOT PRESENT. Failed to get file statistics of the video file captured. Video File would not be captured..by the system');
			return;
		}
		if(! (stats.isFile() && stats.size > 0)) {
			console.log('ERROR:VIDEO_FILE NOT PRESENT. Video File is Not a File or size is zero. Video File is not present');
			return;
		}
		*/
		if(! checkWhetherTheVideoFileHasGotDuration(video_file)) {
			console.log('Looks like the video file doesnt have Duration. Deleting the json/video files for this record..');
			copyVideoNotFoundToOriginalFile(video_file);		
		}
				
		var video_recorder_type = metaData['video_recorder_type'];
		var seqID = metaData['sequence'];

		var camera = metaData['Node'];
		var fileNameAlone = path.basename(video_file);
		//console.log('File Name Alone:' + fileNameAlone);
		//console.log('Sequence id of file to be merged is:' + seqID);
		//var fileNameAloneWithOutSequenceID = fileNameAlone.substring(0, fileNameAlone.lastIndexOf('_' + seqID + '.mp4'));
		
		//var fileNameAloneWithOutSequenceID = S(fileNameAlone).replaceAll('_' + seqID + '.mp4', '').s;
		var fileNameAloneWithOutSequenceID = constants.MAIN_VIDEO_RECORD_FILE_PREFIX +  metaData['Board_id'] + '_' +  metaData['Node_id'] + '_' + metaData['Batch_id'];

		//console.log('After replacing:' + fileNameAloneWithOutSequenceID);
		//To get new video batch file for every MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS configured
		var hrsIndex = Math.floor((seqID * 60)/constants.MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS) + 1;
		var pathName = path.dirname(video_file);
		var videoBatchFile = pathName + path.sep + fileNameAloneWithOutSequenceID + '_' + hrsIndex + '.mp4';
		var tmpOutputFile = pathName + path.sep + fileNameAloneWithOutSequenceID + '_tmp.mp4';
		var videoBatchJsonFile = S(videoBatchFile).replaceAll('.mp4', '.json').s;
		//console.log('The video batch file:' + videoBatchFile);
		//if(! fs.existsSync(videoBatchFile)) {
			//console.log('Looks like the Main Merged Video file doesnt exists. It could be the start of the merge / or it might have been deleted.');	
		//}
		if(seqID == 1 || 
			(seqID * 60) % constants.MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS == 0
			|| (! fs.existsSync(videoBatchFile))) {
			console.log('This is the first /new main batch file in the sequence. Creating the file:' + videoBatchFile);
			fs.copySync(video_file, videoBatchFile);
			fs.copySync(jsonFile, videoBatchJsonFile);
			var videoBatchJsonObject = getJsonObjectFromFile(videoBatchJsonFile);
			videoBatchJsonObject['last_merged_video_seq'] = seqID;
			
			fs.writeFileSync(videoBatchJsonFile, JSON.stringify(videoBatchJsonObject));
			
			getMetaDataFromVideo(videoBatchJsonFile, videoBatchJsonObject);
			deleteFile(jsonFile);
			deleteFile(video_file);
			var mergeCompleteTime = new moment();
			console.log(mergeCompleteTime.format("h:mm:ss") + '\t:Successfully merged the video:' + fileNameAlone + ' into:' + path.basename(videoBatchFile) + ', Total time taken:' + mergeCompleteTime.diff(currentTime) / 1000);
			return;
		}
		
		
		
		//Get the last merged video file from Main
		// //var videoBatchJsonFile = S(videoBatchFile).replaceAll('.mp4', '.json').s;
		var metaData = getJsonObjectFromFile(videoBatchJsonFile);
		//console.log('Last Merged Video Seq:' + metaData['last_merged_video_seq'] + ', File to be merged seq is:' + seqID);
		if(metaData['last_merged_video_seq'] != (seqID - 1)) {
			//console.log('Last Merged Video Sequence is:' + metaData['last_merged_video_seq'] + ', Current one is:' + seqID + ', Ignore this merge as one another is pending..');
			return;
		}
		//console.log('This video is ready for merging..');
		var mergeFile = getMergeInputFileList(camera, videoBatchFile, video_file);
		
		//console.log('Org file:' + videoBatchFile);
		//console.log('File to join:' + video_file);
		//console.log('Tmp output file:' + tmpOutputFile);
		//console.log('Merge File:' + mergeFile);
		//console.log('Meta-data file:' + jsonFile);
		
		/*
		var args = [mergeFile];
		args.push(tmpOutputFile);
		args.push(constants.VIDEO_TITLE);
		*/
		//var folder = inputFolder + path.sep + constants. MJPEG_IMAGE_FILENAME_START + constants.MJPEG_IMAGE_SEQ_FORMAT + '.jpg'
		var cmd = constants.VIDEO_MERGER_PGM + ' "' + mergeFile + '" "' + tmpOutputFile + '" "' + constants.VIDEO_TITLE + '" ';
		
		//console.log('Executing video merger cmd:' + cmd);
		try {
			shell.exec(cmd);
		} catch(err) {
			console.log('Exception while executing the video merger. Error:' + err);
		}
		//console.log('Video Merging has been completed');	
		if(fs.existsSync(tmpOutputFile)) {
				
			//console.log('Copying the tmp Output file to original video batch file');
			fs.copySync(tmpOutputFile, videoBatchFile);
			//console.log('Successfully copied tmp video file to original video batch file');
			//console.log('time to delete the tmp / video file..../ tmp output file');		
			
			////var videoBatchJsonFile = S(videoBatchFile).replaceAll('.mp4', '.json').s;
			try {
				var metaData = getJsonObjectFromFile(videoBatchJsonFile);
				metaData['last_modified'] = new Date().getTime();;
				metaData['last_merged_video_seq'] = seqID;
				fs.writeFileSync(videoBatchJsonFile, JSON.stringify(metaData));
			} catch(err) {
				console.log('Exception while updating the modified time of the video batch json file. Error:' + err);
			}
					
			//delete the file
			deleteFile(tmpOutputFile);
			deleteFile(video_file);
			deleteFile(mergeFile);
			deleteFile(jsonFile);
			//console.log('Successfully deleted the tmp video/meta-data files..');

			var videoBatchJsonObject = getJsonObjectFromFile(videoBatchJsonFile);
			getMetaDataFromVideo(videoBatchJsonFile, videoBatchJsonObject);
			var mergeCompleteTime = new moment();
			console.log(mergeCompleteTime.format("h:mm:ss") + '\t:Successfully merged the video:' + fileNameAlone + ' into:' + path.basename(videoBatchFile) + ', Total time taken:' + mergeCompleteTime.diff(currentTime) / 1000);
		}

	} catch(err) {
		console.log('Exception occurred while merging the video file. Error:' + err.message);
	}
}

deleteFile = function(file) {
	try {
		fs.unlinkSync(file);
	} catch(err) {
	
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

getNodeList = function() {
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;

	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
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

getNode = function(node_name) {
	
	if(S(node_name).isEmpty()) {
		return null;
	}
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	var nodeFile = node_store_folder + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;

	var contents = fs.readFileSync(nodeFile);
	try {
		//console.log('contents:' + contents);
		var node = JSON.parse(contents);
		return node;
	} catch(err) {
	}
	return null;
}

updateVideoRecordDetails = function(video_file, name, value) {
	
	try {
		var jsonFile =S(video_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
		var metaData = getJsonObjectFromFile(jsonFile);
		if(metaData == null) {
			console.log('ERROR:Failed to get the Json object from the json file while updating the video record for:' + name + ' with value:' + value);
			return;
		}
		metaData[name] = value;
		fs.writeFileSync(jsonFile, JSON.stringify(metaData));	
		//console.log('Updated the json file for:' + name + ', with value:' + value);
	} catch(err) {
		console.log('Exception occurred while updating hte video record details. Error:' + err);
	}
}

createVideoFromMJPEGImages = function(jsonFile, videoObject) {
	
	var video_file = S(jsonFile).replaceAll('.json', '.mp4').s;
	var tmpOutputFolder = videoObject['mjpeg_img_tmp_folder'];
	var folder = tmpOutputFolder + path.sep + constants. MJPEG_IMAGE_FILENAME_START + constants.MJPEG_GLOB_PATTERN
	var cmd2 = constants.CAPTURE_VIDEO_SHELL_PGM + ' "' + folder + '" ' + constants.MJPEG_FPS + ' "' + video_file + '" ';
	//console.log('Cmd #2:' + cmd2);
	
	try {
		var response = shell.exec(cmd2).output;
		//console.log('Video has been created from the images.');
		
		updateVideoRecordDetails(jsonFile, 'video_captured', 1);	
		
		if(constants.MJPEG_RETAIN_IMAGE_FOLDERS_FOR_DEBUG == 0) {
			//console.log('Deleting the images folder:' + tmpOutputFolder);
			
			try {
				fsextended.deleteDirSync(tmpOutputFolder);
			} catch(err) {
				console.log('Exception while deleting the MJPEG tmp images folder. Error:' + err);
			}
		} else {
			//console.log('Leaving the images folder as it is as the debug flag is set');
		}
		
		//capture the metadata from the newly created video file
		getMetaDataFromVideo(jsonFile, videoObject);
	} catch(err) {
		console.log('Exception while converting the images to video. Error:' + err);
	}
}

getMetaDataFromVideo = function(jsonFile, videoObject) {
	//console.log('Getting the metaData from the video');
	try {
		var video_file = S(jsonFile).replaceAll('.json', '.mp4').s;

		var cmd = 'node ';
		cmd += ' "' + constants.CAPTURE_METADATA_FROM_ORIGINAL_VIDEO_BATCH_FILE + '" ';
		cmd += ' "' + video_file + '" ';
		cmd += ' "' + videoObject['Node'] + '" ';
		cmd += ' "' + device.name + '"  > /dev/null 2>&1 ';
		
		//console.log('Executing command to get the meta-data:' + cmd);
		shell.exec(cmd);
		//console.log('Metadata has been captured from the video file');
	}catch(err) {
		console.log('Failed to get the metadata from video. Error:' + err);
	}
}

filterFiles = function(itemPath, stat) {
	var baseName = path.basename(itemPath);
	//console.log('Checking file:' + itemPath + ' and its base name is:' + baseName);
	if(S(baseName).endsWith('.json') 
			&& S(baseName).startsWith(constants.VIDEO_RECORD_FILE_PREFIX) 
			&& stat.size > 0 
			&& stat.isFile()) {
		
		var videoObject = getJsonObjectFromFile(itemPath);
		if(videoObject == null) {
			return false;
		}
		if ('timestamp' in videoObject
			&& 'json_file_name' in videoObject 
			&& 'video_recorder_type' in videoObject
			) {
			if(videoObject['video_recorder_type'] == "1") {
				/*
				if('image_captured' in videoObject) {
					return true;
				}
				return false;
				*/
			}
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

isVideoObjectOkayToProceed = function(videoObject, fileName) {
	try {
		var timestamp = videoObject['timestamp'];
		var createdTime = moment(timestamp);
		
		/*
		var stats = fs.statSync(fileName);
		var fileModifiedTime = stats.mtime;
		var dateComponents = ('' +  fileModifiedTime).split(' ');	//make it string and split it
		var modifiedTimeFormatted = d[1] + '-' + d[2] + '-' + d[3] + '/' + d[4];
		var modifiedTime  = moment(modifiedTimeFormatted, 'MMM-DD-YYYY/HH:mm:ss');
		*/
		var currentTime  = moment();
		var diff = currentTime.diff(createdTime);
		if(diff >= 180000) {
			console.log('Looks like the video file meta-data update got failed. This might have been due the recorder process got killed unexpectedly.');
			return true;
		} else {
			console.log('File recording might be in-progress..');
		}
	} catch(ex) {
		console.log('Exception while checking the video object. ' + ex);
	}
	return false;
}

startScanCameraAndMergeIndividualVideo = function(camera_name) {
	
	//console.log('Scanning camera:' + camera_name);
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + camera_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	
	//var files = fs.readdirSync(node_store_folder);
	
	var files = fsextended.listAllSync(node_store_folder, { filter: filterFiles, map : mapFiles, sort : compareFileCreationTime });
	//console.log('No. of json files in the current camera store is:' + files.length);
	
	if(files.length > 0) {
		var videoObjects = [];
		files.forEach(function(fileObject) { 
			//console.log('File after filter is:' + util.inspect(fileObject));
			abs_file = fileObject.path;
			videoObjects.push(getJsonObjectFromFile(abs_file));
		});
		videoObjects.sort(compareVideoObjectBasedOnCreationFile);
		var noOfFilesProcessed = constants.MAX_NO_VIDEO_FILES_TO_PROCESS_PER_TIME;
		
		//if(videoObjects.length > 0 && videoObject != null) {
		for(var i = 0; i < videoObjects.length; i++) {
			var videoObject = videoObjects[i];
			
			if(videoObject != null) {
				console.log('Processing file from Camera:' + camera_name + ' with Timestamp:' + videoObject['timestamp'] + ', file:' + videoObject['video_file_name']  + ', json file:' +  videoObject['json_file_name']);
				
				//videoObjects.every(function(videoObject) {
					//console.log('Timestamp:' + videoObject.timestamp + ', file:' + videoObject['video_file_name']);
				var abs_file = node_store_folder + path.sep + videoObject['json_file_name'];
				/*
				if(videoObject['video_recorder_type'] == "1") {		//for MJPEG
					if(videoObject['image_captured'] == 1 && videoObject['video_captured'] != 1) {
						//looks like video is not created. extract the tmp folder and merge images to video
						console.log('MJPEG Image capture completed. Video capture is NOT done. Creating it now..');
						createVideoFromMJPEGImages(abs_file, videoObject);
						videoObject = getJsonObjectFromFile(abs_file);	//refresh it for subsequent verification
					} else {
					
						if(videoObject['image_captured'] == 0 && videoObject['video_captured'] == 0) {
							console.log('MJPEG Image capture not complete / Video capture also not complete. Checking for program termination...abruptly..');
							if(isVideoObjectOkayToProceed(videoObject, abs_file)) {
								console.log('Looks like the Video recoring might have been stopped abruptly..');
								createVideoFromMJPEGImages(abs_file, videoObject);
								videoObject = getJsonObjectFromFile(abs_file);	//refresh it for subsequent verification
							} 
						} else {
							console.log('Looks like the video object recording is in-progress...');
						}
						//break;
					}
				} else if(videoObject['video_recorder_type'] == "0") {		//RTSP
					if(videoObject['video_captured'] == 0) {
						console.log('RTSP Image capture not complete / Video capture also not complete. Checking for program termination...abruptly..');
						if(isVideoObjectOkayToProceed(videoObject, abs_file)) {
							console.log('Looks like the Video recoring might have been stopped abruptly..');
							createVideoFromMJPEGImages(abs_file, videoObject);
							videoObject = getJsonObjectFromFile(abs_file);	//refresh it for subsequent verification
						} 
					} 
				}
				*/
				if(videoObject['video_captured'] == 0) {
					console.log('RTSP Image capture not complete / Video capture also not complete. Checking for program termination...abruptly..');
					if(isVideoObjectOkayToProceed(videoObject, abs_file)) {
						console.log('Looks like the Video recoring might have been stopped abruptly..');
						updateVideoRecordDetails(abs_file, 'video_captured', 1);	
						videoObject = getJsonObjectFromFile(abs_file);	//refresh it for subsequent verification
					} 
				} 				
				if(videoObject['video_captured'] == 1) {
					//console.log('Video Capture is complete. Looking for merging...');
					if(videoObject['video_merged'] != 1) {
						mergeWithMainFile(abs_file, videoObject);
					}
				} else {
					console.log('The video object video capture is not yet completed for:' + videoObject['json_file_name']);
					break;
				}
			} else {
				console.log('Looks like the current video object is null');
				break;
			}
		}
	} else {
		//console.log('No video json files found for camera:' + camera['node_name']);
	}	
	
	//console.log('Starting the next execution in another:' +  constants.PROCESS_VIDEO_FILES_FREQ_IN_SECONDS + ' seconds');
	setTimeout(function() {
		startScanCameraAndMergeIndividualVideo(camera_name);
	}, constants.PROCESS_VIDEO_FILES_FREQ_IN_SECONDS * 1000);;	
}

/*
startScanAndMergeIndividualVideo = function() {
	
	var cameras = getNodeList();
	cameras.forEach(function(camera) {
		startScanCameraAndMergeIndividualVideo(camera);
	});
	//console.log('All cameras have been scanned. Schdule to run it after:' + constants.PROCESS_VIDEO_FILES_FREQ_IN_SECONDS + ' seconds.');
	setTimeout(function() {
		startScanAndMergeIndividualVideo();
	}, constants.PROCESS_VIDEO_FILES_FREQ_IN_SECONDS * 1000);
}
*/


var camera_name = process.argv[2];
if(S(camera_name).isEmpty()) {
	console.log('Failed to start the Video Merge for the camera as the camera name passed found to be null / empty');
	process.exit(0);
} else {
	console.log('Starting the Video Merger for Camera:' + camera_name);
	startScanCameraAndMergeIndividualVideo(camera_name);
}




