// ==UserScript==
// @name          Stack Exchange Global Review Summary
// @version       0.5
// @description   Stack Exchange network wide review summary available in your network profile
// @author        Glorfindel
// @attribution   Floern (https://github.com/Floern)
// @updateURL     https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/global-review-summary/global-review-summary.user.js
// @downloadURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/global-review-summary/global-review-summary.user.js
// @include       *://stackexchange.com/users/*/*
// @match         *://*.stackexchange.com/review*
// @match         *://*.stackoverflow.com/review*
// @match         *://*.superuser.com/review*
// @match         *://*.serverfault.com/review*
// @match         *://*.askubuntu.com/review*
// @match         *://*.stackapps.com/review*
// @match         *://*.mathoverflow.net/review*
// @connect       stackexchange.com
// @connect       stackoverflow.com
// @connect       superuser.com
// @connect       serverfault.com
// @connect       askubuntu.com
// @connect       stackapps.com
// @connect       mathoverflow.net
// @require       https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant         GM.xmlHttpRequest
// @grant         GM_xmlhttpRequest
// @grant         GM.addStyle
// @grant         GM_addStyle
// @run-at        document-end
// ==/UserScript==

let reviewSummaryTable, reviewSummaryTableBody, errorView;

let sortedColIndex = 10;
let sortedColAsc = false;

let reviewURIs = ["first-posts", "late-answers", "low-quality-posts", "suggested-edits",
                  "close", "reopen", "triage", "helper"];

let reviewGlobalSummaryTotals = new Array(reviewURIs.length).fill(0);

let totalsPerSite = {};
let summariesPerSite = {};

