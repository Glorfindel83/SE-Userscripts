// ==UserScript==
// @name        Stack Exchange, Show NSFW post's text
// @namespace   https://github.com/Glorfindel83/
// @description Shows (potentially NSFW) content for deleted posts whose content is deleted because of being spam or rude/abusive.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/nsfw/nsfw.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/nsfw/nsfw.user.js
// @version     0.8
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

  $('aside:contains("This post is hidden.")').each(function() {
    let notices = $(this).parent().html();
    let postBody = $(this).parents("div.js-post-body");
    if (!postBody.text().contains("was marked as spam or rude or abusive"))
      return;
    let post = postBody.parents("div.deleted-answer");

    // Load revision history
    let revisionHistory = postBody.children('a').attr('href');
    let postID = parseInt(revisionHistory.split('/')[2]);
    $.get(revisionHistory, function(historyData) {
      // Find link to latest revision
      let href = $(historyData).find(".js-revisions a[href^='/revisions/" + postID + "/']")[0].getAttribute('href');
      $.get(href, function(data) {
        // Question?
        if (post.hasClass('question')) {
          // Replace question title
          let title = $(data).find('a.question-hyperlink')[0].innerHTML;
          document.getElementById('question-header').getElementsByTagName('h1')[0].innerHTML = title;
        }

        // Replace post body
        postBody[0].innerHTML = notices + $(data).find('div.js-post-body')[0].innerHTML;

        // Add link to revision history
        let button = $('<a href="' + revisionHistory + '">Revisions</a>');
        let cell = $('<div class="grid--cell"></div>');
        cell.append(button);
        let menu = post.find('div.js-post-menu')[0];
        $(menu).append(cell);
        $('<div>post content normally hidden, but made visible by the NSFW userscript</div>').insertAfter($(menu));
      });
    });
  });
})();
