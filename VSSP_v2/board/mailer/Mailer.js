var S = require('string');
var fs = require('fs');
var ts = require('timespan');
var util = require('util');
var path = require('path');
var nl = require('os').EOL;
var time_format = require('strftime');
//var logger = require('./../logger/logger').logger;
var constants = require(__dirname + '/../../constants.js');
var nodemailer = require('nodemailer');
var path = require('path');
var templatesDir = path.resolve(__dirname, '..',  '..', 'system_files/email_templates');
var emailTemplates = require('email-templates');

console.log('Template dir is:' + templatesDir);
var EmailAddressRequiredError = new Error('email address required');

// create a defaultTransport using gmail and authentication that are
// storeed in the `config.js` file.
var defaultTransport = nodemailer.createTransport('SMTP', {
	service: 'Gmail',
	auth: {
		user: constants.email_server_config.server_credentials.user,
		pass: constants.email_server_config.server_credentials.pass
	}
});


exports.sendMail = function(templateName, locals, fn) {
	if(! locals.email) {
		return fn(EmailAddressRequiredError);
	}
	if(! locals.subject) {
		return fn(EmailAddressRequiredError);
	}
	
	emailTemplates(templatesDir, function(err, template) {
		
		if(err) {
			return fn(err);
		}
		template(templateName, locals, function(err, html, text) {
			
			if(err) {
				return fn(err);
			}
			
			var transport = defaultTransport;
			
			transport.sendMail( {
				from: constants.email_server_config.defaultFromAddress,
				to: locals.email,
				subject: locals.subject,
				html: html,
				text: text
			}, function(err, responseStatus) {
				if(err) {
					return fn(err);
				}
				return fn(null, responseStatus.message, html, text);
			});
		});
	});
}