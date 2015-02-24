var camera_id_for_modification = -1;
var camera_id_for_deletion = -1;

showAddCameraDialog = function() {
	
	if('admin_id' in dataStore) {
		dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
		dojo.removeClass('add_camera_dialog_container', 'dont-show');
		
		dojo.byId('add_camera_error_status').innerHTML = '';
		document.getElementById('camera_name').focus();
		return;
	} else {
		try {
			throw new Error('Enable Admin Session to add Camera');
		} catch(err) {
			handleException(err, true, 'Error');
		}
	}
}

closeCameraModifyEditorDialog = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('modify_camera_dialog_container', 'dont-show');
}

closeCameraAddEditorDialog = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('add_camera_dialog_container', 'dont-show');
}

showModifyCameraError = function(msg) {
	dojo.removeClass('modify_camera_error_status', 'dont-show');
	dojo.addClass('modify_camera_error_status', 'label-danger');
	dojo.byId('modify_camera_error_status').innerHTML = msg;
}

showAddCameraError = function(msg) {
	dojo.removeClass('add_camera_error_status', 'dont-show');
	dojo.addClass('add_camera_error_status', 'label-danger');
	dojo.byId('add_camera_error_status').innerHTML = msg;
}

addCamera = function() {
	
	var cameraName = dojo.string.trim(dojo.query('div#add_camera_dialog_container input#camera_name')[0].value);
	var cameraType = dojo.string.trim(dojo.query('div#add_camera_dialog_container input#camera_type')[0].value);
	var cameraLocation = dojo.string.trim(dojo.query('div#add_camera_dialog_container input#camera_location')[0].value);
	var cameraURL = dojo.string.trim(dojo.query('div#add_camera_dialog_container input#camera_url')[0].value);
	var cameraUsername = dojo.string.trim(dojo.query('div#add_camera_dialog_container input#camera_username')[0].value);
	var cameraPassword = dojo.string.trim(dojo.query('div#add_camera_dialog_container input#camera_password')[0].value);
	var cameraDesc = dojo.string.trim(dojo.query('div#add_camera_dialog_container textarea#camera_desc')[0].value);

	if(cameraName.length <= 0) {
		showAddCameraError('Camera Name cannot be empty');
		document.getElementById('camera_name').focus();
		return;
	}
	if(cameraType.length <= 0) {
		showAddCameraError('Camera Type cannot be empty');
		document.getElementById('camera_type').focus();
		return;
	}
	if(cameraLocation.length <= 0) {
		showAddCameraError('Camera Location cannot be empty');
		document.getElementById('camera_location').focus();
		return;
	}
	if(cameraURL.length <= 0) {
		showAddCameraError('Camera URL cannot be empty');
		document.getElementById('camera_url').focus();
		return;
	}
	if(cameraUsername.length <= 0) {
		showAddCameraError('Camera Username cannot be empty');
		document.getElementById('camera_username').focus();
		return;
	}
	if(cameraPassword.length <= 0) {
		showAddCameraError('Camera Password cannot be empty');
		document.getElementById('camera_password').focus();
		return;
	}	
	if(cameraDesc.length <= 0) {
		showAddCameraError('Camera Desc cannot be empty');
		document.getElementById('camera_desc').focus();
		return;
	}	
	var videoRecorderType = 0;	//default RTSP;
	if(dojo.query('div#add_camera_dialog_container input#recorder_type_rtsp')[0].checked) {
		videoRecorderType = 0;
	} else if(dojo.query('div#add_camera_dialog_container input#recorder_type_mjpeg')[0].checked) {
		videoRecorderType = 1;
	}
	
	
	dojo.removeClass('add_camera_error_status', 'dont-show');
	dojo.removeClass('add_camera_error_status', 'label-danger');
	dojo.removeClass('add_camera_error_status', 'label-default');
	
	dojo.byId('add_camera_error_status').innerHTML = 'Adding camera...';
	var node_port = '-1';
	var node_local_store = '';
	var node_model = '1';				//Zavi type;
	var node_video_profile_id = '1';	// As_Source
	var data = 'user_id=' + dataStore['admin_id'] + '&board_id=' + dataStore['board_id'] + '&node_type=' + cameraType + '&node_port=' + node_port;
	data += '&node_name=' + cameraName + '&node_location=' + cameraLocation + '&node_desc=' + cameraDesc;
	data += '&node_url=' + cameraURL + '&node_username=' + cameraUsername + '&node_password=' + cameraPassword;
	data += '&video_recorder_type=' + videoRecorderType;
	data += '&node_video_profile_id=' + node_video_profile_id + '&node_video_local_store=' + node_local_store + '&node_model_id=' + node_model + '&auth_id=' + dataStore['auth_id'];
	//console.log('Posting data:' + data);

	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/addNode', data, 'addNodeSignalNew');		
}

