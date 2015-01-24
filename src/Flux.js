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
