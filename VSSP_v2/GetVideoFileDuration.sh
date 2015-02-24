export PATH=/usr/bin:/usr/local/bin:/home/linaro/bin:$PATH

INPUT_VIDEO_FILE=$1
FILE_NAME=`date +%s%N`;
TMP_FILE=/tmp/$FILE_NAME.log
durationPresent=`ffmpeg -i $INPUT_VIDEO_FILE &> $TMP_FILE; grep Duration: $TMP_FILE | wc -l`
rm -f $TMP_FILE
if [[ "$durationPresent" == "1" ]]; then
	echo "Duration $INPUT_VIDEO_FILE is present"
	exit 0
fi
#echo "Duration is NOT present"
exit 1



