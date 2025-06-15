// ==UserScript==
// @name        Stack Exchange Rejoin Favorite Chatrooms
// @namespace   https://github.com/Glorfindel83/
// @description Adds a link to rejoin favorite chatrooms, even if you're in multiple ones already
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/rejoin-favorite-chatrooms/rejoin-favorite-chatrooms.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/rejoin-favorite-chatrooms/rejoin-favorite-chatrooms.user.js
// @supportURL  https://stackapps.com/q/9336/34061
// @version     0.2
// @match       *://chat.stackexchange.com/rooms/*
// @match       *://chat.stackoverflow.com/rooms/*
// @match       *://chat.meta.stackexchange.com/rooms/*
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

/* global $, waitForKeyElements */

waitForKeyElements("#my-rooms", function(jNode) {
  let message = $(jNode).siblings("div.fr.msg-small");
  let button = $("<a style='margin-left: 20px; cursor: pointer;'>rejoin favorite rooms</a>");
  button.click(function() {
    $.post('https://' + location.host + '/chats/join/favorite', {
      quiet: true,
      immediate: true,
      fkey: document.getElementById("fkey").value
    });
  });
  message.append(button);
});

// Remove the new link to the FAQ. It takes up too much vertical space, and the handful of users using this script won't need that link here anyway.
$("#learnmore").remove();