var path = require('path');

exports.ADMIN_SERVER_NAME='VSSP Board Admin';
exports.ADMIN_SERVER_PORT = 5050;

exports.APP_NAME='VSSP Board';
exports.BOARD_PORT = 8080;
exports.BOARD_PORT_V2 = 4040;

exports.SITE_NAME='VSSP Site';
exports.SITE_PORT = 7070;

exports.VIDEO_STREAMING_SERVER_NAME='VSSP Video Streaming Server',
exports.VIDEO_STREAMING_SERVER_PORT=10010;

exports.SYSTEM_NOTIFICATION_SERVER_NAME='VSSP Notification Server';
exports.SYSTEM_NOTIFICATION_SERVER_PORT=7070;

exports.SYSTEM_STATUS_SERVER_NAME='System Status Server';
exports.SYSTEM_STATUS_SERVER_PORT=9090;

exports.SYSTEM_STATUS_SERVICE='System Status Service';
exports.SYSTEM_STATUS_SERVICE_PORT=9091;

exports.VIDEO_MERGER_SERVICE='Video Merger Service';
exports.VIDEO_MERGER_SERVICE_PORT=6060;

exports.DB_SERVER_PORT=10010;
exports.DB_SERVER_NAME='localhost';

exports.COOKIE_VSSP_ADMIN='vssp_admin';
exports.COOKIE_VSSP_USER_NAME='vssp_user';

exports.USER_PWD_ENCRYPT_ALG='aes256';
//current folder
exports.VSSP_BASE_FOLDER=__dirname + path.sep;

//store folder. Configurable to move to some other folder as storage
var store_folder=__dirname + path.sep + 'store_new' + path.sep;
exports.VSSP_STORE_BASE_FOLDER=store_folder;

//system store where user/system conf shall be stored
var system_store=this.VSSP_BASE_FOLDER + 'system_files' + path.sep;

exports.DEVICE_FILE=system_store  + 'vssp_configuration.json';
exports.USER_SESSIONS_FILE=system_store  + 'user_sessions.txt';

exports.VSSP_VIDEO_EXECUTOR_BASE_FOLDER=this.VSSP_BASE_FOLDER + path.sep + 'videoexecutors';
exports.VSSP_VIDEO_EXECUTOR__FILE_EXTN='.json';
exports.VSSP_PROFILE_STORE_BASE_FOLDER=this.VSSP_BASE_FOLDER + path.sep + 'videoprofiles';
exports.VSSP_PROFILE__FILE_EXTN='.json';


exports.BOARD_LOG_FILE=this.VSSP_BASE_FOLDER + 'logs/board_log.log';
exports.BOARD_V2_LOG_FILE=this.VSSP_BASE_FOLDER + 'logs/board_log_v2.log';



exports.BOARD_SERVICE_LIST=this.VSSP_BASE_FOLDER + 'board_service_list.json';
exports.SERVICE_INPROGRESS_EXTN='.pid'
exports.STOP_SERVICE_MODULE=this.VSSP_BASE_FOLDER + path.sep + 'stop_board_servers.js';
exports.START_SERVICE_MODULE=this.VSSP_BASE_FOLDER + path.sep + 'start_board_servers.js';
exports.STOP_SERVICE_EXECUTABLE=this.VSSP_BASE_FOLDER + path.sep + 'stop_board_servers.sh';

exports.NODE_STORE_FILE='nodestore.json';
exports.NODE_DESC_FILE_EXTN='.nodedesc';
exports.VIDEO_STORE_FOR_NODE='videos';
exports.IMAGE_STORE_FOR_NODE='images';
exports.MJPEG_STORE_FOR_NODE='mjpeg';
exports.TMP_STORE_FOR_NODE='tmp';

exports.VIDEO_METADATA_FILE_EXTN='.json';
exports.VIDEO_RECORD_FILE_PREFIX='Video_';
exports.MAIN_VIDEO_RECORD_FILE_PREFIX='Main_Video_';

