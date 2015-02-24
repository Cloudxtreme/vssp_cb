var uuid = require('node-uuid');
var endOfLine = require('os').EOL
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var os = require('os');
var endOfLine = require('os').EOL
var fs = require('fs-extra');
var S = require('string');
var strftime = require('strftime');
var request = require('request');
var disk = require('diskspace');
var freeport = require('freeport');
var exec = require('child_process').exec;
var logger = require('./../logger/logger').logger;
//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var user = require('./user.js');
var shell = require('shelljs');
var url = require('url');
var moment = require('moment');


logEventInNodeHandler = function(req, msg) {
	var logData = strftime('%F %T') + ',' + user.getUserDetails(req) + ',';
	logData += msg + '\n';
	try {
		fs.appendFileSync(constants.SYSTEM_ACTIVITY_LOG_FILE, logData);
	} catch(err) {
	
	}
}

exports.init = function() {
	logger.debug('Initializing the nodes...');
	var store_folder = constants.VSSP_STORE_BASE_FOLDER;
	//logger.debug('Scanning the folder:' + store_folder + ' for any video record in-progress...');
	try {
		var stats = fs.statSync(store_folder);
		if(! stats.isDirectory()) {
			logger.error('Failed to scan for any in-progress tmp files. Store folder doesn\'t exist');
			return false;
		}
	} catch(err) {
		logger.error('Failed to scan for any in-progress tmp files. Error observed as:' + err.message);
		return false;
	}

	/*
	var files = fs.readdirSync(store_folder);
	files.forEach(function(file) { 
		
		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = store_folder + path.sep + file;
			
			try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}
				if(S(abs_file).endsWith(constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX)) {
					logger.debug('Video Record in-progress file:' + abs_file + ' is found. Cleaning it up now..');
					deleteFile(abs_file);
				}
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		} else {
			//logger.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}
	});
	*/
	
	var nodes = getNodes();
	
	nodes.forEach(function(node) {
		//logger.info('Checking for any previously record progress file for camera:' + node.node_name);
		var node_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
		var node_recorder_process_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + '_recorder' + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
		if(fs.existsSync(node_inprogress_file)) {
			logger.info('Deleting the previously record inprogress details...');
			var progress_details = getJsonObjectFromFile(node_inprogress_file);
			if(progress_details != null) {
				killInProgressVideoRecordProcess(progress_details);
			}
			
			deleteFile(node_inprogress_file);
			
			if(fs.existsSync(node_recorder_process_file)) {
				deleteFile(node_recorder_process_file);
			}
			
			//start the video record
			startVideoRecordingAtStart(node.node_name);
		}
	});
	
	return true;
}

killInProgressVideoRecordProcess = function(videoProgressDetails) {
	var pid = videoProgressDetails['pid'];
	if(pid) {
		logger.info('Killing previously recording process whose pid is:' + pid);
		try {
			process.kill(pid);
		} catch(err) {
			logger.info('Exception occurred while killing the process:' + pid + ', Err:' + err);
		}
	}
}

getNodes = function() {
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			node_list.push(node);
		} catch(err) {
		}
	});	 
	return node_list;
}

startVideoRecordingAtStart = function(camera_name) {

	var app_pgm = constants.START_VIDEO_RECORD_PGM + ' ' + camera_name;
	var p = exec(app_pgm, function(err, stdout, stderr) {
		if(err) {
			logger.error('Failed to start the video record of Camera:' + camera_name + ' at the start');
			return;
		}
		logger.info('StdOut:' + stdout);
		logger.info('StdErr:' + stderr);
	});
}

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
	logger.info('Stage#1');
	response.status = 'SUCCESS';
	var board_details = {};
	board_details['video_server_config'] = 'http://' + getMachineIPAddress() + ':' + constants.VIDEO_STREAMING_SERVER_PORT;
	board_details['admin_login_timeout'] = constants.ADMIN_LOGIN_TIMEOUT_SECONDS;
	board_details['mjpeg_img_refresh_in_ms'] = constants.MJPEG_REFRESH_RATE_IN_MS_AT_CLIENT;
	logger.info('Board details received');
	board_details['backup_videos_web_options'] = getJsonObjectFromFile(constants.BACKUP_VIDEOS_TO_WEB_CONFIG);
	response['board_details'] = board_details;
	logger.info('sending board details..');
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
	res.set( 'Content-Type', 'video/mp4');
	res.download(abs_file);
}

createFolder = function(parentFolder, folderName) {
	var result = false;
	var f = path.resolve(parentFolder + path.sep + folderName);
	logger.info('Creating folder New :' + f);
	try {
		var stat = fs.statSync(f);
		if(! stat.isDirectory()) {
			logger.info('Looks like the folder is not found. Creating it now..');
		//if(! fs.existsSync(f)) {
			fs.mkdirSync(f);
			result = true;
		} else {
			logger.info('Folder is found.');
			result = true;
		}
	} catch(err) {
		//logger.error(util.inspect(err));
		//logger.error('Exception while creating folder. Error:' + err);
	}
	//result = true;
	return result;
}

getNewNodeId = function() {
	
	var obj = getJsonObjectFromFile(constants.LAST_NODE_ID_CREATED);
	if(obj == null) {
		return -1;
	}
	var lastNodeId = obj['last_node_id'];
	var newNodeId = 1;
	if(lastNodeId) {
		newNodeId = parseInt(lastNodeId) + 1;
	} else {
		newNodeId++;
	}
	obj['last_node_id'] = newNodeId;
	try {
		fs.writeFileSync(constants.LAST_NODE_ID_CREATED, JSON.stringify(obj));
	} catch(err) {
	}
	return newNodeId;
}

createFolderStructureForNode = function(node_name) {
	var status = false;
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
	if(! createFolder(constants.VSSP_STORE_BASE_FOLDER, node_name)) {
		return status;
	}
	if(! createFolder(node_store_folder, constants.VIDEO_STORE_FOR_NODE)) {
		return status;
	}
	if(! createFolder(node_store_folder, constants.IMAGE_STORE_FOR_NODE)) {
		return status;
	}
	if(! createFolder(node_store_folder, constants.TMP_STORE_FOR_NODE)) {
		return status;
	}
	if(! createFolder(node_store_folder, constants.MJPEG_STORE_FOR_NODE)) {
		return status;
	}
	//
	var motion_tmp_folder = node_store_folder + path.sep + constants.MOTION_TEMP_FOLDER;
	if(! createFolder(node_store_folder, constants.MOTION_TEMP_FOLDER)) {
		return status;
	}
	if(! createFolder(motion_tmp_folder, constants.MOTION_TEMP_IMAGES_FOLDER)) {
		return status;
	}				
	var service_request_folder = node_store_folder + path.sep + constants.RECORD_SERVICE_REQUESTS_FOLDER;
	if(! createFolder(node_store_folder, constants.RECORD_SERVICE_REQUESTS_FOLDER)) {
		return status;
	}
	status = true;
	return status;
}

