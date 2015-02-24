var moment = require('moment');
var m = new moment();
console.log('Current date:'  + m.format());
m.subtract(1, 'minutes');
console.log('Current date:'  + m.format());