exports.VIDEO_RECORD_CONTROLLER_STOP_SIGNAL='/stopRecord';
exports.VIDEO_RECORD_STOP_RESPONSE='SUCCESS_IN_STOPPING_VIDEO_RECORD';

exports.VIDEO_TAG_LIST=system_store + path.sep + 'video_tags.json';
exports.CAMERA_MODELS=system_store + path.sep + 'camera_models.json';
exports.LIST_RECORD_SERVICE_TYPES=system_store + path.sep + 'record_service_types.json';
exports.LAST_NODE_ID_CREATED=system_store + path.sep + 'node_ids.json';

exports.RECORD_INPROGRESS_STORE_FILE_SUFFIX='_record_inprogress.json';
exports.SCHEDULED_RECORD_INPROGRESS_STORE_FILE_SUFFIX='_record_scheduled_inprogress.json';
exports.RECORD_SERVICE_REQUESTS_FOLDER='record_service_requests';

exports.RECORD_JS_SCRIPT=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'nodes' + path.sep + 'recorder.js';
exports.SCHEDULED_RECORD_JS_SCRIPT=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'nodes' + path.sep + 'ScheduledRecorder.js';

exports.VIDEO_TITLE='VSSP';

exports.CAPUTE_IMAGE_FROM_VIDEO_JS_SCRIPT=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'metadata' + path.sep + 'metaDataCaptureFromVideo.js';
exports.IMAGE_FILE_EXTN='.jpeg';
exports.IMAGE_SIZE='320x240';
exports.IMAGE_POSITION_FROM_VIDEO=5;

exports.CAPTURE_METADATA_FROM_ORIGINAL_VIDEO_BATCH_FILE=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'metadata' + path.sep + 'captureMetaDataFromOriginalVideo.js';

//Scheduler for MetaData Capture
exports.SCHEDULER_RUN_INPROGRESS=system_store + path.sep + 'scheduler_inprogress.json';

exports.SCHEDULED_VIDEO_RECORDER_JS_SCRIPT=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'nodes' + path.sep + 'ScheduledVideoRecorder.js';

exports.SCHEDULED_VIDEO_RECORDER_SHELL_SCRIPT=this.VSSP_BASE_FOLDER + path.sep + 'run_scheduled_video_record.sh';

exports.STR_RECORD_START = "start_record";
exports.STR_RECORD_STOP = "stop_record";
exports.STR_SUCCESS = "SUCCESS_IN_RECORD_START";
exports.STR_FAILURE = "FAILURE_IN_RECORD_START_STOP";
exports.BUF_VIDEO_LENGTH_TO_BE_ADDED_SECONDS=5
exports.GET_EXTERNAL_IP_ADDRESS_SITE='http://checkip.dyndns.org/';
exports.NOTIFIER_NODE_APP_FILE=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'notifier' + path.sep + 'board_status_notifier.js';
exports.JSON_RESPONSE='{"status" : "FAIL", "error_info" : "", "result" : ""}';
exports.BOARD_NODE_PANE_DETAILS_TEMPLATE=this.VSSP_BASE_FOLDER + path.sep +'/public/board_htmls/boardnodepanedetails.html';

exports.BOARD_CAMERA_PANE_VIEW_DETAILS_TEMPLATE=this.VSSP_BASE_FOLDER + path.sep +'/public/board_htmls/boardcameraviewdetails.html';

exports.LOCAL_PORT_FORWARD_NUMBER=5000;
exports.ADD_PORTFORWARD_FOR_CAMERA_PGM=this.VSSP_BASE_FOLDER + path.sep + '/add_local_redirect_port_for_camera.sh';
exports.REMOVE_PORTFORWARD_FOR_CAMERA_PGM=this.VSSP_BASE_FOLDER + path.sep + '/remove_local_redirect_port_for_camera.sh';

exports.STORAGE_CHECK_INTERVAL_IN_SECONDS=30;

exports.PROCESS_VIDEO_FILES_FREQ_IN_SECONDS=5;

//not used
exports.MAX_NO_VIDEO_FILES_TO_PROCESS_PER_TIME=10;

