var fs = require('fs');
var moment = require('moment');
var util = require('util');

//var file = __dirname + '/video_image__2014-07-26_04_08_12_868749.jpg';
var file = __dirname + '/test_file.txt';
console.log('file:' + file);
var stat = fs.statSync(file);
console.log('stats:' + util.inspect(stat));
//Sat Jul 26 2014 09:08:12 GMT+0000
var d = ('' +  stat.mtime).split(' ');
console.log('c:' + d);
//Sat,Jul,26,2014,09:08:12,GMT+0000,(UTC)
var modifiedTime = d[1] + '-' + d[2] + '-' + d[3] + '/' + d[4];
var i= moment(1412792837000);
console.log('i:' + i);
var m  = moment(modifiedTime, 'MMM-DD-YYYY/HH:mm:ss');
console.log('M:' + m);
console.log('Diff:' + i.diff(m));




