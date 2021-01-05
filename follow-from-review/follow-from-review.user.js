// ==UserScript==
// @name          Stack Exchange Follow From Review
// @version       0.1
// @description   Temporary workaround for following posts from the review queues
// @author        Glorfindel
// @updateURL     https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/follow-from-review/follow-from-review.user.js
// @downloadURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/follow-from-review/follow-from-review.user.js
// @match         *://*.stackexchange.com/review*
// @match         *://*.stackoverflow.com/review*
// @match         *://*.superuser.com/review*
// @match         *://*.serverfault.com/review*
// @match         *://*.askubuntu.com/review*
// @match         *://*.stackapps.com/review*
// @match         *://*.mathoverflow.net/review*
// @grant         none
// @require       https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==
/* global $, waitForKeyElements */

waitForKeyElements("button.js-follow-post", function(jNode) {
  $(jNode).click(function () {
    let following = $(jNode).text() == "following";
    let postID = $(this).attr("id").split("-")[1];
    let fkey = window.localStorage["se:fkey"].split(",")[0];
    // Simulate 'follow' / 'unfollow' call
    $.post({
      url: "https://" + document.location.host + "/posts/" + postID + "/vote/21" + (following ? "?undo=true" : ""), // 21 = follow
      data: "fkey=" + fkey,
      success: function () {
        // Update button text to indicate success
        $(jNode).text(following ? "follow" : "following");
      },
      error: function (jqXHR, textStatus, errorThrown) {
        window.alert("An error occurred, please try again later.");
        console.log("Error: " + textStatus + " " + errorThrown);
      }
    });
  });
});