//Motion specific constants
exports.MOTION_TEMPLATE_CONF=system_store + 'motion_template.conf';
exports.MOTION_TEMP_FOLDER='motion_tmp';
exports.MOTION_TEMP_IMAGES_FOLDER='images';
exports.MOTION_EVENT_START_CMD=this.VSSP_BASE_FOLDER + path.sep + 'motion_capture_handler.sh  ';
exports.MOTION_EVENT_END_CMD=this.VSSP_BASE_FOLDER + path.sep + 'motion_capture_handler.sh  ';
exports.MOTION_FPS=4
exports.MOTION_EXECUTABLE='motion';
exports.MOTION_INPROGRESS_STORE_FILE_SUFFIX='_motion_record_inprogress.json';
exports.MOTION_IMAGE_SEQUENCE_PGM=this.VSSP_BASE_FOLDER + path.sep + 'createVideoFromImages.sh';
exports.MOTION_TO_ACTUAL_VIDEO_PGM=this.VSSP_BASE_FOLDER + path.sep + 'createVideoFromMotion.sh';
exports.MOTION_DETECT_SENSITIVITY_MINIMUM_LEVEL=8000;
exports.MOTION_DETECT_SENSITIVITY_MEDIUM_LEVEL=4000;
exports.MOTION_DETECT_SENSITIVITY_HIGH_LEVEL=1500;

exports.GET_VIDEO_DURATION_PGM=this.VSSP_BASE_FOLDER + path.sep + 'GetVideoFileDuration.sh';
exports.MJPEG_VIDEO_CAPTURE=this.VSSP_BASE_FOLDER + path.sep + 'createMJpegVideo.sh';
exports.VIDEO_MERGER_FOR_CAMERA=this.VSSP_BASE_FOLDER + path.sep +  'videomergeforcamera.sh';
exports.VIDEO_MERGER_CHILD_APP=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'videomerger' + path.sep + 'VideoMergerHandlerForCamera.js';
exports.MJPEG_FPS=5;
exports.MJPEG_IMAGE_CAPTURE_PGM=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'nodes' + path.sep + 'MJpegImageGenerator.js';
exports.MJPEG_VIDEO_CAPTURE_PGM=this.VSSP_BASE_FOLDER + path.sep + 'board' + path.sep + 'nodes' + path.sep + 'MJpegVideoGenerator.js';
exports.CAPTURE_VIDEO_SHELL_PGM='/bin/bash ' + this.VSSP_BASE_FOLDER + path.sep + 'createVideoFromMJpegImages.sh';

exports.MJPEG_IMAGE_FILENAME_START="Image_";
exports.MJPEG_IMAGE_EXTN='.jpg'
exports.MJPEG_IMAGE_SEQ_FORMAT='%04d';
exports.MJPEG_GLOB_PATTERN='*' + this.MJPEG_IMAGE_EXTN;

exports.MJPEG_REFRESH_RATE_IN_MS_AT_CLIENT=500
exports.MJPEG_RETAIN_IMAGE_FOLDERS_FOR_DEBUG=0;
exports.STORAGE_MEDIUM='/';
exports.STORAGE_MEDIUM_ALERT_PERCENTAGE=0.85
exports.ALERT_FILE=system_store + path.sep + 'alerts.json';
exports.STORAGE_ALERT_KEY='STORAGE_ALERT';
exports.SERVER_CONNECTION_ALERT_KEY='SERVER_CONNECTION_ALERT';

//Settings for video concatenation (1 hr)
exports.MAX_VIDEO_DURATION_FOR_VIDEO_CONCATENATION_IN_SECONDS=3600
exports.VIDEO_MERGER_PGM='/bin/bash ' + this.VSSP_BASE_FOLDER + path.sep + 'mergevideos.sh';
exports.MERGE_VIDEO_INPROGRESS_FILE='merge_video_inprogress.json';

exports.VIDEO_MERGER_ADD_REQUEST='/videomerger/addVideoForMetaDataProcessing';

