#!/bin/bash
export PATH=/usr/bin:/usr/local/bin:/home/linaro/bin:$PATH
echo $PATH
CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $CURRENT_DIR

echo "Starting the Video record local handler.."
node $CURRENT_DIR/board/local/VideoRecordHandlerLocal.js recordstart $*
echo "Exit code for the local video record handler is:$?"
