// ==UserScript==
// @name        Stack Exchange Dismiss Announcement Banner
// @namespace   https://github.com/Glorfindel83/
// @description Automatically dismisses an announcement banner whenever you visit a (new) site.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/dismiss-announcement-banner/dismiss-announcement-banner.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/dismiss-announcement-banner/dismiss-announcement-banner.user.js
// @version     0.1
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.askubuntu.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.mathoverflow.net/*
// @grant       none
// ==/UserScript==

// TODO: check (cross-site) storage before dismissing

(function () {
  "use strict";
  setTimeout(function() {
    $("div#announcement-banner a.js-dismiss").click();
  }, 100);
})();