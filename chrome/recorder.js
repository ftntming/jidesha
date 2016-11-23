
var RECORDER = false;

function startRecordingTab() {

    var sources = ['tab', 'audio'];
    try {
        chrome.desktopCapture.chooseDesktopMedia(sources, onAccessApproved);
    } catch (e) {
        gotError(e);
    }

    var onAccessApproved = function(chromeMediaSourceId) {
        var constraints = {
            audio: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: chromeMediaSourceId
                },
                optional: []
            },
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: chromeMediaSourceId,
                    maxWidth: 1280,
                    maxHeight: 720,
                    maxFrameRate: 24
                },
                optional: []
            }
        };

        navigator.webkitGetUserMedia(constraints, gotStream, gotError);
    };

    var gotStream = function(stream) {
            var options = {
                type: 'video',
                disableLogs: false,
                recorderType: MediaStreamRecorder // StereoAudioRecorder
            };
            RECORDER = RecordRTC(stream, options);

            RECORDER.stream.onended = function() {
                if (RECORDER && RECORDER.stream) {
                    RECORDER.stream.onended = function() {};
                }

                stopScreenRecording();
            };

            RECORDER.stream.getVideoTracks()[0].onended = function() {
                if (RECORDER && RECORDER.stream && RECORDER.onended) {
                    RECORDER.stream.onended();
                }
            };

        }
    };

    var gotError = function(e) {
        console.log("Got error!: " + e);
    };
}

function stopScreenRecording() {
    RECORDER.stopRecording(function() {
        invokeSaveAsDialog(RECORDER.blob, 'UbityMeet-' + (new Date).toISOString().replace(/:|\./g, '-') + '.webm');

        setTimeout(function() {
            chrome.runtime.reload();
        }, 1000);

    });
}