createPortForwardForCamera = function(node_id, node_url, key) {
	
	var port = -1;
	var local_port = node_id + constants.LOCAL_PORT_FORWARD_NUMBER;
	if(local_port == null) {
		logger.info("Failed to get the local port");
		return port;
	}
	
	var url_data = url.parse(node_url);
	var remote_port = url_data.port;
	if(url_data.port == null) {
		remote_port = 80;
	}
	var remote_host = url_data.hostname;
	if(S(remote_host).isEmpty()) {
		logger.info("Failed to get the remote host as it is found to be empty");
		return port;
	}
	var cmd = 'sudo /bin/bash ' + constants.ADD_PORTFORWARD_FOR_CAMERA_PGM + ' ' + local_port + ' ' + remote_host + ':' + remote_port + ' "' + key + '" ';
	logger.info('Executing command to add local port forward request with cmd:' + cmd);
	var exitCode = shell.exec(cmd).code;
	if(exitCode != 0) {
		logger.info('Failed to add the local port forward for the given url:' + node_url);
		return port;
	} else {
		logger.info('Sucessfully added the local port forward at port:' + local_port + ' to:' + remote_host + ':' + remote_port + ' with key:' + key);
	}
	port = local_port;
	return port;
}

deletePortForwardForCamera = function(key) {
	
	var status = false;
	var cmd = 'sudo /bin/bash ' + constants.REMOVE_PORTFORWARD_FOR_CAMERA_PGM + ' "' + key + '" ';
	logger.info('Executing command to remove local port forward request with cmd:' + cmd);
	var exitCode = shell.exec(cmd).code;
	if(exitCode != 0) {
		logger.info('Failed to remove the local port forward for the given Camera:' + key);
		return status;
	} else {
		logger.info('Sucessfully removed the local port forward with key:' + key);
	}
	status = true;
	return status;
}

getUpdatedNodeURL = function(ipAddress, port, node) {
	try {
	
		var username = node.node_username;
		var pwd = node.node_password;
		logger.info("Setting ip:" + ipAddress + " with port:" + port);
		var url_data = url.parse(node.node_url);
		var updated_url = url_data.protocol + '://';
		if(url_data.auth) {
			updated_url += url_data.auth + '@';
		} else {
			if(! S(username).isEmpty()) {
				updated_url += username + ':' + pwd + '@';
			}
		}
		updated_url += ipAddress + ':' + port;
		if(url_data.path) {
			updated_url += url_data.path;
		}
		if(url_data.hash) {
			updated_url += url_data.hash;
		}
		//url_data.hostname = ipAddress;
		//url_data.port = port;
		//logger.info('Updated host name is:' + url_data.hostname);
		//var updated_url = url.format(url_data);
		logger.info('The updated URL is:' + updated_url);
		return updated_url;
	} catch(err) {
		logger.info('Failed to update the url:' + err);
	}
	return null;
}

