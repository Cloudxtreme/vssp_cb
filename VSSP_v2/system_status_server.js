
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , spawn = require('child_process').spawn
  , constants = require('./constants.js')
  , system = require('./system/system_status.js')
var app = express();

// all environments
app.set('port', process.env.SYSTEM_STATUS_SERVER_PORT || constants.SYSTEM_STATUS_SERVER_PORT)
app.use(express.favicon());
app.set('APP_NAME', constants.SYSTEM_STATUS_SERVER_NAME);
app.use(express.logger('dev'));
app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/tmp/' }));
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}


app.post('/systemnotification', function(req, res) {
	system.handleNodeResponse(req, res);
});

//

//Disable the following later.. After testing

	
	//disable root access for production
app.get('/', function(req, res) {
	res.status(503);
	res.send('');
});


http.createServer(app).listen(app.get('port'), function(){
  console.log(app.get('APP_NAME') + ' server listening on port ' + app.get('port'));
  console.log('Environment is:' + app.get('env'));
});
