
/**
 * Module dependencies.
 */

var fs = require('fs')
  , util = require('util')
  , path = require('path')
  , spawn = require('child_process').spawn
  , constants = require('./constants.js')
  , time_format = require('strftime');
var S = require('string'); 
var exec = require('child_process').exec;
var cmdLineServiceList = false;
var cmdLineArgsEnabled = false;

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

stopConfiguredServices  = function() {
	cmdLineServiceList = process.argv.slice(2);
	console.log('Cmdline args are:'  + cmdLineServiceList);
	cmdLineArgsEnabled = cmdLineServiceList.length > 0;
	
	console.log('Cmd line args enabled:' + cmdLineArgsEnabled);
	console.log('Looking for the services...from file:' + constants.BOARD_SERVICE_LIST);
	serviceList = getJsonObjectFromFile(constants.BOARD_SERVICE_LIST);
	if(serviceList == null) {
		console.log('Failed in loading the service list from file:' + constants.BOARD_SERVICE_LIST);
		return;
	}
	//console.log('The service list is:' + util.inspect(serviceList));
	listOfServices = serviceList.services;
	listOfServices.forEach(function(service) {
		if(cmdLineArgsEnabled) {
			if(isServicePresentInCmdLineArgs(service.name)) {
				//stopService(service);
				stopServiceByCmdLine(service);
			}
		} else {
			//stopService(service);
			stopServiceByCmdLine(service);
		}
	});
}

isServicePresentInCmdLineArgs = function(name) {
	var blnFound = false;
	cmdLineServiceList.every(function(item) {
		if(item === name) {
			blnFound = true;
			return false;
		}
	});
	return blnFound;
}

stopServiceByCmdLine = function(service) {
	console.log('Stopping the service:' + service.name);
	var cmdToListProcesses = 'ps -ef | grep node';
	var processList = exec(cmdToListProcesses, function(err, stdout, stderr) {
		var list = S(stdout).split('\n');
		list.every(function(item) {
			if(killProcessIfMatches(item, service)) {
				return false; //match found. terminate now
			} else {
				return true;
			}
		});
	});
}

killProcessIfMatches = function(line, service) {
	
	if(line.indexOf(service.executable) == -1) {
		//console.log('Service:' + service.name + ' not found');
		return false;
	}
	var list = line.split(" ");
	list.clean('');
	console.log('Found the matching process for:' + service.name + ' and its pid is:' + list[1]);
	//process.kill(list[1]);
	var killCmd = exec('sudo kill -9 ' + list[1], function(err, stdout, stderr) {
		if(err) {
			logger.info('Failed to kill the pid:' + list[1] + ', Error:' + err);
			return;
		}
		console.log('StdOut:' + stdout);
		console.log('StdErr:' + stderr);
	});	
	return true;
}

stopService = function(service) {
	console.log('Stopping the service:' + service.name);
	try {
		service_pid_file = getJsonObjectFromFile(__dirname + path.sep + service.name + '.pid');
		if(service_pid_file == null) {
			console.log('Service:' + service.name + ' is not running');
			return false;
		}
		var pid = service_pid_file.pid;
		console.log('Killing the process by pid:' + pid);
		process.kill(pid);
		console.log('Killed the process whose pid is:' + pid);
		
		//Remove the pid file
		fs.unlinkSync(__dirname + path.sep + service.name + '.pid');
		return true;
	} catch(err) {
		console.log('Failed to stop the service:' + service.name + ', Error:' + err);
	}
	return false;
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//console.log('reading the file:' + file);
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
			console.log('Exception occurred while parsing the file. Error:' + err);
		}
	} catch(err) {
		//console.log('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

stopConfiguredServices();



