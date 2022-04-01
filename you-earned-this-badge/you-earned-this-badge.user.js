// ==UserScript==
// @name        You've earned this badge, but when and where?
// @namespace   https://github.com/Glorfindel83/
// @description Adds a link in the badges page to show your personal badge page for that badge.
// @author      Glorfindel
// @contributor wimglenn
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/you-earned-this-badge/you-earned-this-badge.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/you-earned-this-badge/you-earned-this-badge.user.js
// @version     0.3
// @match       *://*.stackexchange.com/help/badges*
// @match       *://*.stackoverflow.com/help/badges*
// @match       *://*.superuser.com/help/badges*
// @match       *://*.serverfault.com/help/badges*
// @match       *://*.askubuntu.com/help/badges*
// @match       *://*.stackapps.com/help/badges*
// @match       *://*.mathoverflow.net/help/badges*
// @grant       none
// ==/UserScript==

(function () {
  'use strict';

  function addLink() {
    var parent = $(this).parent();
    var url = parent.next().find("a").prop("href") + "?userid=" +
        /\/users\/(\d+)/g.exec($("a.s-topbar--item.s-user-card").prop("href"))[1];
    var anchor = $("<a href=\"" + url + "\"/>");
    anchor.append($(this));
    parent.append(anchor);
  };

  // hyperlinks on badge list page
  $("div.fc-success").each(addLink);

  // hyperlink on badge detail page
  $("span.badge-earned-check").each(addLink);
}) ();