exports.CAPTURE_METADATA_FROM_VIDEO_PGM=' ' + this.VSSP_BASE_FOLDER + path.sep + 'captureVideoMetaData.sh';
exports.VIDEO_PROCESSING_FREQ_SECONDS=240;
exports.VIDEOS_FOR_METADATA_PROCESSING='videos_for_metadata_processing.json';
exports.VIDEOS_FOR_MERGING_PROCESSING='videos_for_merging_processing.json';


exports.USER_SETTINGS_TEMPLATE=this.VSSP_BASE_FOLDER + path.sep +'/public/board_htmls/usersettings.html';

exports.START_VIDEO_RECORD_PGM=this.VSSP_BASE_FOLDER + path.sep + 'start_recording.sh';

//Files to keep
exports.DAYS_TO_KEEP_VIDEO_FILES=2

//email list
exports.USER_EMAIL_LIST="saraav@gmail.com,"

exports.ENABLE_VIDEO_START_STOP_NOTIFICATION=1
exports.ENABLE_VIDEO_RECORD_FAILURE_NOTIFICATION=1
exports.ENABLE_BOARD_START_STATUS_NOTIFICATION=1

exports.RECORD_START_SUBJECT='Video Record Start Notification';
exports.EVENT_NAME_RECORD_START='Video Recording Started';

exports.RECORD_STOP_SUBJECT='Video Record Stop Notification';
exports.EVENT_NAME_RECORD_STOP='Video Recording Stopped';
exports.EVENT_NAME_CAMERA_CONN_LOST='Lost the Connection to Camera:';
exports.EVENT_BOARD_START='Board Start Event';

exports.ADMIN_LOGIN_TIMEOUT_SECONDS=3600;
exports.CAMERA_ALIVE_WHILE_RECORDING_MONITOR_INTERVAL_SECONDS=10;
exports.CAMERA_LOST_ALERT_NOTIFICATION_INTERVAL_SECONDS=60;

exports.NO_SIGNAL_VIDEO=system_store + path.sep + 'NoVideoSignal.mp4';
//date time format
exports.FILE_NAME_DATE_TIME_FORMAT="%d_%m_%y_%I_%M_%S_%p"
exports.CAPTURE_VIDEO_DATE_TIME_FORMAT="%D %r"

exports.email_server_config = {
	server_credentials : {
		user: 'saraav@gmail.com',
		pass: 'saraav123',
	},
   defaultFromAddress: 'VSSP Admin <saraav@gmail.com>'
};

exports.BOARD_START_NOTIFICATION_TIMEOUT_IN_SECONDS=20
exports.SYSTEM_ACTIVITY_LOG_FILE=system_store + path.sep + 'event_logger.log';

//Backup options
exports.BACKUP_VIDEOS_STATUS=system_store + path.sep + 'backup_jobs_status.json';
exports.LIST_USB_DEVICES_PGM=this.VSSP_BASE_FOLDER + 'list_usb_devices.sh';
exports.BACKUP_VIDEOS_SETTINGS_TEMPLATE=this.VSSP_BASE_FOLDER + path.sep +'/public/board_htmls/backupsettings.html';
exports.BACKUP_CAMERAS_PGM=this.VSSP_BASE_FOLDER + 'backup_cameras_to_usb_device.sh';
exports.BACKUP_VIDEOS_PGM=this.VSSP_BASE_FOLDER + 'backup_videos_to_usb_device.sh';
exports.MNT_FOLDER='/mnt/sda';
exports.BACKUP_FOLDER_IN_USB_DEVICE='VSSPBoardVideos';

exports.BACKUP_VIDEOS_TO_WEB_CONFIG=system_store + path.sep + 'web_backup_config.json';
//DropBox Handler
exports.BACKUP_VIDEOS_TO_DROPBOX_PGM=this.VSSP_BASE_FOLDER + 'DropBoxSync.sh';
exports.BACKUP_VIDEOS_TO_DROPBOX_HANDLER=this.VSSP_BASE_FOLDER + path.sep + 'board/backup/GetDropBoxAuthKey.js';


exports.DB_SERVER='localhost';
exports.DB_PORT=3306;
exports.DB_USERNAME='root';
exports.DB_PASSWORD='root';
exports.DB_SCHEMA='vssp';
