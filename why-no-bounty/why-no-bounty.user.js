// ==UserScript==
// @name        Why No Bounty?
// @namespace   https://github.com/Glorfindel83/
// @description Adds information to a question indicating why you can't start a bounty.
// @author      Glorfindel
// @version     0.3
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.askubuntu.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.mathoverflow.net/*
// @grant       none
// ==/UserScript==

(function () {
  "use strict";

  // Is this a Q&A page?
  var questionLink = $("#question-header a").attr("href");
  if (typeof(questionLink) === "undefined") {
    return;
  }

  // If there's a 'start a bounty' or 'question eligible for bounty in x days' link, we have nothing to do.
  if ($("a.bounty-link.bounty").length !== 0 || $("a[href='/help/bounty']").length !== 0) {
    return;
  }
  
  var addInformation = function (message) {
    $("#question > table > tbody").append("<tr class=\"bounty-notification\"><td class=\"votecell\"/>"
      + "<td style=\"color: gray; padding: 5px 0 0 3px\">bounty not possible: " + message + "</td></tr>");
  };
  
  // Meta site?
  if (window.location.host != "meta.stackexchange.com" && window.location.host.contains("meta")) {
    addInformation("meta sites don't allow bounties");
    return;
  }
  
  // Is there an open bounty?
  if ($("div.question-status.bounty").length !== 0) {
  	addInformation("there is already an open bounty");
    return;
  }
  
  // Is the question closed / locked?
  var questionStatus = $("#question .question-status h2 b");
  if (questionStatus.length !== 0) {
    var status = questionStatus.get(0).innerText;
    if (status === "closed" || status === "put on hold" || status == "marked") {
      addInformation("the question is closed");
      return;
    } else if (status === "locked") {
      addInformation("the question is locked");
      return;
    } else if (status === "deleted") {
      addInformation("the question is deleted");
      return;
    }
  }
  
  // Is the question at least two days old?
  var creationDate = Date.parse($("#question .owner .user-action-time span").attr("title"));
  var ageInSeconds = (Date.now() - creationDate)  / 1000;
  if (ageInSeconds < 2 * 86400) {
    addInformation("the question is not two days old yet");
    return;
  }
  
  // Get reputation of current user
  var reputation = parseInt($("div.-rep.js-header-rep").text().replace(",", ""), 10);
  if (reputation < 75) {
    addInformation("you need 75 reputation to create a bounty");
    return;
  }
  
  // Does the user have an answer to this question?
  var profileURL = $("a.my-profile.js-gps-track").attr("href");
  var hasAnswer = $(".answercell .user-details a").is(function(index, element) {
    return $(element).attr("href") == profileURL;
  });
  if (hasAnswer && reputation < 100) {
    addInformation("you need 100 reputation to create a bounty for a question which you've already answered");
    return;
  }
  
  // Find previous bounties on this question by current user
  var questionID = /^\/questions\/(\d+)\//.exec(questionLink)[1];
  $.get("https://" + window.location.host + "/users/current?tab=bounties&sort=offered", function (data) {
    var summaries = $(data).find("#question-summary-" + questionID);
    var minimumBounty = 50;
    if (summaries.length !== 0) {
      // assume the last (highest) bounty is the first in this list
      var highestBounty = parseInt(summaries[0].find("div.bounty-indicator").replace("+", ""), 10);
      minimumBounty = highestBounty * 2;
      if (minimumBounty > 500) {
        addInformation("the last bounty was " + highestBounty + " which cannot be doubled"); 
        return;
      }
    }
    if (reputation < minimumBounty) {
      addInformation("the minimum bounty (" + minimumBounty + ") is higher than your reputation (" + reputation + ")"); 
      return;
    }
    
    // Find currently active bounties by current user
    $.get("https://" + window.location.host + "/users/current?tab=bounties&sort=active", function (data) {
      var activeCount = parseInt($(data).find("#user-tab-bounties h1 span.count").text(), 10);
      if (activeCount >= 3) {
        addInformation("you currently have " + activeCount + " active bounties"); 
        return;
      }
    });
  });  
})();
