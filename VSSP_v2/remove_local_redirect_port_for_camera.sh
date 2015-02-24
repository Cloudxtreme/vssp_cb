#! /bin/bash

COMMENT_KEY=$1

echo "Removing the port re-diretion by key:$COMMENT_KEY"
sudo iptables-save | grep -v "${COMMENT_KEY}" | iptables-restore