// init
(function () {
    if (window.location.href.match(/\/review\W?/i)) {
        showGlobalReviewSummaryLink();
        return;
    }

    if (!window.location.href.match(/:\/\/stackexchange\.com\/users\/\d+/i)) {
        return;
    }

    let navigation = document.querySelector('#content .contentWrapper .subheader');
    if (!navigation) {
        return;
    }

    let tabbar = navigation.querySelector('.tabs');

    // verify that we are in the profile of the logged in user
    let tabs = tabbar.getElementsByTagName('a');
    let loggedIn = false;
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent.trim().toLowerCase() == 'inbox') {
            loggedIn = true;
            break;
        }
    }
    if (!loggedIn) {
        return;
    }

    // add navigation tab for reviews
    let reviewTab = document.createElement('a');
    reviewTab.setAttribute('href', '?tab=reviews');
    reviewTab.textContent = 'reviews';
    tabs[4].parentNode.insertBefore(reviewTab, tabs[4]);

    if (!window.location.href.match(/:\/\/stackexchange\.com\/users\/\d+\/.+?\?tab=reviews/i)) {
        return;
    }

    // unselect default tab
    let selectedTab = navigation.querySelector('.youarehere');
    selectedTab.className = '';

    // set selected tab to reviews
    reviewTab.className = 'youarehere';

    // remove default content
    while (navigation.nextSibling) {
        navigation.parentNode.removeChild(navigation.nextSibling);
    }

    document.querySelector('title').textContent = 'Review Summary - Stack Exchange';

    let container = document.createElement('div');
    navigation.parentNode.appendChild(container);

    // setup summary table
    reviewSummaryTable = document.createElement('table');
    reviewSummaryTable.id = 'review-summary-table';
    reviewSummaryTable.style.width = '100%';
    reviewSummaryTable.style.textAlign = 'right';
    reviewSummaryTable.style.borderCollapse = 'separate';
    reviewSummaryTable.style.borderSpacing = '0 5px';
    reviewSummaryTable.innerHTML = `
        <thead>
            <tr id="review-summary-heading-labels" style="cursor:pointer">
                <th style="text-align:left;width:160px" colspan="2">Site</th>
                <th>FP</th>
                <th>LA</th>
                <th>LQP</th>
                <th>SE</th>
                <th>CV</th>
                <th>RV</th>
                <th>Tr</th>
                <th>H&amp;I</th>
                <th style="padding-left:20px">total</th>
            </tr>
            <tr id="review-summary-global-stats">
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    container.appendChild(reviewSummaryTable);

    // make columns sortable
    let tableLabelNodes = reviewSummaryTable.querySelectorAll('#review-summary-heading-labels th');
    for (let i = 0; i < tableLabelNodes.length; i++) {
        let col = i + 1;
        tableLabelNodes[i].onclick = function() {
            sortedColAsc = col == sortedColIndex ? !sortedColAsc : false;
            sortTable(col, sortedColAsc);
        }
    }

    reviewSummaryTableBody = reviewSummaryTable.getElementsByTagName('tbody')[0];

    // some table CSS
    GM.addStyle("#review-summary-table tbody tr:hover { background: rgba(127, 127, 127, .10); }");
    GM.addStyle("#review-summary-global-stats th { border-bottom: 1px #ddd solid; }");
    GM.addStyle("#review-summary-table tbody tr { counter-increment: siteNumber; }");
    GM.addStyle("#review-summary-table tbody tr td:first-child::before { content: counter(siteNumber); width: 14px; " +
                "margin-right: 10px; color: #bbb; font-size: 10px; display: inline-block; text-align: right; margin-left: -24px; }");

    // init global review summary
    updateGlobalReviewStats();

    // prepare error view
    errorView = document.createElement('div');
    container.appendChild(errorView);

    // create loading view
    let loadingView = document.createElement("div");
    loadingView.id = 'review-summary-loading';
    loadingView.style.textAlign = 'center';
    loadingView.innerHTML = '<img src="/content/img/progress-dots.gif" alt="Loading..." /><br>' +
                            '<span id="review-summary-loading-progress" style="color:#bbb;font-size:10px;"></span>';
    container.appendChild(loadingView);

    // load data
    loadAccountList();
})();

/**
 * Add a link to the review summary page.
 */
function showGlobalReviewSummaryLink() {
    // add link to header
    let link = document.createElement('a');
    link.setAttribute('href', '//stackexchange.com/users/current?tab=reviews');
    link.textContent = 'global summary';
    var tabs = document.getElementById("tabs");
    if (tabs != null) {
        tabs.appendChild(link);
    } else {
        let header = document.querySelector('#content h1.fs-headline1');
        if (header == null) {
            // New review queue UI
            let button = $(`<a href="//stackexchange.com/users/current?tab=reviews" class="d-inline-flex ai-center ws-nowrap s-btn s-btn__filled" style="margin-right: 20px;">
                    Global Review Summary
                </a>`);
            let title = $("div.s-page-title.mb16");
            var navigation = title.find(".s-navigation");
            if (navigation.length == 0) {
                // No actions yet
                title.append($(`<div class="s-page-title--actions">
            <div class="s-navigation">
            </div>
        </div>`));
                navigation = title.find(".s-navigation");
            }
            navigation.prepend(button);
        } else {
            let button = $(`<div class="pl8 grid--cell" role="navigation">
    <a href="//stackexchange.com/users/current?tab=reviews" class="d-inline-flex ai-center ws-nowrap s-btn s-btn__filled">
        Global Review Summary
    </a>
