export PATH=/usr/bin:/usr/local/bin:~/bin:$PATH

PGM_FILE=$1
CAMERA_NAME=$2
LOG_FILE=$3
node $PGM_FILE $CAMERA_NAME &>$LOG_FILE
exit $?



