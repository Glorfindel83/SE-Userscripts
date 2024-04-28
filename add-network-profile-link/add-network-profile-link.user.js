// ==UserScript==
// @name        Stack Exchange - Add link to network and chat profiles
// @namespace   https://github.com/Glorfindel83/
// @description Adds a link to the network profile for all user profile pages (even if they've hidden the current community) and a link to the chat profile
// @author      Glorfindel
// @contributor Spevacus
// @contributor Cody Gray
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/add-network-profile-link/add-network-profile-link.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/add-network-profile-link/add-network-profile-link.user.js
// @supportURL  https://stackapps.com/q/9328
// @version     1.3
// @match       *://*.stackexchange.com/users/*
// @match       *://*.stackoverflow.com/users/*
// @match       *://*.superuser.com/users/*
// @match       *://*.serverfault.com/users/*
// @match       *://*.askubuntu.com/users/*
// @match       *://*.stackapps.com/users/*
// @match       *://*.mathoverflow.net/users/*
// @exclude     *://stackexchange.com/users/*
// @exclude     *://area51.stackexchange.com/users/*
// @exclude     *://chat.stackexchange.com/users/*
// @exclude     *://chat.stackoverflow.com/users/*
// @exclude     *://chat.meta.stackexchange.com/users/*
// @grant       none
// ==/UserScript==
/* globals $:readonly, StackExchange:readonly */

(function () {
  'use strict';

  if ((typeof(StackExchange) === 'undefined') ||
      (typeof(StackExchange.ready) !== 'function')) {
    return;
  }

  StackExchange.ready(function() {
    // Attempt to get user IDs.
    // These will not be available on some pages (e.g. https://*.stackexchange.com/users/message/create/*).
    // We will skip (bail out) for all pages where this information is not accessible.
    const userID = StackExchange.user?.options?.userId;
    const chatID = StackExchange.user?.options?.accountId;
    if ((typeof(userID) === 'undefined') ||
        (typeof(chatID) === 'undefined')) return;

    // Check if link to the network profile is already present.
    const user = $("#mainbar-full.user-show-new");
    let networkProfileButton = user.find('a[href^="https://stackexchange.com/users/"]');
    let existingButtons = user.find('button[aria-controls="profiles-menu"]');
    if (existingButtons.length === 0) existingButtons = networkProfileButton.parents('ul');
    if (existingButtons.length === 0) {
      // Since it doesn't already exist (probably because the user has hidden this site),
      // add a button linking to their network profile.
      let profile = user[0].children[0];
      if (profile.classList.contains('system-alert')) profile = user[0].children[1]; // this is a suspension message; take the next one
      const networkProfileButtonHtml = `<a href="https://stackexchange.com/users/${chatID}?tab=accounts" class="d-flex ai-center ws-nowrap s-btn s-btn__outlined s-btn__muted s-btn__icon s-btn__sm">
                                         <svg aria-hidden="true" class="native mln2 mr2 svg-icon iconLogoSEXxs" width="18" height="18" viewBox="0 0 18 18"><path d="M3 4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2H3Z" fill="#8FD8F7"></path><path d="M15 11H3c0 1.1.9 2 2 2h5v3l3-3a2 2 0 0 0 2-2Z" fill="#155397"></path><path fill="#46A2D9" d="M3 5h12v2H3z"></path><path fill="#2D6DB5" d="M3 8h12v2H3z"></path></svg>
                                         Network profile
                                       </a>`;
      existingButtons = user.find('a.s-btn[href*="/users/"]').parents('ul');
      if (existingButtons.length === 0) {
        const container = profile.children[profile.children.length - 1];
        container.innerHTML = networkProfileButtonHtml;
        existingButtons = $(container).children();
      } else {
        existingButtons.after(networkProfileButtonHtml);
      }
    }
    else {
      // Update the existing network profile button to explicitly link to the "accounts" tab.
      networkProfileButton.attr('href', `${networkProfileButton.attr('href')}?tab=accounts`);
    }

    // Prepare link to chat profile.
    let chatHost;
    let chatName;
    switch (location.host) {
      case 'meta.stackexchange.com':
        chatHost = 'chat.meta.stackexchange.com';
        chatName = 'stackexchangemeta';
        break;
      case 'stackoverflow.com':
      case 'meta.stackoverflow.com':
        chatHost = 'chat.stackoverflow.com';
        chatName = 'stackoverflow';
        break;
      default:
        chatHost = 'chat.stackexchange.com';
        chatName = 'stackexchangemeta';
        break;
    }
    const chatLogo = `<div class="favicon favicon-${chatName}" title="Chat site favicon"/>`;
    const chatLink = `${location.protocol}//${chatHost}/${(chatID !== -1) ? 'account' : 'users'}/${chatID}`;

    // If the profile page uses a dropdown, insert link to chat profile as the first item in the list;
    // otherwise, insert it as a button (like the "Edit profile" button).
    if (existingButtons[0].classList.contains('s-btn__dropdown')) {
      const profileItems = $('#profiles-menu').find('.s-menu');
      profileItems.prepend(`<li role="menuitem"><a class="s-block-link d-flex ai-center ws-nowrap" href="${chatLink}">${chatLogo}<div class="ml4">Chat profile</div></a></li>`);
    }
    else {
      existingButtons.before(`<a href="${chatLink}" class="flex--item s-btn s-btn__outlined s-btn__muted s-btn__icon s-btn__sm">
                                <svg aria-hidden="true" class="svg-icon iconSpeechBubbleSm" width="14" height="14" viewBox="0 0 14 14">
                                  <path d="m4 11-3 3V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4Z"></path>
                                  </svg>
                                Chat profile
                              </a>`);
    }
  });
})();
