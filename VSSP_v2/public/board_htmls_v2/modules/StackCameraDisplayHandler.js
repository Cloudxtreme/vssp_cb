
var cameraDetails = {};
cameraDetails['cameras'] = [];
cameraVideoFiles = {};
var listOfAvailableUSBDevices = [];
var selectedVideosForBackUp = [];
var backupVideosMode = 1;
var backupSelectedCamera = '';
var videoTags = [];
var currentBoardSize = 0;
var boardTotalSize = 0;
var cameraContainer;
var cameraController;
var authAttempts = 0;


initStackContainerController = function() {
	console.log('initStackContainerController..start');
	cameraContainer = new dijit.layout.StackContainer({
        //style: "height: 300px; width: 400px;",
        id: "cameraContainer"
    }, 'cameraStackContainer');
	
	cameraController = new dijit.layout.StackController({containerId: "cameraContainer"}, "cameraStackController");
	console.log('initStackContainerController..end');
}

getValue = function(element) {
	return dijit.byId(element).value;
}

loadContainerWithCameraDetails = function() {
	console.log('loadContainerWithCameraDetails..start');
	
	//dojo.attr(dojo.byId('loader'), "style", "display:block");
	var conn = new modules.BoardConnectionHandler;
	var url = '/board/root';
	var data = 'id=' + dataStore['board_id'] + '&user_id=' + dataStore['user_id'] + '&auth_id=' + dataStore['auth_id'];
	conn.sendGetData(url, data, 'CameraListSignal');	
	console.log('loadContainerWithCameraDetails..end');
	
}

/*
dojo.subscribe('CameraListSignal', function(e) {
	console.log('CameraListSignal response has come. Value:' + dojo.toJson(e, true));
	setStatus('List of Cameras have been received.');
	//dojo.attr(dojo.byId('loader'), "style", "display:none");
	if(e.children) {
		createCameraStackContainer(e.children);
	} else {
		setErrorStatus('Failed to get the cameras configured in the board');
	}
});
*/

addGridIndexPage = function(cameraList) {
	
	var gPage = new dijit.layout.ContentPane({
		id: 'gridPageContainer', 
	});
	var videoContainer = new dojox.layout.TableContainer( {
	  cols: 2,
	}, gPage);
	
	
	cameraList.forEach(function(camera) {
		//videoContainer.addChild(getVideoContainer(camera));
	});
	return gPage;
}

openCamera = function(camera_id) {
	//alert('Camera id:' + camera_id);
}

getFlowplayerVideo = function(camera, cameraIndex, width, height) {
	var data = '';
	var url = camera.node_url;
	var firstPortion = url;
	var index = url.lastIndexOf('/');
	if(index != -1) {
		firstPortion  = url.substring(index + 1);
		url = url.substring(0, index);
	}
	data = '<div class="player" data-ratio="0.417" id=liveGridCameraView_' + camera.node_id + '></div>';
	data += "flowplayer('liveGridCameraView_' + camera.node_id , 'flowplayer-3.2.5.swf', {";
	data += "clip: {";
	data += "url : '" + firstPortion + "',"; //this is the name of the stream assset in the encoder
	data += "live : true,";  // tell flowplayer it's live
	data += "provider: 'rtmp'";
	data += "},";
	data += "plugins: {";
	data += "rtmp: {";
	data += "url: './flowplayer-5.4.6/flowplayer.rtmp-3.2.3.swf',";
	data += "netConnectionUrl: '" + url + "',";
	data += "subscribe:true";
	data += "}";
	data += "}";
	data += "});";
	//data += '</div>';
	return data;
}

showCameraDetails = function(camera_id) {
	var camera = getCameraDetailsById(camera_id);
	alert('Showing camera details:' + dojo.toJson(camera));
}

/*
getVLCPlugInVideo = function(camera, cameraIndex, width, height) {
	var data = '<div id=liveGridCameraView_' + camera.node_id + ' onclick="showCameraDetails(' + camera + ')"><embed type=\'application/x-vlc-plugin\' pluginspage=\'http://www.videolan.org\' id=\'gridCameraLiveViewVideoControl_' +  camera.node_id + '\'';
	data += ' src=\'' + camera.node_url + '\' width=\'' + width + 'px\'  height=\'' + height + 'px\'  onclick=\'javascript:openCamera(' + camera.node_id + ')\'/>';
	data += '<object classid=\'clsid:9BE31822-FDAD-461B-AD51-BE1D1C159921\' codebase=\'http://download.videolan.org/pub/videolan/vlc/last/win32/axvlc.cab\'></object>';
	data += '</div>';
	return data;
}

getDummyVLCPlugInVideo = function(cameraIndex, width, height) {
	var data = '<div id=liveDummyCamera_' + cameraIndex + '><img src=\'./res/NoCameraSignal.png\' width=' + width + 'px height=' + height + '></img>';
	data += '</div>';
	return data;
}
*/
getMJPEGImageViewVideo = function(camera, cameraIndex, width, height) {
	var data = '<div id=\'liveGridCameraView_' + camera.node_id + '\' onclick="showCameraDetails(' + camera + ')" >';
	data += '<img id=\'gridCameraLiveViewImageControl_' +  camera.node_id + '\'';
	data += '  width=\'' + width + 'px\'  height=\'' + height + 'px\' />';
	data += '</div>';
	return data;
}



getVideoContainer = function(camera, cameraIndex) {

	var width = camera.width;
	var height = camera.height;
	
	if(width == 0 || width == undefined) {
		//width = 640;
		width = 320;
	}
	if(height == 0 || height == undefined) {
		//height = 480;
		height = 240;
	}
	
	//var data = '<div><div class=\'gridPageCameraNameHeading\'>' + camera.node_name + '</div><br/>';
	//VLC plug-in
	/*
	
	*/
	if(startsWith(camera.node_url, 'http')) {
		data = getMJPEGImageViewVideo(camera, cameraIndex, width, height);
	} else {
		data = getVLCPlugInVideo(camera, cameraIndex, width, height);
	}
	//data = getFlowplayerVideo(camera, cameraIndex, width, height);
	
	var tableData = '<table class=\'gridCameraViewTable\'><tr><th class=\'gridPageCameraNameHeading\' id=\'gridPageCameraHeader_' + camera.node_id + '\'>' + camera.node_name + '</th>';
	//tableData += '<th class=\'gridPageCameraNameHeading\'><a href="javascript:showCameraDetails(\'' + camera.node_id + '\')">Details</a></th>';
	tableData += '</tr>';
	tableData += '<tr><td class=gridCameraVideoContainer>' + data + '</td></tr>';
	tableData += '</table>';
	
	return tableData;
}

getTableRowBreakIndex = function(cameraCount) {
	//if(cameraCount <= 1) {
	//	return 1;
	//}
	/*
	if(cameraCount <= 4) {
		return 2;
	}
	if(cameraCount > 2 && cameraCount < 4) {
		return 2;
	}
	*/
	return 3;
}

getTableColumnWidthPercentage = function(cameraCount) {
	if(cameraCount <= 1) {
		return 100;
	}
	/*
	if(cameraCount <= 4) {
		return 2;
	}
	if(cameraCount > 2 && cameraCount < 4) {
		return 2;
	}
	*/
	return 50;
}

getCameraDetailsById = function(camera_id) {
	var cameraList = cameraDetails['cameras'];
	var selectedCamera = null;
	cameraList.every(function(camera) {
		if(camera.node_id == camera_id) {
			selectedCamera = camera;
			return false;
		} else {
			return true;
		}
	});
	return selectedCamera;
}

removeAllItemsInStack = function() {
	/*
	cameraContainer;
	cameraController;
	*/
	
	cameraContainer.destroyDescendants(false);
	cameraController.destroyDescendants(false);
	
	var cameraList = cameraDetails['cameras'];
	
	var originalLength = cameraList.length;
	for(var i = 0; i < originalLength; i++) {
		cameraList.pop();   //or .shift();
	}
	
	/*
	var list = cameraContainer.getChildren();
	list.forEach(function(cameraTab) {
		cameraContainer.removeChild(cameraTab);
	});
	cameraContainer.removeChild(dijit.byId('gridPageContainer'));
	dijit.byId('gridPageContainer').destroy();
	*/
	
	/*
	var cameraList = cameraDetails['cameras'];
	cameraList.every(function(camera) {
		try {
			if(dijit.byId('content_pane_' + camera.node_id)) {
				dijit.byId('content_pane_' + camera.node_id).destroy();
			}
		} catch(err) { }
	});
	*/
	console.log('All items cleared');
}

function  getDummyVideoContainer(cameraIndex) {
	console.log('Adding dummy container at:' + cameraIndex);
	var width = 320;
	var height = 240;
	data = getDummyVLCPlugInVideo(cameraIndex, width, height);
	//data = getFlowplayerVideo(camera, cameraIndex, width, height);
	
	var tableData = '<table class=\'gridCameraViewTable\'><tr><th class=\'gridPageCameraNameHeading\'>No Camera</th></tr>';
	tableData += '<tr><td class=gridCameraVideoContainer>' + data + '</td></tr>';
	tableData += '</table>';
	
	return tableData;
}

/*
getImageLinkForCamera = function(camera) {
	
	//var l = document.createElement('a');
	//l.href = camera.node_url;
	
	//var uri = l.protocol;
	//uri += '//' + camera.node_username + ':' + camera.node_password + '@' + l.host;
	//uri += '/' + l.pathname;
	//console.log(uri);
	//delete l;
	
	var random = Math.floor(Math.random() * Math.pow(2, 31));
	var uri = '/board/proxy?url=' + camera.node_url + '&username=' + camera.node_username + '&password=' + camera.node_password + '&i=' + random;
	//var uri = camera['local_node_url'] + '?i=' + random;
	return uri;
}
*/

toByteArray = function(str) {
    var bytes = [];
    for (var i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
    }
    return bytes;
};
/*
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
		
		if(authAttempts % 20 == 0) {
			authWithCameraIfNeeded(camera);
		}
		authAttempts++;
	}, dataStore['mjpeg_img_refresh_in_ms']);
}
*/

