
var request = require("request");
var S = require('string');
var urlValidator = require('valid-url');
var fs = require('fs-extra');
var NanoTimer = require('nanotimer');
var util = require('util')
var path = require('path')
var logger = require('./../logger/logger').logger;
var time_format = require('strftime');
var exec = require('child_process').exec;
var constants = require(__dirname + '/../../constants.js');
var sprintf = require('sprintf').sprintf;

if(process.argv.length < 9) {
	logger.error('Failed as mandatory arguments are missing. Terminating the MJPEG Video recording');
	process.exit(1);
}

var node_name = process.argv[2];
var url = process.argv[3];
var username = process.argv[4];
var password = process.argv[5];
var fps = process.argv[6];
var durationInSeconds = process.argv[7];
var outputVideoFile = process.argv[8];

logger.info('MJpeg recording..using following args:');
logger.info('Node Name:' + node_name);
logger.info('URL:' + url);
logger.info('username:' + username);
logger.info('password:' + password);
logger.info('fps:' + fps);
logger.info('Duration in seconds:' + durationInSeconds);
logger.info('Output Video File:' + outputVideoFile);

var frameCount = 0;
if(S(node_name).isEmpty() || S(url).isEmpty() || S(durationInSeconds).isEmpty() || S(fps).isEmpty() || S(outputVideoFile).isEmpty()) {
	logger.error('Failed as mandatory arguments (Node Name/URL/Outputfolder/Duration/FPS/outputVideoFile are missing. Terminating the MJPEG Video recording')
	process.exit(1);
}
logger.info('Checking FPS');
if(! S(fps).isNumeric()) {
	logger.error('Failed as FPS found to be invalid. Terminating the MJPEG Video recording');
	process.exit(1);
}
logger.info('Checking Duration in seconds');
if(! S(durationInSeconds).isNumeric()) {
	logger.error('Failed as Duration found to be invalid. Terminating the MJPEG Video recording');
	process.exit(1);
}

logger.info('Checking URL');
if(! (urlValidator.isHttpsUri(url) || urlValidator.isHttpUri(url))) {
	logger.error('Failed as URL found to be invalid. Terminating the MJPEG Video recording');
	process.exit(1);
}

createFolder = function(fldr) {
	
	var f = path.resolve(fldr);

	try {
		if(fs.existsSync(f)) {
			var stat = fs.statSync(f);
			if(! stat.isDirectory()) {
				logger.info('Looks like the file is found, folder is not found. Creating it now..');
			//if(! fs.existsSync(f)) {
				fs.mkdirSync(f);
				result = true;
			} else {
				logger.info('Folder is found.');
				result = true;
			}
		} else {
			logger.info('Looks like the folder is not found. Creating it now..');
		//if(! fs.existsSync(f)) {
			fs.mkdirSync(f);
			result = true;
		}
	} catch(err) {
		logger.error(util.inspect(err));
		logger.error('Exception while creating folder. Error:' + err);
	}
}

getMJpegTmpOutputFolder = function(node_name) {
	var folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.MJPEG_STORE_FOR_NODE + path.sep;
	folder += time_format('%d_%m_%y_%H_%M_%S');
	folder = path.resolve(folder);
	createFolder(folder);
	return folder;
}

createVideoFromMJpegImages = function(inputFolder, fps,  outputVideoFile) {

	
	//remove the empty files if any. it interrupts the video creation.
	var emptyFileRemoveCmd = 'find  ' + inputFolder + ' -maxdepth 1 -empty | xargs rm -r';
	logger.info('Removing the empty files if any under folder:' + inputFolder);
	var p = exec(emptyFileRemoveCmd, function(err, stdout, stderr) {
		
		logger.info('Empty files have been removed...under folder:' + inputFolder);
		
		//var cmd = 'cat "' + folder + '/*.jpg" | ffmpeg -f image2pipe -c:v mjpeg -r ' + fps + ' -i - ' + outputVideoFile;
		logger.debug('Creating video from the images captured in folder:' + inputFolder + ' to file:' + outputVideoFile);
		var folder = inputFolder + path.sep + constants. MJPEG_IMAGE_FILENAME_START + constants.MJPEG_IMAGE_SEQ_FORMAT + '.jpg'
		var cmd = constants.CAPTURE_VIDEO_SHELL_PGM + ' "' + folder + '" ' + fps + ' "' + outputVideoFile + '" ';
		var ffmpegProcess = exec(cmd, function(err, stdout, stderr) {
			logger.info('Err from MJPEG VIDEO CREATION FFMPEG is:' + err);
			logger.info('STDOUT from MJPEG VIDEO CREATION FFMPEG is:' + stdout);
			logger.info('STDERR from MJPEG VIDEO CREATION FFMPEG is:' + stderr);
			
			deleteMJpegFolder(inputFolder);
			//check whether the file exists or not.
			if(fs.existsSync(outputVideoFile)) {
				logger.info('MJPEG video file:' + outputVideoFile + ' is present');
				process.exit(0);
			} else {
				logger.info('MJPEG video file:' + outputVideoFile + ' doesnt exist');
				process.exit(1);
			}
		});
	});
}

