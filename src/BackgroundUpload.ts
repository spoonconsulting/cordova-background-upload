declare var FileTransferManager: any;
declare var cordova: any;


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
          var directoryPath = cordova.file.cacheDirectory;
          
          //write the file object to disk
          //and use its path to upload natively
          window.resolveLocalFileSystemURL(directoryPath, function (dir) {
            ( < DirectoryEntry > dir).getFile(fileObject.name, {
              create: true
            }, function (tempFile) {
              tempFile.createWriter(function (fileWriter) {

                fileWriter.onwriteend = function (e) {
                  payload.filePath = directoryPath + fileObject.name;
                  
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
                  return errorCb("error writing file to disk for upload: " + ex);
                };

                fileWriter.write(fileObject);

              }, function (e) {
                return errorCb("error writing file to disk for upload: " + e);
              });
            });
          });

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