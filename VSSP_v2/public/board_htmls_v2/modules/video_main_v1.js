var total_no_cameras_supported = 6;
var no_of_cameras_per_row = 3;
var no_of_videos_per_row = 6;
var dataStore = {};
var cameraDetails = {};
cameraDetails['cameras'] = [];
var grid_video_dimension = [256, 192];	//288x216, 256x192, 160x120
var detailed_video_dimension = [640, 480];	//288x216, 256x192, 160x120
var currentPlayingVideoID = -1;
var videoTags = [];
var currentCamera = -1;
var currentCameraVideoList = [];

showSuccessStatus = function(msg) {
	dojo.removeClass('status_container', 'dont-show');
	dojo.removeClass('status', 'label-danger');
	dojo.addClass('status', 'label-success');
	dojo.byId('status').innerHTML = msg;
	
	setTimeout(function() {
		dojo.addClass('status_container', 'dont-show');
		dojo.byId('status').innerHTML = '';
	}, 2000);
}

showErrorStatus = function(msg) {
	dojo.removeClass('status_container', 'dont-show');
	dojo.removeClass('status', 'label-success');
	dojo.addClass('status', 'label-danger');
	dojo.byId('status').innerHTML = msg;
	
	setTimeout(function() {
		dojo.addClass('status_container', 'dont-show');
		dojo.addClass('status', 'dont-show');
		dojo.byId('status').innerHTML = '';
	}, 2000);
}


var getCookies = function(){
	var pairs = document.cookie.split(";");
	console.log('Cookies pairs:' + dojo.toJson(pairs, true));
	var cookies = {};
	for (var i=0; i< pairs.length; i++) {
		if(dojo.string.trim(pairs[i]).length > 0) {
			var pair = pairs[i].split("=");
			if(pair != undefined) {
				cookies[dojo.string.trim(pair[0])] = unescape(dojo.string.trim(pair[1]));
			}
		}
	}
	return cookies;
}

confirmationYesAction = function(cb, args) {
	closeConfirmationAlert();
	
	cb(args);
}

closeConfirmationAlert = function() {
	dojo.addClass('confirmation_alert', 'dont-show');
	dojo.byId('confirmation_msg').innerHTML = '';
	
	dojo.attr('confirmation_action_button', 'href', '');
}

showConfirmation = function(msg, cb, args) {
	dojo.removeClass('confirmation_alert', 'dont-show');
	dojo.byId('confirmation_msg').innerHTML = msg;
	
	dojo.attr('confirmation_action_button', 'href', 'javascript:confirmationYesAction(' + cb + ', ' + args + ')');
}

showLoggedInUserDetails = function() {
	
	try {
		var node = dojo.byId('logged_user_details');
		var cookies = getCookies();
		
		console.log('Cookies:' + dojo.toJson(cookies, true));
		var loggedUser = cookies.vssp_user;
		console.log('Logged user from cookie is:' + loggedUser);
		if(loggedUser == undefined) {
			throw new Error("Existing session got expired. Login again.");
		}
		if(dojo.string.trim(loggedUser).length <= 0) {
			throw new Error("Existing session got expired. Login again.");
		} else {
			console.log("Cookie:" + loggedUser + ";");
		}
		loggedUserData = loggedUser.split(':');
		dataStore['auth_id'] = loggedUserData[0];
		dataStore['username'] = loggedUserData[1];
		dataStore['user_id'] = dataStore['username']; //loggedUserData[2];
		dataStore['board_id'] = loggedUserData[3];
		//dataStore['admin_id'] = '1';
		dataStore['server_connection'] = '0';
		if(loggedUser) {
			node.innerHTML = loggedUserData[1];
		}
		
		getBoardDetails();
	} catch(err) {
		//console.log('Failed while getting the session cookie data. Error:' + err);
		handleException(err, false);
	}
}

getAllVideoTags = function() {
	var conn = new modules.BoardConnectionHandler;
	conn.sendGetData('/board/getVideoTags?auth_id=' + dataStore['auth_id'], '', 'GetVideoTagsSignalNew');			
}

dojo.subscribe('GetVideoTagsSignalNew', function(e) {
	console.log('GetVideoTagsSignalNew response has come. Value:' + dojo.toJson(e, true));
	videoTags = [];
	try {
		if(e.status === 'SUCCESS') {
			if(e.items) {
				e.items.forEach(function(r) {
					videoTags.push(r);
				});
			}
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		handleException(err, true);
	}	
});

signOut = function() {
	console.log('Signing out...');
	var url = '/signOut';
	var data = 'auth_id=' + dataStore['auth_id'];
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData(url, data, 'SignOutSignal');	
}
dojo.subscribe('SignOutSignal', function(e) {
	console.log('SignOutSignal response has come. Value:' + dojo.toJson(e, true));
	window.location = './index.html';
});

authenticateAdminUser = function() {
	dojo.removeClass('admin_auth_error_status', 'dont-show');
	var username = dojo.string.trim(dojo.byId('admin_username').value);
	var pwd = dojo.string.trim(dojo.byId('admin_password').value);
	if(username.length <= 0) {
		dojo.byId('admin_auth_error_status').innerHTML = 'Admin Username cannot be empty';
		document.getElementById('admin_username').focus();
		return;
	}
	if(pwd.length <= 0) {
		dojo.byId('admin_auth_error_status').innerHTML = 'Admin Password cannot be empty';
		document.getElementById('admin_password').focus();
		return;
	}

	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/isUserAdmin', 'username=' + username + '&password=' + pwd + '&auth_id=' + dataStore['auth_id'], 'UserAdminAuthenticationSignalNew');
}

dojo.subscribe('UserAdminAuthenticationSignalNew', function(e) {
	console.log('User admin authentication response has come. Value:' + dojo.toJson(e, true));
	dojo.removeClass('admin_auth_error_status', 'dont-show');
	try {
		if(e.status === 'SUCCESS') {
			dojo.addClass('admin_auth_error_status', 'dont-show');
			dataStore['admin_id'] = e.result;
			//$('#admin_authenticate_dialog').modal('hide');
			closeAdminAuthenticateDialog();
			if(dojo.byId('enableDisableAdmin')) {
			//	dojo.byId('enableDisableAdminSession').innerHTML = 'Disable Admin Session';
				dojo.byId('enableDisableAdmin').innerHTML = 'Disable Admin Session';
			}
			showSuccessStatus('Successfully authenticated as Admin. Pls. continue the task...');
			enableDisableControlsBasedOnAdminLoginSession();
		} else {
			dojo.byId('admin_auth_error_status').innerHTML = e.error_info;
		}
	} catch(err) {
		dojo.byId('admin_auth_error_status').innerHTML = err.message;
	}	
});

closeAdminAuthenticateDialog = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('admin_dialog_container', 'dont-show');
}

showAdminAuthenticateDlg = function() {

	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 

	dojo.removeClass('admin_dialog_container', 'dont-show');
	dojo.addClass('admin_auth_error_status', 'dont-show');
	//$('#admin_authenticate_dialog').modal('show');
	dojo.byId('admin_timeout_display').innerHTML = dataStore['admin_login_timeout'];
	document.getElementById('admin_username').value = '';
	document.getElementById('admin_password').value = '';
	document.getElementById('admin_username').focus();
}

enableDisableAdminSession = function() {
	//
	if('admin_id' in dataStore) {
		disableAdminSession();
	} else {
		showAdminAuthenticateDlg();
	}
}

disableAdminSession = function() {
	if('admin_id' in dataStore) {
		delete dataStore['admin_id'];
		dojo.byId('enableDisableAdmin').innerHTML = 'Enable Admin Session';
		showSuccessStatus('Admin session has been disabled');
		enableDisableControlsBasedOnAdminLoginSession();
	} 
}

