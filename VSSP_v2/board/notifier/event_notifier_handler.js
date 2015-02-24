var uuid = require('node-uuid');
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var endOfLine = require('os').EOL
var exec = require('child_process').exec;
var fs = require('fs');
var S = require('string');
var time_format = require('strftime');
var freeport = require('freeport');
var portchecker = require('portscanner');
//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var nodehandler = require(__dirname + '/../nodes/nodehandler.js');

var mailer = require('./../mailer/Mailer');

var logger = require('./../logger/logger').notificationServerLogger;
var request = require('request');

exports.error_info='';
var recordRequestFile = '';

exports.handleEvent = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);

	//videoBatchID=' + videoBatchID + '&node_name=' + node.node_name + '&option=' + option
	
	var videoBatchID = req.body.videoBatchID || req.query.videoBatchID;
	var node_name = req.body.node_name || req.query.node_name;
	var option = req.body.option || req.query.option;
	var cameraLostTime = req.body.camera_lost_time || req.query.camera_lost_time;
	var board_name = req.body.board_name || req.query.board_name;
	var board_model = req.body.board_model || req.query.board_model;
	var board_event_time = req.body.event_time || req.query.event_time;
	
	logger.info('Notification request received is:' + videoBatchID + ', ' + node_name + ',' + option + ', camera lost time:' + cameraLostTime + ', Board Name:' + board_name + ', board model:' + board_model + ', Time:' + board_event_time);

	if(S(option).isEmpty()) {
		response.error_info = 'Mandatory notification parameter option is missing';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	if(S(videoBatchID).isEmpty()) {
		videoBatchID = '';
	}
	
	if(option == 'board_start_notification') {
		sendBoardStartNotification(res, board_name, board_model, board_event_time);
		return;
	}
	
	try {
		
		var node = getNode(node_name);
		if(node == null) {
			response.error_info = 'Failed to get the node details for the node:' + node_name;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		//logger.info('Sending alert notification for node:' + node.node_name + ' new api');
		if(option === 'video_start_event' || option === 'video_stop_event') {
			sendNotification(res, node, videoBatchID, option);		
		} else if(option === 'connection_to_camera_lost') {
			sendCameraLostNotification(res, node, cameraLostTime);
		}
	} catch(err) {
		response.error_info = 'Failed while sending the email alert to client. Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
}

//

sendBoardStartNotification = function(res, board_name, board_model, board_event_time) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	//logger.info('Sending alert notification 1 of:' + option);
	
	
	var data = {
		email: constants.USER_EMAIL_LIST,
		APPNAME: constants.APP_NAME,
		subject : constants.EVENT_BOARD_START + ' - ' + board_name,
		BOARDNAME : board_name,
		BOARDSTARTEVENT : constants.EVENT_BOARD_START,
		BOARDSTARTTIME : board_event_time,
		BOARDMODEL : board_model
	};
	

	mailer.sendMail('board_start_notification', data, function(err, response, html, text) {
		if(err) {
			console.log('Error while sending mail. Error:' + err);
			return;
		}
		logger.info('Successfully sent the mail notification on board start.');
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = 'Successfully sent the board start event';
		res.json(200, response);
		logger.info(JSON.stringify(response));
	});
}

sendCameraLostNotification = function(res, node, cameraLostTime) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	//logger.info('Sending alert notification 1 of:' + option);
	
	if(S(cameraLostTime).isEmpty()) {
		cameraLostTime = '';
	}
	
	var data = {
		email: constants.USER_EMAIL_LIST,
		APPNAME: constants.APP_NAME,
		CAMERANAME: node.node_name,
		CAMERALOCATION: node.node_location,
		CAMERASIGNALLOSTTIME: cameraLostTime,
		subject : constants.EVENT_NAME_CAMERA_CONN_LOST + node.node_name,
		CAMERAEVENT : constants.EVENT_NAME_CAMERA_CONN_LOST
	};
	

	mailer.sendMail('camera_connection_lost', data, function(err, response, html, text) {
		if(err) {
			console.log('Error while sending mail. Error:' + err);
			return;
		}
		logger.info('Successfully sent the mail notification on camera lost.');
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = 'Successfully sent the camera lost notification';
		res.json(200, response);
		logger.info(JSON.stringify(response));
	});
}

