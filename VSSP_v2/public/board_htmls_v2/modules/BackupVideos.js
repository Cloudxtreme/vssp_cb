
var selectedVideosForBackup = [];
var selectedCameraNameForBackup = '';

showBackupSelectedVideosDialog = function(camera_id) {
	console.log('Showing backup dialog..');
	selectedVideosForBackup = [];
	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null || selectedCamera == undefined) {
		showErrorStatus('Failed to get the camera details for the selected camera');
		return;
	}
	
	
	var videoContainer = 'input[id^=checkBoxVideo_]';
	nodes = dojo.query(videoContainer); 

	dojo.forEach(nodes,function(node) {  
			if(node.checked) {
				var videoID = node.getAttribute('id').replace('checkBoxVideo_', '');
				try {
					var video = JSON.parse(dojo.byId('video_json_' + videoID).value);
				} catch(err) {
				
				}
				selectedVideosForBackup.push(video);
			}		
		}
	);
	
	//showBackupVideosDialogWithVideos(selectedCamera);
	
	
	if(selectedVideosForBackup.length > 0) {
		if('admin_id' in dataStore) {
			showBackupVideosDialogWithVideos(selectedCamera);
		} else {
			try {
				throw new Error('Enable Admin Session to backup the selected video files');
			} catch(err) {
				handleException(err, true, 'Error');
			}
			return;
		}
	} else {
		try {
			throw new Error('Select Video files to backup');
		} catch(err) {
			handleException(err, true, 'Error');
		}
		return;
	}	
	
}

showBackupVideosDialogWithVideos = function(selectedCamera) {

	//dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	//dojo.removeClass('backupVideos_container', 'dont-show');
	
	//backup_videso_camera_name
	dojo.byId('backup_videso_camera_name').innerHTML = 'Backup Videos from ' + selectedCamera.node_name;
	selectedCameraNameForBackup = selectedCamera.node_name;
	
	//
	var data = '<tr><th>#</th><th>Name</th><th>Size</th></tr>';
	var index = 1;
	var totalSize = 0;
	var totalDuration = moment.duration(0);
	selectedVideosForBackup.forEach(function(video) {
		//data += '<li class="list-group-item"><span class="badge">14</span>' + video['Name'] + '</li>';
		data += '<tr><td>' + index + '</td><td class="name">' + video['Name'] + '</td><td>' + humanFileSizeNew(video['Size'], 1024) + '</td></tr>';
		var currentMoment = moment.duration(video['Duration']);
		totalDuration.add(currentMoment);
		totalSize += video['Size'];
		index++;
	});
	var totalDurationDisplay = '';
	var totalRecordDays = Math.floor(totalDuration.asMilliseconds()/(86400 * 1000));
	var totalRecordInMilliseconds = totalDuration.asMilliseconds() % (86400 * 1000)
	var totalRecordInDay = moment.utc(totalRecordInMilliseconds);
	var recordDurationDisplay = totalRecordInDay.format("HH") + ' hours, ' + totalRecordInDay.format("mm") + ' mins, ' + totalRecordInDay.format("ss") + ' seconds';
	if(totalRecordDays > 0) {
		totalDurationDisplay =  totalRecordDays + ' days, ' + recordDurationDisplay;
	} else {
		totalDurationDisplay =  recordDurationDisplay;
	}	
	dojo.byId('totalSelectedFiles').innerHTML = (index - 1);
	dojo.byId('totalSelectedFilesDuration').innerHTML = totalDurationDisplay;
	dojo.byId('totalSelectedFilesSize').innerHTML = humanFileSizeNew(totalSize, 1024);
	dojo.byId('video_list_for_backup').innerHTML = data;

	
	listUSBDevicesNew();
}

hideBackupVideosDlgNew = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('backupVideos_container', 'dont-show');
}

listUSBDevicesNew = function() {
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/listUSBDevices', '&auth_id=' +dataStore['auth_id'], 'ListUSBDevicesNewResponse');	
}

dojo.subscribe('ListUSBDevicesNewResponse', function(e) {
	console.log('ListUSBDevicesNewResponse response has come. Value:' + dojo.toJson(e, true));
	dojo.byId('video_backup_error_status').innerHTML =  '';
	dojo.byId('video_devices_for_backup').innerHTML = '';
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.removeClass('backupVideos_container', 'dont-show');

	if(e.status == 'SUCCESS') {
		dojo.removeClass('backup_videos_btn', 'disabled');
		//listOfAvailableUSBDevices = e.result;
		var deviceList = getListOfUSBDevicesFormattedNew(e.result);
		dojo.byId('video_devices_for_backup').innerHTML = deviceList;
	} else {
		dojo.byId('video_backup_error_status').innerHTML =  e.error_info;
		dojo.addClass('backup_videos_btn', 'disabled');
	}
});

getListOfUSBDevicesFormattedNew = function(listOfAvailableUSBDevices) {
	var data = '<tr><th>Select</th><th>Device Name</th><th>Free</th><th>Total</th></tr>';
	listOfAvailableUSBDevices.forEach(function(device) {
		data += '<tr>';
		data += '<td><input type="radio" name="selectedusbdevice" id="selectedusbdevice_' + device['drive'] + '" value=\'' + dojo.toJson(device) + '\' /></td>';
		data += '<td>' + device['drive'] + '</td>';
		
		//return value is interms of 1K block
		data += '<td>' + humanFileSizeNew(device['free'] * 1024, 1024) + '</td>';
		data += '<td>' + humanFileSizeNew(device['total'] * 1024, 1024) + '</td>';
		data += '</tr>';
	});
	return data;
}


