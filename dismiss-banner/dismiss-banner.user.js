// ==UserScript==
// @name        Dismiss Net Neutrality Banner
// @namespace   https://github.com/Glorfindel83/
// @description Automatically dismisses the Net Neutrality banner whenever you visit a (new) site.
// @author      Glorfindel
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

(function () {
  "use strict";
  setTimeout(function() {
    $("#net-neutrality-dismiss").click();
  }, 100);
})();