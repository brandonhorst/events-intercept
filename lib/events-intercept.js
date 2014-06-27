/*jslint nomen: true*/
/*jslint plusplus: true */
(function () {
    'use strict';

    var util = require('util'),
        events = require('events'),
        async = require('async'),
        _ = require('lodash'),
        intercept,
        emitFactory,
        interceptors,
        removeInterceptor,
        listenersFactory,
        fakeFunction,
        fixListeners,
        setMaxInterceptors,
        removeAllInterceptors,
        EventEmitter,
        monkeyPatch;

    intercept = function (type, interceptor) {
        var m;

        if (!_.isFunction(interceptor)) {
            throw new TypeError('interceptor must be a function');
        }

        this.emit('newInterceptor', type, interceptor);

        if (!this._interceptors[type]) {
            this._interceptors[type] = [interceptor];
        } else {
            this._interceptors[type].push(interceptor);
        }

        // Check for listener leak
        if (!this._interceptors[type].warned) {
            if (!_.isUndefined(this._maxInterceptors)) {
                m = this._maxInterceptors;
            } else {
                m = EventEmitter.defaultMaxInterceptors;
            }

            if (m && m > 0 && this._interceptors[type].length > m) {
                this._interceptors[type].warned = true;
                console.error('(node) warning: possible events-intercept EventEmitter memory ' +
                    'leak detected. %d interceptors added. ' +
                    'Use emitter.setMaxInterceptors(n) to increase limit.',
                    this._interceptors[type].length);
                console.trace();
            }
        }

        return this;
    };

    emitFactory = function (superCall) {
        return function (type) {
            var completed,
                trueArgs,
                interceptor,
                next,
                _this = this;

            if (!_this._interceptors) {
                _this._interceptors = {};
            }

            interceptor = _this._interceptors[type];

            if (!interceptor) {

                //Just pass through
                superCall.apply(_this, arguments);

            } else {

                completed = 0;
                next = function (err) {
                    if (err) {
                        _this.emit('error', err);
                    } else if (completed === interceptor.length) {
                        superCall.apply(_this, _.chain(arguments).rest().unshift(type).value());
                    } else {
                        trueArgs = _.chain(arguments).rest().push(next).value();
                        completed += 1;
                        interceptor[completed - 1].apply(_this, trueArgs);
                    }
                };
                next.apply(_this, _.chain(arguments).rest().unshift(null).value());

            }
        };
    };

    interceptors = function (type) {
        var ret;

        if (!this._interceptors || !this._interceptors[type]) {
            ret = [];
        } else {
            ret = this._interceptors[type].slice();
        }

        return ret;
    };

    removeInterceptor = function (type, interceptor) {
        var list, position, length, i;

        if (!_.isFunction(interceptor)) {
            throw new TypeError('interceptor must be a function');
        }

        if (!this._interceptors || !this._interceptors[type]) {
            return this;
        }

        list = this._interceptors[type];
        length = list.length;
        position = -1;

        for (i = length - 1; i >= 0; i--) {
            if (list[i] === interceptor) {
                position = i;
                break;
            }
        }

        if (position < 0) {
            return this;
        }

        if (length === 1) {
            delete this._interceptors[type];
        } else {
            list.splice(position, 1);
        }

        this.emit('removeInterceptor', type, interceptor);

        return this;
    };

    listenersFactory = function (superCall) {
        return function (type) {
            var superListeners = superCall.call(this, type);
            if (type === 'newListener' || type === 'removeListener') {
                return _.without(superListeners, fakeFunction);
            }
            return superListeners;
        };
    };

    fakeFunction = function () {};

    fixListeners = function (emitter) {
        emitter.on('newListener', fakeFunction);
        emitter.on('removeListener', fakeFunction);
    };

    setMaxInterceptors = function (n) {
        if (!_.isNumber(n) || n < 0 || isNaN(n)) {
            throw new TypeError('n must be a positive number');
        }
        this._maxInterceptors = n;
        return this;
    };

    removeAllInterceptors = function (type) {
        var key, theseInterceptors, length, i;

        if (!this._interceptors || _.isEmpty(this._interceptors)) {
            return this;
        }

        if (arguments.length === 0) {

            for (key in this._interceptors) {
                if (this._interceptors.hasOwnProperty(key) && key !== 'removeInterceptor') {
                    this.removeAllInterceptors(key);
                }
            }
            this.removeAllInterceptors('removeInterceptor');
            this._interceptors = {};

        } else if (this._interceptors[type]) {
            theseInterceptors = this._interceptors[type];
            length = theseInterceptors.length;

            // LIFO order
            for (i = length - 1; i >= 0; i--) {
                this.removeInterceptor(type, theseInterceptors[i]);
            }

            delete this._interceptors[type];
        }

        return this;
    };

    EventEmitter = function () {
        events.EventEmitter.call(this);
        fixListeners(this);
    };

    util.inherits(EventEmitter, events.EventEmitter);

    EventEmitter.prototype.intercept = intercept;
    EventEmitter.prototype.emit = emitFactory(EventEmitter.super_.prototype.emit);
    EventEmitter.prototype.interceptors = interceptors;
    EventEmitter.prototype.removeInterceptor = removeInterceptor;
    EventEmitter.prototype.removeAllInterceptors = removeAllInterceptors;
    EventEmitter.prototype.setMaxInterceptors = setMaxInterceptors;
    EventEmitter.prototype.listeners = listenersFactory(EventEmitter.super_.prototype.listeners);
    EventEmitter.defaultMaxInterceptors = 10;


    monkeyPatch = function (emitter) {
        var oldEmit = emitter.emit,
            oldListeners = emitter.listeners;
        emitter.emit = emitFactory(oldEmit);
        emitter.intercept = intercept;
        emitter.interceptors = interceptors;
        emitter.removeInterceptor = removeInterceptor;
        emitter.removeAllInterceptors = removeAllInterceptors;
        emitter.setMaxInterceptors = setMaxInterceptors;
        emitter.listeners = listenersFactory(oldListeners);
        fixListeners(emitter);
    }

    module.exports = {
        EventEmitter: EventEmitter,
        patch: monkeyPatch
    }
})();