exports.addNode = function(req, res) {

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
	
	
	//var site_url = device.site_server + 'addNode';
	var user_id = userid;
	var board_id = device.id;
	var node_type = req.body.node_type || req.query.node_type;
	var node_port = req.body.node_port || req.query.node_port;
	var node_name = req.body.node_name || req.query.node_name;
	var node_location = req.body.node_location || req.query.node_location;
	var node_desc = req.body.node_desc || req.query.node_desc;
	var node_url = req.body.node_url || req.query.node_url;
	var video_recorder_type = req.body.video_recorder_type || req.query.video_recorder_type;
	var node_username = req.body.node_username || req.query.node_username;
	var node_password = req.body.node_password || req.query.node_password;
	var node_video_profile_id = req.body.node_video_profile_id || req.query.node_video_profile_id;
	var node_video_local_store = req.body.node_video_local_store || req.query.node_video_local_store;
	var node_model_id = req.body.node_model_id || req.query.node_model_id;
	
	if(S(node_name).contains(' ')) {
		response.error_info = 'Failed to add the node. Node name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	if(this.isNodePresent(node_name)) {
		response.error_info = 'Failed to add the node. Node:' + node_name + ' is already present';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 		
	
	var node = {};
	var node_id = getNewNodeId();
	node['node_id'] = node_id;
	node['user_id'] = user_id;;
	node['board_id'] = board_id;;
	node['node_type'] = node_type;;
	node['node_port'] = node_port;;
	node['node_name'] = node_name;;
	node['node_location'] = node_location;;
	node['node_desc'] = node_desc;;
	node['node_url'] = node_url;
	node['video_recorder_type'] = video_recorder_type;
	node['node_username'] = node_username;;
	node['node_password'] = node_password;;
	//node['node_video_profile_id'] = node_video_profile_id;;
	node['node_video_local_store'] = node_video_local_store;;
	node['node_model_id'] = node_model_id;
	
	//get the prfile details
	var profile_file = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + node_video_profile_id + constants.VSSP_PROFILE__FILE_EXTN;
    var vp = getJsonObjectFromFile(profile_file);
	if(vp == null) {
		response.error_info = 'Failed to add the node. Video Profile given:' + node_video_profile_id + ' doesnt exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	for(var k in vp) {
		node[k] = vp[k];
	}
	
	//get the executor details
	if(vp['record_using']) {
		
		var ve_file = constants.VSSP_VIDEO_EXECUTOR_BASE_FOLDER + path.sep + vp['record_using'] + constants.VSSP_VIDEO_EXECUTOR__FILE_EXTN;
		var ve = getJsonObjectFromFile(ve_file);
		if(ve == null) {
			response.error_info = 'Failed to add the node. Video Executor given for profile:' + node_video_profile_id + ' doesnt exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;		
		}
		for(var k in ve) {
			node[k] = ve[k];
		}
	} else {
		response.error_info = 'Failed to add the node. Video Record Executor is not defined in the given video profile:' + node_video_profile_id;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	var model_details =  getNodeModelDetails(node_model_id);
	if(model_details == null) {
		response.error_info = 'Failed to add the node. Failed to get the node model detail for the given model:' + node_model_id;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	for(var k in model_details) {
		node[k] = model_details[k];
	}

	/*
	var key = node.node_name
	var local_forward_port = createPortForwardForCamera(node_id, node.node_url, key);
	if(local_forward_port == -1) {
		response.error_info = 'Failed to add the node. Failed to add the local port forward request';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var ipAddress = getMachineIPAddress();
	node['local_forward_port'] = local_forward_port;
	node['local_ip_address'] = ipAddress;
	
	node['local_node_url'] = getUpdatedNodeURL(ipAddress, local_forward_port, node);
	*/
	try {
		var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
		fs.writeFileSync(node_store_file, JSON.stringify(node))
	} catch(err) {
		response.error_info = 'Failed to add the node. Failed to create the node file:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	if(! createFolderStructureForNode(node_name)) {
		logger.debug('Failed to create folder structyre for node:'  + node_name);
		response.error_info = 'Failed to add the node. Failed to create folder structyre for node:'  + node_name;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	logEventInNodeHandler(req, 'Camera:' + node_name + ' has been added successfully');
	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = node;
	res.json(200, response);
	logger.info(JSON.stringify(response));	
	
	/*
	data = 'user_id=' + user_id + '&board_id=' + board_id + '&node_type=' + node_type + '&node_port=' + node_port;
	data += '&node_name=' + node_name + '&node_location=' + node_location + '&node_desc=' + node_desc + '&node_url=' + node_url + '&node_username=' + node_username + '&node_password=' + node_password + '&node_video_profile_id=' + node_video_profile_id + '&node_video_local_store=' + node_video_local_store + '&node_model_id=' + node_model_id;

	logger.debug('Sending addNode request to server:' + site_url + ' with data:' + data);
	
	request.post({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while adding the node details to server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
			
			
			var node = s_response.result;
			//create the node video store folder 
			
			
			
	*/
			/*
			fs.mkdir(node_store_folder, function(e) {
				if(e && e.code === 'EEXIST') {
					//do something with contents
					logger.debug('Video store folder already exists for node:'  + node_name);
					response.error_info = 'Failed to add the node. Store for node:' + node_name + ' is already present';
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
				
				//create video folder / image folder
				var node_video_folder = node_store_folder + path.sep + constants.VIDEO_STORE_FOR_NODE;
				
				fs.mkdir(node_video_folder, function(e) {
					if(e && e.code === 'EEXIST') {
						//do something with contents
						logger.debug('Sub-Video store folder already exists for node:'  + node_name);
						response.error_info = 'Failed to add the node. Sub-Video Store for node:' + node_name + ' is already present';
						res.json(200, response);
						logger.error(JSON.stringify(response));
						return;
					}
					var node_img_folder = node_store_folder + path.sep + constants.IMAGE_STORE_FOR_NODE;
					fs.mkdir(node_img_folder, function(e) {
						if(e && e.code === 'EEXIST') {
							//do something with contents
							logger.debug('Sub-Video store folder already exists for node:'  + node_name);
							response.error_info = 'Failed to add the node. Sub-Video Store for node:' + node_name + ' is already present';
							res.json(200, response);
							logger.error(JSON.stringify(response));
							return;
						}
						var node_motion_tmp_folder = node_store_folder + path.sep + constants.MOTION_TEMP_FOLDER;
						fs.mkdir(node_motion_tmp_folder, function(e) {
						if(e && e.code === 'EEXIST') {
							//do something with contents
							logger.debug('Sub-Video store folder already exists for node:'  + node_name);
							response.error_info = 'Failed to add the node. Sub-Video Store for node:' + node_name + ' is already present';
							res.json(200, response);
							logger.error(JSON.stringify(response));
							return;
						}
						logger.debug('image store folder for node:' + node_name + ' has been created');
						var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
						fs.writeFileSync(node_store_file, JSON.stringify(node));
						
						response.status = 'SUCCESS';
						response.error_info = '';
						response.result = s_response.result;
						res.json(200, response);
						logger.info(JSON.stringify(response));
				});
			});
		});
	});	
	*/
	//});
}

function getNodeModelDetails(id) {
	var m = getJsonObjectFromFile(constants.CAMERA_MODELS);
	if(m == null) {
		return m;
	}
	var selectedModel = null;
	var mList = m['camera_models'];
	if(mList) {
		//logger.info('Checking the models..');
		mList.forEach(function(model) {
			//logger.info('Model:' + util.inspect(model));
			if(model['node_model_id'] == id) {
				selectedModel = model;
			}
		});
	}
	return selectedModel;
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
	return checkNodePresent(node_name);
}

checkNodePresent = function(node_name) {
	
	try {
		var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
		if (! fs.existsSync(node_store_file)) { // or fs.existsSync
			return false;
		}
		var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
		var stats = fs.statSync(node_store_folder);
		
		if(stats.isDirectory()) {
			return true;
		}
	} catch(err) {
	}
	return false;
}

createNodeIfNotExists = function(node) {
	
	logger.debug('Creating folder structure node:' + util.inspect(node));
	/*
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name;
	
	createFolder(constants.VSSP_STORE_BASE_FOLDER, node.node_name);
	createFolder(node_store_folder, constants.VIDEO_STORE_FOR_NODE);
	createFolder(node_store_folder, constants.IMAGE_STORE_FOR_NODE);
	createFolder(node_store_folder, constants.TMP_STORE_FOR_NODE);

	var motion_tmp_folder = node_store_folder + path.sep + constants.MOTION_TEMP_FOLDER;
	createFolder(node_store_folder, constants.MOTION_TEMP_FOLDER);
	createFolder(motion_tmp_folder, constants.MOTION_TEMP_IMAGES_FOLDER);
	
	var service_request_folder = node_store_folder + path.sep + constants.RECORD_SERVICE_REQUESTS_FOLDER;
	createFolder(node_store_folder, constants.RECORD_SERVICE_REQUESTS_FOLDER);
	*/
}

exports.listRootBoard = function(req, res) {
	
	var response = {};
	var device = getDevice();
	response.id = 'root';
	response.type = 'root';
	response.node_name = device.name;
	//response.node_name = 'List of Nodes';
	response.children = [];

	//res.setHeader('Access-Control-Allow-Origin', '*');
	var id = req.query.id;//device.id;
	if(S(id).isEmpty()) {
		logger.debug('The response for the root node is:' + util.inspect(response));
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	logger.info('Listing the nodes..');
	/*
	var userDetailsFromCookie = req.cookies[constants.COOKIE_VSSP_USER_NAME];
	if(S(userDetailsFromCookie).isEmpty()) {
		logger.debug('User session is found to be empty');
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	*/
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		//response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	/*
	var userDetails = userDetailsFromCookie.split(':');
	var userID = userDetails[0];
	var userName = userDetails[1];
	
	if(S(userID).isEmpty() || S(userName).isEmpty()) {
		logger.debug('Either user id or username might be found as null / empty in cookies');
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	*/
	
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			
			//createNodeIfNotExists(node);
			node['node_files_size'] = getNodeFilesSize(node.node_name);
			var video_record_progress = false;
			var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
			try {
				video_record_progress = fs.existsSync(runtime_inprogress_file);
			} catch(err) {
			}
			node['recording_inprogress'] = video_record_progress;
			response.children.push(node);

			/*
				//Look for video profile id and create if it doen't exists
			if(! createOrUpdateVideoProfileIdFromNode(node)) {
				logger.debug('Failed while creating the video profile details for node:' + node.node_name);
			}
			*/
		} catch(err) {
		}
	});		
	res.json(200, response);
	logger.info(JSON.stringify(response));	
	/*
	var site_url = device.site_server + 'listNodesFromBoard';
	
	var user_id = req.body.user_id || req.query.user_id;
	var board_id = device.id;
	var node_type = req.body.node_type || req.query.node_type;
	var node_port = req.body.node_port || req.query.node_port;

	data = 'user_id=' + user_id + '&board_id=' + board_id;

	logger.debug('Sending listNodesFromBoard request to server:' + site_url + ' with data:' + data);
	
	request.post({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while listing  the node details from server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			//logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
			logger.debug('No. of nodes found in the server rssponse:' + s_response.result.length);
			var node_list = [];
			var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
			
			s_response.result.forEach(function(row) {	
				try {
					
					createNodeIfNotExists(row);
					
					node_store_file = node_store_folder + path.sep + row.node_name + constants.NODE_DESC_FILE_EXTN;
					logger.debug('Store file:' + node_store_file);
					fs.writeFileSync(node_store_file, JSON.stringify(row));
					row['node_files_size'] = getNodeFilesSize(row.node_name);
					//var node = JSON.parse(contents);
					//node.children = [];
					response.children.push(row);
				} catch(err) {
				}
				
				//Look for video profile id and create if it doen't exists
				if(! createOrUpdateVideoProfileIdFromNode(row)) {
					logger.debug('Failed while creating the video profile details for node:' + row.node_name);
				}
			});
			//console.log('List Board response is:' + util.inspect(response));
			res.json(200, response);
			logger.info(JSON.stringify(response));
		});
	*/
}

getNodeFilesSize = function(node_name) {
	var totalSize = 0;
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
	try {
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			return totalSize;
		}
	} catch(err) {
		return totalSize;
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
				index++;
				totalSize += stats.size;
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		} 
	});
	return totalSize;	 
}

