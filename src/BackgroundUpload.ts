declare var FileTransferManager: any, cordova: any;


var request: any = require('superagent/lib/client');

export class BackgroundUpload {

  constructor() {}

  upload(payload, successCb, errorCb, progressCb) {

    try {


      if (!payload) {
        return errorCb("upload settings object is missing or invalid argument");
      }

      if (!payload.serverUrl) {
        return errorCb("server url is required");
      }

      if (!payload.headers) {
        payload.headers = {};
      }

      if (payload.serverUrl.trim() == '') {
        return errorCb("invalid server url");
      }

      if (( < any > window).cordova) {
        //on mobile device

        var fileObject = payload.file;
        if (!fileObject) {
          //check if filePath is available
          if (!payload.filePath) {
            return errorCb("filePath parameter is required");
          }

          if (payload.filePath == "") {
            return errorCb("invalid filePath");
          }

          if (typeof FileTransferManager == 'undefined') {
            return errorCb('cordova-plugin-background-upload not found..');
          }

          //upload natively
          return new FileTransferManager().upload(payload).then(successCb, errorCb, progressCb);

        } else {

          //file object available, check if upload plugin is installed
          if (typeof FileTransferManager == 'undefined') {
            console.log('cordova-plugin-background-upload not found..fallback to superagent..uploads will happen only in foreground');
            return this.uploadViaSuperAgent(payload, successCb, errorCb, progressCb);
          }

          //file object and upload plugin are available
          //now check if file plugin has been installed
          if (!cordova.file) {
            return errorCb('cordova-plugin-file not found..install it via: cordova plugin add cordova-plugin-file --save');
          }

          if (cordova.platformId.toLowerCase() == "android") {

            //reqquest for permission for file system on android
            if (!cordova.plugins.permissions) {
              return errorCb('cordova-plugin-android-permissions not found..install it via: cordova plugin add cordova-plugin-android-permissions --save');
            }
            var permissions = cordova.plugins.permissions;
            var self = this;
            permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, function (status) {
              if (!status.hasPermission) {
                return errorCb('file system permission denied');
              } else {
                self.uploadNatively(payload, fileObject, successCb, errorCb, progressCb);
              }
            }, function () {
              return errorCb('file system permission denied');
            });

          } else {
            //ios
            this.uploadNatively(payload, fileObject, successCb, errorCb, progressCb);
          }
        }



      } else {
        //on web
        if (!payload.file) {
          return errorCb("file parameter is required");
        }

        //use super agent
        this.uploadViaSuperAgent(payload, successCb, errorCb, progressCb);
      }

    } catch (error) {

      errorCb(error);
    }

  }

  private uploadNatively(payload, fileObject, successCb, errorCb, progressCb) {
    //externalCacheDirectory is only for android, fallback to cacheDirectory on iOS
    var directoryPath = cordova.file.externalCacheDirectory || cordova.file.cacheDirectory;
    //write the file object to disk
    //and use its path to upload natively
    window.resolveLocalFileSystemURL(directoryPath, function (dir) {
      var fileName = Math.floor(Date.now()) + "_" + fileObject.name.replace(/ /g, '_').replace(/%20/g, '');
      ( < DirectoryEntry > dir).getFile(fileName, {
        create: true
      }, function (tempFile) {
        console.log(tempFile);
        tempFile.createWriter(function (fileWriter) {
          var hasError = false;
          fileWriter.onwriteend = function (e) {
            if (hasError) {
              return;
            }

            payload.filePath = tempFile.nativeURL.replace('file://', ''); //directoryPath + fileName;

            //remove the blob from the payload
            delete payload.file;
            return new FileTransferManager().upload(payload).then(function (response) {
              //file uploaded, delete the temporary file
              tempFile.remove(function () {}, function (excep) {
                console.error('error cleaning up temp file: ' + excep);
              });
              successCb(response);
            }, errorCb, progressCb);
          };

          fileWriter.onerror = function (ex) {
            hasError = true;
            console.error(ex)

            return errorCb("error writing file to disk");
          };

          fileWriter.write(fileObject);

        }, function (e) {
          console.error(e);
          return errorCb("error writing file to disk for upload");
        });
      });
    });
  }

  private uploadViaSuperAgent(payload, successCb, errorCb, progressCb) {
    request.post(payload.serverUrl)
      .set(payload.headers != null ? payload.headers : {})
      .field(payload.parameters != null ? payload.parameters : {})
      .on('progress', function (e) {
        if (e.percent != null && e.percent != undefined && e.percent >= 0) {
          progressCb(e.percent);
        }
      })
      .attach('file', payload.file)
      .end(function (err, res) {
        if (err != null) {
          errorCb(err);
        } else {
          successCb(JSON.stringify(res.body));
        }
      });
  }




}