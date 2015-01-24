(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.0.0
 */

(function() {
    "use strict";

    function $$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function $$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function $$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var $$utils$$_isArray;

    if (!Array.isArray) {
      $$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      $$utils$$_isArray = Array.isArray;
    }

    var $$utils$$isArray = $$utils$$_isArray;
    var $$utils$$now = Date.now || function() { return new Date().getTime(); };
    function $$utils$$F() { }

    var $$utils$$o_create = (Object.create || function (o) {
      if (arguments.length > 1) {
        throw new Error('Second argument not supported');
      }
      if (typeof o !== 'object') {
        throw new TypeError('Argument must be an object');
      }
      $$utils$$F.prototype = o;
      return new $$utils$$F();
    });

    var $$asap$$len = 0;

    var $$asap$$default = function asap(callback, arg) {
      $$asap$$queue[$$asap$$len] = callback;
      $$asap$$queue[$$asap$$len + 1] = arg;
      $$asap$$len += 2;
      if ($$asap$$len === 2) {
        // If len is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        $$asap$$scheduleFlush();
      }
    };

    var $$asap$$browserGlobal = (typeof window !== 'undefined') ? window : {};
    var $$asap$$BrowserMutationObserver = $$asap$$browserGlobal.MutationObserver || $$asap$$browserGlobal.WebKitMutationObserver;

    // test for web worker but not in IE10
    var $$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function $$asap$$useNextTick() {
      return function() {
        process.nextTick($$asap$$flush);
      };
    }

    function $$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new $$asap$$BrowserMutationObserver($$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function $$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = $$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function $$asap$$useSetTimeout() {
      return function() {
        setTimeout($$asap$$flush, 1);
      };
    }

    var $$asap$$queue = new Array(1000);

    function $$asap$$flush() {
      for (var i = 0; i < $$asap$$len; i+=2) {
        var callback = $$asap$$queue[i];
        var arg = $$asap$$queue[i+1];

        callback(arg);

        $$asap$$queue[i] = undefined;
        $$asap$$queue[i+1] = undefined;
      }

      $$asap$$len = 0;
    }

    var $$asap$$scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      $$asap$$scheduleFlush = $$asap$$useNextTick();
    } else if ($$asap$$BrowserMutationObserver) {
      $$asap$$scheduleFlush = $$asap$$useMutationObserver();
    } else if ($$asap$$isWorker) {
      $$asap$$scheduleFlush = $$asap$$useMessageChannel();
    } else {
      $$asap$$scheduleFlush = $$asap$$useSetTimeout();
    }

    function $$$internal$$noop() {}
    var $$$internal$$PENDING   = void 0;
    var $$$internal$$FULFILLED = 1;
    var $$$internal$$REJECTED  = 2;
    var $$$internal$$GET_THEN_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function $$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.')
    }

    function $$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        $$$internal$$GET_THEN_ERROR.error = error;
        return $$$internal$$GET_THEN_ERROR;
      }
    }

    function $$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function $$$internal$$handleForeignThenable(promise, thenable, then) {
       $$asap$$default(function(promise) {
        var sealed = false;
        var error = $$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            $$$internal$$resolve(promise, value);
          } else {
            $$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          $$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          $$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function $$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, thenable._result);
      } else if (promise._state === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, thenable._result);
      } else {
        $$$internal$$subscribe(thenable, undefined, function(value) {
          $$$internal$$resolve(promise, value);
        }, function(reason) {
          $$$internal$$reject(promise, reason);
        });
      }
    }

    function $$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        $$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = $$$internal$$getThen(maybeThenable);

        if (then === $$$internal$$GET_THEN_ERROR) {
          $$$internal$$reject(promise, $$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          $$$internal$$fulfill(promise, maybeThenable);
        } else if ($$utils$$isFunction(then)) {
          $$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          $$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function $$$internal$$resolve(promise, value) {
      if (promise === value) {
        $$$internal$$reject(promise, $$$internal$$selfFullfillment());
      } else if ($$utils$$objectOrFunction(value)) {
        $$$internal$$handleMaybeThenable(promise, value);
      } else {
        $$$internal$$fulfill(promise, value);
      }
    }

    function $$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      $$$internal$$publish(promise);
    }

    function $$$internal$$fulfill(promise, value) {
      if (promise._state !== $$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = $$$internal$$FULFILLED;

      if (promise._subscribers.length === 0) {
      } else {
        $$asap$$default($$$internal$$publish, promise);
      }
    }

    function $$$internal$$reject(promise, reason) {
      if (promise._state !== $$$internal$$PENDING) { return; }
      promise._state = $$$internal$$REJECTED;
      promise._result = reason;

      $$asap$$default($$$internal$$publishRejection, promise);
    }

    function $$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + $$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + $$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        $$asap$$default($$$internal$$publish, parent);
      }
    }

    function $$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          $$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function $$$internal$$ErrorObject() {
      this.error = null;
    }

    var $$$internal$$TRY_CATCH_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        $$$internal$$TRY_CATCH_ERROR.error = e;
        return $$$internal$$TRY_CATCH_ERROR;
      }
    }

    function $$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = $$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = $$$internal$$tryCatch(callback, detail);

        if (value === $$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          $$$internal$$reject(promise, $$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== $$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        $$$internal$$resolve(promise, value);
      } else if (failed) {
        $$$internal$$reject(promise, error);
      } else if (settled === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, value);
      } else if (settled === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, value);
      }
    }

    function $$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          $$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          $$$internal$$reject(promise, reason);
        });
      } catch(e) {
        $$$internal$$reject(promise, e);
      }
    }

    function $$$enumerator$$makeSettledResult(state, position, value) {
      if (state === $$$internal$$FULFILLED) {
        return {
          state: 'fulfilled',
          value: value
        };
      } else {
        return {
          state: 'rejected',
          reason: value
        };
      }
    }

    function $$$enumerator$$Enumerator(Constructor, input, abortOnReject, label) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor($$$internal$$noop, label);
      this._abortOnReject = abortOnReject;

      if (this._validateInput(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._init();

        if (this.length === 0) {
          $$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            $$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        $$$internal$$reject(this.promise, this._validationError());
      }
    }

    $$$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return $$utils$$isArray(input);
    };

    $$$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    $$$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var $$$enumerator$$default = $$$enumerator$$Enumerator;

    $$$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var promise = this.promise;
      var input   = this._input;

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    $$$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      if ($$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== $$$internal$$PENDING) {
          entry._onerror = null;
          this._settledAt(entry._state, i, entry._result);
        } else {
          this._willSettleAt(c.resolve(entry), i);
        }
      } else {
        this._remaining--;
        this._result[i] = this._makeResult($$$internal$$FULFILLED, i, entry);
      }
    };

    $$$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === $$$internal$$PENDING) {
        this._remaining--;

        if (this._abortOnReject && state === $$$internal$$REJECTED) {
          $$$internal$$reject(promise, value);
        } else {
          this._result[i] = this._makeResult(state, i, value);
        }
      }

      if (this._remaining === 0) {
        $$$internal$$fulfill(promise, this._result);
      }
    };

    $$$enumerator$$Enumerator.prototype._makeResult = function(state, i, value) {
      return value;
    };

    $$$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      $$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt($$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt($$$internal$$REJECTED, i, reason);
      });
    };

    var $$promise$all$$default = function all(entries, label) {
      return new $$$enumerator$$default(this, entries, true /* abort on reject */, label).promise;
    };

    var $$promise$race$$default = function race(entries, label) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor($$$internal$$noop, label);

      if (!$$utils$$isArray(entries)) {
        $$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        $$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        $$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        $$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    };

    var $$promise$resolve$$default = function resolve(object, label) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$resolve(promise, object);
      return promise;
    };

    var $$promise$reject$$default = function reject(reason, label) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$reject(promise, reason);
      return promise;
    };

    var $$es6$promise$promise$$counter = 0;

    function $$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function $$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var $$es6$promise$promise$$default = $$es6$promise$promise$$Promise;

    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function $$es6$promise$promise$$Promise(resolver) {
      this._id = $$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if ($$$internal$$noop !== resolver) {
        if (!$$utils$$isFunction(resolver)) {
          $$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof $$es6$promise$promise$$Promise)) {
          $$es6$promise$promise$$needsNew();
        }

        $$$internal$$initializePromise(this, resolver);
      }
    }

    $$es6$promise$promise$$Promise.all = $$promise$all$$default;
    $$es6$promise$promise$$Promise.race = $$promise$race$$default;
    $$es6$promise$promise$$Promise.resolve = $$promise$resolve$$default;
    $$es6$promise$promise$$Promise.reject = $$promise$reject$$default;

    $$es6$promise$promise$$Promise.prototype = {
      constructor: $$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === $$$internal$$FULFILLED && !onFulfillment || state === $$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor($$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          $$asap$$default(function(){
            $$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          $$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    var $$es6$promise$polyfill$$default = function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport =
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return $$utils$$isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = $$es6$promise$promise$$default;
      }
    };

    var es6$promise$umd$$ES6Promise = {
      'Promise': $$es6$promise$promise$$default,
      'polyfill': $$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = es6$promise$umd$$ES6Promise;
    }
}).call(this);
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"1YiZ5S":3}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
"use strict";

var es6 = require("../bower_components/es6-promise/promise");
var EventEmitter = require("events").EventEmitter;
var Store = require("./Store");

// ### Dispatcher Helpers

// Rollback listener adds a `rollback` event listener to the bunch of
// stores.
function __rollbackListener(stores) {

  function __listener() {
    for (var i in stores) {
      stores[i].listener.emit('__rollback');
    }
  }

  /* If any of them fires `rollback` event, all of the stores
     will be emitted to be rolled back with `__rollback` event. */
  for (var j in stores) {
    stores[j].listener.on('rollback', __listener);
  }
}

// ### Dispatcher Prototype
function Dispatcher(stores) {
  var self = this;
  // `DeLorean.EventEmitter` is `require('events').EventEmitter` by default.
  // you can change it using `DeLorean.Flux.define('EventEmitter', AnotherEventEmitter)`
  this.listener = new EventEmitter();
  this.stores = stores;

  /* Stores should be listened for rollback events. */
  __rollbackListener(Object.keys(stores).map(function (key) {
    return stores[key];
  }));
}

// `dispatch` method dispatch the event with `data` (or **payload**)
Dispatcher.prototype.dispatch = function (actionName, data) {
  var self = this, stores, deferred;

  this.listener.emit('dispatch', actionName, data);
  /* Stores are key-value pairs. Collect store instances into an array. */
  stores = (function () {
    var stores = [], store;
    for (var storeName in self.stores) {
      store = self.stores[storeName];
      /* Store value must be an _instance of Store_. */
      if (!store instanceof Store) {
        throw 'Given store is not a store instance';
      }
      stores.push(store);
    }
    return stores;
  }());

  // Store instances should wait for finish. So you can know if all the
  // stores are dispatched properly.
  deferred = this.waitFor(stores, actionName);

  /* Payload should send to all related stores. */
  for (var storeName in self.stores) {
    self.stores[storeName].dispatchAction(actionName, data);
  }

  // `dispatch` returns deferred object you can just use **promise**
  // for dispatching: `dispatch(..).then(..)`.
  return deferred;
};

// `waitFor` is actually a _semi-private_ method. Because it's kind of internal
// and you don't need to call it from outside most of the times. It takes
// array of store instances (`[Store, Store, Store, ...]`). It will create
// a promise and return it. _Whenever store changes, it resolves the promise_.
Dispatcher.prototype.waitFor = function (stores, actionName) {
  var self = this, promises;
  promises = (function () {
    var __promises = [], promise;

    /* `__promiseGenerator` generates a simple promise that resolves itself when
        related store is changed. */
    function __promiseGenerator(store) {
      // `Promise` is `require('es6-promise').Promise` by default.
      // you can change it using `DeLorean.Flux.define('Promise', AnotherPromise)`
      return new es6.Promise(function (resolve, reject) {
        store.listener.once('change', resolve);
      });
    }

    for (var i in stores) {
      // Only generate promises for stores that ae listening for this action
      if (stores[i].store.actions[actionName] != null) {
        promise = __promiseGenerator(stores[i]);
        __promises.push(promise);
      }
    }
    return __promises;
  }());
  // When all the promises are resolved, dispatcher emits `change:all` event.
  return es6.Promise.all(promises).then(function () {
    self.listener.emit('change:all');
  });
};

