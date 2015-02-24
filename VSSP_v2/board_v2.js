
/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , util = require('util')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , S = require('string')
  //, passport = require('passport')
  //LocalStrategy = require('passport-local').Strategy  
  , spawn = require('child_process').spawn
  , constants = require('./constants.js')
  , user = require('./board/nodes/user')
  , node = require('./board/nodes/nodehandler.js')
  , backup = require('./board/backup/backup_videos_settings.js') 
  , videomgr = require('.//board/nodes/recordmanager.js')
  , settings = require('./board/settings/settings.js') 
  , backupsettings = require('./board/backup/backup_videos_settings.js')
  , portchecker = require('portscanner')
  , logger = require('./board/logger/logger').logger
  , strftime = require('strftime')
  , request = require('request');

var app = express();

// all environments
app.set('port', process.env.PORT || constants.BOARD_PORT_V2)
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.set('APP_NAME', constants.APP_NAME);
app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/tmp/' }));

var allowCrossDomain = function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, X-Range, Range, Content-Type, Content-Range, Accept");
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header('Access-Control-Expose-Headers', 'Content-Range');
	dumpRequestDetails(req);
	if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

dumpRequestDetails = function(req) {
	var pathInfo = url.parse(req.url, true).pathname;
	var logData = req.method + '\t';
	if(S(pathInfo).startsWith('/js/') || S(pathInfo).startsWith('/js_dojo/')) {
		//ignore this log line
		return;
	}
	
	logData +=  pathInfo;
	if(req.method == 'GET' || req.method == 'OPTIONS') {
		var param = JSON.stringify(req.query);
		if(param.length > 2) {
			logData += '?' + param;
		}
	} else if(req.method == 'POST') {
		logData += '?' + JSON.stringify(req.body);
	}
	if(S(pathInfo).startsWith('/board/proxy')) {
		return;
	}
	logger.debug(logData);
}

app.use(allowCrossDomain);
//app.use(express.logger('dev'));

app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());

//app.use(passport.initialize());
//app.use(passport.session());
app.use(app.router);

app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public/board_htmls_v2')));
//app.use(express.static(path.join(__dirname, 'store')));
app.use(express.static(constants.VSSP_STORE_BASE_FOLDER));

/*
// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}
*/

app.get('/board/downloadFile', function(req, res) {
	node.downloadFile(req, res);
});

//No longer pingServer is supported. This is being used automatically in the authentication
/*
app.post('/board/pingServer', function(req, res) {
	user.pingServer(req, res);
});
*/
app.post('/board/userauthenticate', function(req, res) {
	user.authenticate(req, res);
});

app.post('/board/isUserAdmin', function(req, res) {
	user.isUserAdmin(req, res);
});

app.post('/signOut', function(req, res) {
	logger.info('signing out...');
	res.cookie(constants.COOKIE_VSSP_USER_NAME, '');
	user.signOut(req, res);
	//res.redirect('index.html');
});

app.post('/board/getBoardDetails', function(req, res) {
	node.getBoardDetails(req, res);
});

app.get('/board/root', function(req, res) {
	node.listRootBoard(req, res);
});

app.post('/board/addNode', function(req, res) {
	node.addNode(req, res);
});

app.post('/board/listNodes', function(req, res) {
	node.listNodes(req, res);
});

app.get('/board/getVideoTags', function(req, res) {
	node.getVideoTags(req, res);
});

app.post('/board/updateVideoTag', function(req, res) {
	videomgr.updateVideoTag(req, res);
});

app.get('/board/getNodeModels', function(req, res) {
	node.getNodeModels(req, res);
});

app.get('/board/getVideoProfiles', function(req, res) {
	node.getVideoProfiles(req, res);
});

app.post('/board/getNodeDetails', function(req, res) {
	node.getNodeDetails(req, res);
});

app.post('/board/modifyNode', function(req, res) {
	node.modifyNode(req, res);
});

app.post('/board/deleteNode', function(req, res) {
	node.deleteNode(req, res);
});

app.get('/board/getBoardNodePaneDetails', function(req, res) {
	node.getBoardNodePaneDetails(req, res);
});

app.get('/board/getBoardCameraViewDetails', function(req, res) {
	node.getBoardCameraViewDetails(req, res);
});

app.post('/board/listFiles', function(req, res) {
	node.listFiles(req, res);
});

app.post('/board/clearFiles', function(req, res) {
	node.clearFiles(req, res);
});

app.post('/board/clearFilesInAllCameras', function(req, res) {
	node.clearFilesInAllCameras(req, res);
});

app.post('/board/createVideoProfile', function(req, res) {
	node.createVideoProfile(req, res);
});

app.post('/board/modifyVideoProfile', function(req, res) {
	node.modifyVideoProfile(req, res);
});

app.post('/board/listVideoProfiles', function(req, res) {
	node.listVideoProfiles(req, res);
});

