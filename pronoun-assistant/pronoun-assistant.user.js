// ==UserScript==
// @name        Stack Exchange Pronoun Assistant
// @namespace   https://github.com/Glorfindel83/
// @description Displays users' pronouns
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @version     0.1
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
// @grant       none
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

/* global $ */

let pronouns = [
  "he", "him", "his",
  "she", "her",
  "they", "them",
  "ze", "hir", "zir",
  "xey", "xem", "xyr"
];
let pronounsComponent = /^[^\w\/]*([\w\/]+)[^\w\/]*$/;
var users = {};

function addInformation(element, information) {
  if (information != "") {
    element.append($("<span>" + information + "</span>"));
  }
}

if (window.location.host.startsWith("chat.")) {
  waitForKeyElements("a.signature", function(jNode) {
    let userID = jNode.attr("href").split("/users/")[1];
    if (!users.hasOwnProperty(userID)) {
      users[userID] = [];
      users[userID].push(jNode);
      $.get("https://chat.stackexchange.com/users/thumbs/" + userID + "?showUsage=true", function(data) {
        var information = "";
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
            var allPronouns = true;
            for (let word of pronounsComponent.exec(component)[1].split("/")) {
              if (!pronouns.includes(word.toLowerCase())) {
                allPronouns = false;
                break;
              }
            };
            if (allPronouns) {
              information = component;
              break;
            }
          }          
        }        
        users[userID].forEach(function (element) {
          addInformation(element, information);
        });
        users[userID] = information;
      });
    } else if (typeof users[userID] == 'string') {
      addInformation(jNode, users[userID]);
    } else {
      users[userID].push(jNode);
    }
  });
}
