function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import AudioContext from './AudioContext';

var analyser = void 0;
var audioCtx = void 0;
var mediaRecorder = void 0;
var safariMediaRecorder = require('audio-recorder-polyfill');
var chunks = [];
var startTime = void 0;
var stream = void 0;
var mediaOptions = void 0;
var blobObject = void 0;
var onStartCallback = void 0;
var onStopCallback = void 0;
var onSaveCallback = void 0;
var onDataCallback = void 0;

var constraints = { audio: true, video: false }; // constraints - only audio needed

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

export var MicrophoneRecorder = function () {
  function MicrophoneRecorder(onStart, onStop, onSave, onData, options) {
    var _this = this;

    _classCallCheck(this, MicrophoneRecorder);

    this.startRecording = function () {

      startTime = Date.now();

      if (mediaRecorder) {

        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        if (mediaRecorder && mediaRecorder.state === 'paused') {
          mediaRecorder.resume();
          return;
        }

        if (audioCtx && mediaRecorder && mediaRecorder.state === 'inactive') {
          mediaRecorder.start(10);
          var source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          if (onStartCallback) {
            onStartCallback();
          };
        }
      } else {
        if (navigator.mediaDevices) {
          console.log('getUserMedia supported.');

          navigator.mediaDevices.getUserMedia(constraints).then(function (str) {
            stream = str;

            console.log('Passed mediaOptions.mimeType: ' + mediaOptions.mimeType);

            if (!!window.MediaRecorder && window.MediaRecorder.isTypeSupported(mediaOptions.mimeType)) {
              console.log('Creating Standard MediaRecorder with Passed MediaOptions from Component Props');
              mediaRecorder = new window.MediaRecorder(str, mediaOptions);
              mediaRecorder.ondataavailable = function (event) {
                chunks.push(event.data);
                if (onDataCallback) {
                  onDataCallback(event.data);
                }
              };
              mediaRecorder.onstop = _this.onStop;
            } else if (!!window.MediaRecorder) {
              console.log('Creating Standard MediaRecorder, No Passed MediaOptions');
              mediaRecorder = new window.MediaRecorder(str);
              mediaRecorder.ondataavailable = function (event) {
                chunks.push(event.data);
                if (onDataCallback) {
                  onDataCallback(event.data);
                }
              };
              mediaRecorder.onstop = _this.onStop;
            } else {
              console.log('Creating Polyfill MediaRecorder for Safari, No Passed MediaOptions');
              mediaRecorder = new safariMediaRecorder(str);
              mediaRecorder.addEventListener('dataavailable', function (event) {
                chunks.push(event.data);
                if (onDataCallback) {
                  onDataCallback(event.data);
                }
              });

              mediaRecorder.addEventListener('stop', function (event) {
                _this.onStop(event);
              });
            }

            if (onStartCallback) {
              onStartCallback();
            };

            audioCtx = AudioContext.getAudioContext();
            audioCtx.resume().then(function () {

              analyser = AudioContext.getAnalyser();
              mediaRecorder.start(10);
              var sourceNode = audioCtx.createMediaStreamSource(stream);
              sourceNode.connect(analyser);
            });
          });
        } else {
          alert('Your browser does not support audio recording');
        }
      }
    };

    onStartCallback = onStart;
    onStopCallback = onStop;
    onSaveCallback = onSave;
    onDataCallback = onData;
    mediaOptions = options;
  }

  MicrophoneRecorder.prototype.stopRecording = function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();

      stream.getAudioTracks().forEach(function (track) {
        track.stop();
      });
      mediaRecorder = null;
      AudioContext.resetAnalyser();
    }
  };

  MicrophoneRecorder.prototype.onStop = function onStop(evt) {
    console.log(chunks);
    var blob = new Blob(chunks, { 'type': mediaOptions.mimeType });
    chunks = [];

    var blobObject = {
      blob: blob,
      startTime: startTime,
      stopTime: Date.now(),
      options: mediaOptions,
      blobURL: window.URL.createObjectURL(blob)
    };

    if (onStopCallback) {
      onStopCallback(blobObject);
    };
    if (onSaveCallback) {
      onSaveCallback(blobObject);
    };
  };

  return MicrophoneRecorder;
}();