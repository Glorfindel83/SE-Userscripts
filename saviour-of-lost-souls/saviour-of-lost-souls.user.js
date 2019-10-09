// ==UserScript==
// @name        'Saviour' of Lost Souls
// @namespace   https://github.com/Glorfindel83/
// @description Adds a shortcut to down-/close-/delete vote and post a welcoming comment to Lost Souls on Meta Stack Exchange and some other sites.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/saviour-of-lost-souls/saviour-of-lost-souls.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/saviour-of-lost-souls/saviour-of-lost-souls.user.js
// @version     1.1
// @match       *://meta.stackexchange.com/questions/*
// @match       *://meta.stackoverflow.com/questions/*
// @match       *://softwarerecs.stackexchange.com/questions/*
// @match       *://softwarerecs.stackexchange.com/review/first-posts*
// @match       *://hardwarerecs.stackexchange.com/questions/*
// @match       *://hardwarerecs.stackexchange.com/review/first-posts*
// @exclude     *://meta.stackexchange.com/questions/ask
// @exclude     *://meta.stackoverflow.com/questions/ask
// @exclude     *://softwarerecs.stackexchange.com/questions/ask
// @exclude     *://hardwarerecs.stackexchange.com/questions/ask
// @grant       none
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==
/* global $, waitForKeyElements */

(function ($) {
  "use strict";
  
  // Find question (works when on Q&A page)
  let question = $('#question');
  if (question.length == 0)
    return;

  main(question);  
})(window.jQuery);

// Wait for question (works when in review queue)
waitForKeyElements('div.review-content div.question', function(jNode) {
  main(jNode);
});

