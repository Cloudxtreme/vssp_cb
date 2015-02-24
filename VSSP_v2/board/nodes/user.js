
/*
 * GET users listing.
 */
var os=require('os');
var uuid = require('node-uuid');
var endOfLine = require('os').EOL
var fs = require('fs');
var S = require('string');
var path = require('path');
var util = require('util');
var request = require('request');
var crypto = require('crypto');
var time_format = require('strftime');
var exec = require('child_process').exec;
var logger = require('./../logger/logger').logger;

//var device = require(__dirname + '/../store/vssp_configuration.js');

var constants = require(__dirname + '/../../constants.js');

exports.authenticateWithPassport = function(username, password) {
	var id = '';
	device.users.list.data.forEach( function(val) {
		if(username + ":" + password == val) {
			id = getid(username);
			return false;
		};
	});
    return id;
}

/*
exports.pingServer = function(req, res) {
	pingServer(req, res);
}
*/

logEventInUser = function(username, msg) {
	var logData = time_format('%F %T') + ',' + username + ',';
	logData += msg + '\n';
	try {
		fs.appendFileSync(constants.SYSTEM_ACTIVITY_LOG_FILE, logData);
	} catch(err) {
	
	}
}



pingServer = function(id, username, req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		response.error_info = 'Device Configuration not found.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	//since server is disconnected, this is set to -1
	var user_id = -1;
	res.cookie(constants.COOKIE_VSSP_USER_NAME, id + ':' + username + ':' + user_id + ':' + device.id);
	response[constants.COOKIE_VSSP_USER_NAME] =  id + ':' + username + ':' + user_id + ':' + device.id;

	logEventInUser(username,  'User:' + username + ' has successfully logged in');
	
	response.result = 'Connection succesdful';
	response.status = 'SUCCESS';
	res.json(200, response);
	logger.info(JSON.stringify(response));
	
	//results[constants.COOKIE_VSSP_USER_NAME] =  id + ':' + username + ':' + user_id + ':' + device.id;
	
	/*
	var username = req.body.username || req.query.username;
	var site_url = device.site_server + 'pingServer';
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url : site_url,
		body: 'username=' + username
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Failed to establish connection to Server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			try {
				var results = JSON.parse(body);
				if(results.status == 'SUCCESS') {
					var user_id = results.items[0].user_id;
					console.log('User id extracred as:' + user_id);
					res.cookie(constants.COOKIE_VSSP_USER_NAME, id + ':' + username + ':' + user_id + ':' + device.id);
					results[constants.COOKIE_VSSP_USER_NAME] =  id + ':' + username + ':' + user_id + ':' + device.id;
					syncTimeWithServer(results.items[1]);
				}
				res.json(200, results);
				logger.info(JSON.stringify(results));
				return;
			} catch(ex) {
			
			}
			//response.status = 'SUCCESS';
			//response.error_info = '';
			//response.result = 'Server connection successful';
			response.error_info = 'Failed to establish connection to Server. Error:' + e.message;
			res.json(200, response);
			logger.error(JSON.stringify(response));
		});
	*/
}

function syncTimeWithServer(date_value) {
//'%d_%m_%y_%H_%M_%S'
	logger.debug('Syncing with server time:' + date_value);
	var tokens = date_value.split('_');
	var date_cmd = 'sudo date ' + tokens[1] + tokens[0] + tokens[3] + tokens[4] + tokens[2];
	logger.debug('Setting the date time of the board as:' + date_cmd);
	var p = exec(date_cmd, function(err, stdout, stderr) {
		if(err) {
			logger.debug('Failed in setting the date in board. Error:' + err);
			return;
		}
		logger.debug('Date has been set and output as:' + stdout.toString());
		logger.debug('Date has been set and error as:' + stderr.toString());
	});
}

