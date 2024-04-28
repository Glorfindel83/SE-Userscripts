// ==UserScript==
// @name        Stack Exchange Dismiss Announcement Banner
// @namespace   https://github.com/Glorfindel83/
// @description Automatically dismisses an announcement banner when you've dismissed it on another site
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/dismiss-announcement-banner/dismiss-announcement-banner.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/dismiss-announcement-banner/dismiss-announcement-banner.user.js
// @supportURL  https://stackapps.com/questions/8463/dismiss-announcement-banner
// @version     1.0
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.askubuntu.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.mathoverflow.net/*
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

(function () {
  "use strict";
  setTimeout(function() {
    // Banner shown?
    const banner = document.getElementById("announcement-banner");
    if (banner == null)
      return;
    const closeButton = banner.querySelector("a.js-dismiss");

    // Banner already dismissed before?
    const campaign = banner.getAttribute("data-campaign");
    if (GM_getValue(campaign) != null) {
      closeButton.click();
      return;
    }

    // Detect when the user dismisses the banner
    closeButton.onclick = function() {
      GM_setValue(campaign, "");
    }
  }, 100);
})();