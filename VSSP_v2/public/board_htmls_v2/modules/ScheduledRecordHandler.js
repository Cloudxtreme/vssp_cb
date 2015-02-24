var scheduleRecordType = -1;
var selectedCameraForScheduledVideoRecord;
customRecord = function(camera_id) {
	
	scheduleRecordType = 0;
	selectedCameraForScheduledVideoRecord = getCameraDetailsById(camera_id);
	
	dijit.byId('videoRecordScheduleDaily').set('checked', true);
	var dlg = dijit.byId('VideoRecordSettingsPane');
	
	selectDailyVideoRecordSetting();
	var p = dijit.byId('videoRecordSettingsWizardPane');
	p.selectChild(dijit.byId('scheduleRecordTypePane'))	
	dlg.show();
}

function  selectDailyVideoRecordSetting() {
	scheduleRecordType = 0;
	//alert(scheduleRecordType);
	
	//var p = dijit.byId('videoRecordSettingsWizardPane');
	//p.selectChild(dijit.byId('scheduleRecordTimeOptionsPane'));
	dojo.attr(dojo.byId('scheduleRecordDayOptions'), 'style', 'display:none');
	dojo.attr(dojo.byId('scheduleRecordWeekOptions'), 'style', 'display:none');	
	dojo.attr(dojo.byId('scheduleRecordNoOptions'), 'style', 'display:block');
	
}

function  selectWeeklyVideoRecordSetting() {
	scheduleRecordType = 1;
	//alert(scheduleRecordType);
	dojo.attr(dojo.byId('scheduleRecordDayOptions'), 'style', 'display:none');
	dojo.attr(dojo.byId('scheduleRecordWeekOptions'), 'style', 'display:block');	
	dojo.attr(dojo.byId('scheduleRecordNoOptions'), 'style', 'display:none');
}

function  selectSpecoficVideoRecordSetting() {
	scheduleRecordType = 2;
	//alert(scheduleRecordType);
	showSelectedDateDesc(dijit.byId('scheduleSpecificDateForRecording').value);
	dojo.attr(dojo.byId('scheduleRecordDayOptions'), 'style', 'display:block');
	dojo.attr(dojo.byId('scheduleRecordWeekOptions'), 'style', 'display:none');	
	dojo.attr(dojo.byId('scheduleRecordNoOptions'), 'style', 'display:none');
	
}

checkDailyOptions = function() {

	if(scheduleRecordType == 0) {		
		var p = dijit.byId('videoRecordSettingsWizardPane');
		//p.selectChild(dijit.byId('scheduleRecordTimeOptionsPane'), false);
		//p.forward();
	}
}

function getSelectedRecordTypeForDisplay() {

	if(scheduleRecordType == 0) {
		return 'Daily';
	}
	if(scheduleRecordType == 1) {
		return 'Weekly';
	}
	if(scheduleRecordType == 2) {
		return 'On Specific Date';
	}
}

function getSelectedRecordTimingsForDisplay() {

	startRecordTime = getValue('startRecordTime').toString().replace(/.*1970\s(\S+).*/, '$1');
	endRecordTime = getValue('endRecordTime').toString().replace(/.*1970\s(\S+).*/, '$1');
	
	return startRecordTime + ' To ' + endRecordTime;
}

function getSelectedRecordSpecificDateForDisplay() {

	return dojo.date.locale.format(dijit.byId('scheduleSpecificDateForRecording').value, {datePattern: 'MM/dd/yyyy', selector:'date'})  + ' (MM/dd/yyyy) ';
}

function getSelectedWeekDaysForDisplay() {
	var recordScheduledDay = '';
	
	if(dijit.byId('scheduleRecordWeekSunday').checked) {
		recordScheduledDay += ' Sunday, '
	}
	if(dijit.byId('scheduleRecordWeekMonday').checked) {
		recordScheduledDay += 'Monday, '
	} 
	if(dijit.byId('scheduleRecordWeekTuesday').checked) {
		recordScheduledDay += 'Tuesday, '
	} 
	if(dijit.byId('scheduleRecordWeekWednesday').checked) {
		recordScheduledDay += 'Wednesday, '
	} 
	if(dijit.byId('scheduleRecordWeekThursday').checked) {
		recordScheduledDay += 'Thursday, '
	} 
	if(dijit.byId('scheduleRecordWeekFriday').checked) {
		recordScheduledDay += 'Friday, '
	} 
	if(dijit.byId('scheduleRecordWeekSaturday').checked) {
		recordScheduledDay += 'Saturday '
	} 
	return recordScheduledDay;
}

