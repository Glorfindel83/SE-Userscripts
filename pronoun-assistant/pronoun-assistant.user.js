// ==UserScript==
// @name        Stack Exchange Pronoun Assistant
// @namespace   https://github.com/Glorfindel83/
// @description Displays users' pronouns (mentioned in their profiles) in chat
// @author      Glorfindel
// @contributor ArtOfCode
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @supportURL  https://stackapps.com/questions/8440/pronoun-assistant
// @version     1.3
// @match       *://chat.stackexchange.com/rooms/*
// @match       *://chat.stackoverflow.com/rooms/*
// @match       *://chat.meta.stackexchange.com/rooms/*
// @grant       GM_addStyle
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

/* global $, waitForKeyElements */

// NICETOHAVE: on main/meta sites as well; right now, there are very few users
// who have indicated their pronouns in their main/meta profile.

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
let explicitPronounsRegex = /pronouns:\s*([^.\n]*)(\.|\n|$)/im;

// Keys:   user IDs
// Values: either a list of DOM elements (specifically, the anchors to chat profiles)
//         or a string with pronouns.
var users = {};
// TODO: cache in local storage

// Adds pronoun information to a user's 'signature' in chat.
function showPronouns(element, pronouns) {
  if (pronouns == "") {
    return;
  }
  // the element might contain both a tiny and a full signature
  element.find("div.username").each(function (index, usernameElement) {
    usernameElement.innerHTML = '<span class="name">' + usernameElement.innerHTML + '</span><br/>'
      + '<span class="pronouns">' + pronouns + '</span>';
  });
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

waitForKeyElements("a.signature", function(jNode) {
  let userID = jNode.attr("href").split("/users/")[1];
  if (!users.hasOwnProperty(userID)) {
    users[userID] = [];
    users[userID].push(jNode);
    // Read chat profile
    $.get("https://" + location.host + "/users/thumbs/" + userID + "?showUsage=true", function(data) {
      let pronouns = data.user_message == null ? "" : getPronouns(data.user_message);
      users[userID].forEach(function (element) {
        showPronouns(element, pronouns);
      });
      users[userID] = pronouns;
    });
  } else if (typeof users[userID] == 'string') {
    showPronouns(jNode, users[userID]);
  } else {
    users[userID].push(jNode);
  }
});
