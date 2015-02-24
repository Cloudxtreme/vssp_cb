
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
  , logger = require('./../logger/logger').videoMergerLogger
  , constants = require(__dirname + '/../../constants.js')
  , time_format = require('strftime')
  , portchecker = require('portscanner')
  , net = require('net')
  , request = require('request')
  , execxi = require('execxi')
  , shell = require('shelljs');
  

var fileProcessingInProgress = false;
var JobQueue = require('dequeue');
var file_list_completed = new JobQueue();
var file_list_started = new JobQueue();
var file_list_index = [];
var file_list_data = {};
var app = express();

// all environments
app.set('port', process.env.PORT || constants.VIDEO_MERGER_SERVICE_PORT)
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.set('APP_NAME', constants.VIDEO_MERGER_SERVICE);
app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/tmp/' }));

app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());

app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public/board_htmls')));
//app.use(express.static(path.join(__dirname, 'store')));
app.use(express.static(constants.VSSP_STORE_BASE_FOLDER));

/*
// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}
*/


app.post('/board/mergeFile', function(req, res) {
	mergeFile(req, res);
});

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//console.log('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}


mergeFile = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);	
	var file = req.body.file || req.query.file;
	var video_recorder_type = req.body.video_recorder_type || req.query.video_recorder_type;
	var tmpOutputFolder = req.body.tmpOutputFolder || req.query.tmpOutputFolder;
	
	var file = req.body.file || req.query.file;
	var state = req.body.state || req.query.state; //recording_started || recording_completed
	if(S(file).isEmpty() || S(state).isEmpty()) {
		response.error_info = 'File / State to be merged found to be null / empty';
		res.json(response);
		return;
	}
	logger.info('File to process:' + file +' and its state:' + state);
	var data = {};
	data['state'] = -1;
	data['file'] = file;
	data['video_recorder_type'] = video_recorder_type;
	data['tmp_output_folder'] = tmpOutputFolder;
	
	try {
		if(state == 'recording_completed') {
			if(video_recorder_type == 0) { // For RTSP
				if(! fs.existsSync(file)) {
					response.error_info = 'File to be merged doesnt exists when the state is recording completed for RTSP';
					res.json(response);
					return;
				}
			}
			if(video_recorder_type == 1) { // For MJPEG
				
				if(! fs.existsSync(tmpOutputFolder)) {
					response.error_info = 'Folder in which images stored:' + tmpOutputFolder + ' doesnt exists when the state is recording completed for MJPEG';
					res.json(response);
					return;
				}
				
			}
			data['state'] = 1; //ready
		}
		if(state == 'recording_started') {
			data['state'] = 0;
		}		
	} catch(err) {
		response.error_info = 'Exception occurred while handling the request. Error:' + err.message;
		res.json(response);
		return;	
	}
	if(file_list_data[file] === undefined) {
		logger.info('Added the entry:' + file + ' in index list. This must be recording started event');
		file_list_index.push(file);
	} else {
		logger.info('File:' + file + ' already added in the list.. This must be recording completed event')
	}
	file_list_data[file] = data;
	
	//logger.info('The current list is:' + util.inspect(file_list_data));
	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = 'Successfully added/handled the request for file merge'
	res.json(response);
}

startProcessingRecordedFiles = function() {
	logger.info('Starting the processing at interval of:' + constants.PROCESS_VIDEO_FILES_FREQ_IN_SECONDS + ' seconds');
	setInterval(function() {
		processRecordedFileInPresent();
	}, constants.PROCESS_VIDEO_FILES_FREQ_IN_SECONDS * 1000);
}


