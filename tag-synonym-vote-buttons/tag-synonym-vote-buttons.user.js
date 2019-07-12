// ==UserScript==
// @name        Stack Exchange, Proper Tag Synonym Vote Buttons
// @namespace   Glorfindel
// @description Replaces the thumbs up/down buttons on the tag synonym dashboard with regular Stack Exchange vote buttons.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/tag-synonym-vote-buttons/tag-synonym-vote-buttons.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/tag-synonym-vote-buttons/tag-synonym-vote-buttons.user.js
// @version     0.1
// @match       *://*.stackexchange.com/tags/synonyms
// @match       *://*.stackoverflow.com/tags/synonyms
// @match       *://*.superuser.com/tags/synonyms
// @match       *://*.serverfault.com/tags/synonyms
// @match       *://*.askubuntu.com/tags/synonyms
// @match       *://*.stackapps.com/tags/synonyms
// @match       *://*.mathoverflow.net/tags/synonyms
// @grant       none
// ==/UserScript==

(function() {
  "use strict";

  $("a.js-synonym-upvote").each(function() {
    this.parentElement.style.paddingTop = "0px";
    this.parentElement.style.paddingBottom = "0px";
    $(this).html('<svg aria-hidden="true" class="svg-icon m0 iconArrowUpLg" width="36" height="24" viewBox="0 0 36 36"><path d="M2 26h32L18 10 2 26z"></path></svg>');
  });                                
  $("a.js-synonym-downvote").each(function() {
    $(this).html('<svg aria-hidden="true" class="svg-icon m0 iconArrowDownLg" width="36" height="24" viewBox="0 0 36 36"><path d="M2 10h32L18 26 2 10z"></path></svg>');
  });
  /* The code below shows the buttons next to each other, but I'm less satisfied with that result.
  $("a.js-synonym-upvote").each(function() {
    this.parentElement.style.paddingLeft = "4px";
    this.parentElement.style.paddingRight = "0px";
    $(this).html('<svg aria-hidden="true" class="svg-icon m0 iconArrowUpLg" width="36" height="36" viewBox="0 0 36 36"><path d="M2 26h32L18 10 2 26z"></path></svg>');
  });                                
  $("a.js-synonym-downvote").each(function() {
    $(this).html('<svg aria-hidden="true" class="svg-icon m0 iconArrowDownLg" width="36" height="36" viewBox="0 0 36 36"><path d="M2 10h32L18 26 2 10z"></path></svg>');
  });
  */
})();