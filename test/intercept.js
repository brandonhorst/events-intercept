var chai = require('chai'),
	expect = chai.expect,
	eventsIntercept = require('../lib/events-intercept'),
	events = require('events');

chai.use(require('chai-spies'));
chai.config.includeStack = true;

describe('event-intercept', function() {
	it('intercepts an event with a single interceptor', function(done) {
		var emitter = new eventsIntercept.EventEmitter(),
			handler,
			interceptor;

		handler = function(arg) {
			expect(interceptor).to.have.been.called.once;
			expect(arg).to.equal('newValue');
			done();
		};

		interceptor = chai.spy(function(arg, done) {
			expect(arg).to.equal('value');
			done(null, 'newValue');
		});


		emitter
		.on('test', handler)
		.intercept('test', interceptor)
		.emit('test', 'value');
	});

	it('intercepts an event with a multiple interceptors', function(done) {
		var emitter = new eventsIntercept.EventEmitter(),
			handler,
			interceptor1,
			interceptor2,
			interceptor3;

		handler = function(arg) {
			expect(interceptor1).to.have.been.called.once;
			expect(interceptor2).to.have.been.called.once;
			expect(interceptor3).to.have.been.called.once;
			expect(arg).to.equal('finalValue');
			done();
		};
		
		interceptor1 = chai.spy(function(arg, done) {
			expect(arg).to.equal('value');
			done(null, 'secondValue', 'anotherValue');
		});

		interceptor2 = chai.spy(function(arg, arg2, done) {
			expect(arg).to.equal('secondValue');
			expect(arg2).to.equal('anotherValue');
			done(null, 'thirdValue');
		});

		interceptor3 = chai.spy(function(arg, done) {
			expect(arg).to.equal('thirdValue');
			done(null, 'finalValue');
		});


		emitter
		.on('test', handler)
		.intercept('test', interceptor1)
		.intercept('test', interceptor2)
		.intercept('test', interceptor3)
		.emit('test', 'value');
	});

	it('triggers an error when an interceptor passes one', function(done) {
		var emitter = new eventsIntercept.EventEmitter(),
			handler = chai.spy(),
			interceptor,
			errorHandler;

		interceptor = chai.spy(function(arg, done) {
			expect(arg).to.equal('value')
			done(new Error('test error'));
		});

		errorHandler = function(err) {
			expect(interceptor).to.have.been.called.once;
			expect(handler).to.not.have.been.called;
			expect(err.message).to.equal('test error');
			done();
		};


		emitter
		.on('test', handler)
		.intercept('test', interceptor)
		.on('error', errorHandler)
		.emit('test', 'value');
	});

	it('allows interceptors to trigger other events', function(done) {
		var emitter = new eventsIntercept.EventEmitter(),
			handler = chai.spy(),
			interceptor,
			errorHandler;

		interceptor = chai.spy(function(arg, done) {
			expect(arg).to.equal('value')
			this.emit('newTest', 'newValue')
		});

		newHandler = (function(arg) {
			expect(arg).to.equal('newValue');
			expect(interceptor).to.have.been.called.once;
			expect(handler).to.not.have.been.called;
			done();
		});



		emitter
		.on('test', handler)
		.on('newTest', newHandler)
		.intercept('test', interceptor)
		.emit('test', 'value');
	});

	it('can monkey patch standard EventEmitters', function(done) {
		var emitter = new events.EventEmitter(),
			handler,
			interceptor;

		handler = function(arg) {
			expect(interceptor).to.have.been.called.once;
			expect(arg).to.equal('newValue');
			done();
		};

		interceptor = chai.spy(function(arg, done) {
			expect(arg).to.equal('value');
			done(null, 'newValue');
		});

		eventsIntercept.patch(emitter);
		
		emitter
		.on('test', handler)
		.intercept('test', interceptor)
		.emit('test', 'value');
	});

	it('behaves as before for events without interceptors', function(done) {
		var emitter = new eventsIntercept.EventEmitter(),
			handler;

		handler = function(arg) {
			expect(arg).to.equal('value');
			done();
		};
		
		emitter
		.on('test', handler)
		.emit('test', 'value');
	});

	it('throws for interceptors that are not functions', function() {
		var emitter = new eventsIntercept.EventEmitter(),
			interceptCall;

		interceptCall = function() {
			emitter.intercept('test', 'not a function');
		};

		expect(interceptCall).to.throw(Error);
	});

	it('emits newInterceptor for new interceptors', function(done) {
		var emitter = new eventsIntercept.EventEmitter(),
			interceptor = chai.spy(),
			newInterceptorCall;

		newInterceptorCall = function(event, interceptor) {
			expect(event).to.equal('test');
			expect(interceptor).to.equal(interceptor);
			expect(interceptor).to.not.have.been.called;
			done()
		}

		emitter
		.on('newInterceptor', newInterceptorCall)
		.intercept('test', interceptor);

	});
});
