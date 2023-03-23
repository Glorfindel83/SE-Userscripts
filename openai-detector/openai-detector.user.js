// ==UserScript==
// @name        Stack Exchange, OpenAI detector
// @namespace   https://github.com/Glorfindel83/
// @description Adds a button to check the probability that a post was written by a bot
// @contributor Glorfindel
// @contributor Makyen
// @contributor PurpleMagick
// @updateURL   https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/openai-detector/openai-detector.user.js
// @downloadURL https://raw.githubusercontent.com/Glorfindel83/SE-Userscripts/master/openai-detector/openai-detector.user.js
// @supportURL  https://stackapps.com/questions/9611/openai-detector
// @version     0.12
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://metasmoke.erwaysoftware.com/*
// @match       *://openai-openai-detector.hf.space/
// @exclude     *://stackexchange.com/*
// @exclude     *://api.*
// @exclude     *://blog.*
// @exclude     *://chat.*
// @exclude     *://data.*
// @exclude     *://stackoverflow.com/jobs*
// @exclude     *://*/tour
// @exclude     *://*.stackexchange.com/questions/ask
// @exclude     *://*.stackoverflow.com/questions/ask
// @exclude     *://*.superuser.com/questions/ask
// @exclude     *://*.serverfault.com/questions/ask
// @exclude     *://*.askubuntu.com/questions/ask
// @exclude     *://*.stackapps.com/questions/ask
// @exclude     *://*.mathoverflow.net/questions/ask
// @connect     openai-openai-detector.hf.space
// @require     https://cdn.jsdelivr.net/gh/makyen/extension-and-userscript-utilities@3b1b0aeae424bfca448d72d60a3dc998d5c53406/executeInPage.js
// @require     https://cdn.jsdelivr.net/gh/makyen/extension-and-userscript-utilities@703bcfed979737808567e8b91240f984392f85a0/loadXHook.js
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// ==/UserScript==
/* globals StackExchange, $, jQuery, makyenUtilities */

