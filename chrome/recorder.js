
/**
* Restricts the recording feature to URLs matching this regexp
*/
var URL_REGEXP = /meet.*\.ubity\.com/;


/**
* Update/set listeners when the extension is installed or upgraded ...
*/
chrome.runtime.onInstalled.addListener(function() {
  // Replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // With a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // That fires when a page's URL contains a 'g' ...
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlMatches: URL_REGEXP.toString() },
          })
        ],
        // And shows the extension's page action.
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});

/**
* Convert milliseconds to human readable format
*/
function convertTime(miliseconds) {
    var totalSeconds = Math.floor(miliseconds / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds - minutes * 60;

    minutes += '';
    seconds += '';

    if (minutes.length === 1) {
        // minutes = '0' + minutes;
    }

    if (seconds.length === 1) {
        seconds = '0' + seconds;
    }

    return minutes + ':' + seconds;
}

/**
* To communicate with page_action popup
*/
chrome.runtime.onMessage.addListener(function (msg, sender, response) {
    //console.info("message received", msg, sender, response);
    if (msg.from === 'popup') {
        if (msg.subject === 'start-recording') {
            Recorder.start();
        } else if (msg.subject === 'stop-recording') {
            Recorder.stop();
        } else if (msg.subject === 'is-recording') {
            response({recording: Recorder.isRecording,
                duration: (Recorder.isRecording ?
                    convertTime(Date.now() - Recorder.initialTime) : 0)
            });
        }
    }
});


/**
* Browser tab recording that runs top over WebRTC getUserMedia API.
*/
var Recorder = {

    mediaRecorder: null,
    isRecording: false,
    initialTime: 0,

    start: function() {
        console.info("Will start recording");

        //Prompt user to select a browser tab.
        chrome.desktopCapture.chooseDesktopMedia(['tab', 'audio'], getStream);

        var me = Recorder;
        var mediaStream;
        var continueAfterStop = false;
        var recordedChunks = [];
        var currentTabId;
        var timer;
        var meetRoomName = "";
        var autoSaveInterval;




        //- When browser tab is selected
        function getStream(streamId) {
            if (typeof streamId === 'object' && streamId.streamId) {
                streamId = streamId.streamId;
            }
            if (!streamId || !streamId.toString().length) {
                console.error("empty streamId", streamId);
                return;
            }

            var constraints = {
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamId
                    },
                    optional: []
                },
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamId,
                        maxFrameRate: 24,
                        maxWidth: 1280/2,
                        maxHeight: 720/2
                    },
                    optional: []
                }
            };

            //Checking if the selected tab is allowed to record
            chrome.tabs.getSelected(function(tab){
                if (tab.url.match(URL_REGEXP)) {
                    meetRoomName = tab.url.replace(/.*\//, '');
                    currentTabId = tab.id;

                    if (typeof navigator.getUserMedia === 'undefined' &&
                        typeof navigator.webkitGetUserMedia !== 'undefined') {
                        navigator.webkitGetUserMedia(
                            constraints, gotStream, getUserMediaError);
                    } else {
                        navigator.getUserMedia(
                            constraints, gotStream, getUserMediaError);
                    }

                } else {
                    alert(chrome.i18n.getMessage("pleaseSelectFromList"));
                    Recorder.start();
                    return;
                }
            });


        }

        //-
        function gotStream(stream) {
            console.info("gotStream", stream);

            stream.getVideoTracks()[0].onended = onStreamStop;

            mediaStream = createMediaStream(stream);
            me.mediaRecorder = createMediaRecorder();

            me.isRecording = true;
            me.initialTime = Date.now();
            onRecording();
            watchTabUrl();

            alert(chrome.i18n.getMessage('nowRecording'));

            autoSaveInterval = setInterval(saveAndContinue, 600000);
        }

        //-
        function createMediaStream(stream){
            if (typeof MediaStream === 'undefined' &&
                typeof webkitMediaStream !== 'undefined') {
                return new webkitMediaStream(stream);
            } else {
                return new MediaStream(stream);
            }
        }

        //-
        function createMediaRecorder(){
            var mediaRecorder = new MediaRecorder(mediaStream);
            mediaRecorder.ondataavailable = onDataAvailable;
            mediaRecorder.onstop = onStop;
            mediaRecorder.start(1000);
            return mediaRecorder;
        }

        //-
        function saveAndContinue(){
            if (me.mediaRecorder.state !== 'recording') {
                clearInterval(autoSaveInterval);
                return;
            }
            continueAfterStop = true;
            me.mediaRecorder.stop();
        }

        //-
        function onStreamStop(){
            continueAfterStop = false;
            clearInterval(autoSaveInterval);
            onStop();
        }

        //-
        function onStop(){
            me.isRecording = continueAfterStop;
            //console.log("invoking save as, chunks = ", recordedChunks);
            //invoking save as...
            saveBlob();
            continueAfterStop = false;
        }

        //- Ask browser to save the current blub chunks
        function saveBlob(){
            var blob = new Blob(recordedChunks, {type: 'video/webm;'});
            recordedChunks = [];
            if (continueAfterStop){
                me.mediaRecorder = createMediaRecorder();
            }
            if (blob.size === 0) {
                console.error("blob.size=0");
                return;
            }
            var filename = generateFileName();
            var file = new File([blob], filename);
            var hyperlink = document.createElement('a');
            hyperlink.href = URL.createObjectURL(file);
            hyperlink.target = '_blank';
            hyperlink.download = filename;
            var evt = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            hyperlink.dispatchEvent(evt);
            URL.revokeObjectURL(hyperlink.href);
        }

        //-
        function generateFileName(){
            var zero = function(x){ return x < 10 ? '0'+x: ''+x; };
            var d = new Date();
            var date = d.getFullYear() + '-' +
                zero(d.getMonth()+1) + '-' +
                zero(d.getDate()) + '_' +
                zero(d.getHours()) + '-' +
                zero(d.getMinutes()) + '-' +
                zero(d.getSeconds());
            var filename = 'UbityMeet-' + meetRoomName + "-" + date + '.webm';
            return filename.replace(/[^0-9a-zA-Z-_\.]/g, '_');
        }

        //-
        function onDataAvailable(av){
            //console.log("dataAvailable", av);
            if (av.data && av.data.size > 0) {
                recordedChunks.push(av.data);
            }
        }

        //-
        function getUserMediaError(e){
            console.error(e);
        }

        //- Animate the page_action icon
        var imgIndex = 1;
        var direction = 1;
        function onRecording() {
            chrome.pageAction.setIcon({
                tabId: currentTabId,
                path: 'images/recordRTC-progress-' + imgIndex + '.png'
            });
            imgIndex += direction;

            if (imgIndex == 1) {
                direction = 1;
            }
            if (imgIndex == 5) {
                direction = -1;
            }

            var timeDifference = Date.now() - me.initialTime;
            if (!isNaN(timeDifference)) {
                chrome.pageAction.setTitle({
                    tabId: currentTabId,
                    title: chrome.i18n.getMessage("recordingDuration") +
                            ': ' + convertTime(timeDifference)
                });
            }

            if (me.isRecording) {
                setTimeout(onRecording, 800);
                return;
            }

            chrome.pageAction.setIcon({
                tabId: currentTabId,
                path: 'images/ubity-logo-16x16.png'
            });

        }

        //- Current tab url monitor
        function watchTabUrl(){
            chrome.tabs.get(currentTabId, function(tab) {
                if (! tab.url.match(URL_REGEXP)) {
                    Recorder.stop();
                    return;
                }
                setTimeout(watchTabUrl, 5000);
            });
        }
    },


    stop: function(){
        console.log("stopping");
        Recorder.mediaRecorder.stop();
    }
};
