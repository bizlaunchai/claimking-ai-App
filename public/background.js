/* global chrome */
chrome.runtime.onInstalled.addListener(() => {
    console.log("Background service worker running!");
});
