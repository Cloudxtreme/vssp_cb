#!/bin/bash

################################################################################
#
# Script name: MultiMedia Concat Script (mmcat)
# Author: burek (burek021@gmail.com)
# License: GNU/GPL, see http://www.gnu.org/copyleft/gpl.html
# Date: 2012-07-14
#
# This script concatenates (joins, merges) several audio/video inputs into one
# final output (just like as if all the inputs were played in a playlist, one
# after another).
#
# All input files must have at least one audio and at least one video stream.
# If not, you can easily add audio silence, using FFmpeg. Just search the
# internet for "ffmpeg add silence".
#
# The script makes use of FFmpeg tool (www.ffmpeg.org) and is free for use under
# the GPL license. The inspiration for this script came from this FAQ item:
# http://ffmpeg.org/faq.html#How-can-I-join-video-files_003f
#
# If you find any bugs, please send me an e-mail so I can fix it.
#
################################################################################
#
# General syntax: mmcat <input1> <input2> <input3> ... <output>
#
# For example: mmcat file1.flv file2.flv output.flv
# would create "output.flv" out of "file1.flv" and "file2.flv".
#
################################################################################

# change this to what you need !!!
EXTRA_OPTIONS='-vcodec libx264 -crf 23 -preset medium -acodec aac -strict experimental -ac 2 -ar 44100 -ab 128k'

################################################################################
#
# NO NEED TO TOUCH ANYTHING AFTER THIS LINE!
#
################################################################################

# the version of the script
VERSION=1.3

# location of temp folder
TMP=/tmp

################################################################################

echo "MultiMedia Concat Script v$VERSION (mmcat) - A script to concatenate multiple multimedia files."
echo "Based on FFmpeg - www.ffmpeg.org"
echo "Don't forget to edit this script and change EXTRA_OPTIONS"
echo ""

################################################################################
# syntax check (has to have at least 3 params: infile1, infile2, outfile
################################################################################
if [ -z $3 ]; then
	echo "Syntax: $0 <input1> <input2> <input3> ... <output>"
	exit 1
fi

################################################################################
# get all the command line parameters, except for the last one, which is output
################################################################################
# $first  - first parameter
# $last   - last parameter (output file)
# $inputs - all the inputs, except the first input, because 1st input is
#           handled separately
################################################################################
first=${@:1:1}
last=${@:$#:1}
len=$(($#-2))
inputs=${@:2:$len}

# remove all previous tmp fifos (if exist)
rm -f $TMP/mcs_*

################################################################################
# decode first input differently, because the video header does not have to be
# kept for each video input, only the header from the first video is needed
################################################################################
mkfifo $TMP/mcs_a1 $TMP/mcs_v1

ffmpeg -y -i $first -vn -f u16le -acodec pcm_s16le -ac 2 -ar 44100 $TMP/mcs_a1 2>/dev/null </dev/null &
ffmpeg -y -i $first -an -f yuv4mpegpipe -vcodec rawvideo $TMP/mcs_v1 2>/dev/null </dev/null &

# if you need to log the output of decoding processes (usually not necessary)
# then replace the "2>/dev/null" in 2 lines above with your log file names, like this:
#ffmpeg -y -i $first -vn -f u16le -acodec pcm_s16le -ac 2 -ar 44100 $TMP/mcs_a1 2>$TMP/log.a.1 </dev/null &
#ffmpeg -y -i $first -an -f yuv4mpegpipe -vcodec rawvideo $TMP/mcs_v1 2>$TMP/log.v.1 </dev/null &

################################################################################
# decode all the other inputs, remove first line of video (header) with tail
# $all_a and $all_v are lists of all a/v fifos, to be used by "cat" later on
################################################################################
all_a=$TMP/mcs_a1
all_v=$TMP/mcs_v1
i=2
for f in $inputs
do
	mkfifo $TMP/mcs_a$i $TMP/mcs_v$i

	ffmpeg -y -i $f -vn -f u16le -acodec pcm_s16le -ac 2 -ar 44100 $TMP/mcs_a$i 2>/dev/null </dev/null &
	{ ffmpeg -y -i $f -an -f yuv4mpegpipe -vcodec rawvideo - 2>/dev/null </dev/null | tail -n +2 > $TMP/mcs_v$i ; } &

	# if you need to log the output of decoding processes (usually not necessary)
	# then replace the "2>/dev/null" in 2 lines above with your log file names, like this:
	#ffmpeg -y -i $f -vn -f u16le -acodec pcm_s16le -ac 2 -ar 44100 $TMP/mcs_a$i 2>$TMP/log.a.$i </dev/null &
	#{ ffmpeg -y -i $f -an -f yuv4mpegpipe -vcodec rawvideo - 2>$TMP/log.v.$i </dev/null | tail -n +2 > $TMP/mcs_v$i ; } &

	all_a="$all_a $TMP/mcs_a$i"
	all_v="$all_v $TMP/mcs_v$i"
	let i++
done

################################################################################
# concatenate all raw audio/video inputs into one audio/video
################################################################################
mkfifo $TMP/mcs_a_all
mkfifo $TMP/mcs_v_all
cat $all_a > $TMP/mcs_a_all &
cat $all_v > $TMP/mcs_v_all &

################################################################################
# finally, encode the raw concatenated audio/video into something useful
################################################################################
ffmpeg -f u16le -acodec pcm_s16le -ac 2 -ar 44100 -i $TMP/mcs_a_all \
       -f yuv4mpegpipe -vcodec rawvideo -i $TMP/mcs_v_all \
	$EXTRA_OPTIONS \
	$last

################################################################################
# remove all fifos
################################################################################
rm -f $TMP/mcs_*

