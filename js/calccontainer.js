(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (factory((global.async = {})));
}(this, (function (exports) { 'use strict';
    function callbacksFor(object) {
        var callbacks = object._promiseCallbacks;
        if (!callbacks) {
            callbacks = object._promiseCallbacks = {};
        }
        return callbacks;
    }
    var EventTarget = {
        mixin: function (object) {
            object.trigger = this.trigger;
            object._promiseCallbacks = undefined;
            return object;
        },
        trigger: function (eventName, options, label) {
            var allCallbacks = callbacksFor(this);
            var callbacks = allCallbacks[eventName];
            if (callbacks) {
                var callback = void 0;
                for (var i = 0; i < callbacks.length; i++) {
                    callback = callbacks[i];
                    callback(options, label);
                }
            }
        }
    };
    var config = {
        instrument: false
    };
    EventTarget['mixin'](config);
    var queue = [];
    function scheduleFlush() {
        setTimeout(function () {
            for (var i = 0; i < queue.length; i++) {
                var entry = queue[i];
                var payload = entry.payload;
                payload.guid = payload.key + payload.id;
                payload.childGuid = payload.key + payload.childId;
                if (payload.error) {
                    payload.stack = payload.error.stack;
                }
                config['trigger'](entry.name, entry.payload);
            }
            queue.length = 0;
        }, 50);
    }
    function instrument(eventName, promise, child) {
        if (1 === queue.push({
            name: eventName,
            payload: {
                key: promise._guidKey,
                id: promise._id,
                eventName: eventName,
                detail: promise._result,
                childId: child && child._id,
                label: promise._label,
                timeStamp: Date.now(),
                error: config["instrument-with-stack"] ? new Error(promise._label) : null
            } })) {
            scheduleFlush();
        }
    }
    function resolve$$1(object, label) {
        var Constructor = this;
        if (object && typeof object === 'object' && object.constructor === Constructor) {
            return object;
        }
        var promise = new Constructor(noop, label);
        resolve$1(promise, object);
        return promise;
    }
    function withOwnPromise() {
    }
    function objectOrFunction(x) {
        var type = typeof x;
        return x !== null && (type === 'object' || type === 'function');
    }
    function noop() {}
    var PENDING = void 0;
    var FULFILLED = 1;
    var REJECTED = 2;
    var TRY_CATCH_ERROR = { error: null };
    function getThen(promise) {
        try {
            return promise.then;
        } catch (error) {
            TRY_CATCH_ERROR.error = error;
            return TRY_CATCH_ERROR;
        }
    }
    var tryCatchCallback = void 0;
    function tryCatcher() {
        try {
            var target = tryCatchCallback;
            tryCatchCallback = null;
            return target.apply(this, arguments);
        } catch (e) {
            TRY_CATCH_ERROR.error = e;
            return TRY_CATCH_ERROR;
        }
    }
    function tryCatch(fn) {
        tryCatchCallback = fn;
        return tryCatcher;
    }
    function handleForeignThenable(promise, thenable, then$$1) {
        config.casync(function (promise) {
            var sealed = false;
            var result = tryCatch(then$$1).call(thenable, function (value) {
                if (sealed) {
                    return;
                }
                sealed = true;
                if (thenable === value) {
                    fulfill(promise, value);
                } else {
                    resolve$1(promise, value);
                }
            }, function (reason) {
                if (sealed) {
                    return;
                }
                sealed = true;
                reject(promise, reason);
            }, 'Settle: ' + (promise._label || ' unknown promise'));
            if (!sealed && result === TRY_CATCH_ERROR) {
                sealed = true;
                var error = TRY_CATCH_ERROR.error;
                TRY_CATCH_ERROR.error = null;
                reject(promise, error);
            }
        }, promise);
    }
    function handleOwnThenable(promise, thenable) {
        if (thenable._state === FULFILLED) {
            fulfill(promise, thenable._result);
        } else if (thenable._state === REJECTED) {
            thenable._onError = null;
            reject(promise, thenable._result);
        } else {
            subscribe(thenable, undefined, function (value) {
                if (thenable === value) {
                    fulfill(promise, value);
                } else {
                    resolve$1(promise, value);
                }
            }, function (reason) {
                return reject(promise, reason);
            });
        }
    }
    function handleMaybeThenable(promise, maybeThenable, then$$1) {
        var isOwnThenable = maybeThenable.constructor === promise.constructor && then$$1 === then && promise.constructor.resolve === resolve$$1;
        if (isOwnThenable) {
            handleOwnThenable(promise, maybeThenable);
        } else if (then$$1 === TRY_CATCH_ERROR) {
            var error = TRY_CATCH_ERROR.error;
            TRY_CATCH_ERROR.error = null;
            reject(promise, error);
        } else if (typeof then$$1 === 'function') {
            handleForeignThenable(promise, maybeThenable, then$$1);
        } else {
            fulfill(promise, maybeThenable);
        }
    }
    function resolve$1(promise, value) {
        if (promise === value) {
            fulfill(promise, value);
        } else if (objectOrFunction(value)) {
            handleMaybeThenable(promise, value, getThen(value));
        } else {
            fulfill(promise, value);
        }
    }
    function publishRejection(promise) {
        if (promise._onError) {
            promise._onError(promise._result);
        }
        publish(promise);
    }
    function fulfill(promise, value) {
        if (promise._state !== PENDING) {
            return;
        }
        promise._result = value;
        promise._state = FULFILLED;
        if (promise._subscribers.length === 0) {
            if (config.instrument) {
                instrument('fulfilled', promise);
            }
        } else {
            config.casync(publish, promise);
        }
    }
    function reject(promise, reason) {
        if (promise._state !== PENDING) {
            return;
        }
        promise._state = REJECTED;
        promise._result = reason;
        config.casync(publishRejection, promise);
    }
    function subscribe(parent, child, onFulfillment, onRejection) {
        var subscribers = parent._subscribers;
        var length = subscribers.length;
        parent._onError = null;
        subscribers[length] = child;
        subscribers[length + FULFILLED] = onFulfillment;
        subscribers[length + REJECTED] = onRejection;
        if (length === 0 && parent._state) {
            config.casync(publish, parent);
        }
    }
    function publish(promise) {
        var subscribers = promise._subscribers;
        var settled = promise._state;
        if (config.instrument) {
            instrument(settled === FULFILLED ? 'fulfilled' : 'rejected', promise);
        }
        if (subscribers.length === 0) {
            return;
        }
        var child = void 0,
            callback = void 0,
            result = promise._result;
        for (var i = 0; i < subscribers.length; i += 3) {
            child = subscribers[i];
            callback = subscribers[i + settled];
            if (child) {
                invokeCallback(settled, child, callback, result);
            } else {
                callback(result);
            }
        }
        promise._subscribers.length = 0;
    }
    function invokeCallback(state, promise, callback, result) {
        var hasCallback = typeof callback === 'function';
        var value = void 0;
        if (hasCallback) {
            value = tryCatch(callback)(result);
        } else {
            value = result;
        }
        if (promise._state !== PENDING) {
        } else if (value === promise) {
            reject(promise, withOwnPromise());
        } else if (value === TRY_CATCH_ERROR) {
            var error = TRY_CATCH_ERROR.error;
            TRY_CATCH_ERROR.error = null;
            reject(promise, error);
        } else if (hasCallback) {
            resolve$1(promise, value);
        } else if (state === FULFILLED) {
            fulfill(promise, value);
        } else if (state === REJECTED) {
            reject(promise, value);
        }
    }
    function initializePromise(promise, resolver) {
        var resolved = false;
        try {
            resolver(function (value) {
                if (resolved) {
                    return;
                }
                resolved = true;
                resolve$1(promise, value);
            }, function (reason) {
                if (resolved) {
                    return;
                }
                resolved = true;
                reject(promise, reason);
            });
        } catch (e) {
            reject(promise, e);
        }
    }
    function then(onFulfillment, onRejection, label) {
        var parent = this;
        var state = parent._state;

        if (state === FULFILLED && !onFulfillment || state === REJECTED && !onRejection) {
            config.instrument && instrument('chained', parent, parent);
            return parent;
        }
        parent._onError = null;
        var child = new parent.constructor(noop, label);
        var result = parent._result;
        config.instrument && instrument('chained', parent, child);
        if (state === PENDING) {
            subscribe(parent, child, onFulfillment, onRejection);
        } else {
            var callback = state === FULFILLED ? onFulfillment : onRejection;
            config.casync(function () {
                return invokeCallback(state, child, callback, result);
            });
        }
        return child;
    }
    var Enumerator = function () {
        function Enumerator(Constructor, input, abortOnReject, label) {
            this._instanceConstructor = Constructor;
            this.promise = new Constructor(noop, label);
            this._abortOnReject = abortOnReject;
            this._isUsingOwnPromise = Constructor === Promise;
            this._isUsingOwnResolve = Constructor.resolve === resolve$$1;
            this._init.apply(this, arguments);
        }
        Enumerator.prototype._init = function _init(Constructor, input) {
            var len = input.length || 0;
            this.length = len;
            this._remaining = len;
            this._result = new Array(len);
            this._enumerate(input);
        };
        Enumerator.prototype._enumerate = function _enumerate(input) {
            var length = this.length;
            var promise = this.promise;
            for (var i = 0; promise._state === PENDING && i < length; i++) {
                this._eachEntry(input[i], i, true);
            }
            this._checkFullfillment();
        };
        Enumerator.prototype._checkFullfillment = function _checkFullfillment() {
            if (this._remaining === 0) {
                var result = this._result;
                fulfill(this.promise, result);
                this._result = null;
            }
        };
        Enumerator.prototype._settleMaybeThenable = function _settleMaybeThenable(entry, i, firstPass) {
            var c = this._instanceConstructor;
            if (this._isUsingOwnResolve) {
                var then$$1 = getThen(entry);
                if (then$$1 === then && entry._state !== PENDING) {
                    entry._onError = null;
                    this._settledAt(entry._state, i, entry._result, firstPass);
                } else if (typeof then$$1 !== 'function') {
                    this._settledAt(FULFILLED, i, entry, firstPass);
                } else if (this._isUsingOwnPromise) {
                    var promise = new c(noop);
                    handleMaybeThenable(promise, entry, then$$1);
                    this._willSettleAt(promise, i, firstPass);
                } else {
                    this._willSettleAt(new c(function (resolve) {
                        return resolve(entry);
                    }), i, firstPass);
                }
            } else {
                this._willSettleAt(c.resolve(entry), i, firstPass);
            }
        };
        Enumerator.prototype._eachEntry = function _eachEntry(entry, i, firstPass) {
            if (entry !== null && typeof entry === 'object') {
                this._settleMaybeThenable(entry, i, firstPass);
            } else {
                this._setResultAt(FULFILLED, i, entry, firstPass);
            }
        };
        Enumerator.prototype._settledAt = function _settledAt(state, i, value, firstPass) {
            var promise = this.promise;
            if (promise._state === PENDING) {
                if (this._abortOnReject && state === REJECTED) {
                    reject(promise, value);
                } else {
                    this._setResultAt(state, i, value, firstPass);
                    this._checkFullfillment();
                }
            }
        };
        Enumerator.prototype._setResultAt = function _setResultAt(state, i, value, firstPass) {
            this._remaining--;
            this._result[i] = value;
        };
        Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i, firstPass) {
            var _this = this;
            subscribe(promise, undefined, function (value) {
                return _this._settledAt(FULFILLED, i, value, firstPass);
            }, function (reason) {
                return _this._settledAt(REJECTED, i, reason, firstPass);
            });
        };
        return Enumerator;
    }();
    function all(entries, label) {
        return new Enumerator(this, entries, true, label).promise;
    }
    function reject$1(reason, label) {
        var Constructor = this;
        var promise = new Constructor(noop, label);
        reject(promise, reason);
        return promise;
    }
    var guidKey = 'async_' + Date.now() + '-';
    var counter = 0;
    function needsResolver() {}
    function needsNew() {}
    var Promise = function () {
        function Promise(resolver, label) {
            this._id = counter++;
            this._label = label;
            this._state = undefined;
            this._result = undefined;
            this._subscribers = [];
            config.instrument && instrument('created', this);
            if (noop !== resolver) {
                typeof resolver !== 'function' && needsResolver();
                this instanceof Promise ? initializePromise(this, resolver) : needsNew();
            }
        }
        Promise.prototype._onError = function _onError(reason) {
            var _this = this;
            config.after(function () {
                if (_this._onError) {
                    config.trigger('error', reason, _this._label);
                }
            });
        };
        Promise.prototype.catch = function _catch(onRejection, label) {
            return this.then(undefined, onRejection, label);
        };
        return Promise;
    }();
    Promise.all = all;
    Promise.resolve = resolve$$1;
    Promise.reject = reject$1;
    Promise.prototype._guidKey = guidKey;
    Promise.prototype.then = then;
    function all$1(array, label) {
        return Promise.all(array, label);
    }
    function resolve$2(value, label) {
        return Promise.resolve(value, label);
    }
    function reject$2(reason, label) {
        return Promise.reject(reason, label);
    }
    var len = 0;
    function asap(callback, arg) {
        queue$1[len] = callback;
        queue$1[len + 1] = arg;
        len += 2;
        if (len === 2) {
            scheduleFlush$1();
        }
    }
    var browserWindow = typeof window !== 'undefined' ? window : undefined;
    var browserGlobal = browserWindow || {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';
    var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
    function useNextTick() {
        var nextTick = process.nextTick;
        var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
        if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
            nextTick = setImmediate;
        }
        return function () {
            return nextTick(flush);
        };
    }
    function useMutationObserver() {
        var iterations = 0;
        var observer = new BrowserMutationObserver(flush);
        var node = document.createTextNode('');
        observer.observe(node, { characterData: true });
        return function () {
            return node.data = iterations = ++iterations % 2;
        };
    }
    function useMessageChannel() {
        var channel = new MessageChannel();
        channel.port1.onmessage = flush;
        return function () {
            return channel.port2.postMessage(0);
        };
    }
    function useSetTimeout() {
        return function () {
            return setTimeout(flush, 1);
        };
    }
    var queue$1 = new Array(1000);
    function flush() {
        for (var i = 0; i < len; i += 2) {
            var callback = queue$1[i];
            var arg = queue$1[i + 1];
            callback(arg);
            queue$1[i] = undefined;
            queue$1[i + 1] = undefined;
        }
        len = 0;
    }
    var scheduleFlush$1 = void 0;
    if (isNode) {
        scheduleFlush$1 = useNextTick();
    } else if (BrowserMutationObserver) {
        scheduleFlush$1 = useMutationObserver();
    } else if (isWorker) {
        scheduleFlush$1 = useMessageChannel();
    } else {
        scheduleFlush$1 = useSetTimeout();
    }
    config.casync = asap;
    config.after = function (cb) {
        return setTimeout(cb, 0);
    };
    var casync = function (callback, arg) {
        return config.casync(callback, arg);
    };
    var async = {
        Promise: Promise,
        EventTarget: EventTarget,
        all: all$1,
        resolve: resolve$2,
        reject: reject$2,
    };
    exports.default = async;
    exports.Promise = Promise;
    exports.EventTarget = EventTarget;
    exports.all = all$1;
    exports.resolve = resolve$2;
    exports.reject = reject$2;
    exports.casync = casync;
    Object.defineProperty(exports, '__esModule', { value: true });
})));
var jscompress = (function() {
    var f = String.fromCharCode;
    var jscompress = {
        compress: function (uncompressed) {
            return jscompress._compress(uncompressed, 16, function(a){return f(a);});
        },
        _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
            if (uncompressed == null) return "";
            var i, value,
                context_dictionary= {},
                context_dictionaryToCreate= {},
                context_c="",
                context_wc="",
                context_w="",
                context_enlargeIn= 2,
                context_dictSize= 3,
                context_numBits= 2,
                context_data=[],
                context_data_val=0,
                context_data_position=0,
                ii;
            for (ii = 0; ii < uncompressed.length; ii += 1) {
                context_c = uncompressed.charAt(ii);
                if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
                    context_dictionary[context_c] = context_dictSize++;
                    context_dictionaryToCreate[context_c] = true;
                }
                context_wc = context_w + context_c;
                if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
                    context_w = context_wc;
                } else {
                    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
                        if (context_w.charCodeAt(0)<256) {
                            for (i=0 ; i<context_numBits ; i++) {
                                context_data_val = (context_data_val << 1);
                                if (context_data_position == bitsPerChar-1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                            }
                            value = context_w.charCodeAt(0);
                            for (i=0 ; i<8 ; i++) {
                                context_data_val = (context_data_val << 1) | (value&1);
                                if (context_data_position == bitsPerChar-1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        } else {
                            value = 1;
                            for (i=0 ; i<context_numBits ; i++) {
                                context_data_val = (context_data_val << 1) | value;
                                if (context_data_position ==bitsPerChar-1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = 0;
                            }
                            value = context_w.charCodeAt(0);
                            for (i=0 ; i<16 ; i++) {
                                context_data_val = (context_data_val << 1) | (value&1);
                                if (context_data_position == bitsPerChar-1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn == 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        delete context_dictionaryToCreate[context_w];
                    } else {
                        value = context_dictionary[context_w];
                        for (i=0 ; i<context_numBits ; i++) {
                            context_data_val = (context_data_val << 1) | (value&1);
                            if (context_data_position == bitsPerChar-1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    context_dictionary[context_wc] = context_dictSize++;
                    context_w = String(context_c);
                }
            }
            if (context_w !== "") {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
                    if (context_w.charCodeAt(0)<256) {
                        for (i=0 ; i<context_numBits ; i++) {
                            context_data_val = (context_data_val << 1);
                            if (context_data_position == bitsPerChar-1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                        }
                        value = context_w.charCodeAt(0);
                        for (i=0 ; i<8 ; i++) {
                            context_data_val = (context_data_val << 1) | (value&1);
                            if (context_data_position == bitsPerChar-1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    } else {
                        value = 1;
                        for (i=0 ; i<context_numBits ; i++) {
                            context_data_val = (context_data_val << 1) | value;
                            if (context_data_position == bitsPerChar-1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = 0;
                        }
                        value = context_w.charCodeAt(0);
                        for (i=0 ; i<16 ; i++) {
                            context_data_val = (context_data_val << 1) | (value&1);
                            if (context_data_position == bitsPerChar-1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    delete context_dictionaryToCreate[context_w];
                } else {
                    value = context_dictionary[context_w];
                    for (i=0 ; i<context_numBits ; i++) {
                        context_data_val = (context_data_val << 1) | (value&1);
                        if (context_data_position == bitsPerChar-1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
            }
            value = 2;
            for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                } else {
                    context_data_position++;
                }
                value = value >> 1;
            }
            while (true) {
                context_data_val = (context_data_val << 1);
                if (context_data_position == bitsPerChar-1) {
                    context_data.push(getCharFromInt(context_data_val));
                    break;
                }
                else context_data_position++;
            }
            return context_data.join('');
        },
        decompress: function (compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            return jscompress._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
        },
        _decompress: function (length, resetValue, getNextValue) {
            var dictionary = [],
                next,
                enlargeIn = 4,
                dictSize = 4,
                numBits = 3,
                entry = "",
                result = [],
                i,
                w,
                bits, resb, maxpower, power,
                c,
                data = {val:getNextValue(0), position:resetValue, index:1};
            for (i = 0; i < 3; i += 1) {
                dictionary[i] = i;
            }
            bits = 0;
            maxpower = Math.pow(2,2);
            power=1;
            while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
            }
            switch (next = bits) {
                case 0:
                    bits = 0;
                    maxpower = Math.pow(2,8);
                    power=1;
                    while (power!=maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb>0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    c = f(bits);
                    break;
                case 1:
                    bits = 0;
                    maxpower = Math.pow(2,16);
                    power=1;
                    while (power!=maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb>0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    c = f(bits);
                    break;
                case 2:
                    return "";
            }
            dictionary[3] = c;
            w = c;
            result.push(c);
            while (true) {
                if (data.index > length) {
                    return "";
                }
                bits = 0;
                maxpower = Math.pow(2,numBits);
                power=1;
                while (power!=maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb>0 ? 1 : 0) * power;
                    power <<= 1;
                }
                switch (c = bits) {
                    case 0:
                        bits = 0;
                        maxpower = Math.pow(2,8);
                        power=1;
                        while (power!=maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb>0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        dictionary[dictSize++] = f(bits);
                        c = dictSize-1;
                        enlargeIn--;
                        break;
                    case 1:
                        bits = 0;
                        maxpower = Math.pow(2,16);
                        power=1;
                        while (power!=maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb>0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        dictionary[dictSize++] = f(bits);
                        c = dictSize-1;
                        enlargeIn--;
                        break;
                    case 2:
                        return result.join('');
                }
                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
                if (dictionary[c]) {
                    entry = dictionary[c];
                } else {
                    if (c === dictSize) {
                        entry = w + w.charAt(0);
                    } else {
                        return null;
                    }
                }
                result.push(entry);
                dictionary[dictSize++] = w + entry.charAt(0);
                enlargeIn--;
                w = entry;
                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
            }
        }
    };
    return jscompress;
})();
if (typeof define === 'function' && define.amd) {
    define(function () { return jscompress; });
} else if( typeof module !== 'undefined' && module != null ) {
    module.exports = jscompress
}
(function( window, document ) {
    'use strict';
    var head = document.head || document.getElementsByTagName('head')[0];
    var storagePrefix = 'load-';
    var defaultExpiration = 50000;
    var inLscache = [];
    var progressHandlers = null;
    var addLocalStorage = function( key, storeObj ) {
        try {
            localStorage.setItem( storagePrefix + key, JSON.stringify( storeObj ) );
            return true;
        } catch( e ) {
            if ( e.name.toUpperCase().indexOf('QUOTA') >= 0 ) {
                var item;
                var tempScripts = [];
                for ( item in localStorage ) {
                    if ( item.indexOf( storagePrefix ) === 0 ) {
                        tempScripts.push( JSON.parse( localStorage[ item ] ) );
                    }
                }
                if ( tempScripts.length ) {
                    tempScripts.sort(function( a, b ) {
                        return a.stamp - b.stamp;
                    });
                    lscache.remove( tempScripts[ 0 ].key );
                    return addLocalStorage( key, storeObj );
                } else {
                    return;
                }
            } else {
                return;
            }
        }
    }
    var checkStoreOnStorage = function( storeObj ) {
        var maxLength = Math.pow(2,24);
        var preLength = 0;
        var hugeString = "0";
        var testString;
        var keyName = "testingLengthKey";
        testString = (new Array(Math.pow(2, 24))).join("X");
        while (maxLength !== preLength) {
            try  {
                localStorage.setItem(keyName, testString);
                preLength = testString.length;
                maxLength = Math.ceil(preLength + ((hugeString.length - preLength) / 2));
                testString = hugeString.substr(0, maxLength);
            } catch (e) {
                hugeString = testString;
                maxLength = Math.floor(testString.length - (testString.length - preLength) / 2);
                testString = hugeString.substr(0, maxLength);
            }
        }
        localStorage.removeItem(keyName);
        maxLength = maxLength + keyName.length - 2;
        var storeObjDataLength = storeObj.data.length;
        if (storeObjDataLength < maxLength) {
            return true;
        } else {
            return false;
        }
    }
    var getUrl = function( url ) {
        var promise = new async.Promise( function( resolve, reject ){
            var xhr = new XMLHttpRequest();
            xhr.open( 'GET', url );
            xhr.addEventListener("progress", function(evt) {
                if (progressHandlers) {
                    progressHandlers(evt)
                }
            }, false);
            xhr.onreadystatechange = function() {
                if ( xhr.readyState === 4 ) {
                    if ( ( xhr.status === 200 ) ||
                        ( ( xhr.status === 0 ) && xhr.responseText ) ) {
                        resolve( {
                            content: xhr.responseText,
                            type: xhr.getResponseHeader('content-type')
                        } );
                    } else {
                        reject( new Error( xhr.statusText ) );
                    }
                }
            }
            setTimeout( function () {
                if( xhr.readyState < 4 ) {
                    xhr.abort();
                }
            }, lscache.timeout );

            xhr.send();
        });
        return promise;
    };
    var saveUrl = function( obj ) {
        return getUrl( obj.url ).then( function( result ) {
            var storeObj = wrapStoreData( obj, result );
            if (!obj.skipCache) {
                if (checkStoreOnStorage( storeObj )) {
                    addLocalStorage( obj.key , storeObj );
                }
            }
            return storeObj;
        });
    };
    var wrapStoreData = function( obj, data ) {
        var now = +new Date();
        obj.data = jscompress.compress(data.content);
        obj.originalType = data.type;
        obj.type = obj.type || data.type;
        obj.skipCache = obj.skipCache || false;
        obj.stamp = now;
        obj.expire = now + ( ( obj.expire || defaultExpiration ) * 60 * 60 * 1000 );
        return obj;
    };
    var isCacheValid = function(source, obj) {
        return !source ||
            source.expire - +new Date() < 0  ||
            obj.unique !== source.unique ||
            (lscache.isValidItem && !lscache.isValidItem(source, obj));
    };
    var handleStackObject = function( obj ) {
        var source, promise, shouldFetch;
        if ( !obj.url ) {
            return;
        }
        obj.key =  ( obj.key || obj.url );
        source = lscache.get( obj.key );
        obj.execute = obj.execute !== false;
        shouldFetch = isCacheValid(source, obj);
        if( obj.live || shouldFetch ) {
            if ( obj.unique ) {
                obj.url += ( ( obj.url.indexOf('?') > 0 ) ? '&' : '?' ) + 'lscache-unique=' + obj.unique;
            }
            if (obj.type != 'data') {
                promise = saveUrl( obj );
            }
            if( obj.live && !shouldFetch ) {
                promise = promise
                    .then( function( result ) {
                        return result;
                    }, function() {
                        return source;
                    });
            }
        } else {
            source.type = obj.type || source.originalType;
            source.execute = obj.execute;
            promise = new async.Promise( function( resolve ){
                resolve( source );
            });
        }
        return promise;
    };
    var injectScript = function( obj ) {
        var script = document.createElement('script');
        script.defer = true;
        script.text = jscompress.decompress(obj.data);
        head.appendChild( script );
    };
    var handlers = {
        'default': injectScript,
    };
    var execute = function( obj ) {
        if( obj.type && handlers[ obj.type ] ) {
            return handlers[ obj.type ]( obj );
        }
        return handlers['default']( obj );
    };
    var performActions = function( resources ) {
        return resources.map( function( obj ) {
            if (obj) {
                if( obj.execute ) {
                    execute( obj );
                }
            }
            return obj;
        } );
    };
    var fetch = function() {
        var i, l, promises = [];
        for ( i = 0, l = arguments.length; i < l; i++ ) {
            promises.push( handleStackObject( arguments[ i ] ) );
        }
        return async.all( promises );
    };
    var thenRequire = function() {
        var resources = fetch.apply( null, arguments );
        var promise = this.then( function() {
            return resources;
        }).then( performActions );
        promise.thenRequire = thenRequire;
        return promise;
    };
    window.lscache = {
        require: function() {
            for ( var a = 0, l = arguments.length; a < l; a++ ) {
                arguments[a].execute = arguments[a].execute !== false;
                if ( arguments[a].once && inLscache.indexOf(arguments[a].url) >= 0 ) {
                    arguments[a].execute = false;
                } else if ( arguments[a].execute !== false && inLscache.indexOf(arguments[a].url) < 0 ) {
                    inLscache.push(arguments[a].url);
                }
            }
            var promise = fetch.apply( null, arguments ).then( performActions );
            promise.thenRequire = thenRequire;
            return promise;
        },
        remove: function( key ) {
            localStorage.removeItem( storagePrefix + key );
            return this;
        },
        get: function( key ) {
            var item = localStorage.getItem( storagePrefix + key );
            try	{
                return JSON.parse( item || 'false' );
            } catch( e ) {
                return false;
            }
        },
        clear: function( expired ) {
            var item, key;
            var now = +new Date();
            for ( item in localStorage ) {
                key = item.split( storagePrefix )[ 1 ];
                if ( key && ( !expired || this.get( key ).expire <= now ) ) {
                    this.remove( key );
                }
            }
            return this;
        },
        isValidItem: null,
        timeout: 10000,
        addProgressHandler: function( handler ) {
            progressHandlers = handler;
            return this;
        },
    };
    lscache.clear( true );
})( this, document );
var memory_loaded = false;
var default_display_style_desktop = 1;
var default_display_style_tablet = 1;
var default_display_style_mobile = 2;
function bodyOnload() {
  memory_loaded = true;
}
$(function() {
  var v12m_size = 5852605;
  var v12_size = 319305;
  var v12_total_size = v12m_size + v12_size;
  var v12_loading_percent = 75;
  var emu;
  var ui;
  var link;
  var progress_bar_height = 20;
  var progress_bar_left = 10;
  //<![CDATA[
    function reset() {
      d0 = 0;
      d1 = 0;
      d2 = 0;
      d3 = 0;
      d4 = 0;
      d5 = 0;
      d6 = 0;
      d7 = 0;
      a0 = 0;
      a1 = 0;
      a2 = 0;
      a3 = 0;
      a4 = 0;
      a5 = 0;
      a6 = 0;
      a8 = 0x4C00;
      a7 = 0x4C00;
      ram = new Uint16Array(131072);
  };
  //]]>
  var loadingMemory = false;
  function loadSimulator() {
    emu = TI68kEmulatorCoreModule(window);
    ui = TI68kEmulatorUIModule(window);
    link = TI68kEmulatorLinkModule(window);
    if (typeof(rom) === "object") {
      emu.setRom(rom);
    }
    emu.setReset(reset);
    var progress_bar = $('#progressbar div');
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 10 / 100) + '%');
    ui.setEmu(emu);
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 20 / 100) + '%');
    ui.setLink(link);
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 30 / 100) + '%');
    emu.setUI(ui);
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 40 / 100) + '%');
    emu.setLink(link);
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 50 / 100) + '%');
    link.setEmu(emu);
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 60 / 100) + '%');
    link.setUI(ui);
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 70 / 100) + '%');    
    emu.initemu();
    progress_bar.css('width', (v12_loading_percent + (100 - v12_loading_percent) * 80 / 100) + '%');
    $('#calccontainer #calcback').css('display', "block");
    $('#calccontainer #calcsceen').css('display', "block");
    var per = v12_loading_percent + (100 - v12_loading_percent) * 80 / 100;
    var timer = setInterval(function () {
      progress_bar.css('width', per + '%');
      if (per >= 100) {
        clearInterval(timer);
        fadeoutProgressBar();
      }
      per += (100 - v12_loading_percent) * 0.5 / 100;
    }, 50);
  }
  function downloadV12MV12() {
    lscache.addProgressHandler(function(evt) {
      $('#progressbar div').css('width', ((evt.loaded / v12_total_size) * 100 * v12_loading_percent / 100) + '%');
    }).require({ url: 'https://compuserve-rocks.github.io/Kings-diary/TI68k-emulator-versionJS/ti89rom.js' }).then(function () {
      lscache.addProgressHandler(function(evt) {
        $('#progressbar div').css('width', (((v12m_size + evt.loaded) / v12_total_size) * 100 * v12_loading_percent / 100) + '%');
      }).require({ url: '/js/v12.js' }).then(function () {
        loadSimulator();
      });
    });
  }
  function fadeoutProgressBar() {
    var el = $("#progressbar");
    el.css("opacity", 1);
    var op = 1;
    var timer = setInterval(function () {
      el.css("display", "none");
      if (op <= 0) {
        clearInterval(timer);
        loadingMemory = true;
      }
      op -= 0.05;
      el.css("opacity", op);
    }, 50);
  }
  var displayStyle = 1;
  const calcContainerWidth1 = 9213; const calcContainerLeft1 = 1173; const calcContainerRight1 = 1410;
  const calcContainerHeight1 = 10707; const calcContainerTop1 = 2303; const calcContainerBottom1 = 3087;
  const f1Top1 = 8725; const f1Left1 = 1157; const f2Top1 = 8837; const f2Left1 = 2588; const f3Top1 = 8905; const f3Left1 = 4050;
  const f4Top1 = 8837; const f4Left1 = 5560; const f5Top1 = 8735; const f5Left1 = 7032;
  var pressedFnHeight1 = 867; var pressedFnWidth1 = 867;

  const calcContainerWidth2 = 16277; const calcContainerLeft2 = 2890; const calcContainerRight2 = 1230;
  const calcContainerHeight2 = 11643; const calcContainerTop2 = 890; const calcContainerBottom2 = 830;
  const f1Top2 = 1000; const f1Left2 = 920; const f2Top2 = 2975; const f2Left2 = 920; const f3Top2 = 4940; const f3Left2 = 920;
  const f4Top2 = 6915; const f4Left2 = 920; const f5Top2 = 8910; const f5Left2 = 920;
  var pressedFnHeight2 = 1120; var pressedFnWidth2 = 1120;

  const calcContainerFitLeft = 0;
  const calcBackOffsetTop = 400; const calcBackOffsetRight = 400; const calcBackOffsetBottom = 400; const calcBackOffsetLeft = 400;

  var keysStyle = 1;
  const keysContainerWidth1 = 10510; const keysContainerHeight1 = 15360;
  const keysContainerWidth2 = 20780; const keysContainerHeight2 = 8100;
  const keyDefaultWidth1 = 1880; const keyDefaultHeight1 = 1500;
  const keyDefaultWidth2 = 1680; const keyDefaultHeight2 = 1500;
  const pressedDefaultWidth1 = 1880; const pressedDefaultHeight1 = 1071;
  const pressedDefaultWidth2 = 1680; const pressedDefaultHeight2 = 1071;
  const pressedSvgWidth1 = 2170; const pressedSvgHeight1 = 1500;
  const pressedSvgWidth2 = 2170; const pressedSvgHeight2 = 1500;

  var imageWidth;
  var imageHeight;
  var imageTop;
  var imageLeft;
  var keysContainerHeight;
  var keysWidth;
  var keysHeight;
  var keysTop;
  var keysLeft;
  var keysMarginTop = 5;
  var keysMarginBottom = 5;
  var keysMarginLeft = 5;
  var keysMarginRight = 5;
  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  var divideTopRatio = 0.5;
  const minSkinHeight = 100;
  const minKeyboardHeight = 100;
  const adjustHeight = 25;
  var disclaimerExpireFlag = false;
  var disclaimerTooltipVisible = false;
  var adjustBar = document.getElementById('adjustbar');
  var adjustBarTooltipVisible = false;
  adjustBar.style.position = 'absolute';
  adjustBar.style.zIndex = 1;
  adjustBar.style.top = windowHeight * divideTopRatio + 'px';
  adjustBar.style.display = 'block';
  function setDefaultDisplay() {
    var windowWidth = window.innerWidth;
    if (windowWidth >= 1024) {
      displayStyle = default_display_style_desktop;
    } else if (windowWidth < 1024 && windowWidth >= 768) {
      displayStyle = default_display_style_tablet;
    } else {
      displayStyle = default_display_style_mobile;
      if (displayStyle == 2) {
        divideTopRatio = windowWidth * calcContainerHeight2 / calcContainerWidth2 / windowHeight;
      }
    }
  }
  setDefaultDisplay();
  function fadeoutAdjustTooltip() {
    var el = $("#adjustbartooltip");
    var op = parseFloat(el.css("opacity"));
    var timer = setInterval(function () {
      if (op <= 0) {
        clearInterval(timer);
        el.css("display", "none");
      }
      op -= 0.05;
      el.css("opacity", op);
    }, 50);
  }
  function adjustAdjustTooltip(fade = 0) {
    if (adjustBarTooltipVisible) {
      if (fade) {
        fadeoutAdjustTooltip();
      } else {
        var adjustbar_el = $("#adjustbar");
        var adjbartt_el = $("#adjustbartooltip");
        var adjbartt_top = parseInt(adjustbar_el.css('top')) - parseInt(adjbartt_el.css('height'));
        var adjbartt_left = (window.innerWidth - parseInt(adjbartt_el.css('width'))) / 2;
        if (window.innerWidth > 1024) {
          adjbartt_left = (window.innerWidth + imageLeft + imageWidth - parseInt(adjbartt_el.css('width'))) / 2;
        }
        adjbartt_el.css('top', adjbartt_top + 'px');
        adjbartt_el.css('left', adjbartt_left + 'px');
        adjbartt_el.css("display", "block");
        setTimeout(function() { fadeoutAdjustTooltip(); }, 1000 * 7);
      }
    }
  }
  function fadeoutDisclaim() {
    fadeoutDisclaimTooltip();
    var el = $("#disclaimer");
    var op = parseFloat(el.css("opacity"));
    var timer = setInterval(function () {
      if (op <= 0) {
        clearInterval(timer);
        el.css("display", "none");
        adjustBarTooltipVisible = true;
        adjustAdjustTooltip();
      }
      op -= 0.05;
      el.css("opacity", op);
    }, 50);
  }
  function fadeoutDisclaimTooltip() {
    var el = $("#disclaimertooltip");
    var op = parseFloat(el.css("opacity"));
    var timer = setInterval(function () {
      if (op <= 0) {
        clearInterval(timer);
        el.css("display", "none");
      }
      op -= 0.05;
      el.css("opacity", op);
    }, 50);
  }
  function checkDisclaimer() {
    var disclaimerExpire = localStorage.getItem('disclaimerExpire') || 0;
    var cur_d = new Date();
    var cur_dt = cur_d.getTime();
    var expire_d = cur_d.getTime() + (7 * 24 * 60 * 60 * 1000);
    if (disclaimerExpire) {
      if (disclaimerExpire < cur_dt) {
        disclaimerExpireFlag = true;
      }
    } else {
      disclaimerExpireFlag = true;
    }
    if (disclaimerExpireFlag) {
      localStorage.setItem('disclaimerExpire', expire_d);
      var disclaimer_el = $("#disclaimer");
      var disclaimert_el = $("#disclaimertooltip");
      disclaimer_el.css("display", "block");
      var disclaimert_top = parseInt(disclaimer_el.css('top')) - parseInt(disclaimert_el.css('height'));
      var disclaimert_left = (window.innerWidth - parseInt(disclaimert_el.css('width'))) / 2;
      disclaimert_el.css('top', disclaimert_top + 'px');
      disclaimert_el.css('left', disclaimert_left + 'px');
      disclaimert_el.css("display", "block");
      document.onclick = fadeoutDisclaim;
    }
  }
  checkDisclaimer();
  function adjustFnBtn(pressedimg, fnbutton, btop, bleft, bwidth, bheight, btnkey) {
    $('#' + pressedimg).css('top', btop + "px");
    $('#' + pressedimg).css('left', bleft + "px");
    $('#' + pressedimg).css('width', bwidth + "px");
    $('#' + pressedimg).css('height', bheight + "px");
    $('#' + fnbutton).css('top', btop + "px");
    $('#' + fnbutton).css('left', bleft + "px");
    $('#' + fnbutton).css('width', bwidth + "px");
    $('#' + fnbutton).css('height', bheight + "px");
    mapKeyboardButton(fnbutton, btnkey, pressedimg);
  }
  function adjustFnBtns() {
    var calcContainerHeight = calcContainerHeight1; var calcContainerWidth = calcContainerWidth1;
    var pressedContainerHeight = pressedFnHeight1; var pressedContainerWidth = pressedFnWidth1;
    var f1Key = 47; var f2Key = 39; var f3Key = 31; var f4Key = 23; var f5Key = 15;
    var f1Top = f1Top1; var f1Left = f1Left1; var f2Top = f2Top1; var f2Left = f2Left1; var f3Top = f3Top1; var f3Left = f3Left1;
    var f4Top = f4Top1; var f4Left = f4Left1; var f5Top = f5Top1; var f5Left = f5Left1;
    if (displayStyle == 2) {
      f1Top = f1Top2; f1Left = f1Left2; f2Top = f2Top2; f2Left = f2Left2; f3Top = f3Top2; f3Left = f3Left2;
      f4Top = f4Top2; f4Left = f4Left2; f5Top = f5Top2; f5Left = f5Left2;
      calcContainerHeight = calcContainerHeight2; calcContainerWidth = calcContainerWidth2;
      pressedContainerHeight = pressedFnHeight2; pressedContainerWidth = pressedFnWidth2;
    }
    fnWidth = imageWidth * pressedContainerWidth / calcContainerWidth;
    fnHeight = imageHeight * pressedContainerHeight / calcContainerHeight;
    var fnTop; var fnLeft;
    fnTop = imageHeight * f1Top / calcContainerHeight + imageTop;
    fnLeft = imageWidth *  f1Left / calcContainerWidth + imageLeft;
    adjustFnBtn("f1pressedimg", "f1button", fnTop, fnLeft, fnWidth, fnHeight, f1Key);
    fnTop = imageHeight * f2Top / calcContainerHeight + imageTop;
    fnLeft = imageWidth *  f2Left / calcContainerWidth + imageLeft;
    adjustFnBtn("f2pressedimg", "f2button", fnTop, fnLeft, fnWidth, fnHeight, f2Key);
    fnTop = imageHeight * f3Top / calcContainerHeight + imageTop;
    fnLeft = imageWidth *  f3Left / calcContainerWidth + imageLeft;
    adjustFnBtn("f3pressedimg", "f3button", fnTop, fnLeft, fnWidth, fnHeight, f3Key);
    fnTop = imageHeight * f4Top / calcContainerHeight + imageTop;
    fnLeft = imageWidth *  f4Left / calcContainerWidth + imageLeft;
    adjustFnBtn("f4pressedimg", "f4button", fnTop, fnLeft, fnWidth, fnHeight, f4Key);
    fnTop = imageHeight * f5Top / calcContainerHeight + imageTop;
    fnLeft = imageWidth *  f5Left / calcContainerWidth + imageLeft;
    adjustFnBtn("f5pressedimg", "f5button", fnTop, fnLeft, fnWidth, fnHeight, f5Key);
  }
  function adjustKeyboardBtn(areaimg, btnimg, pressedimg, btop, bleft, btnkey = -1, keyType = 1, bwidth = -1, bheight = -1, ctop = 0, cleft = 0, pwidth =  -1, pheight = -1, ptop = -1, pleft = -1) {
    var keyContainerWidth = keysContainerWidth1; var keyContainerHeight = keysContainerHeight1;
    var keyContinerTop = keysTop;
    if (keysStyle == 2) {
      keyContainerWidth = keysContainerWidth2;
      keyContainerHeight = keysContainerHeight2;
    }
    var xRatio = 1;
    var yRatio = 1;
    if (keyType == 1 || keyType == 3) {
      if (bwidth == -1) { bwidth = keyDefaultWidth1; }
      if (bheight == -1) { bheight = keyDefaultHeight1; }
    } else if (keyType == 2 || keyType == 4) {
      if (bwidth == -1) { bwidth = keyDefaultWidth2; }
      if (bheight == -1) { bheight = keyDefaultHeight2; }
    }
    if (keyType == 3) {
      xRatio = bwidth / keyDefaultWidth1;
      yRatio = bheight / keyDefaultHeight1;
    } else if (keyType == 4) {
      xRatio = bwidth / keyDefaultWidth2;
      yRatio = bheight / keyDefaultHeight2;
    }
    var xyRatio = xRatio;
    if (yRatio > xyRatio) { xyRatio = yRatio; }
    var buttonWidth = keysWidth * bwidth / keyContainerWidth * xyRatio;
    var buttonHeight = keysHeight * bheight / keyContainerHeight * xyRatio;
    var buttonTop = keysHeight * (btop + ctop / 2) / keyContainerHeight + keyContinerTop;
    var buttonLeft = keysWidth * (bleft + cleft / 2) / keyContainerWidth + keysLeft;
    if (keyType == 1 || keyType == 3) {
      buttonTop = buttonTop + (bheight - keyDefaultHeight1) / 2 * keysHeight / keyContainerHeight;
      buttonLeft = buttonLeft - (bwidth - keyDefaultWidth1) / 2 * keysWidth / keyContainerWidth;
    } else if (keyType == 2 || keyType == 4) {
      buttonTop = buttonTop + (bheight - keyDefaultHeight2) / 2 * keysHeight / keyContainerHeight;
      buttonLeft = buttonLeft - (bwidth - keyDefaultWidth2) / 2 * keysWidth / keyContainerWidth;
    }
    $('#' + btnimg).css('top', buttonTop + "px");
    $('#' + btnimg).css('left', buttonLeft + "px");
    $('#' + btnimg).css('width', buttonWidth + "px");
    $('#' + btnimg).css('height', buttonHeight + "px");
    xRatio = 1;
    yRatio = 1;
    if (keyType == 5) {
      pwidth = bwidth;
      pheight = bheight;
    }
    if (keyType == 1 || keyType == 3) {
      if (pwidth == -1) { pwidth = pressedSvgWidth1; }
      if (pheight == -1) { pheight = pressedSvgHeight1; }
      if (ptop == -1) { ptop = 0; }
      if (pleft == -1) { pleft = 0; }
    } else if (keyType == 2 || keyType == 4) {
      if (pwidth == -1) { pwidth = pressedSvgWidth2; }
      if (pheight == -1) { pheight = pressedSvgHeight2; }
    }
    if (keyType == 3) {
      xRatio = pwidth / pressedSvgWidth1;
      yRatio = pheight / pressedSvgHeight1;
    } else if (keyType == 4) {
      xRatio = pwidth / pressedSvgWidth2;
      yRatio = pheight / pressedSvgHeight2;
    }
    xyRatio = xRatio;
    if (yRatio > xyRatio) { xyRatio = yRatio; }
    if (keyType == 1 || keyType == 3) {
      pwidth = pwidth * pressedDefaultWidth1 / pressedSvgWidth1;
      pheight = pheight * pressedDefaultHeight1 / pressedSvgHeight1;
    } else if (keyType == 2 || keyType == 4) {
      pwidth = pwidth * pressedDefaultWidth2 / pressedSvgWidth2;
      pheight = pheight * pressedDefaultHeight2 / pressedSvgHeight2;
    }
    var pressedWidth = keysWidth * pwidth / keyContainerWidth * xyRatio;
    var pressedHeight = keysHeight * pheight / keyContainerHeight * xyRatio;
    var pressedTop = keysHeight * (btop + bheight - pheight + ptop) / keyContainerHeight + keyContinerTop;
    var pressedLeft = keysWidth * (bleft + pleft) / keyContainerWidth + keysLeft;
    $('#' + areaimg).css('top', pressedTop + "px");
    $('#' + areaimg).css('left', pressedLeft + "px");
    $('#' + areaimg).css('width', pressedWidth + "px");
    $('#' + areaimg).css('height', pressedHeight + "px");
    if (keyType == 1 || keyType == 3) {
      pressedTop = pressedTop + (pheight - pressedDefaultHeight1) / 2 * keysHeight / keyContainerHeight;
      pressedLeft = pressedLeft - (pwidth - pressedDefaultWidth1) / 2 * keysWidth / keyContainerWidth;
    } else if (keyType == 2 || keyType == 4) {
      pressedTop = pressedTop + (pheight - pressedDefaultHeight2) / 2 * keysHeight / keyContainerHeight;
      pressedLeft = pressedLeft - (pwidth - pressedDefaultWidth2) / 2 * keysWidth / keyContainerWidth;
    }
    if (keyType == 3 || keyType == 4) {
      pressedTop = pressedTop + ctop / 4 * keysHeight / keyContainerHeight;
    }
    $('#' + pressedimg).css('top', pressedTop + "px");
    $('#' + pressedimg).css('left', pressedLeft + "px");
    $('#' + pressedimg).css('width', pressedWidth + "px");
    $('#' + pressedimg).css('height', pressedHeight + "px");
    if (btnkey >= 0) {
      mapKeyboardButton(areaimg, btnkey, pressedimg);
    }
  }
  function adjustKeyboardBtns() {
    if (keysStyle == 1) {
      adjustKeyboardBtn("2ndbutton", "2ndbuttonimg", "2ndpressedimg",                                           1260,    0,  4);
      adjustKeyboardBtn("arrowupbutton", "arrowupbuttonimg", "arrowuppressedimg",                               1260, 2080,  5,  1,    -1,   -1,  0,   0,  -1,  -1,  25);
      adjustKeyboardBtn("escbutton", "escbuttonimg", "escpressedimg",                                           1260, 4160, 48, 1, 2130, 1500,   0,  94);
      adjustKeyboardBtn("yellowbutton", "yellowbuttonimg", "yellowpressedimg",                                  2710,    0,  6, 1,    -1,   -1,  0,   0,  -1,  -1,  9);
      adjustKeyboardBtn("alphabutton", "alphabuttonimg", "alphapressedimg",                                     2760, 2080,  7);
      adjustKeyboardBtn("appsbutton", "appsbuttonimg", "appspressedimg",                                        2760, 4160, 40);
      adjustKeyboardBtn("keyleftbutton", "keyleftbuttonimg", "keyleftpressedimg",                               1405, 6390,  1, 5, 1380, 1500);
      adjustKeyboardBtn("keyupbutton", "keyupbuttonimg", "keyuppressedimg",                                        0, 7770,  0, 5, 1380, 1960);
      adjustKeyboardBtn("keyrightbutton", "keyrightbuttonimg", "keyrightpressedimg",                            1405, 9150,  3, 5, 1380, 1500);
      adjustKeyboardBtn("keydownbutton", "keydownbuttonimg", "keydownpressedimg",                               2300, 7770,  2, 5, 1380, 1960);
      adjustKeyboardBtn("homebutton", "homebuttonimg", "homepressedimg",                                        4260,   0,  46, 1,   -1,   -1,  0,   0,  -1,  -1,  9);
      adjustKeyboardBtn("modebutton", "modebuttonimg", "modepressedimg",                                        4260, 2080, 38, 1,   -1,   -1,  0,   0,  -1,  -1,  5);
      adjustKeyboardBtn("catalogbutton", "catalogbuttonimg", "catalogpressedimg",                               4260, 4160, 30, 1,   -1,   -1,  0,   0,  -1,  -1,  5);
      adjustKeyboardBtn("arrowbutton", "arrowbuttonimg", "arrowpressedimg",                                     4260, 6240, 22, 1,   -1,   -1,  0,   0,  -1,  -1,  5);
      adjustKeyboardBtn("clearbutton", "clearbuttonimg", "clearpressedimg",                                     4260, 8320, 14, 1,   -1,   -1,  0,   0,  -1,  -1,  5);
      adjustKeyboardBtn("xbutton", "xbuttonimg", "xpressedimg",                                                 5760,   0,  45, 1,   -1,   -1,   0,   0,   -1,  -1,  11);
      adjustKeyboardBtn("ybutton", "ybuttonimg", "ypressedimg",                                                 5760, 2080, 37, 3, 1900, 1550, -260, -60,  -1,  -1,  12);
      adjustKeyboardBtn("zbutton", "zbuttonimg", "zpressedimg",                                                 5760, 4160, 29, 3, 1900, 1550, -280, -50,  -1,  -1,  31);
      adjustKeyboardBtn("tbutton", "tbuttonimg", "tpressedimg",                                                 5760, 6240, 21, 3, 1900, 1550, -260, -60,  -1,  -1,  19);
      adjustKeyboardBtn("upbutton", "upbuttonimg", "uppressedimg",                                              5760, 8320, 13, 1,   -1,   -1,    0,   0,  -1,  -1,  9);
      adjustKeyboardBtn("equalbutton", "equalbuttonimg", "equalpressedimg",                                     7260,   0,  44, 1,   -1,   -1,   0,   0,   -1,  -1,  5);
      adjustKeyboardBtn("leftparenthesesbutton", "leftparenthesesbuttonimg", "leftparenthesespressedimg",       7260, 2080, 36, 1,   -1,   -1,   0,   0,   -1,  -1,  5);
      adjustKeyboardBtn("rightparenthesesbutton", "rightparenthesesbuttonimg", "rightparenthesespressedimg",    7260, 4160, 28, 1,   -1,   -1,   0,   0,   -1,  -1,  3);
      adjustKeyboardBtn("commabutton", "commabuttonimg", "commapressedimg",                                     7260, 6240, 20, 1,   -1,   -1,   0,   0,   -1,  -1,  5);
      adjustKeyboardBtn("dividebutton", "dividebuttonimg", "dividepressedimg",                                  7260, 8320, 12, 1,   -1,   -1,   0,   0,   -1,  -1,  3);
      adjustKeyboardBtn("verticalbutton", "verticalbuttonimg", "verticalpressedimg",                            8760,   0,  43, 1,   -1,   -1,   0,   0,   -1,  -1,  5);
      adjustKeyboardBtn("7button", "7buttonimg", "7pressedimg",                                                 8860, 2080, 35, 2);
      adjustKeyboardBtn("8button", "8buttonimg", "8pressedimg",                                                 8860, 4160, 27, 2);
      adjustKeyboardBtn("9button", "9buttonimg", "9pressedimg",                                                 8860, 6240, 19, 2);
      adjustKeyboardBtn("multiplybutton", "multiplybuttonimg", "multiplypressedimg",                            8760, 8320, 11);
      adjustKeyboardBtn("eebutton", "eebuttonimg", "eepressedimg",                                              10260,   0,  42, 1,    -1,   -1,   0,   0,  -1,  -1,  12);
      adjustKeyboardBtn("4button", "4buttonimg", "4pressedimg",                                                 10460, 2080, 34, 2);
      adjustKeyboardBtn("5button", "5buttonimg", "5pressedimg",                                                 10460, 4160, 26, 2);
      adjustKeyboardBtn("6button", "6buttonimg", "6pressedimg",                                                 10460, 6240, 18, 2);
      adjustKeyboardBtn("minusbutton", "minusbuttonimg", "minuspressedimg",                                     10260, 8320, 10, 1);
      adjustKeyboardBtn("stobutton", "stobuttonimg", "stopressedimg",                                           11760,   0,  41, 1,    -1,   -1,   0,   0,  -1,  -1,  11);
      adjustKeyboardBtn("1button", "1buttonimg", "1pressedimg",                                                 12060, 2080, 33, 2);
      adjustKeyboardBtn("2button", "2buttonimg", "2pressedimg",                                                 12060, 4160, 25, 2);
      adjustKeyboardBtn("3button", "3buttonimg", "3pressedimg",                                                 12060, 6240, 17, 2);
      adjustKeyboardBtn("plusbutton", "plusbuttonimg", "pluspressedimg",                                        11760, 8320, 9);
      adjustKeyboardBtn("onbutton", "onbuttonimg", "onpressedimg",                                              13260,   0, 407, 6, 1880, 1800, 0, 0, 1880, 1371);
      adjustKeyboardBtn("0button", "0buttonimg", "0pressedimg",                                                 13660, 2080, 32, 2);
      adjustKeyboardBtn("dotbutton", "dotbuttonimg", "dotpressedimg",                                           13660, 4160, 24, 2);
      adjustKeyboardBtn("complexminusbutton", "complexminusbuttonimg", "complexminuspressedimg",                13660, 6240, 16, 2);
      adjustKeyboardBtn("enterbutton", "enterbuttonimg", "enterpressedimg",                                     13260, 8320,  8, 6, 1880, 1800, 0, 0, 1880, 1371);
    } else {
      adjustKeyboardBtn("2ndbutton", "2ndbuttonimg", "2ndpressedimg",                                              0,     0, 4);
      adjustKeyboardBtn("arrowupbutton", "arrowupbuttonimg", "arrowuppressedimg",                                  0,  2080, 5,  1,   -1,   -1,  0,   0,  -1,  -1,  20);
      adjustKeyboardBtn("escbutton", "escbuttonimg", "escpressedimg",                                              0,  4160, 48, 1, 2130, 1500, 0, 94);
      adjustKeyboardBtn("leftparenthesesbutton", "leftparenthesesbuttonimg", "leftparenthesespressedimg",          0,  6240, 36,  1,   -1,   -1,  0,   0,  -1,  -1,  6);
      adjustKeyboardBtn("rightparenthesesbutton", "rightparenthesesbuttonimg", "rightparenthesespressedimg",       0,  8320, 28);
      adjustKeyboardBtn("clearbutton", "clearbuttonimg", "clearpressedimg",                                        0, 10400, 14);
      adjustKeyboardBtn("arrowbutton", "arrowbuttonimg", "arrowpressedimg",                                        0, 12480, 22);
      adjustKeyboardBtn("dividebutton", "dividebuttonimg", "dividepressedimg",                                     0, 14560, 12);
      adjustKeyboardBtn("keyleftbutton", "keyleftbuttonimg", "keyleftpressedimg",                               3175, 16640,  1, 5, 1380, 1500);
      adjustKeyboardBtn("keyupbutton", "keyupbuttonimg", "keyuppressedimg",                                     1770, 18020,  0, 5, 1380, 1960);
      adjustKeyboardBtn("keyrightbutton", "keyrightbuttonimg", "keyrightpressedimg",                            3175, 19400,  3, 5, 1380, 1960);
      adjustKeyboardBtn("keydownbutton", "keydownbuttonimg", "keydownpressedimg",                               4070, 18020,  2, 5, 1380, 1960);
      adjustKeyboardBtn("yellowbutton", "yellowbuttonimg", "yellowpressedimg",                                  1450,     0,  6, 1,    -1,   -1,  0,   0,  -1,  -1,  9);
      adjustKeyboardBtn("alphabutton", "alphabuttonimg", "alphapressedimg",                                     1500,  2080,  7);
      adjustKeyboardBtn("appsbutton", "appsbuttonimg", "appspressedimg",                                        1500,  4160, 40);
      adjustKeyboardBtn("equalbutton", "equalbuttonimg", "equalpressedimg",                                     1500,  6240, 44);
      adjustKeyboardBtn("7button", "7buttonimg", "7pressedimg",                                                 1500,  8320, 35, 2);
      adjustKeyboardBtn("8button", "8buttonimg", "8pressedimg",                                                 1500, 10400, 27, 2);
      adjustKeyboardBtn("9button", "9buttonimg", "9pressedimg",                                                 1500, 12480, 19, 2);
      adjustKeyboardBtn("multiplybutton", "multiplybuttonimg", "multiplypressedimg",                            1500, 14560, 11);
      adjustKeyboardBtn("homebutton", "homebuttonimg", "homepressedimg",                                        3100,    0,  46, 1,    -1,   -1,  0,   0,  -1,  -1,  12);
      adjustKeyboardBtn("modebutton", "modebuttonimg", "modepressedimg",                                        3100,  2080, 38, 1,    -1,   -1,  0,   0,  -1,  -1,  5);
      adjustKeyboardBtn("catalogbutton", "catalogbuttonimg", "catalogpressedimg",                               3100,  4160, 30, 1,    -1,   -1,  0,   0,  -1,  -1,  5);
      adjustKeyboardBtn("upbutton", "upbuttonimg", "uppressedimg",                                              3100,  6240, 13, 1,    -1,   -1,   0,   0,  -1,  -1,  8);
      adjustKeyboardBtn("4button", "4buttonimg", "4pressedimg",                                                 3100,  8320, 34, 2);
      adjustKeyboardBtn("5button", "5buttonimg", "5pressedimg",                                                 3100, 10400, 26, 2);
      adjustKeyboardBtn("6button", "6buttonimg", "6pressedimg",                                                 3100, 12480, 18, 2);
      adjustKeyboardBtn("minusbutton", "minusbuttonimg", "minuspressedimg",                                     3100, 14560, 10, 1);
      adjustKeyboardBtn("verticalbutton", "verticalbuttonimg", "verticalpressedimg",                            4700,     0, 43);
      adjustKeyboardBtn("tbutton", "tbuttonimg", "tpressedimg",                                                 4700,  2080, 21, 3, 1900, 1550, -260, -60,  -1,  -1,  15);
      adjustKeyboardBtn("ybutton", "ybuttonimg", "ypressedimg",                                                 4700,  4160, 37, 3, 1900, 1550, -260, -60,  -1,  -1,  12);
      adjustKeyboardBtn("xbutton", "xbuttonimg", "xpressedimg",                                                 4700,  6240, 45, 1,    -1,   -1,  0,    0,  -1,  -1,  11);
      adjustKeyboardBtn("1button", "1buttonimg", "1pressedimg",                                                 4700,  8320, 33, 2);
      adjustKeyboardBtn("2button", "2buttonimg", "2pressedimg",                                                 4700, 10400, 25, 2);
      adjustKeyboardBtn("3button", "3buttonimg", "3pressedimg",                                                 4700, 12480, 17, 2);
      adjustKeyboardBtn("plusbutton", "plusbuttonimg", "pluspressedimg",                                        4700, 14560, 9);
      adjustKeyboardBtn("eebutton", "eebuttonimg", "eepressedimg",                                              6300,     0, 42, 1,    -1,   -1,   0,   0,  -1,  -1,  12);
      adjustKeyboardBtn("stobutton", "stobuttonimg", "stopressedimg",                                           6300,  2080, 41, 1,    -1,   -1,   0,   0,  -1,  -1,  11);
      adjustKeyboardBtn("zbutton", "zbuttonimg", "zpressedimg",                                                 6300,  4160, 29, 3, 1900, 1550, -210, -50,  -1,  -1,  35);
      adjustKeyboardBtn("commabutton", "commabuttonimg", "commapressedimg",                                     6300,  6240, 20, 1,    -1,   -1,   0,   0,  -1,  -1,  2);
      adjustKeyboardBtn("0button", "0buttonimg", "0pressedimg",                                                 6300,  8320, 32, 2);
      adjustKeyboardBtn("dotbutton", "dotbuttonimg", "dotpressedimg",                                           6300, 10400, 24, 2);
      adjustKeyboardBtn("complexminusbutton", "complexminusbuttonimg", "complexminuspressedimg",                6300, 12480, 16, 2);
      adjustKeyboardBtn("enterbutton", "enterbuttonimg", "enterpressedimg",                                     6300, 14560,  8,  6, 1880, 1800, 0, 0, 1880, 1371);
      adjustKeyboardBtn("onbutton", "onbuttonimg", "onpressedimg",                                                  0,     0,    0,    0,  0,   0);
    }
  }
  function adjustComponentsSize() {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    var canvasWidth = windowWidth;
    var canvasHeight = windowHeight * divideTopRatio;
    var calcContainerWidth = calcContainerWidth1; var calcContainerLeft = calcContainerLeft1; var calcContainerRight = calcContainerRight1;
    var calcContainerHeight = calcContainerHeight1; var calcContainerTop = calcContainerTop1; var calcContainerBottom = calcContainerBottom1;
    if (displayStyle == 2) {
      calcContainerWidth = calcContainerWidth2; calcContainerLeft = calcContainerLeft2; calcContainerRight = calcContainerRight2;
      calcContainerHeight = calcContainerHeight2; calcContainerTop = calcContainerTop2; calcContainerBottom = calcContainerBottom2;
    }
    if (windowWidth > 768) {
      canvasWidth = canvasHeight * calcContainerWidth / calcContainerHeight;
    }

    $('#adjustbar').css('top', windowHeight * divideTopRatio);
    adjustAdjustTooltip(1);
    var disclaimer_height = parseInt($('#disclaimer-content').height());
    $('#disclaimer').css('height', (disclaimer_height + 40) + 'px');
    var xRatio = canvasHeight / calcContainerHeight;
    var yRatio = canvasWidth / calcContainerWidth;
    var xyRatio = xRatio;
    if (yRatio < xyRatio) { xyRatio = yRatio; }
    imageWidth = calcContainerWidth * xyRatio;
    imageHeight = calcContainerHeight * xyRatio;
    imageTop = (canvasHeight - imageHeight) / 2;
    imageLeft = (windowWidth - imageWidth) / 2;
    if (displayStyle == 2) {
      var imageFitleft = imageWidth * calcContainerFitLeft / calcContainerWidth;
      if (windowWidth >= 768) {
        if (imageWidth + imageFitleft <= windowWidth) {
          imageLeft = imageLeft - imageFitleft;
        }
      }
    }
    if (displayStyle == 1) {
      if (loadingMemory) {
        $('#calccontainer #calcimg').css('display', "block");
        $('#calccontainer #calcimg2').css('display', "none");
      }
      $('#calccontainer #calcimg').css('top', imageTop + "px");
      $('#calccontainer #calcimg').css('left', imageLeft + "px");
      $('#calccontainer #calcimg').css('width', imageWidth + "px");
      $('#calccontainer #calcimg').css('height', imageHeight + "px");
    } else {
      if (loadingMemory) {
        $('#calccontainer #calcimg').css('display', "none");
        $('#calccontainer #calcimg2').css('display', "block");
      }
      $('#calccontainer #calcimg2').css('top', imageTop + "px");
      $('#calccontainer #calcimg2').css('left', imageLeft + "px");
      $('#calccontainer #calcimg2').css('width', (imageWidth + 1) + "px");
      $('#calccontainer #calcimg2').css('height', (imageHeight + 1) + "px");
    }

    keysContainerHeight = windowHeight - canvasHeight;
    keysHeight = keysContainerHeight - keysMarginTop - keysMarginBottom;
    keysWidth = keysHeight * keysContainerWidth1 / keysContainerHeight1;
    if (keysStyle == 2) {
      keysHeight = keysHeight - adjustHeight;
      keysWidth = keysHeight * keysContainerWidth2 / keysContainerHeight2;
    }
    if (keysWidth > (windowWidth - keysMarginLeft - keysMarginRight)) {
      keysHeight = keysHeight * (windowWidth - keysMarginLeft - keysMarginRight) / keysWidth;
      keysWidth = windowWidth - keysMarginLeft - keysMarginRight;
    }
    keysLeft = (windowWidth - keysWidth) / 2;
    keysTop = (keysContainerHeight - keysHeight- keysMarginTop - keysMarginBottom) / 2 + keysMarginTop;
    if (keysStyle == 2) {
      keysTop = (keysContainerHeight - keysHeight- keysMarginTop - keysMarginBottom - adjustHeight) / 2 + keysMarginTop + adjustHeight;
    }
    $('#keyboardcontainer').css('height', keysContainerHeight);
    adjustKeyboardBtns();
    
    var screenTop = imageTop +  imageHeight * calcContainerTop / calcContainerHeight;
    var screenLeft = imageLeft + imageWidth * calcContainerLeft / calcContainerWidth;
    var screenWidth = imageWidth * (calcContainerWidth - calcContainerLeft - calcContainerRight) / calcContainerWidth;
    var screenHeight = imageHeight * (calcContainerHeight - calcContainerTop - calcContainerBottom) / calcContainerHeight;
    $('#calccontainer #screen').css('top', screenTop + "px");
    $('#calccontainer #screen').css('left', screenLeft + "px");
    $('#calccontainer #screen').css('width', screenWidth + "px");
    $('#calccontainer #screen').css('height', screenHeight + "px");
    $('#progressbar').css('top', (screenTop + screenHeight / 2 - progress_bar_height / 2) + "px");
    $('#progressbar').css('width', (screenWidth - progress_bar_left * 2) + "px");
    $('#progressbar').css('left', (screenLeft + progress_bar_left) + "px");

    if (windowWidth > 768) {
      $('#calccontainer #calcback').css('top', (screenTop - calcBackOffsetTop * screenHeight / calcContainerHeight) + "px");
      $('#calccontainer #calcback').css('left', (screenLeft - calcBackOffsetLeft * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcback').css('width', (screenWidth + (calcBackOffsetLeft + calcBackOffsetRight) * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcback').css('height', (screenHeight + (calcBackOffsetTop + calcBackOffsetBottom) * screenHeight / calcContainerHeight) + "px");
      $('#calccontainer #calcsceen').css('top', (screenTop - calcBackOffsetTop * screenHeight / calcContainerHeight) + "px");
      $('#calccontainer #calcsceen').css('left', (screenLeft - calcBackOffsetLeft * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcsceen').css('width', (screenWidth + (calcBackOffsetLeft + calcBackOffsetRight) * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcsceen').css('height',(screenHeight + (calcBackOffsetTop + calcBackOffsetBottom) * screenHeight / calcContainerHeight) + "px");
    } else {
      $('#calccontainer #calcback').css('top', (screenTop - calcBackOffsetTop * screenHeight / calcContainerHeight) + "px");
      $('#calccontainer #calcback').css('left', (screenLeft - calcBackOffsetLeft * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcback').css('width', (screenWidth + (calcBackOffsetLeft + calcBackOffsetRight) * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcback').css('height', (screenHeight + (calcBackOffsetTop + calcBackOffsetBottom) * screenHeight / calcContainerHeight) + "px");
      $('#calccontainer #calcsceen').css('top', (screenTop - calcBackOffsetTop * screenHeight / calcContainerHeight) + "px");
      $('#calccontainer #calcsceen').css('left', (screenLeft - calcBackOffsetLeft * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcsceen').css('width', (screenWidth + (calcBackOffsetLeft + calcBackOffsetRight) * screenWidth / calcContainerWidth) + "px");
      $('#calccontainer #calcsceen').css('height',(screenHeight + (calcBackOffsetTop + calcBackOffsetBottom) * screenHeight / calcContainerHeight) + "px");
    }

    adjustFnBtns();
  }
  window.onresize = adjustComponentsSize;
  adjustComponentsSize();
  if (!disclaimerExpireFlag) {
    adjustBarTooltipVisible = true;
    adjustAdjustTooltip();
  }
  function displayElements() {
    if (displayStyle == 1) {
      $('#calccontainer #calcimg').css('display', "block");
      $('#calccontainer #calcimg2').css('display', "none");
    } else {
      $('#calccontainer #calcimg').css('display', "none");
      $('#calccontainer #calcimg2').css('display', "block");
    }
    $('#keyboardcontainer').css('display', 'block');
    $('#progressbar').css('display', 'block');
  }
  displayElements();
  downloadV12MV12();
  function mapKeyboardButton(btnid, key, imgid) {
    var button_el = document.getElementById(btnid);
    var image_el = document.getElementById(imgid);
    button_el.addEventListener("mousedown", function() { emu.setKey(key, 1); image_el.style.display = "block"; });
    button_el.addEventListener("touchstart", function() { emu.setKey(key, 1); image_el.style.display = "block"; });
    button_el.addEventListener("mouseup", function() { emu.setKey(key, 0); image_el.style.display = "none"; });
    button_el.addEventListener("touchend", function() { emu.setKey(key, 0); image_el.style.display = "none"; });
    button_el.addEventListener("touchleave", function() { emu.setKey(key, 0); image_el.style.display = "none"; });
    button_el.addEventListener("touchcancel", function() { emu.setKey(key, 0); image_el.style.display = "none"; });
  }
  adjustBar.onmousedown = function(event) {
    if (!loadingMemory) { return; }
    let limitLeft = adjustBar.getBoundingClientRect().left;
    let limitRight = adjustBar.getBoundingClientRect().right;
    let shiftY = event.clientY - adjustBar.getBoundingClientRect().top;
    adjustBar.style.position = 'absolute';
    adjustBar.style.zIndex = 1;
    document.body.append(adjustBar);
    moveAt(event.pageX, event.pageY);
    function onMouseMove(event) {
      moveAt(event.pageX, event.pageY);
    }
    adjustBar.onmouseup = function() {
      addMoveEvent = false;
      $("#adjustbar").removeClass('clicked');
      document.removeEventListener('mousemove', onMouseMove);
      adjustBar.onmouseup = null;
    };
    var addMoveEvent = false;
    function moveAt(pageX, pageY) {
      var tempDivideTop = pageY - shiftY;
      if ((windowHeight - minKeyboardHeight) < tempDivideTop) {
        if (keysStyle == 1) {
          keysStyle = 2;
        } else {
          keysStyle = 1;
        }
        adjustComponentsSize();
      }
      if (minSkinHeight > tempDivideTop) {
        if (displayStyle == 1) {
          displayStyle = 2;
        } else {
          displayStyle = 1;
        }
        adjustComponentsSize();
      }
      if ( (minSkinHeight <= tempDivideTop) && ((windowHeight - minKeyboardHeight) >= tempDivideTop) &&
        (pageX >= limitLeft) && (pageX <= limitRight) ) {
        divideTopRatio = tempDivideTop / windowHeight;
        if (!$("#adjustbar").hasClass('clicked')) {
          $("#adjustbar").addClass('clicked');
        }
        adjustComponentsSize();
        if (!addMoveEvent) {
          addMoveEvent = true;
          document.addEventListener('mousemove', onMouseMove);
        }
      } else {
        addMoveEvent = false;
        $("#adjustbar").removeClass('clicked');
        document.removeEventListener('mousemove', onMouseMove);
      }
    }
  };
  adjustBar.ondragstart = function() {
    if (!loadingMemory) { return; }
    return false;
  };
  function onTouchMove(event) {
    if (!loadingMemory) { return; }
    var touchLocation = event.targetTouches[0];
    var tempDivideTop = touchLocation.pageY;
    if ((windowHeight - minKeyboardHeight) < tempDivideTop) {
      if (windowWidth >= 768) {
        if (keysStyle == 1) {
          keysStyle = 2;
        } else {
          keysStyle = 1;
        }
      }
      adjustComponentsSize();
    }
    if (minSkinHeight > tempDivideTop) {
      if (displayStyle == 1) {
        displayStyle = 2;
      } else {
        displayStyle = 1;
      }
      adjustComponentsSize();
    }
    if ((minSkinHeight <= tempDivideTop) && ((windowHeight - minKeyboardHeight) >= tempDivideTop)) {
      divideTopRatio = tempDivideTop / windowHeight;
      adjustComponentsSize();
    }
  }
  document.addEventListener('touchmove', onTouchMove);
});