createOrUpdateVideoProfileIdFromNode = function(node) {
	try {
		logger.info('Input node:' + util.inspect(node));
		var profile_id = node.video_profile_id;
		var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_id + constants.VSSP_PROFILE__FILE_EXTN;
		
		var profile_details = {};
		profile_details['video_profile_id'] = node.video_profile_id;
		profile_details['video_profile_name'] = node.video_profile_name;
		profile_details['video_file_extension'] = node.video_file_extension;
		profile_details['video_length_duration_in_seconds'] = node.video_length_duration_in_seconds;		
		profile_details['video_width'] = node.video_width;
		profile_details['video_height'] = node.video_height;
		profile_details['video_frames_per_second'] = node.video_frames_per_second;
		profile_details['record_using'] = node.video_recorder_id;
		
		var video_executor_id = node.video_recorder_id;
		var video_executor_file_name = constants.VSSP_VIDEO_EXECUTOR_BASE_FOLDER + path.sep + video_executor_id + constants.VSSP_VIDEO_EXECUTOR__FILE_EXTN;
		
		video_executor = {};
		video_executor['name'] = node.video_recorder_name;
		video_executor['id'] = node.video_recorder_id;
		video_executor['executable'] = node.video_recorder_executable;
		
		if(node['video_recorder_executor_arguments']) {
			if(node['video_recorder_executor_arguments'] != null) {
				var video_recorder_args = node['video_recorder_executor_arguments'].split(',');
				video_executor['args'] = video_recorder_args;
			}
		} else {
			video_executor['args'] = [];
		}		
		fs.writeFileSync(video_executor_file_name, JSON.stringify(video_executor));

		fs.writeFileSync(profile_file_name, JSON.stringify(profile_details));
	} catch(err) {
		logger.error('Exception occurred while creating/updating video profile from node. Error:'  + err);
		return false;
	}
	return true;
}

createOrUpdateVideoProfileId = function(vp) {
	try {
		
		var profile_id = vp.video_profile_id;
		var profile_file_name = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + profile_id + constants.VSSP_PROFILE__FILE_EXTN;
		
		var profile_details = {};
		profile_details['video_profile_id'] = vp.video_profile_id;
		profile_details['video_profile_name'] = vp.video_profile_name;
		profile_details['video_file_extension'] = vp.video_file_extension;
		profile_details['video_length_duration_in_seconds'] = vp.video_length_duration_in_seconds;		
		profile_details['video_width'] = vp.video_width;
		profile_details['video_height'] = vp.video_height;
		profile_details['video_frames_per_second'] = vp.video_frames_per_second;
		profile_details['record_using'] = vp.video_recorder_id;
		
		var video_executor_id = vp.video_recorder_id;
		var video_executor_file_name = constants.VSSP_VIDEO_EXECUTOR_BASE_FOLDER + path.sep + video_executor_id + constants.VSSP_VIDEO_EXECUTOR__FILE_EXTN;
		
		video_executor = {};
		video_executor['name'] = vp.video_recorder_name;
		video_executor['id'] = vp.video_recorder_id;
		video_executor['executable'] = vp.video_recorder_executable;
		if(vp['video_recorder_executor_arguments']) {
			var video_recorder_args = vp.video_recorder_executor_arguments.split(',');
			video_executor['args'] = video_recorder_args;
		} else {
			video_executor['args'] = [];
		}
		fs.writeFileSync(video_executor_file_name, JSON.stringify(video_executor));

		fs.writeFileSync(profile_file_name, JSON.stringify(profile_details));
	} catch(err) {
		logger.error('exception occurred while creating the video profile. Error:' + err);
		return false;
	}
	return true;
}

exports.listNodes = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER
	
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			node_list.push(node.node_name);
		} catch(err) {
		}
	});	 
	
	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = node_list;
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

exports.getVideoTags = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device = getDevice();
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
	
	var response = {
		"status" : "FAIL",
		"identifier" : "video_tag_id",
		"label" : "video_tag_name",
		"error_info" : "",
		"items" : []
	};

	var obj = getJsonObjectFromFile(constants.VIDEO_TAG_LIST);
	if(obj == null) {
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	if(obj['video_tags']) {
		var videoTagList = obj['video_tags'];
		
		videoTagList.forEach(function(video_tag) {
			response.items.push(video_tag);
		});
	}
	
	response.status = 'SUCCESS';
	logger.debug('No. of video tags found:' + response.items.length);
	//console.log('Node Model response is:' + util.inspect(s_response));
	res.json(200, response);
	logger.info(JSON.stringify(response));
		
	/*
	var site_url = device.site_server + 'getVideoTags';
	logger.debug('Sending getVideoTags request to server:' + site_url);
	
	request.get({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url
		//body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while listing the video tag details from server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			//logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
			logger.debug('No. of video tags found:' + s_response.items.length);
			//console.log('Node Model response is:' + util.inspect(s_response));
			res.json(200, s_response);
			logger.info(JSON.stringify(s_response));
		});
	*/
}

exports.getNodeModels = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device = getDevice();
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
	
	var response = {
		"status" : "FAIL",
		"identifier" : "node_model_id",
		"label" : "node_model_name",
		"error_info" : "",
		"items" : []
	};
	
	var obj = getJsonObjectFromFile(constants.CAMERA_MODELS);
	if(obj == null) {
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	if(obj['camera_models']) {
		var cameraModelsList = obj['camera_models'];
		
		cameraModelsList.forEach(function(model) {
			response.items.push(model);
		});
	}	
	
	response.status = 'SUCCESS';
	
	logger.debug('No. of camera models found:' + response.items.length);
	//console.log('Node Model response is:' + util.inspect(s_response));
	res.json(200, response);
	logger.info(JSON.stringify(response));	
	
	/*
	var site_url = device.site_server + 'getNodeModels';
	logger.debug('Sending getNodeModels request to server:' + site_url);
	
	request.get({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url
		//body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while listing the node model details from server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			//logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
			logger.debug('No. of node models found:' + s_response.items.length);
			//console.log('Node Model response is:' + util.inspect(s_response));
			res.json(200, s_response);
			logger.info(JSON.stringify(s_response));
		});
	*/
}

exports.getVideoProfiles = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var device = getDevice();
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
	
	var response = {
		"status" : "FAIL",
		"identifier" : "video_profile_id",
		"label" : "video_profile_display_name",
		"error_info" : "",
		"items" : []
	};
	
	
	var vp_folder = constants.VSSP_PROFILE_STORE_BASE_FOLDER;
	var files = fs.readdirSync(vp_folder);
	files.filter(function(file) { 
		return S(file).right(constants.VSSP_PROFILE__FILE_EXTN.length) == constants.VSSP_PROFILE__FILE_EXTN; 
	}).forEach(function(file) { 
		
		console.log('reading the file:' + file);
		var contents = fs.readFileSync(vp_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var vp = JSON.parse(contents);
			if(vp['video_profile_id'] != undefined && vp['video_profile_name'] != undefined) {
				vp['video_profile_display_name'] = vp.video_profile_name + '_' + vp.video_file_extension + '_' + vp.video_frames_per_second + '_' + vp.video_width + 'X' + vp.video_height;
				response.items.push(vp);
				
			} 
		} catch(err) {
			//console.log('exeption:' + err);
		}
	});		

	response.status = 'SUCCESS';
	logger.debug('No. of video profiles found:' + response.items.length);
	//console.log('Node Model response is:' + util.inspect(s_response));
	res.json(200, response);
	logger.info(JSON.stringify(response));		
	
	/*
	var site_url = device.site_server + 'getVideoProfiles';
	logger.debug('Sending getVideoProfiles request to server:' + site_url);
	
	request.get({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url
		//body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while listing the video profile details from server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			var s_response = JSON.parse(body);
			
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
			logger.debug('No. of video profiles found:' + s_response.items.length);
			s_response.items.forEach(function(vp) {
				createOrUpdateVideoProfileId(vp);
			});
			//console.log('Video profile response is:' + util.inspect(s_response));
			res.json(200, s_response);
			logger.info('List of video profiles have been sent');
		});
	*/
}

