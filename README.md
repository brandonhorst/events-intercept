#`event-intercept`

The node [EventEmitter](http://nodejs.org/api/events.html) is very powerful. However, at times it could be valuable to intercept events before they reach their handlers, to modify the data, or emit other events. That's a job for `event-intercept`.

##Status

[![Build Status](https://travis-ci.org/brandonhorst/events-intercept.svg?branch=master)](https://travis-ci.org/brandonhorst/events-intercept)
[![Coverage Status](https://coveralls.io/repos/brandonhorst/events-intercept/badge.png?branch=master)](https://coveralls.io/r/brandonhorst/events-intercept?branch=master)

##Standalone Usage

The module contains a constructor, `EventEmitter`, which inherits from the standard node `events.EventEmitter`.

	var eventsIntercept = require('events-intercept');
	var emitter = new eventsIntercept.EventEmitter();

In our application, we have an object that will emit a `data` event, and pass it a single argument.

	emitter.emit('data', 'myData')

It is very easy to listen for this event and handle it

	emitter.on('data', function(arg) {
		console.log(arg); 
	}); //logs 'myData'

However, we want to intercept that event and modify the data. We can do that by setting an `interceptor` with `intercept(event, interceptor)`. It is passed all arguments that would be passed to the emitter, as well as a standard node callback. In this case, let's just add a prefix on to the data.

	emitter.intercept('data', function(arg, done) {
		done(null, 'intercepted ' + arg);
	});

This code will be executed before the handler, and the new argument will be passed on to the handler appropriately.

	emitter.emit('data', 'some other data');
	//logs 'intercepted some other data'

If multiple interceptors are added to a single event, they will be called in the order that they are added, like [async.waterfall](https://github.com/caolan/async#waterfall).

Here's that sample code all together. Of course, `intercept` supports proper function chaining.

	var eventsIntercept = require('events-intercept');
	var emitter = new eventsIntercept.EventEmitter();

	emitter
	.on('data', function(arg) {
		console.log(arg); 
	}).intercept('data', function(arg, done) {
		done(null, 'intercepted ' + arg);
	}).emit('data', 'myData');
	//logs 'intercepted myData'

Please see `test/intercept.js` for more complete samples.

##Calling Separate Events

There may be times when you want to intercept one event and call another. Luckily, all `intercept` handlers are called with the `EventEmitter` as the `this` context, so you can `emit` events yourself.

	emitter.intercept('data', function(done) {
		this
		.emit('otherData')
		.emit('thirdData');
		done(null);
	});
	//emits 'data', 'otherData', and 'thirdData'

Remember, `emit`ting an event that you are `intercept`ing will cause a loop, so be careful.

In fact, an `intercept`or do not need to call the callback at all, which means that the event that was `intercept`ed will never be called at all.

	
	emitter.intercept('data', function(done) {
		this
		.emit('otherData')
		.emit('thirdData');
	});
	//emits 'otherData' and 'thirdData' but not 'data'

##Patching

Of course, many EventEmitters that you have the pleasure of using will not have the foresight to use `event-intercept`. Thankfully, Javascript is awesome, it's possible to monkey patch the interception capabilities onto an existing object. Just call

	var events = require('events');
	var eventsIntercept = require('events-intercept');

	var emitter = new events.EventEmitter();

	eventsIntercept.patch(emitter)

	emitter
	.on('data', function(arg) {
		console.log(arg); 
	}).intercept('data', function(arg, done) {
		done(null, 'intercepted ' + arg);
	}) .emit('data', 'myData');
	//logs 'intercepted myData'

Now, you should be able to call `intercept` on the standard `EventEmitter`.

This is also shown in `test/intercept.js`.

##Development

Things that should still be added:

* The ability to list all interceptors for a specific event (`interceptors`)
* The ability to remove interceptors (`removeInterceptor`)
	- This should emit `removeInterceptor`
* Warn on `intercept` at a specific number of interceptors (10)
	- This should be set by `setMaxInterceptors`
* Performance optimization (some fancy magic with `arguments` to avoid significant penalties in the most common cases)
* Removal of `async` dependency (I'm find with keeping `lodash`)

If you want to fix any of these things, go ahead and submit a [pull request](https://github.com/brandonhorst/events-intercept). If you find bugs or have questions, please open [Github](https://github.com/brandonhorst/events-intercept) issues. Find me on twitter at [@brandonhorst](https://twitter.com/brandonhorst).