</div>`);
            button.insertAfter(header);
        }
    }
}

/**
 * Update global review summary in header.
 */
function updateGlobalReviewStats() {
    var html = `<th colspan="2"></th>`;
    var grandTotal = 0;
    for (var i = 0; i < reviewURIs.length; i++) {
      grandTotal += reviewGlobalSummaryTotals[i];
      html += `<th>` + reviewGlobalSummaryTotals[i].toLocaleString() + `</th>`
    }
    html += `<th>` + grandTotal.toLocaleString() + `</th>`;
    document.getElementById('review-summary-global-stats').innerHTML = html;
}

/**
 * Load the network account list.
 */
function loadAccountList() {
    let accountListUrl = '//stackexchange.com/users/current?tab=accounts';
    GM.xmlHttpRequest({
        method: 'GET',
        url: accountListUrl,
        onload: function(response) {
            parseNetworkAccounts(response.response);
        },
        onerror: function(response) {
            console.error('loadAccountList: ' + JSON.stringify(response));
            showLoadingError(accountListUrl, response.status);
        }
    });
}

/**
 * Parse the network account list.
 */
function parseNetworkAccounts(html) {
    let pageNode = document.createElement('div');
    pageNode.innerHTML = html;

    let accounts = [];

    // iterate all accounts
    let accountNodes = pageNode.querySelectorAll('.contentWrapper .account-container');
    for (let i = 0; i < accountNodes.length; ++i) {
        let accountNode = accountNodes[i];

        let siteLinkNode = accountNode.querySelector('.account-site a');
        if (!siteLinkNode) {
            continue;
        }
        if (siteLinkNode.href.indexOf('area51.stackexchange.com/') != -1) {
            // use area51.meta.SE instead
            siteLinkNode.href = siteLinkNode.href.replace('//area51.st', '//area51.meta.st');
        }

        let siteName = siteLinkNode.textContent.trim();
        let siteURL = siteLinkNode.href.replace(/users\/.*$/i, '');

        // get reputation
        let reputationNode = accountNode.querySelector('.account-stat span.account-number');
        if (!reputationNode) {
            continue;
        }
        let reputation = parseInt(reputationNode.innerHTML.replace(",", ""));

        accounts.push({ siteName: siteName, reputation: reputation, siteURL: siteURL });

        // add meta site
        if (!/(meta\.stackexchange|stackapps)\.com\//.test(siteURL)) {
            let metaSiteURL;
            if (/\.stackexchange\.com\//.test(siteURL)) // SE 2.0 sites
                metaSiteURL = siteURL.replace('.stackexchange.com', '.meta.stackexchange.com');
            else if (/\/\/[a-z]{2}\.stackoverflow\.com\//.test(siteURL)) // localized SO sites
                metaSiteURL = siteURL.replace('.stackoverflow.com', '.meta.stackoverflow.com');
            else // SE 1.0 sites
                metaSiteURL = siteURL.replace('//', '//meta.');
            accounts.push({ siteName: siteName + " Meta", reputation: reputation, siteURL: metaSiteURL });
        }
    }

    // load the sites
    let i = -1;
    let loaded = 0;
    function startLoadingSiteReviewSummary(account) {
        loadSiteReviewSummary(account.siteName, account.siteURL + 'review/', loadCallback, 0);
    };
    function loadCallback() {
        loaded++;
        document.getElementById('review-summary-loading-progress').textContent = loaded + " / " + accounts.length;
        if (loaded >= accounts.length) {
            // end of list
            document.getElementById('review-summary-loading').style.visibility = 'hidden';
        }
        loadNextSite();
    };  
    function loadNextSite() {
        i++;
        if (i >= accounts.length) {
            // end of list
            return;
        }
      
        let account = accounts[i];
        let delay = 1000;
        setTimeout(function() {
            if (account.reputation >= 350) {
                // 350 is the minimum reputation to review on beta-sites
                startLoadingSiteReviewSummary(account);
            } else {
                // check for Custodian badges first
                console.log('loading ' + account.siteName + ' (badges)');
                var url = account.siteURL + 'users/current?tab=badges&sort=name';
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: url,
                    onload: function(response) {
                        let pageNode = document.createElement('div');
                        pageNode.innerHTML = response.response;
                        var badges = pageNode.querySelectorAll(".user-badges a.badge");
                        var found = false;
                        for (j = 0; j < badges.length; j++) {
                            // On localized sites, this badge has a different name
                            if (/Custodian|Страж|見回り|Guardião|Custodio/gi.test(badges[j].innerText)) {
                                found = true;
                                break;
                            }
                        }
                      
                        if (found) {
                            startLoadingSiteReviewSummary(account);
                        } else {
                            loadCallback();
                        }
                    },
                    onerror: function(response) {
                        console.error('loadSiteReviewSummary: ' + url);
                        console.error('loadSiteReviewSummary: ' + JSON.stringify(response));
                        loadCallback();
                        showLoadingError(url, response.status);
                    }
                });
            }
        }, delay);
    };

    // start 3 'threads' in parallel
    loadNextSite();
    loadNextSite();
    loadNextSite();
}

/**
 * Load the review summary of the specified site.
 */
function loadSiteReviewSummary(siteName, siteReviewURL, finishedCallback, index) {
    console.log('loading ' + siteName + ', ' + reviewURIs[index]);
    var url = siteReviewURL + reviewURIs[index] + '/stats';
    GM.xmlHttpRequest({
        method: 'GET',
        url: url,
        onload: function(response) {
            if (++index == reviewURIs.length) {
                finishedCallback();
            } else {
                loadSiteReviewSummary(siteName, siteReviewURL, finishedCallback, index)
            }
            if (response.status < 400) {
                parseSiteReviewSummary(siteName, siteReviewURL, response.response, index - 1);
            } else {
                showLoadingError(siteReviewURL, response.status);
            }
        },
        onerror: function(response) {
            console.error('loadSiteReviewSummary: ' + url);
            console.error('loadSiteReviewSummary: ' + JSON.stringify(response));
            if (++index == reviewURIs.length) {
                finishedCallback();
            } else {
                loadSiteReviewSummary(siteName, siteReviewURL, finishedCallback, index)
            }
            showLoadingError(siteReviewURL, response.status);
        }
    });
}

/**
 * Parse the review site and extract the stats.
 */
function parseSiteReviewSummary(siteName, siteReviewURL, html, index) {
    let pageNode = document.createElement('div');
    pageNode.innerHTML = html;
  
    // Determine # of reviews
    var reviews;
    let total = $(pageNode).find(".mt16.fs-body2").text();
    if (total != "") {
        // New review queue UI
        reviews = parseInt(total.split(": ")[1]);
    } else {
        let count = pageNode.querySelector(".js-badge-progress-count").innerText;
        reviews = parseInt(count.replace(",", ""), 10);
    }
    if (reviews == 0) {
        // skip when no reviews
        return;
    }
  
    // Collect totals
    if (typeof(totalsPerSite[siteName]) === "undefined") {
       totalsPerSite[siteName] = reviews;
    } else {
       totalsPerSite[siteName] += reviews;
    }

    // update global summary
    reviewGlobalSummaryTotals[index] += reviews;
    updateGlobalReviewStats();

    let siteReviewSummaryTr = summariesPerSite[siteName];
    if (typeof(siteReviewSummaryTr) === "undefined") {  
      // create table row for this site
      siteReviewSummaryTr = document.createElement('tr');
      let siteFaviconURL = pageNode.querySelector('link[rel*="icon"]').href;
      siteReviewSummaryTr.innerHTML = `
        <td style="text-align:left;width:24px"><img src="` + siteFaviconURL + `"
            style="width:16px;height:16px;vertical-align:middle" /></td>
        <td style="text-align:left"><a href="` + siteReviewURL + `">` + siteName + `</a></td>`
      for (var i = 0; i < reviewURIs.length; i++) {
        siteReviewSummaryTr.innerHTML += `<td class="` + reviewURIs[i] + `"></td>`
      }
      siteReviewSummaryTr.innerHTML += `<td class="total"></td>`;
      reviewSummaryTableBody.appendChild(siteReviewSummaryTr);
      summariesPerSite[siteName] = siteReviewSummaryTr;
    }
    siteReviewSummaryTr.querySelector("." + reviewURIs[index]).innerText = reviews.toLocaleString();
    siteReviewSummaryTr.querySelector(".total").innerText = totalsPerSite[siteName].toLocaleString();
  
    // keep order
    sortTable(sortedColIndex, sortedColAsc);
}

/**
 * Find the previous non-text sibling node.
 */
function previousElementSibling(node) {
    do {
        node = node.previousSibling;
    } while (node && node.nodeType !== 1);
    return node;
}

/**
 * Show an error.
 */
function showLoadingError(url, statuscode) {
    let errorMsg = document.createElement("div");
    errorMsg.innerHTML = 'Failed to load <a href="' + url + '">' + url + '</a> with status ' + statuscode + '';
    errorView.appendChild(errorMsg);
}

/**
 * Sort the table by column index `col` and bool `asc`.
 */
function sortTable(col, asc) {
    sortedColIndex = col;
    let trs = Array.prototype.slice.call(reviewSummaryTableBody.rows, 0);
    asc = -((+asc) || -1);
    if (col == 1) {
        trs = trs.sort(function (a, b) {
            return asc * (a.cells[col].textContent.trim().localeCompare(b.cells[col].textContent.trim()));
        });
    }
    else {
        trs = trs.sort(function (a, b) {
            let va = parseInt(a.cells[col].textContent.replace(/\D/g, '')) || 0;
            let vb = parseInt(b.cells[col].textContent.replace(/\D/g, '')) || 0;
            if (va != vb) // primary order
                return asc * (vb - va);
            else // secondary order
                return a.cells[1].textContent.trim().localeCompare(b.cells[1].textContent.trim());
        });
    }
    for (let i = 0; i < trs.length; ++i) reviewSummaryTableBody.appendChild(trs[i]);
}
