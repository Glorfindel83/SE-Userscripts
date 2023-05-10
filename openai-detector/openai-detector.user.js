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
// @version     0.15
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://metasmoke.erwaysoftware.com/*
// @include     /^https:\/\/[%\w-]*openai-detector[%\w-]*\.hf\.space\//
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
// @connect     hf.space
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

  const IFRAME_HOST = 'openai-openai-detector.hf.space';
  const IFRAME_ORIGIN = `https://${IFRAME_HOST}`;
  const IFRAME_PATH = '';
  const IFRAME_URL = IFRAME_ORIGIN + IFRAME_PATH;
  const IFRAME_ORIGIN_REGEX = /^https:\/\/[%\w-]*openai-detector[%\w-]*\.hf\.space(?:\/|$)/;
  const DETECTOR_ORIGIN = IFRAME_ORIGIN;
  const DETECTOR_PATH = '/';
  const DETECTOR_BASE_URL = DETECTOR_ORIGIN + DETECTOR_PATH;

  function inSEorMSPage(iframeOrigin, iframeURL, iframeOriginRegex) {
    const IFRAME_ORIGIN_IN_PAGE = iframeOrigin;
    const IFRAME_URL_IN_PAGE = iframeURL;
    const IFRAME_ORIGIN_REGEX_IN_PAGE = iframeOriginRegex;
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
      let data = {};
      try {
        data = JSON.parse(event.detail);
      } catch(e) {
        if (!isMS) {
          StackExchange.helpers.showErrorMessage(button, event.detail, {
            position: "toast",
            transient: true,
            transientTimeout: 10000
          });
        }
        return;
      }
      const percent = Math.round(data.fake_probability * 10000) / 100;
      const message = `According to Hugging Face, the chance that this post was generated by OpenAI is ${percent}% with ${data.used_tokens} tokens tested of ${data.all_tokens} tokens total.`;
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

    function setLocalStorageFromElementHeightSEorMSPage(storageKey, container) {
        const containerHeight = container.css('height');
        localStorage[storageKey] = containerHeight;
    }

    function addSeoaidIframe(button, method, where, iframeAncestor, getText) {
      where[method](`<div class="SEOID-iframe-container post-layout--right"><div class="SEOAID-iframe-close-button-container"><span class="SEOAID-iframe-close-button" title="close this GPT-2 Output Detector Demo iframe">×</span></div><iframe sandbox="allow-same-origin allow-scripts allow-storage-access-by-user-activation" class="SEOAID-oaid-iframe" src="${IFRAME_URL_IN_PAGE}"></iframe></div>`);
      button.addClass('SEOAID-iframe-open SEOAID-iframe-created');
      const iframe = iframeAncestor.find('.SEOAID-oaid-iframe');
      const iframeContainer = iframeAncestor.find('.SEOID-iframe-container');
      const iframeContainerHeightStorageKey = 'SEOAID-iframeContainer-height';
      const iframeTextareaHeightStorageKey = `SEOAID-textarea-height-${IFRAME_ORIGIN_IN_PAGE}`;
      // CSS resize doesn't work on iframes in Firefox
      let ignoreIframeContainerResize = true;
      const DEFAULT_IFRAME_HEIGHT = '685px';

      function pixelTextToNumber(pixelText) {
        const typofPixelText = typeof pixelText;
        if (typofPixelText === 'number' || typofPixelText === 'string') {
          return Number((pixelText.toString() || '').replaceAll('px', ''));
        }
        return NaN;
      }

      function setIframeContainerHeight(height) {
        ignoreIframeContainerResize = true;
        const heightPixels = pixelTextToNumber(height);
        const storagePixels = pixelTextToNumber(localStorage[iframeContainerHeightStorageKey]);
        const defaultPixels = pixelTextToNumber(DEFAULT_IFRAME_HEIGHT);
        const newHeight = Math.min(heightPixels || storagePixels, storagePixels || heightPixels) || defaultPixels;
        iframeContainer.css({
          height: `${newHeight}px`,
        });
        // Resume watching for resize after the next tick.
        setTimeout(() => {ignoreIframeContainerResize = false;}, 20);
      }

      setIframeContainerHeight();
      iframeContainer.find('.SEOAID-iframe-close-button-container').on('click', () => button.click());
      let iframeHeightDebounceTimer = null;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(iframeHeightDebounceTimer);
        if (ignoreIframeContainerResize) {
          return;
        }
        iframeHeightDebounceTimer = setTimeout(setLocalStorageFromElementHeightSEorMSPage, 200, iframeContainerHeightStorageKey, iframeContainer);
      });
      resizeObserver.observe(iframeContainer[0]);
      ignoreIframeContainerResize = false;
      const iframeEl = iframe[0];
      window.addEventListener('message', (event) => {
        const iframeWindow = iframeEl.contentWindow;
        if (event.source === iframeWindow && IFRAME_ORIGIN_REGEX_IN_PAGE.test(event.origin)) {
          const currentIframeOrigin = event.origin;
          // It's from this iframe.
          const data = event.data;
          if (typeof data === 'object') {
            if (data.messageType === 'SEOAID-iframe-ready') {
              iframeWindow.postMessage({
                messageType: 'SEOAID-textarea-height-from-storage',
                textareaHeight: localStorage[iframeTextareaHeightStorageKey] || 0,
              }, currentIframeOrigin);
              getText()
                .then((textToTest) => {
                  iframeWindow.postMessage({
                    messageType: 'SEOAID-fill-text',
                    textToTest,
                  }, currentIframeOrigin);
                });
            } else if (data.messageType === 'SEOAID-iframe-body-scrollHeight') {
              const dataScollHeightNumber = pixelTextToNumber(data.bodyScrollHeight);
              if (dataScollHeightNumber) {
                setIframeContainerHeight(`${dataScollHeightNumber + 15}px`);
              }
            } else if (data.messageType === 'SEOAID-textarea-height-to-storage') {
              localStorage[iframeTextareaHeightStorageKey] = data.textareaHeight || 0;
            }
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
      const button = $(`<a class="SEOAID-post-menu-button" href="${IFRAME_URL_IN_PAGE}" title="Run the post content through the Hugging Face GPT-2 Output Detector.">Detect OpenAI</button>`);
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
      const button = $(`<a class="SEOAID-markdown-button" href="${IFRAME_URL_IN_PAGE}" title="Run the post content through the Hugging Face GPT-2 Output Detector.">Detect OpenAI</a>`);
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
          const button = $(`<a class="flex--item" title="Run the revision content through the Hugging Face GPT-2 Output Detector." href="${IFRAME_URL_IN_PAGE}">Detect OpenAI</a>`);
          const sourceUrl = sourceButton[0].href;
          const menu = sourceButton.parent();
          menu.append(button);
          button
            .data('sourceUrl', sourceUrl)
            .on('click', handleRevisionButtonClick);
        });
      }
    }
  } /* inSEorMSPage */

  function inPageAdjustHuggingFaceAPICall(request) {
    const [_, baseURL, originalQuery] = request.url.match(/^([^?]+)\?(.+)$/s);
    const encodedText = encodeURIComponent(originalQuery);
    // The HF API returns an error when the query is longer than 16383 characters.
    let maxQueryCharacters = 16382;
    // Account for the maximum potentially being in the middle of an encoded character.
    let truncatedQuery = encodedText.slice(0, maxQueryCharacters);
    if (maxQueryCharacters < encodedText.length) {
      let wasError = true;
      while (wasError) {
        try {
          decodeURIComponent(truncatedQuery);
          wasError = false;
        } catch(error) {
          wasError = true;
          maxQueryCharacters--;
          truncatedQuery = encodedText.slice(0, maxQueryCharacters);
        }
      }
    }
    const fullURL = `${baseURL}?${truncatedQuery}`;
    if (maxQueryCharacters < encodedText.length) {
      document.body.classList.add('SEOAID-request-truncated');
    } else {
      document.body.classList.remove('SEOAID-request-truncated');
    }
    request.url = fullURL;
  }

  function inOpenAIDetectorPage() {
    function setLocalStorageFromElementHeightAIDetectorPage(storageKey, container) {
        const containerHeight = container.style.height;
        localStorage[storageKey] = containerHeight || 0;
    }

    function createButton(text, className, title, onClick) {
      const button = document.createElement('button');
      button.textContent = text;
      button.title = title;
      button.className = className + ' SEOAID-header-button';
      button.addEventListener('click', onClick);
      return button;
    }

    function setTextAndTriggerPrediction(text, retainCurrentInsertOffset) {
      const textbox = document.getElementById('textbox');
      const origSelectionEnd = textbox.selectionEnd || 0;
      const origScrollTop = textbox.scrollTop || 0;
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
      if (retainCurrentInsertOffset) {
        // This isn't perfect, but it's probably closer to what a user expects.
        textbox.selectionEnd = origSelectionEnd;
        // A setTimeout is needed here.  If the textbox.scrollTop is not delayed, then it's
        // ineffective, at least in Firefox.
        // The process does result in a flash movement, but the disruption is minimal and it
        // does end up mostly where it was.  If we wanted to get fancy, we'd determine how
        // much of the text is being changed prior to the insert and scroll locations and
        // adjust the values based on that.
        setTimeout(() => {
          textbox.scrollTop = origScrollTop;
        }, 0);
      }
      textbox.dispatchEvent(new InputEvent('input'));
    }

    /* The following regexes were taken from SOCVR's Magic Editor version 1.8.0:
         https://github.com/SO-Close-Vote-Reviewers/UserScripts#magic-editor
         https://github.com/SO-Close-Vote-Reviewers/UserScripts/blob/master/Magic%E2%84%A2Editor.user.js
       It's authored by multiple people.  It's mostly under an MIT license, but you
         should check the specifics in the repository and commits.
         They have been modified. It's expected the changes will be copied back
         to Magic Editor.
     */
    const codeBlockRegexes = {
      // code fences
      //   Code blocks starting and ending with a code fence. Does not include inline code
      //        https://regex101.com/r/3Rb4Id/3
      "codeFences": /^ *(?=```)(`{3,})[^\r\n]*[\r\n]*(?<codeText>[^]+?)\1/gm,
      // indented code blocks
      //        https://regex101.com/r/uTI5VH/2
      "indentedCodeBlocks":  /(?<codeText>(?:(?:^[ \t]*(?:[\r\n]|\r\n))^(?:(?:[ ]{4}|[ ]{0,3}\t).+(?:[\r\n]?(?!\n\S)(?:[ \t]+\n)*)+)+))/gm,
      // indented code block at the start of the post.
      //        https://regex101.com/r/Dsn0Wy/2
      "indentedCodeBlockAtStart":  /(?<codeText>(?:^(?:(?:[ ]{4}|[ ]{0,3}\t).+(?:[\r\n]?(?!\n\S)(?:[ ]+\n)*)+)+))/g,
      // <pre></pre> blocks
      //        https://regex101.com/r/Gi0ysr/2
      "preBlocks": /<pre(?: [^>]*?|)>(?<innerCodeElement><code(?: [^>]*?|)>(?<codeText>[\W\w]*?)<\/code>)<\/pre>|<pre(?: [^>]*?|)>(?<preText>[\W\w]*?)<\/pre>/gi,
    };
    const inlineCodeRegexes = {
      //  These do *not* prevent matching within code blocks, so code blocks must be removed first.
      // inline code
      //        https://regex101.com/r/LTf0dA/3
      "inlineCode": /(?!^```)`(?<!``)(?:(`*)(?<codeText>(?:\\`|[^`](?!\n\n))+)`\1)/gm,
      // <code></code> blocks
      //        https://regex101.com/r/7UGbRu/2
      "codeTags":  /<code(?<!<pre><code)(?: [^>]*?|)>(?<codeText>[\W\w]*?)<\/code>/gi,
    };
    const allCodeRegexes = Object.assign({}, codeBlockRegexes, inlineCodeRegexes);
    const linkRegexes = {
      // link-sections
      //   Testing of this and the "links" RegExp was done within the same regex101.com "regex".
      //   The prior version of this was https://regex101.com/r/tZ4eY3/7 it was saved and became version 21.
      //   It was then forked into it's own regex:
      //        https://regex101.com/r/C7nXfd/2
      "linkSections":   /(?:^ *(?:[\r\n]|\r\n))?(?: {2}(?:\[\d\]): \w*:+\/\/.*\n*)+/gm,
      // links and pathnames
      //   See comment above the "linkSections" RegExp regarding testing sharing the same "regex" on regex101.com
      //        https://regex101.com/r/tZ4eY3/26
      "links":  /!?\[(?<!\\\[)(?<linkText>(?:[^\]\n]|\\\]|\]\((?=[^)]+\)\]))+)\](?:\((?:[^\)\n"]|"(?:[^"]|"(?!\)))*"(?=\)))+\)|\[[^\]\n]+\])(?:\](?:\([^\)\n]+\)|\[[^\]\n]+\]))?|(?:\/\w+\/|.:\\|\w*:\/\/|\.+\/[./\w\d]+|(?:\w+\.\w+){2,})[./\w\d:/?#\[\]@!$&'()*+,;=\-~%]*/gi,
      // HTML anchor elements
      //        https://regex101.com/r/j8MnYg/1
      "htmlAnchors":  /<a [^>]*>(?<linkText>(?:[^<]|<(?!\/a>))*)<\/a>/gi,
    };
    const formattingRegexes = {
      // bold and italics
      //   This leaves quite a bit to be desired, but should work under most cases to match the first layer.
      //        https://regex101.com/r/WkevC2/1
      "boldAndItalics":  /((_|\*)(?<!\\\2)\2{0,2}(?!\2))(?!\s)(?<formattedText>(?:.(?!\2)|\\)+?.)\1(?<!\\\1)/gi,
    };

    function regexRemovalsWithProtection(text, keepRegexes, removeRegexes, namedGroupsToKeep, processKeeps) {
      function normalizeSomeTypesToArrayOfObjects(value) {
        if (!Array.isArray(value)) {
          if (value instanceof RegExp) {
            value = [{value}];
          } else if (value !== null && typeof value === 'object' ) {
            value = [value];
          } else {
            value = [];
          }
        } else {
          value = value.map((val, index) => {
            if (val instanceof RegExp) {
              val = {[`RegExp${index}`]: val};
            }
            // Other than Objects, which are fine as-is, we don't have other types which are known how to handle.
            // So, we just let any errors happen later.
            return val;
          });
        }
        return value;
      }

      namedGroupsToKeep = typeof namedGroupsToKeep === 'string' ? [namedGroupsToKeep] : namedGroupsToKeep;
      keepRegexes = normalizeSomeTypesToArrayOfObjects(keepRegexes);
      removeRegexes = normalizeSomeTypesToArrayOfObjects(removeRegexes);
      text = text.replace(/Q/g, 'QA'); // Free up placeholders
      let currentCodePoint = 'A'.codePointAt(0) + 1;
      const substitutions = [];
      keepRegexes.forEach((obj) => {
        Object.entries(obj).forEach(([key, reg]) => {
          reg.lastIndex = 0;
          text = text.replace(reg, (match) => {
            const placeholder = `Q${String.fromCodePoint(currentCodePoint++)}`;
            substitutions.push([placeholder, match]);
            return placeholder;
          });
        });
      });
      removeRegexes.forEach((obj) => {
        Object.entries(obj).forEach(([key, reg]) => {
          reg.lastIndex = 0;
          if (Array.isArray(namedGroupsToKeep)) {
            text = text.replace(reg, function(match, p1) {
              const matchedGroups = arguments[arguments.length - 1];
              if (typeof matchedGroups === 'object') {
                let keepText = Object.entries(matchedGroups).reduce((sum, [key, value]) => sum + namedGroupsToKeep.includes(key) ? value || '' : '', '');
                if (typeof processKeeps === 'function') {
                  keepText = processKeeps(keepText);
                }
                return keepText;
              }
              return '';
            });
          } else {
            text = text.replace(reg, '');
          }
        });
      });
      substitutions.reverse();
      substitutions.forEach(([placeholder, replacement]) => {
        text = text.replaceAll(placeholder, replacement);
      });
      text = text.replaceAll('QA', 'Q'); // Close the placeholders
      return text;
    }

    function textboxRegexRemovalsWithProtection(keepRegexes, removeRegexes, namedGroupsToKeep, processKeeps) {
      const textbox = document.getElementById('textbox');
      const initialText = textbox.value;
      setTextAndTriggerPrediction(regexRemovalsWithProtection(initialText, keepRegexes, removeRegexes, namedGroupsToKeep, processKeeps).trim(), true);
    }

    function flushLeftText(minLeftSpaces, textToAdjust) {
      const lines = textToAdjust.split(/[\r\n]+/g);
      const minStartSpaces = textToAdjust.split(/[\r\n]+/g).reduce((sum, text) => {
        const trimLength = text.trimStart().length;
        return Math.min(sum, trimLength ? text.length - trimLength : sum);
      }, 9999999);
      const leftSpaces = ' '.repeat(minLeftSpaces);
      return lines.map((line) => leftSpaces + line.slice(minStartSpaces)).join('\n');
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
    headerButtonContainer.append(createButton('Restore text', 'SEOAID-restore-text-button', 'Restore the text to what was initially automatically placed in the textbox.', () => setTextAndTriggerPrediction(receivedText, true)));
    headerButtonContainer.insertAdjacentHTML('beforeend', '<span class="SEOAID-strip-buttons-wrap"><span class="SEOAID-strip-buttons-text"></span><span class="SEOAID-strip-buttons-container"></span></span>');
    const stripButtonsWrap = headerButtonContainer.querySelector('.SEOAID-strip-buttons-wrap');
    const stripButtonsText = stripButtonsWrap.querySelector('.SEOAID-strip-buttons-text');
    stripButtonsText.append('Strip:');
    const stripButtonsContainer = stripButtonsWrap.querySelector('.SEOAID-strip-buttons-container');
    stripButtonsContainer.append(createButton('links', 'SEOAID-strip-links-button', 'Remove links, but not the link text. Spammers tend to link existing words to their domain. This will remove the links.', () => textboxRegexRemovalsWithProtection(allCodeRegexes, linkRegexes, ['linkText'])));
    stripButtonsContainer.append(createButton('links & text', 'SEOAID-strip-links-and-link-text-button', 'Remove links and link text. Spammers also tend to insert their own text with links. This removes both the link and link text.', () => textboxRegexRemovalsWithProtection(allCodeRegexes, linkRegexes)));
    stripButtonsContainer.append(createButton('code blocks', 'SEOAID-strip-code blocks-button', 'Remove code blocks, including code.', () => textboxRegexRemovalsWithProtection(null, codeBlockRegexes)));
    stripButtonsContainer.append(createButton('<!-- -->', 'SEOAID-strip-HTML-comments-button', 'Remove HTML comments (e.g. used to indicate Stack Snippets).', () => textboxRegexRemovalsWithProtection(allCodeRegexes, /<!--.*?-->[\r\n]*/g)));
    stripButtonsContainer.append(createButton('```', 'SEOAID-strip-code-fence-formatting-button', 'Remove code fence formatting. This removes just the code fence formatting, not the code.', () => textboxRegexRemovalsWithProtection(null, codeBlockRegexes.codeFences, ['codeText'])));
    stripButtonsContainer.append(createButton('⇤', 'SEOAID-strip-unindent-code-block-formatting-button', 'Remove the indent from Markdown indented code format. It makes the code block flush against the start of the line, but retains relative indents internal to the code.', () => textboxRegexRemovalsWithProtection(codeBlockRegexes.codeFences, {
      indentedCodeBlocks: codeBlockRegexes.indentedCodeBlocks,
      indentedCodeBlockAtStart: codeBlockRegexes.indentedCodeBlockAtStart,
    }, ['codeText'], flushLeftText.bind(null, 0))));
    stripButtonsContainer.append(createButton('`code`', 'SEOAID-strip-inline-code-formatting-button', 'Remove inline code formatting.', () => textboxRegexRemovalsWithProtection(codeBlockRegexes, inlineCodeRegexes, ['codeText'])));
    stripButtonsContainer.append(createButton('bold & italics', 'SEOAID-strip-bold-and-italics-formatting-button', 'Remove bold and italics formatting. It may be necessary to do this more than once to get all of it.', () => textboxRegexRemovalsWithProtection(allCodeRegexes, formattingRegexes.boldAndItalics, ['formattedText'])));
    stripButtonsContainer.append(createButton('\\s+ !code', 'SEOAID-strip-whitespace-not-code-button', 'Convert all sequences of whitespace (e.g. line endings), excluding in code, to a single space.', () => textboxRegexRemovalsWithProtection(codeBlockRegexes, [ /(?<whitespace>(?:[^\S\n\r]|[\n\r](?<!Q[^A][\n\r])(?!Q[^A]))+)/g, / (?<=[\n\r] )/g ], ['whitespace'], () => ' ')));
    stripButtonsContainer.append(createButton('\\s+', 'SEOAID-strip-whitespace-button', 'Convert all sequences of whitespace (e.g. line endings), including in code, to a single space.', () => setTextAndTriggerPrediction((document.getElementById('textbox').value || '').replace(/\s+/g, ' '))));

    document.documentElement.insertAdjacentHTML('beforeend', `<style id="SEOAID-styles">
/* Styles when not in iframe */
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
.SEOAID-header-button-container {
  display: flex;
  gap: 10px;
  height: min-content;
  padding: 15px 0px 0px 0px;
  align-self: center;
}
.SEOAID-strip-buttons-wrap {
  white-space: nowrap;
  display: flex;
  gap: 5px;
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
.SEOAID-strip-unindent-code-block-formatting-button {
  line-height: 12px;
  font-size: 26px;
  padding-top: 0;
  padding-bottom: 6px;
}
.SEOAID-strip-code-fence-formatting-button {
  font-weight: bold;
  font-size: 16px;
  line-height: 16px;
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
  padding: 5px min(1.5vw, 10px);
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
  padding: 5px min(1.5vw, 10px);
  font-size: 15px;
  line-height: 19.5px;
  resize: vertical;
  overflow: auto;
}
#container > p {
  order: 10;
  margin-top: 2em;
  display: none;
}
.SEOAID-header-button-container {
  margin: 0 auto .25em auto;
  padding: 5px 0px 0px 0px;
  align-self: unset;
}
</style>`);
      const textbox = document.getElementById('textbox');
      const iframeTexboxHeightStorageKey = 'SEOAID-textbox-height';
      const storageIframeTextboxHeight = localStorage[iframeTexboxHeightStorageKey] || 0;
      if (storageIframeTextboxHeight) {
        textbox.style.height = storageIframeTextboxHeight;
      }
      textbox.style.resize = 'vertical';
      let textboxHeightDebounceTimer = null;
      let resizeObserverHasSeenFirstResize = false;
      const resizeObserver = new ResizeObserver(() => {
        if (!resizeObserverHasSeenFirstResize) {
          // The observer appears to always get called upon the start of observation.
          // We want to ignore that first call.
          resizeObserverHasSeenFirstResize = true;
          return;
        }
        clearTimeout(textboxHeightDebounceTimer);
        textboxHeightDebounceTimer = setTimeout(() => {
          setLocalStorageFromElementHeightAIDetectorPage(iframeTexboxHeightStorageKey, textbox);
          window.top.postMessage({
            messageType: 'SEOAID-textarea-height-to-storage',
            textareaHeight: localStorage[iframeTexboxHeightStorageKey] || 0,
          }, '*');
        }, 200);
      });
      resizeObserver.observe(textbox)
      window.addEventListener('message', function(event) {
        if (event.source === window.top && /^https?:\/\/(?:[^/.]+\.)*(?:stackexchange\.com|stackoverflow\.com|serverfault\.com|superuser\.com|askubuntu\.com|stackapps\.com|mathoverflow\.net|stackoverflowteams\.com|metasmoke.erwaysoftware.com)\/?$/.test(event.origin)) {
          // It's from SE
          const data = event.data;
          if (typeof data === 'object') {
            if (data.messageType === 'SEOAID-fill-text') {
              const textToTest = data.textToTest;
              if (typeof textToTest === 'string') {
                receivedText = textToTest;
                document.body.classList.add('SEOAID-have-received-text');
                setTextAndTriggerPrediction(textToTest, true);
                setTimeout(() => {
                  resizeObserver.unobserve(textbox);
                  const storageIframeTextboxHeightPixels = Number((localStorage[iframeTexboxHeightStorageKey] || '').replaceAll('px', '')) || 485; // 485px is the default height.
                  textbox.style.height = 0;
                  const newHeight = Math.min(storageIframeTextboxHeightPixels, textbox.scrollHeight + 5);
                  textbox.style.height = `${newHeight}px`;
                  resizeObserverHasSeenFirstResize = false;
                  setTimeout(() => {
                    resizeObserver.observe(textbox);
                    window.top.postMessage({
                      messageType: 'SEOAID-iframe-body-scrollHeight',
                      bodyScrollHeight: document.body.scrollHeight,
                    }, '*');
                  }, 10);
                }, 10);
              }
            } else if (data.messageType === 'SEOAID-textarea-height-from-storage') {
              localStorage[iframeTexboxHeightStorageKey] = data.textareaHeight || 0;
              console.log('IFRAME: SEOAID-textarea-height-from-storage: localStorage[iframeTexboxHeightStorageKey]:', localStorage[iframeTexboxHeightStorageKey]);                                                                                                                                                                                                                 //WinMerge ignore line
            }
          }
        }
      });
      window.top.postMessage({
        messageType: 'SEOAID-iframe-ready',
      }, '*');
    }
  } /* inOpenAIDetectorPage */

  if (IFRAME_ORIGIN_REGEX.test(window.location.origin)) {
      inOpenAIDetectorPage();
      return;
  }

  document.documentElement.insertAdjacentHTML('beforeend', `<style id="SEOAID-styles-for-in-page-iframe">
/* Styles for in page iframe */
.SEOAID-oaid-iframe {
  border: unset;
  width: 100%;
}
.SEOID-iframe-container {
  resize: vertical;
  overflow-y: auto;
  border: 2px solid #333;
  margin-top: 10px;
  padding-right: 0px;
  margin-right: var(--su16);
  display: flex;
  position: relative;
}
.SEOAID-iframe-close-button-container {
  position: absolute;
  top: 8px;
  right: 4px;
  cursor: pointer;
}
.SEOAID-iframe-close-button {
  /* These are copied from SE's popup close button. */
  padding: 3px 6px 2px;
  font-size: var(--fs-body3);
  font-weight: normal;
  color: hsl(0,0%,100%) !important;
  background-color: hsl(210,8%,5%);
  font-family: Arial,Helvetica,sans-serif;
  line-height: 1;
}
</style>`);
  makyenUtilities.executeInPage(inSEorMSPage, true, 'OpenAI-detector-page-script', IFRAME_ORIGIN, IFRAME_URL, IFRAME_ORIGIN_REGEX);

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
    const baseURL = DETECTOR_BASE_URL;
    const encodedText = encodeURIComponent(text);
    let maxQueryCharacters = 16382;
    // Restrict the length of OAI API request URLs to prevent 414 Request URI Too Long errors
    let truncatedQuery = encodedText.slice(0, maxQueryCharacters);
    if (maxQueryCharacters < encodedText.length) {
      let wasError = true;
      while (wasError) {
        try {
          decodeURIComponent(truncatedQuery);
          wasError = false;
        } catch(error) {
          wasError = true;
          maxQueryCharacters--;
          truncatedQuery = encodedText.slice(0, maxQueryCharacters);
        }
      }
    }
    const fullURL = `${baseURL}?${truncatedQuery}`;
    return new Promise((resolve, reject) => {
      gmXmlhttpRequest({
        method: "GET",
        url: fullURL,
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