exports.deleteUser = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		req.session.user_id = '';
		response.error_info = 'Failure in Authentication. Device file is not found';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var userid = this.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var username = req.body.username || req.query.username;
	var usertype = req.body.type || req.query.type;
	if(S(username).isEmpty()) {
		response.error_info = 'Username to be deletd is missing in request';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var blnAdmin = false;

	var isAnyUserPresent = false;
	if(! S(usertype).isEmpty()) {
		if(usertype == 'admin') {
			blnAdmin = true;
		}
	}	
	var users = device.users;
	if(blnAdmin) {
		users = device.adminCredentials;
	}	
	var index = -1;
	users.forEach( function(val) {		//device.users.list.data.forEach
		index = index + 1;
		if(val['username'] === username ) {
			isAnyUserPresent = true;
			users.splice(index, 1);
			return false;
		}
	});	
	if(! isAnyUserPresent) {
		response.error_info = 'User:' + username + ' doesnot exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}	
	try {
		fs.writeFileSync(device_file, JSON.stringify(device, null, 2));
	} catch(err) {
		response.error_info = 'Failed to delete the user:' + username + ', System error occurred';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
	}
	
	if(blnAdmin) {
		logEventInUser(userid,  'User:' + username + ' (type:admin) has been successfully deleted in the system');
	} else {
		logEventInUser(userid,  'User:' + username + ' (type:normal) has been successfully deleted in the system');
	}
	response.status = 'SUCCESS'
	response.error_info = '';
	res.json(200, response);
	logger.info(JSON.stringify(response));
	return;		
}

exports.getUser = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		req.session.user_id = '';
		response.error_info = 'Failure in Authentication. Device file is not found';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var userid = this.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var username = req.body.username || req.query.username;
	if(S(username).isEmpty()) {
		response.error_info = 'Username to be returned is missing in request';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var userData = {};
	var isAnyUserPresent = false;
	var index = -1;
	device.users.forEach( function(val) {		//device.users.list.data.forEach
		index = index + 1;
		if(val['username'] === username ) {
			isAnyUserPresent = true;
			userData = val;
		}
	});	
	if(! isAnyUserPresent) {
		response.error_info = 'User:' + username + ' doesnot exist';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}		
	response.status = 'SUCCESS'
	response.error_info = '';
	response.result = userData;
	res.json(200, response);
	logger.info(JSON.stringify(response));
}

exports.listUsers = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		req.session.user_id = '';
		response.error_info = 'Failure in Authentication. Device file is not found';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var userid = this.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var isAnyUserPresent = false;
	
	var usersList = [];
	var users = device.users;
	users.forEach( function(val) {		//device.users.list.data.forEach
		val['admin'] = false;
		usersList.push(val);
	});	

	users = device.adminCredentials;
	users.forEach( function(val) {		//device.users.list.data.forEach
		val['admin'] = true;
		usersList.push(val);
	});	
	
	response.status = 'SUCCESS'
	response.error_info = '';
	response.result = usersList;
	res.json(200, response);
	logger.info(JSON.stringify(response));
	return;	
}