app.get('/board/listRecordServiceTypes', function(req, res) {
	node.listRecordServiceTypes(req, res);
});

app.post('/board/isVideoProfileValid', function(req, res) {
	node.isVideoProfileValid(req, res);
});

app.post('/board/deleteVideoProfile', function(req, res) {
	node.deleteVideoProfile(req, res);
});

app.post('/board/getVideoProfileDetails', function(req, res) {
	node.getVideoProfileDetails(req, res);
});

app.post('/board/startVideoRecording', function(req, res) {
	videomgr.startVideoRecording(req, res);
});

app.post('/board/startContinuousVideoRecording', function(req, res) {
	videomgr.startContinuousVideoRecording(req, res);
});

app.post('/board/stopVideoRecording', function(req, res) {
	videomgr.stopVideoRecording(req, res);
});

app.post('/board/isVideoRecordingInProgressInNode', function(req, res) {
	node.isVideoRecordingInProgressInNode(req, res);
});

//To allow the requests from browser directly
app.get('/board/listFiles', function(req, res) {
	node.listFiles(req, res);
});

app.get('/board/listFilesInPreview', function(req, res) {
	node.listFilesInPreview(req, res);
});

app.post('/board/getTotalFilesSizeInNode', function(req, res) {
	node.getTotalFilesSizeInNode(req, res);
});

app.post('/board/getTotalFilesSizeInBoard', function(req, res) {
	node.getTotalFilesSizeInBoard(req, res);
});


app.post('/board/removeScheduledVideoRecordRequest', function(req, res) {
	//videoRecordRequest.removeScheduledVideoRecordRequest(req, res);
	node.removeScheduledVideoRecordRequest(req, res);
});

app.get('/board/listScheduledServiceRequests', function(req, res) {
	node.listScheduledServiceRequests(req, res);
});

app.post('/board/getBoardStatus', function(req, res) {
	node.getBoardStatus(req, res);
});

app.get('/board/getUserSettingsData', function(req, res) {
	settings.getUserSettingsData(req, res);
});

app.get('/board/getUserSettingsPage', function(req, res) {
	settings.sendSettingsPage(req, res);
});

app.post('/board/updateUserSettings', function(req, res) {
	settings.updateUserSettings(req, res);
});

app.post('/board/addUser', function(req, res) {
	user.addUser(req, res);
});

app.get('/board/listActivities', function(req, res) {
	node.listActivities(req, res);
});

app.get('/board/clearActivities', function(req, res) {
	node.clearActivities(req, res);
});

app.get('/board/getBackupVideosSettingsPage', function(req, res) {
	backupsettings.sendBackupVideosSettingsPage(req, res);
});

app.post('/board/listUSBDevices', function(req, res) {
	backupsettings.listUSBDevices(req, res);
});

app.post('/board/backupVideosNow', function(req, res) {
	backupsettings.backupCameraFolderToUSBDevice(req, res);
});

app.get('/board/listBackupVideosStatus', function(req, res) {
	backupsettings.listBackupVideosStatus(req, res);
});


app.get('/board/listBackupVideosStatusResponse', function(req, res) {
	backupsettings.listBackupVideosStatusResponse(req, res);
});



app.get('/board/setDateTimeInBoard', function(req, res) {
	settings.updateDateTimeInfo(req, res);
});

app.post('/board/getCurrentScreeenshotFromCamera', function(req, res) {
	node.getCurrentScreenshotFromCamera(req, res);
});

app.post('/board/listUsers', function(req, res) {
	user.listUsers(req, res);
});

app.post('/board/createUser', function(req, res) {
	user.createUser(req, res);
});

app.post('/board/deleteUser', function(req, res) {
	user.deleteUser(req, res);
});

app.post('/board/getUser', function(req, res) {
	user.getUser(req, res);
});

app.post('/board/modifyUser', function(req, res) {
	user.modifyUser(req, res);
});

