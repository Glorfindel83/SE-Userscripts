// ==UserScript==
// @name        Destroy Spammer
// @namespace   https://github.com/Glorfindel83/
// @description Adds a 'Destroy spammer' link for moderator on user profiles with only deleted posts.
// @author      Glorfindel
// @version     0.4.5
// @match       *://*.stackexchange.com/users/*
// @match       *://*.stackoverflow.com/users/*
// @match       *://stackoverflow.com/users/*
// @match       *://superuser.com/users/*
// @match       *://serverfault.com/users/*
// @match       *://askubuntu.com/users/*
// @match       *://stackapps.com/users/*
// @match       *://mathoverflow.net/users/*
// @grant       none
// ==/UserScript==
(function () {
  "use strict";

  // Determine user ID
  var userIDRegex = /\/users\/(\d+)\//g;
  var userID = userIDRegex.exec(document.location)[1];
  var userName = $(".name.mod-tabs").attr("title");
  var userNameIsSuspicious = typeof userName !== "undefined" && userName.toLowerCase().contains("insur");

  // Find 'Mod' dialog link
  var moderatorLinkElement = $("a#user-moderator-link-" + userID);
  if (moderatorLinkElement.length === 0) {
    return; // Current user is not a moderator, or wrong tab - no action possible
  }
  var destroySpammerLinkAdded = false;

  // This function will create the 'Destroy spammer' link;
  // this can happen either synchronously or asynchronously (after fetching additional data).
  var createDestroyLink = function (userID) {
    // The link can be added only once.
    if (destroySpammerLinkAdded) {
      return;
    }
    destroySpammerLinkAdded = true;

    var destroyLink = document.createElement("a");
    destroyLink.appendChild(document.createTextNode("Destroy spammer"));
    destroyLink.onclick = function () {
      // Ask for confirmation
      if (window.confirm("Are you sure?")) {
        // TODO: remember the last time this script was activated,
        // and build in a 5 second delay to prevent the rate limit from triggering.
        $.post({
          url: "https://" + document.location.host + "/admin/users/" + userID + "/destroy",
          data: "annotation=&deleteReasonDetails=&mod-actions=destroy&destroyReason=This+user+was+created+to+post+spam+or+nonsense+and+has+no+other+positive+participation&destroyReasonDetails=&fkey=" + window.localStorage["se:fkey"].split(",")[0],
          success: function () {
            // Reload page
            window.location.reload();
          },
          error: function (jqXHR, textStatus, errorThrown) {
            window.alert("An error occurred, please try again later.");
            console.log("Error: " + textStatus + " " + errorThrown);
          }
        });
      }
    };

    // Add to document
    moderatorLinkElement.after(destroyLink);
  };

  // Check for keywords in spammers' profiles
  $.get(document.location.href.split("?")[0] + "?tab=profile", function (data) {
    if (data.search(/1\D844\D909\D0831/g) !== -1) {
      createDestroyLink(userID);
    }
  });

  // Check for (deleted) questions and answers
  var questionsPanel = $("#user-panel-questions");
  var undeletedQuestions = questionsPanel.find("td.question-hyperlink").not(".deleted-answer").length; // yes, deleted-answer. Don"t ask why.
  var deletedQuestions = questionsPanel.find("td.question-hyperlink.deleted-answer").length;
  if (undeletedQuestions > 0) {
    return; // User has content - use the dialog instead
  }
  var answersPanel = $("#user-panel-answers");
  var undeletedAnswers = answersPanel.find("td.answer-hyperlink").not(".deleted-answer").length;
  var deletedAnswers = answersPanel.find("td.answer-hyperlink.deleted-answer").length;
  if (undeletedAnswers > 0) {
    return; // User has content - use the dialog instead
  }
  if (deletedQuestions + deletedAnswers === 0 && !userNameIsSuspicious) {
    return; // User has no deleted content - use the dialog instead
  }
  if (deletedQuestions + deletedAnswers > 4) {
    return;  // User has too much deleted content - use the dialog instead
  }

  // Create Destroy link immediately
  createDestroyLink(userID);
})();
