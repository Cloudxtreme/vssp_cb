
showAddNodeDialog = function() {
	setStatus('showing the add Camera dialog..')
	if('admin_id' in dataStore) {
		setStatus('Admin has already logged in');
		clearAllFieldsInAddNodeDialog();
		var addNodeDlg = dijit.byId('addNodeDlg');
		addNodeDlg.show();
	} else {
		setStatus('Admin authentication is not done');
		showAdminAuthenticateDlg();
	}
}

addNode = function() {

	if(! validateEntry('addNodeName', 'addNodeError', 'Camera Name cannot be empty')) {
		return;
	}
	if(! validateEntry('addNodeType', 'addNodeError', 'Camera Type cannot be empty')) {
		return;
	}	
	if(! validateEntry('addNodeLocation', 'addNodeError', 'Camera Location cannot be empty')) {
		return;
	}	
	if(! validateEntry('addNodePort',  'addNodeError', 'Camera Port cannot be empty')) {
		return;
	}	
	if(! validateEntry('addNodeURL', 'addNodeError', 'Camera URL cannot be empty')) {
		return;
	}
	if(! validateEntry('addNodeVideoLocalStore', 'addNodeError', 'Camera Local store cannot be empty')) {
		return;
	}	
	dojo.byId('addNodeError').innerHTML = '';
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');
	var nodeHandler = new modules.BoardNodeHandler;
	nodeHandler.addNode(getValue('addNodeName'), 
							getValue('addNodeType'),
							getValue('addNodeModel'),
							getValue('addNodeLocation'),
							getValue('addNodeDesc'),
							getValue('addNodePort'),
							getValue('addNodeURL'),
							getValue('addNodeUsername'),
							getValue('addNodePassword'),
							getValue('addNodeVideoProfile'),
							getValue('addNodeVideoLocalStore'),
							dataStore['board_id'],
							dataStore['admin_id'],
							dataStore['auth_id']); 	
}

