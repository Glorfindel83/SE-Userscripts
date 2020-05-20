// ==UserScript==
// @name        Stack Exchange Archivist
// @namespace   https://github.com/Glorfindel83/
// @description Adds a button to archive all external links and images in a post
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/archivist/archivist.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/archivist/archivist.user.js
// @version     0.4
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
// @connect     web.archive.org
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// ==/UserScript==

(function () {
  "use strict";
  
  $("a.js-share-link").each(function() {
    let shareButton = $(this);

    // Find links & images
    let post = shareButton.parents("div.question")[0];
    if (post == null) {
      post = shareButton.parents("div.answer")[0];
    }
    let body = $(post).find("div.post-text")[0];
    var images = new Set();
    $(body).find("img").each(function() {
      let tmp = document.createElement('a');
      tmp.href = this.src;
      if (shouldArchive(tmp.hostname)) {
        images.add(this.src);
      }
    });
    var links = new Set();
    $(body).find("a").each(function() {
      if (shouldArchive(this.hostname) && !images.has(this.href)) {
        links.add(this.href);
      }
    });
    // Are there any links to archive?
    let disabled = links.size == 0 && images.size == 0;
    let hoverMessage = disabled ? 'No external links or images found.' : 'Archive ' + getMessage(links, images, false);

    // Add button
    let menu = shareButton.parent();
    menu.append($('<span class="lsep">|</span>'));
    let button = $('<a href="#" style="' + (disabled ? "color: #BBB" : "") + '" title="' + hoverMessage + '">archive</a>');
    menu.append(button);
    
    function startArchiving(event) {
      event.preventDefault();
      if (disabled) {
        alert(hoverMessage);
        return;
      }
      
      // TODO: overview of age of last snapshots, with checkmarks
      let message = getMessage(links, images, true);
      if (!confirm('Are you sure you want to archive ' + message + ' in this post?'))
        return;

      // Disable further clicks - the button becomes a progress indicator
      button.off('click', startArchiving);
      button.on('click', function(e) { e.preventDefault(); });
      button.css("color", "#BBB");
      button.removeAttr("title");
      button.text("archiving ...");
      
      let linksToArchive = Array.from(links).concat(Array.from(images));
      var index = -1, successCount = 0, failureCount = 0;
      function next(success) {
        // Success?
        if (typeof success != 'undefined') {
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
        }
        
        // Archive next link
        if (++index < linksToArchive.length) {
          archive(); 
        }
        
        // Update archive button
        let totalCount = successCount + failureCount;
        if (totalCount < linksToArchive.length) {
          button.text("archiving ... (" + totalCount + "/" + linksToArchive.length + ")");
        } else if (failureCount == 0) {
          button.text("archiving finished!");
        } else {
          button.text("archiving finished! (" + failureCount + " link" + (failureCount > 1 ? "s" : "") + " failed)");
        }
      }
      
      function archive() {
        let link = linksToArchive[index];
        console.log("Archiving: " + link);
        // Call Wayback Machine
        let archiveLink = "https://web.archive.org/save/" + link;
        GM.xmlHttpRequest({
          method: 'POST',
          url: archiveLink,
          data: $.param({
            "url": link,
            "capture_all": "on"
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          onload: function(response) {
            let match = /spn.watchJob\("([0-9a-f-]{36})",/g.exec(response.response);
            if (match == null) {
              console.log("Could not determine job ID for " + archiveLink);
              next(false);
              return;
            }
            // Start monitoring archiving job
            setTimeout(function () {
              monitorArchivingJob(match[1]);
            }, 2500);
          },
          onerror: function(response) {
            console.log(["An error occurred while calling: " + archiveLink,
                         response.status, response.statusText, response.readyState,
                         response.responseHeaders, response.responseText, response.finalUrl].join("\n"));
            next(false);
          }
        });
      }
      
      function monitorArchivingJob(jobID) {
        // Fetch job status
        let url = "https://web.archive.org/save/status/" + jobID + "?_t=" + Math.floor(Date.now() / 1000);
        console.log(url);
        GM.xmlHttpRequest({
          method: 'GET',
          url: url,
          onload: function(response) {
            let data = JSON.parse(response.response);
            
            // Check status
            if (data.status == "pending") {
              setTimeout(function () {
                monitorArchivingJob(jobID);
              }, 2500);
            } else if (data.status == "success") {
              // Success!
              let playbackURL = "https://web.archive.org/web/" + data.timestamp + "/" + data.original_url;
              console.log("Saved: " + playbackURL);
              next(true);
            } else {
              console.log("Failed to archive: " + url);
              next(false);
            }
          },
          onerror: function(response) {
            console.log(["An error occurred while calling: " + url,
                         response.status, response.statusText, response.readyState,
                         response.responseHeaders, response.responseText, response.finalUrl].join("\n"));
            next(false);
          }
        });
      }
      
      // Parallelize archiving over multiple threads
      for (var i = 0; i < 5; i++) {
        next();
      }
    }
    button.on('click', startArchiving);
  });  
})();

function getMessage(links, images, use1) {
  let linksMessage = getMessagePart("link", links.size, use1);
  let imagesMessage = getMessagePart("image", images.size, use1);
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