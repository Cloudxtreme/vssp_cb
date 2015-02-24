#! /bin/bash


#IMG_FOLDER=$1

#OUTPUT_FILE=$3

#cd $IMG_FOLDER
#ls -trU *.jpg| awk 'BEGIN{ a=0 }{ printf "mv %s Image_%09d.jpg\n", $0, a++ }'  | bash

#$VIDEO_EXECUTABLE  -f image2 -r 1/2 -i Image_%09d.jpg -vcodec libx264 -r 1/2 -pix_fmt yuv420p -y $OUTPUT_FILE

#ffmpeg_original -f image2 -r 1/2 -i Image_%09d.jpg  -y output.mp4
VIDEO_EXECUTABLE=$1
$VIDEO_EXECUTABLE -i $2 -acodec copy -vcodec copy $3


