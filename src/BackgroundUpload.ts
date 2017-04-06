declare var FileTransferManager: any;

//https://github.com/TypeStrong/ts-loader#loading-other-resources-and-code-splitting
declare var require: { <
  T > (path: string): T;
  (paths: string[], callback: (...modules: any[]) => void): void;
  ensure: (paths: string[], callback: (require: < T > (path: string) => T) => void) => void;
};


var request: any = require('superagent/lib/client');

export class BackgroundUpload {

  constructor() {
  }

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


    var fileToUpload = payload.file;
    var w: any = window;
    if (w.cordova) {
      //on mobile device
      
      if (!payload.filePath) {
          return errorCb("filePath parameter is required");
        }

        if (payload.filePath == "") {
          return errorCb("invalid filePath");
        }

      if (typeof FileTransferManager != undefined) {
        //use cordova plugin https://github.com/spoonconsulting/cordova-plugin-background-upload
        return new FileTransferManager().upload(payload).then(successCb, errorCb, progressCb);

      } else {
        console.log('cordova-plugin-background-upload not found..falling back to superagent(background uploads will not be available)');
        //set the fileToUpload to the filePath (superagent can attach files using their path too)
        fileToUpload = payload.filePath;
      }


    }

    if (!fileToUpload) {
      return errorCb("file parameter is required");
    }

    //use super agent
    request.post(payload.serverUrl)
      .set(payload.headers != null ? payload.headers : {})
      .field(payload.parameters != null ? payload.parameters : {})
      .on('progress', function (e) {
        if (e.percent != null && e.percent != undefined) {
          progressCb(e.percent);
        }
      })
      .attach('file', fileToUpload)
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