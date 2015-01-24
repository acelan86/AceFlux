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