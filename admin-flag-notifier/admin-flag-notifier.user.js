// ==UserScript==
// @name        Admin Flag Notifier
// @namespace   https://github.com/Glorfindel83/
// @description Refreshes the flag dashboard automatically and sends desktop notifications when there are new flags.
// @author      Glorfindel
// @version     0.1
// @match       *://*.stackexchange.com/admin/dashboard*
// @match       *://*.stackoverflow.com/admin/dashboard*
// @match       *://*.superuser.com/admin/dashboard*
// @match       *://*.serverfault.com/admin/dashboard*
// @match       *://*.askubuntu.com/admin/dashboard*
// @match       *://*.stackapps.com/admin/dashboard*
// @match       *://*.mathoverflow.net/admin/dashboard*
// @grant       none
// ==/UserScript==

(function () {
  'use strict';
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  
  // Determine site name
  var host = window.location.host;
  var sitename = host.split('.')[0];
  
  // Determine current amount of flags
  var currentTitle = $('title').text();
  var currentFlags = parseInt(currentTitle);
  console.log("Current: " + currentFlags);
  
  setInterval(function () {
    var url = 'https://' + host + '/admin/dashboard?filtered=false';    
    console.log("Calling: " + url);
    $.get(url, function (data) {
      var updatedTitle = $('<html/>').html(data).find('title').text();
      var updatedFlags = parseInt(updatedTitle);
      console.log("Update: " + updatedFlags);
      
      // TODO: check on flag IDs instead
      if (updatedFlags < currentFlags) {
        console.log("Less flags.");
        // presumably, some flags have been handled and the page needs to be reloaded
        window.location.reload();
      } else if (updatedFlags > currentFlags) {
        console.log("More flags.");
        // new flags, create a notification. Remember the current number, so that we don't send a notification twice for the same flag
      	currentFlags = updatedFlags;
        if (Notification.permission === 'granted') {
          var notification = new Notification('New flags (total: ' + updatedFlags + ')', {
            icon: 'https://cdn.sstatic.net/Sites/' + sitename + '/img/apple-touch-icon.png',
            requireInteraction: true // on macOS, this only has effect when you set the notification types of your browser to 'Alert' instead of 'Banner'.
          });
          console.log("Notification created.");
          notification.onclick = function() {
            console.log("Notification clicked.");
            window.focus();
            // reload only here, otherwise the notification will be dismissed
            window.location.reload();
          };
        }
      }
    });
  }, 60000);
}) ();
