// ==UserScript==
// @name        Stack Exchange Wilson Confidence Rating Calculator
// @namespace   https://github.com/Glorfindel83/
// @description Calculates Wilson confidence ratings for Stack Exchange post
// @author      Glorfindel
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/wilson-calculator/wilson-calculator.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/wilson-calculator/wilson-calculator.user.js
// @supportURL  https://stackapps.com/
// @version     0.1
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
// ==/UserScript==

/* global $ */

function calculate(event) {
  event.preventDefault();
  
  // Hide buttons
  $("a.wilson").hide();
  
  // Call API
  let questionID = document.getElementById("question").getAttribute("data-questionid");
  $.get("https://api.stackexchange.com/2.2/questions/" + questionID + "?pagesize=100&site=" + location.host + "&filter=!YOLgOM1QPXB5wQPT*PjSezffJ9", function(data) {
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
    }
  });
}

function showRating(postID, post) {
  let rating = calculateWilsonRating(post.up_vote_count, post.down_vote_count);
  $("div.js-voting-container[data-post-id='" + postID + "'] > div.js-vote-count").after("<div class=\"fs-fine\">(" + (rating * 100).toFixed(1) + "%)</div>");
  return rating;
}

// Add buttons
(() => {
  $("a[data-shortcut='T']").each(function () {
    let button = $('<a class="wilson">Wilson</a>');
    button.on('click', calculate);
    $(this).after(button);
  });
})();

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