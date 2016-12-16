
var checkIfIsRecording = function(){
    chrome.runtime.sendMessage({from: 'popup', subject: 'is-recording'},
        function(data){
            console.log(data);
            if(data.recording) {
                document.getElementById('duration').innerHTML = data.duration;
                document.getElementById('start').style.display = 'none';
                document.getElementById('stop').style.display = '';
                document.getElementById('pleasewait').style.display = 'none';
                document.getElementById('pleaseselect').style.display = 'none';
            } else {
                document.getElementById('stop').style.display = 'none';
            }
        }
    );
};
checkIfIsRecording();
setInterval(checkIfIsRecording, 1000);

window.addEventListener('DOMContentLoaded', function () {

    document.getElementById('start-yes').onclick = function() {
        document.getElementById('start').style.display = 'none';
        document.getElementById('stop').style.display = 'none';
        document.getElementById('pleaseselect').style.display = '';
        document.getElementById('pleasewait').style.display = 'none';
    };

    document.getElementById('start-recording').onclick = function() {
        chrome.runtime.sendMessage({from: 'popup', subject: 'start-recording'});
    };

    document.getElementById('stop-yes').onclick = function() {
        chrome.runtime.sendMessage({from: 'popup', subject: 'stop-recording'});
        document.getElementById('start').style.display = 'none';
        document.getElementById('stop').style.display = 'none';
        document.getElementById('pleaseselect').style.display = 'none';
        document.getElementById('pleasewait').style.display = '';
    };


    document.getElementById('cancel1').onclick = function() {window.close();};
    document.getElementById('cancel2').onclick = function() {window.close();};
    document.getElementById('cancel3').onclick = function() {window.close();};

});
