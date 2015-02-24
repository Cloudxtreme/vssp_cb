start() {
echo "Starting <Service>"
cd ~/testvssp/
./start_board_servers.sh
RETVAL=$?
}

stop() {
echo "Stopping <Service>"
cd ~/testvssp/
./stop_board_servers.sh
RETVAL=$?
}

restart() {
stop
start
}

case "$1" in
start)
  start
;;
stop)
  stop
;;
restart)
  restart
;;
*)

echo $"Usage: $0 {start|stop|restart}"
exit 1
esac

exit $RETVAL