// ==UserScript==
// @name        Stack Exchange - Add link to network profile
// @namespace   https://github.com/Glorfindel83/
// @description Adds a link to the network profile for all user profile pages (even if they've hidden the current community)
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/add-network-profile-link/add-network-profile-link.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/add-network-profile-link/add-network-profile-link.user.js
// @version     0.1
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
    // Check if link already present
    let user = $(".user-show-new");
    if (user.find("button[aria-controls='profiles-menu']").length > 0 ||
        user.find("a.s-btn[href^='https://stackexchange.com/users/']").length > 0)
      return;

    // Find network account ID
    let accountID = StackExchange.user.options.accountId;
    
    // Add to profile
    let profile = user[0].children[0];
    let container = profile.children[profile.children.length - 1];
    container.innerHTML = '<ul class="flex--item list-reset"><li role="menuitem">\n' +
      '<a href="https://stackexchange.com/users/' + accountID + '" class="d-flex ai-center ws-nowrap s-btn s-btn__outlined s-btn__muted s-btn__icon s-btn__sm d-flex ai-center">\n' +
      '<svg aria-hidden="true" class="native mln2 mr2 svg-icon iconLogoSEXxs" width="18" height="18" viewBox="0 0 18 18"><path d="M3 4c0-1.1.9-2 2-2h8a2 2 0 012 2H3Z" fill="#8FD8F7"></path><path d="M15 11H3c0 1.1.9 2 2 2h5v3l3-3a2 2 0 002-2Z" fill="#155397"></path><path fill="#46A2D9" d="M3 5h12v2H3z"></path><path fill="#2D6DB5" d="M3 8h12v2H3z"></path></svg>\n' +
      'Network profile</a>\n' +
      '</li></ul>';
  });
})();