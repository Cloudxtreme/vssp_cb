#!/bin/bash
export PATH=/usr/bin:/usr/local/bin:/home/linaro/bin:$PATH
echo $PATH

node ./board/local/VideoRecordHandlerLocal.js recordstop $*
