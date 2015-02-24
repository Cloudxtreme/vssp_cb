dojo.provide("modules.BoardConnectionHandler");

modules.BoardConnectionHandler = function() { };

modules.BoardConnectionHandler.prototype.sendPostData = function(urlData, data, emitEventName) {
	console.log('Sending Post data:' + urlData);

	var xhrArgs = {
		url:  urlData,
		postData: data,
		//postData: dojo.toJson({'username':username, 'password':password}),
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish(emitEventName, data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish(emitEventName, error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
};


modules.BoardConnectionHandler.prototype.sendGetData = function(urlData, data, emitEventName) {
	console.log('Sending Get Request to:' + urlData);

	var urlDataWithParams = urlData;
	if(data != null) {
		if(dojo.string.trim(data).length > 0) {
		
			urlDataWithParams += '?' + data;
		}
	}
	
	var xhrArgs = {
		url: urlDataWithParams,
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish(emitEventName, data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish(emitEventName, error)
		}
	}
	var deferred = dojo.xhrGet(xhrArgs);
};
