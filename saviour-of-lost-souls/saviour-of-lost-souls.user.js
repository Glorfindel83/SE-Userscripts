// ==UserScript==
// @name        'Saviour' of Lost Souls
// @namespace   https://github.com/Glorfindel83/
// @description Adds a shortcut to down-/close-/delete vote and post a welcoming comment to Lost Souls on Meta Stack Exchange and some other sites.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/saviour-of-lost-souls/saviour-of-lost-souls.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/saviour-of-lost-souls/saviour-of-lost-souls.user.js
// @version     2.5.1
// @match       *://meta.stackexchange.com/*
// @match       *://meta.stackoverflow.com/*
// @match       *://softwarerecs.stackexchange.com/*
// @match       *://hardwarerecs.stackexchange.com/*
// @match       *://mathoverflow.net/*
// @match       *://stackapps.com/*
// @grant       none
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==
/* global $, waitForKeyElements */

// These objects hold information about whether the user *can* and *should* perform certain actions.
const can = {}, should = {};

// Which site?
let isMetaSE = location.host == 'meta.stackexchange.com';
let isMeta = location.host.startsWith('meta');
let isBeta = location.host == 'hardwarerecs.stackexchange.com';

// My reputation / privileges
let myReputation = parseInt($('.js-header-rep')[0].innerText.replace(/,/g, ''));
let hasCommentPrivilege = myReputation >= (isMetaSE ? 5 : 50);
let hasFlagPrivilege = myReputation >= 15;
let hasUpvotePrivilege = myReputation >= 15;
let hasDownvotePrivilege = myReputation >= (isMetaSE ? 100 : 125);
let hasCloseVotePrivilege = myReputation >= (isBeta ? 500 : 3000);
let hasDeleteVotePrivilege = myReputation >= (isBeta ? 4000 : 20000);
let isModerator = $("a.js-mod-inbox-button").length > 0;

(function() {
  "use strict";
  
  // Find question (works when on Q&A page)
  let question = $('#question');
  if (question.length == 0)
    return;

  if (isNewUser(question)) {
    main(question);
  }
})();

// from https://stackoverflow.com/a/21249710/4751173
$.fn.ownText = function() {
  return this.eq(0).contents().filter(function() {
     return this.nodeType === 3 // && $.trim(this.nodeValue).length;
  }).map(function() {
     return this.nodeValue;
  }).get().join('');
}

// Wait for question (works when in review queue)
waitForKeyElements('div.js-review-content div.question', function(jNode) {
  if (isNewUser(jNode)) {
    main(jNode);
  }
});

// Questions (also works for new questions from the websocket)
waitForKeyElements('div.question-summary, div.js-post-summary', function(jNode) {
  // Check if author is likely to be a lost soul
  let reputation = jNode.find('span.reputation-score, span.todo-no-class-here');
  if (reputation.length == 0)
    // IIRC this may happen for migrated questions
    return;
  if (reputation.ownText() != "1")
    // not a new user
    return;
  let action = jNode.find('a.started-link, div.user-action-time, .s-user-card--time a');
  if (!action.text().trim().startsWith("asked "))
    return;
  
  main(null, jNode);
});

function isNewUser(question) {
  // Check if author is likely to be a lost soul
  let owner = question.find('div.post-signature.owner');
  if (owner.length == 0)
    // happens with Community Wiki posts
    return false;
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
      return false;
  }
  return true;
}

function main(question, summary) {  
  // Can the script do anything?
  if (!hasCommentPrivilege && !hasFlagPrivilege)
    return;
  
  let button = $('<a title="down-/close-/delete vote and post a welcoming comment">Lost soul</a>');
  if (question == null) {
    // Add link
    let userInfo = summary.find("div.user-info, div.s-user-card--info");
    if (userInfo.length == 0) {
      summary.find("div.started, div.s-user-card--time").append(button);
    } else {
      userInfo.append(button);
    }
    button.click(function() {
      // Load page (some data could be determined from the summary, but it's easier to reuse the 'main' part of the code)
      let link = summary.find('a.question-hyperlink, h3.s-post-summary--content-title > a.s-link').prop('href');
      $.get(link, function(data) {        
        question = $(data).find('#question');
        createDialog(question);
        buttonClicked(question);
      });
    });
  } else {
    // Add post menu button
    let cell = $('<div class="flex--item"></div>');
    cell.append(button);
    let menu = question.find('.js-post-menu > div:first-child');
    menu.append(cell);    
      button.click(function() {
      buttonClicked(question);
    });
    createDialog(question);
  }
}