exports.listRecordServiceTypes = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device = getDevice();
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
	
	var response = {
		"status" : "FAIL",
		"identifier" : "record_service_type_id",
		"label" : "record_service_type_name",
		"error_info" : "",
		"items" : []
	};
	
	var obj = getJsonObjectFromFile(constants.LIST_RECORD_SERVICE_TYPES);
	if(obj == null) {
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	if(obj['record_service_types']) {
		var record_list = obj['record_service_types'];
		
		record_list.forEach(function(service_type) {
			response.items.push(service_type);
		});
	}	
	response.status = 'SUCCESS';
	logger.debug('No. of record service type found:' + response.items.length);
	//console.log('Node Model response is:' + util.inspect(s_response));
	res.json(200, response);
	logger.info(JSON.stringify(response));	
	/*
	var site_url = device.site_server + 'listRecordServiceTypes';
	logger.debug('Sending listRecordServiceTypes request to server:' + site_url);
	
	request.get({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url
		//body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while listing the record services from server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			//logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
			logger.debug('No. of record services found:' + s_response.items.length);
			//console.log('Node Model response is:' + util.inspect(s_response));
			res.json(200, s_response);
			logger.info(JSON.stringify(s_response));
		});
	*/
}

exports.getNodeDetails = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	logger.debug('The session id from the request is:' + req);
	var userid = user.getUserDetails(req);
	logger.debug('THe userid in getNodeDetails:' + userid);
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

	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	var contents = fs.readFileSync(node_store_file);
	try {
		var node = JSON.parse(contents);
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = node;
		res.json(200, response);
		logger.info(JSON.stringify(response));
		return;
	} catch(err) {
		logger.error('Exception occurred while getting the node details. Error:' + err);
	}
	
	response.error_info = 'Failed to get the Node details for node:' + node_name;
	res.json(200, response);
	logger.error(JSON.stringify(response));
}

