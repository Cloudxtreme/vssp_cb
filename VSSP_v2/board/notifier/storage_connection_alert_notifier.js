var S = require('string');
var fs = require('fs');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
//var execSync = require("exec-sync");
//var sh = require('execSync');

var path = require('path');
var http = require('http');
var time_format = require('strftime');
var url = require('url');
var util = require('util');
var request = require('request');
var disk = require('diskspace');
var constants = require(__dirname + '/../../constants.js');
var logger = require('./../logger/logger').alertLogger;


var serverConnectionFailureCount = 0;

/*
process.on('SIGHUP', function() {
	console.log('Signal SIGHUP message has been received');
});
process.on('SIGINT', function() {
	console.log('Signal SIGINT message has been received');
});
process.on('SIGTERM', function() {
	console.log('Signal SIGTERM message has been received');
});


process.on('SIGKILL', function() {
	console.log('Signal SIGKILL message has been received');
});
*/

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//console.log('Loading file:' + device_file);
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

createFile = function(file, data) {
	try {
		//logger.info('Creating file:' + file);
		fs.writeFileSync(file, data);
		return true;
	} catch(err) {
		logger.error('Failed in creating the temp inprogress file. Err:' + err);
	}
	return false;
}

checkForAnyRunningScheduler = function() {
	var file = constants.SCHEDULER_RUN_INPROGRESS;
	logger.debug('Checking for any previous scheduler run...using file:' +  file);
	return fs.existsSync(file);
}

getNodeList = function() {
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

cleanUpEnvironment = function() {
	try {
		fs.unlinkSync(constants.SCHEDULER_RUN_INPROGRESS);
	} catch(err) {
	
	}
}

checkAndRaiseStorageAlert = function() {
	
	disk.check(constants.STORAGE_MEDIUM, function(total, free, status) {
	
		var alertData = getJsonObjectFromFile(constants.ALERT_FILE);
		if(alertData == null) {
			alertData = {};
		}
	
		var used_size = total - free;	
		max_storage = total; //device.max_storage_size;
		
		if((max_storage * constants.STORAGE_MEDIUM_ALERT_PERCENTAGE) <= used_size) {
			logger.error('Storage has reached the max. configured value. Current storage has reached ' + (constants.STORAGE_MEDIUM_ALERT_PERCENTAGE * 100) + '% of max. storage capacity in Board. Recording has been stopped in Board.');
			var storageAlert = {};
			storageAlert['type'] = 'medium';
			storageAlert['current_size'] = used_size;
			storageAlert['max_storage'] = max_storage;
			storageAlert['desc'] = 'Current storage has reached ' + (constants.STORAGE_MEDIUM_ALERT_PERCENTAGE * 100) + '% of max. storage capacity in Board. Recording has been stopped in Board.';
			if(storageAlert != null) {
				alertData[constants.STORAGE_ALERT_KEY] = storageAlert;
			} else {
				if(alertData[constants.STORAGE_ALERT_KEY]) {
					delete alertData[constants.STORAGE_ALERT_KEY];
				}
			}	
			try {
				fs.writeFileSync(constants.ALERT_FILE, JSON.stringify(alertData));
			} catch(err) {
				logger.error('Failed in creating alert...' + err);
			}
		} else {
		
			//remove the alert key and store it back
			if(alertData[constants.STORAGE_ALERT_KEY]) {
				delete alertData[constants.STORAGE_ALERT_KEY];
			}
			try {
				fs.writeFileSync(constants.ALERT_FILE, JSON.stringify(alertData));
			} catch(err) {
				logger.error('Failed in creating alert...' + err);
			}
			//logger.debug('Used space in the board has NOT reached the max. threshold storage.');
		}
	
	});
	
	return null;
}

raiseServerConnectionAlert = function() {
	request(constants.GET_EXTERNAL_IP_ADDRESS_SITE, function(e, res, body) {
			var deviceIP = getExternalIpAddress(body);
			var alertData = getJsonObjectFromFile(constants.ALERT_FILE);
			if(alertData == null) {
				alertData = {};
			}
			if(S(deviceIP).isEmpty()) {
				
				serverConnectionFailureCount++;
				
				if(serverConnectionFailureCount >= 5) {
					var serverConnectionAlert = {};
					serverConnectionAlert['type'] = 'high';
					serverConnectionAlert['desc'] = 'Failed to establish the connection to server. Check internet connection...';
					alertData[constants.SERVER_CONNECTION_ALERT_KEY] = serverConnectionAlert;
				}
			} else {
				serverConnectionFailureCount = 0;
				if(alertData[constants.SERVER_CONNECTION_ALERT_KEY]) {
					delete alertData[constants.SERVER_CONNECTION_ALERT_KEY];
				}
			}
			
			try {
					fs.writeFileSync(constants.ALERT_FILE, JSON.stringify(alertData));
				} catch(err) {
					logger.error('Failed in creating alert...' + err);
				}			
		});
}

function getExternalIpAddress(data_from_site) {
	if(S(data_from_site).isEmpty()) {
		return '';
	}
	var data = S(data_from_site).between('Current IP Address: ', '</body>').s
	data = S(data).trim().s
	return data; //sendGetRequest('http://checkip.dyndns.org/');
}

checkAndUpdateFileStorageConnectionAlerts = function() {
	//logger.debug('Checking for any storage issues.. now..');
	var alertData = getJsonObjectFromFile(constants.ALERT_FILE);
	if(alertData == null) {
		alertData = {};
	}
	
	checkAndRaiseStorageAlert();
	//raiseServerConnectionAlert();
}

logger.debug('Running the Storage/Connection Alert notifier in the interval of:' + constants.STORAGE_CHECK_INTERVAL_IN_SECONDS + ' seconds');
var interval = constants.STORAGE_CHECK_INTERVAL_IN_SECONDS * 1000;

setInterval(function() {
	
	/*
	var nodeList = getNodeList();
	if(nodeList.length <= 0) {
		logger.error('Failed to run the meta-data scheduler as no. of nodes found as:' + nodeList.length);
		process.exit(1);
	}
	createFile(constants.SCHEDULER_RUN_INPROGRESS, 'Scheduler in-progress');
	nodeList.forEach(function(node) {
		logger.debug('Starting the scheduler for node:' + node.node_name);
		scanAndCreateMetaDataForVideos(node);
	});
	*/
		checkAndUpdateFileStorageConnectionAlerts();
	}, interval);



process.on('exit', function(exitCode, signal) {
	console.log('Process exit code:%d, Signal:%d', exitCode, signal);
});




