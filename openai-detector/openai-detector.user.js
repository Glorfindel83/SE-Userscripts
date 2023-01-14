// ==UserScript==
// @name        Stack Exchange, OpenAI detector
// @namespace   https://github.com/Glorfindel83/
// @description Adds a button to check the probability that a post was written by a bot
// @author      Glorfindel
// @contributor PurpleMagick
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/openai-detector/openai-detector.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/openai-detector/openai-detector.user.js
// @supportURL  https://stackapps.com/questions/9611/openai-detector
// @version     0.7
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://metasmoke.erwaysoftware.com/*
// @exclude     *://stackexchange.com/*
// @exclude     *://api.*
// @exclude     *://blog.*
// @exclude     *://chat.*
// @exclude     *://data.*
// @exclude     *://stackoverflow.com/jobs*
// @exclude     *://*/tour
// @exclude     *://*.stackexchange.com/questions/ask
// @exclude     *://*.stackoverflow.com/questions/ask
// @exclude     *://*.superuser.com/questions/ask
// @exclude     *://*.serverfault.com/questions/ask
// @exclude     *://*.askubuntu.com/questions/ask
// @exclude     *://*.stackapps.com/questions/ask
// @exclude     *://*.mathoverflow.net/questions/ask
// @connect     openai-openai-detector.hf.space
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// ==/UserScript==
/* globals StackExchange, $ */

(function () {
  "use strict";

  const isMS = window.location.hostname === 'metasmoke.erwaysoftware.com';

  function updateButtonTextWithPercent(button, percent) {
    button.text(button.text().replace(/(?: \(\d+(?:\.\d+)?%\)$|$)/, ` (${percent}%)`));
  }

  function getDetectionDataAndUpdateButton(button, text) {
    detectAI(text).then((percent) => {
      updateButtonTextWithPercent(button, percent);
    });
  }

  function handlePostMenuButtonClick() {
    const button = $(this);
    const postMenu = button.closest("div.js-post-menu");
    const postId = postMenu.data("post-id");
    $.get(`/posts/${postId}/edit-inline`, function(result) {
      const sourcePage = new DOMParser().parseFromString(result, "text/html");
      const textarea = sourcePage.querySelector("textarea[name='post-text']");
      const postMarkdown = textarea.value;
      getDetectionDataAndUpdateButton(button, postMarkdown);
    });
  }

  function addButonToPostMenu() {
    // Regular posts
    const menu = $(this);
    // Add button
    const button = $('<button class="s-btn s-btn__link SEOAID-post-menu-button" type="button" href="#">Detect OpenAI</button>');
    const cell = $('<div class="flex--item SEOAID-post-menu-item"></div>');
    cell.append(button);
    menu.children().first().append(cell);
    button.on('click', handlePostMenuButtonClick);
  }

  function addButtonToAllPostMenus() {
    $("div.js-post-menu:not(.SEOAID-post-menu-button-added)")
      .each(addButonToPostMenu)
      .addClass("SEOAID-post-menu-button-added");
  }

  function handleMSMarkdownButtonClick() {
    const button = $(this);
    const tabContent = button.closest("div.post-body-panel-markdown");
    const postMarkdown = tabContent.children(".post-body-pre-block").html();
    getDetectionDataAndUpdateButton(button, postMarkdown);
  }

  function addButonToMSMarkdownTab() {
    // Regular posts
    const tabContent = $(this);
    // Add button
    const button = $('<button class="SEOAID-markdown-button" type="button" href="#">Detect OpenAI</button>');
    const cell = $('<div class="SEOAID-Markdown-button-cntainer"></div>');
    cell.append(button);
    tabContent.append(cell);
    button.on('click', handleMSMarkdownButtonClick);
  }

  function addButtonToAllMSMarkdownTabs() {
    $("div.post-body-panel-markdown:not(.SEOAID-markdown-button-added)")
      .each(addButonToMSMarkdownTab)
      .addClass("SEOAID-markdown-button-added");
  }

  function doAddButtonToAllMSMarkdownTabsSoon() {
    setTimeout(addButtonToAllMSMarkdownTabs, 25);
  }

  if (isMS) {
    addButtonToAllMSMarkdownTabs();
    $(document)
      .on('turbolinks:load', doAddButtonToAllMSMarkdownTabsSoon)
      .ajaxComplete(doAddButtonToAllMSMarkdownTabsSoon);
  } else {
    addButtonToAllPostMenus()
    StackExchange.ready(addButtonToAllPostMenus);
    $(document).ajaxComplete(function() {
      addButtonToAllPostMenus();
      setTimeout(addButtonToAllPostMenus, 175); // SE uses a 150ms animation for SE.realtime.reloadPosts(). This runs after that.
    });
  }

  // Revisions - only attach button to revisions that have a "Source" button. Do not attach to tag only edits.
  $("a[href$='/view-source']").each(function() {
    const sourceButton = $(this);

    // Add button
    const button = $('<a href="#" class="flex--item" title="detect OpenAI">Detect OpenAI</a>');
    const menu = sourceButton.parent();
    menu.append(button);

    button.on('click', function() {
      const linkURL = sourceButton.attr("href");
      $.get(linkURL, function(result) {
        const sourcePage = new DOMParser().parseFromString(result, "text/html");
        const text = sourcePage.body.textContent.trim();
        getDetectionDataAndUpdateButton(button, text);
      });
    });
  });

  function detectAI(text) {
    return GM.xmlHttpRequest({
      method: "GET",
      url: "https://openai-openai-detector.hf.space/openai-detector?" + encodeURIComponent(text),
      timeout: 60000,
    })
      .then((response) => {
        const data = JSON.parse(response.responseText);
        const percent = Math.round(data.fake_probability * 10000) / 100;
        const message = `According to Hugging Face, the chance that this post was generated by OpenAI is ${percent}%`;
        if (!isMS) {
          StackExchange.helpers.showToast(message);
        }
        return percent;
      });
  }
})();
