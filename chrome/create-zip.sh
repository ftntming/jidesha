#!/bin/bash


rm -r chrome.zip


/usr/bin/zip chrome.zip \
 background.js \
 recorder.js \
 storage.js \
 utils.js \
 page_action.html \
 page_action.js \
 i18n.js \
 _locales/*/* \
 manifest.json \
 images/ubity-logo-128x128.png \
 images/ubity-logo-16x16.png \
 images/ubity-logo-48x48.png \
 images/recordRTC-progress-* \
 images/loading.gif \
