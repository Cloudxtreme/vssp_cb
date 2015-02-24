#!/bin/bash
export PATH=/home/linaro/bin:/usr/local/bin:$PATH
CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $CURRENT_DIR
cd logs
rm *.log
cd tmp
rm *.log
echo "Cleaned the log environment"