exports.modifyNode = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
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
		
	//	var site_url = device.site_server + 'modifyNode';
	
	var user_id = userid;
	var board_id = device.id;
	var node_id = req.body.node_id || req.query.node_id;
	var node_type = req.body.node_type || req.query.node_type;
	var node_port = req.body.node_port || req.query.node_port;
	var node_name = req.body.node_name || req.query.node_name;
	var node_location = req.body.node_location || req.query.node_location;
	var node_desc = req.body.node_desc || req.query.node_desc;
	var node_url = req.body.node_url || req.query.node_url;
	var video_recorder_type = req.body.video_recorder_type || req.query.video_recorder_type;
	var node_username = req.body.node_username || req.query.node_username;
	var node_password = req.body.node_password || req.query.node_password;
	var node_video_profile_id = req.body.node_video_profile_id || req.query.node_video_profile_id;
	var node_video_local_store = req.body.node_video_local_store || req.query.node_video_local_store;
	var node_model_id = req.body.node_model_id || req.query.node_model_id;
	
	if(S(node_name).contains(' ')) {
		response.error_info = 'Failed to modify the node. Node name cannot have spaces.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}		
	
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
	var stats = fs.statSync(node_store_folder);
	if(! stats.isDirectory()) {
		response.error_info = 'Failed to modify the node. Store for Node:' + node_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}		
		
	var node = {};
	node['node_id'] = node_id;
	node['user_id'] = user_id;;
	node['board_id'] = board_id;;
	node['node_type'] = node_type;;
	node['node_port'] = node_port;;
	node['node_name'] = node_name;;
	node['node_location'] = node_location;;
	node['node_desc'] = node_desc;;
	node['node_url'] = node_url;;
	node['video_recorder_type'] = video_recorder_type;
	node['node_username'] = node_username;;
	node['node_password'] = node_password;;
	//node['node_video_profile_id'] = node_video_profile_id;;
	node['node_video_local_store'] = node_video_local_store;;
	node['node_model_id'] = node_model_id;
	
	//get the prfile details
	var profile_file = constants.VSSP_PROFILE_STORE_BASE_FOLDER + path.sep + node_video_profile_id + constants.VSSP_PROFILE__FILE_EXTN;
    var vp = getJsonObjectFromFile(profile_file);
	if(vp == null) {
		response.error_info = 'Failed to add the node. Video Profile given:' + node_video_profile_id + ' doesnt exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	for(var k in vp) {
		node[k] = vp[k];
	}
	
	//get the executor details
	if(vp['record_using']) {
		
		var ve_file = constants.VSSP_VIDEO_EXECUTOR_BASE_FOLDER + path.sep + vp['record_using'] + constants.VSSP_VIDEO_EXECUTOR__FILE_EXTN;
		var ve = getJsonObjectFromFile(ve_file);
		if(ve == null) {
			response.error_info = 'Failed to modify the node. Video Executor given for profile:' + node_video_profile_id + ' doesnt exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;		
		}
		for(var k in ve) {
			node[k] = ve[k];
		}
	} else {
		response.error_info = 'Failed to modify the node. Video Record Executor is not defined in the given video profile:' + node_video_profile_id;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	var model_details =  getNodeModelDetails(node_model_id);
	if(model_details == null) {
		response.error_info = 'Failed to modify the node. Failed to get the node model detail for the given model:' + node_model_id;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	for(var k in model_details) {
		node[k] = model_details[k];
	}
	
	try {
		var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
		fs.writeFileSync(node_store_file, JSON.stringify(node))
	} catch(err) {
		response.error_info = 'Failed to modify the node. Failed to create the node file:' + err;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;		
	}
	
	logEventInNodeHandler(req, 'Camera:' + node_name + ' details have been modified successfully');

	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = node;
	res.json(200, response);
	logger.info(JSON.stringify(response));	

		/*
		data = 'user_id=' + user_id + '&board_id=' + board_id + '&node_type=' + node_type + '&node_port=' + node_port;
		data += '&node_name=' + node_name + '&node_location=' + node_location + '&node_desc=' + node_desc + '&node_url=' + node_url + '&node_username=' + node_username + '&node_password=' + node_password + '&node_video_profile_id=' + node_video_profile_id + '&node_video_local_store=' + node_video_local_store + '&node_model_id=' + node_model_id + '&node_id=' + node_id;

		logger.debug('Sending modifyNode request to server:' + site_url + ' with data:' + data);
		
		request.post({
			headers : {
				'content-type' : 'application/x-www-form-urlencoded'
			},
			url : site_url,
			body: data
			}, function(e, s_response, body) {
				
				if(e) {
					response.error_info = 'Error occurred while modifying the node details to server. Error:' + e.message;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;		
				}
				
				logger.debug('Server response is:' + body);
				var s_response = JSON.parse(body);
				
				if(s_response.status != 'SUCCESS') {
					response.error_info = s_response.error_info;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;				
				}
								
				var node = s_response.result;
				logger.debug('Video store folder for node:' + node_name + ' has been created');
				var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
				fs.writeFileSync(node_store_file, JSON.stringify(node));
				
				response.status = 'SUCCESS';
				response.error_info = '';
				response.result = s_response.result;
				res.json(200, response);
				logger.info(JSON.stringify(response));
			});
		*/
}

exports.deleteNode = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
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
	
	var user_id = req.body.user_id || req.query.user_id;
	var board_id = device.id;
	var node_id = req.body.node_id || req.query.node_id;
	var node_name = req.body.node_name || req.query.node_name;	
	
	try {
		var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			response.error_info = 'Failed to delete the node. Store for Node:' + node_name + ' doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
		
		var stats_file = fs.statSync(node_store_file);
		if(! stats_file.isFile()) {
			response.error_info = 'Failed to delete the node. Node Desc file for Node:' + node_name + ' doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		var node = getJsonObjectFromFile(node_store_file);
		if(node == null) {
			response.error_info = 'Failed to get the node details for deletion. Node:' + node_name + ' doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		/*
		if(! deletePortForwardForCamera(node_name)) {
			logger.info('Failed to delete the local port forward for the camera:' + node_name);
		}
		*/
		//Delete the file / folder now
		//fs.rmdirSync(node_store_folder);
		deleteFolderRecursive(node_store_folder);
		
		fs.unlinkSync(node_store_file);
		
		logEventInNodeHandler(req, 'Camera:' + node_name + ' has been deleted successfully');

		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = '';
		res.json(200, response);
		logger.info(JSON.stringify(response));
	} catch(err) {
		response.error_info = 'Failed to delete the node. Store for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	/*
	var site_url = device.site_server + 'deleteNode';

	var user_id = req.body.user_id || req.query.user_id;
	var board_id = device.id;
	var node_id = req.body.node_id || req.query.node_id;
	var node_name = req.body.node_name || req.query.node_name;
	data = 'user_id=' + user_id + '&board_id=' + board_id + '&node_name=' + node_name + '&node_id=' + node_id;

	logger.debug('Sending deleteNode request to server:' + site_url + ' with data:' + data);
	
	request.post({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while deleting the node details to server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;				
			}
							
			try {
					var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
					var stats = fs.statSync(node_store_folder);
					if(! stats.isDirectory()) {
						response.error_info = 'Failed to delete the node. Store for Node:' + node_name + ' doesn\'t exist';
						res.json(200, response);
						logger.error(JSON.stringify(response));
						return;
					}
					var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
					
					var stats_file = fs.statSync(node_store_file);
					if(! stats_file.isFile()) {
						response.error_info = 'Failed to delete the node. Node Desc file for Node:' + node_name + ' doesn\'t exist';
						res.json(200, response);
						logger.error(JSON.stringify(response));
						return;
					}
					
					//Delete the file / folder now
					//fs.rmdirSync(node_store_folder);
					deleteFolderRecursive(node_store_folder);
					
					fs.unlinkSync(node_store_file);
					response.status = 'SUCCESS';
					response.error_info = '';
					response.result = '';
					res.json(200, response);
					logger.info(JSON.stringify(response));
				} catch(err) {
					response.error_info = 'Failed to delete the node. Store for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
		});	
	*/
}

deleteFolderRecursive = function(folder) {

	if(fs.existsSync(folder)) {
		fs.readdirSync(folder).forEach(function(file) {
			
			var curPath = folder + path.sep + file;
			if(fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
	}
	fs.rmdirSync(folder);
}

exports.getBoardNodePaneDetails = function(req, res) {
	
	var node_id = req.query.node_id;
	if(S(node_id).isEmpty()) {
		res.send('');
		logger.error('Node id is found as null');
		return;
	}
	var data = fs.readFileSync(constants.BOARD_NODE_PANE_DETAILS_TEMPLATE);
	
	data = S(data).replaceAll('<!--REPLACE_NODE_ID-->', node_id).s;
	res.send(data);
}

exports.getBoardCameraViewDetails = function(req, res) {
	
	var node_id = req.query.node_id;
	if(S(node_id).isEmpty()) {
		res.send('');
		logger.error('Node id is found as null');
		return;
	}
	var data = fs.readFileSync(constants.BOARD_CAMERA_PANE_VIEW_DETAILS_TEMPLATE);
	
	data = S(data).replaceAll('<!--REPLACE_NODE_ID-->', node_id).s;
	res.send(data);
}

exports.getTotalFilesSizeInNode = function(req, res) {

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
	
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	if (! fs.existsSync(node_store_file)) { // or fs.existsSync
		response.error_info = 'Failed to list the files found under the node. Node:' + node_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var node = getJsonObjectFromFile(node_store_file);
	if(node == null) {
		response.error_info = 'Failed to list the files found under the node. Node:' + node_name + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.VIDEO_STORE_FOR_NODE	;
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
	var totalSize = 0;
	files.forEach(function(file) { 
		
		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_store_folder + path.sep + file;
			
			try {
				var stats = fs.statSync(abs_file);
				index++;
				totalSize += stats.size;
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		} 
	});
		 
	response.error_info = '';
	response.status = 'SUCCESS';
	response.result = totalSize;
	response['node_id'] = node.node_id;
	response['node_name'] = node.node_name;
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

getTotalFilesInBoard = function() {
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	var total_size = 0;
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			total_size += getNodeFilesSize(node.node_name);
		} catch(err) {
		}
	});	
	return total_size;
}

exports.getTotalFilesSizeInBoard = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	disk.check(constants.STORAGE_MEDIUM, function(total, free, status) {
		response.error_info = '';
		response.status = 'SUCCESS';
		var videoFilesSize = this.getTotalFilesInBoard();
		response.result = videoFilesSize;
		response['board_max_storage'] = free + videoFilesSize;
		res.json(200, response);	
		logger.info(JSON.stringify(response));
	});	
	
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
	var node_id = req.body.node_id || req.query.node_id;
	
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
	var totalSize = 0;

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
						totalSize += stats.size;
						var file_details = getJsonObjectFromFile(jsonFile);
						if(file_details != null) {
							file_details['id'] = index;
							//file_details['ctime'] = strftime('%F %T', stats.ctime);
							//console.log('File details:' + util.inspect(file_details));
							file_list.push(file_details);
						}
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
	file_list.sort(dynamicSort('timestamp'));
	var totalDuration = moment.duration(0);
	var index = 0;
	file_list.forEach(function(file) {
		var currentMoment = moment.duration(file['Duration']);
		//if(index == 0) {
			//totalDuration = currentMoment;
		//} else {
			totalDuration.add(currentMoment);
		//}
		
		index = index + 1;
	});
	
	var totalRecordDays = Math.floor(totalDuration.asMilliseconds()/(86400 * 1000));
	var totalRecordInMilliseconds = totalDuration.asMilliseconds() % (86400 * 1000)
	logger.info('Total record duration in millis:' + totalDuration.asMilliseconds());
	logger.info('Total record days:' + totalRecordDays + ', remaining millis:' + totalRecordInMilliseconds);
	response.error_info = '';
	response.status = 'SUCCESS';
	response.result = file_list;
	response['node_name'] = node_name;
	response['node_id'] = node_id;
	response['total_size'] = totalSize;
	var totalRecordInDay = moment.utc(totalRecordInMilliseconds);
	var recordDurationDisplay = totalRecordInDay.format("HH") + ' hours, ' + totalRecordInDay.format("mm") + ' mins, ' + totalRecordInDay.format("ss") + ' seconds';
	if(totalRecordDays > 0) {
		response['total_recorded_duration'] =  totalRecordDays + ' days, ' + recordDurationDisplay;
	} else {
		response['total_recorded_duration'] =  recordDurationDisplay;
	}
	res.json(200, response);
	//console.log('Response:' + util.inspect(file_list));
	//res.json(200, file_list);
	logger.info('No. of files sent:' + file_list.length);
	//logger.info('Files:' +  util.inspect(response));
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
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

exports.clearFilesInAllCameras = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER
	
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			node_list.push(node.node_name);
			logger.info('Added node:' + node.node_name + ' for deletion..');
		} catch(err) {
		}
	});	 
	logger.info('Total no. of nodes for deletion:' + node_list.length);
	var status = true;
	node_list.forEach(function(node) {
		
		var nodeBaseFolder =  constants.VSSP_STORE_BASE_FOLDER + path.sep + node;
		
		if(! deleteFolderContentsRecursively(nodeBaseFolder)) {
			status = false;
			response.error_info = 'Error occurred while cleaning the Camera:' + node + ', Try after sometime..';
			res.json(200, response);
			logger.info(JSON.stringify(response));
			return false;
		}
		
		/*
		var videoStore = nodeBaseFolder + path.sep + constants.VIDEO_STORE_FOR_NODE + path.sep;
		var imageStore = nodeBaseFolder + path.sep + constants.IMAGE_STORE_FOR_NODE + path.sep;
		var tmpFolder = nodeBaseFolder + path.sep + constants.TMP_STORE_FOR_NODE + path.sep;
		var serviceRequests = nodeBaseFolder + path.sep + constants.RECORD_SERVICE_REQUESTS_FOLDER + path.sep;
		var mjpegFolder = nodeBaseFolder + path.sep + constants.MJPEG_STORE_FOR_NODE + path.sep;

		var motionTmpImages = nodeBaseFolder + path.sep + constants.MOTION_TEMP_FOLDER + path.sep + constants.MOTION_TEMP_IMAGES_FOLDER + path.sep;;
		var motionTmp = nodeBaseFolder + path.sep + constants.MOTION_TEMP_FOLDER + path.sep;
		
		deleteFolderContents(videoStore);
		deleteFolderContents(imageStore);
		deleteFolderContents(tmpFolder);
		deleteFolderContents(serviceRequests);
		deleteFolderContents(motionTmpImages);
		deleteFolderContents(motionTmp);
		deleteFolderContentsRecursively(mjpegFolder);		//since it contains runtime tmp image folders
		*/
		createFolderStructureForNode(node);
		
	});
	if(! status) {
		response.error_info = 'Error occurred while cleaning the Camera. Try after sometime..';
		res.json(200, response);
		logger.info(JSON.stringify(response));
		return;
	}
	logEventInNodeHandler(req, 'Cleared all the files (video store) in all the cameras.');
	
	response.error_info = '';
	response.status = 'SUCCESS';
	response.result = 'Cleared the video store';
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

deleteFolderContentsRecursively = function(folder) {
	var status = false;
	var f = path.resolve(folder);
	logger.info('Cleaning up folder recursively:' + f);
	try {
		fs.removeSync(f);
		status = true;
	} catch(err) {
		logger.error('Exception while deleting the folder content recursively. Error:' + err.message);
	}
	return status;
}

deleteFolderContents = function(folder) {
	var f = path.resolve(folder);
	logger.info('Cleaning up folder:' + f);
	var p = exec('sudo rm -rf ' + f, function(err, stdout, stderr) {
		console.log('Cleaning up folder:' + folder + ' results: stdout:' + stdout + ', stderr:' + stderr);
	});
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
	var node_id = req.body.node_id || req.query.node_id;
	var selectedVideos = req.body.selected_videos || req.query.selected_videos;
	
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
	var noOfFilesDeleted = 0;
	try {
		var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.VIDEO_STORE_FOR_NODE;
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
				
				try {
					if(S(filePath).endsWith(constants.VIDEO_METADATA_FILE_EXTN)) {
						var videoObject = getJsonObjectFromFile(filePath);
						
						var fileTimestamp = videoObject['timestamp'];
						if(selectedVideos.indexOf(fileTimestamp) != -1) {
							deleteVideoObject(videoObject);
							noOfFilesDeleted++;
						}
					}
				} catch(err) {
				}
			}
		}
		
	} catch(err) {
		response.error_info = 'Failed to clear files under the camera. Store for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	logEventInNodeHandler(req, 'Camera:' + node_name + ' video files have been cleared successfully');
	
	response.error_info = '';
	response['node_id'] = node_id;
	response['node_name'] = node_name;
	response.status = 'SUCCESS';
	response.result = 'No. of files deleted:' + noOfFilesDeleted + ' under the camera:' + node_name + ' success';
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

deleteVideoObject = function(videoObject) {
	try {
		
		var node_name = videoObject.Node;
		var videoFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + videoObject.Path;
		var videoImageFile = constants.VSSP_STORE_BASE_FOLDER + path.sep + videoObject.Normal_Image;
		var jsonFile = videoFile.replace('.mp4', constants.VIDEO_METADATA_FILE_EXTN);
	
		logger.info('Deleting video file:' + videoFile);
		deleteFile(videoFile);
		logger.info('Video Image file:' + videoImageFile);
		deleteFile(videoImageFile);
		
		logger.info('MetaData file:' + jsonFile);
		deleteFile(jsonFile);
	} catch(err) {
	
	}
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
	var node_id = -1;
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	var contents = fs.readFileSync(node_store_file);
	try {
		var node = JSON.parse(contents);
		node_id = node.node_id;
	} catch(err) {

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
	response.node_name = node_name;
	response.node_id = node_id;
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
			logEventInNodeHandler(req, 'Detected Board IP address as:' + machineAddress);
			logger.debug('Machine IP address found as:' + machineAddress);
			return machineAddress;
		}
	}
	return machineAddress;
}

exports.getBoardStatus = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
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
	
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			
			if(checkNodePresent(node.node_name)) {
				node_list.push(node.node_name);
			}
		} catch(err) {
		}
	});	 
	
	var boardStatus = {};
	
	var node_details = [];
	node_list.forEach(function(node_name) {
		var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
		var contents = fs.readFileSync(node_store_file);
		try {
			var node = JSON.parse(contents);
			
			node['total_size']  = getNodeFilesSize(node_name);
			
			var videoRecordInProgress = false;
			var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
			try {
				videoRecordInProgress = fs.existsSync(runtime_inprogress_file);
			} catch(err) {
			}			
			node['video_recording_inprogress'] = videoRecordInProgress;
			
			node_details.push(node);
		} catch(err) {
		}	
	});
	
	var alertData = getJsonObjectFromFile(constants.ALERT_FILE);
	if(alertData != null) {
		boardStatus['alert'] = alertData;
	}
	boardStatus['cameras'] = node_details;
	response['result'] = boardStatus;
	response.status = 'SUCCESS';	 
	response.error_info = '';
	res.json(200, response);	
	//logger.info(JSON.stringify(response));		
}

