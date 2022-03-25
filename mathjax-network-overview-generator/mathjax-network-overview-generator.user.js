// ==UserScript==
// @name        MathJax network overview generator
// @namespace   https://github.com/Glorfindel83/
// @description Generates Markdown for updating the overview of Stack Exchange sites using MathJax
// @match       https://meta.stackexchange.com/questions/216606/*
// @author      Glorfindel
// @author      rene
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/mathjax-network-overview-generator/mathjax-network-overview-generator.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/mathjax-network-overview-generator/mathjax-network-overview-generator.user.js
// @version     0.2
// @connect     *.stackexchange.com
// @connect     stackoverflow.com
// @connect     *.stackoverflow.com
// @connect     superuser.com
// @connect     serverfault.com
// @connect     askubuntu.com
// @connect     mathoverflow.net
// @connect     stackapps.com
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// ==/UserScript==

/* global $ */

(function () {
  "use strict";
  
  var sites = [];

  function checkConfig(siteIndex) {
    if (siteIndex < sites.length) {
      let site = sites[siteIndex];
      console.log("Checking configuration for " + site.name);
      GM.xmlHttpRequest({
        method: 'GET',
        url: site.site_url,
        onload: function (data) {
          let document = $(new DOMParser().parseFromString(data.responseText, 'text/html'));
          // Parse MathJax config (thanks @IlmariKaronen)
          let script = document.find("script[type='text/x-mathjax-config']").html().trim();
          let config = script.match(/^MathJax\.Hub\.Config\(([\s\S]*)\);$/)[1];
          site.delim = config.contains('inlineMath: [ ["\\\\$"');
          site.mhchem = config.contains('"[mhchem]/mhchem.js"');
          // Next site
          checkConfig(siteIndex + 1);
        }
      });
    } else {
      // Finished, print results to console
      printResults();
    }
  }

  function printResults() {
    var markdown = "";
    for (var i = 0; i < sites.length; i++) {
      let site = sites[i];
      var extra = [];
      if (site.mhchem) extra.push('mhchem extension');
      if (site.delim == true) extra.push('`\\$` delimiters');
      markdown = markdown + '\n1. [' + site.name + '](' + site.site_url.substr(site.site_url.indexOf(':') + 1) + ')';
      if (extra.length > 0) {
        markdown += ' (with ' + extra.join(', ') + ')';
      }
    }
    console.log(markdown);
  }
  
  // Add post menu button
  let menu = $("#answer-216607").find('div.js-post-menu');
  menu.append($('<span class="lsep">|</span>'));
  let button = $('<a href="#">update</a>');
  menu.append(button);
  button.click(function() {
    alert('Click OK and open the browser console to view the progress and to show the final markdown.');
    // Call Stack Exchange API to find which sites have MathJax enabled
    $.get('https://api.stackexchange.com/2.2/sites?pagesize=500&key=L8n*CvRX3ZsedRQicxnjIA((&filter=!*L6SiaRiUSk*Z2zr', function(data) {
      for (var i = 0; i < data.items.length; i++) {
        if (data.items[i].site_type === 'main_site' &&
            data.items[i].markdown_extensions &&
            data.items[i].markdown_extensions.indexOf('MathJax') > -1) {
          sites.push(data.items[i]);
        }
      }
      sites.sort(function(l,r) { return l.name<r.name?-1:1; });
      // Check the configuration of each site
      checkConfig(0);
    });
  });
  
  // testing
  // sites.push({ name: "Mathematics", site_url: "https://math.stackexchange.com" })
  // sites.push({ name: "Role-Playing Games", site_url: "https://rpg.stackexchange.com" });
  // sites.push({ name: "Chemistry", site_url: "https://chemistry.stackexchange.com" })
  // checkConfig(0);
})();
