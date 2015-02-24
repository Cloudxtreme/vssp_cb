
viewCamera = function() {
	
	var selectedNode = getSelectedTabNode();
	if(selectedNode == null) {
		showErrorInformation("Failed to get the node details");
		return;
	}
	var mediaFile = selectedNode.node_url;
	/*
	dojo.style(dojo.byId('videoPlayerFileProperties'), 'display', 'none');
	dojo.byId('videoPlayerFileName').innerHTML = '';
	dojo.byId('videoPlayerFileSize').innerHTML = '';
	dojo.byId('videoPlayerFileCreatedDate').innerHTML = '';
	dojo.byId('videoPlayerFileNodeName').innerHTML = selectedNode.node_name;
	dojo.byId('videoPlayerFileBoardName').innerHTML = '';
	require(["dijit/Dialog", "dojo/domReady!"], function(Dialog) {
		myDialog = new Dialog( {
			title: "Video Player",
			
	});
	startEventListeningForVideo();
	*/
	var liveViewVideoControl = document.getElementById('liveViewVideoControl');
	liveViewVideoControl.src = mediaFile;
	
	var liveViewVideoPlayer = dijit.byId('LiveViewVideoPlayer');
	
	liveViewVideoPlayer.set('title', 'Camera:' + selectedNode.node_name + ' - LIVE VIEW');
	//videoPlayer.resize();
	liveViewVideoPlayer.show();	
}


