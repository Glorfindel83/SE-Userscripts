// ==UserScript==
// @name        'Saviour' of Lost Souls
// @namespace   https://github.com/Glorfindel83/
// @description Adds a shortcut to down-/close-/delete vote and post a welcoming comment to Lost Souls on Meta Stack Exchange.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/saviour-of-lost-souls/saviour-of-lost-souls.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/saviour-of-lost-souls/saviour-of-lost-souls.user.js
// @version     0.1.1
// @match       *://meta.stackexchange.com/questions/*
// @exclude     *://meta.stackexchange.com/questions/ask
// @grant       none
// ==/UserScript==

(function () {
  "use strict";

  // Check author reputation = 1
  let owner = $('div.post-signature.owner');
  let reputation = owner.find('span.reputation-score')[0].innerText;
  if (reputation != "1") {
    return;
  }

  // My reputation; you need 5 reputation to comment
  let myReputation = parseInt($('a.my-profile div.-rep')[0].innerText.replace(/,/g, ''));
  if (myReputation < 5) {
    return;
  }
  let isModerator = $("a.js-mod-inbox-button").length > 0;
  
  // Add post menu button
  let question = $('#question');
  let menu = question.find('div.post-menu');
  menu.append($('<span class="lsep">|</span>'));
  let button = $('<a href="#" title="down-/close-/delete vote and post a welcoming comment">lost soul</a>');
  menu.append(button);
  button.click(function() {
    if (!confirm('Are you sure you want to down-/close-/delete vote and post a welcoming comment?'))
      return;
    
    // Downvoted?
    let downvoted = question.find('a.vote-down-on').length > 0;

    // Closed?
    let status = $('div.question-status h2 b');
    let statusText = status.length > 0 ? status[0].innerText : '';
    let closed = statusText == 'marked' || statusText == 'put on hold' || statusText == 'closed';
    
    // Prepare votes/comments
    let postID = parseInt(question.attr('data-questionid'));
    console.log('Lost soul #' + postID);
    let fkey = window.localStorage["se:fkey"].split(",")[0];
    
    // Is there any comment not by the author?
    let comments = question.find('ul.comments-list');
    var nonOwnerComment = false;
    comments.find('a.comment-user').each(function() {
      if (!$(this).hasClass('owner')) {
        nonOwnerComment = true;
      }
    });
    if (!nonOwnerComment) {
      // Post comment
      let author = owner.find('div.user-details a')[0].innerText;
      let comment = "Hi " + author + ", welcome to Meta! " +
        "I'm not sure which search brought you here but the problem you describe will not be answered on this specific site. " +
        "To get an answer from users that have the expertise about the topic of your question you'll have to find and then re-post on the [proper site](https://stackexchange.com/sites). " +
        "Check [How do I ask a good question](/help/how-to-ask) and [What is on topic](/help/on-topic) on the *target* site to make sure your post is in good shape. " +
        "Your question is definitely off-topic on [Meta](/help/whats-meta) and is better deleted here.";
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
    
    // You can't flag without 15 rep
    if (myReputation < 15)
      return;    

    if (myReputation >= 100 && !downvoted) {
      // Downvote
      $.post({
        url: "https://" + document.location.host + "/posts/" + postID + "/vote/3", // 3 = downvote
        data: "fkey=" + fkey,
        success: function () {
          // TODO: set downvote button color
          console.log("Downvote cast.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          window.alert("An error occurred, please try again later.");
          console.log("Error: " + textStatus + " " + errorThrown);
        }
      });
    }
    
    if (!closed) {
      // Flag/vote to close (doesn't matter for the API call)
      $.post({
        url: "https://" + document.location.host + "/flags/questions/" + postID + "/close/add",
        data: "fkey=" + fkey + "&closeReasonId=OffTopic&closeAsOffTopicReasonId=8",
        success: function () {
          // TODO: update close vote count
          console.log("Close flag/vote cast.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          window.alert("An error occurred, please try again later.");
          console.log("Error: " + textStatus + " " + errorThrown);
        }
      });
    } else if (myReputation >= 20000 || isModerator) {
      // Delete vote
      // TODO, at least for non-moderators: only if score <= -3, maybe also if myReputation >= 10000 and question age >= 48 hours
      $.post({
        url: "https://" + document.location.host + "/posts/" + postID + "/vote/10", // 10 = delete
        data: "fkey=" + fkey,
        success: function () {
          // TODO: update delete vote count
          console.log("Delete vote cast.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          window.alert("An error occurred, please try again later.");
          console.log("Error: " + textStatus + " " + errorThrown);
        }
      });
    }
    
    // TODO: reload page after all calls are finished
  });  
})();