monitorAdminLoginTimeout = function() {
	if(dataStore['admin_login_timeout']) {
		var timeOut = dataStore['admin_login_timeout'] * 1000;
		
		setInterval(function() {
			disableAdminSession();
		}, timeOut);
	}
}

getBoardDetails = function() {
	var board = new modules.BoardNodeHandler;
	board.getBoardDetails(dataStore['auth_id']); 	
}

dojo.subscribe('GetBoardDetailsSignal', function(e) {
	console.log('GetBoardDetailsSignal response has come. Value:' + dojo.toJson(e, true));
	//dojo.attr(dojo.byId('loader'), "style", "display:none");
	try {
		if(e.status == 'SUCCESS') {
			dataStore['video_server_conf'] = e.board_details['video_server_config'];
			dataStore['admin_login_timeout'] = e.board_details['admin_login_timeout'];
			dataStore['mjpeg_img_refresh_in_ms'] = e.board_details['mjpeg_img_refresh_in_ms'];
			
			dataStore['backup_videos_web_options'] = e.board_details['backup_videos_web_options'];
			monitorAdminLoginTimeout();
			console.log('The dataStore value is:' + dojo.toJson(dataStore, true));
			enableDisableControlsBasedOnAdminLoginSession();
			loadCameras();
		} else {
			throw new Error("Unauthorized Access");
		}
	} catch(err) {
		handleException(err, false);
	}
});			

closeExceptionAlert = function() {
	dojo.addClass('exception_alert', 'dont-show');
	dojo.byId('exception_msg').innerHTML = '';
}

handleException = function(err, continueFlag, caption) {
	dojo.removeClass('exception_alert', 'dont-show');
	dojo.byId('exception_msg').innerHTML = err.message;
	
	if(continueFlag) {
		dojo.removeClass('exception_type', 'alert-danger');
		dojo.addClass('exception_type', 'alert-warning');
		dojo.addClass('exception_login_button', 'dont-show');
		dojo.removeClass('exception_continue_button', 'dont-show');
	} else {
		dojo.addClass('exception_type', 'alert-danger');
		dojo.removeClass('exception_type', 'alert-warning');
		dojo.removeClass('exception_login_button', 'dont-show');
		dojo.addClass('exception_continue_button', 'dont-show');
	}
	
	if(caption != undefined) {
		dojo.byId('exception_header').innerHTML = caption;
	} else {
		dojo.byId('exception_header').innerHTML = 'System Fault !!!';
	}
}

enableAdminOptions = function(status) {
	/*
	if(! status) {
		$('#add_camera').addClass('disabled');
		$('#add_camera').removeAttr('data-toggle');
	} else {
		$('#add_camera').removeClass('disabled');
		$('#add_camera').attr('data-toggle', 'modal');
	}
	*/
}


dojo.addOnLoad(function() {
	console.log('Version:' + dojo.version);
	try {
		enableAdminOptions(false);
		showLoggedInUserDetails();
	} catch(err) {
		handleException(err, false);
	}
});



loadCameras = function() {
	cameraDetails['cameras'] = [];
	var conn = new modules.BoardConnectionHandler;
	var url = '/board/root';
	var data = 'id=' + dataStore['board_id'] + '&user_id=' + dataStore['user_id'] + '&auth_id=' + dataStore['auth_id'];
	conn.sendGetData(url, data, 'CameraListSignal');	
}

dojo.subscribe('CameraListSignal', function(e) {
	console.log('CameraListSignal response has come. Value:' + dojo.toJson(e, true));
	if(e.children) {
		createCameraButtons(e.children);
	} else {
		showErrorStatus('Failed to get the cameras configured in the board');
	}
});

getVLCPlugInVideoDetailedView = function(camera, width, height) {
	var data = '<div id=liveDetailedCameraView_' + camera.node_id + ' ><embed type=\'application/x-vlc-plugin\' pluginspage=\'http://www.videolan.org\' id=\'cameraLiveViewVideoControl_' +  camera.node_id + '\'';
	data += ' src=\'' + camera.node_url + '\' width=\'' + width + 'px\'  height=\'' + height + 'px\' />';
	data += '<object classid=\'clsid:9BE31822-FDAD-461B-AD51-BE1D1C159921\' codebase=\'http://download.videolan.org/pub/videolan/vlc/last/win32/axvlc.cab\'></object>';
	data += '</div>';
	return data;
}

getVLCPlugInVideo = function(camera, cameraIndex, width, height) {
	var data = '<div id=liveGridCameraView_' + camera.node_id + ' onclick="showCameraDetails(' + camera + ')"><embed type=\'application/x-vlc-plugin\' pluginspage=\'http://www.videolan.org\' id=\'gridCameraLiveViewVideoControl_' +  camera.node_id + '\'';
	data += ' src=\'' + camera.node_url + '\' width=\'' + width + 'px\'  height=\'' + height + 'px\'  onclick=\'javascript:openCamera(' + camera.node_id + ')\'/>';
	data += '<object classid=\'clsid:9BE31822-FDAD-461B-AD51-BE1D1C159921\' codebase=\'http://download.videolan.org/pub/videolan/vlc/last/win32/axvlc.cab\'></object>';
	data += '</div>';
	return data;
}

getDummyVLCPlugInVideo = function(cameraIndex, width, height) {
	var data = '<div id=liveDummyCamera_' + cameraIndex + '><img src=\'./img/NoCameraSignal.png\' width=' + width + 'px height=' + height + '></img>';
	data += '</div>';
	return data;
}

getMJPEGImageViewVideoInGrid = function(camera, cameraIndex, width, height) {
	var data = '<div id=\'liveGridCameraView_' + camera.node_id + '\' onclick="showCameraDetails(' + camera + ')" >';
	data += '<img id=\'gridCameraLiveViewImageControl_' +  camera.node_id + '\'';
	data += '  width=\'' + width + 'px\'  height=\'' + height + 'px\' />';
	data += '</div>';
	return data;
}


getCameraForGridView = function(camera, index) {
	var camera_name = 'No Camera';
	var camera_id = '';
	var recording_inprogress = false;
	if(camera != null) {
		camera_name = camera['node_name']
		camera_id = camera['node_id'];
		recording_inprogress = camera['recording_inprogress'];
	}
	var data = '<div class="panel panel-primary"><div class="panel-heading"><a href="javascript:loadSelectedCamera(' + camera_id + ');"><h3 class="panel-title" id="liveCameraCaption_' + camera_id + '" >';
	data += camera_name;
	if(recording_inprogress) {
		data += '<span class="pull-right"><img id="camera_recording_inprogress_' + camera_id + ' class="dont-show" src="./img/record_inprogress.gif"/></span>';
	}
	data += '</h3></a></div>';
	data += '<div class="grid-panel-body">';
	if(camera != null) {
		if(startsWith(camera.node_url, 'http')) {
			data += getMJPEGImageViewVideoInGrid(camera, index, grid_video_dimension[0], grid_video_dimension[1]);
		} else {
			data += getVLCPlugInVideo(camera, index, grid_video_dimension[0], grid_video_dimension[1]);
		}
	} else {
		data += getDummyVLCPlugInVideo(index, grid_video_dimension[0], grid_video_dimension[1]);
	}
	data += '</div></div>'
	return data;
}

