// ==UserScript==
// @name        Stack Exchange Post Notice Repositioner
// @namespace   https://github.com/Glorfindel83/
// @description Restores the new post notices to their previous position (under the post)
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/post-notice-repositioner/post-notice-repositioner.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/post-notice-repositioner/post-notice-repositioner.user.js
// @version     0.2
// @match       *://*.stackexchange.com/questions/*
// @match       *://*.stackoverflow.com/questions/*
// @match       *://*.superuser.com/questions/*
// @match       *://*.serverfault.com/questions/*
// @match       *://*.askubuntu.com/questions/*
// @match       *://*.stackapps.com/questions/*
// @match       *://*.mathoverflow.net/questions/*
// @exclude     *://*.stackexchange.com/questions/ask
// @exclude     *://*.stackoverflow.com/questions/ask
// @exclude     *://*.superuser.com/questions/ask
// @exclude     *://*.serverfault.com/questions/ask
// @exclude     *://*.askubuntu.com/questions/ask
// @exclude     *://*.stackapps.com/questions/ask
// @exclude     *://*.mathoverflow.net/questions/ask
// ==/UserScript==

/* global $ */

(function () {
  "use strict";
  
  $("aside.js-post-notice").each(function() {
    var target = $(this).parent().siblings("div.js-post-notices");
    if (target.length == 0) {
      target = $(this).parent().parent().siblings("div.js-post-notices");
    }
    $(this).remove();
    $(this).removeClass("mb16");
    $(this).addClass("my8");
    target.append($(this));
  });
})();
