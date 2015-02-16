// twoStage.js - Copyright (c) 2015 - Joseph Strommen - MIT License

var twoStage = function () {

	// DOM utility functions.
	var Dom = {
		onDocumentReady: function(fn) {
			if (document.readyState != 'loading') {
				fn();
			} else if (document.addEventListener) {
				document.addEventListener('DOMContentLoaded', fn);
			} else {
				document.attachEvent('onreadystatechange', function () {
					if (document.readyState != 'loading')
						fn();
				});
			}
		},

		addClass: function (el, className) {
			if (el.classList)
				el.classList.add(className);
			else
				el.className += ' ' + className;
		},

		querySelectorAllIncludingSelf: function (el, selector) {
			var parent = el.parentNode;
			var matchesUnderParent = parent.querySelectorAll(selector);
			var matches = [];
			for (var i = 0; i < matchesUnderParent.length; i++) {
				var match = matchesUnderParent[i];
				while (true) {
					if (match === el) {
						matches.push(match);
						break;
					} else if (match === parent) {
						break;
					} else {
						match = match.parentNode;
					}
				}
			}

			return matches;
		}
	};

	var self = {
		isDocumentReady: false,
		onReadyCallbacks: [],
		ajaxResponseHTML: undefined,

		updateDom: function () {
			var newDoc = document.implementation.createHTMLDocument('');
			newDoc.documentElement.innerHTML = self.ajaxResponseHTML;

			var newEls = [];

			var toReplace = document.querySelectorAll("[data-dynamic-id]");

			for (var i = 0; i < toReplace.length; i++) {
				var el = toReplace[i];
				var id = el.getAttribute('data-dynamic-id');
				var newEl = newDoc.querySelector("[data-dynamic-id=" + id + "]");
				el.parentNode.replaceChild(newEl, el);

				newEls.push(newEl);
			}

			for (var i = 0; i < self.onReadyCallbacks.length; i++) {
				var readyFn = self.onReadyCallbacks[i];
				if (typeof readyFn.selector === 'string') {
					var matchingEls = [];
					for (var n = 0; n < newEls.length; n++) {
						var newEl = newEls[n];
						var thisElMatches = Dom.querySelectorAllIncludingSelf(newEl, readyFn.selector);
						matchingEls = matchingEls.concat(thisElMatches);
					}

					if (matchingEls.length) {
						readyFn.fn.apply(matchingEls);
					}
				}
			}

			Dom.addClass(document.body, "two-stage-finished");
		},

		requestDynamicContent: function () {
			var request = new XMLHttpRequest();
			var url = window.location.href;
			if (window.location.search) {
				url += "&_=";
			} else {
				url += "?_=";
			}
			request.open('GET', url, true);

			request.onreadystatechange = function () {
				if (this.readyState === 4) {
					if (this.status >= 200 && this.status < 400) {
						self.ajaxResponseHTML = this.responseText;
						Dom.onDocumentReady(self.updateDom);
					}
				}
			};

			request.send();
			request = null;
		},

		invokeOnReadyCallback: function (onReadyCallback) {
			var selector = onReadyCallback.selector;
			var fn = onReadyCallback.fn;

			var nodes = selector ? document.querySelectorAll(selector) : [document];
			if (nodes.length) {
				fn.apply(nodes);
			}
		},

		init: function () {

			// Stylesheet code taken from http://davidwalsh.name/add-rules-stylesheets
			var style = document.createElement("style");
			style.appendChild(document.createTextNode("")); // WebKit hack :(
			document.head.appendChild(style);
			style.sheet.insertRule("[data-dynamic-id] { visibility: hidden; }", 0);
			style.sheet.insertRule(".two-stage-finished [data-dynamic-id] { visibility: visible; }", 1);

			self.requestDynamicContent();

			// Monkey-patch history.pushState so we can request dynamic content on a pushState navigation
			if (window.history && typeof window.history.pushState === 'function') {
				var pushState = window.history.pushState;
				window.history.pushState = function () {
					pushState.apply(window.history, arguments);
					self.requestDynamicContent();
				};
			}
			addEventListener('popstate', self.requestDynamicContent);

			Dom.onDocumentReady(function () {

				self.isDocumentReady = true;
				for (var i = 0; i < self.onReadyCallbacks.length; i++) {
					self.invokeOnReadyCallback(self.onReadyCallbacks[i]);
				}
			});
		},

		// Public Functions
		onReady: function (selector, fn) {

			if (!fn) {
				fn = selector;
				selector = null;
			}

			var onReadyCallback = { selector: selector, fn: fn };
			self.onReadyCallbacks.push(onReadyCallback);

			if (self.isDocumentReady) {
				self.invokeOnReadyCallback(onReadyCallback);
			}
		}
	};

	self.init();

	return {
		onReady: self.onReady
	};
}();