sendNotification = function(res, node, videoBatchID, option) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	//logger.info('Sending alert notification 1 of:' + option);
	
	
	
	var data = {
       email: constants.USER_EMAIL_LIST,
       APPNAME: constants.APP_NAME,
       CAMERANAME: node.node_name,
       CAMERALOCATION: node.node_location,
       VIDEOBATCHID : videoBatchID,
       CAMERAEVENTTIME: time_format('%F %T')
	};
	
	var emailTemplate = 'video_record_events';
	//logger.info('Sending alert notification 2 of:' + option);
	if(option === 'video_start_event') {
		data['subject'] = constants.RECORD_START_SUBJECT + ' - '  + videoBatchID;
		data['CAMERAEVENT'] = constants.EVENT_NAME_RECORD_START;
	} else if(option === 'video_stop_event') {
		data['subject'] = constants.RECORD_STOP_SUBJECT + ' - '  + videoBatchID;
		data['CAMERAEVENT'] = constants.EVENT_NAME_RECORD_STOP;
	} else if(option === 'connection_to_camera_lost') {
		data['subject'] = constants.EVENT_NAME_CAMERA_CONN_LOST + ' - Camera:'  + node.node_name;
		data['CAMERAEVENT'] = constants.EVENT_NAME_CAMERA_CONN_LOST;
		emailTemplate = 'camera_connection_lost';
	}
	//logger.info('Sending alert notification of event:' + util.inspect(data));
	
	
	
	mailer.sendMail(emailTemplate, data, function(err, response, html, text) {
		if(err) {
			console.log('Error while sending mail. Error:' + err);
			return;
		}
		logger.info('Successfully sent the mail notification.');
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = 'Successfully sent the notification';
		res.json(200, response);
		logger.info(JSON.stringify(response));
	});
}


function getNode(node_name) {
	var node = null;
	if(S(node_name).isEmpty() || S(node_name).contains(' ')) {
		error_info = 'Failed in getting the node. Node name could be null / cannot have spaces.';
		logger.debug(error_info);
		return node;		
	}

	if(! nodehandler.isNodePresent(node_name)) {
		error_info = 'Failed in getting the node. Node:' + node_name + ' doesn not present';		
		logger.debug(error_info);
		return node;
	}
	
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	var stats = fs.statSync(node_store_file);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the node. Node specification is not found';		
		logger.debug(error_info);
		return node;
	}

	var node = getJsonObjectFromFile(node_store_file);
	if(node == null) {
		error_info = 'Failed in getting the node. Node specification object content is found as null';	
		logger.debug(error_info);
		return node;
	}
	logger.debug('Successfully got the node for:' + node_name);	
	return node;
}

function getVideoProfile(profile_name) {
	
	var vp = null;
	if(S(profile_name).isEmpty() || S(profile_name).contains(' ')) {
		error_info = 'Failed in getting the Video Profile. Profile Name found as null / cannot have spaces.';
		logger.debug(error_info);
		return vp;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
	var stats = fs.statSync(profile_file_name);
	if(! stats.isFile()) {
		error_info = 'Failed in getting the Video Profile. Video profile:' + profile_name + ' is not found';		
		logger.debug(error_info);
		return vp;
	}

	vp = getJsonObjectFromFile(profile_file_name);
	if(vp == null) {
		error_info = 'Failed in getting the Video Profile. Video Profile content is found as null';		
		logger.debug(error_info);
		return vp;
	}	
	logger.debug('Successfully got the video profile for:' + profile_name);	
	return vp;
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
		}
	} catch(err) {
		logger.error('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

