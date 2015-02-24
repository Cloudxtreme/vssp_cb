import requests,sys,time
from subprocess import Popen, PIPE

def isNoneOrEmptyOrBlankString (myString):
    if myString:
        if not myString.strip():
            return True
    else:
        return True
    return False

if len(sys.argv) < 7:
    print 'Failed as mandatory arguments for MJpegVideo Creator are not found'
    sys.exit(1);

url = sys.argv[1];
username = sys.argv[2];
password = sys.argv[3];
i_fps = sys.argv[4];
duration = int(sys.argv[5]);
video_file = sys.argv[6];

p = Popen(['ffmpeg', '-analyzeduration', '0', '-y', '-f',  'image2pipe', '-vcodec', 'mjpeg', '-r', i_fps, '-i', '-', '-vcodec', 'mpeg4', '-r', i_fps, video_file], stdin=PIPE)
#p = Popen(['ffmpeg', '-y', '-f',  'image2pipe', '-vcodec', 'mjpeg', '-i', '-', '-vcodec', 'mpeg4', '-r', i_fps, video_file], stdin=PIPE)

fps = int(i_fps);

delayInMS= 1000/fps
totalFrames = fps * duration;
frameCount = 0;

headers = {};
if not isNoneOrEmptyOrBlankString(username):
    data = username + ":" + password;
    encodedData = data.encode('base64');
    headers = { 'Authorization': 'Basic ' + encodedData}
    
while frameCount < totalFrames:
    r = requests.get(url, headers=headers);
    frameCount = frameCount + 1;
    p.stdin.write(r.content);
    time.sleep(delayInMS/1000);

p.stdin.close();
p.wait();

print 'Video captured to:' + video_file