function main(question) {
  // Check if author is likely to be a lost soul
  let owner = question.find('div.post-signature.owner');
  if (owner.length == 0)
    // happens with Community Wiki posts
    return;
  let reputation = owner.find('span.reputation-score')[0].innerText;
  if (reputation === "1") {
    // Do nothing: 1 rep qualifies for a lost soul
  } else {
    // Child meta sites require some reputation to post a question, so we need other rules:
    let isNewContributor = owner.find('span.js-new-contributor-label').length > 0;
    let hasLowReputation = reputation <= 101; // association bonus
    let negativeQuestionScore = parseInt(question.find('div.js-vote-count').text()) < 0;
    let numberOfReasons = (isNewContributor ? 1 : 0) + (hasLowReputation ? 1 : 0) + (negativeQuestionScore ? 1 : 0);
    if (numberOfReasons < 2)
      return;
  }
  
  // Which site?
  let isMetaSE = location.host == 'meta.stackexchange.com';
  let isBeta = location.host == 'hardwarerecs.stackexchange.com';

  // My reputation
  let myReputation = parseInt($('a.my-profile div.-rep')[0].innerText.replace(/,/g, ''));
  let hasCommentPrivilege = myReputation >= (isMetaSE ? 5 : 50);
  let hasFlagPrivilege = myReputation >= 15;
  let hasUpvotePrivilege = myReputation >= 15;
  let hasDownvotePrivilege = myReputation >= (isMetaSE ? 100 : 125);
  let hasCloseVotePrivilege = myReputation >= (isBeta ? 500 : 3000);
  let hasDeleteVotePrivilege = myReputation >= (isBeta ? 4000 : 20000);
  let isModerator = $("a.js-mod-inbox-button").length > 0;
  // Can the script do anything?
  if (!hasCommentPrivilege && !hasFlagPrivilege)
    return;
  
  // Score; downvoted or not?
  let downvoted = question.find('a.vote-down-on').length > 0;
  let score = parseInt(question.find('div.js-vote-count')[0].innerText.replace(/,/g, ''));

  // Closed?
  let status = $('div.question-status h2 b');
  let statusText = status.length > 0 ? status[0].innerText : '';
  let closed = statusText == 'marked' || statusText == 'put on hold' || statusText == 'closed';

  // Is there any comment not by the author?
  let comments = question.find('ul.comments-list');
  var hasNonOwnerComment = false;
  comments.find('a.comment-user').each(function() {
    if (!$(this).hasClass('owner')) {
      hasNonOwnerComment = true;
    }
  });
  
  // Determine which actions to take
  // Comment
  let shouldComment = hasCommentPrivilege && !hasNonOwnerComment;
  // Downvote (not when the post is already on -3 or lower, to be slightly more welcoming)
  let shouldDownvote = hasDownvotePrivilege && !downvoted && score > -3;
  // Flag/vote to close
  let shouldFlag = hasFlagPrivilege && !hasCloseVotePrivilege && !closed;
  let shouldVoteToClose = hasCloseVotePrivilege && !closed;
  // Vote to delete
  let shouldVoteToDelete = (hasDeleteVotePrivilege && closed && score <= -3) || isModerator;

  // Add post menu button
  let menu = question.find('div.post-menu');
  menu.append($('<span class="lsep">|</span>'));
  let button = $('<a href="#" title="down-/close-/delete vote and post a welcoming comment">lost soul</a>');
  menu.append(button);
  button.click(function() {
    // Generate HTML for dialog
    var html = `
  <aside class="s-modal bg-transparent pe-none js-stacks-managed-popup js-fades-with-aria-hidden" id="modal-base" tabindex="-1" role="dialog" aria-labelledby="mod-modal-title" aria-describedby="mod-modal-description" aria-hidden="false">    
      <form class="s-modal--dialog js-modal-dialog js-keyboard-navigable-modal pe-auto" role="document" data-controller="se-draggable se-mod-menu" data-se-mod-menu-model-type="post" data-se-mod-menu-model-id="371841" method="get" action="#" data-action="se-mod-menu#submit" data-keyboard-actions="#mod-screen-select-menu, input[name=action], .js-info-link">
          <h1 class="s-modal--header fs-headline1 fw-bold mr48 c-move js-first-tabbable" id="modal-title" tabindex="0" data-target="se-draggable.handle">
              'Saviour' of Lost Souls
          </h1>`;
    html += `
          <div class="grid--cell">
              <span class="js-short-label">Please confirm you want to</span>
              <ul>`;
    // List actions that will be taken
    if (shouldComment) {
      html += `
                  <li>leave a welcoming comment</li>`;
    }
    if (shouldDownvote) {
      html += `
                  <li>downvote the question</li>`;
    }
    if (shouldFlag) {
      html += `
                  <li>flag the question as off-topic</li>`;
    }
    if (shouldVoteToClose) {
      html += `
                  <li>vote to close the question as off-topic</li>`;
    }
    if (shouldVoteToDelete) {
      html += `
                  <li>vote to delete the question</li>`;
    }
    html += `
              </ul>
          </div>
          <br/>`;
    if (hasCommentPrivilege && hasNonOwnerComment) {
      // Add option to post a comment anyway
      html += `
          <div class="grid--cell">
              <span>Another user already posted a comment.</span>
              <fieldset class="mt4 ml4 mb16">
                  <div class="grid gs8 gsx ff-row-nowrap">
                      <div class="grid--cell">
                          <input class="s-checkbox" type="checkbox" name="postCommentAnyway" id="sols-postCommentAnyway">
                      </div>
                      <label class="grid--cell s-label fw-normal" for="sols-postCommentAnyway">
                          Post a welcoming comment anyway
                      </label>
                  </div>
              </fieldset>
          </div>`;
    }
    html += `
          <div class="grid gs8 gsx s-modal--footer">
              <button class="grid--cell s-btn s-btn__primary" type="submit" onclick="saviourOfLostSouls.submitDialog();">Confirm</button>
              <button class="grid--cell s-btn js-modal-close" type="button" onclick="saviourOfLostSouls.closeDialog();">Cancel</button>
          </div>
          <button class="s-modal--close s-btn s-btn__muted js-modal-close js-last-tabbable" type="button" aria-label="Close" onclick="saviourOfLostSouls.closeDialog();">
              <svg aria-hidden="true" class="svg-icon m0 iconClearSm" width="14" height="14" viewBox="0 0 14 14"><path d="M12 3.41L10.59 2 7 5.59 3.41 2 2 3.41 5.59 7 2 10.59 3.41 12 7 8.41 10.59 12 12 10.59 8.41 7 12 3.41z"></path></svg>
          </button>
      </form>
  </aside>`;
    $(document.body).append($(html));
  });
  
  // Define functions which can be called by the dialog
  window.saviourOfLostSouls = {};
  saviourOfLostSouls.closeDialog = function() {
    $("#modal-base").remove();
  };
  saviourOfLostSouls.submitDialog = function() {
    // Prepare votes/comments
    let postID = parseInt(question.attr('data-questionid'));
    let fkey = window.localStorage["se:fkey"].split(",")[0];

    if (shouldComment || $("#sols-postCommentAnyway").prop("checked")) {
      // Post comment
      let author = owner.find('div.user-details a')[0].innerText;

      let comment = window.location.host === "softwarerecs.stackexchange.com"
       ? ("Hi " + author + ", welcome to [softwarerecs.se]! " +
          "This question does not appear to be about software recommendations, within [the scope defined on meta](https://softwarerecs.meta.stackexchange.com/questions/tagged/scope) and in the [help center](/help/on-topic). " +
          "If you think you can [edit] it to become on-topic, please have a look at the [question quality guidelines](https://softwarerecs.meta.stackexchange.com/q/336/23377).")
       : window.location.host === "hardwarerecs.stackexchange.com"
       ? ("Hi " + author + ", welcome to [hardwarerecs.se]! " +
          "This question does not appear to be about hardware recommendations, within [the scope defined on meta](https://hardwarerecs.meta.stackexchange.com/questions/tagged/scope) and in the [help center](/help/on-topic)." +
          "If you think you can [edit] it to become on-topic, please have a look at the [question quality guidelines](https://hardwarerecs.meta.stackexchange.com/q/205/4495).")
       : ("Hi " + author + ", welcome to Meta! " +
          "I'm not sure which search brought you here but the problem you describe will not be answered on this specific site. " +
          "To get an answer from users that have the expertise about the topic of your question you'll have to find and then re-post on the [proper site](https://stackexchange.com/sites). " +
          "Check [How do I ask a good question](/help/how-to-ask) and [What is on topic](/help/on-topic) on the *target* site to make sure your post is in good shape. " +
          "Your question is definitely off-topic on [Meta](/help/whats-meta) and is better deleted here.");
      $.post({
        url: "https://" + document.location.host + "/posts/" + postID + "/comments",
        data: "fkey=" + fkey + "&comment=" + encodeURI(comment),
        success: function () {
          console.log("Comment posted.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          window.alert("An error occurred, please try again later.");
          console.log("Error: " + textStatus + " " + errorThrown);
        }
      });
    }

    if (hasUpvotePrivilege) {
      // Upvote all comments containing "welcome to"
      comments.find("li").each(function() {
        if ($(this).find("span.comment-copy")[0].innerText.toLowerCase().indexOf("welcome to") >= 0) {
          // Click the "up" triangle
          let upButtons = $(this).find("a.comment-up");
          if (upButtons.length > 0) {
            upButtons[0].click();
          }
        }
      });
    }

    if (shouldDownvote) {
      // Downvote (not when the post is already on -3 or lower, to be slightly more welcoming)
      $.post({
        url: "https://" + document.location.host + "/posts/" + postID + "/vote/3", // 3 = downvote
        data: "fkey=" + fkey,
        success: function () {
          // NICETOHAVE: set downvote button color
          console.log("Downvote cast.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          window.alert("An error occurred, please try again later.");
          console.log("Error: " + textStatus + " " + errorThrown);
        }
      });
    }

    if (shouldFlag || shouldVoteToClose) {
      // Flag/vote to close (which one doesn't matter for the API call)
      $.post({
        url: "https://" + document.location.host + "/flags/questions/" + postID + "/close/add",
        data: "fkey=" + fkey + "&closeReasonId=OffTopic&closeAsOffTopicReasonId=" + (window.location.host === "softwarerecs.stackexchange.com" ||
                                                                                     window.location.host === "hardwarerecs.stackexchange.com" ? "1" : "8"),
        success: function () {
          // NICETOHAVE: update close vote count
          console.log("Close flag/vote cast.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          window.alert("An error occurred, please try again later.");
          console.log("Error: " + textStatus + " " + errorThrown);
        }
      });
    }
    
    if (shouldVoteToDelete) {
      // Delete vote
      // NICETOHAVE: maybe also if myReputation >= 10000 and question age >= 48 hours
      $.post({
        url: "https://" + document.location.host + "/posts/" + postID + "/vote/10", // 10 = delete
        data: "fkey=" + fkey,
        success: function () {
          // NICETOHAVE: update delete vote count
          console.log("Delete vote cast.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          window.alert("An error occurred, please try again later.");
          console.log("Error: " + textStatus + " " + errorThrown);
        }
      });
    }

    // Reload page; this is less elegant than waiting for all POST calls, but it works.
    window.setTimeout(() => window.location.reload(false), 1000);    
  };
}
