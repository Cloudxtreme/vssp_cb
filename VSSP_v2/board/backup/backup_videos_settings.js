var uuid = require('node-uuid');
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var os = require('os');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var time_format = require('strftime');
var request = require('request');
var disk = require('diskspace');
var hotload = require('hotload');
var running = require('is-running')

var execFile = require('child_process').execFile;
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var logger = require('./../logger/logger').logger;

//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../../constants.js');
var user = require('./../nodes/user.js')

logEventOfUserSettings = function(req, msg) {
	var logData = time_format('%F %T') + ',' + user.getUserDetails(req) + ',';
	logData += msg + '\n';
	try {
		fs.appendFileSync(constants.SYSTEM_ACTIVITY_LOG_FILE, logData);
	} catch(err) {
	
	}
}

exports.listBackupVideosStatus = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 
	
	var backup_list = [];
	var status_file = getJsonObjectFromFile(constants.BACKUP_VIDEOS_STATUS);
	if(status_file == null) {
		res.json(200, backup_list);
		return;
	}
	
	//var live = running(pid)
	var joblist = status_file['backup_jobs'];
	if(joblist == null) {
		res.json(200, backup_list);
		return;
	}
	
	joblist.forEach(function(job) {
		backup_list.push(job);
	});
	logger.info('List of backup jobs:' + util.inspect(backup_list));
	res.json(200, backup_list);
}

function dynamicSortBackupJobs(property) {
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

exports.listBackupVideosStatusResponse = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 
	
	var backup_list = [];
	var status_file = getJsonObjectFromFile(constants.BACKUP_VIDEOS_STATUS);
	if(status_file == null) {
		response.result = backup_list;
		res.json(200, response);
		return;
	}
	
	//var live = running(pid)
	response.error_info = '';
	response.status = 'SUCCESS';

	var joblist = status_file['backup_jobs'];
	if(joblist == null) {
		response.result = backup_list;
		res.json(200, response);
		return;
	}
	
	joblist.forEach(function(job) {
		backup_list.push(job);
	});
	backup_list.sort(dynamicSortBackupJobs('-id'))
	response.result = backup_list;
	logger.info('List of backup jobs:' + util.inspect(response));
	res.json(200, response);
}