function getNumberOfDaysForRecording() {
	var noOfDays = 0;
	if(scheduleRecordType == 0 || scheduleRecordType == 2) {
		noOfDays = 1;
		return noOfDays;
	} else if(scheduleRecordType == 1) {
		if(dijit.byId('scheduleRecordWeekSunday').checked) {
			noOfDays = 1;
		}
		if(dijit.byId('scheduleRecordWeekMonday').checked) {
			noOfDays += 1;
		} 
		if(dijit.byId('scheduleRecordWeekTuesday').checked) {
			noOfDays += 1;
		} 
		if(dijit.byId('scheduleRecordWeekWednesday').checked) {
			noOfDays += 1;
		} 
		if(dijit.byId('scheduleRecordWeekThursday').checked) {
			noOfDays += 1;
		} 
		if(dijit.byId('scheduleRecordWeekFriday').checked) {
			noOfDays += 1;
		} 
		if(dijit.byId('scheduleRecordWeekSaturday').checked) {
			noOfDays += 1;
		} 
	}
	console.log('Total no. of days:' + noOfDays);
	return noOfDays;
}

function getDurationInHumanReadableFormat(timeMillis){
    var units = [
        {label:"millis",    mod:1000,},
        {label:"seconds",   mod:60,},
        {label:"minutes",   mod:60,},
        {label:"hours",     mod:24,},
        {label:"days",      mod:7,} 
    ];
	
	//, {label:"weeks",     mod:52,},
    var duration = new Object();
    var x = timeMillis;
    for (i = 0; i < units.length; i++){
        var tmp = x % units[i].mod;
        duration[units[i].label] = tmp;
        x = (x - tmp) / units[i].mod
    }
	var str = '';
	
	if(duration.days > 0) {
		str = duration.days * 24 + duration.hours + " hours, ";
		str += duration.minutes + " mins, ";
		str += duration.seconds + " secs "; 
	} else {	
		if(duration.hours > 0) {
			str = duration.hours + " hours, ";
			str += duration.minutes + " mins, ";
			str += duration.seconds + " secs "; 
		} else {
			if(duration.minutes > 0) {
				str = duration.minutes + " mins, ";
				str += duration.seconds + " secs "; 
			}		
		}
	}	
	return str;
}

function getRecordDuration() {
	var startRecordTime = getValue('startRecordTime');
	var endRecordTime = getValue('endRecordTime');
	var duration =  dojo.date.difference(startRecordTime, endRecordTime, 'second');
	return duration;
}

getEstimatedRecordingHours = function() {
	var data = getSelectedRecordTypeForDisplay();
	var durationInSeconds = getNumberOfDaysForRecording() * getRecordDuration();
	console.log('Duration seconds:' + durationInSeconds);
	duration = getDurationInHumanReadableFormat(durationInSeconds * 1000);
	return data + ' : ' + duration;
}

checkRecordTimeOptions = function() {

	var noError = false;
	errMsg = '';
	
	var startRecordTime = getValue('startRecordTime');
	var endRecordTime = getValue('endRecordTime');
	
	var scheduledVideoRecordDuration = dojo.date.difference(startRecordTime, endRecordTime, 'second');
	if(scheduledVideoRecordDuration <= 30) {
		errMsg = 'Invalid Record Duration. From Record time should be less than To Record time.';
		return errMsg;		
	}
	
	//set the confirmation dates
	dojo.byId('spanScheduledRecordType').innerHTML = getSelectedRecordTypeForDisplay();
	if(scheduleRecordType == 1) {
		dojo.byId('spanScheduledRecordSelectedDays').innerHTML = getSelectedWeekDaysForDisplay();
	} else if(scheduleRecordType == 2) {
		dojo.byId('spanScheduledRecordSelectedDays').innerHTML = getSelectedRecordSpecificDateForDisplay();
	} else if(scheduleRecordType == 0) {
		dojo.byId('spanScheduledRecordSelectedDays').innerHTML = 'N/A';
	}
	dojo.byId('spanScheduledRecordTimings').innerHTML = getSelectedRecordTimingsForDisplay();
	dojo.byId('spanScheduledRecordEstimatedDuration').innerHTML = getEstimatedRecordingHours();
}

checkWeeklyOptions = function() {
	var noError = false;
	errMsg = '';
	require(['dojo/query'], function(qry) {
		if(scheduleRecordType == 1) {	//for weekly
			qry('input[type=checkbox][id^=scheduleRecordWeek]').forEach(function(node, index, nodeList) {
				if(node.checked) {
					noError = true;
				}
			});
			
			if(! noError) {
				errMsg = 'Atleast one day in a week must be selected for Weekly Recording.';
			}
		} else if(scheduleRecordType == 2  ) {	//for on selected date
			//check the date as it should not be yesterday..
			var dateDetails = dijit.byId('scheduleSpecificDateForRecording').value;
			if(dateDetails == null) {
				errMsg = 'Date is not selected. Select the date to schedule the video record';
				return;
			}		
			var currentDate = new Date();
			var result = dojo.date.compare(dateDetails, currentDate, 'date');
			console.log('Date comparison results:' + result);
			if(result == -1) {
				errMsg = 'Invalid Start date for scheduling the video record (Found as Past Date). Select the Current / Future date for scheduling';
				return;
			}	
			noError = true;
		} else if(scheduleRecordType == 0 ) {	//for  daily
			noError = true;	//by default widjet selects today's date
		}
	});
	if(! noError) {
		return errMsg;
	}

}

