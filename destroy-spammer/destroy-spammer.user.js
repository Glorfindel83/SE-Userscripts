// ==UserScript==
// @name        Destroy Spammer
// @namespace   https://github.com/Glorfindel83/
// @description Adds a 'Destroy spammer' link for moderator on user profiles with only deleted posts.
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/destroy-spammer/destroy-spammer.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/destroy-spammer/destroy-spammer.user.js
// @version     0.9.2
// @match       *://*.stackexchange.com/users/*
// @match       *://*.stackoverflow.com/users/*
// @match       *://stackoverflow.com/users/*
// @match       *://superuser.com/users/*
// @match       *://serverfault.com/users/*
// @match       *://askubuntu.com/users/*
// @match       *://stackapps.com/users/*
// @match       *://mathoverflow.net/users/*
// @exclude     *://stackexchange.com/users/*
// @exclude     *://chat.stackexchange.com/users/*
// @exclude     *://chat.stackoverflow.com/users/*
// @exclude     *://chat.meta.stackexchange.com/users/*
// @grant       none
// ==/UserScript==
(function () {
  'use strict';
  
  // Determine user ID
  var userIDRegex = /\/users\/(\d+)\//g.exec(document.location);
  if (userIDRegex == null)
    return; // e.g. flag summary page
  var userID = userIDRegex[1];
  var userName = $(".fs-headline2").text().trim();
  var userNameIsSuspicious = typeof userName !== 'undefined' && userName.toLowerCase().contains("insur");

  // Find 'Mod' dialog link
  var moderatorLinkElement = $('a[data-se-mod-button-id=' + userID + ']');
  if (moderatorLinkElement.length == 0) // Current user is not a moderator, or wrong tab - no action possible
    return;
  var destroySpammerLinkAdded = false;
  
  // This function will create the 'Destroy spammer' link;
  // this can happen either synchronously or asynchronously (after fetching additional data).
  var createDestroyLink = function (userID) {
    // The link can be added only once.
    if (destroySpammerLinkAdded)
      return;
    destroySpammerLinkAdded = true;
    
    var destroyLink = document.createElement('a');
    destroyLink.setAttribute('class', 'grid--cell');
    destroyLink.setAttribute('style', 'padding-right: 16px');
    destroyLink.appendChild(document.createTextNode('Destroy spammer'));
    destroyLink.onclick = function () {
      // Ask for confirmation
      if (window.confirm('Are you sure?')) {
      	// TODO: remember the last time this script was activated,
      	// and build in a 5 second delay to prevent the rate limit from triggering.
        $.post({
          url: 'https://' + document.location.host + '/admin/users/' + userID + '/destroy',
          data: 'annotation=&deleteReasonDetails=&mod-actions=destroy&destroyReason=This+user+was+created+to+post+spam+or+nonsense+and+has+no+other+positive+participation&destroyReasonDetails=&fkey=' + window.localStorage["se:fkey"].split(",")[0],
          success: function (data) {
            // Reload page
            window.location.reload();
          },
          error: function (jqXHR, textStatus, errorThrown) {
            window.alert('An error occurred, please try again later.');
            console.log('Error: ' + textStatus + ' ' + errorThrown);
          }
        });
      }
    };
    
    // Add to document
    moderatorLinkElement.after(destroyLink);
  };
  
  // Check for keywords in spammers' profiles
  $.get(document.location.href.split('?')[0] + "?tab=profile", function (data) {
    if (data.search(/1\D844\D909\D0831/g) != -1) {
      createDestroyLink(userID);
    }
  });

  // Check for (deleted) questions and answers
  var questionsPanel = $('#user-panel-questions');
  var undeletedQuestions = questionsPanel.find('div.p12').not('.bg-red-050').length;
  var deletedQuestions = questionsPanel.find('div.p12.bg-red-050').length;
  if (undeletedQuestions > 0) // User has content - use the dialog instead
    return;
  var answersPanel = $('#user-panel-answers');
  var undeletedAnswers = answersPanel.find('div.p12').not('.bg-red-050').length;
  var deletedAnswers = answersPanel.find('div.p12.bg-red-050').length;
  if (undeletedAnswers > 0) // User has content - use the dialog instead
    return;
  if (deletedQuestions + deletedAnswers == 0 && !userNameIsSuspicious) // User has no deleted content - use the dialog instead
    return;
  if (deletedQuestions + deletedAnswers > 4) // User has too much deleted content - use the dialog instead
    return;
  
  // Create Destroy link immediately
  createDestroyLink(userID);
}) ();
