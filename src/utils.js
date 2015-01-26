"use strict";

function __hasOwn(object, prop) {
    return Object.prototype.hasOwnProperty.call(object, prop);
}

function __generateActionName(name) {
    return 'action:' + name;
}


function __generateOriginalName(name) {
    return 'original:' + name;
}

/**
 * 从React view或者他的父节点中查找dispatcher属性
 */
function __findDispatcher(view) {
    if (view == null) {
        throw 'No disaptcher found. The FluxJS mixin requires a "dispatcher" property to be passed to a component, or one of it\'s ancestors.';
    }

    if (!view.props.dispatcher) {
        return __findDispatcher(view._owner);
    }
    return view.props.dispatcher;
}

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