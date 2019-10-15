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
// @version     2.1
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
  padding-left: 5px;
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

// If we're on a Q&A site, also cache all changes to the `users` object to save on API calls
if (location.hostname.indexOf("chat") === -1) {
  const localStorageData = localStorage.stackPronounAssistant_users;
  const cached = localStorageData ? JSON.parse(localStorage.stackPronounAssistant_users) : {};
  const userData = Object.keys(cached).forEach(k => userData[parseInt(k, 10)] = cached[k]);
  users = new Proxy(userData, {
    get: (obj, prop) => userData,
    set: (obj, prop, value) => {
      obj[prop] = value;
      localStorage.stackPronounAssistant_users = JSON.stringify(userData);
  });
}

// Adds pronoun information to a user's 'signature' in chat.
function showPronounsForChat(element, pronouns) {
  if (pronouns == "") {
    return;
  }
  // the element might contain both a tiny and a full signature
  element.find("div.username").each(function (index, usernameElement) {
    usernameElement.innerHTML = '<span class="name">' + usernameElement.innerHTML + '</span><br/>'
      + '<span class="pronouns">' + pronouns.replace(/(<([^>]+)>)/ig, "") + '</span>';
  });
}

function showPronouns(element, pronouns) {
  if (pronouns == "") {
    return;
  }
  element.after($('<span class="pronouns">' + pronouns.replace(/(<([^>]+)>)/ig, "") + '</span>'));
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
    // We already have the pronouns, we can just use them.
    showPronounsForChat(jNode, users[userID]);
  } else {
    // User appearing multiple times, their profile is already being fetched.
    users[userID].push(jNode);
  }
});

// Q&A site user cards & comment usernames
(async () => {
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  };
  
  const userIds = [];
  const profiles = {};
  
  const $userElements = $("div.user-details > a, a.comment-user");
  
  // Grab all the user IDs out of a page first. We'll go back over them later to add pronouns in.
  $userElements.each(function() {
    const link = $(this).attr("href");
    if (!link.startsWith("/users/")) {
      // not a user card, but a community wiki post
      return;
    }
    const userId = parseInt(link.split("/users/")[1]);
    if (userIds.indexOf(userId) === -1) {
      userIds.push(userId);
    }
  });
  
  // Split the list into 100-item pages and grab profiles for each page.
  // This works because splice modifies the userIds array in-place, removing elements from the front and
  // returning them into the `page` variable. When we've used them all, the array will be empty.
  while (userIds.length > 0) {
    const page = userIds.splice(0, 100);
    
    const resp = await fetch("https://api.stackexchange.com/2.2/users/" + page.join(';') + "?site=" + location.hostname
                             + "&key=L8n*CvRX3ZsedRQicxnjIA((&filter=!23IboywNfWUzv_nydJbn*&pagesize=100");
    const data = await resp.json();
    if (typeof data.items !== 'undefined') {
      data.items.forEach(i => {
        profiles[i.user_id] = i.about_me;
      });
    }
    
    if (data.backoff) {
      // Respect backoffs, not just pronouns.
      await sleep(data.backoff * 1000);
    }
  }
  
  $userElements.each(function() {
    const link = $(this).attr("href");
    const userId = parseInt(link.split("/users/")[1]);
    if (!users.hasOwnProperty(userId)) {
      // No pronouns calculated yet, we need to calculate and store them.
      users[userId] = getPronouns(profiles[userId]);
      showPronouns($(this), users[userId]);
    }
    else {
      // We already have the pronouns, we can just use them.
      showPronouns($(this), users[userId]);
    }
  });
})();
