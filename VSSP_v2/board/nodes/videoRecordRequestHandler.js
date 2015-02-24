var uuid = require('node-uuid');
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var os = require('os');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var strftime = require('strftime');
var request = require('request');
var exec = require('child_process').exec;
var logger = require('./../logger/logger').logger;

//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var user = require('./user.js')


deleteFile = function(file) {
	try {
		fs.unlinkSync(file);
	} catch(err) {
	
	}
}

exports.getBoardDetails = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 
	var device = getDevice();
	if(device == null) {
		response.error_info = 'The device details are null';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	response.status = 'SUCCESS';
	var board_details = {};
	board_details['video_server_config'] = 'http://' + getMachineIPAddress() + ':' + constants.VIDEO_STREAMING_SERVER_PORT;
	response['board_details'] = board_details;
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

exports.downloadFile = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 
	var device = getDevice();
	if(device == null) {
		response.error_info = 'The device details are null';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}	
	var file = req.body.file || req.query.file;
	var abs_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + file;
	logger.info('Downloading the content..');
	res.download(abs_file);
}

exports.removeScheduledVideoRecordRequest_OLD = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 

	var device = getDevice();
	if(device == null) {
		response.error_info = 'The device details are null';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var videoBatchID = req.body.video_batch_id || req.query.video_batch_id;
	var videoServiceRequestID = req.body.record_service_id || req.query.record_service_id;
	
	removeCronJobEntry(req, res, videoBatchID);
}

removeCronJobEntry = function(req, res, videoBatchID) {
	
	logger.debug('Removing the batch id:' + videoBatchID);
	var cronRemoveCmd = '( crontab -l | grep -v "' + videoBatchID + '";) | crontab -';
	var cronTabRemoveProcess = exec(cronRemoveCmd, function(err, stdout, stderr) {
		/*
		if(err) {
			logger.error('Failed in adding the scheduled cmd to cron tab. Error:' + err);
			return false;
		}
		logger.debug('Output:' + stdout);
		logger.debug('Error:' + stderr);
		return true;
		*/
		
		setTimeout(function() {
			logger.debug('Checking the scheduled command in the cron job list removed or not...');
			checkScheduledCmdInCronNotPresent(req, res, videoBatchID);
		}, 5000);
	});
}

function checkScheduledCmdInCronNotPresent(req, res, videoBatchID) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var cronAddCmd = 'crontab -l | grep ' + videoBatchID;
	logger.debug('Running cron tab cmd:' + cronAddCmd);
	var cronTabAddCmd = exec(cronAddCmd, function(err, stdout, stderr) {
	
		logger.debug('The response while checking the crontab on grepping the video batch id:' + videoBatchID + ' is:' + stdout.toString());
		logger.debug('The Err response while checking the crontab on grepping the video batch id:' + videoBatchID + ' is: Err' + err);
		logger.debug('The STDERR response while checking the crontab on grepping the video batch id:' + videoBatchID + ' is: stderr' + stderr);
		
		if(S(stdout).contains(videoBatchID)) {
			response.error_info = 'Failed in checking the removed video batch id from cron list as it is found. Failed to remove the video batch id:' + videoBatchID;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return false;
		}
		logger.debug('The response while checking the crontab on grepping the video batch id:' + videoBatchID + ' is:' + stdout.toString());
		if(! S(stdout).contains(videoBatchID)) {
			/*
			response.status = 'SUCCESS';
			response.error_info = '';
			response.result = false;
			res.json(200, response);
			logger.error(JSON.stringify(response));	
			*/
			logger.debug('Looks like successfully removed the crontab');
			sendVideoRecordRemoveResponseToServer(req, res, videoBatchID, 'Removed', 'Removed the video record request');
			return true;
		}
	});
}

function sendVideoRecordRemoveResponseToServer(req, res, videoBatchID, status, comments) {
	
	logger.debug('Sending the video record update status to server..');
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 

	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		logger.error('Device Configuration not found for sending the video record status to server.');
		return;
	}

	var board_id = device.id;
	var batch_id = videoBatchID;
	
	var dataToPost = 'batch_id=' + batch_id + '&board_id=' + board_id;
	dataToPost += '&record_service_status=' + status;
	dataToPost += '&comments=' + comments;
	
	logger.debug('The data to post at the end of recording is:' + dataToPost);
	
	var site_url = device.site_server + 'removeVideoRecordServiceOptions';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: dataToPost
		}, function(e, s_response, body) {
			
			if(e) {
				logger.error('Failed to establish connection to Server while removing the video record service. Error:' + e.message);
			} else {
				logger.debug('Server response after removing the cron tab list is:' + body);
				try {
					var results = JSON.parse(body);
					res.json(200, results);
					logger.info(JSON.stringify(results));					
				} catch(ex) {}
			}
		});
}

