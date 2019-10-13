// ==UserScript==
// @name        Stack Exchange Pronoun Assistant
// @namespace   https://github.com/Glorfindel83/
// @description Displays users' pronouns (mentioned in their profiles) in chat
// @author      Glorfindel
// @contributor ArtOfCode
// @contributor wizzwizz4
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @supportURL  https://stackapps.com/questions/8440/pronoun-assistant
// @version     2.0
// @match       *://chat.stackexchange.com/rooms/*
// @match       *://chat.stackoverflow.com/rooms/*
// @match       *://chat.meta.stackexchange.com/rooms/*
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
// @grant       GM_addStyle
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// ==/UserScript==

/* global $, waitForKeyElements */

GM_addStyle(`
.tiny-signature {
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
  width: 100%;
}

.username {
  height: unset !important;
}

.pronouns {
  color: #777;
}
`)

// List of pronouns to look out for
let allPronouns = [
  "him", "his",
  "she", "her?", // that covers 'he' as well
  "they", "them", "their",
  "ze", "hir", "zir",
  "xey", "xem", "xyr"
].join("|");
let pronounListRegex = new RegExp('\\W*((' + allPronouns + ')(\\s*/\\s*(' + allPronouns + '))+)\\W*', 'i');
let myPronounIsRegex = /(https?:\/\/)?(my\.)?pronoun\.is\/[\w/]+/i;
let explicitPronounsRegex = /pronouns:\s*([^.\n)]*)(\.|\n|\)|$)/im;

// Keys:   user IDs
// Values: either a list of DOM elements (specifically, the anchors to chat profiles)
//         or a string with pronouns.
var users = {};
// TODO: cache in local storage

// Adds pronoun information to a user's 'signature' in chat.
function showPronounsForChat(element, pronouns) {
  if (pronouns == "") {
    return;
  }
  // the element might contain both a tiny and a full signature
  element.find("div.username").each(function (index, usernameElement) {
    usernameElement.innerHTML = '<span class="name">' + usernameElement.innerHTML + '</span><br/>'
      + '<span class="pronouns">' + pronouns + '</span>';
  });
}

//
function showPronouns(element, pronouns) {
  if (pronouns == "") {
    return;
  }
  element.after($('<span class="pronouns" style="padding-left: 5px;">' + pronouns + '</span>'));
}

// Check the user's 'about' in their chat profile for pronoun indicators
function getPronouns(aboutMe) {
  // Link to Pronoun Island, e.g.
  // http://my.pronoun.is/she
  var match = myPronounIsRegex.exec(aboutMe);
  if (match != null) {
    return match[0];
  }

  // Explicit pronouns specification, e.g.
  // Pronouns: he/him.
  // The end is indicated by a dot, a newline, or simply the end of the text.
  match = explicitPronounsRegex.exec(aboutMe);
  if (match != null) {
    return match[1];
  }

  // Check for pronouns (see above for the list) joined by a forward slash, e.g.
  // she/her
  // (he/him/his)
  // they / them
  match = pronounListRegex.exec(aboutMe);
  if (match != null) {
    return match[1];
  }

  // No pronouns found
  return "";
}

// Chat signatures
waitForKeyElements("a.signature", function(jNode) {
  let userID = jNode.attr("href").split("/users/")[1];
  if (!users.hasOwnProperty(userID)) {
    users[userID] = [];
    users[userID].push(jNode);
    // Read chat profile
    $.get("https://" + location.host + "/users/thumbs/" + userID + "?showUsage=true", function(data) {
      let pronouns = data.user_message == null ? "" : getPronouns(data.user_message);
      users[userID].forEach(function (element) {
        showPronounsForChat(element, pronouns);
      });
      users[userID] = pronouns;
    });
  } else if (typeof users[userID] == 'string') {
    showPronounsForChat(jNode, users[userID]);
  } else {
    users[userID].push(jNode);
  }
});

// Q&A site signatures
$("div.user-details > a, a.comment-user").each(function() {
  let link = $(this).prop("href");
  let userID = parseInt(link.split("/users/")[1]);
  if (!users.hasOwnProperty(userID)) {    
    users[userID] = [];
    users[userID].push($(this));
    // Read profile
    $.get(link + "?tab=profile", function(data) {
      console.log($(data).find("div.profile-user--bio")[0].innerText);
      let pronouns = getPronouns($(data).find("div.profile-user--bio")[0].innerText);
      users[userID].forEach(function (element) {
        showPronouns(element, pronouns);
      });
      users[userID] = pronouns;
    });
  } else if (typeof users[userID] == 'string') {
    showPronouns($(this), users[userID]);
  } else {
    users[userID].push($(this));
  }
});