// `registerAction` method adds a method to the prototype. So you can just use
// `dispatcherInstance.actionName()`.
Dispatcher.prototype.registerAction = function (action, callback) {
  /* The callback must be a function. */
  if (typeof callback === 'function') {
    this[action] = callback.bind(this.stores);
  } else {
    throw 'Action callback should be a function.';
  }
};

// `register` method adds an global action callback to the dispatcher.
Dispatcher.prototype.register = function (callback) {
  /* The callback must be a function. */
  if (typeof callback === 'function') {
    this.listener.on('dispatch', callback);
  } else {
    throw 'Global callback should be a function.';
  }
};

// `getStore` returns the store from stores hash.
// You can also use `dispatcherInstance.stores[storeName]` but
// it checks if the store really exists.
Dispatcher.prototype.getStore = function (storeName) {
  if (!this.stores[storeName]) {
    throw 'Store ' + storeName + ' does not exist.';
  }
  return this.stores[storeName].store;
};

// ### Shortcuts

Dispatcher.prototype.on = function () {
  return this.listener.on.apply(this.listener, arguments);
};

Dispatcher.prototype.off = function () {
  return this.listener.removeListener.apply(this.listener, arguments);
};

Dispatcher.prototype.emit = function () {
  return this.listener.emit.apply(this.listener, arguments);
};

module.exports = Dispatcher;
},{"../bower_components/es6-promise/promise":1,"./Store":5,"events":2}],5:[function(require,module,exports){
"use strict";

var uitls = require("./utils");
var EventEmitter = require("events").EventEmitter;

function Store(store, args) {
  /* store parameter must be an `object` */
  if (typeof store !== 'object') {
    throw 'Stores should be defined by passing the definition to the constructor';
  }

  // `DeLorean.EventEmitter` is `require('events').EventEmitter` by default.
  // you can change it using `DeLorean.Flux.define('EventEmitter', AnotherEventEmitter)`
  this.listener = new EventEmitter();

  /* Store is _hygenic_ object. DeLorean doesn't extend it, it uses it. */
  this.store = utils.clone(store);
  this.bindActions();
  this.buildScheme();

  // `initialize` is the construction function, you can define `initialize` method
  // in your store definitions.
  if (typeof store.initialize === 'function') {
    store.initialize.apply(this.store, args);
  }
}

 // `set` method updates the data defined at the `scheme` of the store.
Store.prototype.set = function (arg1, value) {
  var changedProps = [];
  if (typeof arg1 === 'object') {
    for (var keyName in arg1) {
      changedProps.push(keyName);
      this.setValue(keyName, arg1[keyName]);
    }
  } else {
    changedProps.push(arg1);
    this.setValue(arg1, value);
  }
  this.recalculate(changedProps);
  return this.store[arg1];
};

// `set` method updates the data defined at the `scheme` of the store.
Store.prototype.setValue = function (key, value) {
  var scheme = this.store.scheme, definition;
  if (scheme && this.store.scheme[key]) {
    definition = scheme[key];

    this.store[key] = value || definition.default;

    if (typeof definition.calculate === 'function') {
      this.store[utils.generateOriginalName(key)] = value;
      this.store[key] = definition.calculate.call(this.store, value);
    }
  } else {
    // Scheme **must** include the key you wanted to set.
    if (console != null) {
      console.warn('Scheme must include the key, ' + key + ', you are trying to set. ' + key + ' will NOT be set on the store.');
    }
  }
  return this.store[key];
};

// Removes the scheme format and standardizes all the shortcuts.
// If you run `formatScheme({name: 'joe'})` it will return you
// `{name: {default: 'joe'}}`. Also if you run `formatScheme({fullname: function () {}})`
// it will return `{fullname: {calculate: function () {}}}`.
Store.prototype.formatScheme = function (scheme) {
  var formattedScheme = {}, definition, defaultValue, calculatedValue;
  for (var keyName in scheme) {
    definition = scheme[keyName];
    defaultValue = null;
    calculatedValue = null;

    formattedScheme[keyName] = {default: null};

    /* {key: 'value'} will be {key: {default: 'value'}} */
    defaultValue = (definition && typeof definition === 'object') ?
                    definition.default : definition;
    formattedScheme[keyName].default = defaultValue;

    /* {key: function () {}} will be {key: {calculate: function () {}}} */
    if (definition && typeof definition.calculate === 'function') {
      calculatedValue = definition.calculate;
      /* Put a dependency array on formattedSchemes with calculate defined */
      if (definition.deps) {
        formattedScheme[keyName].deps = definition.deps;
      } else {
        formattedScheme[keyName].deps = [];
      }

    } else if (typeof definition === 'function') {
      calculatedValue = definition;
    }
    if (calculatedValue) {
      formattedScheme[keyName].calculate = calculatedValue;
    }
  }
  return formattedScheme;
};

/* Applying `scheme` to the store if exists. */
Store.prototype.buildScheme = function () {
  var scheme, calculatedData, keyName, definition, dependencyMap, dependents, dep, changedProps = [];

  if (typeof this.store.scheme === 'object') {
    /* Scheme must be formatted to standardize the keys. */
    scheme = this.store.scheme = this.formatScheme(this.store.scheme);
    dependencyMap = this.store.utils.dependencyMap = {};

    /* Set the defaults first */
    for (keyName in scheme) {
      definition = scheme[keyName];
      this.store[keyName] = utils.clone(definition.default);
    }

    /* Set the calculations */
    for (keyName in scheme) {
      definition = scheme[keyName];
      if (definition.calculate) {
        // Create a dependency map - {keyName: [arrayOfKeysThatDependOnIt]}
        dependents = definition.deps || [];

        for (var i = 0; i < dependents.length; i++) {
          dep = dependents[i];
          if (dependencyMap[dep] == null) {
            dependencyMap[dep] = [];
          }
          dependencyMap[dep].push(keyName);
        }

        this.store[utils.generateOriginalName(keyName)] = definition.default;
        this.store[keyName] = definition.calculate.call(this.store, definition.default);
        changedProps.push(keyName);
      }
    }
    // Recalculate any properties dependent on those that were just set
    this.recalculate(changedProps);
  }
};

Store.prototype.recalculate = function (changedProps) {
  var scheme = this.store.scheme, dependencyMap = this.store.utils.dependencyMap, didRun = [], definition, keyName, dependents, dep;
  // Only iterate over the properties that just changed
  for (var i = 0; i < changedProps.length; i++) {
    dependents = dependencyMap[changedProps[i]];
    // If there are no properties dependent on this property, do nothing
    if (dependents == null) {
      continue;
    }
    // Iterate over the dependendent properties
    for (var d = 0; d < dependents.length; d++) {
      dep = dependents[d];
      // Do nothing if this value has already been recalculated on this change batch
      if (didRun.indexOf(dep) !== -1) {
        continue;
      }
      // Calculate this value
      definition = scheme[dep];
      this.store[dep] = definition.calculate.call(this.store,
                            this.store[utils.generateOriginalName(dep)] || definition.default);

      // Make sure this does not get calculated again in this change batch
      didRun.push(dep);
    }
  }
  // Update Any deps on the deps
  if (didRun.length > 0) {
    this.recalculate(didRun);
  }
  this.listener.emit('change');
};

// `bindActions` is semi-private method. You'll never need to call it from outside.
// It powers up the `this.store` object.
Store.prototype.bindActions = function () {
  var callback;

  // Some required methods can be used in **store definition** like
  // **`emit`**, **`emitChange`**, **`emitRollback`**, **`rollback`**, **`listenChanges`**
  this.store.emit = this.listener.emit.bind(this.listener);
  this.store.emitChange = this.listener.emit.bind(this.listener, 'change');
  this.store.emitRollback = this.listener.emit.bind(this.listener, 'rollback');
  this.store.rollback = this.listener.on.bind(this.listener, 'utils.rollback');
  this.store.listenChanges = this.listenChanges.bind(this);
  this.store.set = this.set.bind(this);

  // Stores must have a `actions` hash of `actionName: methodName`
  // `methodName` is the `this.store`'s prototype method..
  for (var actionName in this.store.actions) {
    if (utils.hasOwn(this.store.actions, actionName)) {
      callback = this.store.actions[actionName];
      if (typeof this.store[callback] !== 'function') {
        throw 'Callback \'' + callback + '\' defined for action \'' + actionName + '\' should be a method defined on the store!';
      }
      /* And `actionName` should be a name generated by `utils.generateActionName` */
      this.listener.on(utils.generateActionName(actionName),
                       this.store[callback].bind(this.store));
    }
  }
};

// `dispatchAction` called from a dispatcher. You can also call anywhere but
// you probably won't need to do. It simply **emits an event with a payload**.
Store.prototype.dispatchAction = function (actionName, data) {
  this.listener.emit(utils.generateActionName(actionName), data);
};

// ### Shortcuts

// `listenChanges` is a shortcut for `Object.observe` usage. You can just use
// `Object.observe(object, function () { ... })` but everytime you use it you
// repeat yourself. DeLorean has a shortcut doing this properly.
Store.prototype.listenChanges = function (object) {
  var self = this, observer;
  if (!Object.observe) {
    console.error('Store#listenChanges method uses Object.observe, you should fire changes manually.');
    return;
  }

  observer = Array.isArray(object) ? Array.observe : Object.observe;

  observer(object, function (changes) {
    self.listener.emit('change', changes);
  });
};

// `onChange` simply listens changes and calls a callback. Shortcut for
// a `on('change')` command.
Store.prototype.onChange = function (callback) {
  this.listener.on('change', callback);
};

module.exports = Store;
},{"./utils":8,"events":2}],6:[function(require,module,exports){
"use strict";

var Dispatcher = require("./Dispatcher");
var Store = require("./Store");
var utils = require("./utils");
var mixins = require("./mixins");

var Flux = {

  // `createStore` **creates a function to create a store**. So it's like
  // a factory.
  createStore: function (factoryDefinition) {
    return function () {
      return new Store(factoryDefinition, arguments);
    };
  },

  // `createDispatcher` generates a dispatcher with actions to dispatch.
  /* `actionsToDispatch` should be an object. */
  createDispatcher: function (actionsToDispatch) {
    var actionsOfStores, dispatcher, callback, triggers, triggerMethod;

    // If it has `getStores` method it should be get and pass to the `Dispatcher`
    if (typeof actionsToDispatch.getStores === 'function') {
      actionsOfStores = actionsToDispatch.getStores();
    }

    /* If there are no stores defined, it's an empty object. */
    dispatcher = new Dispatcher(actionsOfStores || {});

    /* Now call `registerAction` method for every action. */
    for (var actionName in actionsToDispatch) {
      if (utils.hasOwn(actionsToDispatch, actionName)) {
        /* `getStores` & `viewTriggers` are special properties, it's not an action. */
        if (actionName !== 'getStores' && actionName != 'viewTriggers') {
          callback = actionsToDispatch[actionName];
          dispatcher.registerAction(actionName, callback.bind(dispatcher));
        }
      }
    }

    /* Bind triggers */
    triggers = actionsToDispatch.viewTriggers;
    for (var triggerName in triggers) {
      triggerMethod = triggers[triggerName];
      if (typeof dispatcher[triggerMethod] === 'function') {
        dispatcher.on(triggerName, dispatcher[triggerMethod]);
      } else {
        if (console != null) {
          console.warn(triggerMethod + ' should be a method defined on your dispatcher. The ' + triggerName + ' trigger will not be bound to any method.');
        }
      }
    }

    return dispatcher;
  }
};

Flux.mixins = mixins;

module.exports = Flux;

},{"./Dispatcher":4,"./Store":5,"./mixins":7,"./utils":8}],7:[function(require,module,exports){
"use strict";

var utils = require("./utils");

modules.exprots = {
    // It should be inserted to the React components which
    // used in Flux.
    // Simply `mixin: [Flux.mixins.storeListener]` will work.
    storeListener: {

        trigger: function () {
          this.__dispatcher.emit.apply(this.__dispatcher, arguments);
        },

        // After the component mounted, listen changes of the related stores
        componentDidMount: function () {
          var self = this, store, storeName;

          /* `__changeHandler` is a **listener generator** to pass to the `onChange` function. */
          function __changeHandler(store, storeName) {
            return function () {
              var state, args;
              /* If the component is mounted, change state. */
              if (self.isMounted()) {
                self.setState(self.getStoreStates());
              }
              // When something changes it calls the components `storeDidChanged` method if exists.
              if (self.storeDidChange) {
                args = [storeName].concat(Array.prototype.slice.call(arguments, 0));
                self.storeDidChange.apply(self, args);
              }
            };
          }

          // Remember the change handlers so they can be removed later
          this.__changeHandlers = {};

          /* Generate and bind the change handlers to the stores. */
          for (storeName in this.__watchStores) {
            if (utils.hasOwn(this.stores, storeName)) {
              store = this.stores[storeName];
              this.__changeHandlers[storeName] = __changeHandler(store, storeName);
              store.onChange(this.__changeHandlers[storeName]);
            }
          }
        },

        // When a component unmounted, it should stop listening.
        componentWillUnmount: function () {
          for (var storeName in this.__changeHandlers) {
            if (utils.hasOwn(this.stores, storeName)) {
              var store = this.stores[storeName];
              store.listener.removeListener('change', this.__changeHandlers[storeName]);
            }
          }
        },

        getInitialState: function () {
          var self = this, state, storeName;

          /* The dispatcher should be easy to access and it should use `__findDispatcher`
             method to find the parent dispatchers. */
          this.__dispatcher = utils.findDispatcher(this);

          // If `storesDidChange` method presents, it'll be called after all the stores
          // were changed.
          if (this.storesDidChange) {
            this.__dispatcher.on('change:all', function () {
              self.storesDidChange();
            });
          }

          // Since `dispatcher.stores` is harder to write, there's a shortcut for it.
          // You can use `this.stores` from the React component.
          this.stores = this.__dispatcher.stores;

          this.__watchStores = {};
          if (this.watchStores != null) {
            for (var i = 0; i < this.watchStores.length;  i++) {
              storeName = this.watchStores[i];
              this.__watchStores[storeName] = this.stores[storeName];
            }
          } else {
            this.__watchStores = this.stores;
            if (console != null && Object.keys != null && Object.keys(this.stores).length > 4) {
              console.warn('Your component is watching changes on all stores, you may want to define a "watchStores" property in order to only watch stores relevant to this component.');
            }
          }

          return this.getStoreStates();
        },

        getStoreStates: function () {
          var state = {stores: {}}, store;

          /* Set `state.stores` for all present stores with a `setState` method defined. */
          for (var storeName in this.__watchStores) {
            if (utils.hasOwn(this.stores, storeName)) {
              state.stores[storeName] = {};
              store = this.__watchStores[storeName].store;
              if (store && store.getState) {
                state.stores[storeName] = store.getState();
              } else if (typeof store.scheme === 'object') {
                var scheme = store.scheme;
                for (var keyName in scheme) {
                  state.stores[storeName][keyName] = store[keyName];
                }
              }
            }
          }
          return state;
        },

        // `getStore` is a shortcut to get the store from the state.
        getStore: function (storeName) {
          return this.state.stores[storeName];
        }
    }
};


},{"./utils":8}],8:[function(require,module,exports){
"use strict";

  // ## Private Helper Functions

  // Helper functions are private functions to be used in codebase.
  // It's better using two underscore at the beginning of the function.

  /* `__hasOwn` function is a shortcut for `Object#hasOwnProperty` */
function __hasOwn(object, prop) {
    return Object.prototype.hasOwnProperty.call(object, prop);
}

  // Use `__generateActionName` function to generate action names.
  // E.g. If you create an action with name `hello` it will be
  // `action:hello` for the Flux.
function __generateActionName(name) {
    return 'action:' + name;
}

  /* It's used by the schemes to save the original version (not calculated)
     of the data. */
function __generateOriginalName(name) {
    return 'original:' + name;
}

  // `__findDispatcher` is a private function for **React components**.
function __findDispatcher(view) {
     // Provide a useful error message if no dispatcher is found in the chain
    if (view == null) {
        throw 'No disaptcher found. The DeLoreanJS mixin requires a "dispatcher" property to be passed to a component, or one of it\'s ancestors.';
    }
    /* `view` should be a component instance. If a component don't have
        any dispatcher, it tries to find a dispatcher from the parents. */
    if (!view.props.dispatcher) {
        return __findDispatcher(view._owner);
    }
    return view.props.dispatcher;
}

  // `__clone` creates a deep copy of an object.
function __clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (__hasOwn(obj, attr)) {
            copy[attr] = __clone(obj[attr]);
        }
    }
    return copy;
}

