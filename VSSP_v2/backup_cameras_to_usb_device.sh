#!/bin/bash

mount_device=$1
mount_folder=$2
src_folder=$3
dest_folder=$4
base_folder=$5
video_folder_name=$6

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


#camera_list=(${src_folder//,/ })
IFS=',' camera_list=($src_folder) 
echo ${camera_list[@]}
for camera in ${camera_list[@]}
do
	echo "Copying videos from Camera:$camera"
	sudo mkdir -pv $mount_folder/$dest_folder/$camera/$video_folder_name/
	if [ $? != 0 ] 
	then
		echo "Unmounting $mount_folder"
		sudo umount $mount_folder
		echo "Failed to copy the files from $src_folder to $mount_folder/$dest_folder"
		exit 1
	fi

	sudo cp -R $base_folder/$camera/$video_folder_name/ $mount_folder/$dest_folder/$camera/
	if [ $? != 0 ] 
	then
		echo "Unmounting $mount_folder"
		sudo umount $mount_folder
		echo "Failed to copy the files from $src_folder to $mount_folder/$dest_folder"
		exit 1
	fi
done


echo "Copy is completed"

echo "Unmounting $mount_folder"
sudo umount $mount_folder

