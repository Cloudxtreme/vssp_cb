dojo.provide("modules.UserBoardHandler");

modules.UserBoardHandler = function() { };

modules.UserBoardHandler.prototype.authenticate = function(board_ip, board_port, username, password) {
	console.log('Authenticating board...user:' + username + ', with password:' + password + ' in server:' + board_ip + ':' + board_port);
	/*
	var xhrArgs = {
		url: 'http://' + board_ip + ':' + board_port + '/board/authenticate',
		postData: 'username=' + username + '&password=' + password,
		//postData: dojo.toJson({'username':username, 'password':password}),
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserBoardAuthenticationSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserBoardAuthenticationSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('http://' + board_ip + ':' + board_port + '/board/authenticate', 'username=' + username + '&password=' + password, 'UserBoardAuthenticationSignal');		
};

modules.UserBoardHandler.prototype.isNodeAvailable = function(node_name, id) {
	console.log('Checking the node name:' + node_name  + ' with auth_id as:' + id);
	/*
	var xhrArgs = {
		url: '/board/getNodeDetails',
		postData: 'node_name=' + node_name + '&auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserBoardNodeAvailableSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserBoardNodeAvailableSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getNodeDetails', 'node_name=' + node_name + '&auth_id=' + id, 'UserBoardNodeAvailableSignal');		
};

modules.UserBoardHandler.prototype.isVideoRecordingInProgress = function(node_name, id) {
	console.log('Checking the video recording in-progress in node:' + node_name);
	/*
	var xhrArgs = {
		url: '/board/isVideoRecordingInProgressInNode',
		postData: 'node_name=' + node_name + '&auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserBoardNodeIsVideoRecordInProgressSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserBoardNodeIsVideoRecordInProgressSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/isVideoRecordingInProgressInNode', 'node_name=' + node_name + '&auth_id=' + id, 'UserBoardNodeIsVideoRecordInProgressSignal');			
};

modules.UserBoardHandler.prototype.scheduleVideoRecording = function(node_id, node_name, videoDurationForImmediate, selectedVideoProfileID, recordServiceType, recordScheduledType, startRecordTime, endRecordTime, scheduledVideoRecordDuration, recordScheduledDay, enableMotionDetect, motionSensitivity, motionDetectChanges, selectedDate,  enableNotification, emailList, user_id, id) {
	console.log('start video record in node:' + node_name);
	
	var data =  'user_id=' + user_id +  '&node_id=' + node_id + '&node_name=' + node_name + '&immediate_record_duration=' + videoDurationForImmediate + '&video_profile=' + selectedVideoProfileID + '&record_service_type=' + recordServiceType + '&record_schedule_type=' + recordScheduledType + '&start_record_time=' + startRecordTime + '&end_record_time=' + endRecordTime  + '&scheduled_record_duration=' + scheduledVideoRecordDuration + '&record_schedule_day=' + recordScheduledDay + '&selected_date=' + selectedDate + '&auth_id=' + id;
	data += '&enableMotionDetect=' + enableMotionDetect;
	data += '&motion_detect_sensitive_level=' + motionSensitivity;
	data += '&detect_motion_on_screen=' + motionDetectChanges;
	data += '&enableNotification=' + enableNotification;
	data += '&emailList=' + emailList;
	
	console.log('Record parameters:' + data);
	/*
	var xhrArgs = {
		url: '/board/startVideoRecording',
		postData:data,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserBoardNodeStartVideoRecordSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserBoardNodeStartVideoRecordSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/startVideoRecording', data, 'UserBoardNodeScheduleVideoRecordSignal');				
};

modules.UserBoardHandler.prototype.startVideoRecording = function(node_id, node_name, videoDurationForImmediate, selectedVideoProfileID, recordServiceType, recordScheduledType, startRecordTime, endRecordTime, scheduledVideoRecordDuration, recordScheduledDay, enableMotionDetect, motionSensitivity, motionDetectChanges, selectedDate,  enableNotification, emailList, user_id, id) {
	console.log('start video record in node:' + node_name);
	
	var data =  'user_id=' + user_id +  '&node_id=' + node_id + '&node_name=' + node_name + '&immediate_record_duration=' + videoDurationForImmediate + '&video_profile=' + selectedVideoProfileID + '&record_service_type=' + recordServiceType + '&record_schedule_type=' + recordScheduledType + '&start_record_time=' + startRecordTime + '&end_record_time=' + endRecordTime  + '&scheduled_record_duration=' + scheduledVideoRecordDuration + '&record_schedule_day=' + recordScheduledDay + '&selected_date=' + selectedDate + '&auth_id=' + id;
	data += '&enableMotionDetect=' + enableMotionDetect;
	data += '&motion_detect_sensitive_level=' + motionSensitivity;
	data += '&detect_motion_on_screen=' + motionDetectChanges;
	data += '&enableNotification=' + enableNotification;
	data += '&emailList=' + emailList;
	
	console.log('Record parameters:' + data);
	/*
	var xhrArgs = {
		url: '/board/startVideoRecording',
		postData:data,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserBoardNodeStartVideoRecordSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserBoardNodeStartVideoRecordSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/startVideoRecording', data, 'UserBoardNodeStartVideoRecordSignal');				
};

modules.UserBoardHandler.prototype.stopVideoRecording = function(node_id, node_name, user_id,  id) {
	console.log('stopping video record in node:' + node_name);
	/*
	var xhrArgs = {
		url: '/board/stopVideoRecording',
		postData: 'user_id=' + user_id + '&node_id=' + node_id + '&node_name=' + node_name + '&auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserBoardNodeStopVideoRecordSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserBoardNodeStopVideoRecordSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/stopVideoRecording', 'user_id=' + user_id + '&node_id=' + node_id + '&node_name=' + node_name + '&auth_id=' + id, 'UserBoardNodeStopVideoRecordSignal');					
};

modules.UserBoardHandler.prototype.listFiles = function(board_ip, board_port, node_name, id) {
	console.log('Listing files froom node:' + node_name + ' in server:' + board_ip + ':' + board_port);
	/*
	var xhrArgs = {
		url: 'http://' + board_ip + ':' + board_port + '/board/listFiles',
		postData: 'node_name=' + node_name + '&auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserBoardNodeListFilesSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserBoardNodeListFilesSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('http://' + board_ip + ':' + board_port + '/board/listFiles', 'node_name=' + node_name + '&auth_id=' + id, 'UserBoardNodeListFilesSignal');	
};


modules.UserBoardHandler.prototype.getTotalFilesSizeInNode = function(node_name, id) {
	console.log('Getting the total files size of the node:' + node_name);
	/*
	var xhrArgs = {
		url: '/board/getTotalFilesSizeInNode',
		postData: 'node_name=' + node_name + '&auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('GetTotalFilesSizeInNodeSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('GetTotalFilesSizeInNodeSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getTotalFilesSizeInNode', 'node_name=' + node_name + '&auth_id=' + id, 'GetTotalFilesSizeInNodeSignal');		
};

modules.UserBoardHandler.prototype.getTotalFilesSizeInBoard = function(id) {
	console.log('Getting the total files size of the board..');
	/*
	var xhrArgs = {
		url: '/board/getTotalFilesSizeInBoard',
		postData: 'auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('GetTotalFilesSizeInBoardSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('GetTotalFilesSizeInBoardSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/getTotalFilesSizeInBoard', 'auth_id=' + id, 'GetTotalFilesSizeInBoardSignal');			
};

modules.UserBoardHandler.prototype.getVideoImagesPreview = function(node_name, id) {
	console.log('Getting the total files size of the board..');
	/*
	var xhrArgs = {
		url: '/board/listFilesInPreview?node_name=' + node_name + '&auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('GetVideoImagesPreviewSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('GetVideoImagesPreviewSignal', error)
		}
	}
	var deferred = dojo.xhrGet(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendGetData('/board/listFilesInPreview', 'node_name=' + node_name + '&auth_id=' + id, 'GetVideoImagesPreviewSignal');			
};

modules.UserBoardHandler.prototype.removeScheduledServiceRequest = function(videoRecordServiceID, videoBatchID, id, node_id) {
	console.log('Removing the Scheduled Video Record service request...of batch id:' + videoBatchID);
	
	/*
	var xhrArgs = {
		url: '/board/removeScheduledVideoRecordRequest',
		postData: 'record_service_id=' + videoRecordServiceID + '&video_batch_id=' + videoBatchID + '&auth_id=' + id,
		//postData: dojo.toJson({'username':username, 'password':password}),
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('RemoveScheduledServiceRequestSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('RemoveScheduledServiceRequestSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/removeScheduledVideoRecordRequest', 'record_service_id=' + videoRecordServiceID + '&video_batch_id=' + videoBatchID + '&auth_id=' + id + '&node_id=' + node_id, 'RemoveScheduledServiceRequestSignal');			
	
};

