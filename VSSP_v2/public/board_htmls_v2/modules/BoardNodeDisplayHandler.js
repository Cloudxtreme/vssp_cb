var selectedNodes = {};
var availableNodeDetails = [];
var nodeDetails = {};
var boardAuthDetails = {};
var boardVideoGrids = {};
var boardVideoRecordRequestGrids = {};
var serverVideoGrids = {};
var boardListTreeReststore;

getSelectedNode = function() {
	
	var tree = dijit.byId('nodeTree');
	console.log('Selected Camera is:' + dojo.toJson(tree.selectedItem, true));
	return tree.selectedItem;
}

getSelectedTabNode = function() {
	var tabContainer = dijit.byId('nodeContainer');
	var selectedTab = tabContainer.selectedChildWidget;
	if(selectedTab == null) {
		setStatus('The tab is not selected / not found');
		return null;
	}
	var selectedNode = nodeDetails[selectedTab.id];
	return selectedNode;
}

validateEntry = function(element, errorElementToDisplay, elementErrorMsg) {
	
	var value = dijit.byId(element).value;
	if(value == undefined || dojo.trim(value).length <= 0) {
		setStatus(elementErrorMsg);
		dojo.byId(errorElementToDisplay).innerHTML = elementErrorMsg;
		dijit.byId(element).focus();
		return false;
	}
	return true;
}

getValue = function(element) {
	return dijit.byId(element).value;
}

clearField = function(element) {
	dijit.byId(element).attr('value', '');
}

setFieldValue = function(element, val) {
	console.log('Setting the value for:' + element + ' to:' + val);
	if(val == 'undefined') {
		dijit.byId(element).attr('value',  String(''));
	} else {
		dijit.byId(element).attr('value',  String(val));
	}
}




isCameraOpenedInContainer = function(node) {
	var tabContainer = dijit.byId('nodeContainer');
	if(node.node_id in selectedNodes) {
		return true;
	}
	return false;
}

selectTabIfAvailable = function(node) {
	var tabContainer = dijit.byId('nodeContainer');
	if(node.node_id in selectedNodes) {
		var pane = selectedNodes[node.node_id];
		tabContainer.selectChild(pane);
		return true;
	}
	return false;
}

launchNode = function(node) {
	if('type' in node) {
		showInformation('Board has been selected. Select a Camera to open');
		return;
	}
	console.log('Selected the node:' + dojo.toJson(node, true));
	
	if(node.type == 'Board') {
		return;
	}
	if(selectTabIfAvailable(node)) {
		console.log('Selected the existing tab');
		return;
	} else {
		console.log('tab is not available. Creating it now..!!!');
	}
	
	addNodeContainerForView(node);
	
}

addNodeContainerForView = function(node) {
	var pane = createNodeContainer(node);
	var tabContainer = dijit.byId('nodeContainer');
	tabContainer.addChild(pane);
	tabContainer.selectChild(pane);
	
	selectedNodes[node.node_id] = pane;
	nodeDetails[node.node_id] = node;
	isNodeAvailable();
}

createNodeContainer = function(node) {
	var pane = new dijit.layout.ContentPane( {	id: node.node_id, 
												title: 'Camera - ' + node.node_name, 
												selected : true, 
												closable : true,
												onClose: function(){
													// confirm() returns true or false, so return that.
													var choice = confirm('Do you really want to close Camera:\n' + node.node_name + ' ?');
													if(choice) {
														delete selectedNodes[node.node_id];
														console.log('Camera:' + node.node_name  + ' has been closed');
													}
													return choice;
												}	
	});
	pane.set('href', '/board/getBoardNodePaneDetails?node_id=' + node.node_id);
	pane.set("onDownloadEnd", function() {
		console.log("render the content in the pane now");
		var tabContainer = dijit.byId('nodeContainer');
		var selectedTab = tabContainer.selectedChildWidget;
		var selectedNode = nodeDetails[selectedTab.id];
		
		//First time..
		listVideoRecordRequests();
		
		nodeFilesContainer = dijit.byId('boardNodeServerClientContainer_' + selectedNode.node_id);
		if(nodeFilesContainer) {
			nodeFilesContainer.watch('selectedChildWidget', function(name, oval, nval) {
				//console.log('Selected child changed from :' + oval + ' to ' + nval + ' in node:' + selectedNode.node_id + ', name is:' + name);
				if(nval.title == 'Video Record Service Requests / Camera Options') {
					listVideoRecordRequests();
				}
			});
			
		}
	});

	return pane;
}