doPeriodicImageRefreshInCameraView = function(camera) {
	setInterval(function() {
		var imgElement = dojo.byId('liveImage_' + camera.node_id);
		if(imgElement) {
			var link = getImageLinkForCamera(camera);
			dojo.attr(imgElement, 'src', link);
			
			//redraw video recording progress
			highLightIfVideoRecordInProgress(camera);
		}
	}, dataStore['mjpeg_img_refresh_in_ms']);
}

highLightIfVideoRecordInProgress = function(camera) {
	if(camera['video_recording_inprogress']) {
		if(dojo.byId('gridPageCameraHeader_' + camera.node_id)) {
			dojo.addClass(dojo.byId('gridPageCameraHeader_' + camera.node_id), 'recordingInProgress');
		}	
	} else {
		if(dojo.byId('gridPageCameraHeader_' + camera.node_id)) {
			dojo.removeClass(dojo.byId('gridPageCameraHeader_' + camera.node_id), 'recordingInProgress');
		}
	}
}
startMJPEGGridDisplay = function(mjpegCameras) {
	mjpegCameras.forEach(function(camera) {
		
		
		doPeriodicImageRefreshInGridView(camera);
	});
}

createCameraStackContainer = function(cameraList) {
	
	console.log('Creating the camera stack container: value:' + dojo.toJson(cameraList, true));
	console.log('No. of cameras found to be:' + cameraList.length);
	updateCameraListInUserSettings(cameraList);
	if(cameraList.length <= 0) {
		return;
	}
	
	/*
	if(dojo.byId('cameraStackController')) {
		dojo.empty('cameraStackController');	
	}
	*/
	/*
	var widgets = dijit.findWidgets('cameraContainer');
	dojo.forEach(widgets, function(w) {
		w.destroyRecursive(false);
	});
	*/
	
	/*
	var cameraContainer = new dijit.layout.StackContainer({
        //style: "height: 300px; width: 400px;",
        id: "cameraContainer"
    }, 'cameraStackContainer');
	*/
	
	/*
	var settings = new dijit.layout.ContentPane({
		id: 'settingsPageContainer', 
		title: 'Settings'
	});
	*/

	var gPage = new dijit.layout.ContentPane({
		id: 'gridPageContainer', 
		title: 'Grid View'
	});
	
	var data = '<table class=gridTable><tr>';
	var cameraIndex = 1;
	var breakIndex = getTableRowBreakIndex(cameraList.length);
	var widthPercentage = getTableColumnWidthPercentage(cameraList.length);
	var mjpegCameras = [];
	cameraList.forEach(function(camera) {
		
		cameraDetails['cameras'].push(camera);
		data += '<td >' + getVideoContainer(camera, cameraIndex) + '</td>';
		if(cameraIndex % breakIndex == 0) {
			data += '</tr><tr>';
		}
		cameraIndex++;
		if(startsWith(camera.node_url, 'http')) {
			mjpegCameras.push(camera);
		}
	});
	for(;cameraIndex <=6; cameraIndex++) {
		data += '<td >' + getDummyVideoContainer(cameraIndex) + '</td>';
		if(cameraIndex % breakIndex == 0) {
			data += '</tr><tr>';
		}
	}
	
	if(mjpegCameras.length > 0) {
		startMJPEGGridDisplay(mjpegCameras);
	}
	data += '</table>'
	gPage.set('content', data);
	
	cameraContainer.addChild(gPage);
	
	cameraList.forEach(function(camera) {
		console.log('Adding camera:' + camera.node_name);
		
		
		var cameraPage = new dijit.layout.ContentPane({
			id:  camera.node_id, 
			title: camera.node_name
		});
		cameraPage.set('href', '/board/getBoardCameraViewDetails?node_id=' + camera.node_id);
		cameraPage.set("onDownloadEnd", function() {
			//console.log("render the content in the pane now");
			
			try {
				
				var node_url = camera.node_url;
				
				if(startsWith(node_url, 'http')) {
					dojo.attr(dojo.byId('liveVideoPluginDisplayContainer_' + camera.node_id), 'style', 'display:none');
					dojo.attr(dojo.byId('liveImagePluginDisplayContainer_' + camera.node_id), 'style', 'float:left;width:100%;height:70%;display:block');
					//showMJPEGLiveStream(camera, dojo.byId('liveImage_' + camera.node_id));
					doPeriodicImageRefreshInCameraView(camera);
				}
				var cameraLiveView = document.getElementById('CameraLiveViewVideoControl_' + camera.node_id);
				if(cameraLiveView) {
					var mediaURL = camera.node_url;
					console.log('Setting the url as:' + mediaURL);
					cameraLiveView.src = mediaURL;
					
					resizeLiveCameraViewContainer(camera);
				}
				
				
			} catch(ex) {
				setErrorStatus('Failed in loading the live view of camera:' + camera.node_name);
			}
			var container = dijit.byId('boardcamerapaneContainer_' + camera.node_id);
			if(container) {
				container.resize();
			}
			
			loadSelectedCameraDetails(camera);
			
		});
		enableDisableVideoRecordOptions(camera);
		cameraContainer.addChild(cameraPage);
	});
	
	//settings.set('href', '/board/getUserSettingsPage?auth_id=' + dataStore['auth_id']);
	//settings.set('onDownloadEnd', function() {});
	//cameraContainer.addChild(settings);
	
	//dojo.empty('cameraStackController');
	
	//var cameraController = new dijit.layout.StackController({containerId: "cameraContainer"}, "cameraStackController");
	cameraContainer.startup();
	cameraController.startup();
	
	var cameraBorderContainer = dijit.byId('cameraBorderContainer');
	if(cameraBorderContainer) {
		cameraBorderContainer.resize();
	}
	showCameraUtilizedSize();
	dojo.attr(dojo.byId('loader'), "style", "display:none");
	
	setStatus('All Cameras have been added...');
}


showCameraUtilizedSize = function() {
	/*
	cameraList.forEach(function(camera) {
		var barDisplayCameraSize = 'CameraSizeDisplayBar_' + camera.node_id;
		var barElement = dijit.byId(barDisplayCameraSize);
		if(barElement) {
			barElement.set("maximum", boardTotalSize);
			barElement.set("value", camera.node_files_size);
			//dojo.byId('boardTotalSizeDisplay').innerHTML =  humanFileSize(e.result, 1024) + ' of ' + humanFileSize(e.board_max_storage, 1024);	
		}
	});
	*/
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.getTotalFilesSizeInBoard(dataStore['auth_id']); 
}

