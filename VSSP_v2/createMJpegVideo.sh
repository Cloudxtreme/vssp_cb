export PATH=/usr/bin:/usr/local/bin:/home/linaro/bin:$PATH
echo $PATH

URL=$1
USERNAME=$2
PASSWORD=$3
FPS=$4
DURATION=$5
VIDEO_FILE=$6

echo "MJPEG Video Capturing from:$URL :${VIDEO_FILE}"

python ./board/nodes/MJpegVideoGenerator.py  $URL $USERNAME $PASSWORD $FPS $DURATION $VIDEO_FILE
exitCode=$?
echo "Exit code is:$exitCode"
exit $exitCode