function buttonClicked(question) {
  // Score; downvoted or not?
  let downvoted = question.find('.js-vote-down-btn.fc-theme-primary').length > 0;
  let score = parseInt(question.find('div.js-vote-count')[0].innerText.replace(/,/g, ''));

  // Closed?
  let status = question.find('aside.s-notice p.mb0.mt6');
  let statusText = status.length > 0 ? status[0].innerText : '';
  let closed = statusText.startsWith('Closed');

  // Analyze comments
  let comments = question.find('ul.comments-list');
  var otherNonOwnerComments = [];
  var hasNonOwnerComment = false;
  comments.find('li').each(function() {
    let commentUser = $(this).find('a.comment-user')[0];
    if (commentUser.classList.contains('owner'))
      return;
    hasNonOwnerComment = true;
    if ($(this).find("span.comment-copy")[0].innerText.toLowerCase().indexOf("welcome to") < 0) {
      otherNonOwnerComments.push(this);
    }
  });
  
  // Determine which actions can be taken
  can['upvote'] = hasUpvotePrivilege;
  can['comment'] = hasCommentPrivilege;
  can['downvote'] = hasDownvotePrivilege && !downvoted;
  can['flag'] = hasFlagPrivilege && !hasCloseVotePrivilege && !closed;
  can['close'] = hasCloseVotePrivilege && !closed;
  can['delete'] = (hasDeleteVotePrivilege && closed && score <= -3) || isModerator;
  // TODO: also when downvote and/or close vote bring the question into deletion territory

  // Determine which actions to take
  Object.assign(should, can);
  // Comment
  should['comment'] &= !hasNonOwnerComment;
  // Downvote (only when necessary to delete the post, to be slightly more welcoming)
  should['downvote'] &= score > -3 && !isModerator;
  // Delete; only on Meta after request: https://github.com/Glorfindel83/SE-Userscripts/issues/20
  should['delete'] &= isMeta;
  // Upvote other comments (always optional)
  should['upvote'] = false;

  // Generate HTML for dialog
  var html = `
<aside class="s-modal bg-transparent pe-none js-stacks-managed-popup js-fades-with-aria-hidden" id="modal-base" tabindex="-1" role="dialog" aria-labelledby="mod-modal-title" aria-describedby="mod-modal-description" aria-hidden="false">    
    <form class="s-modal--dialog js-modal-dialog js-keyboard-navigable-modal pe-auto" role="document" data-controller="se-draggable" method="get" action="#">
        <h1 class="s-modal--header fs-headline1 fw-bold mr48 c-move js-first-tabbable" id="modal-title" tabindex="0" data-target="se-draggable.handle">
            'Saviour' of Lost Souls
        </h1>
        <div class="flex--item">
            <span class="js-short-label">Please confirm you want to</span>`;
  // NICETOHAVE: hover (title) showing *why* you can't perform a certain action
  html += getHTMLForOption('comment', 'Leave a welcoming comment' + (can['comment'] && hasNonOwnerComment ? ' (note: another user already posted a comment)' : ''));
  if (otherNonOwnerComments.length > 0) {
    html += getHTMLForOption('upvote', 'Upvote all other comments (welcoming comments are always upvoted)');
  }
  html += getHTMLForOption('downvote', 'Downvote the question');
  html += getHTMLForOption('flag', 'Flag the question as off-topic');
  html += getHTMLForOption('close', 'Vote to close the question as off-topic');
  html += getHTMLForOption('delete', 'Vote to delete the question');
  html += `
        </div>
        <br/>
        <div class="d-flex gs8 gsx s-modal--footer">
            <button class="flex--item s-btn s-btn__primary" type="submit" onclick="saviourOfLostSouls.submitDialog();">Confirm</button>
            <button class="flex--item s-btn js-modal-close" type="button" onclick="saviourOfLostSouls.closeDialog();">Cancel</button>
        </div>
        <button class="s-modal--close s-btn s-btn__muted js-modal-close js-last-tabbable" type="button" aria-label="Close" onclick="saviourOfLostSouls.closeDialog();">
            <svg aria-hidden="true" class="svg-icon m0 iconClearSm" width="14" height="14" viewBox="0 0 14 14"><path d="M12 3.41L10.59 2 7 5.59 3.41 2 2 3.41 5.59 7 2 10.59 3.41 12 7 8.41 10.59 12 12 10.59 8.41 7 12 3.41z"></path></svg>
        </button>
    </form>
</aside>`;
  $(document.body).append($(html));
}

