var S = require('string');
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');
var http = require('http');
var time_format = require('strftime');
var url = require('url');
var util = require('util');
var constants = require(__dirname + '/../../constants.js');
var logger = require('./../logger/logger').videoMergerLogger;

var stdOutConsoleData = "";
var stdErrConsoleData = "";
//logger.debug('The no. of args:' + process.argv.length);
if(process.argv.length < 19) {
	logger.error('Failed as mandatory arguments are missing. Terminating the image capture from video');
	process.exit(1);
}
var imageCaptureExecutable = process.argv[2];
var timeOffsetToCaptureFrame = process.argv[4]
timeOffsetToCaptureFrameValid = timeOffsetToCaptureFrame.replace('-', '');
if(! S(timeOffsetToCaptureFrameValid).isNumeric()) {
	logger.error('Failed as Time to offset to get the frame is NOT numeric Found as:' + timeOffsetToCaptureFrame + '. Terminating the image capture from video');
	process.exit(1);
}
var videoFileName = process.argv[6];
var noOfFramesToCapture = process.argv[10];
noOfFramesToCaptureValid = noOfFramesToCapture.replace('-', '');
if(! S(noOfFramesToCaptureValid).isNumeric()) {
	logger.error('Failed as No. of frames to capture is NOT numeric Found as:' + noOfFramesToCapture + '. Terminating the image capture from video');
	process.exit(1);
}

var outputFile = process.argv[17];
if(S(outputFile).isEmpty()) {
	logger.error('Failed as output image file is missing');
	process.exit(1);
}
var node_name = process.argv[18];
var device_name = process.argv[19];
args = process.argv.slice(3, 18);

console.log('sliced args:' + imageCaptureExecutable + ', ' + args);
console.log('Capturing the image from the video:' + videoFileName);
image_capture_process = spawn(imageCaptureExecutable, args);

captureData = function() {
	if(image_capture_process.stdout) {
		image_capture_process.stdout.on('data', function(data) {
			//console.log("Video record The output is:%s", data);
			stdOutConsoleData += data;
		});
	} else {
		//console.log('std out is not defined');
	}

	if(image_capture_process.stderr) {
		image_capture_process.stderr.on('data', function(data) {
			//console.log("%s", data);
			stdErrConsoleData += data;
		});
	} else {
		//console.log('std err is not defined');
	}
}
image_capture_process.on('exit', function(exitCode, signal) {
		
		//console.log("Image capture from Video Process has been terminated with code:%d", exitCode);
		//console.log("Image capture from Video Process has got signal as:%d", signal);
		//console.log('StdOut data is:' + stdOutConsoleData);
		//console.log('StdError data is:' + stdErrConsoleData);
		
		parseLogDataAndCreateOutputVideoMetaDataFile();
	});
image_capture_process.on('error', function(err) {
		
		//console.log("Image capture from Video Process has been terminated with code:%d", exitCode);
		//console.log("Image capture from Video Process has got signal as:%d", signal);
		//console.log('StdOut data is:' + stdOutConsoleData);
		//console.log('StdError data is:' + stdErrConsoleData);
		
		console.log('The err is:' + err);
	});
captureData();

parseLogDataAndCreateOutputVideoMetaDataFile = function() {

	var metaDataFile = getVideoMetaDataFile();
	
	var metaData = getJsonObjectFromFile(metaDataFile);
	if(metaData == null) {
		metaData = {};
	}
	var startCapturingData = 0;
	var lineData = stdErrConsoleData.split('\n');
	//logger.debug('No. of lines:' + lineData.length);
	lineData.forEach(function(line) {
		var line = S(line).trim();
		if(startCapturingData == -1) {
			return false;
		}
		//console.log('Line:' + line);
		if(S(line).startsWith('Metadata:')) {
			//console.log('Starts capturing the data');
			startCapturingData = 1;
		}
		if(startCapturingData == 1) {
			if(S(line).startsWith('Metadata:')) {
				//console.log('Start of the line so return');
				return;
			}
			if(S(line).startsWith('Duration:')) {
				//console.log('Duration has been found. Time to terminate');
				var index = line.indexOf(':');
				if(index != -1) {
					key = S(line.substring(0, index)).trim().s;
					value = S(line.substring(index + 1)).trim().s;
					
					//split the value
					var data = value.split(',')
					value = S(data[0]).trim().s;
					
					if(! S(data[2]).isEmpty()) {
						var bitRateData = S(data[2]).trim().s
						var bitRateIndex = bitRateData.indexOf(':');
						if(bitRateIndex != -1) {
							var bitRateKey = S(bitRateData.substring(0, bitRateIndex)).trim().s;
							var bitRateValue = S(bitRateData.substring(bitRateIndex + 1)).trim().s;
							
							metaData[S(bitRateKey).camelize().s] = bitRateValue;
						}
					}
					//console.log(key + ':' + value);
					metaData[S(key).camelize().s] = value;
				}
				//startCapturingData = -1;
				//return false;
			} else if(S(line).startsWith('Stream')) {
			
				var data = line.split(',');
				var screensize = S(data[2]).trim().s;
				if(! S(screensize).isEmpty()) {
					metaData['Screen Size'] = screensize.split(' ')[0];
				}
				
				var fps = S(data[4]).trim().s;
				if(! S(fps).isEmpty()) {
					metaData['FPS'] = fps.split(' ')[0];
				}
				
				var videoType = S(data[0]).trim().s;
				if(! S(videoType).isEmpty()) {
					metaData['Video Spec'] = S(videoType.split(':')[3]).trim().s;
				}
				startCapturingData = -1;
				return false;
			} else {
				var index = line.indexOf(':');
				if(index != -1) {
					key = S(line.substring(0, index)).trim().s;
					value = S(line.substring(index + 1)).trim().s;
					//console.log(key + ':' + value);
					metaData[S(key).camelize().s] = value;
				}		
			}
		}
	});
	var filePath = S(videoFileName.replace(constants.VSSP_STORE_BASE_FOLDER, '')).replaceAll('\\', '/').s;
	filePath = S(filePath).ensureLeft('/').s;

	var normalImage = S(outputFile.replace(constants.VSSP_STORE_BASE_FOLDER, '')).replaceAll('\\', '/').s;
	normalImage = S(normalImage).ensureLeft('/').s;
	//logger.info('Image captured is:' + normalImage);
	metaData['Path'] = filePath;
	metaData['Size'] = getVideoFileSize();
	metaData['Name'] = path.basename(videoFileName);
	metaData['Node'] = node_name;
	metaData['Board'] = device_name;
	if(fs.existsSync(outputFile)) {
		metaData['Normal_Image'] = normalImage;
	} else {
		metaData['Normal_Image'] = '';	
	}
	console.log('The meta data is:'  + util.inspect(metaData));
	
	try {
		fs.writeFileSync(metaDataFile, JSON.stringify(metaData));
	} catch(err) {
		logger.error('Failed in creating the json meta data file for the video file:' + path.basename(videoFileName));
	}
	//console.debug('Done');
}

getVideoFileSize = function() {
	try {
		var stats = fs.statSync(videoFileName);
		return stats.size;
	} catch(err) {
	}
	return 0;
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
getVideoMetaDataFile = function() {
	var dirName = path.dirname(videoFileName);
	var fileName = path.basename(videoFileName, path.extname(videoFileName));
	var videoJsonFile = dirName + path.sep + fileName + constants.VIDEO_METADATA_FILE_EXTN;
	//console.log('Output JSON file:' + videoJsonFile);
	return videoJsonFile;
}

status = true;
//logger.debug('Started the image capture from video successfully');
