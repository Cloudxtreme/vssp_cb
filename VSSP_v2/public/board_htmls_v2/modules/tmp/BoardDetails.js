dojo.provide("modules.BoardDetails");

modules.BoardDetails = function() { };

modules.BoardDetails.prototype.getBoardDetails = function() {
	console.log('Getting board details...');

	var xhrArgs = {
		url: "/getBoardDetails",
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('GetBoardSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('GetBoardSignal', error)
		}
	}
	var deferred = dojo.xhrGet(xhrArgs);
};
