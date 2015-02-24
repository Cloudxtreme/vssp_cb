#!/bin/bash
REMOVABLE_DRIVES=""
for _device in /sys/block/*/device; do
    if echo $(readlink -f $_device)|egrep -q "usb"; then
        #echo $_device
        _disk=`echo $_device | cut -f4 -d/`
        REMOVABLE_DRIVES="$REMOVABLE_DRIVES $_disk"
    fi
done
if [ -z "$REMOVABLE_DRIVES" ]; then
    echo "No Drives found"
    exit 1
fi
#echo Removable drives found: $REMOVABLE_DRIVES
d=`sudo fdisk -l 2>null | grep $REMOVABLE_DRIVES | egrep '^\/dev' | cut  -d' ' -f1`
sudo mkdir -p /mnt/sda
sudo mount $d /mnt/sda

#1K blocks 
total=`df  | grep $d |sed -e 's/ \+ / /g' | cut -d' '  -f2`
used=`df  | grep $d |sed -e 's/ \+ / /g' | cut -d' '  -f3`
available=`df  | grep $d |sed -e 's/ \+ / /g'| cut -d' '  -f4`
sudo umount /mnt/sda
echo $d,$total,$used,$available




