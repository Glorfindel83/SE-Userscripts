// ==UserScript==
// @name        Stack Exchange, Cross-site IP Checker
// @namespace   https://github.com/Glorfindel83/
// @description Adds a button to check activity from an IP address on other sites you're moderating
// @author      Glorfindel
// @version     0.1
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

(function () {
  'use strict';

  // Add button
  let button = $('<a href="#" class="d-inline-flex ai-center ws-nowrap s-btn s-btn__filled" style="float: right;">Cross-site check</a>');
  $("h1").after(button);
  button.click(function () {
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
