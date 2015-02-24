dojo.provide("modules.BoardNodeHandler");

modules.BoardNodeHandler = function() { };

modules.BoardNodeHandler.prototype.pingServer = function() {
	console.log('pinging to server...');
	/*
	var xhrArgs = {
		url: "/board/pingServer",
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('pingServerSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('pingServerSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/pingServer', '', 'pingServerSignal');	
}

modules.BoardNodeHandler.prototype.getBoardDetails = function(auth_id) {
	console.log('getBoardDetails...');
	/*
	var xhrArgs = {
		url: "/board/getBoardDetails",
		postData: 'auth_id=' + auth_id,
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('GetBoardDetailsSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('GetBoardDetailsSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getBoardDetails', 'auth_id=' + auth_id, 'GetBoardDetailsSignal');		
}

modules.BoardNodeHandler.prototype.addNode = function(node_name, node_type, node_model, node_location, node_desc, node_port, node_url, node_username, node_password, node_video_profile_id, node_local_store, board_id, user_id, auth_id) {
	console.log('adding Node....');
		
	data = 'user_id=' + user_id + '&board_id=' + board_id + '&node_type=' + node_type + '&node_port=' + node_port;
	data += '&node_name=' + node_name + '&node_location=' + node_location + '&node_desc=' + node_desc;
	data += '&node_url=' + node_url + '&node_username=' + node_username + '&node_password=' + node_password;
	data += '&node_video_profile_id=' + node_video_profile_id + '&node_video_local_store=' + node_local_store + '&node_model_id=' + node_model + '&auth_id=' + auth_id;
	console.log('Posting data:' + data);
	/*
	var xhrArgs = {
		url: "/board/addNode",
		postData: data,
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('addNodeSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('addNodeSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/addNode', data, 'addNodeSignal');		
};


modules.BoardNodeHandler.prototype.modifyNode = function(node_name, node_type, node_model, node_location, node_desc, node_port, node_url, node_username, node_password, node_video_profile_id, node_local_store, node_id, board_id, user_id, auth_id) {
	console.log('modifying Node....');
		
	data = 'user_id=' + user_id + '&board_id=' + board_id + '&node_type=' + node_type + '&node_port=' + node_port;
	data += '&node_name=' + node_name + '&node_location=' + node_location + '&node_desc=' + node_desc;
	data += '&node_url=' + node_url + '&node_username=' + node_username + '&node_password=' + node_password;
	data += '&node_video_profile_id=' + node_video_profile_id + '&node_video_local_store=' + node_local_store + '&node_model_id=' + node_model + '&auth_id=' + auth_id + '&node_id=' + node_id;
	console.log('Posting data:' + data);
	/*
	var xhrArgs = {
		url: "/board/modifyNode",
		postData: data,
		handleAs: "json",
		load: function(data, args){
			dojo.publish('modifyNodeSignal', data)
		},
		error: function(error, args){
			dojo.publish('modifyNodeSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/modifyNode', data, 'modifyNodeSignal');		
};

modules.BoardNodeHandler.prototype.deleteNode = function(node_id, board_id, node_name, user_id, auth_id) {
	console.log('deleting the Node....');
		
	data = 'user_id=' + user_id + '&board_id=' + board_id + '&node_name=' + node_name + '&auth_id=' + auth_id + '&node_id=' + node_id;
	console.log('Posting data:' + data);
	/*
	var xhrArgs = {
		url: "/board/deleteNode",
		postData: data,
		handleAs: "json",
		load: function(data, args){
			dojo.publish('deleteNodeSignal', data)
		},
		error: function(error, args){
			dojo.publish('deleteNodeSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/deleteNode', data, 'deleteNodeSignal');		
}
//
