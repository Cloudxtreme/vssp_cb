export PATH=/usr/bin:/usr/local/bin:/home/linaro/bin:$PATH
#echo $PATH


INPUT_VIDEO_LIST_FILE=$1
CANCATENATED_OUTPUT_FILE=$2
TITLE=$3
#echo Input:${INPUT_VIDEO_LIST_FILE} and output to:${CANCATENATED_OUTPUT_FILE}
ffmpeg -f concat -i $INPUT_VIDEO_LIST_FILE -metadata title=$TITLE -c copy -y $CANCATENATED_OUTPUT_FILE > /dev/null 2>&1

exit 0



