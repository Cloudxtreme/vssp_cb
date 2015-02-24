

loadContainerWithCameraDetails = function() {
	var conn = new modules.BoardConnectionHandler;
	var url = '/board/root';
	var data = 'id=' + dataStore['board_id'] + '&user_id=' + dataStore['user_id'];
	conn.sendGetData(url, data, 'CameraListSignal');	
}


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

getVideoContainer = function(camera, cameraIndex) {
	var data = '<div><span>' + camera.node_name + '</span><br/>';
	data += '<embed type=\'application/x-vlc-plugin\' pluginspage=\'http://www.videolan.org\' id=\'gridCameraLiveViewVideoControl_' +  camera.node_id + '\'';
	data += ' src=\'' + camera.node_url + '\' style=\'width:100%;height:auto\' controls=false/>';
	data += '<object classid=\'clsid:9BE31822-FDAD-461B-AD51-BE1D1C159921\' codebase=\'http://download.videolan.org/pub/videolan/vlc/last/win32/axvlc.cab\'></object>';
	data += '</div>'
	
	
	return data;
}

getTableRowBreakIndex = function(cameraCount) {
	if(cameraCount <= 1) {
		return 1;
	}
	/*
	if(cameraCount <= 4) {
		return 2;
	}
	if(cameraCount > 2 && cameraCount < 4) {
		return 2;
	}
	*/
	return 2;
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

createCameraStackContainer = function(cameraList) {
	
	console.log('Creating the camera stack container: value:' + dojo.toJson(cameraList, true));
	
	var cameraContainer = new dijit.layout.StackContainer({
        //style: "height: 300px; width: 400px;",
        id: "cameraContainer"
    }, 'cameraStackContainer');
	
	var gPage = new dijit.layout.ContentPane({
		id: 'gridPageContainer', 
		title: 'Grid View'
	});
	
	var data = '<table class=gridTable><tr>';
	var cameraIndex = 1;
	var breakIndex = getTableRowBreakIndex(cameraList.length);
	var widthPercentage = getTableColumnWidthPercentage(cameraList.length);
	cameraList.forEach(function(camera) {
		data += '<td width=' + widthPercentage + '% >' + getVideoContainer(camera, cameraIndex) + '</td>';
		if(cameraIndex % breakIndex == 0) {
			data += '</tr><tr>';
		}
		cameraIndex++;
	});
	
	data += '</table>'
	gPage.set('content', data);
	
	cameraContainer.addChild(gPage);
	
	cameraList.forEach(function(camera) {
		console.log('Adding camera:' + camera.node_name);
		var cameraPage = new dijit.layout.ContentPane({
			id: camera.node_id, 
			title: camera.node_name
		});
		cameraPage.set('href', '/board/getBoardCameraViewDetails?node_id=' + camera.node_id);
		cameraPage.set("onDownloadEnd", function() {
			console.log("render the content in the pane now");
			
			try {
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
		cameraContainer.addChild(cameraPage);
	});
	
	
	
	var cameraController = new dijit.layout.StackController({containerId: "cameraContainer"}, "cameraStackController");
	cameraContainer.startup();
	cameraController.startup();
	
	var cameraBorderContainer = dijit.byId('cameraBorderContainer');
	if(cameraBorderContainer) {
		cameraBorderContainer.resize();
	}
	
	setStatus('All Cameras have been added...');
}

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
	dojo.query(nodePropertyGridSelector +  ' td#nodePropertySize')[0].innerHTML = camera.node_files_size;
	setStatus('Loaded the camera details..');
	
	enableDisableVideoRecordOptions(camera);
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
		var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			setStatus('Received the video recording status...');
			if(! e.result) {
				
				//dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:none');
				//dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:block');
				
				setRecordOptionsEnabled(true);
			} else {
			
				//dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:block');
				//dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:none');
				
				setRecordOptionsEnabled(false);
			}
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

setRecordOptionsEnabled = function(status) {
	console.log('The setREcord options enabled:' + status);
	var selectedNode = getSelectedTabNode();
	if(selectedNode) {
		console.log('found the node');
	} else {
		console.log('Failed to find the node');
	}
	if(status) {
		if(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id)) {
			dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:none');
			dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:block');
		
		}
		dojo.attr(dojo.byId('toolbarLiveViewNodeRecord'), 'style', 'display:block');
		dojo.attr(dojo.byId('toolbarLiveViewNodeStopRecord'), 'style', 'display:none');
	} else {
		if(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id)) {
			dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:block');
			dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:none');
		}
		dojo.attr(dojo.byId('toolbarLiveViewNodeRecord'), 'style', 'display:none');
		dojo.attr(dojo.byId('toolbarLiveViewNodeStopRecord'), 'style', 'display:block');	
	}
}

