#!/bin/bash
export PATH=/usr/bin:/usr/local/bin:/home/linaro/bin:$PATH
echo $PATH

echo "Starting the scheduled execution.."
node $* &

