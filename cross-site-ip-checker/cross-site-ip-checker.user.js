// ==UserScript==
// @name        Stack Exchange, Cross-site IP Checker
// @namespace   https://github.com/Glorfindel83/
// @description Adds a button to check activity from an IP address on other sites you're moderating, and one to dump all activity from a certain IP address (currently questions only)
// @author      Glorfindel
// @version     0.2
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/cross-site-ip-checker/cross-site-ip-checker.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/cross-site-ip-checker/cross-site-ip-checker.user.js
// @match       *://*.stackexchange.com/admin/users-with-ip/*
// @match       *://*.stackoverflow.com/admin/users-with-ip/*
// @match       *://*.superuser.com/admin/users-with-ip/*
// @match       *://*.serverfault.com/admin/users-with-ip/*
// @match       *://*.askubuntu.com/admin/users-with-ip/*
// @match       *://*.stackapps.com/admin/users-with-ip/*
// @match       *://*.mathoverflow.net/admin/users-with-ip/*
// @connect     *
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// ==/UserScript==
/* global $, waitForKeyElements */

var urls, users, questions;
const fkey = window.localStorage["se:fkey"].split(",")[0];

(function () {
  'use strict';

  // Add buttons
  let crossSiteCheckButton = $('<a href="#" class="d-inline-flex ai-center ws-nowrap s-btn s-btn__filled" style="float: right;">Cross-site check</a>');
  $("h1").after(crossSiteCheckButton);
  crossSiteCheckButton.click(function () {
    // On which sites do I have a diamond?
    let cacheExpiration = window.localStorage.getItem("CrossSiteIPChecker-CacheExpiration");
    if (cacheExpiration != null && new Date(cacheExpiration) > new Date()) {
      checkSites();
      return;
    }
    
    // Read network account list
    GM.xmlHttpRequest({
      method: 'GET',
      url: 'https://stackexchange.com/users/current?tab=accounts',
      onload: function(response) {
        // Collect domains 
        var hosts = [];
        let document = new DOMParser().parseFromString(response.response, 'text/html');
        for (let diamond of document.querySelectorAll("span[title='moderator']")) {
          let host = new URL(diamond.parentElement.getAttribute('href')).host;
          if (host != location.host) {
            hosts.push(host);
          }
        }

        // Cache
        var date = new Date();
        date.setDate(date.getDate() + 1);
        window.localStorage.setItem("CrossSiteIPChecker-CacheExpiration", date);
        window.localStorage.setItem("CrossSiteIPChecker-Domains", hosts.join(','));
        
        // Check sites
        checkSites();
      }
    });
  });
  
  let activityDumpButton = $('<a href="#" class="d-inline-flex ai-center ws-nowrap s-btn s-btn__filled" style="float: right; margin-left: 20px;">Activity dump</a>');
  $("h1").after(activityDumpButton);
  activityDumpButton.click(function () {
    urls = []; users = []; questions = [];
    for (let anchor of $("tbody a[href^='/users/']")) {
      urls.push(anchor.href);
    }
    analyzeNextUser();
  });
}) ();

function checkSites() {
  var found = false;
  var sitesChecked = 0;
  let hosts = window.localStorage.getItem("CrossSiteIPChecker-Domains").split(',');
  for (let host of hosts) {
    let url = 'https://' + host + location.pathname;
    GM.xmlHttpRequest({
      method: 'GET',
      url: url,
      onload: function(response) {
        // Any users found?
        let document = new DOMParser().parseFromString(response.response, 'text/html');
        if (document.getElementsByTagName("tbody").length != 0) {
          found = true;
        
          // Open link in new tab (only works properly if the browser is configured to
          // allow this site to open (multiple) popups)
          window.open(url, "_blank");
        }
        
        if (++sitesChecked == hosts.length && !found) {
          alert("No activity found on other sites you're moderating.");
        }
      }
    });
  }
}

