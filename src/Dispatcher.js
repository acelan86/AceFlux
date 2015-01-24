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