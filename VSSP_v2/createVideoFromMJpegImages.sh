export PATH=/usr/bin:/usr/local/bin:/home/linaro/bin:$PATH
echo $PATH

which ffmpeg

FOLDER_FORMAT=$1
FPS=$2
OUTPUTFILE=$3
echo Input:${FOLDER_FORMAT} and output to:${OUTPUTFILE}

#cat $FOLDER/*.jpg | ffmpeg -f image2pipe -c:v mjpeg -r $FPS -i - $OUTPUTFILE
echo `date`
ffmpeg -r $FPS  -pattern_type glob -i "$FOLDER_FORMAT" -c:v libx264  -pix_fmt yuv420p -preset ultrafast -y $OUTPUTFILE > /dev/null 2>&1
exitCode=$?
echo `date`
echo "Exit code is:$exitCode"
exit $exitCode



