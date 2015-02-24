var http = require("http");
var vidStreamer = require("vid-streamer");
var constants = require('./constants');
var portchecker = require('portscanner')

var newSettings = {
    rootFolder: constants.VSSP_STORE_BASE_FOLDER,
    forceDownload: false,
	random: false,
	rootPath: "",
	server: constants.VIDEO_STREAMING_SERVER_NAME
}


checkAndStartTheServer = function(port) {
	console.log('Checking port availability of:' + port);
	portchecker.checkPortStatus(port, 'localhost', function(error, status) {
		// Status is 'open' if currently in use or 'closed' if available
		console.log('Port:' + port + ' status is:' + status);
		
		if(status === 'open') {
			console.log('Port:' + port + ' is used by other. Cannot start the server.');
			process.exit(1);
		} else {
			console.log('Port:' + port + ' is free now.');
			startServer();
		}
	});

}

startServer = function() {
	var app = http.createServer(vidStreamer.settings(newSettings));
	app.listen(constants.VIDEO_STREAMING_SERVER_PORT);
	console.log(constants.VIDEO_STREAMING_SERVER_NAME + ' started and listening on:' + constants.VIDEO_STREAMING_SERVER_PORT);
}

console.log('Starting: ' + constants.VIDEO_STREAMING_SERVER_NAME);
checkAndStartTheServer(constants.VIDEO_STREAMING_SERVER_PORT);