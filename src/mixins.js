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