dojo.subscribe('addNodeSignalNew', function(e) {
	console.log('addNodeSignalNew response has come. Value:' + dojo.toJson(e, true));
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	try {
		if(e.status === 'SUCCESS') {
			closeCameraAddEditorDialog();
			loadCameras();
			return;
		} else {
			showAddCameraError(e.error_info);
		}
	} catch(err) {
		showAddCameraError(err.message);
	}	
});

deleteCameraNow = function(args) {
	var camera_id = args;
	var camera = getCameraDetailsById(camera_id);
	if(camera == null) {
		showErrorStatus('Failed to delete as camera details are not found');
		return;
	}
	console.log('Camera id has been found. Camera:' + dojo.toJson(camera));
	
	var node_name = camera.node_name;
	var node_id = camera.node_id;
	var board_id = camera.board_id;
	var user_id = dataStore['user_id'];
	var auth_id = dataStore['auth_id'];
	console.log('All data has been taken');
	console.log('Name:' + node_name);
	console.log('ID:' + node_id);
	console.log('BID:' + board_id);
	console.log('UID:' + user_id);
	console.log('AID:' + auth_id);
	var	d1 = 'user_id=' + user_id + '&board_id=' + board_id + '&node_name=' + node_name + '&auth_id=' + auth_id + '&node_id=' + node_id;
	console.log('Posting data:' + d1);
	
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/deleteNode', d1, 'deleteNodeSignalNew');	
}


dojo.subscribe('BoardStatusResponseForDeleteCamera', function(e) {
	console.log('BoardStatusResponseForDeleteCamera response has come. Value:' + dojo.toJson(e, true));
	var r = e.result;
	var cameras = r["cameras"];
	var isVideoRecordInProgress = false;
	cameras.forEach(function(camera) {
		//console.log('The result is:' + dojo.toJson(camera, true));
		
		var node_id = camera.node_id;
		var record_status = camera["video_recording_inprogress"];
		if(record_status) {
			isVideoRecordInProgress = true;
		}
	});	
	showAllOptionsInSettingsUI = (! isVideoRecordInProgress);
	//If video record inprogress; dont allow the user settings update
	showDeleteCameraDialogUI();
});

showDeleteCameraDialogUI = function() {

	if(! showAllOptionsInSettingsUI) {
		try {
			throw new Error('Cannot delete camera when video recording is in-progress.');
		} catch(err) {
			handleException(err, true, 'Error');
		}
		return;
	}

	var camera_id = camera_id_for_deletion;
	var camera = getCameraDetailsById(camera_id);
	if(camera == null) {
		showErrorStatus('Failed to delete as camera details are not found');
		return;
	}

	if(! confirm('Do you really want to delete Camera:' + camera['node_name'] + ' ?')) {
		console.log('User cancelled the camera deletion of:' + camera['node_name']);
		return;
	}
	
	//showConfirmation('Do you really want to delete Camera:' + camera['node_name'] + ' ?', deleteCameraNow, camera_id);
	//var camera = getCameraDetailsById(camera_id);
	//if(camera == null) {
	//	showErrorStatus('Failed to delete as camera details are not found');
	//	return;
	//}
	//console.log('Camera id has been found. Camera:' + dojo.toJson(camera));
	
	var node_name = camera.node_name;
	var node_id = camera.node_id;
	var board_id = camera.board_id;
	var user_id = dataStore['user_id'];
	var auth_id = dataStore['auth_id'];
	console.log('All data has been taken');
	console.log('Name:' + node_name);
	console.log('ID:' + node_id);
	console.log('BID:' + board_id);
	console.log('UID:' + user_id);
	console.log('AID:' + auth_id);
	var	d1 = 'user_id=' + user_id + '&board_id=' + board_id + '&node_name=' + node_name + '&auth_id=' + auth_id + '&node_id=' + node_id;
	console.log('Posting data:' + d1);
	
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/deleteNode', d1, 'deleteNodeSignalNew');	
}

