// ==UserScript==
// @name        SEDE Parameter Autofiller
// @namespace   https://github.com/Glorfindel83/
// @description Automatically fills SEDE parameters 'AccountId' and 'UserId' with corresponding values for your account, and breaks the cache with random values for 'Seed' and 'CacheBreaker'.
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/user-id-autofiller/user-id-autofiller.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/user-id-autofiller/user-id-autofiller.user.js
// @author      Glorfindel
// @version     0.4
// @match       *://data.stackexchange.com/*/query/*
// @connect     stackexchange.com
// @connect     *.stackexchange.com
// @connect     stackoverflow.com
// @connect     *.stackoverflow.com
// @connect     superuser.com
// @connect     *.superuser.com
// @connect     serverfault.com
// @connect     *.serverfault.com
// @connect     askubuntu.com
// @connect     *.askubuntu.com
// @connect     mathoverflow.net
// @connect     *.mathoverflow.net
// @connect     stackapps.com
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// ==/UserScript==

/* global $ */

function randomInteger() {
    return Math.floor(Math.random() * Math.pow(2, 31));
}

(function() {
    'use strict';

    // Autofill user IDs upon page load
    $('#query-params input').each(function() {
        let input = $(this);
        let name = input.attr('name');
        switch (name.toLowerCase()) {
            case 'accountid':
                // Fetch global account ID
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: 'https://stackexchange.com/users/current',
                    onload: function (data) {
                        let matches = /\/users\/(\d+)\//g.exec(data.finalUrl);
                        input.val(matches[1]);
                        input.after($('<span><em>your own account ID, filled by the SEDE Parameter Autofiller userscript</em></span>'));
                    }
                });
                break;
            case 'userid': {
                // Determine current site
                let queriesURL = $('#header nav a[title=Queries]')[0].href;
                var site = /https:\/\/data.stackexchange.com\/(.*)\/queries/.exec(queriesURL)[1];
                if (site == 'meta.stackexchange' || site == 'stackapps' ||
                    site.endsWith('stackoverflow') ||
                    site.endsWith('superuser') ||
                    site.endsWith('serverfault') ||
                    site.endsWith('askubuntu')) {
                    site += '.com';
                } else if (site.endsWith('mathoverflow')) {
                    site += '.net';
                } else if (site == 'ru' || site == 'pt' || site == 'ja' || site == 'es') {
                    site += '.stackoverflow.com';
                } else if (site == 'rume' || site == 'ptme' || site == 'jame' || site == 'esme') {
                    site = site.substring(0, 2) + '.meta.stackoverflow.com';
                } else if (site.startsWith('meta.')) {
                    site = site.substring(5) + '.meta.stackexchange.com';
                } else {
                    site += '.stackexchange.com';
                }

                // Fetch user ID
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: 'https://' + site + '/users/current',
                    onload: function (data) {
                        let matches = /\/users\/(\d+)\//g.exec(data.finalUrl);
                        input.val(matches[1]);
                        input.after($('<span><em>your own user ID, filled by the SEDE Parameter Autofiller userscript</em></span>'));
                    }
                });
                break;
            }
            case 'seed': case 'cachebreaker':
                input.val(randomInteger());
                input.after($('<span><em>will be replaced by a random number each time you run the query</em></span>'));
                break;
        }
    });

    // Autofill seed/cachebreaker upon running the query
    $("#runQueryForm").submit(function(event) {
        $("input[name='seed'], input[name='cachebreaker']").attr("value", randomInteger());
    });
})();