showSelectedDateDesc = function(value) {
	dojo.byId('scheduleSpecificDateForRecordingSelectedDate').innerHTML = dojo.date.locale.format(value, {formatLength: 'full', selector:'date'});
}

saveScheduledRecord = function() {
	var dlg = dijit.byId('VideoRecordSettingsPane');
	if(! confirm('Do you want to schedule recording based on the chosen settings ?')) {
		setStatus('User cancelled the video scheduled recording...');
		return;
	}
	dlg.hide();
	
	if(selectedCameraForScheduledVideoRecord == null) {
		showErrorInformation('Error occurred while looking for the Camera for scheduled video record');
		return;
	}
	
	var videoDurationForImmediate = '0';
	var selectedVideoProfileID = getValue('listVideoProfileForRecord');
	var recordServiceType = '2';	//for scheduled record option
	var enableMotionDetect = 'off';
	var motionSensitivity = 'min';
	var motionDetectChanges = 'off';
	var enableNotification = 'off';
	var emailList = ' ';
	var selectedDate = ' ';
	var recordScheduledDay = ' ';
	
	
	var recordScheduledType = 'Daily';
	if(scheduleRecordType == 1) {
		recordScheduledType = 'Weekly';
	} else if(scheduleRecordType == 2) {
		recordScheduledType = 'On Date';
	}
	
	if(scheduleRecordType == 0) {
		selectedDate = ' ';
		recordScheduledDay = ' ';
	} else if(scheduleRecordType == 1) {
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
		
		recordScheduledDay = dojo.string.trim(recordScheduledDay);
		if(endsWith(recordScheduledDay, ',')) {
			recordScheduledDay = recordScheduledDay.substr(0, recordScheduledDay.length - 1);
		}	
		selectedDate = ' ';
	} else if(scheduleRecordType == 2) {
		
		recordScheduledDay = ' ';
		selectedDate = dojo.date.locale.format(dijit.byId('scheduleSpecificDateForRecording').value, {datePattern: 'dd/MM/yyyy', selector:'date'});
	}

	var startRecordTime = getValue('startRecordTime')
	var endRecordTime = getValue('endRecordTime');
	var scheduledVideoRecordDuration = dojo.date.difference(startRecordTime, endRecordTime, 'second');
	
	startRecordTime = startRecordTime.toString().replace(/.*1970\s(\S+).*/, '$1');
	endRecordTime = endRecordTime.toString().replace(/.*1970\s(\S+).*/, '$1');
	
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.scheduleVideoRecording(selectedCameraForScheduledVideoRecord.node_id, selectedCameraForScheduledVideoRecord.node_name, videoDurationForImmediate, selectedVideoProfileID, recordServiceType, recordScheduledType, startRecordTime, endRecordTime, scheduledVideoRecordDuration, recordScheduledDay, enableMotionDetect, motionSensitivity, motionDetectChanges, selectedDate, enableNotification, emailList, dataStore['user_id'], dataStore['auth_id']);	
} 


dojo.subscribe('UserBoardNodeScheduleVideoRecordSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Camera Schedule Video Record response has come. Value:' + dojo.toJson(e, true));
	try {
		
		if(e.status === 'SUCCESS') {
			showAutoHideInformation('Successfully scheduled the video recording...');
			refreshListOfServiceRequests(e.node_id);
		} else {
			setStatus(e.error_info);
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});
function refreshListOfServiceRequests(camera_id) {
	populateScheduleRecordRequests(camera_id);
}

function deleteServiceRequests(camera_id) {
	var grid = dijit.byId('gridScheduledRecordRequestsList_' +  camera_id);
	if(grid == null) {
		showErrorInformation('Failed to delete the scheduled vidoe record request as the grid is found to be null');
		return;
	}
	
	
	var items = grid.selection.getSelected();
	if(items.length){
		var item = items[0];
		if(! confirm('Do you want to delete the selected scheduled video record request.. ?')) {
			setStatus('User cancelled the deletion of scheduled video record request');
			return;
		}		
		deleteScheduledVideoRecordRequest(item);
	} else {
		showInformation("Select an row to delete the scheduled video record request");
	}
}

