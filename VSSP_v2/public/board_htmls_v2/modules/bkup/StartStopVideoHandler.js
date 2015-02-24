isNodeVideoRecordingInProgress = function() {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var selectedNode = getSelectedTabNode();
	
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.isVideoRecordingInProgress(selectedNode.node_name, dataStore['auth_id']); 
}

isNodeAvailable = function() {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var selectedNode = getSelectedTabNode();
	var boardAuth = new modules.UserBoardHandler;
	console.log('The data store content is:' + dojo.toJson(dataStore, true));
	boardAuth.isNodeAvailable(selectedNode.node_name, dataStore['auth_id']); 
}

dojo.subscribe('UserBoardNodeAvailableSignal', function(e) {
	console.log('User Board Camera Available response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	var selectedNode = getSelectedTabNode();
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Camera is available... Checking for video recording status...');
			isNodeVideoRecordingInProgress();
			//setStatus('Listed all the nodes...in the board');
		} else {
			setStatus(e.error_info);
			dojo.attr(dojo.byId('boardNodeBoardToolbar_' + selectedNode.node_id), 'style', 'display:none');
			var clientTab = dijit.byId('boardNodeClient_' + selectedNode.node_id);
			if(clientTab) {
				clientTab.set('disabled', true);
				console.log('Set the disabled to true');
			} else {
				console.log('The Board Node Client Tab: is not found');
			}
			showInformation('Node:' + selectedNode.node_name + ' is OFF\n\nInfo:' + e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

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
			listFilesFromBoard();
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

dojo.subscribe('UserBoardNodeStartVideoRecordSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Camera Start Video Record response has come. Value:' + dojo.toJson(e, true));
	try {
		var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			setStatus('Successfully started the video recording...');
			dojo.byId('startVideoRecordErrorPane').innerHTML = '';
			console.log('result is:' + e.result);
			if(! e.result) {
				console.log('Set Record Options Enabled:True');
				//dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:none');
				//dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:block');
				
				setRecordOptionsEnabled(true);
				console.log('Done in True');
			} else {
				//dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:block');
				//dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:none');
				console.log('Set Record Options Enabled:False');
				setRecordOptionsEnabled(false);
				console.log('Done in false');
			}
			var videoRecordSettingsDlg = dijit.byId('VideoRecordSettingsPane');
			videoRecordSettingsDlg.hide();
			//setStatus(e.result);
			
			//do refresh..now..
			refreshNode();
			selectVideoRequestTab();
		} else {
			dojo.byId('startVideoRecordErrorPane').innerHTML = e.error_info;
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

selectVideoRequestTab = function() {
	var selectedNode = getSelectedTabNode();
	/*
	var selectedNode = getSelectedTabNode();
	if(selectedNode) {
		
		//select the video requset tab now
		var tabContainer = dijit.byId('nodeContainer');
		var videoRecordRequestTab = dijit.byId('gridVideoRecordRequestList_' + selectedNode.node_id);
		tabContainer.selectChild(videoRecordRequestTab);
	} else {
		console.log('Failed to find the node');
	}
	*/
	var tab = dijit.byId('boardNodeServerClientContainer_' + selectedNode.node_id);
	var videoRecordRequestTab = dijit.byId('videoRecordRequests_' + selectedNode.node_id);
	tab.selectChild(videoRecordRequestTab);
}

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

dojo.subscribe('UserBoardNodeStopVideoRecordSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Camera Stop Video Record response has come. Value:' + dojo.toJson(e, true));
	try {
		var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			setStatus('Successfully stopped the video recording...');
			//dojo.attr(dojo.byId('toolbarBoardStopRecord_' + selectedNode.node_id), 'style', 'display:none');
			//dojo.attr(dojo.byId('toolbarBoardStartRecord_' + selectedNode.node_id), 'style', 'display:block');
			
			setRecordOptionsEnabled(true);

			setStatus(e.result);
			refreshClientTab();
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

popupVideoSettings = function() {
	var selectedNode = getSelectedTabNode();
	/*
	var videoSettingsDlg = dijit.byId('VideoRecordSettings');
	var recordOption = dijit.byId('listRecordServicesType').get('displayedValue')
	if(recordOption === 'Record Now') {
		//record now options enable / disable scheduled record options
		selectVideoRecordImmediate();
	} else if(recordOption === 'Scheduled Record') {
		//record now options disable / enable scheduled record options
		selectVideoRecordScheduled();
	}
	*/
	
	var dlg = dijit.byId('VideoRecordSettingsPane');
	dlg.set('title', 'Camera:' + selectedNode.node_name + ' Video Record Settings');
	var player = document.getElementById('videoPlayerInVideoRecordSettings');
	var liveURL = selectedNode.node_url;
	player.src = liveURL;
	var container = dijit.byId('videoRecordSettingsTabContainer');
	container.selectChild(dijit.byId('tabVideoRecordSettingsGeneral'));
	
	dijit.byId('listRecordServicesType').set('displayedValue', 'Record Now');
	selectVideoRecordType = 1;
	dojo.attr(dijit.byId('nextRecordButton'), 'label', 'Next');

	dlg.show();	
}


stopRecording = function() {
	var selectedNode = getSelectedTabNode();
	var boardAuth = new modules.UserBoardHandler;

	boardAuth.stopVideoRecording(selectedNode.node_id, selectedNode.node_name,  dataStore['user_id'], dataStore['auth_id']); 
}

confirmUserChoiceDurationOption = function(vpDuration, reqDuration) {
	
	var vpDurationValue = parseInt(vpDuration);
	var reqDurationValue = parseInt(reqDuration);
	
	if(reqDurationValue >= vpDurationValue) {
		return true;
	}
	
	var msg = 'Minimum recording time for the selected profile is:' + vpDurationValue + ' seconds. \nBut, Selected Duration is:' + reqDurationValue + ' seconds. Do you want to reset it to profile duration ?';
	
	var userChoice = confirm(msg);
	return userChoice;
}

startRecord = function() {
	
	//close the window now
	//var videoSettingsDlg = dijit.byId('VideoRecordSettings');
	//videoSettingsDlg.hide();
	
	var selectedNode = getSelectedTabNode();
	var vpDuration = selectedNode.video_length_duration_in_seconds;
	var videoDurationForImmediate = getValue('videoDurationInSeconds');

	if(! confirmUserChoiceDurationOption(vpDuration, videoDurationForImmediate)) {
		setStatus('User has cancelled the Video Recording..');
		return;
	}
	

	var selectedVideoProfileID = getValue('listVideoProfileForRecord');
	var recordServiceType = getValue('listRecordServicesType');
	var recordScheduledType = ' ';
	var recordScheduledDay = ' ';
	var startRecordTime  = ' ';
	var endRecordTime = ' ';
	var selectedDate = ' ';
	var scheduledVideoRecordDuration = ' ';
	var enableMotionDetect = 'off';
	var motionSensitivity = 'min';
	var motionDetectChanges = 'off';
	var enableNotification = 'off';
	var emailList = ' ';
	
	
	
	
	
	if(dijit.byId('enableNotification').checked) {
		enableNotification = 'on';
		emailList = dijit.byId('listOfMailAddresses').value;
	}
	if(dijit.byId('enableMotionDetectAndRecordPane').checked) {
		enableMotionDetect = 'on';
		
		if(dijit.byId('detectSensitivityMin').checked) {
			motionSensitivity = 'min';
		} else if(dijit.byId('detectSensitivityMedium').checked) {
			motionSensitivity = 'medium';
		} else if(dijit.byId('detectSensitivityHigh').checked) {
			motionSensitivity = 'high';
		}
		
		if(dijit.byId('enableMotionDetectChanges').checked) {
			motionDetectChanges = 'on';
		}
	}
		
	if(recordServiceType == 2) {	//for scheduled option
		if(dijit.byId('videoRecordScheduleDaily').checked) {
			recordScheduledType = 'Daily'
		} else if(dijit.byId('videoRecordScheduleWeekly').checked) {
			recordScheduledType = 'Weekly'
		} else if(dijit.byId('videoRecordScheduleOnSelectedDate').checked) {
			recordScheduledType = 'On Date'
		}
		if(dijit.byId('scheduleRecordWeekSunday').checked) {
			recordScheduledDay += '0,'
		}
		if(dijit.byId('scheduleRecordWeekMonday').checked) {
			recordScheduledDay += '1,'
		} 
		if(dijit.byId('scheduleRecordWeekTuesday').checked) {
			recordScheduledDay += '2,'
		} 
		if(dijit.byId('scheduleRecordWeekWednesday').checked) {
			recordScheduledDay += '3,'
		} 
		if(dijit.byId('scheduleRecordWeekThursday').checked) {
			recordScheduledDay += '4,'
		} 
		if(dijit.byId('scheduleRecordWeekFriday').checked) {
			recordScheduledDay += '5,'
		} 
		if(dijit.byId('scheduleRecordWeekSaturday').checked) {
			recordScheduledDay += '6,'
		} 

		
		startRecordTime = getValue('startRecordTime');
		endRecordTime = getValue('endRecordTime');
		
		scheduledVideoRecordDuration = dojo.date.difference(startRecordTime, endRecordTime, 'second');
		console.log('Diffrence in seconds:' + scheduledVideoRecordDuration);
		if(scheduledVideoRecordDuration <= 30) {
			showErrorInformation('Invalid Record Duration. From Record time should be less than To Record time.');
			return;		
		}
		
		if(recordScheduledType == 'Daily') {
			selectedDate = ' ';
			recordScheduledDay = ' ';
		} else if(recordScheduledType == 'Weekly') {
			if(dojo.string.trim(recordScheduledDay).length <= 0) {
				showErrorInformation('Days are not selected. Select the Days for Weekly Scheduled Record');
				return;
			}
			selectedDate = ' ';

			//Remove the , from recordScheduledDay
			recordScheduledDay = dojo.string.trim(recordScheduledDay);
			if(endsWith(recordScheduledDay, ',')) {
				recordScheduledDay = recordScheduledDay.substr(0, recordScheduledDay.length - 1);
			}			
		} else if(recordScheduledType == 'On Date') {
			var dateDetails = dijit.byId('scheduleSpecificDateForRecording').value;
			if(dateDetails == null) {
				showErrorInformation('Date is not selected. Select the date to schedule the video record');
				return;
			}		
			var currentDate = new Date();
			var result = dojo.date.compare(dateDetails, currentDate, 'date');
			console.log('Date comparison results:' + result);
			if(result == -1) {
				showErrorInformation('Invalid Start date for scheduling the video record (Found as Past Date). <br/>Select the Current / Future date for scheduling');
				return;
			}
			recordScheduledDay = ' ';
			selectedDate = dojo.date.locale.format(dijit.byId('scheduleSpecificDateForRecording').value, {datePattern: 'dd/MM/yyyy', selector:'date'});
		}
		
		
		startRecordTime = getValue('startRecordTime').toString().replace(/.*1970\s(\S+).*/, '$1');
		endRecordTime = getValue('endRecordTime').toString().replace(/.*1970\s(\S+).*/, '$1');
	}
		
	console.log('Video Record Option: Duration:' + videoDurationForImmediate + ', Video profile selected:' + selectedVideoProfileID + ', Record Service Type:' + recordServiceType + ', Scheduled Type:' + recordScheduledType + ', Start Record Time:' + startRecordTime + ', End Record Time:' + endRecordTime + ', Day:' + recordScheduledDay + ', date:' + selectedDate + ', Scheduled record duration:' + scheduledVideoRecordDuration + ', Motion Detect:' + enableMotionDetect + ', motionSensitivity:' + motionSensitivity + ', motionDetectChanges:' + motionDetectChanges + ', enable notification:' + enableNotification + ', email list:' + emailList);
	var selectedNode = getSelectedTabNode();

	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.startVideoRecording(selectedNode.node_id, selectedNode.node_name, videoDurationForImmediate, selectedVideoProfileID, recordServiceType, recordScheduledType, startRecordTime, endRecordTime, scheduledVideoRecordDuration, recordScheduledDay, enableMotionDetect, motionSensitivity, motionDetectChanges, selectedDate, enableNotification, emailList, dataStore['user_id'], dataStore['auth_id']); 
}