exports.backupCameraFolderToUSBDevice = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 
	
	
	var camera_list = req.body.cameras_to_be_copied || req.query.cameras_to_be_copied;
	var videos_to_be_copied = req.body.videos_to_be_copied || req.query.videos_to_be_copied;
	var backup_video_mode = req.body.mode || req.query.mode;
	var usb_device = req.body.usb_device || req.query.usb_device;
	if(S(usb_device).isEmpty()) {
		response.error_info = 'Failed to backup videos as either cameras / usb device data found to be null';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	if(isBackUpInProgress(usb_device)) {
		response.error_info = 'Video Backup is already in-progress in device:' + usb_device + '. Cannot perform one more backup when it is active';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	if(backup_video_mode == 1) {
		if(S(camera_list).isEmpty()) {
			response.error_info = 'Failed to backup videos as list of cameras found to be null';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		var cameras = camera_list.split(',');
		usb_device = S(usb_device).trim().s;
		var isAnyCameraNotPresent = false;
		cameras.forEach(function(camera) {
			if(! S(camera).isEmpty()) {
				logger.info('Checking camera:' + camera);
				if(! checkNodePresent(camera)) {
					isAnyCameraNotPresent = true;
				}
			}
		});
		
		if(isAnyCameraNotPresent) {
			response.error_info = 'Looks like one of the Camera selected, doesnt exist. Failed todo backup of videos';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
	} else if(backup_video_mode == 2) {
		if(S(videos_to_be_copied).isEmpty()) {
			response.error_info = 'Failed to backup videos as list of videos found to be null';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}	
	}
	
	
	if(backup_video_mode == 1) {
		logger.info('Backup the Camera video folder');
		//var execParams = ['sudo', '/bin/bash'];
		var execParams = [];
		execParams.push('"' + constants.BACKUP_CAMERAS_PGM + '"');
		execParams.push('"' + usb_device + '"');
		execParams.push('"' + constants.MNT_FOLDER + '"');
		execParams.push('"' + camera_list + '"');
		execParams.push('"' + constants.BACKUP_FOLDER_IN_USB_DEVICE + '"');
		execParams.push('"' + constants.VSSP_STORE_BASE_FOLDER + '"');
		execParams.push('"' + constants.VIDEO_STORE_FOR_NODE + '"');
		
		var backup_id = new Date().getTime();
		logger.info('Cmd line args to be invoked for video backup:' + execParams);
		//var p = execFile(constants.BACKUP_CAMERAS_PGM, execParams, function(err, stdout, stderr) {
		
		var p = exec(execParams.join(' '), function(err, stdout, stderr) {
		
			if(err) {
				var data = 'ERROR:' + err + ', STDOUT:' + S(stdout).trim() + ', STDERR:' + S(stderr).trim(); 
				updateBackupCompleteStatus(pid, backup_id, 'FAILURE', data);
				return;
			}
			var data = 'STDOUT:' + S(stdout).trim() + ', STDERR:' + S(stderr).trim(); 
			updateBackupCompleteStatus(pid, backup_id, 'SUCCESS', data);
		});
		var pid = p.pid;
		updateBackupJobStatus(req, backup_id, pid);
		/*
		var p = spawn('/bin/bash', execParams, { stdio: 'inherit' });
		var pid = p.pid;
		var response = ''
		updateBackupJobStatus(req, pid);
		p.on('exit', function(exitCode, signal) {
			logger.debug('exit signal for backup task is:' + exitCode);
			updateBackupCompleteStatus(pid, response);
		});
		*/
		/*
		if(p != null) {
			p.stdout.on('data', function (data) {
				response += 'STDOUT:' + data + '\n';
			});
		}
		if(p != null) {
			p.stderr.on('data', function (data) {
				response += 'STDERR:' + data + '\n';
			});
		}
		*/
		/*
		if(p != null) {
			p.on('close', function (code) {
				response += 'child process exited with code ' + code;
			});		
		}
		*/
		response.error_info = '';
		response.status = 'SUCCESS';
		response.result = 'Successfully started the video backup. ID:' + backup_id;
		res.json(200, response);
		logger.info(JSON.stringify(response));
		
	} else if(backup_video_mode == 2) {
		logger.info('Backup User selected videos');
		
		
		var list = getSelectedVideosList(camera_list, videos_to_be_copied);
		var backupFileList = getFileListForCopy(camera_list, list);
		
		var execParams = [];
		execParams.push('"' + constants.BACKUP_VIDEOS_PGM + '"');
		execParams.push('"' + usb_device + '"');
		execParams.push('"' + constants.MNT_FOLDER + '"');
		execParams.push('"' + backupFileList + '"');
		execParams.push('"' + constants.BACKUP_FOLDER_IN_USB_DEVICE + '"');
		execParams.push('"' + constants.VSSP_STORE_BASE_FOLDER + '"');
		execParams.push('"' + constants.VIDEO_STORE_FOR_NODE + '"');
		execParams.push('"' + camera_list + '"');
		
		var backup_id = new Date().getTime();
		logger.info('Cmd line args to be invoked for video backup:' + execParams);
		//var p = execFile(constants.BACKUP_CAMERAS_PGM, execParams, function(err, stdout, stderr) {
		
		var p = exec(execParams.join(' '), function(err, stdout, stderr) {
		
			deleteFile(backupFileList);

			if(err) {
				var data = 'ERROR:' + err + ', STDOUT:' + S(stdout).trim() + ', STDERR:' + S(stderr).trim(); 
				updateBackupCompleteStatus(pid, backup_id, 'FAILURE', data);
				return;
			}
			var data = 'STDOUT:' + S(stdout).trim() + ', STDERR:' + S(stderr).trim(); 
			updateBackupCompleteStatus(pid, backup_id, 'SUCCESS', data);
		});
		var pid = p.pid;
		updateBackupJobStatus(req, backup_id, pid);		

		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = 'Successfully started the video back-up of selected files. ID:' + backup_id;
		res.json(200, response);
		logger.error(JSON.stringify(response));	
	}
}

getFileListForCopy = function(camera, list) {
	var camera_tmp_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + camera + path.sep + constants.TMP_STORE_FOR_NODE;
	var file = camera_tmp_folder + path.sep + 'Video_file_to_copy_' + time_format('%d_%m_%y_%H_%M_%S') + '.txt';
	
	try {
		fs.writeFileSync(file, list.join('\n'));
	} catch(err) {
	
	}
	return file;
}

getSelectedVideosList = function(camera, selectedVideos) {
	var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + camera + path.sep + constants.VIDEO_STORE_FOR_NODE;
	var file_list = [];
	var files = fs.readdirSync(node_store_folder);
	files.forEach(function(file) { 
		
		var isHidden = /^\./.test(file);
		if(! isHidden) {
			var abs_file = node_store_folder + path.sep + file;
			
			try {
				var stats = fs.statSync(abs_file);
				if(stats.isDirectory()) {
					return false;
				}
				var extn = path.extname(abs_file);
				if(extn == '.mp4') {
					
					//get the json file for the same video
					var jsonFile = path.dirname(abs_file) + path.sep + path.basename(abs_file, '.mp4') + constants.VIDEO_METADATA_FILE_EXTN;
					
					if(fs.existsSync(jsonFile)) {					
						var file_details = getJsonObjectFromFile(jsonFile);
						if(file_details != null) {
							if(S(selectedVideos).contains(file_details['timestamp'])) {
								file_list.push(abs_file);
							}
						}
					} 
				}
			} catch(err) { 
				logger.error('Error occurred while getting the files:' + err);
			}
		}
	});	
	return file_list;
}

updateBackupCompleteStatus = function(pid, id, status, response) {
	var status_file = getJsonObjectFromFile(constants.BACKUP_VIDEOS_STATUS);
	if(status_file == null) {		
		logger.error('Failed in getting the backup job status file to update');
		return;
	}
	
	var joblist = status_file['backup_jobs'];
	
	joblist.forEach(function(job) {
		if(job.id == id) {
			job['status'] = status;
			if('response' in job) {
				job['response'] = job['response'] + ', ' + response;
			} else {
				job['response'] = response;
			}
			job['active'] = false;
			job['completed_at'] = time_format('%F %T');
		}
	});
	try {
		fs.writeFileSync(constants.BACKUP_VIDEOS_STATUS, JSON.stringify(status_file));	
	} catch(err) {
	
	}
}

isBackUpInProgress = function(usb_device) {
	var status_file = getJsonObjectFromFile(constants.BACKUP_VIDEOS_STATUS);
	if(status_file == null) {
		return false;
	}
	
	//var live = running(pid)
	var joblist = status_file['backup_jobs'];
	if(joblist == null) {
		return false;
	}
	var activeJobFound = false;
	joblist.forEach(function(job) {
		var pid = job['pid'];
		var isAlive = running(pid);
		
		var jobDevice = job['usb_device'];
		var activeJobDevice_status = (jobDevice == usb_device);
		logger.info('Active device:' + jobDevice + ', Run Status:' + isAlive + ', is same:' + activeJobDevice_status);
		if(isAlive && activeJobDevice_status) {
			logger.info('The backup active job:' + pid + ' in device:' + jobDevice  + ' is in-progress...');
			activeJobFound = true;
		} else {
		
		}
	});
	
	return activeJobFound;
}

isBackUpInProgressInActiveJobsList = function() {
	var status_file = getJsonObjectFromFile(constants.BACKUP_VIDEOS_STATUS);
	if(status_file == null) {
		return false;
	}
	
	//var live = running(pid)
	var jobList = status_file['backup_jobs'];
	if(jobList == null) {
		return false;
	}
	var activeJobFound = false;
	jobList.forEach(function(job) {
		var pid = job['pid'];
		var isAlive = running(pid);
		
		if(isAlive) {
			logger.info('The backup active job:' + pid + ' is in-progress...');
			activeJobFound = true;
		} else {
			job['active'] = false;
		}
	});
	
	try {
		fs.writeFileSync(constants.BACKUP_VIDEOS_STATUS, JSON.stringify(status_file));			
	} catch(err) {
	
	}
	
	return activeJobFound;
}

updateBackupJobStatus = function(req, id, pid) {
	var status_file = getJsonObjectFromFile(constants.BACKUP_VIDEOS_STATUS);
	if(status_file == null) {		
		logger.error('Failed in getting the backup job status file');
		return;
	}
	var camera_list = req.body.cameras_to_be_copied || req.query.cameras_to_be_copied;
	var videos_to_be_copied = req.body.videos_to_be_copied || req.query.videos_to_be_copied;
	var backup_video_mode = req.body.mode || req.query.mode;
	var usb_device = req.body.usb_device || req.query.usb_device;
	
	var active_backup_job = {};
	active_backup_job['id'] = id;
	active_backup_job['usb_device'] = usb_device;
	active_backup_job['mode'] = backup_video_mode;
	active_backup_job['pid'] = pid;
	active_backup_job['started_at'] = time_format('%F %T');
	active_backup_job['active'] = true;
	active_backup_job['status'] = 'STARTED';
	
	
	if(backup_video_mode == 1) {
		active_backup_job['cameras_to_backup'] = camera_list;
	} else {
		active_backup_job['videos_to_backup'] = videos_to_be_copied;
	}
	
	var active_jobs = status_file['backup_jobs'];
	active_jobs.push(active_backup_job);
	
	try {
		fs.writeFileSync(constants.BACKUP_VIDEOS_STATUS, JSON.stringify(status_file));	
	} catch(err) {
	
	}
}

exports.listUSBDevices = function(req, res) {
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
	/*
	if(isBackUpInProgress()) {
		response.error_info = 'Vidoe Backup is already in-progress. Cannot perform one more backup when it is active';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	*/	
	var ps = exec([constants.LIST_USB_DEVICES_PGM], function(err, stdout, stderr) {
		if(err) {
			logger.error('Failed to get the list of USB devices. Error:' + err);
			response.error_info = 'No USB Devices found';
			res.send(200, response);
			return;
		}
		var data = S(stdout).trim().s;
		if(data.length <= 0) {
			logger.info('No USB devices are found');
			response.error_info = 'No USB Devices found';
			res.send(200, response);
			return;
		}
		var list = data.split('|');
		var device_list = [];
		list.forEach(function(d) {
			if(! S(d).isEmpty()) {
				var tokens = d.split(',');
				var device_details = {};
				device_details['drive'] = tokens[0];
				device_details['total'] = tokens[1];
				device_details['used'] = tokens[2];
				device_details['free'] = tokens[3];
				
				device_list.push(device_details);
			}
		});
		
		response.status = 'SUCCESS';
		response.result = device_list;
		res.send(200, response);
	});
}

exports.checkForAnyBackupActivity = function() {
	var status_file = getJsonObjectFromFile(constants.BACKUP_VIDEOS_STATUS);
	if(status_file == null) {
		return false;
	}
	
	var jobs = status_file['backup_jobs'];
	if(jobs == null) {
		logger.info('No active backup job is in-progress..');
		return false;
	}
	
	if(! isBackUpInProgressInActiveJobsList()) {
		logger.info('No active job is in-progress. checked via status file');
		return false;
	}
	
	//remove active entry and move it to status list
	//if(activeJob['pid']) {
	//	updateBackupCompleteStatus(activeJob['pid'], 'Removed at the Start', 'Active job has been moved at the start');
	//}
	return true;
}

exports.sendBackupVideosSettingsPage = function(req, res) {
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
	try {
		var cameraList = getListOfCamerasInCheckBox();
		getUSBDevicesAndSendBackupVideoSettings(req, res, cameraList);
	} catch(err) {
		response.error_info = 'Exception occurred while getting the Backup Videos Settings. Error:' + err;
		res.json(200, response);
		logger.info(JSON.stringify(response));
		return;
	}
}

getUserSettingsContent = function(device) {
	var user_options = device['user_config_options'];	
	var buf = '';
	var row = 0;
	for(var k in user_options) {
		buf += getUserParameterContent(user_options, k, row); //'<tr><td>' + k + '</td></tr>'
		row++;
	}
	return buf;
}

getListOfCamerasInCheckBox = function() {
	var buf = '';
	var cameraList = getNodes();
	buf = '<table class="camera_list">';
	cameraList.forEach(function(camera) {
		buf += '<tr><td><input id="camera_' + camera.node_id + '" name="camera_"' + camera.node_id + ' data-dojo-type="dijit/form/CheckBox" checked /> <label for="camera_"' + camera.node_id + '">' + camera.node_name + '</label></td></tr>';
	});
	buf += '</table>';
	return buf;
}

getUSBDevicesAndSendBackupVideoSettings = function(req, res, cameraList) {
	
	var data = fs.readFileSync(constants.BACKUP_VIDEOS_SETTINGS_TEMPLATE);
	data = S(data).replaceAll('<!--REPLACE_LIST_OF_CAMERAS-->', cameraList).s;
	var ps = exec([constants.LIST_USB_DEVICES_PGM], function(err, stdout, stderr) {
		if(err) {
			logger.error('Failed to get the list of USB devices. Error:' + err);
			data = S(data).replaceAll('<!--REPLACE_LIST_OF_USB_DEVICES-->', 'No USB Devices found').s;
			res.send(200, data);
			return;
		}
		logger.info('List of USB devices found as: Stdout:' + S(stdout).trim().s + ', stderr:' + stderr);
		var usbDevicesResponse = S(stdout).trim().s;
		if(usbDevicesResponse.length > 0) {
			var listOfDevices = getListOfUSBDevices(S(stdout).trim().s);
			data = S(data).replaceAll('<!--REPLACE_LIST_OF_USB_DEVICES-->', listOfDevices).s;
		} else {
			data = S(data).replaceAll('<!--REPLACE_LIST_OF_USB_DEVICES-->', '<span class="no_usb_devices">No USB Devices are found</span>').s;
		}
		res.send(200, data);
	});
}

getListOfUSBDevices = function(data) {
	var buf = '<table class="usb_device_list"><tr><td><select id=selectUSBDevice><option>' + data + '</option></select></td></tr></table>';
	return buf;
}

getUserList = function(device) {
	
	var buf = '<tr><td>List of users</td>';
	buf += '<td><select name=\'userListInSettings\' id=\'userListInSettings\'>';
	var users = device.users;
	users.forEach(function(user) {
		var index = user.indexOf(':');
		if(index != -1) {
			user = user.substring(0, index);
			buf += '<option>' + user + '</option>';
		}
	});
	buf += '</select><br/>';
	buf += '<table class=addModifyDeleteUser><tr>';
	buf += '<td><a id=\'addUserUserSettings\' href=\'javascript:showAddUserDialog()\'>Add</a></td>'
	buf += '<td><a id=\'modifyUserUserSettings\' href=\'javascript:showModifyUserDialog()\'>Modify</a></td>'
	buf += '<td><a id=\'deleteUserUserSettings\' href=\'javascript:showDeleteUserDialog()\'>Delete</a></td>'
	buf += '</tr></table>';
	
	buf += '</td></tr>';
	return buf;
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

getUserParameterContent = function(user_options, key, row) {
	var buf = '<tr>';
	var classInfo = '';
	if(row %2 != 0) {
		classInfo = ' class=odd';
	}
	if(user_options[key]) {
		var data = user_options[key];
		var key = data['key'];
		var display = data['display'];
		
		buf += '<td ' + classInfo + '>' + display + '</td>';
		
		var type = data['type'];
		if(type === 'numeric') {
			buf += '<td ' + classInfo + '><input type=text name=' + key + ' value=' + getValue(key) + ' ></td>';
		} else if(type === 'textarea') {
			buf += '<td ' + classInfo + '><textarea name=' + key + '>' + getValue(key) + '</textarea></td>';
		} else if(type === 'Option') {
			buf += '<td ' + classInfo + '>' + getOptionList(data, key) + '</td>';
		}  else if(type === 'Check') {
			buf += '<td ' + classInfo + '>' + getCheckBox(data, key) + '</td>'; //<input type=checkbox name=' + key + ' value=' + getValue(key) + ' ></td>';
		}
	}
	buf += '</tr>';
	return buf;
}

getCheckBox = function(data, key) {

	var buf = '<script>function updateCheckBoxUserSettings(chk) {';
	buf += 'if(chk.checked) {';
	buf += 'chk.value=1;'
	buf += '} else {'
	buf += 'chk.value=0;'
	buf += '}'
	buf += '}</script>'
	var state = '';
	if(getValue(key) == 1) {
		state = 'checked';
	}
	logger.info('The current checked state is:' + state + ', vlaue is:\'' + getValue(key)+ '\'');
	var buf = '<input type=checkbox name=' + key + ' '  + state + ' >'
	
	return buf;
}

getOptionList = function(data, key) {
	var buf = '<select name=' + key + '>';
	var defaultValue = getValue(key);
	var values = data['values'];
	values.forEach(function(val) {
		if(val === defaultValue) {
			buf += '<option selected>'  + val + '</option>';
		} else {
			buf += '<option>'  + val + '</option>';		
		}
	});
	return buf;
}

getValue = function(key) {
/*
	if(key === 'DAYS_TO_KEEP_VIDEO_FILES') {
		return constants.DAYS_TO_KEEP_VIDEO_FILES;
	}
	if(key === 'MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS') {
		return constants.MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS;
	}
	if(key === 'BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS') {
		return constants.BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS;
	}*/
	
	return constants[key];
}

exports.updateUserSettings = function(req, res) {
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
	
	var err_details = updateUserSettings(req, device['user_config_options']);
	if(S(err_details).isEmpty()) {
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = 'Successfully updated the User settings';
	}  else {
		response.error_info = err_details;
	}
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

updateUserSettings = function(req, user_options) {
	var error_details = '';
	var changed_value = '';
	try {
		var body = req.body;
		
		var configFile = constants.VSSP_BASE_FOLDER + path.sep + 'constants.js';
		var fileContent = fs.readFileSync(configFile).toString().split("\n");
		
		for(var key in body) {
			if(key != 'auth_id') {
				for(var i in fileContent) {
					var line = fileContent[i];
					if(! S(line).isEmpty()) {
						
						var index = line.indexOf('exports.' + key);
						if(index != -1) {
							changed_value += ' Option:' + key + ', set to:' + body[key] + ', ';
							var keyType = getUserConfigurationOptionType(user_options, key);
							if( keyType === 'numeric') {
								fileContent[i] = 'exports.' + key + '=' + body[key];
							} else if(keyType === 'Check') {
								logger.info('checkbox value is:' + body[key]);
								//if(body[key] == 'On' || body[key] == 'ON' || body[key] == '1' || body[key] == 1 || body[key] == true) { 
								if(body[key] === true || body[key] === 'true') { 
									//logger.info('Setting the content to true, 1');
									fileContent[i] = 'exports.' + key + '=1';
								} else {
									//logger.info('Setting the content to false, 0');
									fileContent[i] = 'exports.' + key + '=0';
								}
							} else {
								fileContent[i] = 'exports.' + key + '="' + body[key] + '"';
							}
						}
					}
				}
			}
		}
		logEventOfUserSettings(req, 'User settings changed as' + changed_value);
		var data = fileContent.join('\n');
		fs.writeFileSync(configFile, data);
		
		hotload(configFile);
	} catch(err) {
		error_details = 'Error while updating the user configuration. Error:' + err;
	}
	return error_details;
}

getUserConfigurationOptionType = function(user_options, key) {
	var option_desc = user_options[key];
	return option_desc['type'];
}

exports.init = function() {
	logger.debug('Initializing the nodes...');
	var store_folder = constants.VSSP_STORE_BASE_FOLDER;
	logger.debug('Scanning the folder:' + store_folder + ' for any video record in-progress...');
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
	return true;
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

createFolder = function(parentFolder, folderName) {
	var result = false;
	var f = parentFolder + path.sep + folderName;
	logger.debug('Creating folder:' + f);
	try {
		fs.mkdirSync(f);
		result = true;
	} catch(err) {
		logger.error('Exception while creating folder. Error:' + err);
	}
	return result;
}

exports.addNode = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = user.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
	} else {

		var device = getDevice();
		if(device == null) {
			response.error_info = 'The device details are null';
			res.json(200, response);
			logger.error(JSON.stringify(response));
			return;
		}
		
		var site_url = device.site_server + 'addNode';
	
		var user_id = req.body.user_id || req.query.user_id;
		var board_id = device.id;
		var node_type = req.body.node_type || req.query.node_type;
		var node_port = req.body.node_port || req.query.node_port;
		var node_name = req.body.node_name || req.query.node_name;
		var node_location = req.body.node_location || req.query.node_location;
		var node_desc = req.body.node_desc || req.query.node_desc;
		var node_url = req.body.node_url || req.query.node_url;
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
				
				
				var node_store_folder = constants.VSSP_STORE_BASE_FOLDER + path.sep + node_name;
				
				if(! createFolder(constants.VSSP_STORE_BASE_FOLDER, node_name)) {
					logger.debug('Failed to create Video store folder for node:'  + node_name);
					response.error_info = 'Failed to add the node. Failed to create Video store folder for node:'  + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
				if(! createFolder(node_store_folder, constants.VIDEO_STORE_FOR_NODE)) {
					logger.debug('Failed to create Sub-Video store folder for node:'  + node_name);
					response.error_info = 'Failed to add the node. Failed to create Sub-Video store folder for node:'  + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
				if(! createFolder(node_store_folder, constants.IMAGE_STORE_FOR_NODE)) {
					logger.debug('Failed to create Sub-Image store folder for node:'  + node_name);
					response.error_info = 'Failed to add the node. Failed to create Sub-Image store folder for node:'  + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
				if(! createFolder(node_store_folder, constants.TMP_STORE_FOR_NODE)) {
					logger.debug('Failed to create Sub-tmp store folder for node:'  + node_name);
					response.error_info = 'Failed to add the node. Failed to create Sub-Tmp store folder for node:'  + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
				var motion_tmp_folder = node_store_folder + path.sep + constants.MOTION_TEMP_FOLDER;
				if(! createFolder(node_store_folder, constants.MOTION_TEMP_FOLDER)) {
					logger.debug('Failed to create Motion Tmp store folder for node:'  + node_name);
					response.error_info = 'Failed to add the node. Failed to create Motion Tmp store folder for node:'  + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
				if(! createFolder(motion_tmp_folder, constants.MOTION_TEMP_IMAGES_FOLDER)) {
					logger.debug('Failed to create Motion/images Tmp store folder for node:'  + node_name);
					response.error_info = 'Failed to add the node. Failed to create Motion/images Tmp store folder for node:'  + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}				
				var service_request_folder = node_store_folder + path.sep + constants.RECORD_SERVICE_REQUESTS_FOLDER;
				if(! createFolder(node_store_folder, constants.RECORD_SERVICE_REQUESTS_FOLDER)) {
					logger.debug('Failed to create service request store folder for node:'  + node_name);
					response.error_info = 'Failed to add the node. Failed to create service request store folder for node:'  + node_name;
					res.json(200, response);
					logger.error(JSON.stringify(response));
					return;
				}
				response.status = 'SUCCESS';
				response.error_info = '';
				response.result = s_response.result;
				res.json(200, response);
				logger.info(JSON.stringify(response));
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
		});
	}
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
	var userDetailsFromCookie = req.cookies[constants.COOKIE_VSSP_USER_NAME];
	if(S(userDetailsFromCookie).isEmpty()) {
		logger.debug('User session is found to be empty');
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var userDetails = userDetailsFromCookie.split(':');
	var userID = userDetails[0];
	var userName = userDetails[1];
	
	if(S(userID).isEmpty() || S(userName).isEmpty()) {
		logger.debug('Either user id or username might be found as null / empty in cookies');
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
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
		var video_recorder_args = node.video_recorder_executor_arguments.split(',');
		video_executor['args'] = video_recorder_args;
		
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
		var video_recorder_args = vp.video_recorder_executor_arguments.split(',');
		video_executor['args'] = video_recorder_args;
		
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

exports.getNodeModels = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device = getDevice();
	var userDetailsFromCookie = req.cookies[constants.COOKIE_VSSP_USER_NAME];
	if(S(userDetailsFromCookie).isEmpty()) {
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
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
}

exports.getVideoProfiles = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var device = getDevice();
	var userDetailsFromCookie = req.cookies[constants.COOKIE_VSSP_USER_NAME];
	if(S(userDetailsFromCookie).isEmpty()) {
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
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
	
}

exports.listRecordServiceTypes = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device = getDevice();
	var userDetailsFromCookie = req.cookies[constants.COOKIE_VSSP_USER_NAME];
	if(S(userDetailsFromCookie).isEmpty()) {
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
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
		
		var site_url = device.site_server + 'modifyNode';
	
		var user_id = req.body.user_id || req.query.user_id;
		var board_id = device.id;
		var node_id = req.body.node_id || req.query.node_id;
		var node_type = req.body.node_type || req.query.node_type;
		var node_port = req.body.node_port || req.query.node_port;
		var node_name = req.body.node_name || req.query.node_name;
		var node_location = req.body.node_location || req.query.node_location;
		var node_desc = req.body.node_desc || req.query.node_desc;
		var node_url = req.body.node_url || req.query.node_url;
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
		response.result = this.getTotalFilesInBoard();
		response['board_max_storage'] = total;
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
						//file_details['ctime'] = strftime('%F %T', stats.ctime);
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
	file_list.sort(dynamicSort('timestamp'));
	response.error_info = '';
	response.status = 'SUCCESS';
	response.result = file_list;
	response['node_name'] = node_name;
	response['node_id'] = node_id;
	res.json(200, response);
	//console.log('Response:' + util.inspect(file_list));
	//res.json(200, file_list);
	logger.info('No. of files sent:' + file_list.length);
	logger.info('Files:' +  util.inspect(response));
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

/*
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

*/