deleteCamera = function(camera_id) {

	if('admin_id' in dataStore) {
		camera_id_for_deletion = camera_id;
		var conn = new modules.BoardConnectionHandler;
		conn.sendPostData('/board/getBoardStatus', '&auth_id=' +dataStore['auth_id'], 'BoardStatusResponseForDeleteCamera');	
	} else {
		try {
			throw new Error('Enable Admin Session to delete Camera');
		} catch(err) {
			handleException(err, true, 'Error');
		}	
	}
}

dojo.subscribe('deleteNodeSignalNew', function(e) {
	console.log('deleteNodeSignalNew response has come. Value:' + dojo.toJson(e, true));
	try {
		if(e.status === 'SUCCESS') {
			loadCameras();
			return;
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		showErrorStatus(err.message);
	}	
});



dojo.subscribe('BoardStatusResponseForModifyCamera', function(e) {
	console.log('BoardStatusResponseForModifyCamera response has come. Value:' + dojo.toJson(e, true));
	var r = e.result;
	var cameras = r["cameras"];
	var isVideoRecordInProgress = false;
	cameras.forEach(function(camera) {
		//console.log('The result is:' + dojo.toJson(camera, true));
		
		var node_id = camera.node_id;
		var record_status = camera["video_recording_inprogress"];
		if(record_status) {
			isVideoRecordInProgress = true;
		}
	});	
	showAllOptionsInSettingsUI = (! isVideoRecordInProgress);
	//If video record inprogress; dont allow the user settings update
	showModifyCameraDialogUI();
});

showModifyCameraDialogUI = function() {
	if(camera_id_for_modification == -1) {
		showErrorStatus('Failed to modify as camera as the required id is not found');
		return;
	}
	var camera_id = camera_id_for_modification;
	var camera = getCameraDetailsById(camera_id);
	if(camera == null) {
		showErrorStatus('Failed to modify as camera details are not found');
		return;
	}	

	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.removeClass('modify_camera_dialog_container', 'dont-show');
	
	dojo.byId('modify_camera_error_status').innerHTML = '';
	dojo.byId('modify_camera_name').value = camera['node_name'];
	dojo.byId('modify_camera_type').value = camera['node_type'];
	dojo.byId('modify_camera_location').value = camera['node_location'];
	dojo.byId('modify_camera_url').value = camera['node_url'];
	dojo.byId('modify_camera_username').value = camera['node_username'];
	dojo.byId('modify_camera_password').value = camera['node_password'];
	dojo.byId('modify_camera_desc').value = camera['node_desc'];
	
	var recorderType  = camera["video_recorder_type"];
	if(dojo.string.trim(recorderType) == "0") {
		dojo.byId('modify_recorder_type_rtsp').checked = true;
	} else if(dojo.string.trim(recorderType) == "1") {
		dojo.byId('modify_recorder_type_mjpeg').checked = true;
	}
	
	if(! showAllOptionsInSettingsUI) {
		dojo.byId('modify_camera_error_status').innerHTML = 'Cannot modify the camera settings when video recording is in-progress';
		dojo.addClass('modify_camera_btn', 'disabled');
	} else {
		dojo.removeClass('modify_camera_btn', 'disabled');
	}
	dojo.byId('modify_camera_id').value = camera_id;
}

showModifyCameraDialog = function(camera_id) {

	if( 'admin_id' in dataStore) {
		camera_id_for_modification = camera_id;
		var conn = new modules.BoardConnectionHandler;
		conn.sendPostData('/board/getBoardStatus', '&auth_id=' +dataStore['auth_id'], 'BoardStatusResponseForModifyCamera');	
	} else {
		try {
			throw new Error('Enable Admin Session to modify Camera');
		} catch(err) {
			handleException(err, true, 'Error');
		}	
	}
}

modifyCamera = function() {

	var cameraName = dojo.string.trim(dojo.query('div#modify_camera_dialog_container input#modify_camera_name')[0].value);
	var cameraType = dojo.string.trim(dojo.query('div#modify_camera_dialog_container input#modify_camera_type')[0].value);
	var cameraLocation = dojo.string.trim(dojo.query('div#modify_camera_dialog_container input#modify_camera_location')[0].value);
	var cameraURL = dojo.string.trim(dojo.query('div#modify_camera_dialog_container input#modify_camera_url')[0].value);
	var cameraUsername = dojo.string.trim(dojo.query('div#modify_camera_dialog_container input#modify_camera_username')[0].value);
	var cameraPassword = dojo.string.trim(dojo.query('div#modify_camera_dialog_container input#modify_camera_password')[0].value);
	var cameraDesc = dojo.string.trim(dojo.query('div#modify_camera_dialog_container textarea#modify_camera_desc')[0].value);

	if(cameraName.length <= 0) {
		showModifyCameraError('Camera Name cannot be empty');
		document.getElementById('modify_camera_name').focus();
		return;
	}
	if(cameraType.length <= 0) {
		showModifyCameraError('Camera Type cannot be empty');
		document.getElementById('modify_camera_type').focus();
		return;
	}
	if(cameraLocation.length <= 0) {
		showModifyCameraError('Camera Location cannot be empty');
		document.getElementById('modify_camera_location').focus();
		return;
	}
	if(cameraURL.length <= 0) {
		showModifyCameraError('Camera URL cannot be empty');
		document.getElementById('modify_camera_url').focus();
		return;
	}
	if(cameraUsername.length <= 0) {
		showModifyCameraError('Camera Username cannot be empty');
		document.getElementById('modify_camera_username').focus();
		return;
	}
	if(cameraPassword.length <= 0) {
		showModifyCameraError('Camera Password cannot be empty');
		document.getElementById('modify_camera_password').focus();
		return;
	}	
	if(cameraDesc.length <= 0) {
		showModifyCameraError('Camera Desc cannot be empty');
		document.getElementById('modify_camera_desc').focus();
		return;
	}	

	var videoRecorderType = 0;	//default RTSP;
	if(dojo.query('div#modify_camera_dialog_container input#modify_recorder_type_rtsp')[0].checked) {
		videoRecorderType = 0;
	} else if(dojo.query('div#modify_camera_dialog_container input#modify_recorder_type_mjpeg')[0].checked) {
		videoRecorderType = 1;
	}
	
	
	dojo.removeClass('modify_camera_error_status', 'dont-show');
	dojo.removeClass('modify_camera_error_status', 'label-danger');
	dojo.removeClass('modify_camera_error_status', 'label-default');
	
	dojo.byId('modify_camera_error_status').innerHTML = 'Modify camera...';
	var node_port = '-1';
	var node_local_store = '';
	var node_model = '1';				//Zavi type;
	var node_video_profile_id = '1';	// As_Source
	
	
	var data = 'user_id=' + dataStore['admin_id'] + '&board_id=' + dataStore['board_id'] + '&node_type=' + cameraType + '&node_port=' + node_port;
	data += '&node_name=' + cameraName + '&node_location=' + cameraLocation + '&node_desc=' + cameraDesc;
	data += '&node_url=' + cameraURL + '&node_username=' + cameraUsername + '&node_password=' + cameraPassword;
	data += '&video_recorder_type=' + videoRecorderType;
	data += '&node_video_profile_id=' + node_video_profile_id + '&node_video_local_store=' + node_local_store + '&node_model_id=' + node_model + '&auth_id=' + dataStore['auth_id'] + '&node_id=' + dojo.byId('modify_camera_id').value;
	console.log('Posting data:' + data);

	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/modifyNode', data, 'modifyNodeSignalNew');		
}

dojo.subscribe('modifyNodeSignalNew', function(e) {
	console.log('modifyNodeSignalNew response has come. Value:' + dojo.toJson(e, true));
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	try {
		if(e.status === 'SUCCESS') {
			closeCameraModifyEditorDialog();
			loadCameras();
			return;
		} else {
			showModifyCameraError(e.error_info);
		}
	} catch(err) {
		showModifyCameraError(err.message);
	}	
});