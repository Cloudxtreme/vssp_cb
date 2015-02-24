dojo.provide("modules.BoardNodeDetails");

modules.BoardNodeDetails = function() { };

modules.BoardNodeDetails.prototype.getAllNodeDetailsInBoard = function(board_id) {
	console.log('Getting board details...');

	var xhrArgs = {
		url: "/getAllNodesFromBoard",
		postData: 'board_id=' + board_id,
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('GetAllNodeDetailsInBoardSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('GetAllNodeDetailsInBoardSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
};
