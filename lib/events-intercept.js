var util = require('util'),
	events = require('events'),
	async = require('async'),
	_ = require('lodash');


//This code is heavily based upon the node events class
intercept = function(type, interceptor) {
	if (!_.isFunction(interceptor)) {
		throw TypeError('interceptor must be a function');
	}
	if (!this._interceptors) {
		this._interceptors = {};
	}
	if (this._events.newInterceptor) {
		this.emit('newInterceptor', type, util.isFunction(interceptor.interceptor) ? interceptor.interceptor : interceptor);
	}

	if (!this._interceptors[type]) {
			// Optimize the case of one interceptor. Don't need the extra array object.
		this._interceptors[type] = interceptor;
	} else if (_.isArray(this._interceptors[type])) {
			// If we've already got an array, just append.
		this._interceptors[type].push(interceptor);
	} else {
		// Adding the second element, need to change to array.
		this._interceptors[type] = [this._interceptors[type], interceptor];
	}

	//Don't bother implementing maxInterceptors, at least not yet

	return this;
};

emitFactory = function(superCall) {
	return function(type) {
		var callback,
			_this = this;

		if (!_this._interceptors) {
			_this._interceptors = {};
		}

		interceptor = _this._interceptors[type];

		finalCallback = function(err) {
			if (err) {
				_this.emit('error', err);
			} else {
				superCall.apply(_this, _.chain(arguments).rest().unshift(type).value());
			}
		}

		if (_.isUndefined(interceptor) || _.isNull(interceptor)) {

			//Just pass through
			superCall.apply(_this, arguments);

		} else if (_.isFunction(interceptor)) {

			//Call the only interceptor, and give it the finalCallback
			var trueArgs = _.chain(arguments).rest().push(finalCallback).value();
			interceptor.apply(_this, trueArgs);

		} else if (_.isArray(interceptor)) {

			//Add a fake interceptor to call the first real interceptor with arguments
			//This way waterfall will pass the arguments
			var trueArgs = _.chain(arguments).rest().unshift(null).value();
			var trueHandlers = _.chain(interceptor).unshift(function(done) {
				done.apply(_this, trueArgs);
			}).value();

			async.waterfall(trueHandlers, finalCallback);
		}

	};

}


function EventEmitter() {
	events.EventEmitter.call(this);
}

util.inherits(EventEmitter, events.EventEmitter);

EventEmitter.prototype.intercept = intercept;
EventEmitter.prototype.emit = emitFactory(EventEmitter.super_.prototype.emit);


monkeyPatch = function(emitter) {
	oldEmitter = emitter.emit;
	emitter.emit = emitFactory(oldEmitter);
	emitter.intercept = intercept;
}

exports.EventEmitter = EventEmitter;
exports.patch = monkeyPatch;