dojo.subscribe('GetTotalFilesSizeInBoardSignal', function(e) {
	console.log('GetTotalFilesSizeInBoardSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');

	try {
		if(e.status === 'SUCCESS') {
			setStatus('Received the total files size from the board');			
			currentBoardSize = e.result;
			boardTotalSize = e.board_max_storage;
			
			dojo.byId('boardSizeDisplay').innerHTML =  humanFileSize(e.result, 1024) + ' of ' + humanFileSize(e.board_max_storage, 1024);
		} else {
			console.log('Failed to get the total files size from the board..');
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

dojo.subscribe('GetTotalFilesSizeInNodeSignal', function(e) {
	console.log('GetTotalFilesSizeInNodeSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Received the Total used space of the camera...');
			var node_id = e.node_id;
			dojo.byId('cameraSizeDisplayAtBoard_' + node_id).innerHTML =  humanFileSize(e.result, 1024) + ' of ' + humanFileSize(boardTotalSize, 1024);	
		} else {
			setStatus('Failed in getting the total used space of the camera...');
			console.log('Failed to get the total files size from the camera..');
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

resizeLiveCameraViewContainer = function(camera) {

	//CameraLiveVideContainer_<!--REPLACE_NODE_ID-->

	var container = dijit.byId('CameraLiveVideContainer_' + camera.node_id);
	var videoControl = document.getElementById('CameraLiveViewVideoControl_' + camera.node_id);
	if(videoControl) {
		console.log('resize the container..');
		/*
		var videoServiceRequestList = dijit.byId('videoRecordRequests_' + camera.node_id);
		
		if(videoServiceRequestList) {
			tab.selectChild(videoServiceRequestList);
		}
		var cameraLiveView = dijit.byId('CameraLiveView_' + camera.node_id);
		if(cameraLiveView) {
			tab.selectChild(cameraLiveView);
		}
		*/
		dojo.setStyle(videoControl, 'display', 'none');
		dojo.setStyle(videoControl, 'display', 'block');
	}
}

loadSelectedCameraDetails = function(camera) {
	var selectedCameraCaption = dojo.byId('selectedCameraName_' + camera.node_id);
	if(selectedCameraCaption) {
		selectedCameraCaption.innerHTML = camera.node_name;
	}
	var nodePropertyGridSelector = 'div[id="nodePropertiesGrid_' + camera.node_id + '"]';
	dojo.query(nodePropertyGridSelector + ' td#nodePropertyName')[0].innerHTML = camera.node_name;
	dojo.query(nodePropertyGridSelector +  ' td#nodePropertyType')[0].innerHTML = camera.node_type;
	dojo.query(nodePropertyGridSelector +  ' td#nodePropertyModelName')[0].innerHTML = camera.node_model_name;
	dojo.query(nodePropertyGridSelector +  ' td#nodePropertyLocation')[0].innerHTML = camera.node_location;	
	//dojo.query(nodePropertyGridSelector +  ' td#nodePropertySize')[0].innerHTML = humanFileSize(camera.node_files_size, 1024);
	dojo.query(nodePropertyGridSelector +  ' td#nodeRecordProfileName')[0].innerHTML = camera.video_profile_name;
	dojo.query(nodePropertyGridSelector +  ' td#nodeVideoFileExtn')[0].innerHTML = camera.video_file_extension;
	dojo.query(nodePropertyGridSelector +  ' td#nodeVideoDurationPerFile')[0].innerHTML = camera.video_length_duration_in_seconds + " seconds";
	dojo.query(nodePropertyGridSelector +  ' td#nodeURL')[0].innerHTML = camera.node_url;
	setStatus('Loaded the camera details..');
	
	
	enableDisableVideoRecordOptions(camera);
	
	var boardAuth = new modules.UserBoardHandler;
	//console.log('The data store content is:' + dojo.toJson(dataStore, true));
	boardAuth.getTotalFilesSizeInNode(camera.node_name, dataStore['auth_id']); 
	
	listFilesFromBoardForCamera(camera);
}

enableDisableVideoRecordOptions = function(camera) {

	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');

	var boardAuth = new modules.UserBoardHandler;
	boardAuth.isVideoRecordingInProgress(camera.node_name, dataStore['auth_id']); 
}

dojo.subscribe('UserBoardNodeIsVideoRecordInProgressSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Camera Is Video Recording Available has come. Value:' + dojo.toJson(e, true));
	try {
		//var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			setStatus('Received the video recording status...');
			var node_id = e.node_id;
			if(! e.result) {
				
				//dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:none');
				//dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:block');
				
				setRecordOptionsEnabledNew(true, node_id);
			} else {
			
				//dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:block');
				//dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:none');
				
				setRecordOptionsEnabledNew(false, node_id);
			}
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

setRecordOptionsEnabledNew = function(status, node_id) {
	//console.log('The setREcord options enabled:' + status + ' for node id:' + node_id);
	
	if(status) {
		if(dojo.byId('divStartRecord_' + node_id)) {
			dojo.attr(dojo.byId('divStopRecord_' + node_id), 'style', 'display:none');
			dojo.attr(dojo.byId('divStartRecord_' + node_id), 'style', 'display:block');
		}
	} else {
		if(dojo.byId('divStopRecord_' + node_id)) {
			dojo.attr(dojo.byId('divStopRecord_' + node_id), 'style', 'display:block');
			dojo.attr(dojo.byId('divStartRecord_' + node_id), 'style', 'display:none');
		}
	}
	setRecordInProgressInNodeName(status, node_id);
}

setRecordInProgressInNodeName = function(status, node_id) {
	var cameraNameId = 'cameraStackController_' + node_id + '_label';
	if(! status) {
		if(dojo.byId(cameraNameId)) {
			dojo.addClass(dojo.byId(cameraNameId), 'recordProgressAtNode');
		}
		//dojo.addClass(dojo.byId('liveGridCameraView_' + node_id), 'recordingInProgress');
		/*
		if(dojo.byId('gridCameraLiveViewVideoControl_' + node_id)) {
			dojo.addClass(dojo.byId('gridCameraLiveViewVideoControl_' + node_id), 'recordingInProgress');
			dojo.addClass(dojo.byId('gridCameraLiveViewImageControl_' + node_id), 'recordingInProgress');
		}
		*/
		
		if(dojo.byId('gridPageCameraHeader_' + node_id)) {
			dojo.addClass(dojo.byId('gridPageCameraHeader_' + node_id), 'recordingInProgress');
		}		//
		//liveGridCameraView_
		
	} else {
		if(dojo.byId(cameraNameId)) {
			dojo.removeClass(dojo.byId(cameraNameId), 'recordProgressAtNode');
		}
		//dojo.removeClass(dojo.byId('liveGridCameraView_' + node_id), 'recordingInProgress');
		/*
		if(dojo.byId('gridCameraLiveViewVideoControl_' + node_id)) {
			dojo.removeClass(dojo.byId('gridCameraLiveViewVideoControl_' + node_id), 'recordingInProgress');
			dojo.removeClass(dojo.byId('gridCameraLiveViewImageControl_' + node_id), 'recordingInProgress');
		}
		*/
		if(dojo.byId('gridPageCameraHeader_' + node_id)) {
			dojo.removeClass(dojo.byId('gridPageCameraHeader_' + node_id), 'recordingInProgress');
		}		
		//liveGridCameraView_
	}
}

updateBoardRecordControls = function(e) {
	
	var r = e.result;
	//console.log('The result is:' + dojo.toJson(r, true));
	var cameras = r["cameras"];
	//console.log('The result is:' + dojo.toJson(cameras, true));
	//console.log('The size is:' + cameras.length);
	
	var currentSize = 0;
	cameras.forEach(function(camera) {
		//console.log('The result is:' + dojo.toJson(camera, true));
		
		var node_id = camera.node_id;
		var record_status = camera["video_recording_inprogress"];
		setRecordOptionsEnabledNew((! record_status), node_id);
		
		try {
			currentSize = currentSize + camera["total_size"];
			var singleCameraSizeDisplay = 'cameraSizeDisplayAtBoard_' + camera.node_id;
			if(dojo.byId(singleCameraSizeDisplay)) {
				dojo.byId(singleCameraSizeDisplay).innerHTML = humanFileSize(camera["total_size"], 1024) + ' of ' + humanFileSize(boardTotalSize, 1024);//
				refreshListOfVideos(camera.node_id);
			}
		} catch(err) { }
		dojo.byId('boardSizeDisplay').innerHTML =  humanFileSize(currentSize, 1024) + ' of ' + humanFileSize(boardTotalSize, 1024);
	});
	
	displayAlertIfAny(r);
}

displayAlertIfAny = function(boardStatus) {
	
	var alertData = boardStatus["alert"];
	//console.log('Alert Data:' + dojo.toJson(alertData, true));
	if(alertData) {
		var alertText = '';
		if(alertData['STORAGE_ALERT']) {
			alertText = 'Storage Alert: ' + alertData['STORAGE_ALERT']['desc'];
			
			setTimeout(function() { stopRecordingIfEnabled();} , 500);
		}
		if(alertData['SERVER_CONNECTION_ALERT']) {
			if(alertText.length > 0) {
				alertText += ', Connection Alert: ' + alertData['SERVER_CONNECTION_ALERT']['desc'];
			} else {
				alertText = 'Connection Alert: ' + alertData['SERVER_CONNECTION_ALERT']['desc'];
			}
		}
		
		dojo.addClass('alertDetails', 'alertDetails');
		dojo.byId('alertDetails').innerHTML = alertText;
	} else {
		dojo.removeClass('alertDetails', 'alertDetails');
		dojo.byId('alertDetails').innerHTML = '';
	}
}

stopRecordingIfEnabled = function() {
	
	var cameras = cameraDetails['cameras'];
	cameras.every(function(camera) {
		console.log('Stopping the camera..' + camera.node_name);
		stopRecording(camera);
		return true;
	});
}

startRecordNow = function(camera_id) {
	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null) {
		showErrorInformation('Unable to get the selected camera details. Refresh the page...and try again...');
		return;
	}
	
	startContinuousRecord(selectedCamera);
}

stopRecordNow = function(camera_id) {
	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null) {
		showErrorInformation('Unable to get the selected camera details. Refresh the page... and try again...');
		return;
	}
	stopRecording(selectedCamera);
}

startContinuousRecord = function(selectedNode) {
	
	//for continuous record
	var videoDurationForImmediate = '0';

	var selectedVideoProfileID = getValue('listVideoProfileForRecord');
	var recordServiceType = '1';	//for record now option
	var enableNotification = 'off';
	var emailList = ' ';
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.startVideoRecording(selectedNode.node_id, selectedNode.node_name, videoDurationForImmediate, selectedVideoProfileID, recordServiceType, '', '', '', '', '', '', '', '', '', enableNotification, emailList, dataStore['user_id'], dataStore['auth_id']); 
}

dojo.subscribe('UserBoardNodeStartVideoRecordSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Camera Start Video Record response has come. Value:' + dojo.toJson(e, true));
	try {
		
		if(e.status === 'SUCCESS') {
			showAutoHideInformation('Successfully started the video recording...');
			setRecordOptionsEnabledNew(false, e.node_id);
		} else {
			setStatus(e.error_info);
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

stopRecording = function(camera) {
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.stopVideoRecording(camera.node_id, camera.node_name,  dataStore['user_id'], dataStore['auth_id']); 
}

dojo.subscribe('UserBoardNodeStopVideoRecordSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Camera Stop Video Record response has come. Value:' + dojo.toJson(e, true));
	try {
		if(e.status === 'SUCCESS') {
			showAutoHideInformation('Successfully stopped the video recording...');
			setRecordOptionsEnabledNew(true, e.node_id);
		} else {
			setStatus(e.error_info);
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

dojo.subscribe('CameraVideosListSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('CameraVideosListSignal response has come.');
	
	try {
		if(e.status === 'SUCCESS') {
			loadImagesFromCamera(e.result, e.node_name, e.node_id);
			
			showCameraUtilizedSize();
			getCameraFileSize(e.node_id);
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

getDownloadLink = function(video) {
	var data = '<a href=\'/board/downloadFile?file=' + video.Path + '&auth_id=' + dataStore['auth_id'] + '\'/>Download</a>';
	return data;
}

getVideoJson = function(video) {
	return JSON.stringify(video);
}

getVideoPlayLink = function(video) {
	var data = '<a href=javascript:playVideo(' + video.timestamp + ')>Play</a>';
	return data;
}

getVideoImageLink = function(video) {
	var data = '<a href=javascript:playVideo(' + video.timestamp + ')><img class=videoimage src=' + video.Normal_Image + '></img></a>';
	return data;
}


getVideoImage = function(video) {

	if(video.Normal_Image == null || video.Normal_Image == undefined || video.Normal_Image == '') {
		return '';
	}
	var data = '<td><table class=video><tr><input type=hidden id=' + video.timestamp + ' name=' + video.timestamp + ' value=\'' + getVideoJson(video) + '\'/>';
	data += '<td colspan=2 class=videoimagecolumn>' + getVideoImageLink(video) + '</td></tr>';
	data += '<tr ><td class=videoname>Length:' + video.Duration + '</td><td class=videoview_links rowspan=2>'  +  getVideoPlayLink(video) + '&nbsp;' + getDownloadLink(video) + '&nbsp;<input type=\'checkbox\' id=' + video.timestamp + ' name=' + video.timestamp + '/></tr>';
	data += '<tr ><td class=videoduration>Date:' + video.ctime + '</td></tr>';
	data += '</table></td>';
	
	return data;
}

loadImagesFromCamera = function(videos, node_name, node_id) {
	
	
	var data = {};
	data['filtered'] = 0;
	data['videos'] = videos;
	
	
	//<a href="images/Big_Buck_Bunny.mp4"><img src="images/Big_Buck_Bunny.jpg" alt="Big Buck Bunny, Copyright Blender Foundation"></a>
	
	cameraVideoFiles[node_id] = data;

	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	try {
		dojo.empty('videoListImagesInBoard_' + node_id);	
		var data = '<table class=videoList><tr>';
		var videoGalleryBuf = '';
		var videoIndex = 1;
		var breakIndex = 3;
		videos.forEach(function(video) {
			
			var videoImage = getVideoImage(video);
			if(videoImage != '') {
				data += videoImage;
				
				if(videoIndex % breakIndex == 0) {
					data += '</tr><tr>';
				}
				videoIndex++;
				
				videoGalleryBuf += '<a href=' + video.Path + '><img src=' + video.Normal_Image + '></a>'
			}
		});
		
		data += '</tr></table>';
		
		dojo.byId('videoListImagesInBoard_' + node_id).innerHTML = data;
		if(dojo.byId('videoGalleryInBoard_' + node_id)) {
			dojo.byId('videoGalleryInBoard_' + node_id).innerHTML = videoGalleryBuf;
			dojo.attr(dojo.byId('videoGalleryInBoard_' + node_id), 'style', 'display:none');
		}
		
	} catch(err) {
	
	}
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	populateScheduleRecordRequests(node_id);
}

refreshListOfVideos = function(camera_id) {
	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null) {
		setStatus('Failed to get the camera details for the selected camera');
		return;
	}
	listFilesFromBoardForCamera(selectedCamera);
}

listFilesFromBoardForCamera = function(camera) {
	var url = '/board/listFiles';
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData(url, 'node_name=' + camera.node_name + '&node_id=' + camera.node_id + '&auth_id=' + dataStore['auth_id'], 'CameraVideosListSignal');		
}

getCameraFileSize = function(camera_id) {

	var camera = getCameraDetailsById(camera_id);
	if(camera == null) {
		setStatus('Failed to get the camera files size for the selected camera');
		return;
	}
	var boardAuth = new modules.UserBoardHandler;
	console.log('The data store content is:' + dojo.toJson(dataStore, true));
	boardAuth.getTotalFilesSizeInNode(camera.node_name, dataStore['auth_id']); 
}

listFilesFromBoardForCamera_OLD = function(camera) {
	console.log('Listing files from Board...for camera:' + camera.node_name);
	//var boardAuth = new modules.UserBoardHandler;
	//boardAuth.listFiles(selectedNode.board_ip, selectedNode.board_port, selectedNode.name, boardAuthDetails[selectedNode.board_id]); 
	var url = '/board/listFiles?node_name=' + camera.node_name;
	url += '&auth_id=' + dataStore['auth_id'];
	console.log('loading url:' + url);
	videoStoreInBoard = new dojo.store.JsonRest( { 
													target : url,
													idProperty: "id"
												}
										);
	videoStore = new dojo.data.ObjectStore( { objectStore: videoStoreInBoard });
	grid = new dojox.grid.EnhancedGrid( {
							selectable: true,
							store : videoStore,
							structure : [
								{ name : 'id' , field : 'id', hidden: true },
								{ name : 'File Name' , field : 'Path', width: '250px', formatter : getFormattedFileName, classes: 'file_name_column'},
								{ name : 'Duration (HH:MM:SS.##)' , field : 'Duration', width: '125px'},
								{ name : 'Size' , field : 'Size', width: '50px', formatter: getFormattedFileSize, datatype: 'number' },
								{ name : 'Bitrate' , field : 'bitrate', width: '50px'},
								{ name : 'Screen Size' , field : 'Screen Size', width: '75px'},
								{ name : 'FPS' , field : 'FPS', width: '50px'},
								{ name : 'Created Date' , field : 'ctime', width: '150px', datatype: 'date', dataTypeArgs: { datePattern: 'yyyy-MM-dd HH:mm:SS'} },
								{ name : 'Download' , field : 'Path', width: '70px', formatter : getFormattedDownloadOption},
								{ name : 'majorBrand' , field : 'majorBrand', hidden: true},
								{ name : 'minorVersion' , field : 'minorVersion', hidden: true},
								{ name : 'compatibleBrands' , field : 'compatibleBrands', hidden: true},
								{ name : 'title' , field : 'title', hidden: true},
								{ name : 'encoder' , field : 'encoder', hidden: true},
								{ name : 'comment' , field : 'comment', hidden: true},
								{ name : 'Node' , field : 'Node', hidden: true},
								{ name : 'Board' , field : 'Board', hidden: true},
								{ name : 'Video Spec' , field : 'Video Spec', hidden: true},
								{ name : 'Normal_Image' , field : 'Normal_Image',hidden: true}
							],
							rowSelector: '20px',
							plugins: {
									pagination: {
										pageSizes: ["10", "25", "50", "100"],
										description: true,
										sizeSwitch: true,
										pageStepper: true,
										gotoButton: true,
										maxPageStep: 5,
										position: "top"
									},
									search : true,
									filter:{
										// Show the closeFilterbarButton at the filter bar
										closeFilterbarButton: false,
										// Set the maximum rule count to 5
										ruleCount: 0,
										// Set the name of the items
										itemsName: "videofiles"
									}
								}
						});
	//console.log('Grid has been successfully created');
	//boardVideoGrids[selectedNode.node_id] = grid;
	dojo.connect(grid, 'onRowDblClick', function(item) {
		var selectedNode = camera; //getSelectedNode();
		var selectedVideo = {};
		selectedVideo['id'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'id');
		selectedVideo['filePath'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Path');
		selectedVideo['size'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Size');
		selectedVideo['createdDate'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'ctime');
		selectedVideo['majorBrand'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'majorBrand');
		selectedVideo['minorVersion'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'minorVersion');
		selectedVideo['compatibleBrands'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'compatibleBrands');
		selectedVideo['title'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'title');
		selectedVideo['encoder'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'encoder');
		selectedVideo['comment'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'comment');
		selectedVideo['bitrate'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'bitrate');
		selectedVideo['Node'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Node');
		selectedVideo['Board'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Board');
		selectedVideo['Normal_Image'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Normal_Image');
		selectedVideo['Duration'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Duration');
		selectedVideo['Screen Size'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Screen Size');
		selectedVideo['FPS'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'FPS');
		selectedVideo['Video Spec'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Video Spec');
		
		console.log('Selecte video:' + dojo.toJson(selectedVideo, true));
		/*
		var id = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'id');
		var filePath = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Path');
		var size = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Size');
		var createdDate = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'ctime');
		*/
		//showVideoPlayer(selectedNode, id, filePath, size, createdDate);
		showVideoPlayer(selectedNode, selectedVideo);
	});
	/*
	dojo.empty('videoListInBoardGrid_' + camera.node_id);
	
	dojo.attr('videoListInBoardGrid_' + camera.node_id, 'style', 'width:100%; height:100%');
	grid.placeAt('videoListInBoardGrid_'  + camera.node_id);
	grid.startup();
	console.log('grid has been successfully started');
	*/
}

/*
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(bytes < thresh) return bytes + ' B';
    var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+' '+units[u];
};
*/

getFormattedFileName = function(value) {
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

getFormattedDownloadOption = function(value) {
	//console.log('File Download value is:' + value);
	return '<span><a href=\'/board/downloadFile?file=' + value + '&auth_id=' + dataStore['auth_id'] + '\'/><img width=\'32\' height=\'32\' src=\'/res/download_arrow_32_32.png\'/></a><span>';
}

getFormattedFileSize = function(value) {
	return humanFileSize(value, 1024);
}

function createRadioElement( name, checked, value ) {
   var radioInput;
   try {
        var radioHtml = '<input type="radio" id="' + value + '" name="' + name + '" value="' + value + '"' ;
        if ( checked ) {
            radioHtml += ' checked="checked"';
        }
        radioHtml += '/>';
        radioInput = document.createElement(radioHtml);
    } catch( err ) {
        radioInput = document.createElement('input');
        radioInput.setAttribute('type', 'radio');
        radioInput.setAttribute('name', name);
        radioInput.setAttribute('id', value);
        radioInput.setAttribute('value', value);
        if ( checked ) {
            radioInput.setAttribute('checked', 'checked');
        }
    }
    return radioInput;
}

playVideo = function(id) {
	var selectedVideo = document.getElementById(id);
	if(selectedVideo == undefined || selectedVideo == null) {
		setStatus('Selected video is found to be null');
		return;
	}
	
	var videoObj = JSON.parse(selectedVideo.value);
	if(videoObj == null) {
		setStatus('Selected video object is found to be null');
		return;
	}
	
	console.log('path for id:' + id + ' is:' + videoObj.path);
	fileToPlay = dojo.string.trim(videoObj.Path);
	if(fileToPlay.length <= 0) {
		setStatus('File name to be played is found as null / empty');
		return '';
	}
	//var flVideo = new dojox.av.FLVideo({mediaUrl: mediaFile});
	//var mediaFile = 'http://localhost:10010' + fileToPlay;
	//var mediaFile = 'http://192.168.2.4:10010' + fileToPlay;
	var mediaFile = dataStore['video_server_conf'] + fileToPlay;
	console.log('Loading file:' + mediaFile);
	//var mediaFile = 'rtsp://192.168.2.3:554/video.mp4';
	var videoControl = document.getElementById('videoControl');
	videoControl.src = mediaFile;
	var file = getFormattedFileName(fileToPlay);
	
	
	dojo.byId('videoPlayerFileName').innerHTML = file;
	dojo.byId('videoPlayerFileSize').innerHTML = getFormattedFileSize(videoObj['Size']);
	//dojo.byId('videoPlayerFileCreatedDate').innerHTML = videoObj['ctime'];
	dojo.byId('videoPlayerFileStartedDate').innerHTML = videoObj['recording_started_time'];
	dojo.byId('videoPlayerFileNodeName').innerHTML = videoObj['Node'];	
	dojo.byId('videoPlayerFileBoardName').innerHTML = videoObj['Board'];

	dojo.byId('videoPlayerFileDuration').innerHTML = videoObj['Duration'];
	dojo.byId('videoPlayerFileBitrate').innerHTML = videoObj['bitrate'];
	dojo.byId('videoPlayerFileEncoder').innerHTML = videoObj['encoder'];
	dojo.byId('videoPlayerFileTitle').innerHTML = videoObj['title'];
	dojo.byId('videoPlayerFileMajorBrand').innerHTML = videoObj['majorBrand'];
	dojo.byId('videoPlayerFileminorVersion').innerHTML = videoObj['minorVersion'];
	dojo.byId('videoPlayerFilecompatibleBrands').innerHTML = videoObj['compatibleBrands'];
	dojo.byId('videoPlayerFileScreenSize').innerHTML = videoObj['Screen Size'];
	dojo.byId('videoPlayerFileFPS').innerHTML = videoObj['FPS'];
	dojo.byId('videoPlayerFileVideoSpec').innerHTML = videoObj['Video Spec'];

	dojo.empty('videoTagsList');
	var videoTagDivList = document.getElementById('videoTagsList');
	if(videoTags) {
		videoTags.forEach(function(video_tag) {
			var checked = false;
			if(videoObj['tag']) {
				if(videoObj['tag'] == video_tag['video_tag_id']) {
					checked = true;
				}
			}
			var videoTagElement = createRadioElement('video_tags', checked, video_tag['video_tag_id']);
			//videoTagElement.text = video_tag['video_tag_name'];
			var label1 = document.createElement('label');
			label1.htmlFor = videoTagElement.id;
			label1.innerHTML = video_tag['video_tag_name'] + '&nbsp;&nbsp;&nbsp';
			
			videoTagDivList.appendChild(videoTagElement);
			videoTagDivList.appendChild(label1);
			
			videoTagElement.onclick = function() {
				//alert('Selected tag id:' + video_tag['video_tag_id'] + ', File to play:' + fileToPlay + ', file id:' + id);
				setVideoTag(video_tag['video_tag_id'], fileToPlay, id);
			}
		});
	}
	
	
	dojo.style(dojo.byId('videoPlayerFileProperties'), 'display', 'block');
	
	var videoPlayer = dijit.byId('VideoPlayer');
	videoPlayer.set('title', 'Camera:' + videoObj['Node'] + ' - ' + file);
	videoPlayer.show();
	//dojo.empty("videoPlayerMain");
	//flVideo.placeAt("videoPlayerMain");
	//flVideo.startup();
}

setVideoTag = function(video_tag_id, video_file, file_id) {

	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var conn = new modules.BoardConnectionHandler;
	var data = 'video_id=' + file_id + '&video_file=' + video_file + '&video_tag_id=' + video_tag_id + '&auth_id=' +dataStore['auth_id'];
	conn.sendPostData('/board/updateVideoTag', data, 'UpdateVideoTagSignal');			
}

dojo.subscribe('UpdateVideoTagSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('UpdateVideoTagSignal response has come. value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			//<input type=hidden id=' + video.timestamp + ' name=' + video.timestamp + ' value=\'' + getVideoJson(video) + '\'/>
			var obj = e.result;
			if(obj) {
				var timestamp = obj['timestamp'];
				if(timestamp) {	
					var updatedVideoElement = document.getElementById(timestamp);
					if(updatedVideoElement) {
						updatedVideoElement.value = getVideoJson(obj);
						var camera_id = obj['Node_id'];
						var data  = cameraVideoFiles[camera_id];
						var videos = data['videos'];
						var index = getVideoIndex(videos, timestamp);
						if(index != -1) {
							videos.splice(index, 1, obj);
						}
						showAutoHideInformation('Successfully updated the tag for the video');
					}
				}
			}
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

getVideoIndex = function(videos, timestamp) {
	var foundIndex = -1;
	var index = -1;
	videos.forEach(function(video) {
		index++;
		if(video['timestamp'] === timestamp) {
			foundIndex = index;
		}
	});
	return index;
}

clearMetaDataOfVideoDetails = function() {

	dojo.byId('videoPlayerFileName').innerHTML = '';
	dojo.byId('videoPlayerFileSize').innerHTML = '';
	dojo.byId('videoPlayerFileCreatedDate').innerHTML = '';
	dojo.byId('videoPlayerFileNodeName').innerHTML = '';	
	dojo.byId('videoPlayerFileBoardName').innerHTML = '';

	dojo.byId('videoPlayerFileDuration').innerHTML = '';
	dojo.byId('videoPlayerFileBitrate').innerHTML = '';
	dojo.byId('videoPlayerFileEncoder').innerHTML = '';
	dojo.byId('videoPlayerFileTitle').innerHTML = '';
	dojo.byId('videoPlayerFileMajorBrand').innerHTML = '';
	dojo.byId('videoPlayerFileminorVersion').innerHTML = '';
	dojo.byId('videoPlayerFilecompatibleBrands').innerHTML = '';
	dojo.byId('videoPlayerFileScreenSize').innerHTML = '';
	dojo.byId('videoPlayerFileFPS').innerHTML = '';
	dojo.byId('videoPlayerFileVideoSpec').innerHTML = '';
}

selectAllVideos = function(camera_id) {
	
	var videoContainer = 'div#videoListImagesInBoard_' + camera_id + ' input[type=\'checkbox\']'
	nodes = dojo.query(videoContainer); 
	dojo.forEach(nodes,function(node)   
		{node.checked = true}
	);
}

deSelectAllVideos = function(camera_id) {
	var videoContainer = 'div#videoListImagesInBoard_' + camera_id + ' input[type=\'checkbox\']'
	nodes = dojo.query(videoContainer); 
	dojo.forEach(nodes,function(node)   
		{node.checked = false}
	);
}

deleteSelectedVideos = function(camera_id) {

	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null) {
		setStatus('Failed to get the camera details for the selected camera');
		return;
	}
	
	var videoContainer = 'div#videoListImagesInBoard_' + camera_id + ' input[type=\'checkbox\']'
	nodes = dojo.query(videoContainer); 
	var selectedVideos = [];
	dojo.forEach(nodes,function(node) {  
			if(node.checked) {
				selectedVideos.push(node.getAttribute('id'));
			}		
		}
	);
	if(selectedVideos.length > 0) {
		if('admin_id' in dataStore) {
			var confirmMsg = 'No. of files selected to delete:' + selectedVideos.length + '\n\n Do you want to delete ?';
			
			if(confirm(confirmMsg)) {
				dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
				var conn = new modules.BoardConnectionHandler;
				conn.sendPostData('/board/clearFiles', 'node_name=' + selectedCamera.node_name + '&node_id=' + selectedCamera.node_id + '&auth_id=' + dataStore['auth_id'] + '&selected_videos=' + selectedVideos.join(), 'DeleteVideoSignal');		
			} else {
				setStatus('User has cancelled the video file deletion...');
			}
		} else {
			setStatus('Admin authentication is not done');
			showAdminAuthenticateDlg();	
		}
	} else {
		showInformation('Select Video files to delete...');
	}
};

dojo.subscribe('DeleteVideoSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('DeleteVideoSignal response has come. value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			refreshListOfVideos(e.node_id);
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showFilterDialog = function(camera_id) {
	
	if(cameraVideoFiles[camera_id]) {
		var filterDlg = dijit.byId('videoFilterDialog');
		dojo.byId('selected_camera_id_video_filter').value = camera_id;
		
		populateVideoTags();
		//dojo.byId('autoHidemsg').innerHTML = msg;
		filterDlg.show();
		return;
	} 
	showInformation('No videos are found for filtering..');
}

populateVideoTags = function() {
	dojo.empty('divFilterVideoTags');
	var filterVideoSelect = document.getElementById('divFilterVideoTags');	
	var newDiv=document.createElement('div');
	var selectHTML = "";
    selectHTML = "<select name='filterVideoTags' id='filterVideoTags'>";
	selectHTML += "<option value='-1'>No Preference</option>";
	videoTags.forEach(function(video_tag) {
		selectHTML+= "<option value='" + video_tag['video_tag_id']+ "'>"+ video_tag['video_tag_name'] + "</option>";
	});
	
	selectHTML += "</select>";
	newDiv.innerHTML = selectHTML;
    filterVideoSelect.appendChild(newDiv);;	
	
}

hideVideoFilterDlg = function() {
	var filterDlg = dijit.byId('videoFilterDialog');
	dojo.byId('selected_camera_id_video_filter').value = '';
	//dojo.byId('autoHidemsg').innerHTML = msg;
	filterDlg.hide();
}

filterVideos = function() {
	var selected_camera_id = dojo.byId('selected_camera_id_video_filter').value;
	console.log('Filtering videos of Camera:' + selected_camera_id);
	try {
	
		if(cameraVideoFiles[selected_camera_id]) {
			var data  = cameraVideoFiles[selected_camera_id];
			//console.log('videos:' + dojo.toJson(data, true));
			
			var selectedStartFilterDate = dojo.date.locale.format(dijit.byId('filterVideoStartDate').value, {datePattern: 'dd/MM/yyyy', selector:'date'});
			var selectedEndFilterDate = dojo.date.locale.format(dijit.byId('filterVideoEndDate').value, {datePattern: 'dd/MM/yyyy', selector:'date'});
			
			var selectedStartFilterTime = selectedStartFilterDate + 'T' + getValue('filterVideoStartTime').toString().replace(/.*1970\s(\S+).*/, '$1');
			var selectedEndFilterTime = selectedEndFilterDate + 'T' + getValue('filterVideoEndTime').toString().replace(/.*1970\s(\S+).*/, '$1');
			
			var d1 = dijit.byId('filterVideoStartDate').value;
			var t1 = getValue('filterVideoStartTime');
			var sD1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), t1.getHours(), t1.getMinutes(), t1.getSeconds());
			//alert(sD1);
			
			var d2 = dijit.byId('filterVideoEndDate').value;
			var t2 = getValue('filterVideoEndTime');
			var sD2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), t2.getHours(), t2.getMinutes(), t2.getSeconds());
			

			var diff = dojo.date.difference(sD1, sD2, "minute");
			if(diff <= 0) {
				showInformation('End Date must be greater than Start date');
				return;
			}
				
			//var startTime = sD1.getTime();
			//var endTime = sD2.getTime();
			var startTime = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate(), t1.getHours(), t1.getMinutes(), t1.getSeconds());
			var endTime = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate(), t2.getHours(), t2.getMinutes(), t2.getSeconds());
			
			var tagId = document.getElementById('filterVideoTags').value;
			
			console.log('Looking for videos from Start:' + startTime + ', End:' + endTime + ', SDate:' + sD1.toTimeString() + ', eDate:' + sD2.toTimeString() + ', With tag:' + tagId);
			if(filterVideosWithGivenTime(selected_camera_id, data['videos'], startTime, endTime, tagId)) {
				cameraVideoFiles[selected_camera_id]['filtered'] = 1;
			}
		} else {
			setStatus('No videos are found for filtering...');
		}
	} catch(err) {
		showErrorInformation('Unknown error has occurred. Pls. select the correct start / end date for filtering the videos: Err:'  + err);
		//return;
	}
	hideVideoFilterDlg();
}

filterVideosWithGivenTime = function(camera_id, videos, startTime, endTime, tagId) {
	var status = false;
	if(videos == undefined || videos == null || videos.length <= 0) {
		setErrorStatus('No videos are found for this Camera for filtering..');
		return status;
	}
	var checkWithTag = false;
	if(tagId != -1) {
		checkWithTag = true;
	}
	console.log('Scanning of videos:' + videos.length);
	var status = false;
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	try {
		dojo.empty('videoListImagesInBoard_' + camera_id);	
		
		var data = '<table class=videoList><tr>';
		var videoIndex = 1;
		var breakIndex = 3;
		videos.forEach(function(video) {
			console.log('Current video start date:' + video['ctime'] +', whose timestamp is:' + video['timestamp'] + ', ' + startTime + ', ' + endTime);
			
			if(checkWithTag) {
				status = video['timestamp'] >= startTime && video['timestamp'] <= endTime && tagId === video['tag'];
			} else {
				status = video['timestamp'] >= startTime && video['timestamp'] <= endTime;
			}
			if(status) {
				console.log('Selected for this filter');
				var videoImage = getVideoImage(video);
				if(videoImage != '') {
					data += videoImage;
					
					if(videoIndex % breakIndex == 0) {
						data += '</tr><tr>';
					}
					videoIndex++;
					status = true;
				}
			} else {
				console.log('Not Selected for this filter condition');
			}
		});
		
		data += '</tr></table>';
		
		dojo.byId('videoListImagesInBoard_' + camera_id).innerHTML = data;
		
		if(videoIndex > 1) {
			setStatus('Filtered the videos based on the Start / End time given.');
		} else {
			setErrorStatus('No videos are found for the given filter condition');
		}
	} catch(err) {
		setErrorStatus('Unknown error occurred. Error:' + err);	
	}
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	return status;
}

dojo.subscribe('ClearActivitiesLogSignal', function(e) {
	console.log('ClearActivitiesLogSignal response has come. Value:' + dojo.toJson(e, true));
	if(e.status == 'SUCCESS') {
		formGridWithUserActivities();
	} else {
		setStatus(e.error_info);
	}
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
});

clearUserActiviesLog = function() {
	console.log('Clearing the log details..');
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var conn = new modules.BoardConnectionHandler;
	conn.sendGetData('/board/clearActivities?auth_id=' + dataStore['auth_id'], '', 'ClearActivitiesLogSignal');			

}

showUserActivitiesDialog = function() {

	var activitiesDlg = dijit.byId('userActivitiesDlg');
	formGridWithUserActivities();
	activitiesDlg.show();
}

formGridWithUserActivities = function() {

	//var boardAuth = new modules.UserBoardHandler;
	//boardAuth.listFiles(selectedNode.board_ip, selectedNode.board_port, selectedNode.name, boardAuthDetails[selectedNode.board_id]); 
	var url = '/board/listActivities?auth_id=' + dataStore['auth_id'];
	//console.log('loading url:' + url);
	userActivitiesListJsonRest = new dojo.store.JsonRest( { 
													target : url,
													idProperty: "user_activities_list_store"
												}
										);
	userActivitiesListStore = new dojo.data.ObjectStore( { objectStore: userActivitiesListJsonRest });
	grid = new dojox.grid.EnhancedGrid( {
							//id: 'gridVideoRecordRequestList_' + selectedNode.node_id,
							selectable: true,
							store : userActivitiesListStore,
							structure : [
								{ name : 'id' , field : 'id', hidden: true },
								{ name : 'User' , field : 'user', width: '120px'},
								{ name : 'Activity Details' , field : 'details', width: '400px'},
								{ name : 'Date' , field : 'timestamp', formatter : getVideoRecordServiceDate,  width: '200px', datatype: 'date', dataTypeArgs: { datePattern: 'yyyy-MM-dd HH:mm:SS'} }
							],
							rowSelector: '20px',
							plugins: {
									pagination: {
										pageSizes: ["10", "25", "50", "100"],
										description: true,
										sizeSwitch: true,
										pageStepper: true,
										gotoButton: true,
										maxPageStep: 5,
										position: "top"
									},
									search : true,
									filter:{
										// Show the closeFilterbarButton at the filter bar
										closeFilterbarButton: false,
										// Set the maximum rule count to 5
										ruleCount: 0,
										// Set the name of the items
										itemsName: "user_activities_list"
									}
								}
						});
	dojo.empty('userActivities');
	
	dojo.attr('userActivities', 'style', 'width:100%; height:80%');
	grid.placeAt('userActivities');
	grid.startup();
	console.log('Listed all the user activities');
}

showBackupVideosDlg = function() {
	listOfAvailableUSBDevices.length = 0;
	backupVideosMode = 1;
	dojo.empty('list_of_cameras');
	dojo.empty('list_of_videos');
	dojo.empty('list_of_usb_devices');

	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var url = '/board/listBackupVideosStatus?auth_id=' + dataStore['auth_id'];
	//console.log('loading url:' + url);
	backupVideosListJsonRest = new dojo.store.JsonRest( { 
													target : url,
													idProperty: "backup_videos_status_list_store"
												}
										);
	backupVideosListStore = new dojo.data.ObjectStore( { objectStore: backupVideosListJsonRest });
	grid = new dojox.grid.EnhancedGrid( {
							//id: 'gridVideoRecordRequestList_' + selectedNode.node_id,
							selectable: true,
							store : backupVideosListStore,
							structure : [
								{ name : 'id' , field : 'id', hidden: true },
								{ name : 'Backup Device' , field : 'usb_device', width: '80px'},
								{ name : 'Type' , field : 'mode', formatter: getBackupVideoMode, width: '160px'},
								{ name : 'Status' , field : 'status', width: '120px'},
								{ name : 'Started At' , field : 'started_at', formatter : getVideoRecordServiceDate,  width: '160px', datatype: 'date', dataTypeArgs: { datePattern: 'yyyy-MM-dd HH:mm:SS'} },
								{ name : 'Completed At' , field : 'completed_at', formatter : getVideoRecordServiceDate,  width: '160px', datatype: 'date', dataTypeArgs: { datePattern: 'yyyy-MM-dd HH:mm:SS'} }
							],
							rowSelector: '20px',
							plugins: {
									pagination: {
										pageSizes: ["10", "25", "50", "100"],
										description: true,
										sizeSwitch: true,
										pageStepper: true,
										gotoButton: true,
										maxPageStep: 5,
										position: "top"
									},
									search : true,
									filter:{
										// Show the closeFilterbarButton at the filter bar
										closeFilterbarButton: false,
										// Set the maximum rule count to 5
										ruleCount: 0,
										// Set the name of the items
										itemsName: "backup_videos_list"
									}
								}
						});
	dojo.empty('backupVideosStatusList');
	
	dojo.attr('backupVideosStatusList', 'style', 'width:100%; height:80%');
	grid.placeAt('backupVideosStatusList');
	grid.startup();
	console.log('Listed all the backup videos list activities');	
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getBoardStatus', '&auth_id=' +dataStore['auth_id'], 'BackupVideosBoardStatusSignal');			
}

getBackupVideoMode = function(value) {
	if(value == '1') {
		return 'Entire Camera';
	} else if(value == '2') {
		return 'Selected Videos';
	}
	return 'Unknown'
}

dojo.subscribe('BackupVideosBoardStatusSignal', function(e) {
	console.log('BackupVideosBoardStatusSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	if(! 'result' in e) {
		console.log('Looks like result object is not found in the response');
		return;
	}
	var r = e.result;
	if(r === undefined) {
		console.log('No camera list is there..in the response');
		return;
	}
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
	
	//If video record inprogress; dont allow the user to backup
	showBackupVideosDialogUI(! isVideoRecordInProgress, cameras);
	
});

showBackupVideosDialogUI = function(backupAllowed, cameras) {

	if(! backupAllowed) {
		showErrorInformation('Video recording is in-progress. Cannot perform Backup activity');
		return;
	}
	setStatus('Launching the backup dialog')
	if('admin_id' in dataStore) {
		setStatus('Admin has already logged in');
		dojo.byId('backupVideosStatus').innerHTML = '';
		var backupDlg = dijit.byId('backupVideosDlg');
		backupDlg.show();
		
		//backupDlg.set('href', '/board/getBackupVideosSettingsPage?auth_id=' + dataStore['auth_id']);
		//backupDlg.set("onDownloadEnd", function() {
		//});
		require(['dojo/query'], function(qry) {
			
			
			if(backupVideosMode == 1) {
				
				qry('span.camera_video_list_caption').forEach(function(node) {
					node.innerHTML = 'Select Cameras:';
				});
				dojo.attr('list_of_videos', 'style', 'display:none');
				dojo.attr('list_of_cameras', 'style', 'display:block');
				var videoCameras = getListOfVideosCheckBoxes(cameras, true);
				dojo.byId('list_of_cameras').innerHTML = videoCameras;
				//dojo.byId('web_backup_list_options').innerHTML = getListOfExternalWebOptions();
			} else if(backupVideosMode == 2) {
				qry('span.camera_video_list_caption').forEach(function(node) {
					node.innerHTML = 'Selected Videos:';
				});

				dojo.attr('list_of_videos', 'style', 'display:block');
				dojo.attr('list_of_cameras', 'style', 'display:none');
				
				dojo.byId('list_of_videos').innerHTML =  getListOfVideoFilesSelected(selectedVideosForBackUp); //'No. of videos selected:' + selectedVideosForBackUp.length;
			}
			
			listUSBDevices();
		});
	} else {
		setStatus('Admin authentication is not done');
		showAdminAuthenticateDlg();
	}	
}

getListOfExternalWebOptions = function() {
	var buf = '';
	
	buf = '<table class=backUpVideosToWeb>';
	var web_configs = dataStore['backup_videos_web_options']['web_configs'];
	web_configs.forEach(function(config) {
		buf += '<tr><td><label for="' + config + '">' + config + '</label></td><td><input type="radio" id="' + config + '"></td></tr>';
	});
	buf += '</table>';
	return buf;
}

getListOfVideoFilesSelected = function(selectedFiles) {
	var buf = '';
	
	buf = '<table class=selected_videos_for_backup><tr><th>File</th><th>Size</th>';
	buf += '</tr>';
	selectedFiles.forEach(function(video) {
		console.log('Selected video file for backup:' + dojo.toJson(video, true));
		buf += '<tr>';
		buf += '<td>' + getFormattedFileName(video['Path']) + '</td>';
		buf += '<td>' + getFormattedFileSize(video['Size']) + '</td>';
		buf += '</tr>';
	});
	
	buf += '</table>'
	return buf;
	
}

listUSBDevices = function() {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/listUSBDevices', '&auth_id=' +dataStore['auth_id'], 'ListUSBDevicesResponse');	
}

dojo.subscribe('ListUSBDevicesResponse', function(e) {
	console.log('ListUSBDevicesResponse response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	

	if(e.status == 'SUCCESS') {
		listOfAvailableUSBDevices = e.result;
		var deviceList = getListOfUSBDevicesFormatted(listOfAvailableUSBDevices);
		dojo.byId('list_of_usb_devices').innerHTML = deviceList;
	} else {
		dojo.empty('list_of_usb_devices');
		dojo.byId('list_of_usb_devices').innerHTML = '<span class=no_usb_devices>' + e.error_info + '</span>';
	}
});

getListOfUSBDevicesFormatted = function(data) {
	var buf = '';
	
	buf = '<table class=usb_device_list><tr><th>Select</th><th>Name</th><th>Total</th><th>Used</th><th>Available</th>';
	buf += '</tr>';
	data.forEach(function(device) {
		buf += '<tr><td>';
		buf += '<input type=radio name=usb_device data-dojo-type="dijit/form/RadioButton"  value="' + device['drive'] + '" />';
		buf += '</td>';
		buf += '<td>' + device['drive'] + '</td>';
		
		buf += '<td><span class=camera_usage> [ ' + device['total'] + ' ]</span></td>';
		buf += '<td><span class=camera_usage> [ ' + device['used'] + ' ]</span></td>';
		buf += '<td><span class=camera_usage> [ ' + device['free'] + ' ]</span></td>';
		buf += '</tr>';
	});
	
	buf += '</table>'
	return buf;
	
}

getListOfVideosCheckBoxes = function(cameras, withUsage) {
	var buf = '';
	
	buf = '<table class=camera_video_list><tr><th>Select</th><th>Name</th>';
	if(withUsage) {
		buf += '<th>Usage</th>';
	}
	buf += '</tr>';
	cameras.forEach(function(camera) {
		buf += '<tr><td>';
		buf += '<input type=checkbox name=camera_' + camera.node_id + ' data-dojo-type="dijit/form/CheckBox" checked value=' + camera.node_name + ' />';
		buf += '</td>';
		buf += '<td><label for=camera_' + camera.node_id + '>' + camera.node_name + '</label></td>';
		
		if(withUsage) {
			buf += '<td><span class=camera_usage> [ ' + getFormattedFileSize(camera['total_size']) + ' ]</span> </td>';
		}
		buf += '</tr>';
	});
	
	buf += '</table>'
	return buf;
	
}

backupVideosNow = function() {
	require(['dojo/query', 'dojo/string'], function(qry, string) {
		if(backupVideosMode == 1) {
			selectedElements = [];
			selectedCameras = '';
			qry('input[type=checkbox][name^=camera]').forEach(function(node, index, nodeList) {
				if(node.checked) {
					selectedElements.push(node);
					selectedCameras += node.value + ','
				}
			});
			
			if(selectedElements.length <= 0) {
				showErrorInformation('Select Camera whose videos to be backed up');
				return;
			}
			if(endsWith(selectedCameras, ",")) {
				selectedCameras = selectedCameras.substring(0, selectedCameras.length - 1);
			}
			console.log('No. of checkboxes selected:' + selectedElements.length);
		}
		selectedUSBDrive = '';
		qry('input[type=radio][name=usb_device]').forEach(function(node, index, nodeList) {
			if(node.checked) {
				selectedUSBDrive = node.value;
			}
		});
		if(string.trim(selectedUSBDrive).length <= 0) {
			showErrorInformation('Select USB Device to copy the videos');
			return;
		}
		console.log('Selected USB Drive:' + selectedUSBDrive);
		
		var data = 'usb_device=' + selectedUSBDrive;
		data += '&auth_id=' +dataStore['auth_id'] + '&mode=' + backupVideosMode;
		if(backupVideosMode == 2) {
		
			var selectedVideoIds = '';
			selectedVideosForBackUp.forEach(function(video) {
				selectedVideoIds += video.timestamp + ',';
			});
			data += '&videos_to_be_copied=' + selectedVideoIds;
			data += '&cameras_to_be_copied=' + backupSelectedCamera;
		} else if(backupVideosMode == 1) {
			data += '&cameras_to_be_copied=' + selectedCameras;
		}
		dojo.byId('backupVideosStatus').innerHTML = 'Backup videos in-progress...';
		dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
		var conn = new modules.BoardConnectionHandler;
		conn.sendPostData('/board/backupVideosNow', data, 'BackupVideosSignal');	
	});
}

dojo.subscribe('BackupVideosSignal', function(e) {
	console.log('BackupVideosSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.byId('backupVideosStatus').innerHTML = e.result;
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	var backupDlg = dijit.byId('backupVideosDlg');
	backupDlg.hide();
	
	if(e.status == 'SUCCESS') {
		showInformation('Successfully started the video back-up.');
	} else {
		showErrorInformation(e.error_info);
	}
});


showUserSettings = function() {
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getBoardStatus', '&auth_id=' +dataStore['auth_id'], 'UserSettingsUIBoardStatusSignal');	
}

dojo.subscribe('UserSettingsUIBoardStatusSignal', function(e) {
	console.log('UserSettingsUIBoardStatusSignal response has come. Value:' + dojo.toJson(e, true));
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
	
	//If video record inprogress; dont allow the user settings update
	showUserSettingsUI(! isVideoRecordInProgress);
	
});

showUserSettingsUI = function(submitAllowed) {

	require(['dojo/query'], function(qry) {
		setStatus('showing the User settings dialog..')
		if('admin_id' in dataStore) {
			setStatus('Admin has already logged in');
			var userSettingsDlg = dijit.byId('settingsDialog');
			userSettingsDlg.set('href', '/board/getUserSettingsPage?auth_id=' + dataStore['auth_id']);
			userSettingsDlg.set("onDownloadEnd", function() {
				dijit.byId('userSettingsSubmit').setDisabled(! submitAllowed);
				dijit.byId('cleanVideoStore').setDisabled(! submitAllowed);
				dijit.byId('setBoardDateTime').setDisabled(! submitAllowed);
				//Do this when we video progress is in-progress
				if(! submitAllowed) {
					qry('a[id$="CameraUserSettings"]').forEach(function(node, index, nodeList) {
						console.log('link has been found');
						node.disabled = (! submitAllowed);
						node.removeAttribute('href');
					});
					qry('a[id$="UserUserSettings"]').forEach(function(node, index, nodeList) {
						console.log('User management link has been found');
						node.disabled = (! submitAllowed);
						node.removeAttribute('href');
					});				}
				if(! submitAllowed) {
					dojo.byId('userSettingsInfo').innerHTML = 'Cannot update the settings when video-recording is in-progress';
				} else {
					dojo.byId('userSettingsInfo').innerHTML = '';
				}
			});
			userSettingsDlg.show();
		} else {
			setStatus('Admin authentication is not done');
			showAdminAuthenticateDlg();
		}	
	});

}

updateUserSettings = function() {
	//alert('Set update user settings');
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var formElements = document.getElementById("usersettings_update").elements;
	var data = '';
	for(var index = 0; index < document.getElementById('usersettings_update').elements.length; index++) {
		var element = document.getElementById('usersettings_update').elements.item(index);
		if(element.type == 'checkbox') {
			data += element.name + '=' + element.checked + '&';
		} else {
			data += element.name + '=' + element.value + '&';
		}
	}
	
	//alert(data);
	var conn = new modules.BoardConnectionHandler;
	var url = '/board/updateUserSettings';
	var data = 'auth_id=' + dataStore['auth_id'] + '&' + data;
	conn.sendPostData(url, data, 'UserSettingsUpdateSignal');	
}

dojo.subscribe('UserSettingsUpdateSignal', function(e) {
	console.log('UserSettingsUpdateSignal response has come. Value:' + dojo.toJson(e, true));
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	
	var userSettingsDlg = dijit.byId('settingsDialog');
	try {
	
		if(e.status === 'SUCCESS') {
			setStatus('User settings has been updated');
			userSettingsDlg.hide();
			
			if(dataStore['refresh_home'])  {
				if(dataStore['refresh_home'] == 1) {
					window.location.reload(true);
				}
			}
		} else {
			setErrorStatus(e.error_info);
			dojo.byId('userSettingsError').innerHTML = e.error_info;
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

cleanVideoStore = function() {
	var userChoice = confirm('All the video files / metadata shall be deleted. Do you want to continue ?');
	if(! userChoice) {
		setStatus('User has cancelled the video store clean.');
		return;
	}
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var conn = new modules.BoardConnectionHandler;
	var url = '/board/clearFilesInAllCameras';
	var data = 'auth_id=' + dataStore['auth_id'];
	conn.sendPostData(url, data, 'CleanVideoStoreSignal');	
}

dojo.subscribe('CleanVideoStoreSignal', function(e) {
	console.log('CleanVideoStoreSignal response has come. Value:' + dojo.toJson(e, true));
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	try {
		if(e.status === 'SUCCESS') {
			refreshBoard();
			showAutoHideInformation('Cleaned the video store.');
		} else {
			setErrorStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

getCameraSelectedFromUserSettings = function() {
	return getCameraDetailsById(dojo.byId('cameraListInSettings').value);
}

function removeSelectOptions(obj) {
	while(obj.options.length) {
		obj.remove(0);
	}
}

updateCameraListInUserSettings = function(cameraList) {
	var cameraListInSettingsSelect = document.getElementById('cameraListInSettings');
	if(cameraListInSettingsSelect) {
		removeSelectOptions(cameraListInSettingsSelect);
		//add the values now
		cameraList.forEach(function(camera){
			var opt = document.createElement('option');
			opt.value = camera.node_id;
			opt.innerHTML = camera.node_name;
			cameraListInSettingsSelect.appendChild(opt);
		});
	}
}

//GetVideoTagsSignal
dojo.subscribe('GetVideoTagsSignal', function(e) {
	console.log('GetVideoTagsSignal response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			if(e.items) {
				e.items.forEach(function(r) {
					videoTags.push(r);
				});
			}
		} else {
			setErrorStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

backUpSelectedVideosUI = function(camera_id) {

	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null) {
		setStatus('Failed to get the camera details for the selected camera');
		return;
	}
	
	var videoContainer = 'div#videoListImagesInBoard_' + camera_id + ' input[type=\'checkbox\']'
	nodes = dojo.query(videoContainer); 
	selectedVideosForBackUp.length = 0;
	dojo.forEach(nodes,function(node) {  
			if(node.checked) {
				var id = node.getAttribute('id');
				var element = dojo.byId(id);
				if(element != null) {
					var videoObj = JSON.parse(element.value);
					selectedVideosForBackUp.push(videoObj);
				}
			}		
		}
	);
	if(selectedVideosForBackUp.length > 0) {
		if('admin_id' in dataStore) {
			dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
			listOfAvailableUSBDevices.length = 0;
			backupVideosMode = 2;
			dojo.empty('list_of_cameras');
			dojo.empty('list_of_videos');
			dojo.empty('list_of_usb_devices');
			backupSelectedCamera = selectedCamera.node_name;
			dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
			var conn = new modules.BoardConnectionHandler;
			conn.sendPostData('/board/getBoardStatus', '&auth_id=' +dataStore['auth_id'], 'BackupVideosBoardStatusSignal')			
		} else {
			setStatus('Admin authentication is not done');
			showAdminAuthenticateDlg();	
		}
	} else {
		showInformation('Select Video files to be backed up');
	}
};

clearBackupVideoStatusList = function() {

}

dojo.subscribe('SetDateTimeInBoardSignal', function(e) {
	console.log('SetDateTimeInBoardSignal response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			showAutoHideInformation('Date time has been set successfully');
		} else {
			setErrorStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

setDateTimeToBoard = function() {
	var selectedDate = dojo.date.locale.format(dijit.byId('userSettingsBoardDate').value, {datePattern: 'dd/MM/yyyy', selector:'date'});
	var selectedTime = dojo.date.locale.format(dijit.byId('userSettingsBoardTime').value, {datePattern: 'hh:mm:ss', selector:'date'});
	alert(dijit.byId('userSettingsBoardTime').value);
	
	//getValue('userSettingsBoardTime').toString().replace(/.*1970\s(\S+).*/, '$1');
	var msg = 'Do you want to set the following Date to board:' + selectedDate + ' ' + selectedTime + ' (dd/MM/yyyy hh:mm:ss) ?';
	
	var option = confirm(msg);
	if(option) {
	
		var conn = new modules.BoardConnectionHandler;
		conn.sendGetData('/board/setDateTimeInBoard', '&auth_id=' +dataStore['auth_id'] + '&date=' + selectedDate + '&time=' + selectedTime, 'SetDateTimeInBoardSignal')				
	} else {
		setStatus('User has cancelled the date time change');
	}
}

showListViewVideosUI = function(camera_id) {
	var itemToShow = dijit.byId('videoListImagesInBoard_' + camera_id);
	dojo.attr(dojo.byId('videoListImagesInBoard_' + camera_id), 'style', 'display:block');
	var itemToHide = dijit.byId('videoGalleryInBoard_' + camera_id)
	dojo.attr(dojo.byId('videoGalleryInBoard_' + camera_id), 'style', 'display:none');
}

showVideoGalleryView = function(camera_id) {
	var itemToHide = dijit.byId('videoListImagesInBoard_' + camera_id);
	dojo.attr(dojo.byId('videoListImagesInBoard_' + camera_id), 'style', 'display:none');
	var itemToShow = dijit.byId('videoGalleryInBoard_' + camera_id)
	dojo.attr(dojo.byId('videoGalleryInBoard_' + camera_id), 'style', 'display:block');
}

startRecordOnEventDetectNowShowSettings = function(camera_id) {
	var selectedCamera = getCameraDetailsById(camera_id);
	if(selectedCamera == null) {
		showErrorInformation('Unable to get the selected camera details. Refresh the page...and try again...');
		return;
	}

	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getCurrentScreeenshotFromCamera', '&auth_id=' +dataStore['auth_id'] + '&node_id=' + selectedCamera.node_id + '&node_name=' + selectedCamera.node_name, 'GetCurrentScreeenshotFromCameraSignal')				
}

dojo.subscribe('GetCurrentScreeenshotFromCameraSignal', function(e) {
	console.log('GetCurrentScreeenshotFromCameraSignal response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			img_src = e['result'];
			dojo.byId('currentCameraViewImg').src = img_src;
			dijit.byId('recordOnEventDetection').show();
		} else {
			setErrorStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showDeleteUserDialog = function() {
	
	var selectedUser = document.getElementById('userListInSettings').value;
	if(selectedUser == dataStore['username']) {
		showErrorInformation("Cannot delete the user as it has been currently logged in now...");
		return;
	}
	if(confirm('Do you want to delete the selected user:' + selectedUser + ' ?')) {
		var conn = new modules.BoardConnectionHandler;
		conn.sendPostData('/board/deleteUser', '&auth_id=' +dataStore['auth_id'] + '&username=' + selectedUser, 'DeleteUserSignal')			
	} else {
		setStatus('User has cancelled the user deletion');
	}
}
dojo.subscribe('DeleteUserSignal', function(e) {
	console.log('DeleteUserSignal response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			var settingsDlg = dijit.byId('settingsDialog');
			settingsDlg.hide();
			showUserSettings();
		} else {
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showAddUserDialog = function() {
	var dlg = dijit.byId('addUserDialog');
	document.getElementById("addUserDialogUsername").value = '';
	document.getElementById("addUserDialogPassword").value = '';
	document.getElementById("addUserDialogConfirmPassword").value = '';
	document.getElementById("addUserDialogEmail").value = '';
	
	dlg.show();
}

createNewUser = function() {
	var userName = dojo.string.trim(document.getElementById("addUserDialogUsername").value);
	var pwd = dojo.string.trim(document.getElementById("addUserDialogPassword").value);
	var cfpwd = dojo.string.trim(document.getElementById("addUserDialogConfirmPassword").value);
	var email = dojo.string.trim(document.getElementById("addUserDialogEmail").value);
	
	if(userName.length <= 0 || pwd.length <= 0 || cfpwd.length <= 0 || email.length <= 0) {
		showErrorInformation('Failed to create New user as mandatory parameters are missing..');
		return;
	}
	
	if(pwd != cfpwd) {
		showErrorInformation('Password and confirm password are not matching..');
		return;
	}
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/createUser', '&auth_id=' +dataStore['auth_id'] + '&username=' + userName + '&password=' + pwd + '&email=' + email, 'CreateNewUserSignal')					
}

dojo.subscribe('CreateNewUserSignal', function(e) {
	console.log('CreateNewUserSignal response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			var dlg = dijit.byId('addUserDialog');
			dlg.hide();
			var settingsDlg = dijit.byId('settingsDialog');
			settingsDlg.hide();
			//settingsDlg.show();
			showUserSettings();
		} else {
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showModifyUserDialog = function() {
	var selectedUser = document.getElementById('userListInSettings').value;
	if(selectedUser == dataStore['username']) {
		showErrorInformation("Cannot modify the user as it has been currently logged in now...");
		return;
	}
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getUser', '&auth_id=' +dataStore['auth_id'] + '&username=' + selectedUser, 'GetUserSignal')	
}

dojo.subscribe('GetUserSignal', function(e) {
	console.log('GetUserSignal response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			showModifyUserDialogWithDetails(e.result);
		} else {
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showModifyUserDialogWithDetails = function(data) {
	var dlg = dijit.byId('modifyUserDialog');
	document.getElementById('modifyUserDialogUsername').value = data['username'];
	document.getElementById("modifyUserDialogOldPassword").value = '';
	document.getElementById("modifyUserDialogPassword").value = '';
	document.getElementById("modifyUserDialogConfirmPassword").value = '';
	document.getElementById("modifyUserDialogEmail").value = data['email'];
	dlg.show();
}

modifySelectedUser = function() {

	var userName = dojo.string.trim(document.getElementById("modifyUserDialogUsername").value);
	var oldpwd = dojo.string.trim(document.getElementById("modifyUserDialogOldPassword").value);
	var pwd = dojo.string.trim(document.getElementById("modifyUserDialogPassword").value);
	var cfpwd = dojo.string.trim(document.getElementById("modifyUserDialogConfirmPassword").value);
	var email = dojo.string.trim(document.getElementById("modifyUserDialogEmail").value);
	
	if((pwd.length != 0 || cfpwd.length != 0) && oldpwd.length <=0) {
		showErrorInformation('Old password is required to set New password');
		return;
	}	
	if((pwd  != cfpwd) && (oldpwd.length != 0)) {
		showErrorInformation('New and Confirm password not matching to set New password');
		return;
	}
	if((pwd.length == 0 &&  cfpwd.length == 0) && (oldpwd.length != 0)) {
		showErrorInformation('New and Confirm password found to be null / empty');
		return;
	}

	if(email.length <= 0) {
		showErrorInformation('Email address cannot be empty');
		return;
	}
	
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/modifyUser', '&auth_id=' +dataStore['auth_id'] + '&username=' + userName + '&oldpwd=' + oldpwd + '&newpwd=' +pwd + '&email=' + email , 'ModifyUserSignal')	
}
	
dojo.subscribe('ModifyUserSignal', function(e) {
	console.log('ModifyUserSignal response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			var dlg = dijit.byId('modifyUserDialog');
			dlg.hide();
			//settingsDlg.show();
			showUserSettings();
		} else {
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showMJPEGLiveStream = function(camera, imgID) {
	console.log('Showing MJPEG stream from url:' + camera.node_url);
}

autoRefreshVideoListInActiveCameraView = function() {

}