getAllCameraGridView = function() {
	var data = '<div class="grid_video"><div class="grid_video_row">';
	var cameras = cameraDetails['cameras'];
	var index = 0;
	var mjpegCameras = [];
	cameras.forEach(function(camera) {
		data += '<div class="grid_video_cell">' + getCameraForGridView(camera, index) + '</div>';
		index ++;
		if(index % no_of_cameras_per_row == 0) {
			data += "</div>";
		}
		
		if(index > cameras.length) {
			data += '<div class="grid_video_row">';
		}
		if(startsWith(camera.node_url, 'http')) {
			mjpegCameras.push(camera);
		}
	});
	for(;index < total_no_cameras_supported; index++) {
		data += '<div class="grid_video_cell">' + getCameraForGridView(null) + '</div>';
	}
	data += '</div></div>';
	
	if(mjpegCameras.length > 0) {
		startMJPEGGridDisplayTimer(mjpegCameras);
	}
	
	return data;
}

startMJPEGGridDisplayTimer = function(mjpegCameras) {
	mjpegCameras.forEach(function(camera) {
		//TODO:: Enable this to view mjpeg stream
		//doPeriodicImageRefreshInGridView(camera);
	});
}

authWithCameraIfNeeded = function(camera) {
		require(['dojo/request/xhr', 'dojo/string', 'dojox/encoding/base64'], function(xhr, string, b64) {
			if(string.trim(camera.node_username).length <= 0) {
				console.log('No username is set. No auth for this camera');
				return;
			}
			
			var url = '/board/proxy?url=' + camera.node_url + '&username=' + camera.node_username + '&password=' + camera.node_password;
			//var url = camera['local_node_url']
			xhr(url).then(function(data){
				console.log('Success in authentication for camera:' + camera.node_name);
			},
			function(error){
				// Display the error returned
				console.log('Failure in authentication for camera:' + camera.node_name + ', Error:' + error);
				
				var imgElement = dojo.byId('gridCameraLiveViewImageControl_' + camera.node_id);
				if(imgElement) {			
					var link = './res/NoCameraSignal.png';
					dojo.attr(imgElement, 'src', link);
				}				
				var imgElement = dojo.byId('liveImage_' + camera.node_id);
				if(imgElement) {
					var link = './res/NoCameraSignal.png';
					dojo.attr(imgElement, 'src', link);
				}
				
			});
		});
}

doPeriodicImageRefreshInGridView = function(camera) {
	setInterval(function() {
		var imgElement = dojo.byId('gridCameraLiveViewImageControl_' + camera.node_id);
		if(imgElement) {			
			var link = getImageLinkForCamera(camera);
			dojo.attr(imgElement, 'src', link);
		}
		/*
		if(authAttempts % 20 == 0) {
			authWithCameraIfNeeded(camera);
		}
		authAttempts++;
		*/
	}, dataStore['mjpeg_img_refresh_in_ms']);
}

getImageLinkForCamera = function(camera) {
	var random = Math.floor(Math.random() * Math.pow(2, 31));
	var uri = '/board/proxy?url=' + camera.node_url + '&username=' + camera.node_username + '&password=' + camera.node_password + '&i=' + random;
	//var uri = camera['local_node_url'] + '?i=' + random;
	return uri;
}

loadAllCameraGridView = function() {
	var nodes = dojo.query('ul#camera_stack li[id^=camera_tab_]');
	nodes.forEach(function(node) {
		var tabId = node.getAttribute('id');
		dojo.removeClass(tabId, 'active');
	});
	dojo.addClass('all_camera_tab', 'active');	
	dojo.byId('selectedCameraDetailsDisplay').innerHTML = getAllCameraGridView();
	
	getAllVideoTags();
	refreshCameraStatusInGridPage();
}

refreshCameraStatusInGridPage = function() {
	var cameras = cameraDetails['cameras'];
	for(var i = 0; i < cameras.length; i++) {
		var camera = cameras[i];
		if(camera) {
			updateVideoRecordingOptions(camera['node_id']);
		}
	}
}

getCameraDetailsById = function(camera_id) {
	var cameras = cameraDetails['cameras'];
	for(var i = 0; i < cameras.length; i++) {
		var camera = cameras[i];
		if(camera['node_id'] == camera_id) {
			return camera;
		}
	}
	return null;
}

loadSelectedCamera = function(camera_id) {
	dojo.removeClass('all_camera_tab', 'active');
	var nodes = dojo.query('ul#camera_stack li[id^=camera_tab_]');
	console.log('No. of nodes:' + nodes.length);
	nodes.forEach(function(node) {
		var tabId = node.getAttribute('id');
		console.log('tab id:' + tabId);
		if(endsWith(tabId, camera_id)) {
			console.log('Setting the active tab to id:' + camera_id);
			dojo.addClass('camera_tab_' + camera_id, 'active');
		} else {
			dojo.removeClass(tabId, 'active');
		}
	});
	dojo.byId('selectedCameraDetailsDisplay').innerHTML = loadCameraDetailsForSelectedCamera(camera_id);
	
	openLiveViewCamera(camera_id);
}


getCameraDetailsForDisplay = function(camera_id) {

	var camera = getCameraDetailsById(camera_id);
	if(camera == undefined) {
		console.log('Failed to get camera details while displaying the camera details');
		return '';
	}
	
	var data = '<div class="panel panel-primary">';
	data += '<div class="panel-heading"><table class="edit_camera"><tr><td class="camera_name"><h3 class="panel-title">';
	data += camera['node_name'];
	data += '</h3></td><td class="options">';
	data += '<a class="nav-link admin" href="javascript:showModifyCameraDialog(' + camera_id + ');"><span class="badge badge-primary"><img src="./img/edit-16.png" alt="Edit" /></span></a>&nbsp;&nbsp;<a class="nav-link current admin" href="javascript:deleteCamera(' + camera_id + ');"><span class="badge badge-primary"><img src="./img/delete-16.png" alt="Delete" /></span></a>';
	data += '</td></tr></table>';
	//var data = '<div class="panel panel-primary">';
	//var data = '<div class="list-group"><a href="javascript:editCamera(' + camera_id + ');" class="list-group-item active">';
	//data += '<span class="badge badge-default">Edit</span>';
	data += '</div>';
	data += '</div>';
	
	
	//data += '<div class="panel-heading"><h3 class="panel-title">' + camera['node_name'] +'&nbsp;&nbsp; [ <a class="text-danger" href="javascript:editCamera(' + camera_id + ');">Edit</a>&nbsp;&nbsp;]</h3></div>';
	
	data += '<table class="table">';
	data += '<tbody>';
	data += '<tr><td>Name</td><td>' + camera['node_name'] + '</td></tr>';
	data += '<tr><td>Type</td><td>' + camera['node_type'] + '</td></tr>';
	data += '<tr><td>Location</td><td>' + camera['node_location'] + '</td></tr>';
	data += '<tr><td>Video URL</td><td>' + camera['node_url'] + '</td></tr>';
	//data += '<tr><td>Usage</td><td>' + humanFileSizeNew(camera['node_files_size'], 1024) + '</td></tr>';
	
	data += '</tbody></table>';
	data += '</div>';
	return data;
}


showControlPanel = function(camera_id) {

	var camera = getCameraDetailsById(camera_id);
	if(camera == undefined) {
		console.log('Failed to get camera details while displaying the control panel');
		return;
	}
	
	var data = '<div class="row">';
	data += '<div class="col-md-12">';
	//data += '<div class="panel panel-primary">';
	//data += '<div class="panel-heading"><h3 class="panel-title">' + camera['node_name'] +' Details </h3></div>';
	//data += '<div class="panel-body">' + getCameraDetailsForDisplay(camera_id) + '</div>';
	data += getCameraDetailsForDisplay(camera_id);
	//data += '</div>';
	data += '</div>';
	data += '</div>';
	
	data += '<div class="row">';
	data += '<div class="col-md-12">';
	data += '<div class="panel panel-primary">';
	data += '<div class="panel-heading"><h3 class="panel-title">Options</h3></div>';
	data += '<div class="panel-body">';
	data += '<button type="button" class="btn btn-success btn-block" id="startRecordingButton" onClick="javascript:startRecord(' + camera_id + ');">Start Recording</button>';
	data += '<button type="button" class="btn btn-danger btn-block" id="stopRecordingButton" onClick="javascript:stopRecord(' + camera_id + ');">Stop Recording</button>';
	data += '</div>';
	data += '</div>';
	data += '</div>';
	data += '</div>';
	
	dojo.byId('selectedCameraTabControlPanelRecordSettings').innerHTML = data;
	
	dojo.removeClass('scheduledVideoRecordSettingsOfSelectedCamera', 'active');
	dojo.addClass('controlpanelOfSelectedCamera', 'active');
	
	updateVideoRecordingOptions(camera_id);
}