deleteMJpegFolder = function(inputFolder) {
	if(constants.MJPEG_RETAIN_IMAGE_FOLDERS_FOR_DEBUG == 1) {
		logger.info('Not deleting the MJPEG image folders as debug is enabled');
		return;
	}	
	try {
		fs.removeSync(inputFolder);
	} catch(err) {
		logger.error('Failed in removing the MJPEG image folders. Error:'  +err.message);
	}
}



/*
var cmdLine = 'node ' + constants.MJPEG_IMAGE_CAPTURE_PGM;
cmdLine += ' "' + url + '" "' + username + '" "' + password + '" ' + fps + ' ' + durationInSeconds;
cmdLine += ' "' + mjpegOutputFolder + '" ';
*/

captureImageComplete = function() {
	logger.info('MJPEG image capturing has been completed..., Total no. of frames captured ~:' + frameCount);
	
	//DO this as part of video merging
	//createVideoFromMJpegImages(mjpegOutputFolder, fps, outputVideoFile);
}

getFormattedFrameCount = function(frameCount) {
	return sprintf(constants.MJPEG_IMAGE_SEQ_FORMAT, frameCount);
}
	
captureImage = function(url, username, password, duration, outputFolder) {
		
	f = outputFolder + path.sep + constants.MJPEG_IMAGE_FILENAME_START + getFormattedFrameCount(frameCount) + '.jpg';
	var options = {
		url: url
	};
	if(! (S(username).isEmpty() && S(password).isEmpty())) {
		options['headers'] = {
			'Authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
		} 
	}
	request(options).pipe(fs.createWriteStream(f));
	frameCount++;
	//logger.info('Capturing frame:' + frameCount);
}

captureMJpegStreamToFiles = function(outputfolder) {
	fps = parseInt(fps);
	duration = parseInt(durationInSeconds) + 's';

	timer = new NanoTimer();
	intervalDuration = (1000 / fps) + 'm';
	logger.info('Starting the MJPEG image capturing...');
	timer.setInterval(captureImage, [url, username, password, durationInSeconds, outputfolder], intervalDuration);
	timer.setTimeout(captureImageComplete, '', duration, function(d) {
		logger.info('Requested Duration has been reached. Total images taken for:' + util.inspect(d));
		timer.clearInterval();
	});
}

/*
var p = exec(cmdLine, function(err, stdout, stderr) {
	logger.info('Error Details from Image Capture is:' + err);
	if(err) {
		logger.error('Error occurred while creating the images from mjpeg. Error:' + err);
		return;
	}
	logger.info('Successfully captured the images from MJPEG stream');
	createVideoFromMJpegImages(mjpegOutputFolder, fps, outputVideoFile);
});
*/

var mjpegOutputFolder = getMJpegTmpOutputFolder(node_name);
logger.info('Using MJpeg temp output folder as:' + mjpegOutputFolder);
try {
	stats = fs.lstatSync(mjpegOutputFolder);
	if (! stats.isDirectory()) {
		logger.error('Failed as output folder found to be invalid. Terminating the MJPEG Video recording');
		process.exit(1);
	}
} catch(err) {
	logger.error('Failed as output folder found to be invalid. Error:' + err.message + ', Terminating the MJPEG Video recording.');
	process.exit(1);
}

captureMJpegStreamToFiles(mjpegOutputFolder);


