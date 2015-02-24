
var request = require("request");
var S = require('string');
var urlValidator = require('valid-url');
var fs = require('fs');
var NanoTimer = require('nanotimer');
var util = require('util')
var path = require('path')

if(process.argv.length < 7) {
	logger.error('Failed as mandatory arguments are missing. Terminating the MJPEG Video recording');
	process.exit(1);
}

/*
logger.debug('Input args found as:' + process.argv);
process.on('exit', function(exitCode, signal) {
	logger.error('Cleaning the record environment on process exit code:%d, Terminate signal:%d', exitCode, signal);
	cleanRecordEnvironmentAndExit();
});

var video_record_duration_remaining;
var video_record_process_args = [];

var record_node_name = process.argv[2];
logger.debug('Checking the node name:'+ record_node_name);
if(S(record_node_name).isEmpty()) {
	logger.error('Failed as Video Record Node name is found as null / empty. Terminating the video recording');
	process.exit(1);
}


validateArguments = function(url, fps, durationInSeconds, outputFolder) {
	if(S(url).isEmpty() || S(outputFolder).isEmpty() || S(durationInSeconds).isEmpty() || S(fps).isEmpty()) {
		console.error('Failed as either URL / Duration / FPS / OutputFolder might not have been defined')
		return false;
	}
	
	if(! S(fps).isNumeric()) {
		console.error('Failed as fps is found to be invalid');
		return false ;
	}
	if(! S(durationInSeconds).isNumeric()) {
		console.error('Failed as Duration is found to be invalid');
		return false;
	}
	if(! (urlValidator.isHttpsUri(url) || urlValidator.isHttpUri(url))) {
		console.error('Failed as url is found to be invalid');
		return false;
	}
	try {
		stats = fs.lstatSync(outputFolder);
		if (! stats.isDirectory()) {
			console.error('Failed as output folder found to be invalid / not found');
			return false;
		}
	} catch(err) {
		console.error('Failed as output folder found to be invalid. Error:' + err.message);
		return false;
	}
	return true;
}

captureVideo = function(url, username, password, fps, durationInSeconds, outputFolder) {
	
	if(! validateArguments(url, fps, durationInSeconds, outputFolder)) {
		return;
	}
	
	fps = parseInt(fps);
	duration = parseInt(durationInSeconds) + 's';
	
	timer = new NanoTimer();
	intervalDuration = (1000 / fps) + 'm';
	timer.setInterval(captureImage, [url, username, password, consumer, limiter, writer, duration, outputFolder], intervalDuration);
	timer.setTimeout(captureImageComplete, '', duration, function(d) {
 		console.log('Total video taken for:' + util.inspect(d));
		timer.clearInterval();
	});
}

captureImageComplete = function() {
	console.log('Capturing of videos should have been complete now')
}

captureImage = function(url, username, password, consumer, limiter, writer, duration, outputFolder) {
        f = outputFolder + path.sep + new Date().getTime() + '.jpg';
        var options = {
            url: url,
            headers: {
                'Authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
            }  
        };
		request(options).pipe(fs.createWriteStream(f));	
}

captureVideo('http://192.168.2.2/jpg/image', 'admin', 'admin', 5, 30, '/home/linaro/testvssp/tmp/MJpegVideoGenerator/test')
*/