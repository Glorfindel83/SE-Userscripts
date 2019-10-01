// ==UserScript==
// @name        Stack Exchange Pronoun Assistant
// @namespace   https://github.com/Glorfindel83/
// @description Displays users' pronouns (mentioned in their profiles) in chat
// @author      Glorfindel
// @contributor ArtOfCode
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @version     0.2
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

function addPronouns(element, pronouns) {
  if (pronouns == "")
    return;
  let usernameElement = element.find("div.username")[0];
  usernameElement.innerHTML = '<span class="name">' + usernameElement.innerHTML + '</span><br/>'
    + '<span class="pronouns">' + pronouns + '</span>';
}

if (window.location.host.startsWith("chat.")) {
  waitForKeyElements("a.signature", function(jNode) {
    let userID = jNode.attr("href").split("/users/")[1];
    if (!users.hasOwnProperty(userID)) {
      users[userID] = [];
      users[userID].push(jNode);
      $.get("https://chat.stackexchange.com/users/thumbs/" + userID + "?showUsage=true", function(data) {
        var pronouns = "";
        if (data.user_message != null) {
          // Check the user's 'about' in their chat profile for pronouns (see above for the list)
          // joined by a forward slash.
          // 
          // Examples of what would be detected:
          // - They/them
          // - (he/him/his)
          // Examples of what would *not* be detected (yet):
          // - they / them
          for (let component of data.user_message.split(/\s+/)) {
            if (!component.includes("/"))
              continue;
            let match = pronounsComponent.exec(component);
            if (match == null)
              continue;
            var isAllPronouns = true;
            for (let word of match[1].split("/")) {
              if (!allPronouns.includes(word.toLowerCase())) {
                isAllPronouns = false;
                break;
              }
            };
            if (isAllPronouns) {
              pronouns = component;
              break;
            }
          }          
        }        
        users[userID].forEach(function (element) {
          addPronouns(element, pronouns);
        });
        users[userID] = pronouns;
      });
    } else if (typeof users[userID] == 'string') {
      addPronouns(jNode, users[userID]);
    } else {
      users[userID].push(jNode);
    }
  });
}
