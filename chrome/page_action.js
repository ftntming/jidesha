
chrome.runtime.onMessage.addListener(function (msg, sender, response) {
    //console.info("message received", msg, sender, response);
    if (msg.from === 'recorder') {
        if (msg.subject === 'recording') {
            document.getElementById('start').style.display = 'none';
            document.getElementById('stop').style.display = '';
        } else if (msg.subject === 'stopped') {
            document.getElementById('start').style.display = '';
            document.getElementById('stop').style.display = 'none';
        }
    }
});

var checkIfIsRecording = function(){
    chrome.runtime.sendMessage({from: 'popup', subject: 'is-recording'},
        function(data){
            console.log(data);
            if(data.recording) {
                document.getElementById('duration').innerHTML = data.duration;
                document.getElementById('start').style.display = 'none';
                document.getElementById('stop').style.display = '';
            } else {
                document.getElementById('start').style.display = '';
                document.getElementById('stop').style.display = 'none';
            }
        }
    );
};
checkIfIsRecording();
setInterval(checkIfIsRecording, 1000);

window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('start-yes').onclick = function() {
        chrome.runtime.sendMessage({from: 'popup', subject: 'start-recording'});
        //window.close();
    }

    document.getElementById('stop-yes').onclick = function() {
        chrome.runtime.sendMessage({from: 'popup', subject: 'stop-recording'});
        //window.close();
    }


    document.getElementById('cancel1').onclick = function() {window.close()};
    document.getElementById('cancel2').onclick = function() {window.close()};



/*    chrome.tabs.query(
        {active: true,currentWindow: true},
        function (tabs) {
            console.log('tabs', tabs);
            chrome.tabs.sendMessage(
                tabs[0].id,
                {from: 'popup', subject: 'getPageActionDocument'},
                getPageActionDocument
            );
        }
    );
*/


});
