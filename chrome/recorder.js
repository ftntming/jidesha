
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

    start: function(hd) {
        console.info("Will start recording");

        //Prompt user to select a browser tab.
        chrome.desktopCapture.chooseDesktopMedia(['tab', 'audio'], getStream);

        var me = Recorder;
        var continueAfterStop = false;
        //var recordedChunks = [];
        var currentTabId;
        var meetRoomName = "";
        var autoSaveInterval;
        var mediaStream;

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
            mediaRecorder.start(2000);
            return mediaRecorder;
        }

        //-
        function onStreamStop(){
            onStop();
        }

        //-
        function onStop(){
            me.isRecording = false;
            //console.log("invoking save as, chunks = ", recordedChunks);
            //invoking save as...
            saveBlob();
            mediaStream.getVideoTracks()[0].onended = function(){};
            mediaStream.getVideoTracks()[0].stop();
            mediaStream.getAudioTracks()[0].stop();
        }

        //- Ask browser to save the current blub chunks
        function saveBlob(){
            var filename = 'UbityMeet-' + meetRoomName + "-" +
                getFormatedDate() + '.webm';
            //saveFileAs(blob, filename);
            //Storage.clearStorage();
            Storage.saveStorageToFile(filename);
        }

        //-
        function onDataAvailable(av){
            //console.log("dataAvailable", av);
            if (av.data && av.data.size > 0) {
                //recordedChunks.push(av.data);
                Storage.storeBlob(av.data);
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