function analyzeNextUser() {
  // Finished?
  let url = urls.pop();
  if (typeof(url) == 'undefined') {
    // Wait a bit, for any pending PII calls
    setTimeout(function () {
      // Users
      var message = '| Name | Email | Main IP address | Avatar |'
                + '\n|------|-------|-----------------|--------|';
      users.sort((a, b) => a.name.localeCompare(b.name));
      for (let user of users) {
        message += '\n| [' + user.name + '](//' + location.host + '/u/' + user.ID + ') | '
          + user.email + ' | '
          + user.ips[0].address + ' (' + user.ips[0].timesSeen + 'x) | '
          + '![](' + user.avatar + ') |';
      }
      
      // Questions
      message += '\n\n| Date | User | Question | Deleted? |'
                 + '\n|------|------|----------|----------|';
      questions.sort((a, b) => a.timestamp - b.timestamp);
      for (let question of questions) {
        let month = new Intl.DateTimeFormat('en', { month: 'short' }).format(question.timestamp);
        let day = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(question.timestamp);
        message += '\n| ' + month + ' ' + day + ' | '
          + '[' + question.user.name + '](//' + location.host + '/u/' + question.user.ID + ') | '
          + '[' + question.title + '](//' + location.host + '/q/' + question.ID + ') | '
          + (question.deleted ? 'Yes' : 'No') + ' |';
      }
      
      // IP addresses
      message += '\n\n| IP address | # of accounts | Total times seen |'
                 + '\n|------------|--------------:|-----------------:|';
      var allIPs = [];
      var allIPsByAddress = {};
      for (let user of users) {
        for (let ip of user.ips) {
          var allIP;
          if (ip.address in allIPsByAddress) {
            allIP = allIPsByAddress[ip.address];
          } else {
            allIP = {};
            allIP.address = ip.address;
            allIP.accounts = 0;
            allIP.timesSeen = 0;
            allIPs.push(allIP);
            allIPsByAddress[ip.address] = allIP;
          }
          allIP.accounts += 1;
          allIP.timesSeen += ip.timesSeen;
        }
      }
      allIPs.sort((a, b) => {
        if (a.accounts != b.accounts)
          return b.accounts - a.accounts;
        return b.timesSeen - a.timesSeen;
      });
      for (let allIP of allIPs) {
        message += '\n| [' + allIP.address + '](//' + location.host + '/admin/users-with-ip/' + allIP.address + ') | '
          + allIP.accounts + ' | ' + allIP.timesSeen + ' |';
      }
      
      console.log(message);
    }, 2000);
    return;
  }
  
  // Read profile
  $.get(url + '?tab=topactivity', function(data) {
    let $activity = $(data);
    
    // User
    var user = {};
    user.ID = url.split('/users/')[1];
    user.name = $activity.find(".fs-headline2").text().trim();
    console.log('Checking ' + user.name);
    user.avatar = $activity.find("#mainbar-full img[alt='user avatar']")[0].getAttribute('src').replace('s=256', 's=64');    
    users.push(user);
    
    // PII
    $.post('https://' + location.host + '/admin/pii', {
      field: user.ID + ":email",
      fkey: fkey
    }, function(data) {
      user.email = $(data).text().trim();
    });
    $.get('https://' + location.host + '/admin/show-user-ips/' + user.ID, function(data) {
      user.ips = [];
      for (let row of $(data).find("tbody tr")) {
        let $row = $(row);
        var ip = {};
        ip.address = $row.children()[0].innerText;
        ip.timesSeen = parseInt($row.children()[1].innerText);
        user.ips.push(ip);
      }
    });
    
    // Questions
    let $questions = $activity.find("#user-panel-questions");
    for (let $question of $questions.find("a.question-hyperlink")) {
      var question = {};
      question.ID = $question.getAttribute('href').split('/')[2];
      question.title = $question.title;
      question.deleted = $($question).closest(".bg-red-050").length > 0;
      question.timestamp = Date.parse(($($question).parent().parent().find("span.relativetime")[0]).title);
      question.user = user;
      questions.push(question);
    }
    
    analyzeNextUser();
  });
}
