var uuid = require('node-uuid');
var spawn = require('child_process').spawn;
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var freeport = require('freeport');
var http = require('http');
var request = require('request');
//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
//var stringutils = require(__dirname + '/../../utils/stringutils.js');
var time_format = require('strftime');

exports.error_info='';

var timer;

function notifySystemStatusNow(url) {
	if(S(url).isEmpty()) {
		console.log('Notify server url for system status is found as null / empty');
		return;
	}
}

function notifyNodeStatusNow(url) {
	if(S(url).isEmpty()) {
		console.log('Notify server url for node status is found as null / empty');
		return;
	}
}

function sendGetRequest(url) {

	try {
		request(url, function(e, res, body) {
			console.log('Response is:' + body);
			return body;
		});
	} catch(err) {
	}
}

function startNotification() {
	var device = getDevice();
	if(device == null) {
		console.log('The device details are null');
		return status;
	}
	
	var notification_interval = device.notification_interval_in_seconds;
	if(! S(notification_interval).isNumeric()) {
		console.log('Failed as notification interval:' + notification_period_in_seconds + ' is found as invalid/not a numeric value. Terminating the notifier');
		process.exit(1);
	}
	
	
	//convert to milliseconds
	var interval = notification_interval * 1000;
	console.log("Notification interval is:" + interval + " ms.");
	request(constants.GET_EXTERNAL_IP_ADDRESS_SITE, function(e, res, body) {
			console.log('Response is:' + body);
			device.ip = getExternalIpAddress(body);
			timer = setInterval(function() {
				sendSystemNotification(device);
			}, interval);		
			console.log("Started the notification...for every:" + notification_interval + " seconds");
		});
}

function sendSystemNotification (device) {
	var status = getSystemStatusNow(device);
	var system_server_url = device.system_notification_server;
	if(S(system_server_url).isEmpty()) {
		console.log("Failed to notify to system status as the server url is found as null / empty");
		return;
	}
	console.log('Posting:' + status);
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url: system_server_url,
		body: 'node_response=' + status
		}, function(e, res, body) {
			console.log('System server Response is:' + body);
		});
}

function getSystemStatusNow(device) {
	var status = '';
	
	var result  = {};

	result.id = device.id;
	result.model = device.model;
	result.ip = device.ip;
	result.name = device.name;
	
	result.nodes = getAllNodeDetails();

	result.notification_time = time_format('%y-%m-%d %H:%M:%S')

	status = JSON.stringify(result);
	
	return status;
}

function getExternalIpAddress(data_from_site) {
	if(S(data_from_site).isEmpty()) {
		return '__FAILED__';
	}
	var data = S(data_from_site).between('Current IP Address: ', '</body>').s
	data = S(data).trim().s
	return data; //sendGetRequest('http://checkip.dyndns.org/');
}

function getAllNodeDetails() {

	var node_list = {};
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
			
			var node_details = getNodeStatus(node.node_name);
			if(node_details != null) {
				node_details.id = node.id;
				node_list[node.node_name] = node_details;
			}
		} catch(err) {
		}
	});	 
	
	return node_list;
}


function getNodeStatus(node_name) {
	if(S(node_name).isEmpty()) {
		return null;
	}
	
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
	try {
		var stats = fs.statSync(node_store_folder);
		if(! stats.isDirectory()) {
			console.log('Failed to list the files found under the node. Store for Node:' + node_name + ' doesn\'t exist');		
			return null;
		}
	} catch(err) {
		console.log('Failed to list the files found under the node. Store for Node:' + node_name + ' would n\'t be found. Error observed as:' + err.message);		
		return null;
	}
	
	var node = {};
	var total_size = 0;
	var file_count = 0;
	var files = fs.readdirSync(node_store_folder);
	files.forEach(function(file) { 
		var abs_file = node_store_folder + path.sep + file;
		
		try {
			var stats = fs.statSync(abs_file);
			total_size += stats.size;
			file_count++;
		} catch(err) { }
	});
	node.size = total_size;
	node.no_of_files = file_count;
	node.recording_in_progress = isRecordingInProgressInNode(node_name);
	return node;
}