processRecordedFileInPresent = function() {
	//logger.info('Processing the recorded files...');
	if(file_list_index.length ==0) {
		//logger.info('No recorded video files are present to process...');
		return;
	}
	
	if(fileProcessingInProgress == true) {
		//logger.info('File processing is in-progress. This request can be taken later.');
		return;
	}
	
	var file = file_list_index[0];
	if(file == null) {
		logger.error('Looks like the first index in the file list is found to be null');
		return;
	}
	var data = file_list_data[file];
	if(data == null) {
		logger.error('Looks like the DATA inthe file is found to be null');
		return;
	}
	
	if(data['state'] == 1) {
		logger.info('Starts merging file:' + file);
		mergeWithPreviousFile(data);
		
		//since we have handled the file merge remove it..now..
		file_list_index.splice(0, 1);
		logger.info('Removed the item from the list..');
	} else {
		logger.info('Recording is still inprogress for file:' + data['file'] + ', state:' + data['state'] + ', Waiting for it to complete..');
	}
	//var file = file_list.shift();
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

function handleMJPEGVideo(video_file, video_recorder_type, tmpOutputFolder) {

	var jsonFile =S(video_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
	var metaData = getJsonObjectFromFile(jsonFile);
	if(metaData == null) {
		logger.error('ERROR:Failed to get the Json object from the json file');
		return;
	}
	
	if(metaData['recording_completed'] != 1) {
		logger.error('ERROR:Looks like MJPEG Recording is NOT completed.');
		return;
	}
	if(metaData['image_captured'] != 1) {
		logger.error('ERROR:Looks like MJPEG IMAGE Capturing is NOT completed.');
		return;
	}
	logger.info('Ready for MJPEG Video Capturing from Images..');
	
	//Capture video from images
	var folder = tmpOutputFolder + path.sep + constants. MJPEG_IMAGE_FILENAME_START + constants.MJPEG_GLOB_PATTERN
	//var cmd1 = '/bin/bash find  ' + tmpOutputFolder + ' -maxdepth 1 -empty | xargs rm -r';
	//logger.info('Cmd #1:' + cmd1);
	
	var cmd2 = constants.CAPTURE_VIDEO_SHELL_PGM + ' "' + folder + '" ' + constants.MJPEG_FPS + ' "' + video_file + '" ';
	logger.info('Cmd #2:' + cmd2);
	
	//Merge the video to main file
	
	//var cmd2 = 'ls';
	
	// Extract the image from the new file to update the json file
	//var cmd3 = 'ls';
	
	var listOfCmds = [cmd2];
	//var response = execxi.executeArray(listOfCmds);
	// lets see what it returns as a result array
	//logger.info(util.inspect(response));
	
	var response = shell.exec(cmd2).output;
	logger.info('Response is:' + response);
	logger.info('Execution has been complete');
}


function mergeWithPreviousFile(data) {
	
	video_file = data['file'];
	video_recorder_type = data['video_recorder_type'];
	tmpOutputFolder = data['tmp_output_folder'];
	
	var jsonFile =S(video_file).replaceAll('.mp4', constants.VIDEO_METADATA_FILE_EXTN).s;
	
	try {
		
		if(video_recorder_type == 1) {	//MJPEG recorder
			handleMJPEGVideo(video_file, video_recorder_type, tmpOutputFolder);
			return;
		}
		
		//This must be video_recorder_type = 0; RTSP
		var stats = fs.statSync(video_file);
		if(stats == null) {
			logger.error('ERROR:VIDEO_FILE NOT PRESENT. Failed to get file statistics of the video file captured. Video File would not be captured..by the system');
			return;
		}
		if(! (stats.isFile() && stats.size > 0)) {
			logger.error('ERROR:VIDEO_FILE NOT PRESENT. Video File is Not a File or size is zero. Video File is not present');
			return;
		}

		var metaData = getJsonObjectFromFile(jsonFile);
		if(metaData == null) {
			logger.error('ERROR:Failed to get the Json object from the json file');
			return;
		}
		
		var video_recorder_type = metaData['video_recorder_type'];
		var seqID = metaData['sequence'];

		var camera = metaData['Node'];
		var fileNameAlone = path.basename(video_file);
		logger.info('File Name Alone:' + fileNameAlone);
		//var fileNameAloneWithOutSequenceID = fileNameAlone.substring(0, fileNameAlone.lastIndexOf('_' + seqID + '.mp4'));
		
		//var fileNameAloneWithOutSequenceID = S(fileNameAlone).replaceAll('_' + seqID + '.mp4', '').s;
		var fileNameAloneWithOutSequenceID = constants.MAIN_VIDEO_RECORD_FILE_PREFIX +  metaData['Board_id'] + '_' +  metaData['Node_id'] + '_' + metaData['Batch_id'];

		logger.info('After replacing:' + fileNameAloneWithOutSequenceID);
		//To get new video batch file for every MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS configured
		var hrsIndex = Math.floor((seqID * 60)/constants.MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS) + 1;
		var pathName = path.dirname(video_file);
		var videoBatchFile = pathName + path.sep + fileNameAloneWithOutSequenceID + '_' + hrsIndex + '.mp4';
		var tmpOutputFile = pathName + path.sep + fileNameAloneWithOutSequenceID + '_tmp.mp4';
		logger.info('The video batch file:' + videoBatchFile);
		//if(! fs.existsSync(videoBatchFile)) {
		if(seqID == 1) {
			logger.info('This is the first file in the sequence. Creating the file');
			fileProcessingInProgress = true;
			/*
			copyFile(video_file, videoBatchFile, function(err) {
				fileProcessingInProgress = false;
				if(err) {
					logger.error('Failed to create first video batch file. Err:' + err);
					return;
				}
				fileProcessingInProgress = true;
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
				
				

				//delete the file
				//deleteFile(jsonFile);
				//deleteFile(video_file);
				logger.info('Deleted the first recorded file');
			});
			*/
			captureMetaDataFromOriginalVideoFile(camera, videoBatchFile);
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
		fileProcessingInProgress = true;
		var ffmpegProcess = exec(cmd, function(err, stdout, stderr) {
			
			fileProcessingInProgress = false;
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
	} catch(err) {
		logger.error('Exception occurred while merging the video file. Error:' + err.message);
	}
}

deleteFile = function(file) {
	try {
		fs.unlinkSync(file);
	} catch(err) {
	
	}
}
captureMetaDataFromOriginalVideoFile = function(camera, originalVideoBatchFile) {

	var metaDataCaptureArgs = [];
	var device = getDevice();
	if(device == null) {
		logger.error('Failed in getting the device name');
		fileProcessingInProgress = false;
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
	var cmd = 'node ' + metaDataCaptureArgs.join(' ');
	logger.info('Cmd for meta-data creation is:' + cmd);
	//metadatacapture_process = spawn('node', metaDataCaptureArgs, { stdio: 'inherit' });
	fileProcessingInProgress = true;
	metadatacapture_process = exec(cmd, function(err, stdout, stderr) {
		if(err) {
			logger.error('Failed while executing the meta-data capture...');
		}
		logger.info('Err from META-DATA-CAPTURE:' + err);
		logger.info('STDOUT from META-DATA-CAPTURE:' + stdout);
		logger.info('STDERR from META-DATA-CAPTURE:' + stderr);
		fileProcessingInProgress = false;
	});
	
	/*
	metadatacapture_process.on('exit', function(exitCode, signal) {
		fileProcessingInProgress = false;
		logger.debug('METADATA CAPTURE:exit signal from metadata capture process...:' + exitCode + ' of file:' + originalVideoBatchFile);
	});
	
	metadatacapture_process.on('error', function (err) {
		logger.error('Error occurred while launching the metadata capture process for video batch file:' + originalVideoBatchFile + ', Error:' + err);
	});
	*/
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

checkAndStartTheServer = function(port) {
	logger.debug('Checking port availability for app: ' + app.get('APP_NAME') + ' of:' + port);
	portchecker.checkPortStatus(port, 'localhost', function(error, status) {
		// Status is 'open' if currently in use or 'closed' if available
		logger.debug('Port:' + port + ' status is:' + status);
		
		if(status === 'open') {
			logger.error('Port:' + port + ' is used by other. Cannot start the server.');
			process.exit(1);
		} else {
			logger.info('Port:' + port + ' is free now.');
			startServer();
		}
	});
}

startServer = function() {
	http.createServer(app).listen(app.get('port'), function(){
		logger.info(app.get('APP_NAME') + ' server listening on port ' + app.get('port'));
		startProcessingRecordedFiles();
	});
}

logger.info('Starting: ' + app.get('APP_NAME'));
checkAndStartTheServer(app.get('port'));


