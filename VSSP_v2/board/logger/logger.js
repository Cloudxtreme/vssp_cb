var constants = require('./../../constants.js');
var winston = require('winston');
var log = {
    'logger' : {
      'levels': {
        'detail': 0,
        'trace': 1,
        'debug': 2,
        'enter': 3,
        'info': 4,
        'warn': 5,
        'error': 6
      },
      'colors': {
        'detail': 'grey',
        'trace': 'white',
        'debug': 'blue',
        'enter': 'inverse',
        'info': 'green',
        'warn': 'yellow',
        'error': 'red'
      },
    }
  };
var winLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: constants.BOARD_LOG_FILE, json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/board_log.log',
			json : false
		})
    ],	
	exitOnError: false
});
winLogger.setLevels(log.logger.levels);
winston.addColors(log.logger.colors);

var winLogger2 = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: constants.BOARD_V2_LOG_FILE, json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/board_log_2.log',
			json : false
		})
    ],	
	exitOnError: false
});
winLogger2.setLevels(log.logger.levels);
winston.addColors(log.logger.colors);



var winStorageConnectionAlertLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/storage_connection_alert_log.log', json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/storage_connection_alert_log.log',
			json : false
		})
	],	
	exitOnError: false
});
winStorageConnectionAlertLogger.setLevels(log.logger.levels);

var winLocalExecutionLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/local_execution_log.log', json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/local_execution_log.log',
			json : false
		})
	],	
	exitOnError: false
});
winLocalExecutionLogger.setLevels(log.logger.levels);

var winCleanLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/storecleaner_log.log', json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/storecleaner_log.log',
			json : false
		})
	],	
	exitOnError: false
});
winCleanLogger.setLevels(log.logger.levels);

var videoMergerLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/videoMerger_log.log', json : false, maxsize: 104857600, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/videoMerger_log.log',
			json : false
		})
	],	
	exitOnError: false
});
videoMergerLogger.setLevels(log.logger.levels);

var videoMergerCameraLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/videoMergerForCamera_log.log', json : false, maxsize: 104857600, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/videoMergerForCamera_log.log',
			json : false
		})
	],	
	exitOnError: false
});
videoMergerCameraLogger.setLevels(log.logger.levels);



var notificationServerLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/notification_server.log', json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/notification_server.log',
			json : false
		})
	],	
	exitOnError: false
});
notificationServerLogger.setLevels(log.logger.levels);

var eventLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.File)(
			{ filename: './system_files/event_logger.log', json : true, maxsize: 1099511627776, level:'detail'}
		)
	],
	exitOnError: false
});
eventLogger.setLevels(log.logger.levels);

var videoFilesFilterLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/video_files_filter.log', json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/video_files_filter.log',
			json : false
		})
	],	
	exitOnError: false
});
videoFilesFilterLogger.setLevels(log.logger.levels);

var scheduledExecutionLogger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(
			{json : false, level:'info'}
		),
		new (winston.transports.File)(
			{ filename: './logs/scheduled_execution.log', json : false, maxsize: 1099511627776, level:'detail'}
		)
	],
	exceptionHandlers: [
		new winston.transports.File({ 
			filename: './logs/scheduled_execution.log',
			json : false
		})
	],	
	exitOnError: false
});
scheduledExecutionLogger.setLevels(log.logger.levels);

exports.logger=winLogger;
exports.logger2=winLogger2;
exports.alertLogger=winStorageConnectionAlertLogger;
exports.localLogger=winLocalExecutionLogger;
exports.cleanLogger=winCleanLogger;
exports.videoMergerLogger=videoMergerLogger;
exports.videoMergerCameraLogger=videoMergerCameraLogger;
exports.notificationServerLogger=notificationServerLogger;
exports.eventLogger=eventLogger;
exports.videoFilesFilterLogger=videoFilesFilterLogger;
exports.scheduledExecutionLogger=scheduledExecutionLogger;
