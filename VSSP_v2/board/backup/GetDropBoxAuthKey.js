var c = require('casper').create();
var fs = require('fs');
c.options.waitTimeout = 60000; 

options = c.cli.options;


var address =  options['url']; //'https://www.dropbox.com/1/oauth2/authorize?locale=en_US&client_id=u60dhy5h9oonmfa&response_type=code';
var username = options['user'];
var pwd = options['password'];
var output_file = options['output_file'];

console.log('Url:' + address + ', username:' + username); 

c.start(address, function(status) {
	if(! this.exists('form[action="/ajax_captcha_login"]')) {
		console.log("Login form doesnt exist");
		return;
	}
	if(! this.exists('input[name="login_email"]')) {
		console.log('Login email not found');
		return;
	}
	
	if(! this.exists('input[name="login_password"]')) {
		console.log('Login password field not found');
		return;
	}
	
	if(! this.exists('button[type="submit"]')) {
		console.log('Sign Up button not found');
		return;
	}
	console.log('Login page success');
});

c.then(function() {
	console.log('Elements are found....Waiting for 10 seconds to make sure all the content are getting loaded propertly...');
        this.wait(10000, function() {
                console.log('Type and submitting the page...');
		this.sendKeys('input[name="login_email"]', username);
		this.sendKeys('input[name="login_password"]', pwd);
		this.click('button[type="submit"]');
		console.log('Submit has been done');
        });
});

c.then(function() {
	console.log("Verifying the confirm page...");
	this.waitForSelector('button[name="allow_access"]', function() {
		console.log('Allow access has been found');
		this.click('button[name="allow_access"]');
	});
});

c.then(function() {
	console.log('Extracting the API key..');
	this.waitForSelector('div#auth-code', function() {
		console.log('Key Token has been found');
                var auth_code = this.getHTML('div#auth-code');
		console.log("Key found as:" + auth_code);
                options['auth_code'] = auth_code;

                fs.write(output_file, JSON.stringify(options) , 'w');

	});
});
c.run();
