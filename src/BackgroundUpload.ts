declare var FileTransferManager: any;
declare var cordova: any;

//https://github.com/TypeStrong/ts-loader#loading-other-resources-and-code-splitting
declare var require: { <
  T > (path: string): T;
  (paths: string[], callback: (...modules: any[]) => void): void;
  ensure: (paths: string[], callback: (require: < T > (path: string) => T) => void) => void;
};


var request: any = require('superagent/lib/client');

export class BackgroundUpload {

  constructor() {}

  upload(payload, successCb, errorCb, progressCb) {

    if (!payload) {
      return errorCb("upload settings object is missing or invalid argument");
    }

    if (!payload.serverUrl) {
      return errorCb("server url is required");
    }

    if (payload.serverUrl.trim() == '') {
      return errorCb("invalid server url");
    }

    var w: any = window;
    if (w.cordova) {
      //on mobile device

      if (typeof FileTransferManager == 'undefined') {
        return errorCb('cordova-plugin-background-upload not found..');
      }

      var fileObject = payload.file;
      var directoryPath = cordova.file.cacheDirectory;
      console.log(directoryPath);
      if (!directoryPath){
        return errorCb('cordova-plugin-file not found..install it via: cordova plugin add cordova-plugin-file --save');
      }
      window.resolveLocalFileSystemURL(directoryPath, function (dir) {
        ( < DirectoryEntry > dir).getFile(fileObject.name, {
          create: true
        }, function (tempFile) {
          tempFile.createWriter(function (fileWriter) {
            fileWriter.write(fileObject);
            payload.filePath = directoryPath + fileObject.name;

            if (!payload.filePath) {
              return errorCb("filePath parameter is required");
            }

            if (payload.filePath == "") {
              return errorCb("invalid filePath");
            }

            //use cordova plugin https://github.com/spoonconsulting/cordova-plugin-background-upload
            return new FileTransferManager().upload(payload).then(successCb, errorCb, progressCb);

          }, function (e) {
            errorCb("error writing file to disk for upload: " + e);
          });
        });
      });


    }

    if (!payload.file) {
      return errorCb("file parameter is required");
    }

    //use super agent
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
          console.log(res.req);
          successCb(res);
        }
      });
  }





}