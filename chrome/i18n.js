window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('*[data-i18n]').forEach(function(el, i, arr) {
        el.innerHTML = chrome.i18n.getMessage(el.getAttribute("data-i18n"));
    });
});
