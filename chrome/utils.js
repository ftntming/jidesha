
/**
* Invokes browser save dialog
*/
function saveFileAs(blob, filename){
    filename = filename.replace(/[^0-9a-zA-Z-_\.]/g, '_');
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

/**
* Format current date to Y-m-d_H-i-s
*/
function getFormatedDate(){
    var zero = function(x){ return x < 10 ? '0'+x: ''+x; };
    var d = new Date();
    return d.getFullYear() + '-' +
        zero(d.getMonth()+1) + '-' +
        zero(d.getDate()) + '_' +
        zero(d.getHours()) + '-' +
        zero(d.getMinutes()) + '-' +
        zero(d.getSeconds());
}

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
