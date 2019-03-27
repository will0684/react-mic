import AudioContext from './AudioContext';

let analyser;
let audioCtx;
let mediaRecorder;
let safariMediaRecorder = require('audio-recorder-polyfill');
let chunks = [];
let startTime;
let stream;
let mediaOptions;
let blobObject;
let onStartCallback;
let onStopCallback;
let onSaveCallback;
let onDataCallback;

const constraints = { audio: true, video: false }; // constraints - only audio needed

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

export class MicrophoneRecorder {
  constructor(onStart, onStop, onSave, onData, options) {
    onStartCallback= onStart;
    onStopCallback= onStop;
    onSaveCallback = onSave;
    onDataCallback = onData;
    mediaOptions= options;
  }

  startRecording=() => {

    startTime = Date.now();

    if(mediaRecorder) {

      if(audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if(mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        return;
      }

      if(audioCtx && mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start(10);
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        if(onStartCallback) { onStartCallback() };
      }
    } else {
      if (navigator.mediaDevices) {
        console.log('getUserMedia supported.');

        navigator.mediaDevices.getUserMedia(constraints)
          .then((str) => {
            stream = str;

            console.log('Passed mediaOptions.mimeType: ' + mediaOptions.mimeType);

            if(!!window.MediaRecorder && window.MediaRecorder.isTypeSupported(mediaOptions.mimeType)) {
              console.log('Creating Standard MediaRecorder with Passed MediaOptions from Component Props')
              mediaRecorder = new window.MediaRecorder(str, mediaOptions);
              mediaRecorder.ondataavailable = (event) => {
                chunks.push(event.data);
                if(onDataCallback) {
                  onDataCallback(event.data);
                }
              }
              mediaRecorder.onstop = this.onStop;

            } else if (!!window.MediaRecorder) {
              console.log('Creating Standard MediaRecorder, No Passed MediaOptions')
              mediaRecorder = new safariMediaRecorder(str);
              console.log(mediaRecorder);
              mediaRecorder.ondataavailable = (event) => {
                chunks.push(event.data);
                if(onDataCallback) {
                  onDataCallback(event.data);
                }
              }
              mediaRecorder.onstop = this.onStop;

            } else {
              console.log('Creating Polyfill MediaRecorder for Safari, No Passed MediaOptions')
              mediaRecorder = new safariMediaRecorder(str);
              console.log(mediaRecorder);
              mediaRecorder.addEventListener('dataavailable', (event) => {
                chunks.push(event.data);
                if(onDataCallback) {
                  onDataCallback(event.data);
                }
              })

              mediaRecorder.addEventListener('stop', (event) => {
                this.onStop(event);
              })

            }

            if(onStartCallback) { onStartCallback() };

            audioCtx = AudioContext.getAudioContext();
            audioCtx.resume().then(() => {

              analyser = AudioContext.getAnalyser();
              mediaRecorder.start(10);
              const sourceNode = audioCtx.createMediaStreamSource(stream);
              sourceNode.connect(analyser);
            });

          });

      } else {
        alert('Your browser does not support audio recording');
      }
    }

  }

  stopRecording() {
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();

      stream.getAudioTracks().forEach((track) => {
        track.stop()
      })
      mediaRecorder = null
      AudioContext.resetAnalyser();
    }
  }

  onStop(evt) {
    console.log(chunks);
    const blob = new Blob(chunks, { 'type' : mediaOptions.mimeType });
    chunks = [];

    const blobObject =  {
      blob      : blob,
      startTime : startTime,
      stopTime  : Date.now(),
      options   : mediaOptions,
      blobURL   : window.URL.createObjectURL(blob)
    }

    if(onStopCallback) { onStopCallback(blobObject) };
    if(onSaveCallback) { onSaveCallback(blobObject) };
  }

}
