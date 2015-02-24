
/**
 * Module dependencies.
 */

var fs = require('fs')
  , util = require('util')
  , path = require('path')
  , spawn = require('child_process').spawn
  , constants = require('./constants.js')
  , time_format = require('strftime');
  
var exec = require('child_process').exec;
var cmdLineServiceList = false;

var cmdLineArgsEnabled = false;

var noOfServicesEnabled = 0;
var currentServiceIndex = 0;

startConfiguredServices  = function() {
	console.log('Cmdline args length is:'  + process.argv.length);
	cmdLineServiceList = process.argv.slice(2);
	console.log('Cmdline args are:'  + cmdLineServiceList);
	cmdLineArgsEnabled = cmdLineServiceList.length > 0;
	console.log('Cmd line args enabled:' + cmdLineArgsEnabled);
	//if(process.argv.length
	console.log('Configuring the services...from file:' + constants.BOARD_SERVICE_LIST);
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
				noOfServicesEnabled = noOfServicesEnabled + 1;
			}
		} else {
			
			if(service.enabled == 0) {
				return false;
			} else {
				noOfServicesEnabled = noOfServicesEnabled + 1;
			}
		}
	});
	
	listOfServices.forEach(function(service) {
		
		if(cmdLineArgsEnabled) {
			if(isServicePresentInCmdLineArgs(service.name)) {
				stopStartService(service);
			}
		} else {
			
			if(service.enabled == 0) {
				console.log('Service:' + service.name + ' is not enabled');
				return false;
			} else {
				stopStartService(service);
			}
		}
	});
	
	console.log('Initiated all the services launch option..');
	setInterval(function() {
		checkAndTerminateCurrentProcess();
	}, 1000);
}

checkAndTerminateCurrentProcess = function() {
	console.log('Checking the service list start: Total service enabled:' + noOfServicesEnabled + ', No. of services started:' + currentServiceIndex);
	if(noOfServicesEnabled <= currentServiceIndex) {
		console.log('Looks like all the services configured are launched.');
		
		setTimeout(function() {
			process.exit(0);
		}, 2000);
	}
}

isServicePresentInCmdLineArgs = function(name) {
	var blnFound = false;
	cmdLineServiceList.every(function(item) {
		if(item === name) {
			blnFound = true;
			return false;
		} else {
			return true;
		}
	});
	return blnFound;
}

startService = function(service) {
	console.log('Starting the service:' + service.name);
	/*
	var service_pid_file = __dirname + path.sep + service.name + constants.SERVICE_INPROGRESS_EXTN;
	if(fs.existsSync(service_pid_file)) {
		console.log('Failed to start the service:' + service.name + ' as already that service has been started / running');
		return false;
	}
	*/
	var executable = service.executable;
	if(! fs.existsSync(executable)) {
		executable = __dirname + path.sep + executable;
	}
	if(! fs.existsSync(executable)) {
		console.log('Executable:' + executable + ' doesn"t exist');
		return false;
	}
	var logsFolder = service.log_folder;
	if(! fs.existsSync(logsFolder)) {
		logsFolder = __dirname + path.sep + logsFolder;
	}
	if(! fs.existsSync(logsFolder)) {
		fs.mkdirSync(logsFolder);
	}
	var timeStamp = time_format('%d_%m_%y_%H_%M_%S');
	var outputLogFile = logsFolder + path.sep + service.name + '_' + timeStamp + '_output.log'
	var errorLogFile = logsFolder + path.sep + service.name + '_' + timeStamp + '_error.log'
	
	var outputFile = fs.openSync(outputLogFile, 'a');
	var errFile = fs.openSync(errorLogFile, 'a');
	
	var serviceArgs = service.args.slice(0);
	serviceArgs.unshift(executable);
	
	var cmd = executable + ' ' + serviceArgs.join(' ');
	
	console.log('Starting the service:' + service.name + ', as:' + cmd);
	
	service_process = spawn('node', serviceArgs, {detached: true, stdio : [ 'ignore', outputFile, errFile ] });
	//service_process = spawn('bash', serviceArgs, {detached: true, stdio : [ 'ignore', null, null ]});
	/*
	service_process = exec(cmd, function(err, stdout, stderr) {
		console.log('STDOUT:' + stdout);
		console.log('STDERR:' + stderr);
		console.log('Any ERR:' + err);
	});
	*/
	
	//console.log('child process:' + util.inspect(service_process));
	console.log('Pid for:' + service.name + ' is:' + service_process.pid);
	
	service['pid'] = service_process.pid;
	//store this service.pid to file. This pid shall be used to kill this later
	/*
	var service_pid_file = __dirname + path.sep + service.name + constants.SERVICE_INPROGRESS_EXTN;
	fs.writeFileSync(service_pid_file, JSON.stringify(service));
	
	*/
	service_process.unref();
	currentServiceIndex = currentServiceIndex + 1;
	console.log('Successfully launched the service:' + service.name + ' and current service index is:' + currentServiceIndex);
	return true;
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
		console.log('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

stopStartService = function(service) {
	console.log('Checking  / Stopping the service if any for:' + service.name);
	var cmdLine = constants.STOP_SERVICE_EXECUTABLE + ' ' + service.name;	
	var cmdToListProcesses = 'ps -ef | grep node';
	var processList = exec(cmdLine, function(err, stdout, stderr) {
		//console.log('STD OUT:'  + stdout);
		//console.log('STD ERR:'  + stderr);
		//console.log('ERR:' + err);
		startService(service);
	});
}

startConfiguredServices();



