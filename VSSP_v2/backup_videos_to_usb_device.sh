#!/bin/bash

mount_device=$1
mount_folder=$2
src_file=$3
dest_folder=$4
base_folder=$5
video_folder_name=$6
camera=$7

echo "Creating mount folder:$mount_folder"
sudo mkdir -pv $mount_folder
if [ $? != 0 ] 
then
    echo "Failed to create mount folder:$mount_folder"
    exit 1
fi

echo "Mounting:$mount_device to $mount_folder, Copying from:$src_folder to $dest_folder"

sudo mount $mount_device  $mount_folder
if [ $? != 0 ] 
then
    echo "Failed to mount device:$mount_device to folder:$mount_folder"
    exit 1
fi


echo "Creating dest folder:$dest_folder if that doesn't exist"
sudo mkdir -pv $mount_folder/$dest_folder
if [ $? != 0 ] 
then
    echo "Unmounting $mount_folder"
    sudo umount $mount_folder
    echo "Failed to create destination folder $mount_folder/$dest_folder"
    exit 1
fi

sudo mkdir -pv $mount_folder/$dest_folder/$camera/$video_folder_name/
if [ $? != 0 ] 
then
	echo "Unmounting $mount_folder"
	sudo umount $mount_folder
	echo "Failed to copy the files from $src_folder to $mount_folder/$dest_folder"
	exit 1
fi

IFS=$'\r\n' GLOBIGNORE='*' :; files=($(cat $src_file))
for file in ${files[@]}
do
	echo "Copying:$file"
	sudo cp $file $mount_folder/$dest_folder/$camera/$video_folder_name/
	if [ $? != 0 ] 
	then
		echo "Unmounting $mount_folder"
		sudo umount $mount_folder
		echo "Failed to copy the files from $file to $mount_folder/$dest_folder/$camera/$video_folder_name/"
		exit 1
	fi
done

echo "Copy is completed"

echo "Unmounting $mount_folder"
sudo umount $mount_folder

