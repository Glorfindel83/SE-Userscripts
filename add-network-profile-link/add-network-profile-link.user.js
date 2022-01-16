// ==UserScript==
// @name        Stack Exchange - Add link to network and chat profiles
// @namespace   https://github.com/Glorfindel83/
// @description Adds a link to the network profile for all user profile pages (even if they've hidden the current community) and a link to the chat profile
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/add-network-profile-link/add-network-profile-link.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/add-network-profile-link/add-network-profile-link.user.js
// @version     0.4
// @match       *://*.stackexchange.com/users/*
// @match       *://*.stackoverflow.com/users/*
// @match       *://*.superuser.com/users/*
// @match       *://*.serverfault.com/users/*
// @match       *://*.askubuntu.com/users/*
// @match       *://*.stackapps.com/users/*
// @match       *://*.mathoverflow.net/users/*
// @exclude     *://stackexchange.com/users/*
// @grant       none
// ==/UserScript==
(function () {
  'use strict';
  
  // Some pages (e.g. https://*.stackexchange.com/users/message/create/*) need to be skipped
  if (typeof(StackExchange.user) == 'undefined')
    return;

  StackExchange.ready(function() {
    // Find user IDs
    let userID = StackExchange.user.options.userId;
    let accountID = StackExchange.user.options.accountId;
    
    // Check if link already present
    let user = $(".user-show-new");
    var existingButton = user.find("button[aria-controls='profiles-menu']");
    if (existingButton.length == 0) {
      existingButton = user.find("a.s-btn[href^='https://stackexchange.com/users/']").parents("ul");
    }
    if (existingButton.length == 0) {
      // Add link to network profile
      let profile = user[0].children[0];
      if (profile.classList.contains("system-alert")) {
        // Suspension message, take the next one
        profile = user[0].children[1];
      }
      let container = profile.children[profile.children.length - 1];
      let networkProfileButton = '<a class="flex--item s-btn s-btn__outlined s-btn__muted s-btn__icon s-btn__sm" href="https://stackexchange.com/users/' + accountID + '" class="d-flex ai-center ws-nowrap s-btn s-btn__outlined s-btn__muted s-btn__icon s-btn__sm d-flex ai-center">\n' +
        '<svg aria-hidden="true" class="native mln2 mr2 svg-icon iconLogoSEXxs" width="18" height="18" viewBox="0 0 18 18"><path d="M3 4c0-1.1.9-2 2-2h8a2 2 0 012 2H3Z" fill="#8FD8F7"></path><path d="M15 11H3c0 1.1.9 2 2 2h5v3l3-3a2 2 0 002-2Z" fill="#155397"></path><path fill="#46A2D9" d="M3 5h12v2H3z"></path><path fill="#2D6DB5" d="M3 8h12v2H3z"></path></svg>\n' +
        'Network profile</a>';
      // Main/meta profile switcher?
      existingButton = user.find("a.s-btn[href*='/users/']").parents("ul");
      if (existingButton.length == 0) {
        container.innerHTML = networkProfileButton;
        existingButton = $(container).children();
      } else {
        existingButton.after(networkProfileButton);
      }
    }
    
    // Add link to chat profile
    // NICETOHAVE: add as part of dropdown menu
    var chatProfile;
    switch (location.host) {
      case 'meta.stackexchange.com':
        chatProfile = 'https://chat.meta.stackexchange.com/users/' + userID;
        break;
      case 'stackoverflow.com':
      case 'meta.stackoverflow.com':
        chatProfile = 'https://chat.stackoverflow.com/users/' + userID;
        break;
      default:
        chatProfile = 'https://chat.stackexchange.com/account/' + accountID;
        break;
    }
    existingButton.before('<a class="flex--item s-btn s-btn__outlined s-btn__muted s-btn__icon s-btn__sm" href="' + chatProfile + '" class="d-flex ai-center ws-nowrap s-btn s-btn__outlined s-btn__muted s-btn__icon s-btn__sm d-flex ai-center">\n' +
        'Chat profile</a>');
  });
})();