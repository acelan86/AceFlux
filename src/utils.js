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