module.exports = {
    clone: __clone,
    findDispatcher: __findDispatcher,
    generateActionName: __generateActionName,
    generateOriginalName: __generateOriginalName,
    hasOwn: __hasOwn
};
},{}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9hY2VsYW4vZ2l0L0VTaW5hUHJvamVjdC9zcmMvbGliL0ZsdXgvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2FjZWxhbi9naXQvRVNpbmFQcm9qZWN0L3NyYy9saWIvRmx1eC9ib3dlcl9jb21wb25lbnRzL2VzNi1wcm9taXNlL3Byb21pc2UuanMiLCIvVXNlcnMvYWNlbGFuL2dpdC9FU2luYVByb2plY3Qvc3JjL2xpYi9GbHV4L25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvVXNlcnMvYWNlbGFuL2dpdC9FU2luYVByb2plY3Qvc3JjL2xpYi9GbHV4L25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9hY2VsYW4vZ2l0L0VTaW5hUHJvamVjdC9zcmMvbGliL0ZsdXgvc3JjL0Rpc3BhdGNoZXIuanMiLCIvVXNlcnMvYWNlbGFuL2dpdC9FU2luYVByb2plY3Qvc3JjL2xpYi9GbHV4L3NyYy9TdG9yZS5qcyIsIi9Vc2Vycy9hY2VsYW4vZ2l0L0VTaW5hUHJvamVjdC9zcmMvbGliL0ZsdXgvc3JjL2Zha2VfOWZlMzg1YzUuanMiLCIvVXNlcnMvYWNlbGFuL2dpdC9FU2luYVByb2plY3Qvc3JjL2xpYi9GbHV4L3NyYy9taXhpbnMuanMiLCIvVXNlcnMvYWNlbGFuL2dpdC9FU2luYVByb2plY3Qvc3JjL2xpYi9GbHV4L3NyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDajhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4wXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRfaXNBcnJheTtcblxuICAgIGlmICghQXJyYXkuaXNBcnJheSkge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRpc0FycmF5ID0gJCR1dGlscyQkX2lzQXJyYXk7XG4gICAgdmFyICQkdXRpbHMkJG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG4gICAgZnVuY3Rpb24gJCR1dGlscyQkRigpIHsgfVxuXG4gICAgdmFyICQkdXRpbHMkJG9fY3JlYXRlID0gKE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY29uZCBhcmd1bWVudCBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICAkJHV0aWxzJCRGLnByb3RvdHlwZSA9IG87XG4gICAgICByZXR1cm4gbmV3ICQkdXRpbHMkJEYoKTtcbiAgICB9KTtcblxuICAgIHZhciAkJGFzYXAkJGxlbiA9IDA7XG5cbiAgICB2YXIgJCRhc2FwJCRkZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuXSA9IGNhbGxiYWNrO1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgJCRhc2FwJCRsZW4gKz0gMjtcbiAgICAgIGlmICgkJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gICAgdmFyICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyICQkYXNhcCQkaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygkJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3ICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoJCRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gJCRhc2FwJCRmbHVzaDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dCgkJGFzYXAkJGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSAkJGFzYXAkJHF1ZXVlW2ldO1xuICAgICAgICB2YXIgYXJnID0gJCRhc2FwJCRxdWV1ZVtpKzFdO1xuXG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpKzFdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAkJGFzYXAkJGxlbiA9IDA7XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkc2NoZWR1bGVGbHVzaDtcblxuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkbm9vcCgpIHt9XG4gICAgdmFyICQkJGludGVybmFsJCRQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyICQkJGludGVybmFsJCRGVUxGSUxMRUQgPSAxO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVycm9yID0gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gICAgICBpZiAodGhlbmFibGUuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gJCQkaW50ZXJuYWwkJGdldFRoZW4obWF5YmVUaGVuYWJsZSk7XG5cbiAgICAgICAgaWYgKHRoZW4gPT09ICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSAkJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAvLyBub29wXG4gICAgICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJG1ha2VTZXR0bGVkUmVzdWx0KHN0YXRlLCBwb3NpdGlvbiwgdmFsdWUpIHtcbiAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAnZnVsZmlsbGVkJyxcbiAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdyZWplY3RlZCcsXG4gICAgICAgICAgcmVhc29uOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0LCBhYm9ydE9uUmVqZWN0LCBsYWJlbCkge1xuICAgICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICB0aGlzLl9hYm9ydE9uUmVqZWN0ID0gYWJvcnRPblJlamVjdDtcblxuICAgICAgaWYgKHRoaXMuX3ZhbGlkYXRlSW5wdXQoaW5wdXQpKSB7XG4gICAgICAgIHRoaXMuX2lucHV0ICAgICA9IGlucHV0O1xuICAgICAgICB0aGlzLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgICB0aGlzLl9pbml0KCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgICB0aGlzLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHRoaXMucHJvbWlzZSwgdGhpcy5fdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiAkJHV0aWxzJCRpc0FycmF5KGlucHV0KTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRpb25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgJCQkZW51bWVyYXRvciQkZGVmYXVsdCA9ICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3I7XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGVuZ3RoICA9IHRoaXMubGVuZ3RoO1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG4gICAgICB2YXIgaW5wdXQgICA9IHRoaXMuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICAgIGlmICgkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgZW50cnkuX29uZXJyb3IgPSBudWxsO1xuICAgICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChjLnJlc29sdmUoZW50cnkpLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgZW50cnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcblxuICAgICAgICBpZiAodGhpcy5fYWJvcnRPblJlamVjdCAmJiBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdChzdGF0ZSwgaSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX21ha2VSZXN1bHQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFsbChlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgcmV0dXJuIG5ldyAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0KHRoaXMsIGVudHJpZXMsIHRydWUgLyogYWJvcnQgb24gcmVqZWN0ICovLCBsYWJlbCkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmFjZShlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG5cbiAgICAgIGlmICghJCR1dGlscyQkaXNBcnJheShlbnRyaWVzKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbG1lbnQodmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVzb2x2ZShvYmplY3QsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVqZWN0KHJlYXNvbiwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyID0gMDtcblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0ID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlO1xuXG4gICAgLyoqXG4gICAgICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gICAgICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICAgICAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2XigJlzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICB0aGlzLl9pZCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlcisrO1xuICAgICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgICBpZiAoJCQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gJCRwcm9taXNlJGFsbCQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9ICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZXNvbHZlID0gJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9ICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQ7XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBzdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQgJiYgIW9uUmVqZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJlbnQuX3Jlc3VsdDtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbc3RhdGUgLSAxXTtcbiAgICAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSxcblxuICAgIC8qKlxuICAgICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmNocm9ub3VzXG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQXV0aG9yKCk7XG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfVxuXG4gICAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgY2F0Y2hcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQpIHtcbiAgICAgICAgbG9jYWwgPSB3aW5kb3c7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHZhciBlczZQcm9taXNlU3VwcG9ydCA9XG4gICAgICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgICAgIC8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgbWlzc2luZyBmcm9tXG4gICAgICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJlamVjdFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgLy8gT2xkZXIgdmVyc2lvbiBvZiB0aGUgc3BlYyBoYWQgYSByZXNvbHZlciBvYmplY3RcbiAgICAgICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZTtcbiAgICAgICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgICAgICByZXR1cm4gJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgICAgICBsb2NhbC5Qcm9taXNlID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0O1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlID0ge1xuICAgICAgJ1Byb21pc2UnOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzWydFUzZQcm9taXNlJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxufSkuY2FsbCh0aGlzKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZXM2ID0gcmVxdWlyZShcIi4uL2Jvd2VyX2NvbXBvbmVudHMvZXM2LXByb21pc2UvcHJvbWlzZVwiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcbnZhciBTdG9yZSA9IHJlcXVpcmUoXCIuL1N0b3JlXCIpO1xuXG4vLyAjIyMgRGlzcGF0Y2hlciBIZWxwZXJzXG5cbi8vIFJvbGxiYWNrIGxpc3RlbmVyIGFkZHMgYSBgcm9sbGJhY2tgIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBidW5jaCBvZlxuLy8gc3RvcmVzLlxuZnVuY3Rpb24gX19yb2xsYmFja0xpc3RlbmVyKHN0b3Jlcykge1xuXG4gIGZ1bmN0aW9uIF9fbGlzdGVuZXIoKSB7XG4gICAgZm9yICh2YXIgaSBpbiBzdG9yZXMpIHtcbiAgICAgIHN0b3Jlc1tpXS5saXN0ZW5lci5lbWl0KCdfX3JvbGxiYWNrJyk7XG4gICAgfVxuICB9XG5cbiAgLyogSWYgYW55IG9mIHRoZW0gZmlyZXMgYHJvbGxiYWNrYCBldmVudCwgYWxsIG9mIHRoZSBzdG9yZXNcbiAgICAgd2lsbCBiZSBlbWl0dGVkIHRvIGJlIHJvbGxlZCBiYWNrIHdpdGggYF9fcm9sbGJhY2tgIGV2ZW50LiAqL1xuICBmb3IgKHZhciBqIGluIHN0b3Jlcykge1xuICAgIHN0b3Jlc1tqXS5saXN0ZW5lci5vbigncm9sbGJhY2snLCBfX2xpc3RlbmVyKTtcbiAgfVxufVxuXG4vLyAjIyMgRGlzcGF0Y2hlciBQcm90b3R5cGVcbmZ1bmN0aW9uIERpc3BhdGNoZXIoc3RvcmVzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gYERlTG9yZWFuLkV2ZW50RW1pdHRlcmAgaXMgYHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcmAgYnkgZGVmYXVsdC5cbiAgLy8geW91IGNhbiBjaGFuZ2UgaXQgdXNpbmcgYERlTG9yZWFuLkZsdXguZGVmaW5lKCdFdmVudEVtaXR0ZXInLCBBbm90aGVyRXZlbnRFbWl0dGVyKWBcbiAgdGhpcy5saXN0ZW5lciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdGhpcy5zdG9yZXMgPSBzdG9yZXM7XG5cbiAgLyogU3RvcmVzIHNob3VsZCBiZSBsaXN0ZW5lZCBmb3Igcm9sbGJhY2sgZXZlbnRzLiAqL1xuICBfX3JvbGxiYWNrTGlzdGVuZXIoT2JqZWN0LmtleXMoc3RvcmVzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiBzdG9yZXNba2V5XTtcbiAgfSkpO1xufVxuXG4vLyBgZGlzcGF0Y2hgIG1ldGhvZCBkaXNwYXRjaCB0aGUgZXZlbnQgd2l0aCBgZGF0YWAgKG9yICoqcGF5bG9hZCoqKVxuRGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2ggPSBmdW5jdGlvbiAoYWN0aW9uTmFtZSwgZGF0YSkge1xuICB2YXIgc2VsZiA9IHRoaXMsIHN0b3JlcywgZGVmZXJyZWQ7XG5cbiAgdGhpcy5saXN0ZW5lci5lbWl0KCdkaXNwYXRjaCcsIGFjdGlvbk5hbWUsIGRhdGEpO1xuICAvKiBTdG9yZXMgYXJlIGtleS12YWx1ZSBwYWlycy4gQ29sbGVjdCBzdG9yZSBpbnN0YW5jZXMgaW50byBhbiBhcnJheS4gKi9cbiAgc3RvcmVzID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3RvcmVzID0gW10sIHN0b3JlO1xuICAgIGZvciAodmFyIHN0b3JlTmFtZSBpbiBzZWxmLnN0b3Jlcykge1xuICAgICAgc3RvcmUgPSBzZWxmLnN0b3Jlc1tzdG9yZU5hbWVdO1xuICAgICAgLyogU3RvcmUgdmFsdWUgbXVzdCBiZSBhbiBfaW5zdGFuY2Ugb2YgU3RvcmVfLiAqL1xuICAgICAgaWYgKCFzdG9yZSBpbnN0YW5jZW9mIFN0b3JlKSB7XG4gICAgICAgIHRocm93ICdHaXZlbiBzdG9yZSBpcyBub3QgYSBzdG9yZSBpbnN0YW5jZSc7XG4gICAgICB9XG4gICAgICBzdG9yZXMucHVzaChzdG9yZSk7XG4gICAgfVxuICAgIHJldHVybiBzdG9yZXM7XG4gIH0oKSk7XG5cbiAgLy8gU3RvcmUgaW5zdGFuY2VzIHNob3VsZCB3YWl0IGZvciBmaW5pc2guIFNvIHlvdSBjYW4ga25vdyBpZiBhbGwgdGhlXG4gIC8vIHN0b3JlcyBhcmUgZGlzcGF0Y2hlZCBwcm9wZXJseS5cbiAgZGVmZXJyZWQgPSB0aGlzLndhaXRGb3Ioc3RvcmVzLCBhY3Rpb25OYW1lKTtcblxuICAvKiBQYXlsb2FkIHNob3VsZCBzZW5kIHRvIGFsbCByZWxhdGVkIHN0b3Jlcy4gKi9cbiAgZm9yICh2YXIgc3RvcmVOYW1lIGluIHNlbGYuc3RvcmVzKSB7XG4gICAgc2VsZi5zdG9yZXNbc3RvcmVOYW1lXS5kaXNwYXRjaEFjdGlvbihhY3Rpb25OYW1lLCBkYXRhKTtcbiAgfVxuXG4gIC8vIGBkaXNwYXRjaGAgcmV0dXJucyBkZWZlcnJlZCBvYmplY3QgeW91IGNhbiBqdXN0IHVzZSAqKnByb21pc2UqKlxuICAvLyBmb3IgZGlzcGF0Y2hpbmc6IGBkaXNwYXRjaCguLikudGhlbiguLilgLlxuICByZXR1cm4gZGVmZXJyZWQ7XG59O1xuXG4vLyBgd2FpdEZvcmAgaXMgYWN0dWFsbHkgYSBfc2VtaS1wcml2YXRlXyBtZXRob2QuIEJlY2F1c2UgaXQncyBraW5kIG9mIGludGVybmFsXG4vLyBhbmQgeW91IGRvbid0IG5lZWQgdG8gY2FsbCBpdCBmcm9tIG91dHNpZGUgbW9zdCBvZiB0aGUgdGltZXMuIEl0IHRha2VzXG4vLyBhcnJheSBvZiBzdG9yZSBpbnN0YW5jZXMgKGBbU3RvcmUsIFN0b3JlLCBTdG9yZSwgLi4uXWApLiBJdCB3aWxsIGNyZWF0ZVxuLy8gYSBwcm9taXNlIGFuZCByZXR1cm4gaXQuIF9XaGVuZXZlciBzdG9yZSBjaGFuZ2VzLCBpdCByZXNvbHZlcyB0aGUgcHJvbWlzZV8uXG5EaXNwYXRjaGVyLnByb3RvdHlwZS53YWl0Rm9yID0gZnVuY3Rpb24gKHN0b3JlcywgYWN0aW9uTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXMsIHByb21pc2VzO1xuICBwcm9taXNlcyA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIF9fcHJvbWlzZXMgPSBbXSwgcHJvbWlzZTtcblxuICAgIC8qIGBfX3Byb21pc2VHZW5lcmF0b3JgIGdlbmVyYXRlcyBhIHNpbXBsZSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgaXRzZWxmIHdoZW5cbiAgICAgICAgcmVsYXRlZCBzdG9yZSBpcyBjaGFuZ2VkLiAqL1xuICAgIGZ1bmN0aW9uIF9fcHJvbWlzZUdlbmVyYXRvcihzdG9yZSkge1xuICAgICAgLy8gYFByb21pc2VgIGlzIGByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2VgIGJ5IGRlZmF1bHQuXG4gICAgICAvLyB5b3UgY2FuIGNoYW5nZSBpdCB1c2luZyBgRGVMb3JlYW4uRmx1eC5kZWZpbmUoJ1Byb21pc2UnLCBBbm90aGVyUHJvbWlzZSlgXG4gICAgICByZXR1cm4gbmV3IGVzNi5Qcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgc3RvcmUubGlzdGVuZXIub25jZSgnY2hhbmdlJywgcmVzb2x2ZSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHN0b3Jlcykge1xuICAgICAgLy8gT25seSBnZW5lcmF0ZSBwcm9taXNlcyBmb3Igc3RvcmVzIHRoYXQgYWUgbGlzdGVuaW5nIGZvciB0aGlzIGFjdGlvblxuICAgICAgaWYgKHN0b3Jlc1tpXS5zdG9yZS5hY3Rpb25zW2FjdGlvbk5hbWVdICE9IG51bGwpIHtcbiAgICAgICAgcHJvbWlzZSA9IF9fcHJvbWlzZUdlbmVyYXRvcihzdG9yZXNbaV0pO1xuICAgICAgICBfX3Byb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBfX3Byb21pc2VzO1xuICB9KCkpO1xuICAvLyBXaGVuIGFsbCB0aGUgcHJvbWlzZXMgYXJlIHJlc29sdmVkLCBkaXNwYXRjaGVyIGVtaXRzIGBjaGFuZ2U6YWxsYCBldmVudC5cbiAgcmV0dXJuIGVzNi5Qcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5saXN0ZW5lci5lbWl0KCdjaGFuZ2U6YWxsJyk7XG4gIH0pO1xufTtcblxuLy8gYHJlZ2lzdGVyQWN0aW9uYCBtZXRob2QgYWRkcyBhIG1ldGhvZCB0byB0aGUgcHJvdG90eXBlLiBTbyB5b3UgY2FuIGp1c3QgdXNlXG4vLyBgZGlzcGF0Y2hlckluc3RhbmNlLmFjdGlvbk5hbWUoKWAuXG5EaXNwYXRjaGVyLnByb3RvdHlwZS5yZWdpc3RlckFjdGlvbiA9IGZ1bmN0aW9uIChhY3Rpb24sIGNhbGxiYWNrKSB7XG4gIC8qIFRoZSBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24uICovXG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzW2FjdGlvbl0gPSBjYWxsYmFjay5iaW5kKHRoaXMuc3RvcmVzKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyAnQWN0aW9uIGNhbGxiYWNrIHNob3VsZCBiZSBhIGZ1bmN0aW9uLic7XG4gIH1cbn07XG5cbi8vIGByZWdpc3RlcmAgbWV0aG9kIGFkZHMgYW4gZ2xvYmFsIGFjdGlvbiBjYWxsYmFjayB0byB0aGUgZGlzcGF0Y2hlci5cbkRpc3BhdGNoZXIucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIC8qIFRoZSBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24uICovXG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLmxpc3RlbmVyLm9uKCdkaXNwYXRjaCcsIGNhbGxiYWNrKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyAnR2xvYmFsIGNhbGxiYWNrIHNob3VsZCBiZSBhIGZ1bmN0aW9uLic7XG4gIH1cbn07XG5cbi8vIGBnZXRTdG9yZWAgcmV0dXJucyB0aGUgc3RvcmUgZnJvbSBzdG9yZXMgaGFzaC5cbi8vIFlvdSBjYW4gYWxzbyB1c2UgYGRpc3BhdGNoZXJJbnN0YW5jZS5zdG9yZXNbc3RvcmVOYW1lXWAgYnV0XG4vLyBpdCBjaGVja3MgaWYgdGhlIHN0b3JlIHJlYWxseSBleGlzdHMuXG5EaXNwYXRjaGVyLnByb3RvdHlwZS5nZXRTdG9yZSA9IGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcbiAgaWYgKCF0aGlzLnN0b3Jlc1tzdG9yZU5hbWVdKSB7XG4gICAgdGhyb3cgJ1N0b3JlICcgKyBzdG9yZU5hbWUgKyAnIGRvZXMgbm90IGV4aXN0Lic7XG4gIH1cbiAgcmV0dXJuIHRoaXMuc3RvcmVzW3N0b3JlTmFtZV0uc3RvcmU7XG59O1xuXG4vLyAjIyMgU2hvcnRjdXRzXG5cbkRpc3BhdGNoZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5saXN0ZW5lci5vbi5hcHBseSh0aGlzLmxpc3RlbmVyLCBhcmd1bWVudHMpO1xufTtcblxuRGlzcGF0Y2hlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5saXN0ZW5lci5yZW1vdmVMaXN0ZW5lci5hcHBseSh0aGlzLmxpc3RlbmVyLCBhcmd1bWVudHMpO1xufTtcblxuRGlzcGF0Y2hlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubGlzdGVuZXIuZW1pdC5hcHBseSh0aGlzLmxpc3RlbmVyLCBhcmd1bWVudHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdWl0bHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcblxuZnVuY3Rpb24gU3RvcmUoc3RvcmUsIGFyZ3MpIHtcbiAgLyogc3RvcmUgcGFyYW1ldGVyIG11c3QgYmUgYW4gYG9iamVjdGAgKi9cbiAgaWYgKHR5cGVvZiBzdG9yZSAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyAnU3RvcmVzIHNob3VsZCBiZSBkZWZpbmVkIGJ5IHBhc3NpbmcgdGhlIGRlZmluaXRpb24gdG8gdGhlIGNvbnN0cnVjdG9yJztcbiAgfVxuXG4gIC8vIGBEZUxvcmVhbi5FdmVudEVtaXR0ZXJgIGlzIGByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJgIGJ5IGRlZmF1bHQuXG4gIC8vIHlvdSBjYW4gY2hhbmdlIGl0IHVzaW5nIGBEZUxvcmVhbi5GbHV4LmRlZmluZSgnRXZlbnRFbWl0dGVyJywgQW5vdGhlckV2ZW50RW1pdHRlcilgXG4gIHRoaXMubGlzdGVuZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgLyogU3RvcmUgaXMgX2h5Z2VuaWNfIG9iamVjdC4gRGVMb3JlYW4gZG9lc24ndCBleHRlbmQgaXQsIGl0IHVzZXMgaXQuICovXG4gIHRoaXMuc3RvcmUgPSB1dGlscy5jbG9uZShzdG9yZSk7XG4gIHRoaXMuYmluZEFjdGlvbnMoKTtcbiAgdGhpcy5idWlsZFNjaGVtZSgpO1xuXG4gIC8vIGBpbml0aWFsaXplYCBpcyB0aGUgY29uc3RydWN0aW9uIGZ1bmN0aW9uLCB5b3UgY2FuIGRlZmluZSBgaW5pdGlhbGl6ZWAgbWV0aG9kXG4gIC8vIGluIHlvdXIgc3RvcmUgZGVmaW5pdGlvbnMuXG4gIGlmICh0eXBlb2Ygc3RvcmUuaW5pdGlhbGl6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHN0b3JlLmluaXRpYWxpemUuYXBwbHkodGhpcy5zdG9yZSwgYXJncyk7XG4gIH1cbn1cblxuIC8vIGBzZXRgIG1ldGhvZCB1cGRhdGVzIHRoZSBkYXRhIGRlZmluZWQgYXQgdGhlIGBzY2hlbWVgIG9mIHRoZSBzdG9yZS5cblN0b3JlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoYXJnMSwgdmFsdWUpIHtcbiAgdmFyIGNoYW5nZWRQcm9wcyA9IFtdO1xuICBpZiAodHlwZW9mIGFyZzEgPT09ICdvYmplY3QnKSB7XG4gICAgZm9yICh2YXIga2V5TmFtZSBpbiBhcmcxKSB7XG4gICAgICBjaGFuZ2VkUHJvcHMucHVzaChrZXlOYW1lKTtcbiAgICAgIHRoaXMuc2V0VmFsdWUoa2V5TmFtZSwgYXJnMVtrZXlOYW1lXSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNoYW5nZWRQcm9wcy5wdXNoKGFyZzEpO1xuICAgIHRoaXMuc2V0VmFsdWUoYXJnMSwgdmFsdWUpO1xuICB9XG4gIHRoaXMucmVjYWxjdWxhdGUoY2hhbmdlZFByb3BzKTtcbiAgcmV0dXJuIHRoaXMuc3RvcmVbYXJnMV07XG59O1xuXG4vLyBgc2V0YCBtZXRob2QgdXBkYXRlcyB0aGUgZGF0YSBkZWZpbmVkIGF0IHRoZSBgc2NoZW1lYCBvZiB0aGUgc3RvcmUuXG5TdG9yZS5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICB2YXIgc2NoZW1lID0gdGhpcy5zdG9yZS5zY2hlbWUsIGRlZmluaXRpb247XG4gIGlmIChzY2hlbWUgJiYgdGhpcy5zdG9yZS5zY2hlbWVba2V5XSkge1xuICAgIGRlZmluaXRpb24gPSBzY2hlbWVba2V5XTtcblxuICAgIHRoaXMuc3RvcmVba2V5XSA9IHZhbHVlIHx8IGRlZmluaXRpb24uZGVmYXVsdDtcblxuICAgIGlmICh0eXBlb2YgZGVmaW5pdGlvbi5jYWxjdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuc3RvcmVbdXRpbHMuZ2VuZXJhdGVPcmlnaW5hbE5hbWUoa2V5KV0gPSB2YWx1ZTtcbiAgICAgIHRoaXMuc3RvcmVba2V5XSA9IGRlZmluaXRpb24uY2FsY3VsYXRlLmNhbGwodGhpcy5zdG9yZSwgdmFsdWUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBTY2hlbWUgKiptdXN0KiogaW5jbHVkZSB0aGUga2V5IHlvdSB3YW50ZWQgdG8gc2V0LlxuICAgIGlmIChjb25zb2xlICE9IG51bGwpIHtcbiAgICAgIGNvbnNvbGUud2FybignU2NoZW1lIG11c3QgaW5jbHVkZSB0aGUga2V5LCAnICsga2V5ICsgJywgeW91IGFyZSB0cnlpbmcgdG8gc2V0LiAnICsga2V5ICsgJyB3aWxsIE5PVCBiZSBzZXQgb24gdGhlIHN0b3JlLicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcy5zdG9yZVtrZXldO1xufTtcblxuLy8gUmVtb3ZlcyB0aGUgc2NoZW1lIGZvcm1hdCBhbmQgc3RhbmRhcmRpemVzIGFsbCB0aGUgc2hvcnRjdXRzLlxuLy8gSWYgeW91IHJ1biBgZm9ybWF0U2NoZW1lKHtuYW1lOiAnam9lJ30pYCBpdCB3aWxsIHJldHVybiB5b3Vcbi8vIGB7bmFtZToge2RlZmF1bHQ6ICdqb2UnfX1gLiBBbHNvIGlmIHlvdSBydW4gYGZvcm1hdFNjaGVtZSh7ZnVsbG5hbWU6IGZ1bmN0aW9uICgpIHt9fSlgXG4vLyBpdCB3aWxsIHJldHVybiBge2Z1bGxuYW1lOiB7Y2FsY3VsYXRlOiBmdW5jdGlvbiAoKSB7fX19YC5cblN0b3JlLnByb3RvdHlwZS5mb3JtYXRTY2hlbWUgPSBmdW5jdGlvbiAoc2NoZW1lKSB7XG4gIHZhciBmb3JtYXR0ZWRTY2hlbWUgPSB7fSwgZGVmaW5pdGlvbiwgZGVmYXVsdFZhbHVlLCBjYWxjdWxhdGVkVmFsdWU7XG4gIGZvciAodmFyIGtleU5hbWUgaW4gc2NoZW1lKSB7XG4gICAgZGVmaW5pdGlvbiA9IHNjaGVtZVtrZXlOYW1lXTtcbiAgICBkZWZhdWx0VmFsdWUgPSBudWxsO1xuICAgIGNhbGN1bGF0ZWRWYWx1ZSA9IG51bGw7XG5cbiAgICBmb3JtYXR0ZWRTY2hlbWVba2V5TmFtZV0gPSB7ZGVmYXVsdDogbnVsbH07XG5cbiAgICAvKiB7a2V5OiAndmFsdWUnfSB3aWxsIGJlIHtrZXk6IHtkZWZhdWx0OiAndmFsdWUnfX0gKi9cbiAgICBkZWZhdWx0VmFsdWUgPSAoZGVmaW5pdGlvbiAmJiB0eXBlb2YgZGVmaW5pdGlvbiA9PT0gJ29iamVjdCcpID9cbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbi5kZWZhdWx0IDogZGVmaW5pdGlvbjtcbiAgICBmb3JtYXR0ZWRTY2hlbWVba2V5TmFtZV0uZGVmYXVsdCA9IGRlZmF1bHRWYWx1ZTtcblxuICAgIC8qIHtrZXk6IGZ1bmN0aW9uICgpIHt9fSB3aWxsIGJlIHtrZXk6IHtjYWxjdWxhdGU6IGZ1bmN0aW9uICgpIHt9fX0gKi9cbiAgICBpZiAoZGVmaW5pdGlvbiAmJiB0eXBlb2YgZGVmaW5pdGlvbi5jYWxjdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGN1bGF0ZWRWYWx1ZSA9IGRlZmluaXRpb24uY2FsY3VsYXRlO1xuICAgICAgLyogUHV0IGEgZGVwZW5kZW5jeSBhcnJheSBvbiBmb3JtYXR0ZWRTY2hlbWVzIHdpdGggY2FsY3VsYXRlIGRlZmluZWQgKi9cbiAgICAgIGlmIChkZWZpbml0aW9uLmRlcHMpIHtcbiAgICAgICAgZm9ybWF0dGVkU2NoZW1lW2tleU5hbWVdLmRlcHMgPSBkZWZpbml0aW9uLmRlcHM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JtYXR0ZWRTY2hlbWVba2V5TmFtZV0uZGVwcyA9IFtdO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5pdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsY3VsYXRlZFZhbHVlID0gZGVmaW5pdGlvbjtcbiAgICB9XG4gICAgaWYgKGNhbGN1bGF0ZWRWYWx1ZSkge1xuICAgICAgZm9ybWF0dGVkU2NoZW1lW2tleU5hbWVdLmNhbGN1bGF0ZSA9IGNhbGN1bGF0ZWRWYWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZvcm1hdHRlZFNjaGVtZTtcbn07XG5cbi8qIEFwcGx5aW5nIGBzY2hlbWVgIHRvIHRoZSBzdG9yZSBpZiBleGlzdHMuICovXG5TdG9yZS5wcm90b3R5cGUuYnVpbGRTY2hlbWUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzY2hlbWUsIGNhbGN1bGF0ZWREYXRhLCBrZXlOYW1lLCBkZWZpbml0aW9uLCBkZXBlbmRlbmN5TWFwLCBkZXBlbmRlbnRzLCBkZXAsIGNoYW5nZWRQcm9wcyA9IFtdO1xuXG4gIGlmICh0eXBlb2YgdGhpcy5zdG9yZS5zY2hlbWUgPT09ICdvYmplY3QnKSB7XG4gICAgLyogU2NoZW1lIG11c3QgYmUgZm9ybWF0dGVkIHRvIHN0YW5kYXJkaXplIHRoZSBrZXlzLiAqL1xuICAgIHNjaGVtZSA9IHRoaXMuc3RvcmUuc2NoZW1lID0gdGhpcy5mb3JtYXRTY2hlbWUodGhpcy5zdG9yZS5zY2hlbWUpO1xuICAgIGRlcGVuZGVuY3lNYXAgPSB0aGlzLnN0b3JlLnV0aWxzLmRlcGVuZGVuY3lNYXAgPSB7fTtcblxuICAgIC8qIFNldCB0aGUgZGVmYXVsdHMgZmlyc3QgKi9cbiAgICBmb3IgKGtleU5hbWUgaW4gc2NoZW1lKSB7XG4gICAgICBkZWZpbml0aW9uID0gc2NoZW1lW2tleU5hbWVdO1xuICAgICAgdGhpcy5zdG9yZVtrZXlOYW1lXSA9IHV0aWxzLmNsb25lKGRlZmluaXRpb24uZGVmYXVsdCk7XG4gICAgfVxuXG4gICAgLyogU2V0IHRoZSBjYWxjdWxhdGlvbnMgKi9cbiAgICBmb3IgKGtleU5hbWUgaW4gc2NoZW1lKSB7XG4gICAgICBkZWZpbml0aW9uID0gc2NoZW1lW2tleU5hbWVdO1xuICAgICAgaWYgKGRlZmluaXRpb24uY2FsY3VsYXRlKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIGRlcGVuZGVuY3kgbWFwIC0ge2tleU5hbWU6IFthcnJheU9mS2V5c1RoYXREZXBlbmRPbkl0XX1cbiAgICAgICAgZGVwZW5kZW50cyA9IGRlZmluaXRpb24uZGVwcyB8fCBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRlcGVuZGVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBkZXAgPSBkZXBlbmRlbnRzW2ldO1xuICAgICAgICAgIGlmIChkZXBlbmRlbmN5TWFwW2RlcF0gPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVwZW5kZW5jeU1hcFtkZXBdID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlcGVuZGVuY3lNYXBbZGVwXS5wdXNoKGtleU5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdG9yZVt1dGlscy5nZW5lcmF0ZU9yaWdpbmFsTmFtZShrZXlOYW1lKV0gPSBkZWZpbml0aW9uLmRlZmF1bHQ7XG4gICAgICAgIHRoaXMuc3RvcmVba2V5TmFtZV0gPSBkZWZpbml0aW9uLmNhbGN1bGF0ZS5jYWxsKHRoaXMuc3RvcmUsIGRlZmluaXRpb24uZGVmYXVsdCk7XG4gICAgICAgIGNoYW5nZWRQcm9wcy5wdXNoKGtleU5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZWNhbGN1bGF0ZSBhbnkgcHJvcGVydGllcyBkZXBlbmRlbnQgb24gdGhvc2UgdGhhdCB3ZXJlIGp1c3Qgc2V0XG4gICAgdGhpcy5yZWNhbGN1bGF0ZShjaGFuZ2VkUHJvcHMpO1xuICB9XG59O1xuXG5TdG9yZS5wcm90b3R5cGUucmVjYWxjdWxhdGUgPSBmdW5jdGlvbiAoY2hhbmdlZFByb3BzKSB7XG4gIHZhciBzY2hlbWUgPSB0aGlzLnN0b3JlLnNjaGVtZSwgZGVwZW5kZW5jeU1hcCA9IHRoaXMuc3RvcmUudXRpbHMuZGVwZW5kZW5jeU1hcCwgZGlkUnVuID0gW10sIGRlZmluaXRpb24sIGtleU5hbWUsIGRlcGVuZGVudHMsIGRlcDtcbiAgLy8gT25seSBpdGVyYXRlIG92ZXIgdGhlIHByb3BlcnRpZXMgdGhhdCBqdXN0IGNoYW5nZWRcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFuZ2VkUHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICBkZXBlbmRlbnRzID0gZGVwZW5kZW5jeU1hcFtjaGFuZ2VkUHJvcHNbaV1dO1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBwcm9wZXJ0aWVzIGRlcGVuZGVudCBvbiB0aGlzIHByb3BlcnR5LCBkbyBub3RoaW5nXG4gICAgaWYgKGRlcGVuZGVudHMgPT0gbnVsbCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgZGVwZW5kZW5kZW50IHByb3BlcnRpZXNcbiAgICBmb3IgKHZhciBkID0gMDsgZCA8IGRlcGVuZGVudHMubGVuZ3RoOyBkKyspIHtcbiAgICAgIGRlcCA9IGRlcGVuZGVudHNbZF07XG4gICAgICAvLyBEbyBub3RoaW5nIGlmIHRoaXMgdmFsdWUgaGFzIGFscmVhZHkgYmVlbiByZWNhbGN1bGF0ZWQgb24gdGhpcyBjaGFuZ2UgYmF0Y2hcbiAgICAgIGlmIChkaWRSdW4uaW5kZXhPZihkZXApICE9PSAtMSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIENhbGN1bGF0ZSB0aGlzIHZhbHVlXG4gICAgICBkZWZpbml0aW9uID0gc2NoZW1lW2RlcF07XG4gICAgICB0aGlzLnN0b3JlW2RlcF0gPSBkZWZpbml0aW9uLmNhbGN1bGF0ZS5jYWxsKHRoaXMuc3RvcmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdG9yZVt1dGlscy5nZW5lcmF0ZU9yaWdpbmFsTmFtZShkZXApXSB8fCBkZWZpbml0aW9uLmRlZmF1bHQpO1xuXG4gICAgICAvLyBNYWtlIHN1cmUgdGhpcyBkb2VzIG5vdCBnZXQgY2FsY3VsYXRlZCBhZ2FpbiBpbiB0aGlzIGNoYW5nZSBiYXRjaFxuICAgICAgZGlkUnVuLnB1c2goZGVwKTtcbiAgICB9XG4gIH1cbiAgLy8gVXBkYXRlIEFueSBkZXBzIG9uIHRoZSBkZXBzXG4gIGlmIChkaWRSdW4ubGVuZ3RoID4gMCkge1xuICAgIHRoaXMucmVjYWxjdWxhdGUoZGlkUnVuKTtcbiAgfVxuICB0aGlzLmxpc3RlbmVyLmVtaXQoJ2NoYW5nZScpO1xufTtcblxuLy8gYGJpbmRBY3Rpb25zYCBpcyBzZW1pLXByaXZhdGUgbWV0aG9kLiBZb3UnbGwgbmV2ZXIgbmVlZCB0byBjYWxsIGl0IGZyb20gb3V0c2lkZS5cbi8vIEl0IHBvd2VycyB1cCB0aGUgYHRoaXMuc3RvcmVgIG9iamVjdC5cblN0b3JlLnByb3RvdHlwZS5iaW5kQWN0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNhbGxiYWNrO1xuXG4gIC8vIFNvbWUgcmVxdWlyZWQgbWV0aG9kcyBjYW4gYmUgdXNlZCBpbiAqKnN0b3JlIGRlZmluaXRpb24qKiBsaWtlXG4gIC8vICoqYGVtaXRgKiosICoqYGVtaXRDaGFuZ2VgKiosICoqYGVtaXRSb2xsYmFja2AqKiwgKipgcm9sbGJhY2tgKiosICoqYGxpc3RlbkNoYW5nZXNgKipcbiAgdGhpcy5zdG9yZS5lbWl0ID0gdGhpcy5saXN0ZW5lci5lbWl0LmJpbmQodGhpcy5saXN0ZW5lcik7XG4gIHRoaXMuc3RvcmUuZW1pdENoYW5nZSA9IHRoaXMubGlzdGVuZXIuZW1pdC5iaW5kKHRoaXMubGlzdGVuZXIsICdjaGFuZ2UnKTtcbiAgdGhpcy5zdG9yZS5lbWl0Um9sbGJhY2sgPSB0aGlzLmxpc3RlbmVyLmVtaXQuYmluZCh0aGlzLmxpc3RlbmVyLCAncm9sbGJhY2snKTtcbiAgdGhpcy5zdG9yZS5yb2xsYmFjayA9IHRoaXMubGlzdGVuZXIub24uYmluZCh0aGlzLmxpc3RlbmVyLCAndXRpbHMucm9sbGJhY2snKTtcbiAgdGhpcy5zdG9yZS5saXN0ZW5DaGFuZ2VzID0gdGhpcy5saXN0ZW5DaGFuZ2VzLmJpbmQodGhpcyk7XG4gIHRoaXMuc3RvcmUuc2V0ID0gdGhpcy5zZXQuYmluZCh0aGlzKTtcblxuICAvLyBTdG9yZXMgbXVzdCBoYXZlIGEgYGFjdGlvbnNgIGhhc2ggb2YgYGFjdGlvbk5hbWU6IG1ldGhvZE5hbWVgXG4gIC8vIGBtZXRob2ROYW1lYCBpcyB0aGUgYHRoaXMuc3RvcmVgJ3MgcHJvdG90eXBlIG1ldGhvZC4uXG4gIGZvciAodmFyIGFjdGlvbk5hbWUgaW4gdGhpcy5zdG9yZS5hY3Rpb25zKSB7XG4gICAgaWYgKHV0aWxzLmhhc093bih0aGlzLnN0b3JlLmFjdGlvbnMsIGFjdGlvbk5hbWUpKSB7XG4gICAgICBjYWxsYmFjayA9IHRoaXMuc3RvcmUuYWN0aW9uc1thY3Rpb25OYW1lXTtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5zdG9yZVtjYWxsYmFja10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgJ0NhbGxiYWNrIFxcJycgKyBjYWxsYmFjayArICdcXCcgZGVmaW5lZCBmb3IgYWN0aW9uIFxcJycgKyBhY3Rpb25OYW1lICsgJ1xcJyBzaG91bGQgYmUgYSBtZXRob2QgZGVmaW5lZCBvbiB0aGUgc3RvcmUhJztcbiAgICAgIH1cbiAgICAgIC8qIEFuZCBgYWN0aW9uTmFtZWAgc2hvdWxkIGJlIGEgbmFtZSBnZW5lcmF0ZWQgYnkgYHV0aWxzLmdlbmVyYXRlQWN0aW9uTmFtZWAgKi9cbiAgICAgIHRoaXMubGlzdGVuZXIub24odXRpbHMuZ2VuZXJhdGVBY3Rpb25OYW1lKGFjdGlvbk5hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0b3JlW2NhbGxiYWNrXS5iaW5kKHRoaXMuc3RvcmUpKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGBkaXNwYXRjaEFjdGlvbmAgY2FsbGVkIGZyb20gYSBkaXNwYXRjaGVyLiBZb3UgY2FuIGFsc28gY2FsbCBhbnl3aGVyZSBidXRcbi8vIHlvdSBwcm9iYWJseSB3b24ndCBuZWVkIHRvIGRvLiBJdCBzaW1wbHkgKiplbWl0cyBhbiBldmVudCB3aXRoIGEgcGF5bG9hZCoqLlxuU3RvcmUucHJvdG90eXBlLmRpc3BhdGNoQWN0aW9uID0gZnVuY3Rpb24gKGFjdGlvbk5hbWUsIGRhdGEpIHtcbiAgdGhpcy5saXN0ZW5lci5lbWl0KHV0aWxzLmdlbmVyYXRlQWN0aW9uTmFtZShhY3Rpb25OYW1lKSwgZGF0YSk7XG59O1xuXG4vLyAjIyMgU2hvcnRjdXRzXG5cbi8vIGBsaXN0ZW5DaGFuZ2VzYCBpcyBhIHNob3J0Y3V0IGZvciBgT2JqZWN0Lm9ic2VydmVgIHVzYWdlLiBZb3UgY2FuIGp1c3QgdXNlXG4vLyBgT2JqZWN0Lm9ic2VydmUob2JqZWN0LCBmdW5jdGlvbiAoKSB7IC4uLiB9KWAgYnV0IGV2ZXJ5dGltZSB5b3UgdXNlIGl0IHlvdVxuLy8gcmVwZWF0IHlvdXJzZWxmLiBEZUxvcmVhbiBoYXMgYSBzaG9ydGN1dCBkb2luZyB0aGlzIHByb3Blcmx5LlxuU3RvcmUucHJvdG90eXBlLmxpc3RlbkNoYW5nZXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gIHZhciBzZWxmID0gdGhpcywgb2JzZXJ2ZXI7XG4gIGlmICghT2JqZWN0Lm9ic2VydmUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdTdG9yZSNsaXN0ZW5DaGFuZ2VzIG1ldGhvZCB1c2VzIE9iamVjdC5vYnNlcnZlLCB5b3Ugc2hvdWxkIGZpcmUgY2hhbmdlcyBtYW51YWxseS4nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBvYnNlcnZlciA9IEFycmF5LmlzQXJyYXkob2JqZWN0KSA/IEFycmF5Lm9ic2VydmUgOiBPYmplY3Qub2JzZXJ2ZTtcblxuICBvYnNlcnZlcihvYmplY3QsIGZ1bmN0aW9uIChjaGFuZ2VzKSB7XG4gICAgc2VsZi5saXN0ZW5lci5lbWl0KCdjaGFuZ2UnLCBjaGFuZ2VzKTtcbiAgfSk7XG59O1xuXG4vLyBgb25DaGFuZ2VgIHNpbXBseSBsaXN0ZW5zIGNoYW5nZXMgYW5kIGNhbGxzIGEgY2FsbGJhY2suIFNob3J0Y3V0IGZvclxuLy8gYSBgb24oJ2NoYW5nZScpYCBjb21tYW5kLlxuU3RvcmUucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHRoaXMubGlzdGVuZXIub24oJ2NoYW5nZScsIGNhbGxiYWNrKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBEaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRGlzcGF0Y2hlclwiKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoXCIuL1N0b3JlXCIpO1xudmFyIHV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgbWl4aW5zID0gcmVxdWlyZShcIi4vbWl4aW5zXCIpO1xuXG52YXIgRmx1eCA9IHtcblxuICAvLyBgY3JlYXRlU3RvcmVgICoqY3JlYXRlcyBhIGZ1bmN0aW9uIHRvIGNyZWF0ZSBhIHN0b3JlKiouIFNvIGl0J3MgbGlrZVxuICAvLyBhIGZhY3RvcnkuXG4gIGNyZWF0ZVN0b3JlOiBmdW5jdGlvbiAoZmFjdG9yeURlZmluaXRpb24pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBTdG9yZShmYWN0b3J5RGVmaW5pdGlvbiwgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9LFxuXG4gIC8vIGBjcmVhdGVEaXNwYXRjaGVyYCBnZW5lcmF0ZXMgYSBkaXNwYXRjaGVyIHdpdGggYWN0aW9ucyB0byBkaXNwYXRjaC5cbiAgLyogYGFjdGlvbnNUb0Rpc3BhdGNoYCBzaG91bGQgYmUgYW4gb2JqZWN0LiAqL1xuICBjcmVhdGVEaXNwYXRjaGVyOiBmdW5jdGlvbiAoYWN0aW9uc1RvRGlzcGF0Y2gpIHtcbiAgICB2YXIgYWN0aW9uc09mU3RvcmVzLCBkaXNwYXRjaGVyLCBjYWxsYmFjaywgdHJpZ2dlcnMsIHRyaWdnZXJNZXRob2Q7XG5cbiAgICAvLyBJZiBpdCBoYXMgYGdldFN0b3Jlc2AgbWV0aG9kIGl0IHNob3VsZCBiZSBnZXQgYW5kIHBhc3MgdG8gdGhlIGBEaXNwYXRjaGVyYFxuICAgIGlmICh0eXBlb2YgYWN0aW9uc1RvRGlzcGF0Y2guZ2V0U3RvcmVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhY3Rpb25zT2ZTdG9yZXMgPSBhY3Rpb25zVG9EaXNwYXRjaC5nZXRTdG9yZXMoKTtcbiAgICB9XG5cbiAgICAvKiBJZiB0aGVyZSBhcmUgbm8gc3RvcmVzIGRlZmluZWQsIGl0J3MgYW4gZW1wdHkgb2JqZWN0LiAqL1xuICAgIGRpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcihhY3Rpb25zT2ZTdG9yZXMgfHwge30pO1xuXG4gICAgLyogTm93IGNhbGwgYHJlZ2lzdGVyQWN0aW9uYCBtZXRob2QgZm9yIGV2ZXJ5IGFjdGlvbi4gKi9cbiAgICBmb3IgKHZhciBhY3Rpb25OYW1lIGluIGFjdGlvbnNUb0Rpc3BhdGNoKSB7XG4gICAgICBpZiAodXRpbHMuaGFzT3duKGFjdGlvbnNUb0Rpc3BhdGNoLCBhY3Rpb25OYW1lKSkge1xuICAgICAgICAvKiBgZ2V0U3RvcmVzYCAmIGB2aWV3VHJpZ2dlcnNgIGFyZSBzcGVjaWFsIHByb3BlcnRpZXMsIGl0J3Mgbm90IGFuIGFjdGlvbi4gKi9cbiAgICAgICAgaWYgKGFjdGlvbk5hbWUgIT09ICdnZXRTdG9yZXMnICYmIGFjdGlvbk5hbWUgIT0gJ3ZpZXdUcmlnZ2VycycpIHtcbiAgICAgICAgICBjYWxsYmFjayA9IGFjdGlvbnNUb0Rpc3BhdGNoW2FjdGlvbk5hbWVdO1xuICAgICAgICAgIGRpc3BhdGNoZXIucmVnaXN0ZXJBY3Rpb24oYWN0aW9uTmFtZSwgY2FsbGJhY2suYmluZChkaXNwYXRjaGVyKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiBCaW5kIHRyaWdnZXJzICovXG4gICAgdHJpZ2dlcnMgPSBhY3Rpb25zVG9EaXNwYXRjaC52aWV3VHJpZ2dlcnM7XG4gICAgZm9yICh2YXIgdHJpZ2dlck5hbWUgaW4gdHJpZ2dlcnMpIHtcbiAgICAgIHRyaWdnZXJNZXRob2QgPSB0cmlnZ2Vyc1t0cmlnZ2VyTmFtZV07XG4gICAgICBpZiAodHlwZW9mIGRpc3BhdGNoZXJbdHJpZ2dlck1ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZGlzcGF0Y2hlci5vbih0cmlnZ2VyTmFtZSwgZGlzcGF0Y2hlclt0cmlnZ2VyTWV0aG9kXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoY29uc29sZSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKHRyaWdnZXJNZXRob2QgKyAnIHNob3VsZCBiZSBhIG1ldGhvZCBkZWZpbmVkIG9uIHlvdXIgZGlzcGF0Y2hlci4gVGhlICcgKyB0cmlnZ2VyTmFtZSArICcgdHJpZ2dlciB3aWxsIG5vdCBiZSBib3VuZCB0byBhbnkgbWV0aG9kLicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3BhdGNoZXI7XG4gIH1cbn07XG5cbkZsdXgubWl4aW5zID0gbWl4aW5zO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZsdXg7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG5cbm1vZHVsZXMuZXhwcm90cyA9IHtcbiAgICAvLyBJdCBzaG91bGQgYmUgaW5zZXJ0ZWQgdG8gdGhlIFJlYWN0IGNvbXBvbmVudHMgd2hpY2hcbiAgICAvLyB1c2VkIGluIEZsdXguXG4gICAgLy8gU2ltcGx5IGBtaXhpbjogW0ZsdXgubWl4aW5zLnN0b3JlTGlzdGVuZXJdYCB3aWxsIHdvcmsuXG4gICAgc3RvcmVMaXN0ZW5lcjoge1xuXG4gICAgICAgIHRyaWdnZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLl9fZGlzcGF0Y2hlci5lbWl0LmFwcGx5KHRoaXMuX19kaXNwYXRjaGVyLCBhcmd1bWVudHMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIEFmdGVyIHRoZSBjb21wb25lbnQgbW91bnRlZCwgbGlzdGVuIGNoYW5nZXMgb2YgdGhlIHJlbGF0ZWQgc3RvcmVzXG4gICAgICAgIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLCBzdG9yZSwgc3RvcmVOYW1lO1xuXG4gICAgICAgICAgLyogYF9fY2hhbmdlSGFuZGxlcmAgaXMgYSAqKmxpc3RlbmVyIGdlbmVyYXRvcioqIHRvIHBhc3MgdG8gdGhlIGBvbkNoYW5nZWAgZnVuY3Rpb24uICovXG4gICAgICAgICAgZnVuY3Rpb24gX19jaGFuZ2VIYW5kbGVyKHN0b3JlLCBzdG9yZU5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHZhciBzdGF0ZSwgYXJncztcbiAgICAgICAgICAgICAgLyogSWYgdGhlIGNvbXBvbmVudCBpcyBtb3VudGVkLCBjaGFuZ2Ugc3RhdGUuICovXG4gICAgICAgICAgICAgIGlmIChzZWxmLmlzTW91bnRlZCgpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5zZXRTdGF0ZShzZWxmLmdldFN0b3JlU3RhdGVzKCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIFdoZW4gc29tZXRoaW5nIGNoYW5nZXMgaXQgY2FsbHMgdGhlIGNvbXBvbmVudHMgYHN0b3JlRGlkQ2hhbmdlZGAgbWV0aG9kIGlmIGV4aXN0cy5cbiAgICAgICAgICAgICAgaWYgKHNlbGYuc3RvcmVEaWRDaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICBhcmdzID0gW3N0b3JlTmFtZV0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpO1xuICAgICAgICAgICAgICAgIHNlbGYuc3RvcmVEaWRDaGFuZ2UuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUmVtZW1iZXIgdGhlIGNoYW5nZSBoYW5kbGVycyBzbyB0aGV5IGNhbiBiZSByZW1vdmVkIGxhdGVyXG4gICAgICAgICAgdGhpcy5fX2NoYW5nZUhhbmRsZXJzID0ge307XG5cbiAgICAgICAgICAvKiBHZW5lcmF0ZSBhbmQgYmluZCB0aGUgY2hhbmdlIGhhbmRsZXJzIHRvIHRoZSBzdG9yZXMuICovXG4gICAgICAgICAgZm9yIChzdG9yZU5hbWUgaW4gdGhpcy5fX3dhdGNoU3RvcmVzKSB7XG4gICAgICAgICAgICBpZiAodXRpbHMuaGFzT3duKHRoaXMuc3RvcmVzLCBzdG9yZU5hbWUpKSB7XG4gICAgICAgICAgICAgIHN0b3JlID0gdGhpcy5zdG9yZXNbc3RvcmVOYW1lXTtcbiAgICAgICAgICAgICAgdGhpcy5fX2NoYW5nZUhhbmRsZXJzW3N0b3JlTmFtZV0gPSBfX2NoYW5nZUhhbmRsZXIoc3RvcmUsIHN0b3JlTmFtZSk7XG4gICAgICAgICAgICAgIHN0b3JlLm9uQ2hhbmdlKHRoaXMuX19jaGFuZ2VIYW5kbGVyc1tzdG9yZU5hbWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gV2hlbiBhIGNvbXBvbmVudCB1bm1vdW50ZWQsIGl0IHNob3VsZCBzdG9wIGxpc3RlbmluZy5cbiAgICAgICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBmb3IgKHZhciBzdG9yZU5hbWUgaW4gdGhpcy5fX2NoYW5nZUhhbmRsZXJzKSB7XG4gICAgICAgICAgICBpZiAodXRpbHMuaGFzT3duKHRoaXMuc3RvcmVzLCBzdG9yZU5hbWUpKSB7XG4gICAgICAgICAgICAgIHZhciBzdG9yZSA9IHRoaXMuc3RvcmVzW3N0b3JlTmFtZV07XG4gICAgICAgICAgICAgIHN0b3JlLmxpc3RlbmVyLnJlbW92ZUxpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLl9fY2hhbmdlSGFuZGxlcnNbc3RvcmVOYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBzZWxmID0gdGhpcywgc3RhdGUsIHN0b3JlTmFtZTtcblxuICAgICAgICAgIC8qIFRoZSBkaXNwYXRjaGVyIHNob3VsZCBiZSBlYXN5IHRvIGFjY2VzcyBhbmQgaXQgc2hvdWxkIHVzZSBgX19maW5kRGlzcGF0Y2hlcmBcbiAgICAgICAgICAgICBtZXRob2QgdG8gZmluZCB0aGUgcGFyZW50IGRpc3BhdGNoZXJzLiAqL1xuICAgICAgICAgIHRoaXMuX19kaXNwYXRjaGVyID0gdXRpbHMuZmluZERpc3BhdGNoZXIodGhpcyk7XG5cbiAgICAgICAgICAvLyBJZiBgc3RvcmVzRGlkQ2hhbmdlYCBtZXRob2QgcHJlc2VudHMsIGl0J2xsIGJlIGNhbGxlZCBhZnRlciBhbGwgdGhlIHN0b3Jlc1xuICAgICAgICAgIC8vIHdlcmUgY2hhbmdlZC5cbiAgICAgICAgICBpZiAodGhpcy5zdG9yZXNEaWRDaGFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMuX19kaXNwYXRjaGVyLm9uKCdjaGFuZ2U6YWxsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBzZWxmLnN0b3Jlc0RpZENoYW5nZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2luY2UgYGRpc3BhdGNoZXIuc3RvcmVzYCBpcyBoYXJkZXIgdG8gd3JpdGUsIHRoZXJlJ3MgYSBzaG9ydGN1dCBmb3IgaXQuXG4gICAgICAgICAgLy8gWW91IGNhbiB1c2UgYHRoaXMuc3RvcmVzYCBmcm9tIHRoZSBSZWFjdCBjb21wb25lbnQuXG4gICAgICAgICAgdGhpcy5zdG9yZXMgPSB0aGlzLl9fZGlzcGF0Y2hlci5zdG9yZXM7XG5cbiAgICAgICAgICB0aGlzLl9fd2F0Y2hTdG9yZXMgPSB7fTtcbiAgICAgICAgICBpZiAodGhpcy53YXRjaFN0b3JlcyAhPSBudWxsKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMud2F0Y2hTdG9yZXMubGVuZ3RoOyAgaSsrKSB7XG4gICAgICAgICAgICAgIHN0b3JlTmFtZSA9IHRoaXMud2F0Y2hTdG9yZXNbaV07XG4gICAgICAgICAgICAgIHRoaXMuX193YXRjaFN0b3Jlc1tzdG9yZU5hbWVdID0gdGhpcy5zdG9yZXNbc3RvcmVOYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fX3dhdGNoU3RvcmVzID0gdGhpcy5zdG9yZXM7XG4gICAgICAgICAgICBpZiAoY29uc29sZSAhPSBudWxsICYmIE9iamVjdC5rZXlzICE9IG51bGwgJiYgT2JqZWN0LmtleXModGhpcy5zdG9yZXMpLmxlbmd0aCA+IDQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdZb3VyIGNvbXBvbmVudCBpcyB3YXRjaGluZyBjaGFuZ2VzIG9uIGFsbCBzdG9yZXMsIHlvdSBtYXkgd2FudCB0byBkZWZpbmUgYSBcIndhdGNoU3RvcmVzXCIgcHJvcGVydHkgaW4gb3JkZXIgdG8gb25seSB3YXRjaCBzdG9yZXMgcmVsZXZhbnQgdG8gdGhpcyBjb21wb25lbnQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3RvcmVTdGF0ZXMoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTdG9yZVN0YXRlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBzdGF0ZSA9IHtzdG9yZXM6IHt9fSwgc3RvcmU7XG5cbiAgICAgICAgICAvKiBTZXQgYHN0YXRlLnN0b3Jlc2AgZm9yIGFsbCBwcmVzZW50IHN0b3JlcyB3aXRoIGEgYHNldFN0YXRlYCBtZXRob2QgZGVmaW5lZC4gKi9cbiAgICAgICAgICBmb3IgKHZhciBzdG9yZU5hbWUgaW4gdGhpcy5fX3dhdGNoU3RvcmVzKSB7XG4gICAgICAgICAgICBpZiAodXRpbHMuaGFzT3duKHRoaXMuc3RvcmVzLCBzdG9yZU5hbWUpKSB7XG4gICAgICAgICAgICAgIHN0YXRlLnN0b3Jlc1tzdG9yZU5hbWVdID0ge307XG4gICAgICAgICAgICAgIHN0b3JlID0gdGhpcy5fX3dhdGNoU3RvcmVzW3N0b3JlTmFtZV0uc3RvcmU7XG4gICAgICAgICAgICAgIGlmIChzdG9yZSAmJiBzdG9yZS5nZXRTdGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnN0b3Jlc1tzdG9yZU5hbWVdID0gc3RvcmUuZ2V0U3RhdGUoKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc3RvcmUuc2NoZW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHZhciBzY2hlbWUgPSBzdG9yZS5zY2hlbWU7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5TmFtZSBpbiBzY2hlbWUpIHtcbiAgICAgICAgICAgICAgICAgIHN0YXRlLnN0b3Jlc1tzdG9yZU5hbWVdW2tleU5hbWVdID0gc3RvcmVba2V5TmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBgZ2V0U3RvcmVgIGlzIGEgc2hvcnRjdXQgdG8gZ2V0IHRoZSBzdG9yZSBmcm9tIHRoZSBzdGF0ZS5cbiAgICAgICAgZ2V0U3RvcmU6IGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZS5zdG9yZXNbc3RvcmVOYW1lXTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4gIC8vICMjIFByaXZhdGUgSGVscGVyIEZ1bmN0aW9uc1xuXG4gIC8vIEhlbHBlciBmdW5jdGlvbnMgYXJlIHByaXZhdGUgZnVuY3Rpb25zIHRvIGJlIHVzZWQgaW4gY29kZWJhc2UuXG4gIC8vIEl0J3MgYmV0dGVyIHVzaW5nIHR3byB1bmRlcnNjb3JlIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZ1bmN0aW9uLlxuXG4gIC8qIGBfX2hhc093bmAgZnVuY3Rpb24gaXMgYSBzaG9ydGN1dCBmb3IgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgKi9cbmZ1bmN0aW9uIF9faGFzT3duKG9iamVjdCwgcHJvcCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wKTtcbn1cblxuICAvLyBVc2UgYF9fZ2VuZXJhdGVBY3Rpb25OYW1lYCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBhY3Rpb24gbmFtZXMuXG4gIC8vIEUuZy4gSWYgeW91IGNyZWF0ZSBhbiBhY3Rpb24gd2l0aCBuYW1lIGBoZWxsb2AgaXQgd2lsbCBiZVxuICAvLyBgYWN0aW9uOmhlbGxvYCBmb3IgdGhlIEZsdXguXG5mdW5jdGlvbiBfX2dlbmVyYXRlQWN0aW9uTmFtZShuYW1lKSB7XG4gICAgcmV0dXJuICdhY3Rpb246JyArIG5hbWU7XG59XG5cbiAgLyogSXQncyB1c2VkIGJ5IHRoZSBzY2hlbWVzIHRvIHNhdmUgdGhlIG9yaWdpbmFsIHZlcnNpb24gKG5vdCBjYWxjdWxhdGVkKVxuICAgICBvZiB0aGUgZGF0YS4gKi9cbmZ1bmN0aW9uIF9fZ2VuZXJhdGVPcmlnaW5hbE5hbWUobmFtZSkge1xuICAgIHJldHVybiAnb3JpZ2luYWw6JyArIG5hbWU7XG59XG5cbiAgLy8gYF9fZmluZERpc3BhdGNoZXJgIGlzIGEgcHJpdmF0ZSBmdW5jdGlvbiBmb3IgKipSZWFjdCBjb21wb25lbnRzKiouXG5mdW5jdGlvbiBfX2ZpbmREaXNwYXRjaGVyKHZpZXcpIHtcbiAgICAgLy8gUHJvdmlkZSBhIHVzZWZ1bCBlcnJvciBtZXNzYWdlIGlmIG5vIGRpc3BhdGNoZXIgaXMgZm91bmQgaW4gdGhlIGNoYWluXG4gICAgaWYgKHZpZXcgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyAnTm8gZGlzYXB0Y2hlciBmb3VuZC4gVGhlIERlTG9yZWFuSlMgbWl4aW4gcmVxdWlyZXMgYSBcImRpc3BhdGNoZXJcIiBwcm9wZXJ0eSB0byBiZSBwYXNzZWQgdG8gYSBjb21wb25lbnQsIG9yIG9uZSBvZiBpdFxcJ3MgYW5jZXN0b3JzLic7XG4gICAgfVxuICAgIC8qIGB2aWV3YCBzaG91bGQgYmUgYSBjb21wb25lbnQgaW5zdGFuY2UuIElmIGEgY29tcG9uZW50IGRvbid0IGhhdmVcbiAgICAgICAgYW55IGRpc3BhdGNoZXIsIGl0IHRyaWVzIHRvIGZpbmQgYSBkaXNwYXRjaGVyIGZyb20gdGhlIHBhcmVudHMuICovXG4gICAgaWYgKCF2aWV3LnByb3BzLmRpc3BhdGNoZXIpIHtcbiAgICAgICAgcmV0dXJuIF9fZmluZERpc3BhdGNoZXIodmlldy5fb3duZXIpO1xuICAgIH1cbiAgICByZXR1cm4gdmlldy5wcm9wcy5kaXNwYXRjaGVyO1xufVxuXG4gIC8vIGBfX2Nsb25lYCBjcmVhdGVzIGEgZGVlcCBjb3B5IG9mIGFuIG9iamVjdC5cbmZ1bmN0aW9uIF9fY2xvbmUob2JqKSB7XG4gICAgaWYgKG51bGwgPT0gb2JqIHx8IFwib2JqZWN0XCIgIT0gdHlwZW9mIG9iaikgcmV0dXJuIG9iajtcbiAgICB2YXIgY29weSA9IG9iai5jb25zdHJ1Y3RvcigpO1xuICAgIGZvciAodmFyIGF0dHIgaW4gb2JqKSB7XG4gICAgICAgIGlmIChfX2hhc093bihvYmosIGF0dHIpKSB7XG4gICAgICAgICAgICBjb3B5W2F0dHJdID0gX19jbG9uZShvYmpbYXR0cl0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb3B5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjbG9uZTogX19jbG9uZSxcbiAgICBmaW5kRGlzcGF0Y2hlcjogX19maW5kRGlzcGF0Y2hlcixcbiAgICBnZW5lcmF0ZUFjdGlvbk5hbWU6IF9fZ2VuZXJhdGVBY3Rpb25OYW1lLFxuICAgIGdlbmVyYXRlT3JpZ2luYWxOYW1lOiBfX2dlbmVyYXRlT3JpZ2luYWxOYW1lLFxuICAgIGhhc093bjogX19oYXNPd25cbn07Il19