startRecord = function(camera_id) {
	var camera = getCameraDetailsById(camera_id);
	if(camera == undefined) {
		console.log('Failed to get camera details while starting the video record');
		return;
	}
	
	var videoDurationForImmediate = '0';
	var selectedVideoProfileID = '1'; //getValue('listVideoProfileForRecord');
	var recordServiceType = '1';	//for record now option
	var enableNotification = 'off';
	var emailList = ' ';
	var recordScheduledType='';
	var startRecordTime = '';
	var endRecordTime = '';
	var scheduledVideoRecordDuration = '';
	var recordScheduledDay = '';
	var selectedDate = '';
	var enableMotionDetect = '';
	var motionSensitivity = '';
	var motionDetectChanges = '';
	
	var data =  'user_id=' + dataStore['user_id'] +  '&node_id=' + camera_id + '&node_name=' + camera['node_name'] + '&immediate_record_duration=' + videoDurationForImmediate + '&video_profile=' + selectedVideoProfileID + '&record_service_type=' + recordServiceType + '&record_schedule_type=' + recordScheduledType + '&start_record_time=' + startRecordTime + '&end_record_time=' + endRecordTime  + '&scheduled_record_duration=' + scheduledVideoRecordDuration + '&record_schedule_day=' + recordScheduledDay + '&selected_date=' + selectedDate + '&auth_id=' +  dataStore['auth_id'];
	data += '&enableMotionDetect=' + enableMotionDetect;
	data += '&motion_detect_sensitive_level=' + motionSensitivity;
	data += '&detect_motion_on_screen=' + motionDetectChanges;
	data += '&enableNotification=' + enableNotification;
	data += '&emailList=' + emailList;
	
	console.log('Record parameters:' + data);

	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/startVideoRecording', data, 'startRecordSignal');					
}

