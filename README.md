
## Background Upload Plugin for Cordova

This plugin provides a file upload functionality via javascript without necessarily using the browser platform of cordova. On the web it will use [SuperAgent](https://github.com/visionmedia/superagent) to post the files. Since it is done via Ajax, make sure your server supports CORS ([cross origin requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS)).

The following browsers are supported:

- Latest Firefox, Chrome, Safari
- IE10 through latest

Note: Background uploads are not supported on the web

 When in a mobile environment, it will rely on the [cordova-plugin-background-upload](https://github.com/spoonconsulting/cordova-plugin-background-upload.git) to allow for background uploads. If the plugin is not installed,it will fallback to superagent upload.


**Installation**

```
npm install --save cordova-background-upload
```
For mobile uploads:
```
cordova plugin add cordova-plugin-file --save
cordova plugin add cordova-plugin-background-upload --save
```
For android, you need to add the permission library also:
```
cordova plugin add cordova-plugin-android-permissions --save
```

**Sample usage**

```javascript
 import { BackgroundUpload } from 'cordova-background-upload';
 var payload = {
     "file": fileObject, //the file object obtained from an input type='file'
     "serverUrl": "http://requestb.in/14cizzj1",
     "headers": {
         "api_key": "asdasdwere123sad"
     },
     "parameters": {
         "signature": "mysign",
         "timestamp": 112321321
     }
 };
 var uploader = new BackgroundUpload();
 uploader.upload(payload,
 function(serverResponse) {
     console.log('Success: ' + serverResponse);
 }, function(err) {
     console.log('Error: ' + err);
 }, function(progress) {
     console.log('upload progress: ' + progress);
 });

```

**Configuration** 
 * filePath: the absolute path for the file to upload (applicable only on mobile platforms), if you are using an html input type file, write the file to disk, then use its path
 * file:  the file object obtained from an input type='file' (used only on browser)
 * serverUrl: remote server url
 * headers: custom http headers
 * parameters: custom parameters for multipart data


## Credits
cordova-background-upload is brought to you by [Spoon Consulting](http://www.spoonconsulting.com/).