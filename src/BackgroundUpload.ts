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


    if (payload == null) {
      return errorCb("upload settings object is missing or invalid argument");
      
    }

    if (payload.serverUrl == null) {
     return errorCb("server url is required");
      
    }

    if (payload.serverUrl.trim() == '') {
      return errorCb("invalid server url");
      
    }

    if (payload.file == null || payload.file == undefined) {
     return errorCb("file parameter is required");
    }


    var w: any = window;
    if (w.cordova) {
      //on mobile device
      //use cordova plugin https://github.com/spoonconsulting/cordova-plugin-background-upload

      if (typeof FileTransferManager == undefined) {
        throw new Error('cordova-plugin-background-upload not found..')
      }

      new FileTransferManager().upload(payload)
      .then(successCb, errorCb, progressCb);

    } else {
      //use super agent
      
      console.log(request);
      request.post(payload.serverUrl)
        .set(payload.headers != null ? payload.headers : {})
        .field(payload.parameters != null ? payload.parameters : {})
        .on('progress', function (e) {

          if (e.percent != null && e.percent != undefined) {
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

}