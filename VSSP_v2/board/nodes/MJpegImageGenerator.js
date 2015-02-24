
var request = require("request");
var S = require('string');
var urlValidator = require('valid-url');
var fs = require('fs');
var NanoTimer = require('nanotimer');
var util = require('util')
var path = require('path')
var logger = require('./../logger/logger').logger;
var constants = require(__dirname + '/../../constants.js');
var sprintf = require('sprintf').sprintf;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

if(process.argv.length < 8) {
	logger.error('Failed as mandatory arguments are missing. Terminating the MJPEG Image recording');
	process.exit(1);
}

var frameCount = 0;
var url = process.argv[2];
var username = process.argv[3];
var password = process.argv[4];
var fps = process.argv[5];
var durationInSeconds = process.argv[6];
var outputfolder = process.argv[7];

logger.info('URL:' + url);
logger.info('username:' + username);
logger.info('password:' + password);
logger.info('fps:' + fps);
logger.info('Duration in seconds:' + durationInSeconds);
logger.info('Output Folder:' + outputfolder);

if(S(url).isEmpty() || S(outputfolder).isEmpty() || S(durationInSeconds).isEmpty() || S(fps).isEmpty()) {
	logger.error('Failed as mandatory arguments (URL/Outputfolder/Duration/FPS are missing. Terminating the MJPEG Image recording')
	process.exit(1);
}

if(! S(fps).isNumeric()) {
	logger.error('Failed as FPS found to be invalid. Terminating the MJPEG Image recording');
	process.exit(1);
}
if(! S(durationInSeconds).isNumeric()) {
	logger.error('Failed as Duration found to be invalid. Terminating the MJPEG Image recording');
	process.exit(1);
}
if(! (urlValidator.isHttpsUri(url) || urlValidator.isHttpUri(url))) {
	logger.error('Failed as URL found to be invalid. Terminating the MJPEG Image recording');
	process.exit(1);
}
try {
	stats = fs.lstatSync(outputfolder);
	if (! stats.isDirectory()) {
		logger.error('Failed as output folder found to be invalid. Terminating the MJPEG Image recording');
		process.exit(1);
	}
} catch(err) {
	logger.error('Failed as output folder found to be invalid. Error:' + err.message + ', Terminating the MJPEG Image recording.');
	process.exit(1);
}


fps = parseInt(fps);
duration = parseInt(durationInSeconds) + 's';

var outfile = './outfile.mp4'
var cmds = [];
cmds.push('-re');
cmds.push('-y');
cmds.push('-f');
cmds.push('image2pipe');
cmds.push('-vcodec');
cmds.push('mjpeg');
cmds.push('-r');
cmds.push(fps);
cmds.push('-i');
cmds.push('-');
cmds.push('-vcodec');
cmds.push('mpeg4');
cmds.push('-y');
cmds.push(outfile);
console.log('Cmd args:' + cmds);
var p = spawn('ffmpeg', cmds);
console.log('ffmpeg pid is:' + p.pid);
p.stdin.pause();
p.on('exit', function(exitCode) {
	console.log('ffmpeg process has been exit with code:' + exitCode);
});

timer = new NanoTimer();
intervalDuration = (1000 / fps) + 'm';
captureImageComplete = function() {
	logger.info('Capturing of videos should have been complete now');
	
	if(p != null) {
		console.log('Closing the ffmpeg stream..');
		p.stdin.write('q');
		p.stdin.end();
		process.kill(p.pid);
		console.log('Process has been closed..');
	} else {
		console.log('Looks like ffmpeg process is NULL');
	}
	//remove the empty files if any
	var emptyFileRemoveCmd = 'find  ' + outputfolder + ' -maxdepth 1 -empty | xargs rm -r';
	logger.info('Removing the empty files if any under folder:' + outputfolder);
	var p = exec(emptyFileRemoveCmd, function(err, stdout, stderr) {
		if(err) {
			logger.info('Error occurred while removing empty files under folder:' + outputfolder);
		}
		logger.info('Empty files have been removed...under folder:' + outputfolder);
	});
	p.on('exit', function(exitCode) {
		logger.info('The Empty files remove process has been terminated with exitCode:' + exitCode);
		process.exit(0);
	});
}

getFormattedFrameCount = function(frameCount) {
	return sprintf(constants.MJPEG_IMAGE_SEQ_FORMAT, frameCount);
}

captureImage = function(url, username, password, duration, outputFolder) {
	
	f = outputFolder + path.sep + constants.MJPEG_IMAGE_FILENAME_START + getFormattedFrameCount(frameCount) + constants.MJPEG_IMAGE_EXTN;
	var options = {
		url: url
	};
	if(! (S(username).isEmpty() && S(password).isEmpty())) {
		options['headers'] = {
			'Authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
		} 
	}
	//request(options).pipe(fs.createWriteStream(f));
	p.stdin.resume();
	request(options).pipe(p.stdin);
	p.stdin.pause();
	console.log('Frame count:' + frameCount);
	frameCount++;
	//logger.info('Capturing frame:' + frameCount);
}


timer.setInterval(captureImage, [url, username, password, durationInSeconds, outputfolder], intervalDuration);
timer.setTimeout(captureImageComplete, '', duration, function(d) {
	logger.info('Total video taken for:' + util.inspect(d));
	timer.clearInterval();
});