showVideoPlayer = function(selectedNode, video) {
	clearMetaDataOfVideoDetails();
	fileToPlay = dojo.string.trim(video['filePath']);
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
	dojo.byId('videoPlayerFileSize').innerHTML = getFormattedFileSize(video['size']);
	dojo.byId('videoPlayerFileCreatedDate').innerHTML = video['createdDate'];
	dojo.byId('videoPlayerFileNodeName').innerHTML = video['Node'];	
	dojo.byId('videoPlayerFileBoardName').innerHTML = video['Board'];

	dojo.byId('videoPlayerFileDuration').innerHTML = video['Duration'];
	dojo.byId('videoPlayerFileBitrate').innerHTML = video['bitrate'];
	dojo.byId('videoPlayerFileEncoder').innerHTML = video['encoder'];
	dojo.byId('videoPlayerFileTitle').innerHTML = video['title'];
	dojo.byId('videoPlayerFileMajorBrand').innerHTML = video['majorBrand'];
	dojo.byId('videoPlayerFileminorVersion').innerHTML = video['minorVersion'];
	dojo.byId('videoPlayerFilecompatibleBrands').innerHTML = video['compatibleBrands'];
	dojo.byId('videoPlayerFileScreenSize').innerHTML = video['Screen Size'];
	dojo.byId('videoPlayerFileFPS').innerHTML = video['FPS'];
	dojo.byId('videoPlayerFileVideoSpec').innerHTML = video['Video Spec'];

	
	dojo.style(dojo.byId('videoPlayerFileProperties'), 'display', 'block');
	var videoPlayer = dijit.byId('VideoPlayer');
	videoPlayer.set('title', 'Camera:' + selectedNode.node_name + ' - Video - ' + file);
	videoPlayer.show();
	//dojo.empty("videoPlayerMain");
	//flVideo.placeAt("videoPlayerMain");
	//flVideo.startup();
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

getVideoPlayerContent = function(cameraIndex, cameraName, cameraWidth, cameraHeight, url, location) {
	//content = "<table id='cameraView'><tr><td>";
	content = "<form><fieldset><legend class='CameraPreview'><b><REPLACE_NODE_NAME></b></legend><div style='float:center'><embed type='application/x-vlc-plugin' pluginspage='http://www.videolan.org' id='videoControl_<REPLACE_INDEX>' width = '<REPLACE_WIDTH>' height='<REPLACE_HEIGHT>' target='<REPLACE_URL>' title='<REPLACE_NODE_NAME>/>";
	content += "<object classid='clsid:9BE31822-FDAD-461B-AD51-BE1D1C159921' codebase='http://download.videolan.org/pub/videolan/vlc/last/win32/axvlc.cab'></object>";
	content += "<span class='CameraNameDisplay'><REPLACE_NODE_NAME_DISPLAY></span>";
	content += "</div></fieldset></form>";
	
	content = content.replace('<REPLACE_INDEX>', cameraIndex);
	content = content.replace('<REPLACE_WIDTH>', cameraWidth);
	content = content.replace('<REPLACE_HEIGHT>', cameraHeight);
	content = content.replace('<REPLACE_URL>', url);
	content = content.replace('<REPLACE_NODE_NAME>', cameraName);	
	content = content.replace('<REPLACE_NODE_NAME_DISPLAY>', cameraName + ' at ' + location);	
	return content;
}

showAllCameraViewsInSingleWindow = function() {
	console.log('Showing all the cameras in single window');
	var videoPlayers = [];
	availableNodeDetails.forEach(function(node) {
		videoPlayers.push(getVideoPlayerContent(node.node_id, node.node_name, '320', '240', node.node_url, node.node_location));
	});
	

	var videoPlayerTable = '<table id="videoPlayerTable">';
	videoPlayerTable += '<tr>';
	var playerIndex = 0;
	videoPlayers.forEach(function(player) {
		playerIndex++;
		videoPlayerTable += "<td>" + player + "</td>";
		if(playerIndex %2 == 0) {
			videoPlayerTable += "</tr><tr>";
		}
	});
	videoPlayerTable += "</tr>";
	videoPlayerTable += "</table>";
	
	console.log('Video Player content:' + videoPlayerTable);

	var videoPlayerContent = '<div class="dijitDialogPaneContentArea">' + videoPlayerTable + '</div>';
	
	var dlg = new dijit.Dialog( {
		title: 'Camera Viewer',
		style: 'width:700px'
		});
	dlg.set('content', videoPlayerContent);
	dlg.show();
}

registerVLCEvent = function(event, handler) {
	console.log('Calling event:' + event);
	var videoControl = document.getElementById('videoControl');
	//console.log('Version:' + videoControl.versionInfo());
	if(videoControl) {
		if(videoControl.attachEvent) {
			videoControl.attachEvent(event, handler);
		} else if(videoControl.addEventListener) {
			videoControl.addEventListener(event, handler, false);
		} else {
			videoControl['on' + event] = handler;
		}
	} else {
		console.log('Video control not found');
	}
}

unRegisterVLCEvent = function(event, handler) {
	var videoControl = document.getElementById('videoControl');
	if(videoControl) {
		if(videoControl.detachEvent) {
			videoControl.detachEvent(event, handler);
		} else if(videoControl.removeEventListener) {
			videoControl.removeEventListener(event, handler, false);
		} else {
			videoControl['on' + event] = null;
		}
	} else {
		console.log('Video control not found');
	}
}

handleEvents = function(event) {
	if(! event) {
		event = window.event;
		
		if(event.target) {
			targ = event.target;
		} else if(event.srcElement) {
			targ = event.srcElement;
		} else {
			console.log('Event value:' + event);
			return;
		}
		if(targ.nodeType == 3) {
			targ = targ.parentNode;
			console.log('Event:' + event.type + ' has fired from:' + targ);
		} else {
			console.log('Event node type is:' + targ.nodeType);
		}
	} else {
		console.log('Event is not valid');
	}
}

startEventListeningForVideo = function() {
	registerVLCEvent('MediaPlayerNothingSpecial', handleEvents);
	registerVLCEvent('MediaPlayerOpening', handleEvents);
	registerVLCEvent('MediaPlayerBuffering', handleEvents);
	registerVLCEvent('MediaPlayerPlaying', handleEvents);
	registerVLCEvent('MediaPlayerPaused', handleEvents);
	registerVLCEvent('MediaPlayerForward', handleEvents);
	registerVLCEvent('MediaPlayerBackward', handleEvents);
	registerVLCEvent('MediaPlayerEncounteredError', handleEvents);
	registerVLCEvent('MediaPlayerEndReached', handleEvents);
	registerVLCEvent('MediaPlayerTimeReached', handleEvents);
	registerVLCEvent('MediaPlayerPositionChanged', handleEvents);
	registerVLCEvent('MediaPlayerSeekableChanged', handleEvents);
	registerVLCEvent('MediaPlayerPausableChanged', handleEvents);
}



