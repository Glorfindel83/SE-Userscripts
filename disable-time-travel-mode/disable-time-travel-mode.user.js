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
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.*.com/*
// @exclude     *://chat.*.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @grant       none
// @version     0.2
// ==/UserScript==

(function () {
  "use strict";
  $.cookie("tm2019", "1", { expires: 2, path: '/' });
  $.cookie("tm2019d", "1", { expires: 2, path: '/' });
})()