exports.createUser = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		req.session.user_id = '';
		response.error_info = 'Failure in Authentication. Device file is not found';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var userid = this.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var blnCreateAdmin = false;
	var username = req.body.username || req.query.username;
	var password = req.body.password || req.query.password;
	var email = req.body.email || req.query.email;
	var usertype = req.body.type || req.query.type;
	if(S(email).isEmpty() || S(password).isEmpty() || S(username).isEmpty()) {
		response.error_info = 'Mandatory params are missing to create user';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	if(! S(usertype).isEmpty()) {
		if(usertype == 'admin') {
			blnCreateAdmin = true;
		}
	}
	var isAnyUserPresent = false;
	
	var users = device.users;
	users.forEach( function(val) {		//device.users.list.data.forEach
		if(val['username'] === username ) {
			isAnyUserPresent = true;
		}
	});	
	if(! isAnyUserPresent) {
		users = device.adminCredentials;
		users.forEach( function(val) {		//device.users.list.data.forEach
			if(val['username'] === username ) {
				isAnyUserPresent = true;
			}
		});	
	}

	if(isAnyUserPresent) {
		response.error_info = 'User:' + username + ' already exists';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	password = this.encryptPassword(password, device);
	
	var data = {};
	data['username'] = username;
	data['password'] = password;
	data['email'] = email;
	data['id'] = users.length + device.adminCredentials.length + 1;

	if(blnCreateAdmin) {
		users = device.adminCredentials;
	}
	users.push(data);
	
	//write back the confif to file
	try {
		fs.writeFileSync(device_file, JSON.stringify(device, null, 2));
	} catch(err) {
		response.error_info = 'Failed to create the user:' + username + ', System error occurred';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
	}
	
	if(blnCreateAdmin) {
		logEventInUser(userid,  'User:' + username + ' with admin credentials has been successfully created in the system');
	} else {
		logEventInUser(userid,  'User:' + username + ' with normal credentials has been successfully created in the system');
	}
	response.status = 'SUCCESS'
	response.error_info = '';
	res.json(200, response);
	logger.info(JSON.stringify(response));
	return;	
}

exports.modifyUser = function(req, res) {
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		req.session.user_id = '';
		response.error_info = 'Failure in Authentication. Device file is not found';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var userid = this.getUserDetails(req);
	if(userid == '') {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var username = req.body.username || req.query.username;
	//var oldpwd = req.body.oldpwd || req.query.oldpwd;
	var newpwd = req.body.newpwd || req.query.newpwd;
	var email = req.body.email || req.query.email;
	var type = req.body.type || req.query.type;
	if(S(email).isEmpty() || S(username).isEmpty()) {
		response.error_info = 'Mandatory params are missing to modify the user';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	var blnCreateAdmin = false;
	if(! S(type).isEmpty()) {
		if(type == 'admin') {
			blnCreateAdmin = true;
		}
	}	
	var isAnyUserPresent = false;
	var userId = -1;
	var userPwd = '';
	var index = -1;
	var users = device.users;
	users.forEach( function(val) {		//device.users.list.data.forEach
		index = index + 1;
		if(val['username'] === username ) {
			userId = val['id'];
			userPwd = val['password'];
			isAnyUserPresent = true;
			users.splice(index, 1);
			return false;
		}
	});	
	index = -1;
	if(! isAnyUserPresent) {
		device.adminCredentials.forEach( function(val) {		//device.users.list.data.forEach
			index = index + 1;
			if(val['username'] === username ) {
				userId = val['id'];
				userPwd = val['password'];
				isAnyUserPresent = true;
				device.adminCredentials.splice(index, 1);
				return false;
			}
		});	
	}
	if(! isAnyUserPresent) {
		response.error_info = 'User:' + username + ' is not present';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
		
	
	var data = {};
	data['username'] = username;
	if(! S(newpwd).isEmpty()) {
		newpwd = this.encryptPassword(newpwd, device);
		data['password'] = newpwd;
	} else {
		data['password'] = userPwd;
	}
	data['email'] = email;
	data['id'] = userId;

	if(blnCreateAdmin) {
		users = device.adminCredentials;
	}
	users.push(data);
	
	
	//write back the confif to file
	try {
		fs.writeFileSync(device_file, JSON.stringify(device, null, 2));
	} catch(err) {
		response.error_info = 'Failed to modify the user:' + username + ', System error occurred';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;	
	}
	
	logEventInUser(userid,  'User:' + username + ' has been successfully modified in the system');
	response.status = 'SUCCESS'
	response.error_info = '';
	res.json(200, response);
	logger.info(JSON.stringify(response));
	return;	
}

exports.signOut = function(req, res) {
	var id = req.body.auth_id || req.query.auth_id;	
	var username = this.getUserDetails(req);
	
	resetUserLogin(id);	
	
	logEventInUser(username,  'User:' + username + ' has successfully logged out.');
	
	var response = JSON.parse(constants.JSON_RESPONSE);
	
	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = 'Signed out successfully';
	res.json(200, response);
	logger.info(JSON.stringify(response));	
}

exports.authenticate = function(req, res) {
	
	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		req.session.user_id = '';
		response.error_info = 'Failure in Authentication. Device file is not found';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	
	
	var username = req.body.username || req.query.username;
	var password = req.body.password || req.query.password;
	
	password = this.encryptPassword(password, device);
	
	var id = '';
	device.users.forEach( function(val) {		//device.users.list.data.forEach
		
		if(val['username'] === username && val['password'] === password) {
			id = createAndSetID(username);
			return false;
		}
		
		/*
		if(username + ":" + password == val) {
			id = createAndSetID(username);
			return false;
		};
		*/
	});
	if(id != '') {
		//res.cookie(constants.COOKIE_VSSP_USER_NAME, id);
		//req.session.user_id = id;
		/*
		response.error_info = '';
		response.status = 'SUCCESS';
		response.result = id;
		console.log('The response sent is:' + util.inspect(response));
		res.json(200, response);
		*/
		pingServer(id, username, req, res);
	} else {
	
		//res.clearCookie(constants.COOKIE_VSSP_USER_NAME);
		req.session.user_id = '';
		response.error_info = 'Failure in Authentication.';
		res.json(200, response);
		logger.error(JSON.stringify(response));
	}
}

exports.isUserAdmin = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var userid = isUserLoggedIn(req);
	if(S(userid).isEmpty()) {
		response.error_info = 'Unauthorised';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	} 

	var device = getDevice();
	if(device == null) {
		response.error_info = 'The device details are null';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}

	var site_url = device.site_server + 'isUserAdminWithCredentials';

	var username = req.body.username || req.query.username;
	var password = req.body.password || req.query.password;

	password = this.encryptPassword(password, device);
	var authUserFound = false;
	var adminid = -1;
	device.adminCredentials.forEach( function(val) {		
		
		if(val['username'] === username && val['password'] === password) {
			authUserFound = true;
			adminid = val['id'] 
		}
	});		
	
	if(authUserFound) {
		logEventInUser(username,  'User:' + username + ' has successfully logged in as Admin');
	
		response.status = 'SUCCESS';
		response.error_info = '';
		response.result = adminid;
	} else {
		response.error_info = 'Failed to check as the user:' + username + ' is Not admin';
	}
	
	res.json(200, response);
	logger.info(JSON.stringify(response));
	
	/*
	data = 'username=' + username + '&password=' + password;
	logger.debug('Sending isUserAdmin request to server:' + site_url);

	request.post({
		headers : {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url : site_url,
		body: data
		}, function(e, s_response, body) {
			
			if(e) {
				response.error_info = 'Error occurred while authenticating as admin to server. Error:' + e.message;
				res.json(200, response);
				logger.error(JSON.stringify(response));
				return;		
			}
			
			logger.debug('Server response is:' + body);
			var s_response = JSON.parse(body);
			
			if(s_response.status != 'SUCCESS') {
				response.error_info = s_response.error_info;
				res.json(200, response);
				logger.info(JSON.stringify(response));
				return;				
			}
							
			response.status = 'SUCCESS';
			response.error_info = '';
			response.result = s_response.result;
			res.json(200, response);
			logger.info(JSON.stringify(response));
		});
	*/
}

isUserLoggedIn = function(req) {
	var username = '';
	var id = req.body.auth_id || req.query.auth_id;
	var file = constants.USER_SESSIONS_FILE;
	var lines = fs.readFileSync(file).toString().split(endOfLine);
	for(i in lines) {
		var line = lines[i];
    	//if(stringutils.endsWith(line, ':' + id + ':0')) {
    	if(S(line).endsWith(':' + id + ':0')) {
    		username = line.substring(0, line.indexOf(':'));
    		break;
    	}
	}
	return username;
}

exports.getUserDetails = function(req) {
	var username = '';
	var id = req.body.auth_id || req.query.auth_id;
	var file = constants.USER_SESSIONS_FILE;
	var lines = fs.readFileSync(file).toString().split(endOfLine);
	for(i in lines) {
		var line = lines[i];
    	//if(stringutils.endsWith(line, ':' + id + ':0')) {
    	if(S(line).endsWith(':' + id + ':0')) {
    		username = line.substring(0, line.indexOf(':'));
    		break;
    	}
	}
	return username;
}

function createAndSetID(username) {
	var file = constants.USER_SESSIONS_FILE;
	var id = uuid.v4();
	logger.debug("Creating User Session id:" + id);

	var lines = fs.readFileSync(file).toString().split(endOfLine);
	/*
	var newlines = [];
	
	var found = 0;
	for(i in lines) {
		var line = S(lines[i]).trim().s;
    	//if(stringutils.startsWith(line, username) && stringutils.endsWith(line, ':0')) {
    	if(S(line).startsWith(username) && S(line).endsWith(':0')) {
    		line = line.replace(/:0$/, ':1');	//update the entry as session is closed state
    		found = 1;
    	}
    	newlines.push(line);
	}
	*/
	//store this id and associate with username; with in-progress state
	var entry = username + ":" + id + ":0";
	lines.push(entry);
	
	fs.writeFileSync(file, lines.join(endOfLine));
	return id;
}

function resetUserLogin(id) {
	var file = constants.USER_SESSIONS_FILE;

	var lines = fs.readFileSync(file).toString().split(endOfLine);
	var newlines = [];
	var found = 0;
	for(i in lines) {
		var line = S(lines[i]).trim().s;
    	//if(stringutils.startsWith(line, username) && stringutils.endsWith(line, ':0')) {
    	if(S(line).contains(id) && S(line).endsWith(':0')) {
    		line = line.replace(/:0$/, ':1');	//update the entry as session is closed state
    		found = 1;
    	}
    	newlines.push(line);
	}
	
	fs.writeFileSync(file, newlines.join(endOfLine));
	return id;
}


//Not used
function getid(username) {
	var file = constants.USER_SESSIONS_FILE;
	var id = uuid.v4();
	console.log("Creating User id:" + id);

	//store this id and associate with username
	var entry = username + ":" + id + endOfLine;
	fs.appendFileSync(file, entry);
	return id;
}

function getDevice() {
	var device_file = constants.DEVICE_FILE; 
	//console.log('Loading file:' + device_file);
	return getJsonObjectFromFile(device_file);
}

function getJsonObjectFromFile(file_name) {
	var obj = null;
	try {
		//logger.debug('reading the file:' + file_name);
		var contents = fs.readFileSync(file_name);
		try {
			obj = JSON.parse(contents);
		} catch(err) {
			logger.error('Exception occurred while parsing the json object. Error:' + err);
		}
	} catch(err) {
		logger.error('Exception occurred while getting the json object. Error:' + err);
	}
	return obj;
}

exports.addUser = function(req, res) {

	var response = JSON.parse(constants.JSON_RESPONSE);
	var device_file = constants.DEVICE_FILE; 
	var device = getJsonObjectFromFile(device_file);
	if(device == null) {
		response.error_info = 'Failure in Adding the user. Device file is not found';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	var username = req.body.username || req.query.username;
	var password = req.body.password || req.query.password;
	
	var id = '';
	var userAlreadyExist = false;
	var users = device.users;
	users.forEach( function(val) {		//device.users.list.data.forEach
		if(S(val).startsWith(username)) {
			userAlreadyExist = true;
			return false;
		};
	});
	
	if(userAlreadyExist) {
		response.error_info = 'User:' + username + ' already exists';
		res.json(200, response);
		logger.error(JSON.stringify(response));
		return;
	}
	
	users.push(username + ':' + this.encryptPassword(password, device));
	device['users'] = users;
	
	try {
		fs.writeFileSync(device_file, JSON.stringify(device));
	} catch(err) {
	}
	response.status = 'SUCCESS';
	response.error_info = '';
	response.result = 'Successfully added the user:' + username;
	
	res.json(200, response);
	logger.error(JSON.stringify(response));
}

exports.encryptPassword = function(pwd, device) {

	var key = new Buffer(device.name).toString('base64');
	var cipher = crypto.createCipher(constants.USER_PWD_ENCRYPT_ALG, key);  
	var encrypted = cipher.update(pwd, 'utf8', 'base64') + cipher.final('base64');
	return encrypted;
}

exports.decryptPassword = function(pwd, device) {

	var key = new Buffer(device.name).toString('base64');
	var cipher = crypto.createDecipher(constants.USER_PWD_ENCRYPT_ALG, key);  
	var decrypted = cipher.update(pwd, 'base64', 'utf8') + cipher.final('utf8');
	return decrypted;
}

