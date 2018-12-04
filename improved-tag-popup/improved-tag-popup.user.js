// ==UserScript==
// @name        Stack Exchange, Improved Tag Popup
// @namespace   https://github.com/Glorfindel83/
// @description Adds a link to the tag information page (wiki + excerpt) to the tag popup
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/improved-tag-popup/improved-tag-popup.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/improved-tag-popup/improved-tag-popup.user.js
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
// @grant       none
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// @version     1.0
// @history     1.0 Scope/SEO title. Don't run on inapplicable pages. Link SA listing page (See Tampermonkey dashboard). Clear NA TM warnings.
// @history     0.2 Initial release
// @homepage    https://stackapps.com/q/8054/7653
// ==/UserScript==
/* global $, waitForKeyElements */

// from https://stackoverflow.com/a/21249710/4751173
$.fn.ownText = function() {
    return this.eq(0).contents().filter(function() {
       return this.nodeType === 3 // && $.trim(this.nodeValue).length;
    }).map(function() {
       return this.nodeValue;
    }).get().join('');
}

waitForKeyElements("div.tag-popup", function(jNode) {
  jNode.find("a").filter(function() {
    return $(this).text() === "View tag";
  }).each(function() {
    let tagName = $(this).attr("href").split("/").pop();
    let hasInfo = $(this).parent().ownText().trim().length > 0;
    if (hasInfo) {
      $("<br/>").insertBefore($(this));
    }

    // Other questions
    $(this).text("Other questions");

    // More info
    let infoURL = "/tags/" + tagName + "/info";
    $("<a href=\"" + infoURL + "\">More info</a>").insertBefore($(this));
    $("<span> | </span>").insertBefore($(this));

    // Edit/add info
    let editLink = $("<a>" + (hasInfo ? "Edit" : "Add") + " info</a>");
    editLink.click(function() {
      $.get(infoURL, function(data) {
        window.location.href = $(data).find("a[href^='/edit-tag-wiki/']").attr("href");
      });
    });
    editLink.insertBefore($(this));
    $("<span> | </span>").insertBefore($(this));
  });
})
