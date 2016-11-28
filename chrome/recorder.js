// Muaz Khan     - https://github.com/muaz-khan
// MIT License   - https://www.WebRTC-Experiment.com/licence/
// Source Code   - https://github.com/muaz-khan/Chrome-Extensions

// this page is using desktopCapture API to capture and record screen
// http://developer.chrome.com/extensions/desktopCapture.html

// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function() {
  // Replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // With a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // That fires when a page's URL contains a 'g' ...
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlContains: '.ubity.com' },
          }),
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlContains: 'meet.' },
          })
        ],
        // And shows the extension's page action.
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});

chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    chrome.tabs.get(tabId, function(tab) {
        if (tab.url.match(/meet.*\.ubity\.com/)) {
            chrome.pageAction.setPopup({
                tabId: tabId,
                popup: 'page_action.html'
            });
        } else {
            /*chrome.pageAction.setPopup({
                tabId: tabId,
                popup: ''
            });*/

        }
    });
});


chrome.runtime.onMessage.addListener(function (msg, sender, response) {
    //console.info("message received", msg, sender, response);
    if (msg.from === 'popup') {
        if (msg.subject === 'start-recording') {
            getUserConfigs();
        } else if (msg.subject === 'stop-recording') {
            stopScreenRecording();
        } else if (msg.subject === 'is-recording') {
            response({recording: isRecording,
                duration:convertTime(Date.now() - initialTime)});
        }
    }
});




function notifyRecording(duration){
    chrome.runtime.sendMessage(
        {from: 'recorder', subject: 'recording', duration: duration});
}

function notifyStopped(){
    chrome.runtime.sendMessage({from: 'recorder', subject: 'stopped'});
}

var currentTabId;
var recorder;

function captureDesktop(tab) {
    currentTabId = tab.id;

    if (recorder && recorder.stream && recorder.stream.onended) {
        recorder.stream.onended();
        return;
    }

    chrome.pageAction.setIcon({
        tabId: currentTabId,
        path: 'ubity-logo-16x16.png'
    });

    var screenSources = ['tab', 'audio'];

    try {
        chrome.desktopCapture.chooseDesktopMedia(
            screenSources, /*tab,*/ onAccessApproved);
    } catch (e) {
        getUserMediaError(e);
    }
}



function onAccessApproved(chromeMediaSourceId) {
    if (!chromeMediaSourceId || !chromeMediaSourceId.toString().length) {
        if (getChromeVersion() < 53) {
            getUserMediaError('!mediaSourceId, version < 53');
            return;
        }

        askToStopExternalStreams();
        setDefaults();
        chrome.runtime.reload();
        return;
    }

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
                maxFrameRate: 24,
                maxWidth: 1280,
                maxHeight: 720
            },
            optional: []
        }
    };

    chrome.tabs.getSelected(function(_tab){
        if (_tab.url.match(/meet.*ubity\.com/)) {
            navigator.webkitGetUserMedia(
                constraints, gotStream, getUserMediaError);
        } else {
            alert(chrome.i18n.getMessage("pleaseSelectUbityMeet"));
            getUserConfigs();
            return;
        }
    });
    //navigator.webkitGetUserMedia(constraints, gotStream, getUserMediaError);

    function gotStream(stream, extra) {
        var options = {
            type: 'video',
            disableLogs: false,
            audioBitsPerSecond: 128 * 1000,
            videoBitsPerSecond: 100 * 1000, // vp8 (smallest 100kbps)
            recorderType: MediaStreamRecorder // StereoAudioRecorder
        };

        if (typeof localAudio !== 'undefined'){
            stream.addTrack(localAudio);
        }

        recorder = RecordRTC(stream, options);

        try {
            recorder.startRecording();
            alreadyHadGUMError = false;
        } catch (e) {
            getUserMediaError(e);
        }

        recorder.stream = stream;

        isRecording = true;
        onRecording();

        alert("Now recording...");

        recorder.stream.onended = function() {
            if (recorder && recorder.stream) {
                recorder.stream.onended = function() {};
            }

            stopScreenRecording();
        };

        recorder.stream.getVideoTracks()[0].onended = function() {
            if (recorder && recorder.stream && recorder.stream.onended) {
                recorder.stream.onended();
            }
        };

        initialTime = Date.now()
        timer = setInterval(checkTime, 100);
    }
}

