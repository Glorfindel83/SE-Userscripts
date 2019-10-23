// ==UserScript==
// @name        Stack Exchange Pronoun Assistant
// @namespace   https://github.com/Glorfindel83/
// @description Displays users' pronouns (mentioned in their profiles)
// @author      Glorfindel
// @author      ArtOfCode
// @contributor wizzwizz4
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/pronoun-assistant/pronoun-assistant.user.js
// @supportURL  https://stackapps.com/questions/8440/pronoun-assistant
// @version     2.6
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
.pronouns, .pronouns a {
  color: #777;
}
.pronouns {
  word-break: keep-all;
}
.pronouns a:hover {
  text-decoration: underline;
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
let myPronounIsRegex = /(https?:\/\/)?(my\.)?pronoun\.is\/([\w/]+)/i;
let explicitPronounsRegex = /pronouns:\s*([^.\n)\]}<]*)(\.|\n|\)|]|}<|$)/im;

// Keys:   user IDs
// Values: either a list of DOM elements (specifically, the anchors to chat profiles)
//         or a string with pronouns.
var users = {};
// Keys:   user IDs (Q&A only)
// Values: the users' 'about me' values.
var profiles = {};

// If we're on a Q&A site, also cache all changes to the `users` object to save on API calls
if (location.hostname.indexOf("chat") === -1) {
  const localStorageData = localStorage.stackPronounAssistant_users;
  let cached = localStorageData ? JSON.parse(localStorage.stackPronounAssistant_users) : {};

  if (Object.keys(cached).length > 0 && typeof cached[Object.keys(cached)[0]] === "string") {
    // v2.4 and before had no cache expiry, users[userId] was a string.
    // Currently, users[userId] is an array containing a string and an expiry.
    // If we have cached data but it's in <= 2.4 format, delete it - we'll regenerate it instead.
    delete localStorage.stackPronounAssistant_users;
    cached = {};
  }

  const userData = {};
  Object.keys(cached).forEach(k => {userData[parseInt(k, 10)] = cached[k]});
  users = new Proxy(userData, {
    get: (obj, prop) => {
      const data = obj[prop];
      if (!data) {
        return null;
      }
      else {
        const [pronouns, expiry] = data;
        if (expiry < Date.now()) {
          return null;
        }
        else {
          return pronouns;
        }
      }
    },
    set: (obj, prop, value) => {
      obj[prop] = [value, Date.now() + 86400 * 1000]; // 24h expiry
      localStorage.stackPronounAssistant_users = JSON.stringify(userData);
    }
  });
}

// Adds pronoun information to a user's 'signature' in chat.
function showPronounsForChat($element, pronouns) {
  if (pronouns == "") {
    return;
  }
  
  addPronounsToChatSignatures($element, pronouns);

  // After clicking the signature (to show the chat profile popup), *sometimes*
  // (the exact conditions are unclear - it happens in The Bridge but not in the Teachers' Lounge)
  // the signature gets rerendered. In that case, we need to readd the pronouns.
  $element.on("DOMSubtreeModified", function() {
    if ($(this).find(".pronouns").length == 0) {
      $(this).off("DOMSubtreeModified");
      addPronounsToChatSignatures($(this), pronouns);
    }
  });
}

function addPronounsToChatSignatures($element, pronouns) {
  // The element might contain both a tiny and a full signature
  $element.find("div.username").each(function (index, usernameElement) {
    usernameElement.innerHTML = '<span class="name">' + usernameElement.innerHTML + '</span><br/>'
      + '<span class="pronouns"> ' + pronouns + '</span>';
  });
}

// Determines pronoun information and adds it to a user card (under a post) or author information (after a comment)
function decorate($element) {
  const link = $element.attr("href");
  const userId = parseInt(link.split("/users/")[1]);
  if (!users[userId]) {
    // No pronouns calculated yet, we need to calculate and store them.
    users[userId] = getPronouns(profiles[userId], true);
    showPronouns($element, users[userId]);
  } else {
    // We already have the pronouns, we can just use them.
    showPronouns($element, users[userId]);
  }
};

// Adds pronoun information to a user card or author information
function showPronouns($element, pronouns) {
  if (pronouns == "" || $element.siblings(".pronouns").length != 0) {
    return;
  }
  
  // Make sure the pronouns don't end up between the username and the diamond
  if ($element.next("span.mod-flair").length != 0) {
    $element = $element.next("span.mod-flair");
  }
  $element.after($('<span class="pronouns">' + pronouns + '</span>'));
}

// Check text (obtained from the user's 'about me' in their chat profile or Q&A profile) for pronoun indicators
function getPronouns(aboutMe, allowPronounIslandLinks) {
  // Link to Pronoun Island, e.g.
  // http://my.pronoun.is/she
  var match = myPronounIsRegex.exec(aboutMe);
  if (match != null) {
    return allowPronounIslandLinks ? '<a href=\"' + match[0] + '\" target="_blank">' + match[0] + '</a>'
      : match[3];
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
  if (!users[userID]) {
    users[userID] = [];
    users[userID].push(jNode);
    // Read chat profile
    $.get("https://" + location.host + "/users/thumbs/" + userID + "?showUsage=true", function(data) {
      let pronouns = data.user_message == null ? "" : getPronouns(data.user_message, false);
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

// Selector for Q&A sites
const selector = "div.user-details > a, a.comment-user";

// Q&A site user cards & comment usernames
(async () => {
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  };

  const userIds = [];
  const $userElements = $(selector);

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

  $userElements.each(function() { decorate($(this)); });
  
  // Make sure new answers / comments receive the same treatment
  waitForKeyElements(selector, function(jNode) {
    decorate($(jNode));
  });
})();
