// ==UserScript==
// @name        Stack Exchange Pronoun Assistant
// @namespace   https://github.com/Glorfindel83/
// @description Displays users' pronouns (mentioned in their profiles) in chat
// @author      Glorfindel
// @contributor ArtOfCode
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @version     0.3
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.askubuntu.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.mathoverflow.net/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.*.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @grant       GM_addStyle
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

/* global $ */

GM_addStyle(`
.tiny-signature {
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
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
  "he", "him", "his",
  "she", "her",
  "they", "them", "their",
  "ze", "hir", "zir",
  "xey", "xem", "xyr"
];
// Regex to detect instances where users put the pronouns inside parentheses etc.,
// e.g. (he/him)
let pronounsComponent = /^[^\w\/]*([\w\/]+)[^\w\/]*$/;

// Keys: user IDs
// Values: either a list of DOM elements (specifically, the anchors to chat profiles)
//         or a string with pronouns.
var users = {};
// TODO: cache in local storage

// Adds pronoun information to a user's 'signature' in chat.
function showPronouns(element, pronouns) {
  if (pronouns == "")
    return;
  // the element might contain both a tiny and a full signature
  element.find("div.username").each(function (index, usernameElement) {
    usernameElement.innerHTML = '<span class="name">' + usernameElement.innerHTML + '</span><br/>'
      + '<span class="pronouns">' + pronouns + '</span>';
  });
}

// Check the user's 'about' in their chat profile for pronouns (see above for the list)
// joined by a forward slash.
// 
// Examples of what would be detected:
// - "They/them"
// - "(he/him/his)"
// Examples of what would *not* be detected (yet):
// - "they / them"
function getPronouns(aboutMe) {
  for (let component of aboutMe.split(/\s+/)) {
    if (!component.includes("/"))
      continue;
    let match = pronounsComponent.exec(component);
    if (match == null)
      continue;
    var isOnlyPronouns = true;
    for (let word of match[1].split("/")) {
      if (!allPronouns.includes(word.toLowerCase())) {
        isOnlyPronouns = false;
        break;
      }
    };
    if (isOnlyPronouns)
      return match[1];
  }
  return ""
}

// NICETOHAVE: on main/meta sites as well; right now, there are very few users
// who have indicated their pronouns in their main/meta profile.
if (window.location.host.startsWith("chat.")) {
  waitForKeyElements("a.signature", function(jNode) {
    let userID = jNode.attr("href").split("/users/")[1];
    if (!users.hasOwnProperty(userID)) {
      users[userID] = [];
      users[userID].push(jNode);
      // Read chat profile
      $.get("https://chat.stackexchange.com/users/thumbs/" + userID + "?showUsage=true", function(data) {
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
}
