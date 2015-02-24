refreshVideoRecordServices = function() {
	listVideoRecordRequests();
}


listVideoRecordRequests = function() {
	console.log('Listing Video Record Requests...');
	var selectedNode = getSelectedTabNode();
	
	dojo.attr(dojo.byId('videoRecordRequestList_' + selectedNode.node_id), 'style', 'display:block');
	
	//var boardAuth = new modules.UserBoardHandler;
	//boardAuth.listFiles(selectedNode.board_ip, selectedNode.board_port, selectedNode.name, boardAuthDetails[selectedNode.board_id]); 
	var url = '/board/listVideoRecordRequests?node_name=' + selectedNode.node_name + '&node_id=' + selectedNode.node_id;
	url += '&auth_id=' + dataStore['auth_id'] + '&user_id=' + dataStore['user_id'];
	//console.log('loading url:' + url);
	videoStoreInBoard = new dojo.store.JsonRest( { 
													target : url,
													idProperty: "video_record_service_id"
												}
										);
	videoStore = new dojo.data.ObjectStore( { objectStore: videoStoreInBoard });
	grid = new dojox.grid.EnhancedGrid( {
							//id: 'gridVideoRecordRequestList_' + selectedNode.node_id,
							selectable: true,
							store : videoStore,
							structure : [
								{ name : 'id' , field : 'video_record_service_id', hidden: true },
								{ name : 'Name' , field : 'video_record_service_name', hidden: true},
								{ name : 'Service Type' , field : 'record_service_type_name', formatter : getVideoRecordServiceTypeName, width: '120px', classes: 'file_name_column'},
								{ name : 'Schedule Info' , field : 'video_record_service_schedule_command', formatter : getScheduleInfoDetails, width: '150px'},
								{ name : 'Record Duration (seconds)' , field : 'record_duration_in_seconds', width: '100px',  datatype: 'number'},
								{ name : 'Video Profile' , field : 'video_profile_name', width: '70px' },
								{ name : 'Status' , field : 'video_record_service_status', formatter : getVideoRecordServiceStatus, width: '75px'},
								{ name : 'Batch ID' , field : 'video_record_batch_id', width: '120px' },
								{ name : 'Recorded By' , field : 'video_record_services_parent_batch_id', width: '110px'},
								{ name : 'Created Date' , field : 'created_date', width: '120px', formatter : getVideoRecordServiceDate,  datatype: 'date', dataTypeArgs: { datePattern: 'yyyy-MM-dd HH:mm:SS'} }
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
										itemsName: "video_record_services"
									}
								}
						});
	//console.log('Grid has been successfully created');
	boardVideoRecordRequestGrids[selectedNode.node_id] = grid;
	dojo.connect(grid, 'onRowClick', function(item) {
		var selectedServiceRequest = getSelectedServiceRequest();
		if(selectedServiceRequest == null) {
			return;
		}
		console.log('Selected Request is:' + dojo.toJson(selectedServiceRequest, true));
		enableDisableRemoveServiceRequest(selectedServiceRequest, selectedNode);
	});
	dojo.connect(grid, 'onRowDblClick', function(item) {
		var selectedNode = getSelectedNode();
		/*
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
		*/
		/*
		var id = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'id');
		var filePath = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Path');
		var size = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Size');
		var createdDate = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'ctime');
		*/
		//showVideoPlayer(selectedNode, id, filePath, size, createdDate);
		/*
		showVideoPlayer(selectedNode, selectedVideo);
		*/
	});
	dojo.empty('videoRecordRequestList_' + selectedNode.node_id);
	
	dojo.attr('videoRecordRequestList_' + selectedNode.node_id, 'style', 'width:100%; height:100%');
	grid.placeAt('videoRecordRequestList_'  + selectedNode.node_id);
	grid.startup();
	console.log('List Video Record Services Grid has been successfully started');
}

getSelectedServiceRequest = function() {
	var selectedNode = getSelectedTabNode();
	if(selectedNode == null) {
		return null;
	}
	
	var index =  boardVideoRecordRequestGrids[selectedNode.node_id].selection.selectedIndex;
	if(index == -1) {
		console.log('User hasnt selected any row to remove');
		return;
	}
	console.log('Selected row index is:' + index);
	var selectedServiceRequest = boardVideoRecordRequestGrids[selectedNode.node_id].getItem(index);
	if(selectedServiceRequest == null) {
		console.log('The selected row item object found to be null');
		return;
	}
	console.log('Selected item is:' + dojo.toJson(selectedServiceRequest, true));
	/*
	var selectedServiceRequest = {};
	selectedServiceRequest['video_record_service_id'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'video_record_service_id');
	selectedServiceRequest['video_record_service_name'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'video_record_service_name');
	selectedServiceRequest['record_service_type_name'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'record_service_type_name');
	selectedServiceRequest['video_record_service_schedule_command'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'video_record_service_schedule_command');
	selectedServiceRequest['record_duration_in_seconds'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'record_duration_in_seconds');
	selectedServiceRequest['video_profile_name'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'video_profile_name');
	selectedServiceRequest['video_record_service_status'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'video_record_service_status');
	selectedServiceRequest['video_record_batch_id'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'video_record_batch_id');
	selectedServiceRequest['video_record_services_parent_batch_id'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'video_record_services_parent_batch_id');
	selectedServiceRequest['created_date'] = boardVideoRecordRequestGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'created_date');
	*/
	
	return selectedServiceRequest;
}

