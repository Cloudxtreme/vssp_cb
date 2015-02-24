#!/bin/bash
export PATH=/home/linaro/bin:/usr/local/bin:$PATH
CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $CURRENT_DIR
node $CURRENT_DIR/stop_board_servers.js $*
