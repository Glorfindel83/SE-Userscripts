// ==UserScript==
// @name        Stack Exchange Accepted Answer Pinner
// @namespace   https://github.com/Glorfindel83/
// @description Pins the accepted answer on top
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/accepted-answer-pinner/accepted-answer-pinner.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/accepted-answer-pinner/accepted-answer-pinner.user.js
// @supportURL  https://stackapps.com/questions/9144/accepted-answer-pinner
// @author      Glorfindel
// @version     0.1
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
  
  // Any accepted answer?
  let acceptedAnswer = $("div.accepted-answer");
  if (acceptedAnswer.length == 0)
    return;
  
  // Self-accept?
  if (acceptedAnswer.find("div.post-signature").last().hasClass("owner"))
    return;
  
  // Pin accepted answer and its anchor
  let acceptedAnchor = acceptedAnswer.prev();
  let answersHeader = $("#answers-header");
  answersHeader.after(acceptedAnswer);
  answersHeader.after(acceptedAnchor);
})();
