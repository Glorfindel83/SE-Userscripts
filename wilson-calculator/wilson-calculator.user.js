// ==UserScript==
// @name        Stack Exchange Wilson Confidence Rating Calculator
// @namespace   https://github.com/Glorfindel83/
// @description Calculates Wilson confidence ratings for Stack Exchange posts
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/wilson-calculator/wilson-calculator.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/wilson-calculator/wilson-calculator.user.js
// @supportURL  https://stackapps.com/q/8561/34061
// @version     1.0.2
// @match       *://*.stackexchange.com/questions/*
// @match       *://*.stackoverflow.com/questions/*
// @match       *://*.superuser.com/questions/*
// @match       *://*.serverfault.com/questions/*
// @match       *://*.askubuntu.com/questions/*
// @match       *://*.stackapps.com/questions/*
// @match       *://*.mathoverflow.net/questions/*
// @exclude     *://*.stackexchange.com/questions/ask
// @exclude     *://*.stackoverflow.com/questions/ask
// @exclude     *://*.superuser.com/questions/ask
// @exclude     *://*.serverfault.com/questions/ask
// @exclude     *://*.askubuntu.com/questions/ask
// @exclude     *://*.stackapps.com/questions/ask
// @exclude     *://*.mathoverflow.net/questions/ask
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

/* global $, waitForKeyElements */

function calculate($scrollTo) {
  // Hide buttons
  $("a.wilson").hide();
  
  // Call API
  let questionID = document.getElementById("question").getAttribute("data-questionid");
  $.get("https://api.stackexchange.com/2.2/questions/" + questionID + "?pagesize=100&site=" + location.host + "&filter=!YOLgOM1QPXB5wQPT*PjSezffJ9&key=s1IeZpEeBaEZM9scI25Lsg((", function(data) {
    let question = data.items[0];
    showRating(questionID, question);
    var answerRatings = {};
    for (let answer of question.answers) {
      answerRatings[answer.answer_id] = showRating(answer.answer_id, answer);      
    }
    
    // If currently sorted by votes, sort by rating
    // (this is slightly awkward for multi-page questions though)
    if ($("#tabs > a[data-value='votes']").hasClass("is-selected")) {
      let $answers = $("#answers");
      var anchors = {};
      var elements = {};
      var answerIDs = [];
      var answersStarted = false;
      var $lastHeaderElement;
      for (let $child of $answers.children()) {
        if ($child.tagName == "DIV") {
          let answerID = $child.getAttribute("data-answerid");
          if (answerID in answerRatings) {
            answerIDs.push(answerID);
            elements[answerID] = $child;
            $child.remove();
          }
        } else if ($child.tagName == "A") {
          if ($child.getAttribute("name") in answerRatings) {
            answersStarted = true;
            anchors[$child.getAttribute("name")] = $child;
            $child.remove();
          }
        }
        if (!answersStarted) {
          $lastHeaderElement = $child;
        }
      }
      answerIDs.sort(function(a, b) {
        return answerRatings[a] > answerRatings[b] ? -1 : answerRatings[b] > answerRatings[a] ? 1 : 0;
      });
      answerIDs.forEach(answerID => {
        $lastHeaderElement.after(anchors[answerID]);
        $lastHeaderElement = anchors[answerID];
        $lastHeaderElement.after(elements[answerID]);
        $lastHeaderElement = elements[answerID];
      });
      $scrollTo.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

function showRating(postID, post) {
  let rating = calculateWilsonRating(post.up_vote_count, post.down_vote_count);
  let $voteCount = $("div.js-voting-container[data-post-id='" + postID + "'] > div.js-vote-count");
  $voteCount.next(".wilson-rating").remove();
  $voteCount.after("<div class=\"fs-fine wilson-rating\" style=\"text-align: center\">(" + (rating * 100).toFixed(1) + "%)</div>");
  return rating;
}

const timelineButtonSelector = "a.js-post-issue[href$='/timeline']";

(() => {
  // Find timeline buttons and add Wilson buttons below them
  $(timelineButtonSelector).each(function () {
    if ($(this).parents(".answer").hasClass("deleted-answer"))
      return;
    let button = $('<a class="wilson">Wilson</a>');
    button.on('click', function() {
      event.preventDefault();
      calculate(this.parentElement);
    });
    $(this).after(button);
  });
})();

// Deleted posts aren't exposed via the API; they can only be calculated when the vote count is broken down
waitForKeyElements("div.vote-count-separator", function(jNode) {
  var post = {};
  post.up_vote_count = parseInt($(jNode).prev().text());
  post.down_vote_count = Math.abs(parseInt($(jNode).next().text()));
  let postID = $(jNode).parent().parent().attr("data-post-id");
  showRating(postID, post);
});

// cf. https://stackapps.com/q/8555/34061
function calculateWilsonRating(upvotes, downvotes) {
    var total = upvotes + downvotes;

    if(total == 0)
        return 0;

    var z = 1.96;  //confidence Z-score for 95% confidence; for 99% confidence use 2.58

    var p = upvotes / total;

    return (p + z * z / (2 * total)
        - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total))
        / (1 + (z * z) / total);
}