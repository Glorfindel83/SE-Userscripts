// ==UserScript==
// @name        Disable Stack Exchange Time Travel Mode
// @namespace   https://github.com/Glorfindel83/
// @description Disables Time Travel Mode (April Fools 2019) on all Stack Exchange sites
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/disable-time-travel-mode/disable-time-travel-mode.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/disable-time-travel-mode/disable-time-travel-mode.user.js
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.askubuntu.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.mathoverflow.net/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.*.com/*
// @exclude     *://chat.*.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @run-at      document-start
// @grant       none
// @version     0.3
// ==/UserScript==

(function () {
  "use strict";
  if (Date.now() < 1554335999000) {
    //Don't do anything if April Fools 2019 is past.
    if (document.cookie.indexOf('glorObeyUserPref') === -1 && (document.cookie.indexOf('tm2019') === -1 || document.cookie.indexOf('tm2019d') === -1)) {
      //We only want to set these once, so the user can turn the 2019 April Fools theme on for a site, if they want.
      //Using a cookie for our own flag automatically cleans up for us after April Fools Day.
      document.cookie = 'glorObeyUserPref=1;path=/;expires=Wed, 03 Apr 2019 23:59:59 GMT';
      document.cookie = 'tm2019=1;path=/;expires=Wed, 03 Apr 2019 23:59:59 GMT';
      document.cookie = 'tm2019d=1;path=/;expires=Wed, 03 Apr 2019 23:59:59 GMT';
      window.location.reload(false);
    }
  }
})()
