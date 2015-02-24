#! /bin/bash

INCOMING_PORT=$1
REDIRECT_ADDRESS=$2
COMMENT_KEY=$3

echo "Redirecting packets received at:$INCOMING_PORT to $REDIRECT_ADDRESS"
sysctl net.ipv4.ip_forward=1
iptables -t nat -A PREROUTING -p tcp --dport $INCOMING_PORT -j DNAT --to-destination $REDIRECT_ADDRESS -m comment --comment $COMMENT_KEY

iptables -t nat -A POSTROUTING -j MASQUERADE