function createDialog(question) {  
  // Analyze comments
  let comments = question.find('ul.comments-list');
  var welcomingComments = [];
  var otherNonOwnerComments = [];
  comments.find('li').each(function() {
    let comment = $(this);
    // Comment by post author?
    let commentUser = comment.find('a.comment-user')[0];
    if (commentUser.classList.contains('owner'))
      return;
    // Can we upvote it?
    let upButtons = $(comment).find("a.comment-up");
    if (upButtons.length == 0)
      return;
    // What type of comment is it?
    if (comment.find("span.comment-copy")[0].innerText.toLowerCase().indexOf("welcome to") >= 0) {
      welcomingComments.push(comment);
    } else {
      otherNonOwnerComments.push(comment);
    }
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
    
    if (selected("comment")) {
      // Post comment
      let owner = question.find('div.post-signature.owner');
      let author = owner.find('div.user-details a')[0].innerText;

      let comment = window.location.host === "softwarerecs.stackexchange.com"
       ? ("Hi " + author + ", welcome to [softwarerecs.se]! " +
          "This question does not appear to be about software recommendations, within [the scope defined on meta](https://softwarerecs.meta.stackexchange.com/questions/tagged/scope) and in the [help center](/help/on-topic). " +
          "If you think you can [edit] it to become on-topic, please have a look at the [question quality guidelines](https://softwarerecs.meta.stackexchange.com/q/336/23377).")
       : window.location.host === "hardwarerecs.stackexchange.com"
       ? ("Hi " + author + ", welcome to [hardwarerecs.se]! " +
          "This question does not appear to be about hardware recommendations, within [the scope defined on meta](https://hardwarerecs.meta.stackexchange.com/questions/tagged/scope) and in the [help center](/help/on-topic). " +
          "If you think you can [edit] it to become on-topic, please have a look at the [question quality guidelines](https://hardwarerecs.meta.stackexchange.com/q/205/4495).")
       : window.location.host === "stackapps.com"
       ? ("Hi " + author + ", welcome to Stack Apps! " +
          "This question does not appear to be about the Stack Exchange API or a script or browser extension for Stack Exchange. " +
          "To get an answer from users that have the expertise about the topic of your question you'll have to find and then re-post on the [proper site](https://stackexchange.com/sites). " +
          "Check [How do I ask a good question](/help/how-to-ask) and [What is on topic](/help/on-topic) on the *target* site to make sure your post is in good shape. " +
          "Your question is definitely [off-topic](/help/on-topic) and better deleted here.")
       : window.location.host === "mathoverflow.net"
       ? ("Hi " + author + ", welcome to MathOverflow! " +
          "This site is for mathematicians to ask each other questions about their research. Please have a look at [math.se] to ask general mathematics questions. " +
          "Check [How to ask a good question](https://math.meta.stackexchange.com/q/9959/228959) to make sure your post is in good shape. " +
          "Your question is definitely [off-topic](/help/on-topic) and better deleted here.")
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
      // Upvote comments
      for (let comment of selected("upvote") ? welcomingComments.concat(otherNonOwnerComments) : welcomingComments) {        
        $.post({
          url: "https://" + document.location.host + "/posts/comments/" + comment.attr('data-comment-id') + "/vote/2", // 2 = upvote
          data: "fkey=" + fkey,
          success: function () {
            // NICETOHAVE: set upvote button color
            console.log("Comment upvoted.");
          },
          error: function (jqXHR, textStatus, errorThrown) {
            window.alert("An error occurred, please try again later.");
            console.log("Error: " + textStatus + " " + errorThrown);
          }
        });
      }
    }

    if (selected("downvote")) {
      // Downvote
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

    if (selected("flag") || selected("close")) {
      // Flag/vote to close (which one doesn't matter for the API call)
      $.post({
        url: "https://" + document.location.host + "/flags/questions/" + postID + "/close/add",
        data: "fkey=" + fkey + "&closeReasonId=SiteSpecific&siteSpecificCloseReasonId=" + getCloseReasonID(),
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

    if (selected("delete")) {
      window.setTimeout(function() {
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
            window.alert("An error occurred, please try again later.");href
            console.log("Error: " + textStatus + " " + errorThrown);
          }
        });
      }, 500); // small delay to make sure the close vote is registered
    }
    
    // Dismiss dialog
    $("#modal-base").remove();
    
    // NOTE: if this is done too soon, the delete vote might not be cast.
    if (window.location.pathname.startsWith("/questions/")
     || window.location.pathname.startsWith("/review/")
     || !isModerator) {
      // Reload page; this is less elegant than waiting for all POST calls, but it works.
      window.setTimeout(() => window.location.reload(false), 1000);
    } else {
      // Navigate to question for confirmation
      window.setTimeout(() => {
        window.location.href = "https://" + window.location.host + "/questions/" + postID;
      }, 1000);
    }
  };
}

function getHTMLForOption(name, description) {
  return `
              <fieldset class="mt4 ml4 mb16">
                  <div class="d-flex gs8 gsx ff-row-nowrap ${ can[name] ? '' : 'is-disabled' }">
                      <div class="flex--item">
                          <input class="s-checkbox" type="checkbox" name="${ name }" id="sols-${ name }" ${ can[name] ? '' : 'disabled' } ${ should[name] ? 'checked' : '' }>
                      </div>
                      <label class="flex--item s-label fw-normal" for="sols-${ name }">${ description }</label>
                  </div>
              </fieldset>`;
}

function selected(name) {
  return $("#sols-" + name).prop("checked");
}

// These IDs can be found in the flag dialog, the radio buttons have IDs like "siteSpecificCloseReasonId-1-".
function getCloseReasonID() {
  switch (window.location.host) {
    case "softwarerecs.stackexchange.com":
    case "hardwarerecs.stackexchange.com":
    case "stackapps.com":
      return 1;
    case "meta.stackoverflow.com":
      return 6;
    case "mathoverflow.net":
      return 7;
    default:
      return 8;
  }
}