refreshBoard = function() {
	setStatus('Refreshing board...');
	dojo.empty('boardNodeTree');
	removeTree();
	loadTreeWithBoardNodeDetails();
	getTotalFilesSizeIneBoard();
	getTotalFilesSizeInNode();
	setStatus('Board has been refreshed');
}

refreshNode = function() {
	/*
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');	
	var selectedNode = getSelectedNode();
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.authenticate(selectedNode.board_username, selectedNode.board_password); 
	*/
	//no need for authentication as we are already in the authenticated to board only.
	isNodeAvailable();
}

dojo.subscribe('UserBoardAuthenticationSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Authentication response has come. Value:' + dojo.toJson(e, true));
	var selectedNode = getSelectedNode();
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Board has been authenticated...');
			boardAuthDetails[selectedNode.board_id] = e.result;
			//isNodeAvailable();
		} else {
			setStatus(e.error_info);
			dojo.attr(dojo.byId('boardNodeToolbar_' + selectedNode.node_id), 'style', 'display:none');
			dojo.attr(dojo.byId('boardNodeClient_' + selectedNode.node_id), 'style', 'display:none');
			showErrorInformation(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

getTotalFilesSizeInNode = function() {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');

	var selectedNode = getSelectedTabNode();
	if(selectedNode == null) {
		setStatus('Node has not been selected');
		return;
	}
	var boardAuth = new modules.UserBoardHandler;
	console.log('The data store content is:' + dojo.toJson(dataStore, true));
	boardAuth.getTotalFilesSizeInNode(selectedNode.node_name, dataStore['auth_id']); 
}

dojo.subscribe('GetTotalFilesSizeInNodeSignal', function(e) {
	console.log('GetTotalFilesSizeInNodeSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');

	var selectedNode = getSelectedTabNode();
	
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Received the Total used space of the camera...');
			dojo.byId('totalFileSize_' + selectedNode.node_id).innerHTML = humanFileSize(e.result, 1024);
		} else {
			setStatus('Failed in getting the total used space of the camera...');
			console.log('Failed to get the total files size from the camera..');
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

getTotalFilesSizeIneBoard = function() {
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
			boardTotalSizeDisplayBar.set("maximum", e.board_max_storage);
			boardTotalSizeDisplayBar.set("value", e.result);
			dojo.byId('boardTotalSizeDisplay').innerHTML =  humanFileSize(e.result, 1024) + ' of ' + humanFileSize(e.board_max_storage, 1024);
			if(e.result > 50) {
				dojo.addClass(dojo.byId('boardTotalSizeDisplayBar'), 'dijitProgressBarTile_Alert');
				dojo.removeClass(dojo.byId('boardTotalSizeDisplayBar'), 'dijitProgressBarTile');
			} else {
				dojo.addClass(dojo.byId('boardTotalSizeDisplayBar'), 'dijitProgressBarTile_Safe');
				dojo.removeClass(dojo.byId('boardTotalSizeDisplayBar'), 'dijitProgressBarTile');
			}
		} else {
			console.log('Failed to get the total files size from the board..');
			dojo.byId('boardTotalSizeDisplay').innerHTML = '';
		}
	} catch(err) {
		setStatus(err.message);
	}	
});


selectVideoRecordImmediate = function() {

	dojo.attr(dojo.byId('videoRecordSettingsForImmediate'), 'style', 'display:block');
	dojo.attr(dojo.byId('videoRecordSettingsForScheduledRecord'), 'style', 'display:none');
}

selectVideoRecordScheduled = function() {
	dojo.attr(dojo.byId('videoRecordSettingsForImmediate'), 'style', 'display:none');
	dojo.attr(dojo.byId('videoRecordSettingsForScheduledRecord'), 'style', 'display:block');
}

selectDailyVideoRecordSetting = function() {
	dojo.attr(dojo.byId('scheduleRecordWeekOptions'), 'style', 'display:none');
	dojo.attr(dojo.byId('scheduleRecordSpecificDateOptions'), 'style', 'display:none');
}

selectWeeklyVideoRecordSetting = function() {
	dojo.attr(dojo.byId('scheduleRecordWeekOptions'), 'style', 'display:block');
	dojo.attr(dojo.byId('scheduleRecordSpecificDateOptions'), 'style', 'display:none');
}
selectSpecoficVideoRecordSetting = function() {
	dojo.attr(dojo.byId('scheduleRecordWeekOptions'), 'style', 'display:none');
	dojo.attr(dojo.byId('scheduleRecordSpecificDateOptions'), 'style', 'display:block');
	
	showSelectedDateDesc(dijit.byId('scheduleSpecificDateForRecording').value);
}