(function () {
  "use strict";

  /*
   * For security reasons, Greasemonkey puts userscripts in a context other than the page
   * context.  The GM.xmlHttpRequest() function is only available in that context, not in
   * the page context.  Most of this script relies on jQuery and access to the StackExchange
   * Object.  Both of those are in the page context.  So, most of the script, everything in
   * the inSEorMSPage() function, is placed in the page context.  For the page context to get the
   * detection data, an event, "SEOAID-request-detection-data", is dispatched with the text to
   * pass to the OpenAI detector on the button which has been clicked.  Once the data is
   * received, the "SEOAID-receive-detection-data" event is dispatched with the data received
   * from the OpenAI Detector.
  */

  function inSEorMSPage() {
    const cache = {};
    const SE_API_CONSTANTS = {
      key: 'b4pJgQpVylPHom5vj811QQ((',
      posts: {
        filter: '38FD8bVlOlsmcYi8', // This is an "unsafe" filter.
        state: 'PublishedAndStagingGround', // Currently only valid on /posts and /questions
        pagesize: 100,
      },
      urlPrefix: 'https://api.stackexchange.com/2.4',
    };
    const isMS = window.location.hostname === 'metasmoke.erwaysoftware.com';

    // unescapeHTMLText was copied by the author from the FIRE userscript.
    /**
     * unescapeHTMLText - Unescapes HTML text.
     * @param   {string}    htmlIn    HTML text to unescape
     * @returns {string}              Unescaped, and unsafe, HTML text
     */
    function unescapeHTMLText(htmlIn) {
      // It's necessary here to not use a <textarea> which is created from the document.createElement(), as that can
      //   result in executing code in some corner cases.
      const textarea = document.implementation.createHTMLDocument().createElement('textarea');
      textarea.innerHTML = htmlIn;
      return textarea.textContent;
    }

    /**
     * Extracts and prepares just the post text ignoring notices.
     * @param {jQuery} post - container where the body can be found as a child
     * @return {string} text to analyse
     */
    function extractPostText(post) {
      const postBody = post.find(".js-post-body").clone();
      //remove post notices
      postBody.find("aside").remove();

      return cleanText(postBody.text());
    }

    /**
     * Try to clean text for handing over to the detector.
     * @param {string} text - content of a post
     * @return {string} a cleaned version of the post with newlines removed
     */
    function cleanText(text) {
      return text
        .trim()
        .replaceAll('\r\n', ' ')
        .replace(/\n/g, " ");
    }

    function updateButtonTextWithPercent(button, percent) {
      button.text(button.text().replace(/(?: \(\d+(?:\.\d+)?%\)$|$)/, ` (${percent}%)`));
    }

    function receiveOpenAIDetectionDataForButton(event) {
      const button = $(event.target);
      if (!isMS) {
        StackExchange.helpers.removeSpinner(button);
      }
      const data = JSON.parse(event.detail);
      const percent = Math.round(data.fake_probability * 10000) / 100;
      const message = `According to Hugging Face, the chance that this post was generated by OpenAI is ${percent}%`;
      if (!isMS) {
        StackExchange.helpers.showToast(message);
      }
      updateButtonTextWithPercent(button, percent);
    }
    window.addEventListener('SEOAID-receive-detection-data', receiveOpenAIDetectionDataForButton);

    function requestOpenAIDetectionDataForButton(button, text) {
      button.blur();
      button[0].dispatchEvent(new CustomEvent('SEOAID-request-detection-data', {
        bubbles: true,
        cancelable: true,
        detail: JSON.stringify(text),
      }));
    }

    // chunkArray is copied from Unclosed Request Review Script https://github.com/SO-Close-Vote-Reviewers/UserScripts/blob/master/UnclosedRequestReview.user.js
    // This portion was written by Makyen in 2018 and is under an MIT licese.
    function chunkArray(array, chunkSize) {
      //Chop a single array into an array of arrays. Each new array contains chunkSize number of
      //  elements, except the last one.
      var chunkedArray = [];
      var startIndex = 0;
      while (array.length > startIndex) {
        chunkedArray.push(array.slice(startIndex, startIndex + chunkSize));
        startIndex += chunkSize;
      }
      return chunkedArray;
    }

    function chunkArrayAndGetChunkForId(id, array, chunkSize) {
      let included = null;
      if (array.includes(id)) {
        included = id;
      } else {
        let idAsNumber = null;
        const idAsString = id.toString();
        if (typeof id === 'number') {
          idAsNumber = id;
        } else {
          if (Number(id).toString() === id) {
            idAsNumber = Number(id);
          }
        }
        if (idAsNumber !== null && array.includes(idAsNumber)) {
          included = idAsNumber;
        } else if (array.includes(idAsString)) {
          included = idAsString;
        }
      }
      if (included !== null) {
        if (array.length <= chunkSize) {
          return array;
        } // else
        const chunks = chunkArray(array, chunkSize);
        return chunks.find((chunk) => chunk.includes(included))[0]
      } // else
      return [];
    }

    function getSeApiSiteParamFromDomain(hostname) {
      /*
       * This works for all sites when using the main domain for the site. It doesn't work for all the aliases for the sites.
       * Handling URLs which use site aliases is not needed here, as we're getting URLs from a live page, which will already have been
       * redirected to the main domain.
       * See https://api.stackexchange.com/docs/sites#pagesize=1000&filter=!-*khQZ0uAf1l&run=true
       * and run: JSON.parse($('.result').text()).items.forEach(({site_url, api_site_parameter}) => {const calcParam = new URL(site_url).hostname.split('.com')[0].replace(/\.stackexchange/g, ''); if (calcParam !== api_site_parameter) {console.log('calcParam:', calcParam, ':: api param:', api_site_parameter, ':: url:', site_url)}});
       */
      if (/(?:askubuntu.com|mathoverflow.net|serverfault.com|stackapps.com|stackexchange.com|stackoverflow.com|superuser.com)/i.test(hostname)) {
        return hostname
          .split('.com')[0]
          .replace(/\.stackexchange/g, '');
      } // else
      return null;
    }

    function getSeApiSiteParamAndPostIdOrRevisionIdFromUrl(url, getRevision=false) {
      /*
       *  URLs containing post IDs:
       *    https://stackoverflow.com/questions/1/where-oh-where-did-the-joel-data-go
       *      1 is probably a question, but could be an answer
       *    https://stackoverflow.com/q/1/3773011
       *      1 is probably a question, but could be an answer
       *    https://stackoverflow.com/a/3/3773011
       *      3 is probably an answer, but could be a question
       *    https://stackoverflow.com/questions/1/where-oh-where-did-the-joel-data-go/3#3
       *      Want 3, as it's the most specific. Likely an answer, but could be a question.
       *    https://stackoverflow.com/posts/70051410/edit/0af09605-ecb7-455c-9624-7139983ee35a
       *      Could be either a question or answer
       *    https://stackoverflow.com/posts/70051410/redact/0af09605-ecb7-455c-9624-7139983ee35a
       *      Could be either a question or answer
       *    https://stackoverflow.com/posts/1/timeline?filter=WithVoteSummaries
       *      Could be either a question or answer
       *    https://stackoverflow.com/posts/1/edit
       *      Could be either a question or answer
       *    and several others
       *
       *  URLs containing revision IDs:
       *    https://stackoverflow.com/revisions/0af09605-ecb7-455c-9624-7139983ee35a/view-source
       *    https://stackoverflow.com/posts/70051410/edit/0af09605-ecb7-455c-9624-7139983ee35a
       *    https://stackoverflow.com/posts/70051410/redact/0af09605-ecb7-455c-9624-7139983ee35a
       */
      const urlObj = new URL(url, window.location.href);
      const [ _, postType, postQuestionAnswerOrRevisionId, linkTypeOrTitle, altRevisionId] = urlObj.pathname.split('/');
      let returnId = null;
      if ((getRevision && /^(?:[\da-z]+-){4}[\da-z]+$/.test(postQuestionAnswerOrRevisionId) && linkTypeOrTitle === 'view-source')) {
        returnId = postQuestionAnswerOrRevisionId;
      } else if ((getRevision && /^(?:[\da-z]+-){4}[\da-z]+$/.test(altRevisionId) && (linkTypeOrTitle === 'edit' || linkTypeOrTitle === 'redact'))) {
        returnId = altRevisionId;
      } else if (!getRevision && /^\d+$/.test(postQuestionAnswerOrRevisionId)) {
        let postId = null;
        if (['posts', 'q', 'questions', 'a'].includes(postType)) {
          const answerId = (urlObj.hash.match(/^#(\d+)$/) || [null, null])[1];
          if (['q', 'questions'].includes(postType) && answerId) {
            // Using a hash to indicate the answer at the end of either a /posts/<id>/<something> URL or an /a/ URL isn't valid.
            postId = answerId;
          } else {
            postId = postQuestionAnswerOrRevisionId;
          }
        } // else
        returnId = postId;
      } // else
      if (returnId) {
        const seApiSiteParam = getSeApiSiteParamFromDomain(urlObj.hostname);
        if (seApiSiteParam) {
          return [seApiSiteParam, returnId];
        } // else
      } // else
      return [null, null];
    }

    function getAllLinkedPostOrRevisionIdsWithSameSeApiParam(urlSeApiParam, getRevision=false) {
      if (urlSeApiParam) {
        return [...new Set($('a[href]')
          .toArray()
          .map((el) => getSeApiSiteParamAndPostIdOrRevisionIdFromUrl(el.href, getRevision))
          .map(([seApiParam, postId]) => urlSeApiParam === seApiParam ? postId.toString() : null)
          .filter((value) => value !== null))]
      } // else
      return [];
    }

    function getPostsFromSeApi(site, postIds) {
      /*
       * We don't handle rate limiting, at all. Only one fetch will be done per user action. It's assumed that the
       * time between user actions that would cause more than one request to the SE API will result in periods of time
       * that are sufficiently long apart such that we don't need to worry about rate limiting, backoff, and handling
       * the various errors which are alternate methods of rate limiting. If the script is changed such that there
       * might be multiple fetches (e.g. if posts are auto-checked per page and a user opens multiple pages in different
       * tabs), then we should handle rate limiting, and do so across multiple tabs.
       */
      if (postIds.length > 0) {
        const params = Object.assign({
          site,
          key: SE_API_CONSTANTS.key,
        }, SE_API_CONSTANTS.posts);
        const url = `${SE_API_CONSTANTS.urlPrefix}/posts/${postIds.join(';')}`;
        return $.get(url, params);
      } // else
      return jQuery.Deferred().reject('No posts to fetch from SE API');
    }

    function verifySiteCacheExists(site) {
      if (typeof cache[site] !== 'object') {
        cache[site] = {};
      }
    }

    function addPostsToCache(site, items) {
      verifySiteCacheExists(site);
      const siteObj = cache[site];
      items.forEach((item) => {
        siteObj[item.post_id.toString()] = item;
      });
    }

    function getCachedUnescapedMarkdown(site, id) {
      let unescapedMarkdown = cache[site]?.[id.toString()]?.unescapedBodyMarkdown;
      const markdown = cache[site]?.[id.toString()]?.body_markdown;
      if (!unescapedMarkdown && markdown) {
        unescapedMarkdown = unescapeHTMLText(markdown);
        cache[site][id.toString()].unescapedBodyMarkdown = unescapedMarkdown;
      }
      if (unescapedMarkdown) {
        return jQuery.Deferred().resolve(unescapedMarkdown);
      } // else
      return jQuery.Deferred().reject('Post Markdown not cached');
    }

    function addPostsForSiteFromSeAPIToCache(site, id) {
      const allPostIdsOnPageForSite = getAllLinkedPostOrRevisionIdsWithSameSeApiParam(site);
      verifySiteCacheExists(site);
      const siteCache = cache[site];
      // We don't want to be repeatedly fetching data from the SE API when we've already tried and failed. So, we indicate which ones are being fetched and didn't return data.
      const idsNotInCache = allPostIdsOnPageForSite.filter((id) => !siteCache[id]);
      const idChunk = chunkArrayAndGetChunkForId(id, idsNotInCache, SE_API_CONSTANTS.posts.pagesize);
      idChunk.forEach((chunkId) => {
        siteCache[chunkId] = {fetching: true};
      });
      return getPostsFromSeApi(site, idChunk)
        .then((seAPIResponse) => {
          addPostsToCache(site, seAPIResponse.items);
          idChunk.forEach((chunkId) => {
            if (siteCache[chunkId].fetching === true) {
              siteCache[chunkId] = {noResponse: true};
            }
          });
        }, () => {
          // There was an error from the SE API. We want to be able to try to fetch data for these posts again.
          idChunk.forEach((chunkId) => {
            if (siteCache[chunkId].fetching === true || siteCache[chunkId].noResponse === true) {
              delete siteCache[chunkId];
            }
          });
        });
    }

    function getPostMarkdownFromEditInlineResponse(site, postId) {
      // If we really want to allow cross-origin requests, then we'd need to use userscript AJAX.
      return $.get(`/posts/${postId}/edit-inline`)
        .then((result) => {
          const sourcePage = new DOMParser().parseFromString(result, "text/html");
          const textarea = sourcePage.querySelector("textarea[name='post-text']");
          const postMarkdown = textarea.value;
          cache[site][postId] = {
            unescapedBodyMarkdown: postMarkdown,
            post_id: postId,
          };
          return postMarkdown;
        });
    }

    function setLocalStorageFromElementHeight(storageKey, container) {
        const containerHeight = container.css('height');
        localStorage[storageKey] = containerHeight;
    }

    function addSeoaidIframe(button, method, where, iframeAncestor, getText) {
      where[method](`<div class="SEOID-iframe-container post-layout--right"><iframe sandbox="allow-same-origin allow-scripts" class="SEOAID-oaid-iframe" src="https://openai-openai-detector.hf.space/"></iframe></div>`);
      button.addClass('SEOAID-iframe-open SEOAID-iframe-created');
      const iframe = iframeAncestor.find('.SEOAID-oaid-iframe');
      const iframeContainer = iframeAncestor.find('.SEOID-iframe-container');
      const iframeContainerHeightStorageKey = 'SEOAID-iframeContainer-height';
      iframe.css({
        width: '100%',
        height: 'calc(100% - 4px)',
      });
      // CSS resize doesn't work on iframes in Firefox
      iframeContainer.css({
        resize: 'vertical',
        'overflow-y': 'auto',
        height: localStorage[iframeContainerHeightStorageKey] || '770px',
        border: '2px solid #333',
        margin: '10px',
      });
      let iframeHeightDebounceTimer = null;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(iframeHeightDebounceTimer);
        iframeHeightDebounceTimer = setTimeout(setLocalStorageFromElementHeight, 200, iframeContainerHeightStorageKey, iframeContainer);
      });
      resizeObserver.observe(iframeContainer[0]);
      const iframeEl = iframe[0];
      window.addEventListener('message', (event) => {
        const iframeWindow = iframeEl.contentWindow;
        if (event.source === iframeWindow && event.origin === 'https://openai-openai-detector.hf.space') {
          // It's from this iframe.
          const data = event.data;
          if (typeof data === 'object' && data.messageType === 'SEOAID-iframe-ready') {
            getText()
              .then((textToTest) => {
                iframeWindow.postMessage({
                  messageType: 'SEOAID-fill-text',
                  textToTest,
                }, 'https://openai-openai-detector.hf.space');
              });
          }
        }
      });
    }

    function getTextToTestForPost(button, site, sharePostId, thenBeforeCatch) {
      return getCachedUnescapedMarkdown(site, sharePostId)
        .then(null, () => {
          // The post Markdown isn't in the cache. Fetch data from the SE API for the page and try the cache again.
          return addPostsForSiteFromSeAPIToCache(site, sharePostId)
            .then(() => getCachedUnescapedMarkdown(site, sharePostId));
        })
        // The post Markdown isn't in the cache after getting data from the SE API. Get it from edit-inline.
        .then(null, () => getPostMarkdownFromEditInlineResponse(site, sharePostId))
        .then(null, () => {
          // Getting the Markdown failed (e.g. post is currently deleted and has a suggested edit, which is transitory, but possible). Use the HTML in the page.
          const post = button.parents(".answercell, .postcell");
          return jQuery.Deferred().resolve(extractPostText(post));
        })
        .then((text) => {
          if (typeof thenBeforeCatch === 'function') {
            return thenBeforeCatch(text);
          } // else
          if (thenBeforeCatch instanceof Promise) {
            return thenBeforeCatch;
          } // else
          return text;
        })
        .then(null, (error) => {
          const errorText = `Failed to get the post Markdown and HTML for post ID ${sharePostId} on site ${site} or some other unexpected error occured. The console may have more information.`;
          console.error(errorText);
          console.error(error);
          alert(errorText);
        });
    }

    function handlePostMenuButtonClick(event) {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const button = $(this);
      if (event.altKey) {
        // Go directly to opening iframe
        button.addClass('SEOAID-button-has-been-clicked');
      }
      event.preventDefault();
      const postMenu = button.closest("div.js-post-menu");
      const shareLink = postMenu.find('.js-share-link').first();
      const shareUrl = shareLink[0].href;
      const [site, sharePostId] = getSeApiSiteParamAndPostIdOrRevisionIdFromUrl(shareUrl);
      verifySiteCacheExists(site);
      if (addIframeIfButtonClicked(button, 'after', button.closest('.postcell, .answercell'), button.closest('.answer, .question'), getTextToTestForPost.bind(null, button, site, sharePostId))) {
        return;
      }
      button.addClass('SEOAID-button-has-been-clicked');
      StackExchange?.helpers?.addSpinner(button);
      getTextToTestForPost(button, site, sharePostId, (textToTest) => requestOpenAIDetectionDataForButton(button, textToTest));
    }

    function addButtonToPostMenu() {
      // Regular posts
      const menu = $(this);
      // Add button
      const button = $('<a class="SEOAID-post-menu-button" href="https://openai-openai-detector.hf.space/" title="Run the post content through the Hugging Face GPT-2 Output Detector.">Detect OpenAI</button>');
      const cell = $('<div class="flex--item SEOAID-post-menu-item"></div>');
      cell.append(button);
      menu.children().first().append(cell);
      button.on('click', handlePostMenuButtonClick);
    }

    function addButtonToAllPostMenus() {
      $("div.js-post-menu:not(.SEOAID-post-menu-button-added)")
        .each(addButtonToPostMenu)
        .addClass("SEOAID-post-menu-button-added");
    }

    function addIframeIfButtonClicked(button, insertType, insertRelativeEl, iframeAncestor, getText) {
      if (button.hasClass('SEOAID-button-has-been-clicked')) {
        if (button.hasClass('SEOAID-iframe-created')) {
          const iframeContainer = iframeAncestor.find('.SEOID-iframe-container');
          iframeContainer.toggle(!button.hasClass('SEOAID-iframe-open'));
          button
            .toggleClass('SEOAID-iframe-open')
            .attr('title', `${button.hasClass('SEOAID-iframe-open') ? 'Hide' : 'Show'} the Hugging Face GPT-2 Output Detector iframe.`);
        } else {
          addSeoaidIframe(button, insertType, insertRelativeEl, iframeAncestor, getText);
        }
        return true;
      }
      return false;
    }

    function handleMSMarkdownButtonClick() {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const button = $(this);
      if (event.altKey) {
        // Go directly to opening iframe
        button.addClass('SEOAID-button-has-been-clicked');
      }
      event.preventDefault();
      const tabContent = button.closest("div.post-body-panel-markdown");
      const postMarkdown = tabContent.children(".post-body-pre-block").text();
      if (addIframeIfButtonClicked(button, 'after', button.closest('.SEOAID-Markdown-button-cntainer'), button.closest('.post-body-panel-markdown.SEOAID-markdown-button-added'), () => Promise.resolve(postMarkdown))) {
        return;
      }
      button.addClass('SEOAID-button-has-been-clicked');
      requestOpenAIDetectionDataForButton(button, postMarkdown);
    }

    function addButtonToMSMarkdownTab() {
      // Regular posts
      const tabContent = $(this);
      // Add button
      const button = $('<a class="SEOAID-markdown-button" href="https://openai-openai-detector.hf.space/" title="Run the post content through the Hugging Face GPT-2 Output Detector.">Detect OpenAI</a>');
      const cell = $('<div class="SEOAID-Markdown-button-cntainer"></div>');
      cell.append(button);
      tabContent.append(cell);
      button.on('click', handleMSMarkdownButtonClick);
    }

    function addButtonToAllMSMarkdownTabs() {
      $("div.post-body-panel-markdown:not(.SEOAID-markdown-button-added)")
        .each(addButtonToMSMarkdownTab)
        .addClass("SEOAID-markdown-button-added");
    }

    function doAddButtonToAllMSMarkdownTabsSoon() {
      setTimeout(addButtonToAllMSMarkdownTabs, 25);
    }

    function getPostMarkdownFromRevisonSourcePage(url) {
      return $.get(url)
        .then(function(result) {
          const sourcePage = new DOMParser().parseFromString(result, "text/html");
          const postMarkdown = sourcePage.body.textContent.trim().replaceAll('\r\n', '\n');
          const [site, revisionId] = getSeApiSiteParamAndPostIdOrRevisionIdFromUrl(url, true);
          verifySiteCacheExists(site);
          cache[site][revisionId] = {
            unescapedBodyMarkdown: postMarkdown,
            revisionId,
          };
          return postMarkdown;
        });
    }

    function getTextToTestForRevision(button, site, revisionId, sourceUrl, thenBeforeCatch) {
      return getCachedUnescapedMarkdown(site, revisionId)
        // The SE API doesn't have a method to get the Markdown for revisions. Only the HTML is available.
        .then(null, () => getPostMarkdownFromRevisonSourcePage(sourceUrl))
        .then((text) => {
          if (typeof thenBeforeCatch === 'function') {
            return thenBeforeCatch(text);
          } // else
          if (thenBeforeCatch instanceof Promise) {
            return thenBeforeCatch;
          } // else
          return text;
        })
        .then(null, (error) => {
          const errorText = `Failed to get the source for revision ${revisionId} on site ${site} or some other unexpected error occured. The console may have more information.`;
          console.error(errorText);
          console.error(error);
          alert(errorText);
        });
    }

    function handleRevisionButtonClick(event) {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const button = $(this);
      if (event.altKey) {
        // Go directly to opening iframe
        button.addClass('SEOAID-button-has-been-clicked');
      }
      event.preventDefault();
      const sourceUrl = button.data('sourceUrl');
      const [site, revisionId] = getSeApiSiteParamAndPostIdOrRevisionIdFromUrl(sourceUrl, true);
      verifySiteCacheExists(site);
      const revisionContainer = button.closest('.js-revision');
      if (addIframeIfButtonClicked(button, 'append', revisionContainer, revisionContainer, () => getTextToTestForRevision(button, site, revisionId, sourceUrl))) {
        return;
      }
      button.addClass('SEOAID-button-has-been-clicked');
      StackExchange?.helpers?.addSpinner(button);
      getTextToTestForRevision(button, site, revisionId, sourceUrl, requestOpenAIDetectionDataForButton.bind(null, button));
    }

    if (isMS) {
      addButtonToAllMSMarkdownTabs();
      $(document)
        .on('turbolinks:load', doAddButtonToAllMSMarkdownTabsSoon)
        .ajaxComplete(doAddButtonToAllMSMarkdownTabsSoon);
    } else {
      addButtonToAllPostMenus()
      StackExchange.ready(addButtonToAllPostMenus);
      $(document).ajaxComplete(function() {
        addButtonToAllPostMenus();
        setTimeout(addButtonToAllPostMenus, 175); // SE uses a 150ms animation for SE.realtime.reloadPosts(). This runs after that.
      });

      if (/^\/posts\/\d+\/revisions/.test(window.location.pathname)) {
        // Revisions - only attach button to revisions that have a "Source" button. Do not attach to tag only edits.
        $(".js-revision > div:nth-child(1) a[href$='/view-source']").each(function() {
          const sourceButton = $(this);
          // Add button
          const button = $('<a class="flex--item" title="Run the revision content through the Hugging Face GPT-2 Output Detector." href="https://openai-openai-detector.hf.space/">Detect OpenAI</a>');
          const sourceUrl = sourceButton[0].href;
          const menu = sourceButton.parent();
          menu.append(button);
          button
            .data('sourceUrl', sourceUrl)
            .on('click', handleRevisionButtonClick);
        });
      }
    }
  }

  function inPageAdjustHuggingFaceAPICall(request) {
    const adjustedUrl = request.url.replace(/^([^?]+)\?(.+)$/s, (match, p1, p2) => `${p1}?${encodeURIComponent(p2)}`);
    // The HF API returns an error when the URL is longer than 16,411 characters.
    // So, we truncate at 16,400.
    let maxCharacters = 16400;
    if (adjustedUrl[maxCharacters - 1] === '%') {
      maxCharacters--;
    }
    if (adjustedUrl[maxCharacters - 2] === '%') {
      maxCharacters -= 2;
    }
    if (maxCharacters < adjustedUrl.length) {
      document.body.classList.add('SEOAID-request-truncated');
    } else {
      document.body.classList.remove('SEOAID-request-truncated');
    }
    request.url = adjustedUrl.slice(0, maxCharacters);
  }

  function inOpenAIDetectorPage() {
    function setLocalStorageFromElementHeight(storageKey, container) {
        const containerHeight = container.style.height;
        localStorage[storageKey] = containerHeight;
    }

    function createButton(text, className, onClick) {
      const button = document.createElement('button');
      button.textContent = text;
      button.className = className + ' SEOAID-header-button';
      button.addEventListener('click', onClick);
      return button;
    }

    function setTextAndTriggerPrediction(text) {
      const textbox = document.getElementById('textbox');
      textbox.select();
      try {
        // This will put the replacement in the textbox's "undo" stack.
        document.execCommand("insertText", false, text);
      } catch (error) {
        textbox.value = text;
      }
      if (textbox.value !== text) {
        console.error('In inOpenAIDetectorPage: textbox.value !== text: textbox.value:', {'textbox.value': textbox.value}, '\n:: text:', {text});
        textbox.value = text;
      }
      textbox.dispatchEvent(new InputEvent('input'));
    }

    /* The following regexes were taken from SOCVR's Magic Editor:
         https://github.com/SO-Close-Vote-Reviewers/UserScripts#magic-editor
         https://github.com/SO-Close-Vote-Reviewers/UserScripts/blob/master/Magic%E2%84%A2Editor.user.js
       It's authored by multiple people.  It's mostly under an MIT license, but your
         should check the specifics in the repository and commits.
         They may have been modified.
     */
    const codeBlockRegexes = {
      //code surrounded by backticks
      //        https://regex101.com/r/EUJNAD/1
      "codeFences": /^(?=```)(?:(?:^(`{3,})[^]+?\1)|(`+)(?:\\`|[^`](?!\n\n))+\2)/gm, // modified
      //code blocks and multiline inline code.
      //        https://regex101.com/r/eC7mF7/4
      "block":  /(?:(?:^[ \t]*(?:[\r\n]|\r\n))?`[^`]+`|(?:^[ \t]*(?:[\r\n]|\r\n))^(?:(?:[ ]{4}|[ ]{0,3}\t).+(?:[\r\n]?(?!\n\S)(?:[ \t]+\n)*)+)+)/gm,
      //code blocks at the start of the post.
      //        https://regex101.com/r/vu7fBd/1
      "blockStart":  /(?:^(?:(?:[ ]{4}|[ ]{0,3}\t).+(?:[\r\n]?(?!\n\S)(?:[ ]+\n)*)+)+)/g,
      //<pre></pre> blocks
      //        https://regex101.com/r/KFvgol/1
      "preBlock": /<pre(?: [^>]*?|)>[\W\w]*?<\/pre>/gi,
      //<code></code> blocks
      //        https://regex101.com/r/waCxWR/1
      "codeTag":  /<code(?: [^>]*?|)>[\W\w]*?<\/code>/gi,
    };
    const linkRegexes = {
      //link-sections
      //  Testing of this and the "links" RegExp were done within the same regex101.com "regex".
      //  The prior version of this was https://regex101.com/r/tZ4eY3/7 it was saved and became version 21.
      //  It was then forked into it's own regex:
      //        https://regex101.com/r/C7nXfd/2
      "lsec":   /(?:^ *(?:[\r\n]|\r\n))?(?: {2}(?:\[\d\]): \w*:+\/\/.*\n*)+/gm,
      //links and pathnames
      //  See comment above the "lsec" RegExp regarding testing sharing the same "regex" on regex101.com
      //        https://regex101.com/r/tZ4eY3/25
      "links":  /!?\[(?<!\\\[)((?:[^\]\n]|\\\]|\]\((?=[^)]+\)\]))+)\](?:\((?:[^\)\n"]|"(?:[^"]|"(?!\)))*"(?=\)))+\)|\[[^\]\n]+\])(?:\](?:\([^\)\n]+\)|\[[^\]\n]+\]))?|(?:\/\w+\/|.:\\|\w*:\/\/|\.+\/[./\w\d]+|(?:\w+\.\w+){2,})[./\w\d:/?#\[\]@!$&'()*+,;=\-~%]*/gi, // ' fix syntax highlighting in code editor
      "htmlAnchors":  /<a [^>]*>((?:[^<]|<(?!\/a>))*)<\/a>/gi,
    };

    function regexRemovalsWithProtection(text, keepRegexes, removeRegexes, keepMatchGroup1) {
      function normalizeSomeTypesToArray(value) {
        if (!Array.isArray(value)) {
          if (value instanceof RegExp) {
            value = [value];
          } else if (value !== null && typeof value === 'object' ) {
            value = Object.values(value);
          } else {
            value = [];
          }
        }
        return value;
      }
      keepRegexes = normalizeSomeTypesToArray(keepRegexes);
      removeRegexes = normalizeSomeTypesToArray(removeRegexes);
      text = text.replace(/Q/g, 'QA'); // Free up placeholders
      let currentCodePoint = 'A'.codePointAt(0) + 1;
      const substitutions = [];
      Object.values(keepRegexes).forEach((reg) => {
        reg.lastIndex = 0;
        text = text.replace(reg, (match) => {
          const placeholder = `Q${String.fromCodePoint(currentCodePoint++)}`;
          substitutions.push([placeholder, match]);
          return placeholder;
        });
      });
      Object.values(removeRegexes).forEach((reg) => {
        reg.lastIndex = 0;
        if (keepMatchGroup1) {
          text = text.replace(reg, function(match, p1) {
            return arguments.length > 3 && p1 ? p1 : '';
          });
        } else {
          text = text.replace(reg, '');
        }
      });
      substitutions.reverse();
      substitutions.forEach(([placeholder, replacement]) => {
        text = text.replaceAll(placeholder, replacement);
      });
      text = text.replaceAll('QA', 'Q'); // Close the placeholders
      return text;
    }

    makyenUtilities.xhook.load();
    makyenUtilities.xhook.before(inPageAdjustHuggingFaceAPICall);
    makyenUtilities.xhook.enable();
    let receivedText = '';
    const header = document.querySelector('h1');
    header.insertAdjacentHTML('afterend', '<div class="SEOAID-header-container"><div class="SEOAID-header-button-container"></div></div>');
    const headerContainer = document.querySelector('.SEOAID-header-container');
    const headerButtonContainer = document.querySelector('.SEOAID-header-button-container');
    headerContainer.prepend(header);
    headerButtonContainer.append(createButton('Restore text', 'SEOAID-restore-text-button', () => setTextAndTriggerPrediction(receivedText)));
    headerButtonContainer.insertAdjacentHTML('beforeend', '<span class="SEOAID-strip-buttons-wrap"><span class="SEOAID-strip-buttons-text"></span><span class="SEOAID-strip-buttons-container"></span></span>');
    const stripButtonsWrap = headerButtonContainer.querySelector('.SEOAID-strip-buttons-wrap');
    const stripButtonsText = stripButtonsWrap.querySelector('.SEOAID-strip-buttons-text');
    stripButtonsText.append('Strip: ');
    const stripButtonsContainer = stripButtonsWrap.querySelector('.SEOAID-strip-buttons-container');
    stripButtonsContainer.append(createButton('links', 'SEOAID-strip-links-button', () => {
      const textbox = document.getElementById('textbox');
      const initialText = textbox.value;
      setTextAndTriggerPrediction(regexRemovalsWithProtection(initialText, codeBlockRegexes, linkRegexes, true).trim());
    }));
    stripButtonsContainer.append(createButton('links and link text', 'SEOAID-strip-links-and-link-text-button', () => {
      const textbox = document.getElementById('textbox');
      const initialText = textbox.value;
      setTextAndTriggerPrediction(regexRemovalsWithProtection(initialText, codeBlockRegexes, linkRegexes).trim());
    }));
    stripButtonsContainer.append(createButton('code blocks', 'SEOAID-strip-code blocks-button', () => {
      const textbox = document.getElementById('textbox');
      const initialText = textbox.value;
      setTextAndTriggerPrediction(regexRemovalsWithProtection(initialText, null, codeBlockRegexes).trim());
    }));
    stripButtonsContainer.append(createButton('HTML comments', 'SEOAID-strip-HTML-comments-button', () => {
      const textbox = document.getElementById('textbox');
      const initialText = textbox.value;
      setTextAndTriggerPrediction(regexRemovalsWithProtection(initialText, codeBlockRegexes, /<!--.*?-->/g).trim());
    }));

    document.documentElement.insertAdjacentHTML('beforeend', `<style id="SEOAID-styles">
/* Styles when not in iframe*/
body {
  padding: 0px 3vw;
}
#container {
  width: unset;
  max-width: 960px;
}
h1 {
  margin-bottom: .25em;
}
.SEOAID-header-container {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}
.SEOAID-restore-text-button {
  display: none;
}
.SEOAID-have-received-text .SEOAID-restore-text-button {
  display: unset;
}
.SEOAID-header-button:not(:first-of-type) {
  /*margin-left: 5px;*/
}
.SEOAID-header-button-container {
  display: flex;
  gap: 5px;
  height: min-content;
  flex-wrap: wrap;
  padding: 15px 0px 0px 0px;
  align-self: center;
}
.SEOAID-strip-buttons-wrap {
  margin-left: 10px;
}
.SEOAID-strip-buttons-wrap {
  margin-left: 10px;
  white-space: nowrap;
  display: flex;
}
.SEOAID-strip-buttons-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.SEOAID-request-truncated #message::after {
  content: " (request text truncated)";
  color: red;
}
</style>`);
    if (window !== window.top) {
      // in iframe
      document.documentElement.insertAdjacentHTML('beforeend', `<style id="SEOAID-iframe-styles">
body {
  width: 100%;
  padding: unset;
}
#container {
  width: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
h1 {
  margin-top: 0;
  font-size: 1.5em;
  margin: 0 auto .5em auto;
}
#textbox {
  width: 100%;
  padding: 5px 10px;
  font-size: 15px;
  line-height: 19.5px;
}
#container > p {
  order: 10;
  margin-top: 2em;
}
.SEOAID-header-button-container {
  margin: 0 auto .25em auto;
  padding: 5px 0px 0px 0px;
  align-self: unset;
}
</style>`);
      const textbox = document.getElementById('textbox');
      const iframeTexboxHeightStorageKey = 'SEOAID-textbox-height';
      const storageIframeTextboxHeight = localStorage[iframeTexboxHeightStorageKey];
      if (storageIframeTextboxHeight) {
        textbox.style.height = storageIframeTextboxHeight;
      }
      textbox.style.resize = 'vertical';
      let textboxHeightDebounceTimer = null;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(textboxHeightDebounceTimer);
        textboxHeightDebounceTimer = setTimeout(setLocalStorageFromElementHeight, 200, iframeTexboxHeightStorageKey, textbox);
      });
      resizeObserver.observe(textbox)
      window.addEventListener('message', function(event) {
        if (event.source === window.top && /^https?:\/\/(?:[^/.]+\.)*(?:stackexchange\.com|stackoverflow\.com|serverfault\.com|superuser\.com|askubuntu\.com|stackapps\.com|mathoverflow\.net|stackoverflowteams\.com|metasmoke.erwaysoftware.com)\/?$/.test(event.origin)) {
          // It's from SE
          const data = event.data;
          if (typeof data === 'object' && data.messageType === 'SEOAID-fill-text') {
            const textToTest = data.textToTest;
            if (typeof textToTest === 'string') {
              receivedText = textToTest;
              document.body.classList.add('SEOAID-have-received-text');
              setTextAndTriggerPrediction(textToTest);
            }
          }
        }
      });
      window.top.postMessage({
          messageType: 'SEOAID-iframe-ready',
      }, '*');
    }
  }

  if (window.location.hostname === "openai-openai-detector.hf.space") {
      inOpenAIDetectorPage();
      return;
  }

  makyenUtilities.executeInPage(inSEorMSPage, true, 'OpenAI-detector-page-script');

  function receiveRequestForDataFromPage(event) {
    const text = JSON.parse(event.detail);
    detectAI(text).then((jsonData) => {
      event.target.dispatchEvent(new CustomEvent('SEOAID-receive-detection-data', {
        bubbles: true,
        cancelable: true,
        detail: jsonData,
      }));
    });
  }
  window.addEventListener('SEOAID-request-detection-data', receiveRequestForDataFromPage);

  function detectAI(text) {
    // The GM polyfill doesn't convert GM_xmlhttpRequest to a useful Promise in all userscript managers (i.e. Violentmonkey), so...
    const gmXmlhttpRequest = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : GM.xmlHttpRequest;
    const baseURL = "https://openai-openai-detector.hf.space/openai-detector";
    const fullURL = `${baseURL}?${encodeURIComponent(text)}`;
    // Restrict the length of OAI API request URLs to prevent 414 Request URI Too Long errors
    let maxCharacters = 16400;
    if (fullURL[maxCharacters - 1] === '%') {
      maxCharacters--;
    }
    if (fullURL[maxCharacters - 2] === '%') {
      maxCharacters -= 2;
    }
    return new Promise((resolve, reject) => {
      gmXmlhttpRequest({
        method: "GET",
        url: fullURL.slice(0, maxCharacters),
        timeout: 60000, // There's no particular reason for this length, but don't want to hang forever.
        onload: resolve,
        onabort: reject,
        onerror: reject,
        ontimeout: reject,
      });
    })
      .then((response) => response.responseText, (rejectInfo) => {
        console.error('OpenAI Detector error response:', rejectInfo);
        alert(`OpenAI Detector encountered a problem getting data from ${baseURL}. The browser console may have more information.`);
      });
  }
})();