function isRecordingInProgressInNode(node_name) {
	var status = false;
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	try {
		status = fs.existsSync(runtime_inprogress_file);
	} catch(err) {
	}
	return status;
}

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	console.log('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		console.log('reading the file:' + file_name);
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
			console.log('Exception occurred while parsing the json object. Error:' + err);
		}
	} catch(err) {
		console.log('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}




exports.startVideoRecording = function(node, vp, duration, port) {

	var status = false;

	console.log('Node URL:' + node.node_url);
	console.log('Record length for single file:' + vp.single_video_length_in_secs);
	console.log('Record using executable:' + vp.record_using);
	console.log('Video output extension:' + vp.video_file_extn);
	var exec_option=vp.record_using;
	console.log('Plug-in cmdline options:' + vp[vp.record_using].args);
	
	
	//node recorder.js node1 7001 4 2 ffmpeg http://10.203.38.90/video $CUR_FOLDER mp4
	//node constants.RECORD_JS_SCRIPT node.node_name, 
	console.log('port found as:' + port);
	var args = [];
	args.push(constants.RECORD_JS_SCRIPT);
	args.push(node.node_name);
	args.push(port);
	args.push(duration);
	args.push(vp.single_video_length_in_secs);
	args.push(vp.record_using);
	args.push(node.node_url);
	args.push(constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name);
	args.push(vp.video_file_extn);
	
	var plugin_cmd_line_args = vp[vp.record_using].args;
	for(var i = 0; i < plugin_cmd_line_args.length; i++) {
		args.push(plugin_cmd_line_args[i]);
	}
	
	console.log('Launching the recording process with args:' + args);
	record_handler_process = spawn('node', args, { stdio: 'inherit' });
	status = true;
	console.log('Started the video recording successfully');
	return status;	
}


exports.stopVideoRecording = function(req, res, node, vp) {

	var status = false;
	
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node.node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	var node_inprogress_object = getJsonObjectFromFile(runtime_inprogress_file);
	if(node_inprogress_object == null) {
		error_info = 'Failed in getting the node record inprogress details from runtime file for node:' + node.node_name;
		res.status(401);
		res.send(error_info);
		return;
	}
	
	//get port; and pid of the process;
	var controller_port = node_inprogress_object.record_controller_port;
	var pid = node_inprogress_object.pid;
	console.log('Controller port:' + controller_port);
	console.log('The PID is:' + pid);
	
	try {
		//send the signal and wait for exit response from recorder object; constants.VIDEO_RECORD_STOP_RESPONSE
		var requestOptions = {
			host : 'localhost',
			port : controller_port,
			path : constants.VIDEO_RECORD_CONTROLLER_STOP_SIGNAL,
		};
	
		var responseData = '';
		var req = http.request(requestOptions, function(response) {
		
			response.on('data', function(chunk) {
				responseData += chunk;
			});
		
			response.on('end', function() {
				console.log('Response is received as:' + responseData);
				if(S(responseData).isEmpty()) {
				
					/*
					res.status(401);
					res.send('Failed in stopping the video record at node:' + node.node_name);
					return;
					*/
					killChildProcess(req, res, node.node_name, pid, false);
				} else {
				
					if(S(responseData).trim() == constants.VIDEO_RECORD_STOP_RESPONSE) {
						/*
						res.status(200);
						res.send('Successfully stopped the video recording at node:' + node.node_name);
						return;
						*/
						killChildProcess(req, res, node.node_name, pid, true);

					} else {
				
						/*
						res.status(401);
						res.send('Failed in stopping the video record at node:' + node.node_name);
						return;	
						*/
						killChildProcess(req, res, node.node_name, pid, false);								
					}
				}
			});
		});
	
		req.end();
		console.log('Stop signal has been sent...');
	} catch(err) {
	
		error_info = 'Failed in sending the video stop signal to node:' + node.node_name + ", probably video recording would have been killed. Cleanup the environment now.";
		cleanRecordEnvironment(node.node_name);
		res.status(200);
		res.send(error_info);
		return;
	}
}

function cleanRecordEnvironment(node_name) {
	var runtime_inprogress_file = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name + constants.RECORD_INPROGRESS_STORE_FILE_SUFFIX;
	
	if(fs.existsSync(runtime_inprogress_file)) {
		//Delete this file now
		try {
			fs.unlinkSync(runtime_inprogress_file);
		} catch(err) { }
	}
	console.log('Cleaned up the record environment for node:' + node_name);
}

function killChildProcess(req, res, node_name, pid, success) {


	var kill_process = spawn('kill', [-9, pid], {stdio : 'inherit'});
	kill_process.on('exit', function(exitCode, signal) {
		console.log('Killing child process exited with code:%d', exitCode);
	});
	/*
	if(kill_process && (! success)) {	//on failure
		kill_process.stdout.on('data', function(data) {
			console.log('Killing child process output:' + data);
		});
	
		kill_process.stderr.on('data', function(data) {
			console.log('Killing child process error:' + data);
		});
	}
	*/
	if(success) {
		res.status(200);
		res.send('Successfully stopped the video recording at node:' + node_name);
		return;
	} else {
		res.status(401);
		res.send('Failed in stopping the video record at node:' + node_name);
		return;				
	
	}
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
		console.log('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

startNotification();
