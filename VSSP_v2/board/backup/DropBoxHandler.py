# Include the Dropbox SDK
import dropbox
import sys,os,json;
from pprint import pprint;
import subprocess;

if len(sys.argv) <= 6:
    print 'Failed as the data file where drop specific parameters found not given. Terminating the execution.';
    sys.exit(1);

password = sys.argv[1].strip();
auth_handler = sys.argv[3].strip();
camera_name = sys.argv[4].strip();
file_list_to_sync = sys.argv[5].strip();
tmp_folder = sys.argv[6].strip();
data_file = sys.argv[2].strip();

if len(password) <= 0 or len(auth_handler) <= 0 or len(camera_name) <= 0 or len(file_list_to_sync) <= 0 or len(tmp_folder) <= 0 or len(data_file) <= 0:
	print 'Mandatory arguments are not given. Terminating the execution'
	sys.exit(1);

# Get your app key and secret from the Dropbox developer website
print 'Loading the data from file:' + str(data_file);

if not os.path.exists(data_file):
    print 'File:' + str(data_file) + ' doesnt exists.  Terminating the execution.'
    sys.exit(1);

with open(data_file) as json_data:
    data = json.load(json_data);
    json_data.close();
    #pprint(data);

if not 'dropbox' in data:
    print 'Failed to get the drop box configuration from the given file. Terminating the execution';
    sys.exit(1);

with open(file_list_to_sync) as json_data:
    data_object_to_sync = json.load(json_data);
    json_data.close();

if not 'file_list' in data_object_to_sync:
	print 'File to sync is not configured properly. Terminating the execution'
	sys.exit(1);


app_key="" 
app_secret=""
username=""
app_secret=""
  
drop_box_data = data['dropbox'];
if (not 'app_key' in drop_box_data or not 'app_secret' in drop_box_data or not 'username' in drop_box_data):
    print 'app_key/app_secret/uesrname/password might have not defined in the drop box configuration. Terminating the execution'
    sys.exit(1);

app_key=drop_box_data['app_key'].strip();
app_secret=drop_box_data['app_secret'].strip();
username=drop_box_data['username'].strip();
files_to_sync=data_object_to_sync['file_list']
#password=drop_box_data['password']

if len(files_to_sync) <= 0:
	print 'No files are given in the sync list. Terminating the execution'
	sys.exit(1);

print 'List of files to sync';
pprint(files_to_sync);

media_folder = 'Videos/' + camera_name;  
print 'User:' + username;
print 'Password:' + password;
print 'app_key:' + app_key;
print 'app_secret:' + app_secret;

flow = dropbox.client.DropboxOAuth2FlowNoRedirect(app_key, app_secret)

# Have the user sign in and authorize this token
authorize_url = flow.start()

print 'Url:' + authorize_url
out_file = tmp_folder + '/auth_credentials.json'
print 'Launching the application to get auth token:' + auth_handler;
data_to_auth_handler = auth_handler + ' --url="' + authorize_url + '" --user=' + username + ' --password=' + password + ' --output_file=' + out_file; 
exitCode = subprocess.call(['casperjs ' +  data_to_auth_handler], shell=True);
print 'auth handler exit code:' + str(exitCode);
if exitCode != 0:
	print 'Failed to get the authentication code. Pls. check the credentials. Terminating the execution'
	sys.exit(1);

with open(out_file) as json_data:
    auth_data = json.load(json_data);
    json_data.close();
    pprint(auth_data);

if not 'auth_code' in auth_data:
	print 'auth_code is not found in the output file of auth_handler. Terminating the execution'
	sys.exit(1);
	
code = auth_data['auth_code'].strip();
# This will fail if the user enters an invalid authorization code
access_token, user_id = flow.finish(code)

client = dropbox.client.DropboxClient(access_token)
print 'Account Details: ';
pprint(client.account_info())

try:
	media_folder_metadata = client.metadata(media_folder);
	print 'List of media folder content..'
	pprint(media_folder_metadata);
	if 'contents' in media_folder_metadata:
		contents = media_folder_metadata['contents'];
		for item in contents:
			if not item['is_dir']:
				file = item['path'];
				print 'Deleting file:' + str(file);
				metadata = client.file_delete(file);
				print 'File:' + str(file) + ' has been deleted'
			else:
				print 'Item:' + item['path'] + ' is a directory. Ignoring it from deletion'
except err as dropbox.rest.ErrorResponse:
	pprint(err)

#print 'metadata: ', folder_metadata

#f, metadata = client.get_file_and_metadata('/magnum-opus.txt')
#out = open('magnum-opus.txt', 'wb')
#out.write(f.read())
#out.close()
#print metadata

#create folder
try:
	metadata = client.file_create_folder(media_folder);
	print metadata
except:
	print sys.exc_info()[0]

for file in files_to_sync:
	f = open(file, 'rb')
	name = os.path.basename(file)
	print 'Uploading to:' + str(media_folder + '/' + str(name));
	response = client.put_file(media_folder + '/' + name, f)
	print 'uploaded: ', response

print 'All files given are uploaded'

