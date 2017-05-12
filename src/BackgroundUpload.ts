declare var FileTransferManager: any, cordova: any;


var request: any = require('superagent/lib/client');
var Throttle = require('superagent-throttle/dist/browser')

export class BackgroundUpload {

  constructor() {}
  private nativeUploader = null;
  private _handlers: any = [];
  private throttleConfig; //use to configure superagent concurrent uploads

  public init(options) {
    this._handlers = {
      'progress': [],
      'success': [],
      'error': []
    };

    let self = this;
    if (( < any > window).cordova) {
      //on mobile device
      this.nativeUploader = FileTransferManager.init(options);
      this.nativeUploader.on('success', function (upload) {
        self.emit('success', upload);
      });

      this.nativeUploader.on('progress', function (upload) {
        self.emit('progress', upload);
      });

      this.nativeUploader.on('error', function (uploadException) {
        self.emit('error', uploadException);
      });
    } else {

      this.throttleConfig = new Throttle({
        concurrent: 1 // how many requests can be sent concurrently
      })

    }

    return this;

  }

  public upload(payload) {

    try {
      let self = this;
      if (!payload) {
        self.emit("error", {
          error: "upload settings object is missing or invalid argument"
        });
         return;
      }

      if (!payload.serverUrl) {
        self.emit("error", {
          error: "server url is required"
        });
        return;
      }

      if (!payload.headers) {
        payload.headers = {};
      }

      if (payload.serverUrl.trim() == '') {
        self.emit("error", {
          error: "invalid server url"
        });
      }

      if (( < any > window).cordova) {
        //on mobile device

        var fileObject = payload.file;
        if (!fileObject) {
          //check if filePath is available
          if (!payload.filePath) {
            self.emit("error", {
              error: "filePath parameter is required"
            });
          }

          if (payload.filePath == "") {
            self.emit("error", {
              error: "invalid filePath"
            });
          }

          if (typeof FileTransferManager == 'undefined') {
            self.emit("error", {
              error: 'cordova-plugin-background-upload not found..'
            });
          }

          //upload natively
          this.nativeUploader.startUpload(payload);

        } else {

          //file object available, check if upload plugin is installed
          if (typeof FileTransferManager == 'undefined') {
            console.log('cordova-plugin-background-upload not found..fallback to superagent..uploads will happen only in foreground');
            return this.uploadViaSuperAgent(payload);
          }

          //file object and upload plugin are available
          //now check if file plugin has been installed
          if (!cordova.file) {
            self.emit("error", {
              error: 'cordova-plugin-file not found..install it via: cordova plugin add cordova-plugin-file --save'
            });
          }

          if (cordova.platformId.toLowerCase() == "android") {

            //reqquest for permission for file system on android
            if (!cordova.plugins.permissions) {
              self.emit("error", {
                error: 'cordova-plugin-android-permissions not found..install it via: cordova plugin add cordova-plugin-android-permissions --save'
              });
            }
            var permissions = cordova.plugins.permissions;
            
            permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, function (status) {
              if (!status.hasPermission) {
                self.emit("error", {
                  error: 'file system permission denied'
                });
              } else {
                self.uploadNatively(payload, fileObject);
              }
            }, function () {
              self.emit("error", {
                error: 'file system permission denied'
              });
            });

          } else {
            //ios
            this.uploadNatively(payload, fileObject);
          }
        }



      } else {
        //on web
        if (!payload.file) {
          self.emit("error", "file parameter is required");
          return;
        }

        //use super agent
        this.uploadViaSuperAgent(payload);
      }

    } catch (error) {
      this.emit('error', {
        error: error
      });

    }

  }

  private uploadNatively(payload, fileObject) {
    //externalCacheDirectory is only for android, fallback to cacheDirectory on iOS
    var directoryPath = cordova.file.externalCacheDirectory || cordova.file.cacheDirectory;
    let self = this;
    //write the file object to disk
    //and use its path to upload natively
    window.resolveLocalFileSystemURL(directoryPath, function (dir) {
      var fileName = Math.floor(Date.now()) + "_" + fileObject.name.replace(/ /g, '_').replace(/%20/g, '');
      ( < DirectoryEntry > dir).getFile(fileName, {
        create: true
      }, function (tempFile) {

        tempFile.createWriter(function (fileWriter) {
          var hasError = false;
          fileWriter.onwriteend = function (e) {
            if (hasError) {
              return;
            }

            payload.filePath = tempFile.nativeURL.replace('file://', ''); //directoryPath + fileName;

            //remove the blob from the payload
            delete payload.file;
            self.nativeUploader.startUpload(payload);
          };

          fileWriter.onerror = function (ex) {
            hasError = true;
            console.error(ex)
            self.emit("error", {
              error: "error writing file to disk"
            });
          };

          fileWriter.write(fileObject);

        }, function (e) {
          console.error(e);
          self.emit("error", {
            error: "error writing file to disk for upload"
          });
        });
      });
    });
  }


  private uploadViaSuperAgent(payload) {
    let self = this;
    request.post(payload.serverUrl)
      .use(this.throttleConfig.plugin())
      .set(payload.headers != null ? payload.headers : {})
      .field(payload.parameters != null ? payload.parameters : {})
      .on('progress', function (e) {
        if (e.percent != null && e.percent != undefined && e.percent >= 0) {
          self.emit('progress', {
            id: payload.id,
            state: 'UPLOADING',
            progress: Math.round(e.percent * 10) / 10
          });
        }
      })
      .attach('file', payload.file)
      .end(function (err, res) {
        if (err != null) {
          self.emit('error', {
            id: payload.id,
            state: 'FAILED',
            error: err
          });
        } else {
          self.emit('success', {
            id: payload.id,
            state: 'UPLOADED',
            serverResponse: JSON.stringify(res.body)
          });
        }
      });
  }

  /**
   * Listen for an event.
   *
   * Any event is supported, but the following are built-in:
   *
   *   - registration
   *   - notification
   *   - error
   *
   * @param {String} eventName to subscribe to.
   * @param {Function} callback triggered on the event.
   */

  private on(eventName, callback) {
    if (!this._handlers.hasOwnProperty(eventName)) {
      this._handlers[eventName] = [];
    }
    this._handlers[eventName].push(callback);
  };

  /**
   * Remove event listener.
   *
   * @param {String} eventName to match subscription.
   * @param {Function} handle function associated with event.
   */

  private off(eventName, handle) {
    if (this._handlers.hasOwnProperty(eventName)) {
      var handleIndex = this._handlers[eventName].indexOf(handle);
      if (handleIndex >= 0) {
        this._handlers[eventName].splice(handleIndex, 1);
      }
    }
  };

  /**
   * Emit an event.
   *
   * This is intended for internal use only.
   *
   * @param {String} eventName is the event to trigger.
   * @param {*} all arguments are passed to the event listeners.
   *
   * @return {Boolean} is true when the event is triggered otherwise false.
   */

  private emit(eventName, res) {
    var args = Array.prototype.slice.call(arguments);
    var eventName = args.shift();

    if (!this._handlers.hasOwnProperty(eventName)) {
      return false;
    }

    for (var i = 0, length = this._handlers[eventName].length; i < length; i++) {
      var callback = this._handlers[eventName][i];
      if (typeof callback === 'function') {
        callback.apply(undefined, args);
      } else {
        console.log('event handler: ' + eventName + ' must be a function');
      }
    }

    return true;
  };






}