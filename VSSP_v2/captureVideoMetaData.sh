export PATH=/usr/bin:/usr/local/bin:~/bin:$PATH
echo $PATH

INPUT_VIDEO_FILE=$1
sudo node ./board/metadata/captureMetaDataFromVideo.js $INPUT_VIDEO_FILE
exit 0