exports.clearActivities = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	try {
		deleteFile(constants.SYSTEM_ACTIVITY_LOG_FILE);
		logEventInNodeHandler(req, 'Cleared the log details');
	} catch(err) {
		response.error_info = 'Error while removing the log entries. Err:' + err;
		res.json(response);
		return;
	}
	
	response.error_info = '';
	response.status = 'SUCCESS';
	response.result = 'Cleared the log details';
	
	res.json(response);
}

exports.listActivities = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}	

	var activity_list = [];
	var lines = fs.readFileSync(constants.SYSTEM_ACTIVITY_LOG_FILE).toString().split(endOfLine);
	
	var index = 1;
	lines.forEach(function(line) { 
		
		var tokens = line.split(',');
		var activity = {};
		activity['timestamp'] = tokens[0];
		activity['user'] = tokens[1];
		activity['details'] = tokens[2];
		activity['id'] = index;
		index++;
		
		activity_list.push(activity);
	});
	activity_list.sort(dynamicSort('-id'));
	response.error_info = '';
	response.status = 'SUCCESS';
	//response.result = activity_list;
	console.log('The no. of activities list:' + activity_list.length);
	res.json(200, activity_list);
}

exports.getCurrentScreenshotFromCamera = function(req, res) {
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
	
	var node_store_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.NODE_DESC_FILE_EXTN;
	var stats = fs.statSync(node_store_file);
	if(! stats.isFile()) {
		response.error_info = 'Failed in getting the node. Node specification is not found';		
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var node = getJsonObjectFromFile(node_store_file);
	if(node == null) {
		response.error_info = 'Failed in getting the node. Node specification object content is found as null';	
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var profile_name = node.video_profile_id;
	var vp = getVideoProfile(profile_name);
	if(vp == null) {
		error_info = error_info + ' Failed in getting the video profile';
		response.error_info = error_info;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var id = new Date().getTime();
	var camera_url = node.node_url; 
	var file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.TMP_STORE_FOR_NODE + path.sep + 'Image_' + id + '.jpg'
	var cmd = 'ffmpeg -i ' + camera_url + ' -ss 00:00:01 -s 640x480 -f image2 ' + file;
	
	var p = exec(cmd, function(err, stdout, stderr){
		logger.info('grabbing the image using cmd:' + cmd);
		/*
		if(err) {
			logger.error('Failed in grabbing the image from the camera. Error:' + err);
			return;
		}
		*/
		if(! fs.existsSync(file)) {
			response.error_info = 'Failed to grab the image from the camera:' + node_name;
			res.json(200, response);
			return;
		}
		
		file = S(file).replace(constants.VSSP_STORE_BASE_FOLDER, '').s;
		response.status = 'SUCCESS';
		response.result = file;
		response.error_info = '';
		res.json(200, response);
		logger.info('Successfully grabbed the screen..');
	});
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

getCameraById = function(id) {
	var node_list = [];
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER
	
	var files = fs.readdirSync(node_store_folder);
	files.filter(function(file) { 
		return S(file).right(constants.NODE_DESC_FILE_EXTN.length) == constants.NODE_DESC_FILE_EXTN; 
	}).forEach(function(file) { 
		
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(node_store_folder + path.sep + file);
		try {
			//console.log('contents:' + contents);
			var node = JSON.parse(contents);
			if(node.node_id == id) {
				node_list.push(node);
			}
		} catch(err) {
		}
	});

	return node_list[0];
}

exports.listScheduledServiceRequests = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var node_id = req.body.node_id || req.query.node_id;
	var node = getCameraById(node_id);
	
	if(node == null) {
		response.error_info = 'Node by id:' + node_id + ' doesn\'t exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var node_name = node.node_name;
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
	var node_service_requests_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.RECORD_SERVICE_REQUESTS_FOLDER;
	try {
		var stats = fs.statSync(node_service_requests_folder);
		if(! stats.isDirectory()) {
			response.error_info = 'Failed to list the service requests found under the node. Scheduled Requests for Node:' + node_name + ' doesn\'t exist';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
	} catch(err) {
		response.error_info = 'Failed to list the service requests found under the node. Scheduled Requests for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message;
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	logger.info('Listing the scheduled record from:' + node_service_requests_folder);
	var file_list = [];
	var files = fs.readdirSync(node_service_requests_folder);
	var index = 1;
	files.forEach(function(file) { 
		
		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_service_requests_folder + path.sep + file;
			
			try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}
				index++;
				var extn = path.extname(abs_file);
				if(extn == '.json') {
					
					if(fs.existsSync(abs_file)) {					
						var file_details = getJsonObjectFromFile(abs_file);
						if(file_details != null) {
							if('scheduled_video_record' in file_details && file_details['scheduled_video_record'] == true) {
								file_details['id'] = index;
								//file_details['ctime'] = strftime('%F %T', stats.ctime);
								//console.log('File details:' + util.inspect(file_details));
								file_list.push(file_details);
							}
						}
					} 
				}
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		} else {
			//logger.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}
	});
	//file_list.sort(dynamicSort('timestamp'));
	response.error_info = '';
	response.status = 'SUCCESS';
	response.result = file_list;
	response['node_name'] = node_name;
	response['node_id'] = node_id;
	res.json(200, file_list);
	//console.log('Response:' + util.inspect(file_list));
	//res.json(200, file_list);
	logger.info('No. of files sent:' + file_list.length);
	logger.info('Scheduled Record List:' +  file_list);
}

exports.removeScheduledVideoRecordRequest = function(req, res) {
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
	var node_id = req.body.node_id | req.query.node_id;
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
			
			//delete the scheduled video record request file
			removeScheduledVideoRecordRequestFile(node_id, videoBatchID);
			
			logger.debug('Looks like successfully removed the crontab');
			response.error_info = '';
			response.status = 'SUCCESS';
			response.result = '';
			response['node_id'] = node_id;
			res.json(200, response);
		}
	});
}

removeScheduledVideoRecordRequestFile = function(node_id, videoBatchId) {

	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER;
	var node = getCameraById(node_id);
	
	if(node == null) {
		logger.info('Failed to get the Camera by id:' + node_id);
		return;
	}
	
	var node_name = node.node_name;
	var node_service_requests_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + path.sep + constants.RECORD_SERVICE_REQUESTS_FOLDER;
	try {
		var stats = fs.statSync(node_service_requests_folder);
		if(! stats.isDirectory()) {
			logger.info('Failed to list the service requests found under the node. Scheduled Requests for Node:' + node_name + ' doesn\'t exist');
			return;
		}
	} catch(err) {
		return;
	}
	var files = fs.readdirSync(node_service_requests_folder);
	files.forEach(function(file) { 
		
		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_service_requests_folder + path.sep + file;
			try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}
				var extn = path.extname(abs_file);
				if(extn == '.json') {
					if(fs.existsSync(abs_file)) {					
						var file_details = getJsonObjectFromFile(abs_file);
						if(file_details != null) {
							if(file_details['videoBatchID'] == videoBatchId) {
							//file_details['ctime'] = strftime('%F %T', stats
								logger.info('Deleting the file:' + abs_file);
								try {
									deleteFile(abs_file);
								} catch(exc) {
								
								}
							}
						}
					} 
				}
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		} else {
			//logger.debug('Looks like the file:' + file + ' is hidden.. So, ignoring it..');
		}
	});
}
