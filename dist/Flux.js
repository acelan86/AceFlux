define('utils', [
    'require',
    'exports',
    'module'
], function (inner) {
    'use strict';
    function __hasOwn(object, prop) {
        return Object.prototype.hasOwnProperty.call(object, prop);
    }
    function __generateActionName(name) {
        return 'action:' + name;
    }
    function __generateOriginalName(name) {
        return 'original:' + name;
    }
    function __findDispatcher(view) {
        if (view == null) {
            throw 'No disaptcher found. The DeLoreanJS mixin requires a "dispatcher" property to be passed to a component, or one of it\'s ancestors.';
        }
        if (!view.props.dispatcher) {
            return __findDispatcher(view._owner);
        }
        return view.props.dispatcher;
    }
    function __clone(obj) {
        if (null == obj || 'object' != typeof obj)
            return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (__hasOwn(obj, attr)) {
                copy[attr] = __clone(obj[attr]);
            }
        }
        return copy;
    }
    return {
        clone: __clone,
        findDispatcher: __findDispatcher,
        generateActionName: __generateActionName,
        generateOriginalName: __generateOriginalName,
        hasOwn: __hasOwn
    };
});
;
(function () {
    'use strict';
    function EventEmitter() {
    }
    var proto = EventEmitter.prototype;
    var exports = this;
    var originalGlobalValue = exports.EventEmitter;
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }
        return -1;
    }
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        } else {
            response = events[evt] || (events[evt] = []);
        }
        return response;
    };
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;
        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }
        return flatListeners;
    };
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;
        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }
        return response || listeners;
    };
    proto.addListener = function addListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;
        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }
        return this;
    };
    proto.on = alias('addListener');
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };
    proto.once = alias('addOnceListener');
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;
        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);
                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }
        return this;
    };
    proto.off = alias('removeListener');
    proto.addListeners = function addListeners(evt, listeners) {
        return this.manipulateListeners(false, evt, listeners);
    };
    proto.removeListeners = function removeListeners(evt, listeners) {
        return this.manipulateListeners(true, evt, listeners);
    };
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    } else {
                        multiple.call(this, i, value);
                    }
                }
            }
        } else {
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }
        return this;
    };
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;
        if (type === 'string') {
            delete events[evt];
        } else if (evt instanceof RegExp) {
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        } else {
            delete this._events;
        }
        return this;
    };
    proto.removeAllListeners = alias('removeEvent');
    proto.emitEvent = function emitEvent(evt, args) {
        var listeners = this.getListenersAsObject(evt);
        var listener;
        var i;
        var key;
        var response;
        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                i = listeners[key].length;
                while (i--) {
                    listener = listeners[key][i];
                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }
                    response = listener.listener.apply(this, args || []);
                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }
        return this;
    };
    proto.trigger = alias('emitEvent');
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        } else {
            return true;
        }
    };
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };
    if (typeof define === 'function' && define.amd) {
        define('bower_components/eventEmitter/EventEmitter', [], function () {
            return EventEmitter;
        });
    } else if (typeof module === 'object' && module.exports) {
        module.exports = EventEmitter;
    } else {
        exports.EventEmitter = EventEmitter;
    }
}.call(this));
define('Store', [
    'utils',
    'bower_components/eventEmitter/EventEmitter'
], function (utils, EventEmitter) {
    'use strict';
    function Store(store, args) {
        if (typeof store !== 'object') {
            throw 'Stores should be defined by passing the definition to the constructor';
        }
        this.listener = new EventEmitter();
        this.store = utils.clone(store);
        this.bindActions();
        this.buildScheme();
        if (typeof store.initialize === 'function') {
            store.initialize.apply(this.store, args);
        }
    }
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
            if (console != null) {
                console.warn('Scheme must include the key, ' + key + ', you are trying to set. ' + key + ' will NOT be set on the store.');
            }
        }
        return this.store[key];
    };
    Store.prototype.formatScheme = function (scheme) {
        var formattedScheme = {}, definition, defaultValue, calculatedValue;
        for (var keyName in scheme) {
            definition = scheme[keyName];
            defaultValue = null;
            calculatedValue = null;
            formattedScheme[keyName] = { default: null };
            defaultValue = definition && typeof definition === 'object' ? definition.default : definition;
            formattedScheme[keyName].default = defaultValue;
            if (definition && typeof definition.calculate === 'function') {
                calculatedValue = definition.calculate;
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
    Store.prototype.buildScheme = function () {
        var scheme, calculatedData, keyName, definition, dependencyMap, dependents, dep, changedProps = [];
        if (typeof this.store.scheme === 'object') {
            scheme = this.store.scheme = this.formatScheme(this.store.scheme);
            dependencyMap = this.store.utils.dependencyMap = {};
            for (keyName in scheme) {
                definition = scheme[keyName];
                this.store[keyName] = utils.clone(definition.default);
            }
            for (keyName in scheme) {
                definition = scheme[keyName];
                if (definition.calculate) {
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
            this.recalculate(changedProps);
        }
    };
    Store.prototype.recalculate = function (changedProps) {
        var scheme = this.store.scheme, dependencyMap = this.store.utils.dependencyMap, didRun = [], definition, keyName, dependents, dep;
        for (var i = 0; i < changedProps.length; i++) {
            dependents = dependencyMap[changedProps[i]];
            if (dependents == null) {
                continue;
            }
            for (var d = 0; d < dependents.length; d++) {
                dep = dependents[d];
                if (didRun.indexOf(dep) !== -1) {
                    continue;
                }
                definition = scheme[dep];
                this.store[dep] = definition.calculate.call(this.store, this.store[utils.generateOriginalName(dep)] || definition.default);
                didRun.push(dep);
            }
        }
        if (didRun.length > 0) {
            this.recalculate(didRun);
        }
        this.listener.emit('change');
    };
    Store.prototype.bindActions = function () {
        var callback;
        this.store.emit = this.listener.emit.bind(this.listener);
        this.store.emitChange = this.listener.emit.bind(this.listener, 'change');
        this.store.emitRollback = this.listener.emit.bind(this.listener, 'rollback');
        this.store.rollback = this.listener.on.bind(this.listener, 'utils.rollback');
        this.store.listenChanges = this.listenChanges.bind(this);
        this.store.set = this.set.bind(this);
        for (var actionName in this.store.actions) {
            if (utils.hasOwn(this.store.actions, actionName)) {
                callback = this.store.actions[actionName];
                if (typeof this.store[callback] !== 'function') {
                    throw 'Callback \'' + callback + '\' defined for action \'' + actionName + '\' should be a method defined on the store!';
                }
                this.listener.on(utils.generateActionName(actionName), this.store[callback].bind(this.store));
            }
        }
    };
    Store.prototype.dispatchAction = function (actionName, data) {
        this.listener.emit(utils.generateActionName(actionName), data);
    };
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
    Store.prototype.onChange = function (callback) {
        this.listener.on('change', callback);
    };
    return Store;
});
(function () {
    'use strict';
    function $$utils$$objectOrFunction(x) {
        return typeof x === 'function' || typeof x === 'object' && x !== null;
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
    var $$utils$$now = Date.now || function () {
        return new Date().getTime();
    };
    function $$utils$$F() {
    }
    var $$utils$$o_create = Object.create || function (o) {
        if (arguments.length > 1) {
            throw new Error('Second argument not supported');
        }
        if (typeof o !== 'object') {
            throw new TypeError('Argument must be an object');
        }
        $$utils$$F.prototype = o;
        return new $$utils$$F();
    };
    var $$asap$$len = 0;
    var $$asap$$default = function asap(callback, arg) {
        $$asap$$queue[$$asap$$len] = callback;
        $$asap$$queue[$$asap$$len + 1] = arg;
        $$asap$$len += 2;
        if ($$asap$$len === 2) {
            $$asap$$scheduleFlush();
        }
    };
    var $$asap$$browserGlobal = typeof window !== 'undefined' ? window : {};
    var $$asap$$BrowserMutationObserver = $$asap$$browserGlobal.MutationObserver || $$asap$$browserGlobal.WebKitMutationObserver;
    var $$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
    function $$asap$$useNextTick() {
        return function () {
            process.nextTick($$asap$$flush);
        };
    }
    function $$asap$$useMutationObserver() {
        var iterations = 0;
        var observer = new $$asap$$BrowserMutationObserver($$asap$$flush);
        var node = document.createTextNode('');
        observer.observe(node, { characterData: true });
        return function () {
            node.data = iterations = ++iterations % 2;
        };
    }
    function $$asap$$useMessageChannel() {
        var channel = new MessageChannel();
        channel.port1.onmessage = $$asap$$flush;
        return function () {
            channel.port2.postMessage(0);
        };
    }
    function $$asap$$useSetTimeout() {
        return function () {
            setTimeout($$asap$$flush, 1);
        };
    }
    var $$asap$$queue = new Array(1000);
    function $$asap$$flush() {
        for (var i = 0; i < $$asap$$len; i += 2) {
            var callback = $$asap$$queue[i];
            var arg = $$asap$$queue[i + 1];
            callback(arg);
            $$asap$$queue[i] = undefined;
            $$asap$$queue[i + 1] = undefined;
        }
        $$asap$$len = 0;
    }
    var $$asap$$scheduleFlush;
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
        $$asap$$scheduleFlush = $$asap$$useNextTick();
    } else if ($$asap$$BrowserMutationObserver) {
        $$asap$$scheduleFlush = $$asap$$useMutationObserver();
    } else if ($$asap$$isWorker) {
        $$asap$$scheduleFlush = $$asap$$useMessageChannel();
    } else {
        $$asap$$scheduleFlush = $$asap$$useSetTimeout();
    }
    function $$$internal$$noop() {
    }
    var $$$internal$$PENDING = void 0;
    var $$$internal$$FULFILLED = 1;
    var $$$internal$$REJECTED = 2;
    var $$$internal$$GET_THEN_ERROR = new $$$internal$$ErrorObject();
    function $$$internal$$selfFullfillment() {
        return new TypeError('You cannot resolve a promise with itself');
    }
    function $$$internal$$cannotReturnOwn() {
        return new TypeError('A promises callback cannot return that same promise.');
    }
    function $$$internal$$getThen(promise) {
        try {
            return promise.then;
        } catch (error) {
            $$$internal$$GET_THEN_ERROR.error = error;
            return $$$internal$$GET_THEN_ERROR;
        }
    }
    function $$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
        try {
            then.call(value, fulfillmentHandler, rejectionHandler);
        } catch (e) {
            return e;
        }
    }
    function $$$internal$$handleForeignThenable(promise, thenable, then) {
        $$asap$$default(function (promise) {
            var sealed = false;
            var error = $$$internal$$tryThen(then, thenable, function (value) {
                if (sealed) {
                    return;
                }
                sealed = true;
                if (thenable !== value) {
                    $$$internal$$resolve(promise, value);
                } else {
                    $$$internal$$fulfill(promise, value);
                }
            }, function (reason) {
                if (sealed) {
                    return;
                }
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
            $$$internal$$subscribe(thenable, undefined, function (value) {
                $$$internal$$resolve(promise, value);
            }, function (reason) {
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
        if (promise._state !== $$$internal$$PENDING) {
            return;
        }
        promise._result = value;
        promise._state = $$$internal$$FULFILLED;
        if (promise._subscribers.length === 0) {
        } else {
            $$asap$$default($$$internal$$publish, promise);
        }
    }
    function $$$internal$$reject(promise, reason) {
        if (promise._state !== $$$internal$$PENDING) {
            return;
        }
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
        subscribers[length + $$$internal$$REJECTED] = onRejection;
        if (length === 0 && parent._state) {
            $$asap$$default($$$internal$$publish, parent);
        }
    }
    function $$$internal$$publish(promise) {
        var subscribers = promise._subscribers;
        var settled = promise._state;
        if (subscribers.length === 0) {
            return;
        }
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
        } catch (e) {
            $$$internal$$TRY_CATCH_ERROR.error = e;
            return $$$internal$$TRY_CATCH_ERROR;
        }
    }
    function $$$internal$$invokeCallback(settled, promise, callback, detail) {
        var hasCallback = $$utils$$isFunction(callback), value, error, succeeded, failed;
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
            resolver(function resolvePromise(value) {
                $$$internal$$resolve(promise, value);
            }, function rejectPromise(reason) {
                $$$internal$$reject(promise, reason);
            });
        } catch (e) {
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
            this._input = input;
            this.length = input.length;
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
    $$$enumerator$$Enumerator.prototype._validateInput = function (input) {
        return $$utils$$isArray(input);
    };
    $$$enumerator$$Enumerator.prototype._validationError = function () {
        return new Error('Array Methods must be provided an Array');
    };
    $$$enumerator$$Enumerator.prototype._init = function () {
        this._result = new Array(this.length);
    };
    var $$$enumerator$$default = $$$enumerator$$Enumerator;
    $$$enumerator$$Enumerator.prototype._enumerate = function () {
        var length = this.length;
        var promise = this.promise;
        var input = this._input;
        for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
            this._eachEntry(input[i], i);
        }
    };
    $$$enumerator$$Enumerator.prototype._eachEntry = function (entry, i) {
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
    $$$enumerator$$Enumerator.prototype._settledAt = function (state, i, value) {
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
    $$$enumerator$$Enumerator.prototype._makeResult = function (state, i, value) {
        return value;
    };
    $$$enumerator$$Enumerator.prototype._willSettleAt = function (promise, i) {
        var enumerator = this;
        $$$internal$$subscribe(promise, undefined, function (value) {
            enumerator._settledAt($$$internal$$FULFILLED, i, value);
        }, function (reason) {
            enumerator._settledAt($$$internal$$REJECTED, i, reason);
        });
    };
    var $$promise$all$$default = function all(entries, label) {
        return new $$$enumerator$$default(this, entries, true, label).promise;
    };
    var $$promise$race$$default = function race(entries, label) {
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
        var Constructor = this;
        if (object && typeof object === 'object' && object.constructor === Constructor) {
            return object;
        }
        var promise = new Constructor($$$internal$$noop, label);
        $$$internal$$resolve(promise, object);
        return promise;
    };
    var $$promise$reject$$default = function reject(reason, label) {
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
        throw new TypeError('Failed to construct \'Promise\': Please use the \'new\' operator, this object constructor cannot be called as a function.');
    }
    var $$es6$promise$promise$$default = $$es6$promise$promise$$Promise;
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
        then: function (onFulfillment, onRejection) {
            var parent = this;
            var state = parent._state;
            if (state === $$$internal$$FULFILLED && !onFulfillment || state === $$$internal$$REJECTED && !onRejection) {
                return this;
            }
            var child = new this.constructor($$$internal$$noop);
            var result = parent._result;
            if (state) {
                var callback = arguments[state - 1];
                $$asap$$default(function () {
                    $$$internal$$invokeCallback(state, child, callback, result);
                });
            } else {
                $$$internal$$subscribe(parent, child, onFulfillment, onRejection);
            }
            return child;
        },
        'catch': function (onRejection) {
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
        var es6PromiseSupport = 'Promise' in local && 'resolve' in local.Promise && 'reject' in local.Promise && 'all' in local.Promise && 'race' in local.Promise && function () {
            var resolve;
            new local.Promise(function (r) {
                resolve = r;
            });
            return $$utils$$isFunction(resolve);
        }();
        if (!es6PromiseSupport) {
            local.Promise = $$es6$promise$promise$$default;
        }
    };
    var es6$promise$umd$$ES6Promise = {
        'Promise': $$es6$promise$promise$$default,
        'polyfill': $$es6$promise$polyfill$$default
    };
    if (typeof define === 'function' && define['amd']) {
        define('bower_components/es6-promise/promise', [], function () {
            return es6$promise$umd$$ES6Promise;
        });
    } else if (typeof module !== 'undefined' && module['exports']) {
        module['exports'] = es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
        this['ES6Promise'] = es6$promise$umd$$ES6Promise;
    }
}.call(this));
define('Dispatcher', [
    'Store',
    'bower_components/eventEmitter/EventEmitter',
    'bower_components/es6-promise/promise'
], function (Store, EventEmitter, es6) {
    'use strict';
    function __rollbackListener(stores) {
        function __listener() {
            for (var i in stores) {
                stores[i].listener.emit('__rollback');
            }
        }
        for (var j in stores) {
            stores[j].listener.on('rollback', __listener);
        }
    }
    function Dispatcher(stores) {
        var self = this;
        this.listener = new EventEmitter();
        this.stores = stores;
        __rollbackListener(Object.keys(stores).map(function (key) {
            return stores[key];
        }));
    }
    Dispatcher.prototype.dispatch = function (actionName, data) {
        var self = this, stores, deferred;
        this.listener.emit('dispatch', actionName, data);
        stores = function () {
            var stores = [], store;
            for (var storeName in self.stores) {
                store = self.stores[storeName];
                if (!store instanceof Store) {
                    throw 'Given store is not a store instance';
                }
                stores.push(store);
            }
            return stores;
        }();
        deferred = this.waitFor(stores, actionName);
        for (var storeName in self.stores) {
            self.stores[storeName].dispatchAction(actionName, data);
        }
        return deferred;
    };
    Dispatcher.prototype.waitFor = function (stores, actionName) {
        var self = this, promises;
        promises = function () {
            var __promises = [], promise;
            function __promiseGenerator(store) {
                return new es6.Promise(function (resolve, reject) {
                    store.listener.once('change', resolve);
                });
            }
            for (var i in stores) {
                if (stores[i].store.actions[actionName] != null) {
                    promise = __promiseGenerator(stores[i]);
                    __promises.push(promise);
                }
            }
            return __promises;
        }();
        return es6.Promise.all(promises).then(function () {
            self.listener.emit('change:all');
        });
    };
    Dispatcher.prototype.registerAction = function (action, callback) {
        if (typeof callback === 'function') {
            this[action] = callback.bind(this.stores);
        } else {
            throw 'Action callback should be a function.';
        }
    };
    Dispatcher.prototype.register = function (callback) {
        if (typeof callback === 'function') {
            this.listener.on('dispatch', callback);
        } else {
            throw 'Global callback should be a function.';
        }
    };
    Dispatcher.prototype.getStore = function (storeName) {
        if (!this.stores[storeName]) {
            throw 'Store ' + storeName + ' does not exist.';
        }
        return this.stores[storeName].store;
    };
    Dispatcher.prototype.on = function () {
        return this.listener.on.apply(this.listener, arguments);
    };
    Dispatcher.prototype.off = function () {
        return this.listener.removeListener.apply(this.listener, arguments);
    };
    Dispatcher.prototype.emit = function () {
        return this.listener.emit.apply(this.listener, arguments);
    };
    return Dispatcher;
});
define('mixins', ['utils'], function (utils) {
    'use strict';
    return {
        storeListener: {
            trigger: function () {
                this.__dispatcher.emit.apply(this.__dispatcher, arguments);
            },
            componentDidMount: function () {
                var self = this, store, storeName;
                function __changeHandler(store, storeName) {
                    return function () {
                        var state, args;
                        if (self.isMounted()) {
                            self.setState(self.getStoreStates());
                        }
                        if (self.storeDidChange) {
                            args = [storeName].concat(Array.prototype.slice.call(arguments, 0));
                            self.storeDidChange.apply(self, args);
                        }
                    };
                }
                this.__changeHandlers = {};
                for (storeName in this.__watchStores) {
                    if (utils.hasOwn(this.stores, storeName)) {
                        store = this.stores[storeName];
                        this.__changeHandlers[storeName] = __changeHandler(store, storeName);
                        store.onChange(this.__changeHandlers[storeName]);
                    }
                }
            },
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
                this.__dispatcher = utils.findDispatcher(this);
                if (this.storesDidChange) {
                    this.__dispatcher.on('change:all', function () {
                        self.storesDidChange();
                    });
                }
                this.stores = this.__dispatcher.stores;
                this.__watchStores = {};
                if (this.watchStores != null) {
                    for (var i = 0; i < this.watchStores.length; i++) {
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
                var state = { stores: {} }, store;
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
            getStore: function (storeName) {
                return this.state.stores[storeName];
            }
        }
    };
});
define('Flux', [
    'Dispatcher',
    'Store',
    'utils',
    'mixins'
], function (Dispatcher, Store, utils, mixins) {
    'use strict';
    var Flux = {
        createStore: function (factoryDefinition) {
            return function () {
                return new Store(factoryDefinition, arguments);
            };
        },
        createDispatcher: function (actionsToDispatch) {
            var actionsOfStores, dispatcher, callback, triggers, triggerMethod;
            if (typeof actionsToDispatch.getStores === 'function') {
                actionsOfStores = actionsToDispatch.getStores();
            }
            dispatcher = new Dispatcher(actionsOfStores || {});
            for (var actionName in actionsToDispatch) {
                if (utils.hasOwn(actionsToDispatch, actionName)) {
                    if (actionName !== 'getStores' && actionName != 'viewTriggers') {
                        callback = actionsToDispatch[actionName];
                        dispatcher.registerAction(actionName, callback.bind(dispatcher));
                    }
                }
            }
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
    return Flux;
});