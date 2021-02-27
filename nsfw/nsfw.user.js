// ==UserScript==
// @name        Stack Exchange, Show NSFW post's text
// @namespace   https://github.com/Glorfindel83/
// @description Shows (potentially NSFW) content for deleted posts whose content is deleted because of being spam or rude/abusive.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/nsfw/nsfw.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/nsfw/nsfw.user.js
// @version     0.5
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
// ==/UserScript==

(function () {
  "use strict";

  $('span.hidden-deleted-question, span.hidden-deleted-answer').each(function() {
    let self = this;

    // Load revision history
    let revisionHistory = $(this).find('a').attr('href');
    let postID = parseInt(revisionHistory.split('/')[2]);
    $.get(revisionHistory, function(historyData) {
      // Find link to latest revision
      let href = $(historyData).find(".js-revisions a[href^='/revisions/" + postID + "/']")[0].getAttribute('href');
      $.get(href, function(data) {
        // Question?
        if (self.className == 'hidden-deleted-question') {
          // Replace question title
          let title = $(data).find('a.question-hyperlink')[0].innerHTML;
          document.getElementById('question-header').getElementsByTagName('h1')[0].innerHTML = title;
        }

        // Replace post content
        self.innerHTML = $(data).find('div.js-post-body')[0].innerHTML;

        // Add link to revision history
        let button = $('<a href="' + revisionHistory + '">Revisions</a>');
        console.log(button);
        let cell = $('<div class="grid--cell"></div>');
        cell.append(button);
        console.log(cell);
        let menu = $(self.parentElement.parentElement).find('div.js-post-menu')[0];
        $(menu).append(cell);
        $('<div>post content normally hidden, but made visible by the NSFW userscript</div>').insertAfter($(menu));
      });
    });
  });
})();
