var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var time_format = require('strftime');
var listData = [12,12,12,43,54,632,634,1,343];

l = function(msg) {
	console.log(time_format('%H:%M:%S') + ':' + msg);
}
listData.forEach(function(f) {
	l('F:' + f);
});

var exitCodeCalled = 0;
var arr = [1, 2, 1, 2, 345, 4534, 5345 ,34];
/*
arr.forEach(function(d) {
	var p = exec('dir ', function(err, stdout, stderr) {
		if(err) {
			l('error:' + err);
			//return;
		}
		l('stdout:' + stdout);
		//l('stderr:' + stderr);
	});

	l('process started:' + d);

	p.on('exit', function(exitCode, signal) {
		l('Exit code:' + exitCode);
		exitCodeCalled++;
	});
}); 

*/

arr.forEach(function(d) {
	var p = spawn('dir', [],  { stdio: 'inherit' });
	p.on('exit', function(exitCode, signal) {
		l('Exit code:' + exitCode);
		exitCodeCalled++;
	});
});

process.on('exit', function(exitCode, signal) {
	l('Total exit code called is:' + exitCodeCalled);
});

