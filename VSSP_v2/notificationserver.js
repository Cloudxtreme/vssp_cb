
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
  , eventnotifier = require('./board/notifier/event_notifier_handler.js')
  , node = require('./board/nodes/nodehandler.js')
  , videoRecordRequest = require('./board/nodes/videoRecordRequestHandler.js') 
  , videomgr = require('.//board/nodes/recordmanager.js')
  , settings = require('./board/settings/settings.js') 
  , portchecker = require('portscanner')
  , logger = require('./board/logger/logger').notificationServerLogger;

var app = express();

// all environments
app.set('port', process.env.PORT || constants.SYSTEM_NOTIFICATION_SERVER_PORT)
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.set('APP_NAME', constants.SYSTEM_NOTIFICATION_SERVER_NAME);
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
	if(S(pathInfo).startsWith('/js/')) {
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
	logger.debug(logData);
}

//app.use(allowCrossDomain);
//app.use(express.logger('dev'));

app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());

//app.use(passport.initialize());
//app.use(passport.session());
app.use(app.router);

app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public/board_htmls')));
//app.use(express.static(path.join(__dirname, 'store')));
app.use(express.static(constants.VSSP_STORE_BASE_FOLDER));


app.post('/notify/handleRecordEvents', function(req, res) {
	eventnotifier.handleEvent(req, res);
});


//disable root access for production
app.get('/', function(req, res) {
	res.status(503);
	res.send('');
});


checkAndStartTheServer = function(port) {

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

startServer = function() {
	http.createServer(app).listen(app.get('port'), function(){
	  logger.info(app.get('APP_NAME') + ' server listening on port ' + app.get('port'));
	});
}

logger.info('Starting: ' + app.get('APP_NAME'));
checkAndStartTheServer(app.get('port'));


