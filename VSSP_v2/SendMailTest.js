var S = require('string');
var fs = require('fs');
var ts = require('timespan');
var util = require('util');
var path = require('path');
var nl = require('os').EOL;
var time_format = require('strftime');
//var logger = require('./board/logger/logger').logger;
var constants = require('./constants.js');
var path = require('path');
var mailer = require('./board/mailer/Mailer');

var locals = {
       email: 'saraav@gmail.com',
       subject: 'Password reset',
       name: 'Forgetful User',
       APPNAME: constants.APP_NAME,
       CAMERANAME: 'First camera',
       CAMERALOCATION: 'Front Door First floor',
       CAMERAEVENT: 'Recording Started',
	   VIDEOBATCHID: 'Test Batch ID',
       CAMERAEVENTTIME: time_format('%F %T')
};

mailer.sendMail('video_record_events', locals, function(err, response, html, text) {
	if(err) {
		console.log('Error while sending mail. Error:' + err);
		return;
	}
	
	console.log('Successfully send the mail. Response is:' + response);
	
		mailer.sendMail('camera_connection_lost', locals, function(err, response, html, text) {
		if(err) {
			console.log('Error while sending mail. Error:' + err);
			return;
		}
		
		console.log('Successfully send the mail. Response is:' + response);
	});
});