dojo.subscribe('addNodeSignal', function(e) {
	console.log('addNodeSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Successfully added the Camera...');
			var addNodeDlg = dijit.byId('addNodeDlg');
			addNodeDlg.hide();
			dojo.empty('boardNodeTree');
			removeTree();
			loadTreeWithBoardNodeDetails();
		} else {
			setStatus(e.error_info);
			dojo.byId('addNodeError').innerHTML = e.error_info;
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

clearAllFieldsInAddNodeDialog = function() {
	clearField('addNodeName');
	clearField('addNodeType');
	//clearField('addNodeModel');
	clearField('addNodeLocation');
	clearField('addNodePort');
	clearField('addNodeURL');
	//clearField('addNodeVideoProfileID');
	clearField('addNodeVideoLocalStore');
	clearField('addNodeDesc');
	clearField('addNodeUsername');
	clearField('addNodePassword');
	showVideoProfileDetailsSelected(dijit.byId('addNodeVideoProfile').get('displayedValue'), 'addNodeVideoProfileDetails');
}

clearAllFieldsInModifyNodeDialog = function() {
	clearField('modifyNodeName');
	clearField('modifyNodeType');
	//clearField('addNodeModel');
	clearField('modifyNodeLocation');
	clearField('modifyNodePort');
	clearField('modifyNodeURL');
	//clearField('addNodeVideoProfileID');
	clearField('modifyNodeVideoLocalStore');
	clearField('modifyNodeDesc');
	clearField('modifyNodeUsername');
	clearField('modifyNodePassword');
	showVideoProfileDetailsSelected(dijit.byId('modifyNodeVideoProfile').get('displayedValue'), 'modifyNodeVideoProfileDetails');
}

showAdminAuthenticateDlg = function() {
	var adminDlg = dijit.byId('adminAuthenticationDlg');
	adminDlg.show();
}

showModifyNodeDialog = function() {
	setStatus('Modifying the selected node...');
	var selectedNode = getSelectedNode();
	if(selectedNode == null) {
		showInformation('Select a Camera to modify');
		return;
	}
	if('type' in selectedNode) {
		showInformation('Select a valid Camera to modify');
		return;
	}
	
	if(isCameraOpenedInContainer(selectedNode)) {
		showErrorInformation('Camera:' + selectedNode.node_name + ' has been opened in the container. Close the tab before modifying the Camera.');
		return;
	}	
	
	if('admin_id' in dataStore) {
		setStatus('Admin has already logged in');
		var modifyNodeDlg = dijit.byId('modifyNodeDlg');
		fillDataInModifyDialog(selectedNode);
		modifyNodeDlg.show();
	} else {
		setStatus('Admin authentication is not done');
		showAdminAuthenticateDlg();
	}
}

fillDataInModifyDialog = function(node) {
	clearAllFieldsInModifyNodeDialog();
	
	//setFieldValue('modifyNodeID', node.node_id);
	
	setFieldValue('modifyNodeName', node.node_name);
	setFieldValue('modifyNodeType', node.node_type);
	setFieldValue('modifyNodeLocation', node.node_location);
	setFieldValue('modifyNodePort', node.node_port);
	setFieldValue('modifyNodeURL', node.node_url);
	setFieldValue('modifyNodeVideoLocalStore', node.node_local_video_store);
	setFieldValue('modifyNodeDesc', node.node_description);
	setFieldValue('modifyNodeUsername', node.node_username);
	setFieldValue('modifyNodePassword', node.node_password);
	
	setFieldValue('modifyNodeModel', node.node_model_id);
	setFieldValue('modifyNodeVideoProfile', node.video_profile_id);
}

modifyNode = function() {
	
	var selectedNode = getSelectedNode();
	if(selectedNode == null) {
		setStatus('Selected node found to be null');
		return;
	}
	
	if(! validateEntry('modifyNodeName', 'modifyNodeError',  'Camera Name cannot be empty')) {
		return;
	}
	if(! validateEntry('modifyNodeType', 'modifyNodeError', 'Camera Type cannot be empty')) {
		return;
	}
	if(! validateEntry('modifyNodeLocation', 'modifyNodeError', 'Camera Location cannot be empty')) {
		return;
	}	
	if(! validateEntry('modifyNodePort', 'modifyNodeError', 'Camera Port cannot be empty')) {
		return;
	}	
	if(! validateEntry('modifyNodeURL', 'modifyNodeError', 'Camera URL cannot be empty')) {
		return;
	}
	if(! validateEntry('modifyNodeVideoLocalStore', 'modifyNodeError', 'Camera Local store cannot be empty')) {
		return;
	}	
	dojo.byId('modifyNodeError').innerHTML = '';
	dojo.attr(dojo.byId('preloader'), 'style', 'display:block');

	var nodeHandler = new modules.BoardNodeHandler;
	nodeHandler.modifyNode(getValue('modifyNodeName'), 
							getValue('modifyNodeType'),
							getValue('modifyNodeModel'),
							getValue('modifyNodeLocation'),
							getValue('modifyNodeDesc'),
							getValue('modifyNodePort'),
							getValue('modifyNodeURL'),
							getValue('modifyNodeUsername'),
							getValue('modifyNodePassword'),
							getValue('modifyNodeVideoProfile'),
							getValue('modifyNodeVideoLocalStore'),
							selectedNode.node_id,
							dataStore['board_id'],
							dataStore['admin_id'],
							dataStore['auth_id']);
}

dojo.subscribe('modifyNodeSignal', function(e) {
	console.log('modifyNodeSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Successfully modified the camera details');
			var modifyNodeDlg = dijit.byId('modifyNodeDlg');
			modifyNodeDlg.hide();
			dojo.empty('boardNodeTree');
			removeTree();
			loadTreeWithBoardNodeDetails();
		} else {
			setStatus(e.error_info);
			dojo.byId('modifyNodeError').innerHTML = e.error_info;
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

deleteNode = function(node) {
	setStatus('Deleting the Camera NOW!!!');
	var node_name = node.node_name;
	var node_id = node.node_id;
	var board_id = node.board_id;
	var user_id = dataStore['admin_id'];
	var auth_id = dataStore['auth_id'];
	var nodeHandler = new modules.BoardNodeHandler;
	nodeHandler.deleteNode(node_id, board_id, node_name, user_id, auth_id); 
}

dojo.subscribe('deleteNodeSignal', function(e) {
	console.log('deleteNodeSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	try {
		if(e.status === 'SUCCESS') {
			setStatus('Successfully removed the Camera');
			dojo.empty('boardNodeTree');
			removeTree();
			loadTreeWithBoardNodeDetails();
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showDeleteNodeDialog = function() {
	setStatus('Deleting the selected node...');
	var selectedNode = getSelectedNode();
	if(selectedNode == null) {
		showInformation('Select a Camera to delete');
		return;
	}
	if('type' in selectedNode) {
		showInformation('Select a valid Camera to delete');
		return;
	}
	
	if(isCameraOpenedInContainer(selectedNode)) {
		showErrorInformation('Camera:' + selectedNode.node_name + ' has been opened in the container. Close the tab before deleting the Camera.');
		return;
	}
	
	if('admin_id' in dataStore) {
		setStatus('Admin has already logged in');
		userChoice = confirm('Do you want to delete the Node:' + selectedNode.node_name + ' ?');
		if(userChoice) {
			deleteNode(selectedNode);
		} else {
			setStatus('Cancelled deletion of node:' + selectedNode.node_name);
		}
	} else {
		setStatus('Admin authentication is not done');
		showAdminAuthenticateDlg();
	}
}