app.get('/board/proxy', function(req, res) {
	var urlData = req.body.url || req.query.url;
	var username = req.body.username || req.query.username;
	var password = req.body.username || req.query.password;
	//logger.debug('Handling proxy data for url:' + url);
	
	/*var proxy = http.request(url, function (res) {
		res.pipe(res, {
		  end: true
		});
	});

	  req.pipe(proxy, {
		end: true
	  });
	*/
	/*
	try {
		if(S(username).isEmpty()) {
			request.get(url).pipe(res);
		} else {
			request.get(url, {'auth': {
				'user': username,
				'pass': password,
				'sendImmediately': true
			}}).pipe(res);
		}
	} catch(err) {
		logger.debug('Error in proxy:' + err);
		res.send(404);
	}
	*/
	//res.send(404);
	
	var url_data = url.parse(urlData);
	var port = url_data.port;
	if(url_data.port == null) {
		port = 80;
	}
	try {
		var sock = new net.Socket();
		sock.setTimeout(500);
		sock.on('connect', function() {
			sock.destroy();
			if(S(username).isEmpty()) {
				request.get(showFilterDialogNew).pipe(res);
			} else {
				request.get(showFilterDialogNew, {'auth': {
					'user': username,
					'pass': password,
					'sendImmediately': true
				}}).pipe(res);
			}			
		}).on('error', function(e) {
			logger.info('URL:' + url + ' is Down...');
			//logger.info(url_data.hostname + ':' + url_data.port + ' is down: ' + e.message);
			res.send(404);
		}).on('timeout', function(e) {
			logger.info('URL:' + url + ' is timeout...');
			//logger.info(url_data.hostname + ':' + url_data.port +' is down: timeout');
			res.send(404);
		}).connect(port, url_data.hostname);
	} catch(err) {
		logger.info('Exception while checking the camera alive status. Error:' + err);
	}	
	
	
});
//
//Disable the following later.. After testing
if('development' == app.get('env')) {
	
	/*
	app.get('/board/authenticate', function(req, res) {
		user.authenticate(req, res);
	});
	
	app.get('/board/addNode', function(req, res) {
		node.addNode(req, res);
	});
	
	app.get('/board/listNodes', function(req, res) {
		node.listNodes(req, res);
	});
	
	app.get('/board/getNodeDetails', function(req, res) {
		node.getNodeDetails(req, res);
	});
	
	app.get('/board/modifyNode', function(req, res) {
		node.modifyNode(req, res);
	});

	app.get('/board/deleteNode', function(req, res) {
		node.deleteNode(req, res);
	});

	app.get('/board/clearFiles', function(req, res) {
		node.clearFiles(req, res);
	});
	
	app.get('/board/listVideoProfiles', function(req, res) {
		node.listVideoProfiles(req, res);
	});
	
	app.get('/board/isVideoProfileValid', function(req, res) {
		node.isVideoProfileValid(req, res);
	});

	app.get('/board/deleteVideoProfile', function(req, res) {
		node.deleteVideoProfile(req, res);
	});
	
	app.get('/board/getVideoProfileDetails', function(req, res) {
		node.getVideoProfileDetails(req, res);
	});

	app.get('/board/isVideoRecordingInProgressInNode', function(req, res) {
		node.isVideoRecordingInProgressInNode(req, res);
	});

	app.get('/board/startVideoRecording', function(req, res) {
		videomgr.startVideoRecording(req, res);
	});
	
	app.get('/board/stopVideoRecording', function(req, res) {
		videomgr.stopVideoRecording(req, res);
	});
	*/
} else {
	
	//disable root access for production
	app.get('/', function(req, res) {
		res.status(503);
		res.send('');
	});
}


checkAndStartTheServer = function(port) {
	if(! node.init()) {
		logger.error('Failed in initializing the board.');
		process.exit(1);
	}
	
	//check for backup job inprogress and if not update the status
	backup.checkForAnyBackupActivity();
	
	logger.debug('Checking port availability of:' + port);
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

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	logger.debug('Loading file:' + device_file);
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

notifyBoardStartNotification = function() {
	logger.info('Sending Board start notification...');
	if(constants.ENABLE_BOARD_START_STATUS_NOTIFICATION == 0) {
		logger.info('Board Start Alert notification is disabled.');
		return;
	}
	
	var device = getDevice();
	var response = JSON.parse(constants.JSON_RESPONSE);
	var notification_server_url = 'http://localhost:' + constants.SYSTEM_NOTIFICATION_SERVER_PORT + '/notify/handleRecordEvents';
	var dataToPost = 'board_name=' + device.name + '&board_model=' + device.model + '&option=board_start_notification';
	dataToPost += '&event_time=' + strftime('%F %T');
	logger.debug('The data to post is:' + dataToPost + ' to:' + notification_server_url);
	
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : notification_server_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish notification connection to Server. Error:' + e.message;
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				logger.info('Successfully sent the event to notification server on board start, response:' + util.inspect(results));
				return;
			} catch(ex) {
				logger.error('Exception occurred while sending the event to notification server for board start. Error:' + ex);
			}
		});	
}

startCameraAliveMonitor = function() {
	logger.info('Starting the Camera alive monitor..');
	videomgr.startCameraAliveMonitor();
	logger.debug('Started the camera alive monitor..');
}

startServer = function() {
	http.createServer(app).listen(app.get('port'), function(){
	  logger.info(app.get('APP_NAME') + ' server listening on port ' + app.get('port'));
	  startCameraAliveMonitor();
	  
	  setTimeout( function() {
		notifyBoardStartNotification();
	  }, constants.BOARD_START_NOTIFICATION_TIMEOUT_IN_SECONDS * 1000);
	});
}

logger.info('Starting: ' + app.get('APP_NAME'));
checkAndStartTheServer(app.get('port'));


