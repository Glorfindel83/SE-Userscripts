// ==UserScript==
// @name        Moderator History - Show Flag Responses
// @namespace   https://github.com/Glorfindel83/
// @description Loads flag responses (decline reasons and custom messages) into the Moderator History page.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/show-flag-responses/show-flag-responses.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/show-flag-responses/show-flag-responses.user.js
// @version     0.1.3
// @match       *://*.stackexchange.com/admin/history/*
// @match       *://*.stackoverflow.com/admin/history/*
// @match       *://stackoverflow.com/admin/history/*
// @match       *://superuser.com/admin/history/*
// @match       *://serverfault.com/admin/history/*
// @match       *://askubuntu.com/admin/history/*
// @match       *://stackapps.com/admin/history/*
// @match       *://mathoverflow.net/admin/history/*
// @grant       none
// ==/UserScript==

(function () {
  "use strict";

  $("ul#mod-user-history > li").each(function() {
    let post = $(this);
    
    // Find time of handling (important to separate multiple flags on a single post)
    let time = post.find("span.relativetime").attr("title");
    
    // Find post ID
    let link = post.find("a");
    if (link.length == 0)
      // e.g. tag merges
      return;
    let href = link.attr("href");
    let hrefRegex = (link.hasClass("question-hyperlink") ? /\/questions\/(\d+)\//g :
                     link.hasClass("answer-hyperlink") ? /#(\d+)/g : null);
    if (hrefRegex == null)
      // e.g. moderator message
      return;
    let matches = hrefRegex.exec(href);
    let postID = parseInt(matches[1]);
    
    // Load Post Flag History page
    $.get("https://" + document.location.host + "/admin/posts/" + postID + "/show-flags", function(data) {
      // Search for rows corresponding to the time of handling
      let deletionDate = $(data).find("span[title='" + time + "']");
      if (deletionDate.length == 0)
        return;
      
      // Find last cell in the row, it contains the feedback (if any)
      let cells = deletionDate[0].parentElement.parentElement.children;
      let lastCell = cells[cells.length - 1];
      let feedback = lastCell.getAttribute("title");
      if (feedback == null || feedback.length == 0)
        return;
      let decodedFeedback = new DOMParser().parseFromString(feedback, "text/html").documentElement.textContent;
      
      // Add feedback to each "Flag processed" entry
      post.find("li").each(function() {
        if (!this.innerText.startsWith("Flag processed"))
          return;
        let index = this.innerText.indexOf(") -");
        this.innerText = this.innerText.substring(0, index) + ", " + decodedFeedback + this.innerText.substring(index);
      })
    });    
  });  
})();