function askToStopExternalStreams() {
    try {
        runtimePort.postMessage({
            stopStream: true,
            messageFromContentScript1234: true
        });
    } catch (e) {}
}

function stopScreenRecording() {
    notifyStopped();
    isRecording = false;

    if (typeof recorder !== 'undefined' && recorder.stopRecording) {
        recorder.stopRecording(function() {
            invokeSaveAsDialog(recorder.blob, 'RecordRTC-' +
                (new Date).toISOString().replace(/:|\./g, '-') + '.webm');

            setTimeout(function() {
                setDefaults();
                chrome.runtime.reload();
            }, 1000);

            askToStopExternalStreams();

        });
    }

    if (timer) {
        clearTimeout(timer);
    }
    setBadgeText('');

    chrome.pageAction.setTitle({
        title: chrome.i18n.getMessage("appName")
    });
}

function setDefaults() {
    chrome.pageAction.setIcon({
        tabId: currentTabId,
        path: 'ubity-logo-16x16.png'
    });

    if (recorder && recorder.stream) {
        recorder.stream.stop();
        if (recorder && recorder.stream && recorder.stream.onended) {
            recorder.stream.onended();
        }
    }

    recorder = null;
    isRecording = false;
    imgIndex = 0;
}

var isRecording = false;
var images = ['recordRTC-progress-1.png',
    'recordRTC-progress-2.png',
    'recordRTC-progress-3.png',
    'recordRTC-progress-4.png',
    'recordRTC-progress-5.png'];
var imgIndex = 0;
var reverse = false;

function onRecording() {
    chrome.pageAction.setIcon({
        tabId: currentTabId,
        path: 'images/' + images[imgIndex]
    });

    if (!reverse) {
        imgIndex++;

        if (imgIndex > images.length - 1) {
            imgIndex = images.length - 1;
            reverse = true;
        }
    } else {
        imgIndex--;

        if (imgIndex < 0) {
            imgIndex = 1;
            reverse = false;
        }
    }

    if (isRecording) {
        setTimeout(onRecording, 800);
        return;
    }

    chrome.pageAction.setIcon({
        tabId: currentTabId,
        path: 'ubity-logo-16x16.png'
    });
}

function setBadgeText(text) {
    /*
    chrome.pageAction.setBadgeBackgroundColor({
        color: [255, 0, 0, 255]
    });

    chrome.pageAction.setBadgeText({
        text: text + ''
    });*/
}

var initialTime, timer;

function checkTime() {
    if (!initialTime) return;
    var timeDifference = Date.now() - initialTime;
    var formatted = convertTime(timeDifference);
    setBadgeText(formatted);

    chrome.pageAction.setTitle({
        tabId: currentTabId,
        title: chrome.i18n.getMessage("recordingDuration") + ': ' + formatted
    });

}

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

function getChromeVersion() {
    var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : 52;
}

function getUserConfigs() {
    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs){
        console.log("current tab", tabs);

        if(tabs.length == 0){
            console.log(chrome.runtime.getManifest());
            chrome.tabs.query({ url: chrome.runtime.getManifest().externally_connectable.matches }, function(tabs2){
                captureDesktop(tabs2[0]);
            });
        } else {
            captureDesktop(tabs[0]);
        }
    });
}


function getUserMediaError(e) {
    console.error("getUserMediaError", e);
    askToStopExternalStreams();
    setDefaults();
    chrome.runtime.reload();
}
