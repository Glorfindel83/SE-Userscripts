// ==UserScript==
// @name        Stack Exchange - Review Keyboard Shortcuts
// @description Adds (some of) the familiar keyboard shortcuts to the review queues, where they are desperately needed
// @namespace   https://github.com/Glorfindel83/
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/review-keyboard-shortcuts/review-keyboard-shortcuts.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/review-keyboard-shortcuts/review-keyboard-shortcuts.user.js
// @supportURL  https://stackapps.com/q/11875/34061
// @version     0.1
// @match       *://*.stackexchange.com/review/*
// @match       *://*.stackoverflow.com/review/*
// @match       *://*.superuser.com/review/*
// @match       *://*.serverfault.com/review/*
// @match       *://*.askubuntu.com/review/*
// @match       *://*.stackapps.com/review/*
// @match       *://*.mathoverflow.net/review/*
// @grant       none
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==
/* global $, waitForKeyElements */

function initializeForPopup(jNode) {
  clear();
  var index = 1;
  $(jNode).find("label > span.action-name, .popup-active-pane label > span.js-action-name").each(function() {
    add(index++, $(this).text(), () => {
      // Clicking the span selects the radio button but does not enable the submit button or navigate to a deeper menu:
      $(this).parents("li").find("input[type='radio']").click();
      showKeyboardConsole(); // remain active if this is a final option, e.g. flag -> spam
    });
  });
  add("\r", null, () => { $(".js-popup-submit").click(); });
  build("Popup", 300); // with a lower delay, it frequently gets hidden by SE JS. The shortcuts are already active before the delay though ...
}

waitForKeyElements("div#popup-flag-post, div#popup-close-question", function(jNode) {
  initializeForPopup(jNode);

  // Community-specific / off-topic
  var target = document.querySelector(".site-specific-pane");
  if (target == null) {
    return;
  }
  var observer = new MutationObserver(function(mutations) {
    if (target.style.display != "none") {
      initializeForPopup(target.parentElement);
    }
  });
  observer.observe(target, {
    attributes: true
  });
});

let keyboardConsole = $(`<div class="keyboard-console" style="display: none"></div>`);
let shortcutMap = {};
var consoleContent = "";

function showKeyboardConsole(showDelay) {
  // There's something in the SE JavaScript which immediately sets `display` to `none` ...
  window.setTimeout(function () {
    keyboardConsole.css("display", "block");
  }, typeof(showDelay) == 'undefined' ? 50 : showDelay);
}

function clear() {
  Object.keys(shortcutMap).forEach(key => delete shortcutMap[key]);
  consoleContent = "";
}

function addConsoleIfNotPresent() {
  if (keyboardConsole.parent().length == 0) {
    $("body").append(keyboardConsole);
  }
}

function initialize() {
  clear();
  if ($(".js-review-task-panel").length == 0) {
    return;
  }

  // NICETOHAVE: shortcutMap["?"], to show the initial options

  // Edit
  shortcutMap.E = () => {
    $("#review-action-Edit").click();
    $(".js-review-submit").click();
  };

  /* somehow, this doesn't work, but it's not *that* relevant ...
  // Share
  shortcutMap.L = () => {
    $(".js-review-task-panel .js-share-link").click();
  };
  */

  // Moderate
  shortcutMap.M = () => {
    addConsoleIfNotPresent();

    clear();
    add("F", "flag", () => $(".js-review-task-panel .js-flag-post-link").click());
    if ($(".js-close-question-link").length != 0) {
      add("C", "close", () => $(".js-review-task-panel .js-close-question-link").click());
    }
    if ($(".js-delete-post").length != 0) {
      add("D", "delete", () => $(".js-review-task-panel .js-delete-post").click());
    }
    // "M", "moderation tools" and "I", "post issues" are skipped as they're rarely useful
    build("moderate");
  };

  // Vote
  shortcutMap.V = () => {
    addConsoleIfNotPresent();

    clear();
    add("U", "up", () => $(".js-review-task-panel .js-vote-up-btn").click());
    add("D", "down", () => $(".js-review-task-panel .js-vote-down-btn").click());
    build("vote");
  };
}

function add(key, description, action) {
  shortcutMap[key] = action;
  if (description != null) {
    consoleContent += "\n<b><kbd>" + key + "</kbd> " + description + "</b>";
  }
}

function build(caption, showDelay) {
  keyboardConsole.html("<pre>" + caption + "..." + consoleContent + "\n</pre>");
  showKeyboardConsole(showDelay);
}

(function () {
  'use strict';

  document.addEventListener("keypress", function(event) {
    if ($(":focus").length != 0) {
      return;
    }
    let key = String.fromCharCode(event.keyCode > 96 && event.keyCode <= 122 ? event.keyCode - 32 : event.keyCode);
    if (key in shortcutMap) {
      shortcutMap[key]();
    } else {
      // TODO: on the Q&A site, if you press an unrecognized key in the flag popup, the current shortcuts remain active and the console remains visible
      // Another event may have reset the keyboard shortcut sequence
      initialize();
      if (key in shortcutMap) {
        shortcutMap[key]();
      }
    }
  });
}) ();