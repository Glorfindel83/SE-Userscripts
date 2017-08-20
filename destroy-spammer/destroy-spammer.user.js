// ==UserScript==
// @name        Destroy Spammer
// @namespace   https://github.com/Glorfindel83/
// @description Adds a 'Destroy spammer' link for moderator on user profiles with only deleted posts.
// @author      Glorfindel
// @version     0.3.1
// @match       *://*.stackexchange.com/users/*
// @match       *://*.stackoverflow.com/users/*
// @match       *://*.superuser.com/users/*
// @match       *://*.serverfault.com/users/*
// @match       *://*.askubuntu.com/users/*
// @match       *://*.stackapps.com/users/*
// @match       *://*.mathoverflow.net/users/*
// @grant       none
// ==/UserScript==
(function () {
  'use strict';
  // Determine user ID
  var userIDRegex = /\/users\/(\d+)\//g;
  var userID = userIDRegex.exec(document.location) [1];
  var moderatorLinkElement = $('a#user-moderator-link-' + userID);
  if (moderatorLinkElement.length == 0) // Current user is not a moderator - no action possible
    return;
    
  // Check for (deleted) questions and answers
  var questionsPanel = $('#user-panel-questions');
  var undeletedQuestions = questionsPanel.find('td.question-hyperlink').not('.deleted-answer').length; // yes, deleted-answer. Don't ask why.
  var deletedQuestions = questionsPanel.find('td.question-hyperlink.deleted-answer').length;
  if (undeletedQuestions > 0) // User has content - use the dialog instead
    return;
  var answersPanel = $('#user-panel-answers');
  var undeletedAnswers = answersPanel.find('td.answer-hyperlink').not('.deleted-answer').length;
  var deletedAnswers = answersPanel.find('td.answer-hyperlink.deleted-answer').length;
  if (undeletedAnswers > 0) // User has content - use the dialog instead
    return;
  if (deletedQuestions + deletedAnswers == 0) // User has no deleted content - use the dialog instead
    return;
  if (deletedQuestions + deletedAnswers > 4) // User has too much deleted content - use the dialog instead
    return;
    
  // Create Destroy link
  var destroyLink = document.createElement('a');
  destroyLink.appendChild(document.createTextNode('Destroy spammer'));
  destroyLink.onclick = function () {
    // Ask for confirmation
    if (window.confirm('Are you sure?')) {
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
}) ();