dojo.subscribe('startRecordSignal', function(e) {
	console.log('User Board Camera Start Video Record response has come. Value:' + dojo.toJson(e, true));
	try {
		
		if(e.status === 'SUCCESS') {
			showSuccessStatus('Successfully started the video recording...');
			//enable stop
			dojo.addClass('startRecordingButton', 'disabled');
			dojo.removeClass('stopRecordingButton', 'disabled');	
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		showErrorStatus(err.message);
		console.log(err);
	}	
});

stopRecord = function(camera_id) {
	var camera = getCameraDetailsById(camera_id);
	if(camera == undefined) {
		console.log('Failed to get camera details while stopping the video record');
		return;
	}
	
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/stopVideoRecording', 'user_id=' + dataStore['user_id'] + '&node_id=' + camera_id + '&node_name=' + camera['node_name'] + '&auth_id=' + dataStore['auth_id'], 'stopRecordSignal');					
}

dojo.subscribe('stopRecordSignal', function(e) {
	console.log('User Board Camera Stop Video Record response has come. Value:' + dojo.toJson(e, true));
	try {
		
		if(e.status === 'SUCCESS') {
			showSuccessStatus('Successfully stopped the video recording...');
			//enable stop
			dojo.removeClass('startRecordingButton', 'disabled');
			dojo.addClass('stopRecordingButton', 'disabled');	
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		showErrorStatus(err.message);
		console.log(err);
	}	
});


updateVideoRecordingOptions = function(camera_id) {
	var camera = getCameraDetailsById(camera_id);
	if(camera == undefined) {
		console.log('Failed to get camera details while updating the video recording options the control panel');
		return;
	}
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/isVideoRecordingInProgressInNode', 'node_name=' + camera.node_name + '&auth_id=' + dataStore['auth_id'], 'UpdateVideoRecordingOptionsSignal')			
}

dojo.subscribe('UpdateVideoRecordingOptionsSignal', function(e) {
	console.log('User Board Camera Is Video Recording Available has come. Value:' + dojo.toJson(e, true));
	try {
		//var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			var node_id = e.node_id;
			var liveVideoViewCaption = dojo.byId('liveCameraCaption_' + node_id);
			if(! e.result) {
				//enable start
				console.log("First B4");
				if(dojo.byId('startRecordingButton')) {
					dojo.removeClass('startRecordingButton', 'disabled');
					dojo.addClass('stopRecordingButton', 'disabled');
					console.log('Start / stop buttons have been disabled when result = false');
				}
				if(liveVideoViewCaption) {
					console.log("b4");
					dojo.removeClass('liveCameraCaption_' + node_id, 'record_inprogress');
					console.log('Remove class');
				} else {
					console.log('Camera Caption for camera:' + node_id + ' not found');
				}
			} else {
				//enable stop
				if(dojo.byId('startRecordingButton')) {
					dojo.removeClass('startRecordingButton', 'disabled');
					dojo.addClass('stopRecordingButton', 'disabled');
					console.log('Start / stop buttons have been disabled when result = true');
				}

				if(liveVideoViewCaption) {
					console.log("b4");
					dojo.addClass('liveCameraCaption_' + node_id, 'record_inprogress');
				} else {
					console.log('Camera Caption for camera:' + node_id + ' not found');
				}
			}
			
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		showErrorStatus(err.message);
		console.log(err);
	}	
});

loadScheduledVideoRecordSettingsOfCamera = function(camera_id) {
	var data = 'This is Scheduled Record Settings data of camera:' + camera_id;
	dojo.byId('selectedCameraTabControlPanelRecordSettings').innerHTML = data;
	
	dojo.addClass('scheduledVideoRecordSettingsOfSelectedCamera', 'active');
	dojo.removeClass('controlpanelOfSelectedCamera', 'active');
}

openLiveViewCamera = function(camera_id) {
	
	var camera = getCameraDetailsById(camera_id);
	if(camera == undefined) {
		console.log('Failed to open the camera live view. Camera details found to be null');
		return;
	}
	var liveCameraViewData = getVLCPlugInVideoDetailedView(camera, detailed_video_dimension[0], detailed_video_dimension[1]);
	
	var data = '<div class="row">';
	data += '<div class="col-xs-6">';
	data += liveCameraViewData;
	data += '</div>';
	data += '<div class="col-xs-5">';
	data += '<div class="panel">';
	data += '<div class="tabbable tabs-below">';
	data += '<div id="selectedCameraTabControlPanelRecordSettingsPanel">';
	data += '<div class="tab-pane fade active in" id="selectedCameraTabControlPanelRecordSettings"></div>';
	data += '</div>';
	data += '<ul class="nav nav-tabs nav-justified">';
	data += '<li id="controlpanelOfSelectedCamera" class="active"><a href="javascript:showControlPanel(' + camera_id + ')">Control Panel</a></li>';
	data += '<li id="scheduledVideoRecordSettingsOfSelectedCamera"><a href="javascript:loadScheduledVideoRecordSettingsOfCamera(' + camera_id + ')">Scheduled Video Record Settings</a></li>';
	data += '</ul>';	
	data += '</div>';
	data += '</div>';
	data += '</div>';
	data += '</div>';	
	
	dojo.byId('currentCameraDetails').innerHTML = data;
	showControlPanel(camera_id);
	enableDisableControlsBasedOnAdminLoginSession();
	dojo.removeClass('openVideosListOfSelectedCamera', 'active');
	dojo.addClass('openLiveViewSelectedCamera', 'active');
}

enableDisableControlsBasedOnAdminLoginSession = function() {
		
	var adminSessionFound = false;
	
	if('admin_id' in dataStore) {
		//admin is enabled in this session
		adminSessionFound = true;
		console.log('Admin session found');
	} else {
		console.log('Admin session not found');
	}
	var items = dojo.query('.admin');
	console.log('No items admin enabled:'  + items.length);
	items.forEach(function(item) {
		if(item) {
			//console.log('Item:' + dojo.toJson(item));
			if(adminSessionFound) {
				dojo.removeClass(item, 'dont-show');
			} else {
				dojo.addClass(item, 'dont-show');
			}
		} else {
			console.log('Item is not found');
		}
	});
}

loadVideosFromCamera = function(camera_id) {
	var camera = getCameraDetailsById(camera_id);
	if(camera == undefined) {
		console.log('Failed to open the camera live view. Camera details found to be null');
		return
	}

	/*

	*/

	var url = '/board/listFiles';
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData(url, 'node_name=' + camera.node_name + '&node_id=' + camera.node_id + '&auth_id=' + dataStore['auth_id'], 'CameraVideosListSignalNew');		
}

dojo.subscribe('CameraVideosListSignalNew', function(e) {
	console.log('CameraVideosListSignal response has come. response is:' + dojo.toJson(e, true));
	try {
		if(e.status === 'SUCCESS') {
			loadImagesFromCameraNew(e.result, e.node_name, e.node_id, e.total_recorded_duration, e.total_size);
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		handleException(err, true);
	}	
});

toggleVideoThumbNail = function(checkBoxID) {
	//var checkBoxID = videoCheckBox.getAttribute('id');
	//checkBoxID = checkBoxID.replace('checkBoxVideo_', '');
	var videoCheckBox = dojo.byId('checkBoxVideo_' + checkBoxID);
	videoCheckBox.checked = (! videoCheckBox.checked);
	if(videoCheckBox.checked) {

		dojo.removeClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-primary');
		dojo.addClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-warning');
		
		dojo.removeClass('btnVideoCheck_' + checkBoxID, 'btn-primary');
		dojo.addClass('btnVideoCheck_' + checkBoxID, 'btn-warning');
		
		
		dojo.removeClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-unchecked')
		dojo.addClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-check')
	} else {
		dojo.addClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-primary');
		dojo.removeClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-warning');

		dojo.addClass('btnVideoCheck_' + checkBoxID, 'btn-primary');
		dojo.removeClass('btnVideoCheck_' + checkBoxID, 'btn-warning');
		
		dojo.addClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-unchecked')		
		dojo.removeClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-check')
	}
	
	//panelHeadingVideoThumbnail_
	updateNoOfFilesSelected();
}

selectVideoThumbNail = function(checkBoxID, status) {
	//var checkBoxID = videoCheckBox.getAttribute('id');
	//checkBoxID = checkBoxID.replace('checkBoxVideo_', '');
	var videoCheckBox = dojo.byId('checkBoxVideo_' + checkBoxID);
	videoCheckBox.checked = status; //(! videoCheckBox.checked);
	if(videoCheckBox.checked) {
		
		dojo.removeClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-primary');
		dojo.addClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-warning');
		
		dojo.removeClass('btnVideoCheck_' + checkBoxID, 'btn-primary');
		dojo.addClass('btnVideoCheck_' + checkBoxID, 'btn-warning');
		
		
		dojo.removeClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-unchecked')
		dojo.addClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-check')
	} else {
		dojo.addClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-primary');
		dojo.removeClass('panelHeadingVideoThumbnail_' + checkBoxID, 'panel-warning');

		dojo.addClass('btnVideoCheck_' + checkBoxID, 'btn-primary');
		dojo.removeClass('btnVideoCheck_' + checkBoxID, 'btn-warning');
		
		dojo.addClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-unchecked')		
		dojo.removeClass('displayCheckUnCheck_' + checkBoxID, 'glyphicon-check')
	}
	
	//panelHeadingVideoThumbnail_
	updateNoOfFilesSelected();
}

updateNoOfFilesSelected = function() {
	
	var filesSelected = 0;
	require(['dojo/query'], function(qry) {
		var checkBoxes = qry('input[id^=checkBoxVideo_]');
		checkBoxes.forEach(function(checkBox) {
			if(checkBox.checked) {
				filesSelected++;
			}
			dojo.byId('noOfSelectedFiles').innerHTML = filesSelected;
		});
	});	
	//noOfSelectedFiles
}

closeVideoPlayerDialog = function() {
	dojo.removeClass('nav_bar_header', 'disabled');
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('video_player_dialog_container', 'dont-show');
}

setVideoTagNew = function(video_tag_id, video_file, file_id) {
	var conn = new modules.BoardConnectionHandler;
	var data = 'video_id=' + file_id + '&video_file=' + video_file + '&video_tag_id=' + video_tag_id + '&auth_id=' +dataStore['auth_id'];
	conn.sendPostData('/board/updateVideoTag', data, 'UpdateVideoTagSignalNew');			
}

dojo.subscribe('UpdateVideoTagSignalNew', function(e) {
	console.log('UpdateVideoTagSignal response has come. value:' + dojo.toJson(e, true));
	try {
		if(e.status === 'SUCCESS') {
			//<input type=hidden id=' + video.timestamp + ' name=' + video.timestamp + ' value=\'' + getVideoJson(video) + '\'/>
			var obj = e.result;
			if(obj) {
				var timestamp = obj['timestamp'];
				if(timestamp) {	
					var updatedVideoElement = document.getElementById('video_json_' + timestamp);
					if(updatedVideoElement) {
						updatedVideoElement.value = JSON.stringify(obj);
						console.log('Updated video element:' +  updatedVideoElement.value);
						loadVideoTagForVideo(obj);
					} else {
						console.log('Element not found video:' + timestamp);
					}
				} else {
					console.log('Timestamp found to be null');
				}
			}
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		showErrorStatus(err.message);
		console.log(err);
	}	
});

loadVideoTagForVideo = function(video) {
	var data = '<div class="col-xs-2 video-tags">Tags</div>';
	var fileToPlay = dojo.string.trim(video.Path);
	var id = video.timestamp;
	videoTags.forEach(function(video_tag) {
		var checked = false;
		if(video['tag'] != undefined) {
			if(video['tag'] == video_tag['video_tag_id']) {
				data += '<div class="col-xs-2"><button type="button" class="btn btn-success video-tags">' + video_tag['video_tag_name'] + '</button></div>';
			} else {
				data += '<div class="col-xs-2"><button type="button" class="btn btn-default video-tags" onClick="javascript:setVideoTagNew(' + video_tag['video_tag_id'] + ', \'' + video.Path + '\', ' + id + ');">' + video_tag['video_tag_name'] + '</button></div>';
			}
		}
	});
	dojo.byId('video_tags').innerHTML = data;
}
		
loadPreviousVideo = function() {
	
	//var videoControl = document.getElementById('videoplayer_vlc');
	//videoControl.src = '';	
	dojo.addClass('videoPlayerDiv', 'dont-show');	
	
	var prevVideo = dojo.byId('prev_video_json_' + currentPlayingVideoID);
	if(prevVideo) {
		var prevVideoObject = JSON.parse(prevVideo.value);
		alert('Loading prev video:' + prevVideoObject['timestamp']);
		playVideoNewVersion(prevVideoObject['timestamp']);
	} else {
		showErrorStatus('Prev video is not available');
	}
}

loadNextVideo = function() {

	dojo.addClass('videoPlayerDiv', 'dont-show');	

	var nextVideo = dojo.byId('next_video_json_' + currentPlayingVideoID);
	if(nextVideo) {
		var nextVideoObject = JSON.parse(nextVideo.value);
		alert('Loading next  video:' + nextVideoObject['timestamp']);
		playVideoNewVersion(nextVideoObject['timestamp']);
	} else {
		showErrorStatus('Next video is not available');
	}
}

getVideoPlayer = function() {
	var data = '<embed type="application/x-vlc-plugin" pluginspage="http://www.videolan.org" id="videoplayer_vlc" width="640px" height="360px" autoplay="yes"/>'
	data += '<object classid="clsid:9BE31822-FDAD-461B-AD51-BE1D1C159921" codebase="http://download.videolan.org/pub/videolan/vlc/last/win32/axvlc.cab"></object>';
	return data;
}

playVideoNewVersion = function(id) {
	
	dojo.addClass('nav_bar_header', 'disabled');
	currentPlayingVideoID = id;
	var selectedVideo = dojo.byId('video_json_' + id);
	if(selectedVideo === undefined || selectedVideo === null) {
		showErrorStatus("Failed to play the selected video");
		return;
	}
	//alert('Value is:' + selectedVideo.value);
	var videoObj = JSON.parse(selectedVideo.value);
	if(videoObj == null) {
		showErrorStatus('Selected video object is found to be null');
		return;
	}
	dojo.removeClass('videoPlayerDiv', 'dont-show');	
	
	//
	//dojo.empty('videoPlayerDiv');
	//dojo.byId('videoPlayerDiv').innerHTML = getVideoPlayer();
	console.log('path for id:' + id + ' is:' + videoObj.Path);
	var fileToPlay = dojo.string.trim(videoObj.Path);
	if(fileToPlay.length <= 0) {
		showErrorStatus('File name to be played is found as null / empty');
		return ;
	}
	
	dojo.byId('fileToPlay').innerHTML = getFileNameOnly(dojo.string.trim(videoObj['Path']))
	dojo.byId('selected_video_meta_data').innerHTML = getSelectedVideoMetataInTable(videoObj);
	var mediaFile = dataStore['video_server_conf'] + fileToPlay;
	//var mediaFile = 'rtsp://192.168.2.3:554/video.mp4';
	var videoControl = document.getElementById('videoplayer_vlc');
	//var videoControl = document.getElementById('videoplayer');
	//document.videoplayer_vlc.stop();
	//dojo.empty('videoplayer');
	//var source = document.createElement('source');
	//source.setAttribute('src', mediaFile);
	//mediaFile = '/board/downloadFile?file=' + fileToPlay +'&auth_id=' + dataStore['auth_id'];
	//videoControl.innerHTML = '<source src="' + mediaFile + '" type="video/mp4" />';
	//console.log('VC:' + videoControl);
	//videoControl.playlist.clear();
	//videoControl.playlist.add(mediaFile);
	//videoControl.playlist.play();
	videoControl.src = mediaFile;
	//if (! videoControl.paused) {
        //videoControl.stop();
	//}

	//document.videoplayer_vlc.play();
	//videoControl.setAttribute('src', mediaFile);
	//videoControl.appendChild(source);
	//videoControl.play();
	
	//videoControl.src = mediaFile;	
	console.log('Media file:' + mediaFile);
	dojo.removeClass('video_player_dialog_container', 'dont-show');
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	
	loadVideoTagForVideo(videoObj);
	
	/*
	//console.log('Looking for prev / next for:' + id);
	var prevVideo = dojo.byId('prev_video_json_' + id);
	if(prevVideo) {
		var prevVideoObject = JSON.parse(prevVideo.value);
		//console.log('Prev:' + dojo.toJson(prevVideoObject));
		if(Object.keys(prevVideoObject).length > 0) {
			dojo.removeClass('prevVideo', 'disabled');
		} else {
			dojo.addClass('prevVideo', 'disabled');		
		}
	} else {
		console.log('Prev Video id is not found');
	}
	
	var nextVideo = dojo.byId('next_video_json_' + id);
	if(nextVideo) {
		var nextVideoObject = JSON.parse(nextVideo.value);
		//console.log('Next:' + dojo.toJson(nextVideoObject));
		if(Object.keys(nextVideoObject).length > 0) {
			dojo.removeClass('nextVideo', 'disabled');
		} else {
			dojo.addClass('nextVideo', 'disabled');
		}
	} else {
		console.log('Next Video id is not found');
	}
	*/
}


getSelectedVideoMetataInTable = function(video) {

	var data = '<div class="panel panel-primary">';
	data += '<div class="panel-heading"><h3 class="panel-title">File Details </h3></div>';
	data += '<table class="table reduced-font-size">';
	//data += '<thead><tr><td>Name</td><td>Value</td></tr></thead>';
	data += '<tbody>';
	//data += '<tr><td>File</td><td>' + getFileNameOnly(dojo.string.trim(video['Path'])) + '</td></tr>';
	data += '<tr><td>Title</td><td>' + video['title'] + '</td></tr>';
	data += '<tr><td>Board</td><td>' + video['Board'] + '</td></tr>';
	data += '<tr><td>Camera</td><td>' + video['Node'] + '</td></tr>';
	data += '<tr><td>Duration</td><td>' + video['Duration'] + '</td></tr>';
	data += '<tr><td>Size</td><td>' + humanFileSizeNew(video['Size']) + '</td></tr>';
	data += '<tr><td>FPS</td><td>' + video['FPS'] + '</td></tr>';
	data += '<tr><td>Screen size</td><td>' + video['Screen Size'] + '</td></tr>';
	data += '<tr><td>Video Spec.</td><td>' + video['Video Spec'] + '</td></tr>';
	data += '<tr><td>Recording Started At</td><td>' + video['recording_started_time'] + '</td></tr>';
		
	data += '</tbody></table>';
	data += '</div>';
	//alert(data);
	return data;
}

getFileNameOnly = function(value) {
	if(value == undefined || value == null) {
		return '';
	}
	value = dojo.string.trim(value);
	if(value.length <= 0) {
		return '';
	}
	var index = value.lastIndexOf('/');
	if(index != -1) {
		value = value.substring(index + 1);
	}
	return value;
}


	
getVideoThumbnail = function(video, videoIndex, prevVideo, nextVideo) {
	var img = video['Normal_Image'];
	if(img === undefined) {
		console.log('Image not found for:' +  video['timestamp']);
		return '';
	}
	//console.log('Creating thumbnail for:' + video['timestamp']);
	var data = '<div class="col-sm-6 col-md-2">';
	data += '<div id=panelHeadingVideoThumbnail_' + video['timestamp'] + ' class="panel panel-primary"><div class="panel-heading" onClick="javascript:toggleVideoThumbNail(' + video['timestamp'] + ')">';
	//data += '<table class="video_thumbnail_heading"><tr><td>';
	//data += '<input id="checkBoxVideo_' +  video['timestamp'] + '" type="checkbox" onclick="javascript:selectVideoThumbNail(this);">&nbsp;';
	
	data += '<button type="button" class="btn btn-primary" id="btnVideoCheck_' + video['timestamp'] + '" data-color="primary" onClick="javascript:toggleVideoThumbNail(' + video['timestamp'] + ')";><i id="displayCheckUnCheck_' + video['timestamp'] + '" class="glyphicon glyphicon-unchecked"></i><input type="checkbox" id="checkBoxVideo_' +  video['timestamp'] + '" class="hidden"></button>';
	
	
	data += '<label for="checkBoxVideo_' +  video['timestamp'] + '" class="video_thumbnail_caption">Video</label>';	//' + video['Name'] + '
	//data += '<span class="badge pull-right"><input type="checkbox"></span>';
	data += '</div>';
	data += '<div class="thumbnail">';
	var img = video['Normal_Image'];
	//img =  '/bootflat/' + img.replace('/Zavio/', '/TestCamera/');
	
	data += '<a href="javascript:playVideoNewVersion(' +  video['timestamp'] + ');"><img class="img-rounded-custom" src="' +img + '"></a>';
	data += '<table class="video_thumbnail">';
	data += '<tr>';
	data += '<td class="video_thumbnail_details">';
	data += 'Date:' +  video['recording_started_time'];
	data += '</td>';
	data += '<td rowspan=2 class="right-align">';
	data += '<input type=hidden id="video_json_' + video.timestamp + '" name="video_json_' + video.timestamp + '" value=\'' + JSON.stringify(video) + '\'/>';	
	if(prevVideo != null) {
		data += '<input type=hidden id="prev_video_json_' + video.timestamp + '" name="prev_video_json_' + video.timestamp + '" value=\'' + JSON.stringify(prevVideo) + '\'/>';	
	} else {
		data += '<input type=hidden id="prev_video_json_' + video.timestamp + '" name="prev_video_json_' + video.timestamp + '" value=\'{}\'/>';	
	}
	if(nextVideo != null) {
		data += '<input type=hidden id="next_video_json_' + video.timestamp + '" name="prev_video_json_' + video.timestamp + '" value=\'' + JSON.stringify(nextVideo) + '\'/>';	
	} else {
		data += '<input type=hidden id="next_video_json_' + video.timestamp + '" name="next_video_json_' + video.timestamp + '" value=\'{}\'/>';	
	}
	
	//data += '<a href="/board/downloadFile?file=' + video.Path + '&auth_id=' + dataStore['auth_id'] + '"><img alt="Download" class="image_btn" src="../bootflat/img/download_16.png" /></a>';
	data += '<a href="/board/downloadFile?file=' + video.Path + '&auth_id=' + dataStore['auth_id'] + '"><i class="glyphicon glyphicon-download"/></a>';
	
	
	data += '</td>';
	data += '</tr>';
	data += '<tr>';
	data += '<td class="video_thumbnail_details">';
	data += 'Length:' +  video['Duration'];
	data += '</td>';
	data += '</tr>';
	data += '</table>';

	data += '</div>';	
	//data += '</div>';	//end of panel heading;
	data += '</div>';	//end of panel;
	
	data += '</div>';
	
	
	return data;
}

selectAllVideosInCurrentCamera = function(node_id) {

	//var currentStatus = dojo.byId('selectUnSelectVideoFiles').innerHTML.indexOf('Unselect All') == -1;
	console.log('select unselect all videos');
	
	dojo.byId('checkSelectUnselectAllVideos').checked = (! dojo.byId('checkSelectUnselectAllVideos').checked);
	var currentStatus = (dojo.byId('checkSelectUnselectAllVideos').checked);
	console.log('Current status:' + currentStatus);
	if(currentStatus) {
		dojo.removeClass('selectUnselectAllVideos', 'glyphicon-unchecked');
		dojo.addClass('selectUnselectAllVideos', 'glyphicon-check');
	} else {
		dojo.addClass('selectUnselectAllVideos', 'glyphicon-unchecked');
		dojo.removeClass('selectUnselectAllVideos', 'glyphicon-check');
	}
	require(['dojo/query'], function(qry) {
		var checkBoxes = qry('input[id^=checkBoxVideo_]');
		checkBoxes.forEach(function(checkBox) {
			checkBox.checked = currentStatus;
			var checkBoxID = checkBox.getAttribute('id');
			checkBoxID = checkBoxID.replace('checkBoxVideo_', '');
			selectVideoThumbNail(checkBoxID, currentStatus);
		});

		/*
		if(dojo.byId('selectUnSelectVideoFiles').innerHTML.indexOf('Unselect All') == -1) {
			dojo.byId('selectUnSelectVideoFiles').innerHTML = 'Unselect All'
		} else {
			dojo.byId('selectUnSelectVideoFiles').innerHTML = 'Select All';
		}
		*/
	});
}

unSelectAllVideosInCurrentCamera = function(node_id) {

	require(['dojo/query'], function(qry) {
		var checkBoxes = qry('input[id^=checkBoxVideo_]');
		checkBoxes.forEach(function(checkBox) {
			checkBox.checked = false;
			selectVideoThumbNail(checkBox);
		});
	});
}

deleteSelectedVideosNew = function(camera_id) {
	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null || selectedCamera == undefined) {
		showErrorStatus('Failed to get the camera details for the selected camera');
		return;
	}
	
	
	var videoContainer = 'input[id^=checkBoxVideo_]';
	nodes = dojo.query(videoContainer); 
	var selectedVideos = [];
	dojo.forEach(nodes,function(node) {  
			if(node.checked) {
				selectedVideos.push(node.getAttribute('id').replace('checkBoxVideo_', ''));
			}		
		}
	);
	if(selectedVideos.length > 0) {
		if('admin_id' in dataStore) {
			var confirmMsg = 'No. of files selected to delete:' + selectedVideos.length + '\n\n Do you want to delete ?';
			
			if(confirm(confirmMsg)) {
				var conn = new modules.BoardConnectionHandler;
				conn.sendPostData('/board/clearFiles', 'node_name=' + selectedCamera.node_name + '&node_id=' + selectedCamera.node_id + '&auth_id=' + dataStore['auth_id'] + '&selected_videos=' + selectedVideos.join(), 'DeleteVideoSignalNew');		
			} else {
				console.log('User has cancelled the video file deletion...');
			}
		} else {
			try {
				throw new Error('Enable Admin Session to delete video files');
			} catch(err) {
				handleException(err, true, 'Error');
			}
			return;
		}
	} else {
		try {
			throw new Error('Select Video files to delete');
		} catch(err) {
			handleException(err, true, 'Error');
		}
		return;
	}
};

dojo.subscribe('DeleteVideoSignalNew', function(e) {
	console.log('DeleteVideoSignal response has come. value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			loadVideosFromCamera(e.node_id);
		} else {
			showErrorStatus(e.error_info);
		}
	} catch(err) {
		showErrorStatus(err.message);
		console.log(err);
	}	
});


loadImagesFromCameraNew = function(videos, node_name, node_id, total_record_duration, total_size) {
	
	currentCameraVideoList = [];
	var videoIndex = 0;
	currentPlayingVideoID = -1;
	var totalNoOfVideos = 0;
	videos.forEach(function(video) {
		if(video['Normal_Image'] !== undefined) {
			totalNoOfVideos ++;
			currentCameraVideoList.push(video);
		}
	});
	var data = '<div class="row">';
	data += '<div class="col-xs-12">'; 
	//data += '<div class="list-group"><a class="list-group-item active">';
	//data += '<span id="noOfVideoFilesInSelectedCamera" class="badge badge-default"></span>';
	//data += 'Total no. of files:<span class="left">' + totalNoOfVideos + '</span></a>';
	//data += '</div>';
	data += '<div class="panel panel-primary"><div class="panel-heading"><h3 class="panel-title">';
	//data += '&nbsp;&nbsp;';
	
	//data += '<span class="badge  badge-default"><a id="selectUnSelectVideoFiles" href="javascript:selectAllVideosInCurrentCamera(' + node_id + ');">Select All</a></span>&nbsp;&nbsp;';
	
	//data += '<div class="btn-group" data-toggle="buttons" title="Select / Unselect All Videos" onClick="javascript:selectAllVideosInCurrentCamera(' + node_id + ');"><label class="btn btn-warning"><input type="checkbox" id="selectUnselectAllVideos" autocomplete="off"><span class="glyphicon glyphicon-ok"></span></label></div>';
	
	data += '<button type="button" class="btn btn-primary" data-color="primary" onClick="javascript:selectAllVideosInCurrentCamera(' + node_id + ')";><i id="selectUnselectAllVideos" class="glyphicon glyphicon-unchecked"></i><input type="checkbox" id="checkSelectUnselectAllVideos" class="hidden"></button>';
	
	/*
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-cloud"></i></button><input type="checkbox" class="hidden" /></span>';
	
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-road"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-list-alt"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-qrcode"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-barcode"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-tags"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-bookmark"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-camera"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-list"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-facetime-video"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-picture"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-map-marker"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-share"></i></button><input type="checkbox" class="hidden" /></span>';
	
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-minus"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-search"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-user"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-film"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-off"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-signal"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-cog"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-file"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-time"></i></button><input type="checkbox" class="hidden" /></span>';
	data += '<span class="button-checkbox"><button type="button" class="btn" data-color="primary"><i class="glyphicon glyphicon-download"></i></button><input type="checkbox" class="hidden" /></span>';
	*/
	
	
	data += '<button type="button" class="btn btn-primary" onClick="javascript:loadVideosFromCamera(' + node_id + ');"><i class="glyphicon glyphicon-refresh"></i></button>';
	
	//data += '<button type="button" class="btn btn-primary" onClick="javascript:loadVideosFromCamera(' + node_id + ');"><i class="glyphicon glyphicon-filter"></i></button>';
	
	data += '<button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown"><i class="glyphicon glyphicon-filter"></i><span class="caret"></span></button>';
	data += '<ul class="dropdown-menu" role="menu"><li class="dropdown-submenu"><a href="#">Filter Videos captured in Last</a>';
	data += '<ul class="dropdown-menu">';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 1);">1 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 2);">2 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 3);">3 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 4);">4 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 5);">5 hour</a></li';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 6);">6 hour</a></li>';
	data += '</ul>';
	data += '<li><a href="javascript:showFilterDialogNew(' + node_id + ', 6);">Custom Filter</a></li>';
	data += '</ul>';
	
	
	//data += '<span class="badge  badge-default"><a href="javascript:showFilterDialogNew(' + node_id + ');"><img alt="Filter Videos" src="./img/filter-16.png"/></a></span>&nbsp;&nbsp;';
	data += '<button type="button" class="btn btn-primary" onClick="javascript:deleteSelectedVideosNew(' + node_id + ');"><i class="glyphicon glyphicon-trash"></i></button>';
	
	data += '<button type="button" class="btn btn-primary" data-color="primary" onClick="javascript:showBackupSelectedVideosDialog(' + node_id + ')";><i class="glyphicon glyphicon-share"></i></button>&nbsp;&nbsp;';
		
	data += '<span>No. of files selected <span id="noOfSelectedFiles" class="badge badge-default">0</span></span>';
	data += '<span class="pull-right">Total no. of files:<span class="badge badge-default">' +totalNoOfVideos + '</span>&nbsp;&nbsp;';
	data += 'Usage:<span class="badge badge-default">' + humanFileSizeNew(total_size, 1024) + '</span>&nbsp;&nbsp;';
	data+= 'Total Recorded Duration:<span class="badge badge-default">' + total_record_duration + '</span></span>';
	data +='</h3></div></div>';
	data += '</div>';
	data += '</div>';
	data += '<div id="cameraListVideosContainer">';	
	data += '<div class="row">';
	data += '<div class="col-xs-12">'; 
	
		
	console.log('No. of videos:' + totalNoOfVideos);
	var index = 0;
	if(videos.length > 0) {
		videos.forEach(function(video) {
			if(video['Normal_Image'] !== undefined) {
				var prevVideo = null;
				var nextVideo = null;
				if(index != 0) {
					prevVideo = videos[index - 1];
				}
				if(index < (totalNoOfVideos - 1)) {
					nextVideo = videos[index + 1];
				}
				data += getVideoThumbnail(video, videoIndex, prevVideo, nextVideo);
				videoIndex ++;
				if(videoIndex % no_of_videos_per_row == 0) {
					data += '</div></div><div class="row"><div class="col-xs-12">';
				}
			} else {
				console.log('Normal image is not found for:' + video['timestamp']);
			}
			index ++;
		});
	} else {
		data += '<div class="col-xs-12 text-center"><span class="label label-info">No files are present in the video store of selected camera</span></div>';
	}
	data += '</div></div>';
	data += '</div>';
	dojo.byId('currentCameraDetails').innerHTML = data;
	//dojo.byId('noOfVideoFilesInSelectedCamera').innerHTML =  videoIndex;
	dojo.addClass('openVideosListOfSelectedCamera', 'active');
	dojo.removeClass('openLiveViewSelectedCamera', 'active');
}