function deleteScheduledVideoRecordRequest(item) {
	if(item == null) {
		return;
	}
	var videoBatchID = item['videoBatchID'];
	if(videoBatchID == undefined || dojo.string.trim(videoBatchID).length <= 0) {
		showErrorInformation("Failed to get the batch id of the scheduled video record request");
		return;
	}
	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.removeScheduledServiceRequest('', videoBatchID, dataStore['auth_id'], item['node_id']);	
}

function getFormattedRecordDuration(item, rowIndex, cell) {
	var store = cell.grid.store;
	
    var type = store.getValue(item, "record_schedule_type");
	var days =  store.getValue(item, "record_schedule_day");
	var noOfDays = 1;
	if(type == 'Weekly') {
		days = dojo.string.trim(days);
		if(endsWith(days, ',')) {
			days = days.substr(0, days.length - 1);
		}			
		var tokens = days.split(',');
		noOfDays = tokens.length;
	}
	
	var duration = store.getValue(item, 'scheduled_record_duration') * 1000;
	return type + ' : ' + getDurationInHumanReadableFormat(noOfDays * duration);
}

getFormattedDayDetails = function(item, rowIndex, cell) {
	var store = cell.grid.store;
	
    var type = store.getValue(item, "record_schedule_type");
	var days =  store.getValue(item, "record_schedule_day");
	var selected_date = store.getValue(item, "selected_date");
	
	if(type == 'Daily') {
		return 'NA';
	}
	if(type == 'Weekly') {
		var daysInWeek = '';
		if(days.indexOf('1') != -1) {
			daysInWeek += 'Mon, ';
		}
		if(days.indexOf('2') != -1) {
			daysInWeek += 'Tue, ';
		}
		if(days.indexOf('3') != -1) {
			daysInWeek += 'Wed, ';
		}
		if(days.indexOf('4') != -1) {
			daysInWeek += 'Thu, ';
		}
		if(days.indexOf('5') != -1) {
			daysInWeek += 'Fri, ';
		}
		if(days.indexOf('6') != -1) {
			daysInWeek += 'Sat, ';
		}
		if(days.indexOf('0') != -1) {
			daysInWeek += 'Sun, ';
		}
		daysInWeek = dojo.string.trim(daysInWeek);
		if(endsWith(daysInWeek, ',')) {
			daysInWeek = daysInWeek.substr(0, daysInWeek.length - 1);
		}			
		return daysInWeek;
	}
	if(type == 'On Date') {
		return selected_date;
	}
} 

populateScheduleRecordRequests = function(camera_id) {

	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	
	var url = '/board/listScheduledServiceRequests?auth_id=' + dataStore['auth_id'] + '&node_id=' + camera_id;
	//console.log('loading url:' + url);
	scheduledRecordListJsonRest = new dojo.store.JsonRest( { 
													target : url,
													idProperty: "list_scheduled_record_list_store"
												}
										);
	scheduledRecordListStore = new dojo.data.ObjectStore( { objectStore: scheduledRecordListJsonRest });
	var grid = dijit.byId('gridScheduledRecordRequestsList_' +  camera_id);
	if(grid == null) {
		grid = new dojox.grid.EnhancedGrid( {
								id: 'gridScheduledRecordRequestsList_' +  camera_id,
								selectable: true,
								store : scheduledRecordListStore,
								structure : [
									{ name : 'id' , field : 'id', hidden: true },
									{ name : 'batch_id', field : 'videoBatchID', hidden: true},
									{ name : 'Record Frequency' , field : 'record_schedule_type', width: '120px'},
									{ name : 'Day (DD/MM/YYYY)' , field : "_item", formatter : getFormattedDayDetails, width: '240px'},
									{ name : 'Start Time' , field : 'start_record_time', width: '60px', datatype: 'date', dataTypeArgs: { datePattern: 'HH:mm:SS'}},
									{ name : 'End Time' , field : 'end_record_time', width: '60px', datatype: 'date', dataTypeArgs: { datePattern: 'HH:mm:SS'}},
									{ name : 'Record Duration' , field : "_item",  width: '250px', formatter : getFormattedRecordDuration}
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
											itemsName: "scheduled_record_list"
										}
									}
							});
		dojo.attr('scheduledRecordRequestsList_' +  camera_id, 'style', 'width:100%; height:100%');
		grid.placeAt('scheduledRecordRequestsList_' +  camera_id);
		grid.startup();
	} else {
		grid.setStore(scheduledRecordListStore);
	}
	//dojo.empty('scheduledRecordRequestsList_' +  camera_id);
	
	
	console.log('Listed all the scheduled record list');	
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
}

dojo.subscribe('RemoveScheduledServiceRequestSignal', function(e) {
	console.log('RemoveScheduledServiceRequestSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Received the success for delete scheduled video record request...');
			populateScheduleRecordRequests(e.node_id);
		} else {
			setErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});
