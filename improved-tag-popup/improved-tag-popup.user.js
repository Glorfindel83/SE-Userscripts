// ==UserScript==
// @name        Improved Tag Popup
// @namespace   https://github.com/Glorfindel83/
// @description Adds a link to the tag information page (wiki + excerpt) to the tag popup
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/improved-tag-popup/improved-tag-popup.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/improved-tag-popup/improved-tag-popup.user.js
// @version     0.1
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.askubuntu.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.mathoverflow.net/*
// @grant       none
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

waitForKeyElements("div.tag-popup", function(jNode) {
  jNode.find("a").filter(function() {
    return $(this).text() === "View tag";
  }).each(function() {
    $(this).text("Other questions");
    var tagName = $(this).attr("href").split("/").pop();
    $("<br/>").insertBefore($(this));
    $("<a href=\"/tags/" + tagName + "/info\">More info</a>").insertBefore($(this));
    $("<span> | </span>").insertBefore($(this));
  });
})