// ==UserScript==
// @name        Stack Exchange, Review Badge Filter
// @namespace   https://github.com/Glorfindel83/
// @description Adds options to filter review queue badges by queue type
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/review-badge-filter/review-badge-filter.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/review-badge-filter/review-badge-filter.user.js
// @author      Glorfindel
// @match       *://*.stackexchange.com/help/badges/*
// @match       *://*.stackoverflow.com/help/badges/*
// @match       *://*.superuser.com/help/badges/*
// @match       *://*.serverfault.com/help/badges/*
// @match       *://*.askubuntu.com/help/badges/*
// @match       *://*.stackapps.com/help/badges/*
// @match       *://*.mathoverflow.net/help/badges/*
// @grant       none//
// @version     0.1
// ==/UserScript==
/* global $ */

(function () {
  "use strict";

  // Link to /review present in badge description?
  if ($("div.single-badge-title").find("a[href$='/review']").length == 0)
    return;
  
  // Create filters
  var element = "<div>Filter on:<ul>";
  let queues = ["First Posts", "Late Answers", "Suggested Edits", "Low Quality Posts", "Close Votes", "Reopen Votes"];
  queues.forEach(function(queue) {
    element += "<li><a class=\"review-badge-filter\">" + queue + "</a> <span class=\"review-badge-filter-results\"></span></li>";
  });
  element += "</ul></div>";  
  $("div.single-badge-count").append($(element));

  // Determine current & last page number
  let currentPage = parseInt($("div.pager span.current")[0].innerText);
  var lastPage = 1;
  let pageLinks = $("div.pager").find("a");
  let baseLink = window.location.href.split('?')[0] + "?page=";
  if (pageLinks.length != 0) {
    // The last link is 'next', unless we're on the last page itself.
    if ("next" == pageLinks[pageLinks.length - 1].innerText) {
      // We need the one before to determine the # of pages.
      lastPage = parseInt(pageLinks[pageLinks.length - 2].getAttribute("href").split("?page=")[1]);      
    } else {
      lastPage = currentPage;
    }
  }
  let table = $("div.single-badge-table")[1];

  // Activate links
  var clickedElement = null;
  var rows = null;
  Array.prototype.forEach.call(document.getElementsByClassName("review-badge-filter"), function(element) {
    let type = element.innerText;
    element.addEventListener("click", function() {
      clickedElement = element.parentElement;
      rows = [];
      processPage(type, 1, lastPage);
    }, false);
  });
  
  function processPage(type, page, lastPage) {
    if (page > lastPage) {
      // Show results
      $(clickedElement).find("span")[0].innerText = "(" + rows.length + " time" + (rows.length == 1 ? "" : "s") + ")";
      while (table.firstChild) {
        table.removeChild(table.firstChild);
      }
      rows.forEach(function(row) {
        table.appendChild(row);
      });
      // Remove pager
      $("div.pager").remove();
      return;
    }
    let selector = "div.single-badge-reason a:contains(" + type + ")";
    if (page == currentPage) {
      // Process current page
      $(selector).each(function() {
        rows.push(this.parentElement.parentElement);
      });
      processPage(type, page + 1, lastPage);
    } else {
      // Fetch page
      $.get(baseLink + page, function (data) {
        // Process fetched page
        $(data).find(selector).each(function() {
          rows.push(this.parentElement.parentElement);
        });
        processPage(type, page + 1, lastPage);
      });
    }
  }
})();
