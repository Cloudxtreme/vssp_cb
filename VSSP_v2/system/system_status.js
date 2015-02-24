var uuid = require('node-uuid');
var nconf = require('nconf');
var util = require('util');
var path = require('path');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var request = require('request');

//var device = require(__dirname + '/../store/vssp_configuration.js');
var constants = require(__dirname + '/../constants.js');
var stringutils = require(__dirname + '/../utils/stringutils.js');
var db = require(__dirname + '/../db/dbHandler.js');

exports.handleNodeResponse = function(req, res) {

	var data = req.body.node_response || req.query.node_response;
	console.log(data);
	if(S(data).isEmpty()) {
		res.status(401);
		res.send('Failed as node reponse details not found in the request');
		return;
	}
	try {
		var board_request = JSON.parse(data);
		var board_id = board_request.id;
		var board_model = board_request.model;
		var board_ip = board_request.ip;
		var board_name = board_request.name;
		var notification_time = board_request.notification_time;
		var nodes = board_request.nodes;
		
		var nodeNames = getNodeNames(nodes);
		
		nodeNames.forEach ( function(node_name) {
			var node = nodes[node_name];
			node.node_name = node_name;
			node.board_id = board_id;
			node.board_ip = board_ip;
			node.board_name = board_name;
			node.notification_time = notification_time;
			logNodeStatusToDB(node);
		});
		
		res.status(200);
		res.send('system status updated success');
	} catch(err) {
		res.status(401);
		res.send('Failed while saving the node response');
	}
}

logNodeStatusToDB = function(node) {
	console.log('Logging results to:http://' + constants.DB_SERVER_NAME + ':' + constants.DB_SERVER_PORT + '/logNodeStatusToDB');
	request.post(
		{
			uri: 'http://' + constants.DB_SERVER_NAME + ':' + constants.DB_SERVER_PORT + '/logNodeStatusToDB', 
			body: 'board_node_details=' + JSON.stringify(node),
			headers: {'content-type' : 'application/x-www-form-urlencoded'},
		},
		function(e, res, body) {
			if(e) {
				console.log('Failed in posting the data to server. Error:' + e);
				return;
			}
			//console.log('Request is:' + util.inspect(res));
			console.log('Response is:' + body)
		}
	);
}

function getNodeNames(obj) {
    var r = []
    for (var k in obj) {
        if (!obj.hasOwnProperty(k)) 
            continue
        r.push(k)
    }
    return r
}
function storeNodeResponseToFile(node_response) {
	var node_id = node_response.id;
}

