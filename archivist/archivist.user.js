// ==UserScript==
// @name        Stack Exchange Archivist
// @namespace   https://github.com/Glorfindel83/
// @description Adds a button to archive all external links and images in a post
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/archivist/archivist.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/archivist/archivist.user.js
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
// @grant       none
// ==/UserScript==

(function () {
  "use strict";
  
  $("a.short-link").each(function() {
    let shareButton = $(this);

    // Find links & images
    let post = shareButton.parents("div.question")[0];
    if (post == null) {
      post = shareButton.parents("div.answer")[0];
    }
    let body = $(post).find("div.post-text")[0];
    var images = [];
    $(body).find("img").each(function() {
      let tmp = document.createElement('a');
      tmp.href = this.src;
      if (shouldArchive(tmp.hostname)) {
        images.push(this.src);
      }
    });
    var links = [];
    $(body).find("a").each(function() {
      if (shouldArchive(this.hostname) && !images.includes(this.href)) {
        links.push(this.href);
      }
    });
    // Are there any links to archive?
    let disabled = links.length == 0 && images.length == 0;
    let hoverMessage = disabled ? 'No external links or images found.' : 'Archive ' + getMessage(links, images, false);

    // Add button
    let menu = shareButton.parent();
    menu.append($('<span class="lsep">|</span>'));
    let button = $('<a href="#" style="' + (disabled ? "color: #BBB" : "") + '" title="' + hoverMessage + '">archive</a>');
    menu.append(button);
    button.click(function(event) {
      event.preventDefault();
      if (disabled) {
        alert(hoverMessage);
        return;
      }
      
      // TODO: overview of age of last snapshots, with checkmarks
      let message = getMessage(links, images, true);
      if (!confirm('Are you sure you want to archive ' + message + ' in this post?'))
        return;
    
      links.forEach(function(link) {
        // only works properly if the browser is configured to
        // allow stackexchange.com to open (multiple) popups
        window.open("https://web.archive.org/save/" + link, "_blank");
      });
    });
  });  
})();

function getMessage(links, images, use1) {
  let linksMessage = getMessagePart("link", links.length, use1);
  let imagesMessage = getMessagePart("image", images.length, use1);
  return linksMessage + (linksMessage != "" && imagesMessage != "" ? " and " : "") + imagesMessage;  
}

function getMessagePart(type, count, use1) {
  if (count == 0)
    return "";
  return (count == 1 && use1 ? "the" : count) + " external " + type + (count == 1 ? "" : "s");
}

function shouldArchive(hostname) {
  // Only archive 'external' links
  return !hostname.contains("stackexchange.com") &&
         !hostname.contains("stackoverflow.com") &&
         !hostname.contains("superuser.com") &&
         !hostname.contains("serverfault.com") &&
         !hostname.contains("askubuntu.com") &&
         !hostname.contains("mathoverflow.net") &&
         !hostname.contains("stackapps.com") &&
         !hostname.contains("stack.imgur.com");
}