backupVideosNew = function() {
	if(selectedVideosForBackup.length <= 0) {
		dojo.byId('video_backup_error_status').innerHTML =  'No videos are selected for backup';
		return;
	}
	//console.log('Selected videos:' + dojo.toJson(selectedVideosForBackup));
	
	var selectedUSBDrive = '';
	dojo.query('input[type=radio][name=selectedusbdevice]').forEach(function(node, index, nodeList) {
		if(node.checked) {
			var selectedDriveDetails = JSON.parse(node.value);
			selectedUSBDrive = selectedDriveDetails['drive'];
		}
	});
	if(dojo.string.trim(selectedUSBDrive).length <= 0) {
		dojo.byId('video_backup_error_status').innerHTML = 'Select USB Device to copy the videos';
		return;
	}
	console.log('Selected USB Drive:' + selectedUSBDrive);
		
	var data = 'usb_device=' + selectedUSBDrive;
	data += '&auth_id=' +dataStore['auth_id'] + '&mode=2';
	var selectedVideoIds = '';
	selectedVideosForBackup.forEach(function(video) {
		//console.log('Selected Video:' + dojo.toJson(video) + ', Timestamp:' + video['timestamp']);
		selectedVideoIds += video['timestamp'] + ',';
	});
	data += '&videos_to_be_copied=' + selectedVideoIds;
	data += '&cameras_to_be_copied=' + selectedCameraNameForBackup;
	console.log('posting the data for backup:' + data);	
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/backupVideosNow', data, 'BackupVideosSignalNew');	
}

dojo.subscribe('BackupVideosSignalNew', function(e) {
	console.log('BackupVideosSignal response has come. Value:' + dojo.toJson(e, true));
	if(e.status == 'SUCCESS') {
		hideBackupVideosDlgNew();
		showBackupVideoStatus();
	} else {
		dojo.byId('video_backup_error_status').innerHTML =  e.error_info;
	}
});


showBackupVideoStatus = function() {
	
	if('admin_id' in dataStore) {
		var url = '/board/listBackupVideosStatusResponse';
		var conn = new modules.BoardConnectionHandler;
		conn.sendGetData(url, 'auth_id=' +  dataStore['auth_id'], 'BackupVideoStatusResponse');	
	} else {
		try {
			throw new Error('Enable Admin Session to backup the selected video files');
		} catch(err) {
			handleException(err, true, 'Error');
		}
		return;
	}
	
}

getBackupVideoModeNew = function(value) {
	if(value == '1') {
		return 'Entire Camera';
	} else if(value == '2') {
		return 'Selected Videos';
	}
	return 'Unknown'
}

getVideoRecordServiceDateNew = function(dateInfo) {
	if(dateInfo == undefined) {
		return '';
	}	
	return dateInfo
}

hideVideoBackupStatusLogDisplay = function() {
	dojo.addClass('backup_video_status_log_container', 'dont-show');
}

showVideoBackupStatusLog = function(id) {
	//alert(backupStatus);
	console.log('id:' + id);
	var value = JSON.parse(Base64.decode(document.getElementById(id).value));
	console.log('Value:' + value);
	dojo.removeClass('backup_video_status_log_container', 'dont-show');
	//dojo.byId('backup_video_status_log').value = value['response'];
	document.getElementById('backup_video_status_log').value = value['response'];
}

getLogLinesLink = function(backupStatus) {
	if(backupStatus == undefined) {
		return '';
	}
	try {
		//var data = JSON.parse(backupStatus);
		console.log('ID:' + backupStatus['id']);
		//return '<button type="button" class="btn btn-info btn-block" data-toggle="tooltip" data-placement="left" title="Log" data-original-title="' + logLines + '"><i class="glyphicon glyphicon-list"></i></button>';
		
		return '<input type="hidden" id=' + backupStatus['id'] + ' value=\'' + Base64.encode(dojo.toJson(backupStatus)) + '\' /><a class="btn btn-link" href="javascript:showVideoBackupStatusLog(' + backupStatus['id'] + ')";><i class="glyphicon glyphicon-list"></i></a>';
	} catch(err) {
		console.log('err:' + err);
	}
	return '';
}

dojo.subscribe('BackupVideoStatusResponse', function(e) {
	console.log('BackupVideoStatusResponse response has come. Value:' + dojo.toJson(e, true));
	dojo.byId('video_backup_status').innerHTML = '';
	document.getElementById('backup_video_status_log').value = '';
	if(e.status == 'SUCCESS') {
		var data = '<tr><th>#</th><th>Device</th><th>Type</th><th>Status</th><th>Started</th><th>Completed</th><th>Log</th></tr>';
		var index = 1;
		e.result.forEach(function(backupStatus) {
			data +='<tr><td>' + index + '</td>';
			data += '<td>' + backupStatus['usb_device'] + '</td>';
			data += '<td>' + getBackupVideoModeNew(backupStatus['mode']) + '</td>';
			data += '<td>' + backupStatus['status'] + '</td>';
			data += '<td>' + getVideoRecordServiceDateNew(backupStatus['started_at']) + '</td>';
			data += '<td>' + getVideoRecordServiceDateNew(backupStatus['completed_at']) + '</td>';
			data += '<td>' + getLogLinesLink(backupStatus) + '</td>';
			data += '</tr>';
			index++;
		});
		dojo.byId('video_backup_status').innerHTML = data;
	} else {
		dojo.byId('video_backup_status').innerHTML = e.error_info;
	}
	showBackupVideoStatusDlgNew();
});


showBackupVideoStatusDlgNew = function() {
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.removeClass('backupVideosStatus_container', 'dont-show');
	dojo.addClass('backup_video_status_log_container', 'dont-show');
}

hideBackupVideoStatusDlgNew = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('backupVideosStatus_container', 'dont-show');
}