loadCameraDetailsForSelectedCamera = function(camera_id) {

	var data = '<div class="panel">';
	data += '<div class="nav nav-tabs nav-justified">';
	data += '<ul id="selectedCameraTab_' + camera_id + '" class="nav nav-tabs">';
	data += '<li class="active" id="openLiveViewSelectedCamera"><a href="javascript:openLiveViewCamera(' + camera_id + ')">Camera Live View</a></li>';
	data += '<li id="openVideosListOfSelectedCamera" class="dropdown"><a href="javascript:loadVideosFromCamera(' + camera_id + ')">Video Gallery</a></li>';
	data += '</ul>';
	data += '<div id="selectedCameraTabContent_' + camera_id + '">';
	data += '<div class="tab-pane fade active in" id="currentCameraDetails">';
	data += '</div>';
	data += '</div>';
	data == '</div>';
	data += '</div>';
	
	return data;
}

getCameraButton = function(camera, index) {
	
	if(index == 0) {
		var data = '<li id="all_camera_tab" class="active">';
		//data += '<a href="javascript:loadAllCameraGridView()">View All Cameras</a>';
		data += '<a href="javascript:getBoardDetails()">View All Cameras</a>';
		data += '</li>';
		return data;
	}
	
	var data = '<li id="camera_tab_' + camera['node_id'] + '" ';
	//if(index == 1) {
	//	data += ' class="active"';
	//}
	data += '>';
	data += '<a href="javascript:loadSelectedCamera(' + camera['node_id'] + ')">' + camera['node_name'] + '</a>';
	data += '</li>';
	
								
	//var data = '<button type="button" class="btn btn-primary">';
	//data += '<span class="badge badge-info">' + camera['node_name'] + '</span>';
	//data += '</button>';
	return data;
}

createCameraButtons = function(cameraList) {
	
	cameraDetails['cameras'] = [];
	console.log('Creating the camera stack container: value:' + dojo.toJson(cameraList, true));
	console.log('No. of cameras found to be:' + cameraList.length);
	if(cameraList.length <= 0) {
		return;
	}
	
	cameraList.forEach(function(camera) {
		cameraDetails['cameras'].push(camera);
	});

	var index = 0;
	
	var data = getCameraButton(null, index);;
	index ++;
	cameraList.forEach(function(camera) {
		data += getCameraButton(camera, index);
		index ++;
	});
	dojo.byId('camera_stack').innerHTML = data;
	loadAllCameraGridView();
}

showSettingsDialog = function() {
	//data-toggle="modal" data-target="#myModal"
	$('#settings_dialog').modal('show');
}