exports.listVideoRecordRequests = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 

	var device = getDevice();
	if(device == null) {
		response.error_info = 'The device details are null';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var site_url = device.site_server + 'listVideoRecordRequests';

	var user_id = req.body.user_id || req.query.user_id;
	var node_id = req.body.node_id || req.query.node_id;
	var node_name = req.body.node_name || req.query.node_name;
	var board_id = device.id;
	
	if(S(node_name).contains(' ')) {
		response.error_info = 'Failed to get the video record requests for the node. Node name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	data = 'user_id=' + user_id + '&board_id=' + board_id + '&node_id=' + node_id;

	logger.debug('Sending listVideoRecord request to server:' + site_url + ' with data:' + data);
	
	request.post({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while sending video record requests from server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			//logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			/*
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
			*/
			logger.info('No. of video record requests found:' + s_response.length);
			//console.log('Node Model response is:' + util.inspect(s_response));
			res.json(200, s_response);
			//logger.info(JSON.stringify(s_response));
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

exports.isNodePresent = function(node_name) {
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	if (fs.existsSync(node_store_file)) { // or fs.existsSync
    	return true;
	}
	return false;
}


exports.listFiles = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var node_name = req.body.node_name || req.query.node_name;
	
	if(S(node_name).contains(' ')) {
		response.error_info = 'Failed to list the files found under the node. Node name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	if(! this.isNodePresent(node_name)) {
		response.error_info = 'Failed to list the files found under the node. Node:' + node_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	try {
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			response.error_info = 'Failed to list the files found under the node. Store for Node:' + node_name + ' doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
	} catch(err) {
		response.error_info = 'Failed to list the files found under the node. Store for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var file_list = [];
	var files = fs.readdirSync(node_store_folder);
	var index = 1;
	files.forEach(function(file) { 
		
		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_store_folder + path.sep + file;
			
			try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}
				index++;
				var extn = path.extname(abs_file);
				if(extn == '.mp4') {
					
					//get the json file for the same video
					var jsonFile = path.dirname(abs_file) + path.sep + path.basename(abs_file, '.mp4') + constants.VIDEO_METADATA_FILE_EXTN;
					
					if(fs.existsSync(jsonFile)) {					
						var file_details = getJsonObjectFromFile(jsonFile);
						file_details['id'] = index;
						file_details['ctime'] = strftime('%F %T', stats.ctime);
						console.log('File details:' + util.inspect(file_details));
						file_list.push(file_details);
					} else {
						
						/*
						var file_details = {};
						file_details.id = index;
						file_details.Path = S(abs_file).replace(constants.VSSP_STORE_BASE_FOLDER, '').s;
						file_details.Path = S(file_details.Path).replaceAll('\\', '/').s;
						file_details.size = stats.size;
						file_details.atime = strftime('%F %T', stats.atime);
						file_details.mtime = strftime('%F %T', stats.mtime);
						file_details.ctime = strftime('%F %T', stats.ctime);

						file_list.push(file_details);
						*/
					}
				}
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		} else {
			//logger.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}
	});
		 
	//response.error_info = '';
	//response.status = 'SUCCESS';
	//response.result = file_list;
	//res.json(200, response);
	//console.log('Response:' + util.inspect(file_list));
	res.json(200, file_list);
	logger.info('No. of files sent:' + file_list.length);
}

exports.listFilesInPreview = function(req, res) {

	var serverDetails = req.connection.address();
	var serverAddressHttpScheme = 'http://' + serverDetails.address + ':' + serverDetails.port;
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var node_name = req.body.node_name || req.query.node_name;
	
	if(S(node_name).contains(' ')) {
		response.error_info = 'Failed to list the files found under the node. Node name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	if(! this.isNodePresent(node_name)) {
		response.error_info = 'Failed to list the files found under the node. Node:' + node_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	try {
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			response.error_info = 'Failed to list the files found under the node. Store for Node:' + node_name + ' doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
	} catch(err) {
		response.error_info = 'Failed to list the files found under the node. Store for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var imgPreviewResponse = { status: 'SUCCESS', identifier: 'id', label: 'Videos', items: []};
	
	var file_list = [];
	var files = fs.readdirSync(node_store_folder);
	var index = 1;
	files.forEach(function(file) { 
		
		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_store_folder + path.sep + file;
			
			try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}
				index++;
				var extn = path.extname(abs_file);
				if(extn == '.mp4') {
					
					//get the json file for the same video
					var jsonFile = path.dirname(abs_file) + path.sep + path.basename(abs_file, '.mp4') + constants.VIDEO_METADATA_FILE_EXTN;
					
					if(fs.existsSync(jsonFile)) {					
						var file_details = getJsonObjectFromFile(jsonFile);
						var videoPreview = {};
						videoPreview['id'] = index;
						videoPreview['thumb'] = serverAddressHttpScheme + file_details['Normal_Image'];
						videoPreview['large'] = serverAddressHttpScheme + file_details['Normal_Image'];
						videoPreview['title'] = file_details['Name'];
						videoPreview['ctime'] = strftime('%F %T', stats.ctime);
						videoPreview['majorBrand'] = file_details['majorBrand'];
						videoPreview['minorVersion'] = file_details['minorVersion'];
						videoPreview['compatibleBrands'] = file_details['compatibleBrands'];
						videoPreview['encoder'] = file_details['encoder'];
						videoPreview['comment'] = file_details['comment'];
						videoPreview['bitrate'] = file_details['bitrate'];
						videoPreview['Duration'] = file_details['Duration'];
						videoPreview['Path'] = file_details['Path'];
						videoPreview['Size'] = file_details['Size'];
						videoPreview['Name'] = file_details['Name'];
						videoPreview['Node'] = file_details['Node'];
						videoPreview['Board'] = file_details['Board'];
						
						//videoPreview.details = {};
						//videoPreview.details.Name = file_details['Name'];
						
						imgPreviewResponse.items.push(videoPreview);
					} else {
						
						/*
						var file_details = {};
						file_details.id = index;
						file_details.Path = S(abs_file).replace(constants.VSSP_STORE_BASE_FOLDER, '').s;
						file_details.Path = S(file_details.Path).replaceAll('\\', '/').s;
						file_details.size = stats.size;
						file_details.atime = strftime('%F %T', stats.atime);
						file_details.mtime = strftime('%F %T', stats.mtime);
						file_details.ctime = strftime('%F %T', stats.ctime);

						file_list.push(file_details);
						*/
					}
				}
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		} else {
			//logger.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}
	});
		 
	//response.error_info = '';
	//response.status = 'SUCCESS';
	//response.result = file_list;
	//res.json(200, response);
	//console.log('Response:' + util.inspect(imgPreviewResponse));
	res.json(200, imgPreviewResponse);
	//logger.info(JSON.stringify(imgPreviewResponse));
	logger.info('No. of files sent:' + imgPreviewResponse.items.length);
}

exports.clearFiles = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var node_name = req.body.node_name || req.query.node_name;
	
	if(S(node_name).contains(' ')) {
		response.error_info = 'Failed to clear files under the node. Node name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	if(! this.isNodePresent(node_name)) {
		response.error_info = 'Failed to clear files under the node. Node:' + node_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	try {
		var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			response.error_info = 'Failed to clear files under the node. Store for Node:' + node_name + ' doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}

		var files = fs.readdirSync(node_store_folder); 
		if (files.length > 0) {
			for (var i = 0; i < files.length; i++) {
				var filePath = node_store_folder + '/' + files[i];
				if (fs.statSync(filePath).isFile()) {
					fs.unlinkSync(filePath);
				}
			}
		}
	} catch(err) {
		response.error_info = 'Failed to clear files under the node. Store for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	response.error_info = '';
	response.status = 'SUCCESS';
	response.result = 'Clearing the files under the node:' + node_name + ' success';
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

exports.createVideoProfile = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//Profile name
	var profile_name = req.body.profile_name || req.query.profile_name;
	if(S(profile_name).contains(' ')) {
		response.error_info = 'Failed to create the video profile. Profile name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	if(S(req.files.profile_file_json.name).isEmpty()) {
		response.error_info = 'Failed to create the video profile. Profile data is not found.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
    if(fs.existsSync(profile_file_name)) {
		response.error_info = 'Failed to create the video profile. Profile name:' + profile_name + ' already exists';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
    }
    //verify the video profile as whether it is valid json or not
	var contents = fs.readFileSync(req.files.profile_file_json.path);
	try {
		obj = JSON.parse(contents);
	} catch(err) {
		response.error_info = 'Failed in creating the video profile:' + profile_name + '. Invalid JSON profile data, Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
    try {
		copyFile(req.files.profile_file_json.path, profile_file_name, function(err) {
			
			if(err) {
				response.error_info = 'Failed in creating the video profile:' + profile_name + ', Error:' + err;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;
			}
	
		    //delete the uploaded file created in tmp folder
		    fs.unlinkSync(req.files.profile_file_json.path);    
	
			response.status = 'SUCCESS';
			response.error_info = '';
			response.result = 'Video profile :' + profile_name + ' is uploaded successfully';
			res.json(200, response);
			logger.info(JSON.stringify(response));
			return;
	    });
	    
    } catch(err) {
		response.error_info = 'Failed in creating the video profile:' + profile_name + ', Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
}

exports.isVideoProfileValid = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//Profile name
	var profile_name = req.body.profile_name || req.query.profile_name;
	if(S(profile_name).contains(' ')) {
		response.error_info = 'Failed to validate the video profile. Profile name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
    if(! fs.existsSync(profile_file_name)) {
		response.error_info = 'Failed to validate the video profile. Profile name:' + profile_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
    }
    
	var stats = fs.statSync(profile_file_name);
	if(stats.isFile() && stats.size > 0) {
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = true;
		res.json(200, response);
		logger.info(JSON.stringify(response));
	} else {
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = false;
		res.json(200, response);
		logger.info(JSON.stringify(response));
	}
}

exports.listVideoProfiles = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	//constants.VSSP_PROFILE__FILE_EXTN
	var profile_folder = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep;
	try {
		var stats = fs.statSync(profile_folder);
		if(! stats.isDirectory()) {
			response.error_info = 'Failed to list the video profiles found under the node. Video profile store doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
	} catch(err) {
		response.error_info = 'Failed to list the video profiles found under the node. Video Profile Store would n\'t be found. Error observed as:' + err.message;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var file_list = [];
	var files = fs.readdirSync(profile_folder);
	files.forEach(function(file) { 
		var abs_file = profile_folder + path.sep + file;
		
		try {
			var stats = fs.statSync(abs_file);
			
			var file_details = {};
			file_details.path = abs_file;
			file_details.size = stats.size;
			file_details.atime = stats.atime;
			file_details.mtime = stats.mtime;
			file_details.ctime = stats.ctime;
			
			//file_list.push(node_store_folder + path.sep + file);
			file_list.push(file_details);
		} catch(err) { }
	});
		 
	response.status = 'SUCCESS';	 
	response.error_info = '';
	response.result = file_list;
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

exports.deleteVideoProfile = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var profile_name = req.body.profile_name || req.query.profile_name;
	if(S(profile_name).contains(' ')) {
		response.error_info = 'Failed to delete the video profile. Video Profile name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
    if(! fs.existsSync(profile_file_name)) {
		response.error_info = 'Failed to delete the video profile. Video Profile name:' + profile_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
    }
    
	var stats = fs.statSync(profile_file_name);
	if(! (stats.isFile() && stats.size > 0)) {
		response.error_info = 'Video profile :' + profile_name + ' is not Valid. Either it is not a file or size of zero';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//Check whether the profile is used by some node or not
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	var profile_used = 0;
	var files = fs.readdirSync(node_store_folder);
	var node_desc_files = [];
	for (var i = 0; i < files.length; i++) {
		if(S(files[i]).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN) {
			node_desc_files.push(files[i]);
		}
	}

	for(var i = 0; i < node_desc_files.length; i++) {
	
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + node_desc_files[i]);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			if(node.node_video_profile == profile_name) {
				response.error_info = 'Video profile :' + profile_name + ' is used in node:' + node.node_name  + ', Cannot delete the video profile';
				res.json(200, response);
				logger.info(JSON.stringify(response));
				profile_used = 1;
				return false;
			}
		} catch(err) {
			response.error_info = 'Failed to delete the video profile:' + profile_name + ', Error:' + err;
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return false;	
		}
		if(profile_used == 1) {
			return false;
		}
	}
	
	if(profile_used == 0) {
		//Good to go n delete it now
		//delete the video profile
		fs.unlinkSync(profile_file_name);    
	
		response.status = 'SUCCESS';	 
		response.error_info = '';
		response.result = 'Successfully deleted the Video profile :' + profile_name;
		res.json(200, response);
		logger.info(JSON.stringify(response));
	}
}

exports.modifyVideoProfile = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	//Profile name
	var profile_name = req.body.profile_name || req.query.profile_name;
	if(S(profile_name).contains(' ')) {
		response.error_info = 'Failed to modify the video profile. Profile name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	if(S(req.files.profile_file_json.name).isEmpty()) {
		response.error_info = 'Failed to modify the video profile. Profile data is not found.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
    if(! fs.existsSync(profile_file_name)) {
		response.error_info = 'Failed to modify the video profile. Profile name:' + profile_name + ' doesn\'t exist.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
    }

    try {
		copyFile(req.files.profile_file_json.path, profile_file_name, function(err) {
			
			if(err) {
				response.error_info = 'Failed in modifying the video profile:' + profile_name + ', Error:' + err;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;
			}
	
		    //delete the uploaded file created in tmp folder
		    fs.unlinkSync(req.files.profile_file_json.path);    
	
			response.status = 'SUCCESS';	 
			response.error_info = '';
			response.result = 'Video profile :' + profile_name + ' is modified successfully';
			res.json(200, response);
			logger.info(JSON.stringify(response));
	    });
	    
    } catch(err) {
		response.error_info = 'Failed in modifying the video profile:' + profile_name + ', Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
}

exports.getVideoProfileDetails = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//Profile name
	var profile_name = req.body.profile_name || req.query.profile_name;
	if(S(profile_name).contains(' ')) {
		response.error_info = 'Failed to get details of the video profile. Profile name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}

	var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_name + constants.VSSP_PROFILE__FILE_EXTN;
    if(! fs.existsSync(profile_file_name)) {
		response.error_info = 'Failed to get details of the video profile. Profile name:' + profile_name + ' doesn\'t exist.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
    }

	var contents = fs.readFileSync(profile_file_name);
	try {
		var node = JSON.parse(contents);
		response.status = 'SUCCESS';	 
		response.error_info = '';
		response.result = node;
		res.json(200, response);
		logger.info(JSON.stringify(response));
		return;
	} catch(err) {
	}
	
	response.error_info = 'Failed to get the Video profile details for profile:' + profile_name;
	res.json(200, response);
	logger.error(JSON.stringify(response));
}

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (! cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

exports.isVideoRecordingInProgressInNode = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	
	var node_name = req.body.node_name || req.query.node_name;
	if(! this.isNodePresent(node_name)) {
		response.error_info = 'Node:' + node_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	if(S(node_name).isEmpty() || S(node_name).contains(' ')) {
		response.error_info = 'Failed to check as either node name is empty or contains spaces';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//check video record progress
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		status = fs.existsSync(runtime_inprogress_file);
	} catch(err) {
		response.error_info = 'Failed while checking for the runtime indicator file for recording. Error:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	response.status = 'SUCCESS';	 
	response.error_info = '';
	response.result = status;
	res.json(200, response);	
	logger.info(JSON.stringify(response));
}

getMachineIPAddress = function() {
	var machineAddress = '';
	var ifaces = os.networkInterfaces();
	for (var dev in ifaces) {
	  var alias=0;
	  ifaces[dev].forEach(function(details){
		if (details.family=='IPv4') {
			if(! details.internal) {
				console.log(dev+(alias?':'+alias:''),details.address);
				machineAddress  = details.address;
				return false;
			}
		  ++alias;
		}
	  });
	  if(! S(machineAddress).isEmpty()) {
		  logger.debug('Machine IP address found as:' + machineAddress);
		  return machineAddress;
	  }
	}
	return machineAddress;
}