enableDisableRemoveServiceRequest = function(serviceRequest, selectedNode) {
	if(serviceRequest == null) {
		return;
	}
	var toolBarRemoveServiceRequest = dijit.byId('toolbarRemoveServiceRequest_' + selectedNode.node_id);
	if(toolBarRemoveServiceRequest != null) {
		if(serviceRequest['record_service_type_name'] === 'Scheduled Record' && serviceRequest['video_record_service_status'] === 'RECORDING SCHEDULED') {
			toolBarRemoveServiceRequest.set('disabled', false);
		} else {
			toolBarRemoveServiceRequest.set('disabled', true);
		}
	}
}

getScheduleInfoDetails = function(value) {
	if(value == null) {
		return '';
	}
	if(dojo.string.trim(value).length <= 0) {
		return value;
	}
	var tokens = value.split(';');
	var scheduleType = tokens[0];
	var startFrom = tokens[1];
	var endAt = tokens[2];
	var scheduleDays = tokens[3];
	var scheduledDate = tokens[4];
	
	var duration = 'From:' + startFrom + ' to:' + endAt;
	var displayInfo = 'Schedule Type:' + scheduleType  + '<br/>';
	if(scheduleType == 'Daily') {
		displayInfo += duration;
	} else if(scheduleType == 'Weekly') {
		var days = 'Days:';
		if(scheduleDays.indexOf('0') != -1) {
			days += 'Sun, ';
		}
		if(scheduleDays.indexOf('1') != -1) {
			days += 'Mon, ';
		}
		if(scheduleDays.indexOf('2') != -1) {
			days += 'Tue, ';
		}
		if(scheduleDays.indexOf('3') != -1) {
			days += 'Wed, ';
		}
		if(scheduleDays.indexOf('4') != -1) {
			days += 'Thu, ';
		}
		if(scheduleDays.indexOf('5') != -1) {
			days += 'Fri, ';
		}
		if(scheduleDays.indexOf('6') != -1) {
			days += 'Sat, ';
		}
		displayInfo += days + '<br/>' + duration;
	} else if(scheduleType == 'On Date') {
		displayInfo += 'Date:' + scheduledDate + '<br/>' + duration;
	}
	return '<span id=\'scheduledinfo\'>' + displayInfo + '</span>';
}


getVideoRecordServiceDate = function(value) {
	//2013-11-28T10:57:10.000Z
	if(endsWith(value, '.000Z')) {
		return value.replace('.000Z', '');
	}
	return value;
}

getVideoRecordServiceTypeName = function(value) {
	/*
	if(value == 1) {
		return 'Immediate Record';
	} else if(value == 2) {
		return 'Scheduled Record';
	}
	*/
	return value;
}

getVideoRecordServiceStatus = function(value) {
	
	var mod_value = value.toLowerCase();
	
	if(mod_value.indexOf('completed') >= 0) {
		return '<span id=\'video_record_service_completed\'>' + value + '</span>';
	} else if(mod_value.indexOf('scheduled') >= 0) {
		return '<span id=\'video_record_service_scheduled\'>' + value + '</span>';
	} else if(mod_value.indexOf('inprogress') >= 0) {
		return '<span id=\'video_record_service_inprogress\'>' + value + '</span>';
	} else if(mod_value.indexOf('no motion') >= 0) {
		return '<span id=\'video_record_service_no_motion\'>' + value + '</span>';
	} else if(mod_value.indexOf('stopped') >= 0) {
		return '<span id=\'video_record_service_stopped\'>' + value + '</span>';
	} //
	return '<span>' + value + '</span>'
}

removeServiceRequest = function() {
	var selectedServiceRequest = getSelectedServiceRequest();
	if(selectedServiceRequest == null) {
		console.log('Failed to remove the service request as the selected service request... found to be null');
		return;
	}
	var msg = 'Do you want to remove the Scheduled Video Record:' + selectedServiceRequest['video_record_batch_id'];
	var choice = confirm(msg);
	if(choice) {
		dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
		var boardHandler = new modules.UserBoardHandler;
		boardHandler.removeScheduledServiceRequest(selectedServiceRequest['video_record_service_id'], selectedServiceRequest['video_record_batch_id'], dataStore['auth_id']);
	} else {
		console.log('User cancelled the Removal of Scheduled Video Record...');
	}
}

dojo.subscribe('RemoveScheduledServiceRequestSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('Remove Scheduled Service request signal response has come. Value:' + dojo.toJson(e, true));
	try {
		var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			setStatus('Successfully removed the scheduled video record service...');
			listVideoRecordRequests();
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

//
