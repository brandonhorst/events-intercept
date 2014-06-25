var chai = require('chai'),
	expect = chai.expect,
	eventsIntercept = require('../lib/events-intercept'),
	events = require('events');

chai.use(require('chai-spies'));
chai.config.includeStack = true

describe('event-intercept', function() {
	it('intercepts an event with a single interceptor', function(done) {
		var emitter = new eventsIntercept.EventEmitter(),
			handler,
			interceptor;

		handler = function(arg) {
			expect(interceptor).to.have.been.called.once;
			expect(arg).to.equal('newValue');
			done();
		}

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
			interceptor2;

		handler = function(arg) {
			expect(interceptor1).to.have.been.called.once;
			expect(interceptor2).to.have.been.called.once;
			expect(arg).to.equal('finalValue');
			done();
		}
		
		interceptor1 = chai.spy(function(arg, done) {
			expect(arg).to.equal('value');
			done(null, 'secondValue', 'anotherValue');
		});

		interceptor2 = chai.spy(function(arg, arg2, done) {
			expect(arg).to.equal('secondValue');
			expect(arg2).to.equal('anotherValue');
			done(null, 'finalValue');
		});


		emitter
		.on('test', handler)
		.intercept('test', interceptor1)
		.intercept('test', interceptor2)
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
		}

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
});
