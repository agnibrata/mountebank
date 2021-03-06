'use strict';

var assert = require('assert'),
    api = require('../api'),
    BaseHttpClient = require('./baseHttpClient'),
    promiseIt = require('../../testHelpers').promiseIt,
    port = api.port + 1,
    timeout = parseInt(process.env.MB_SLOW_TEST_TIMEOUT || 4000);

['http', 'https'].forEach(function (protocol) {
    var client = BaseHttpClient.create(protocol);

    describe(protocol + ' imposter', function () {
        this.timeout(timeout);

        describe('POST /imposters with injections', function () {
            promiseIt('should allow javascript predicate for matching', function () {
                // note the lower-case keys for headers!!!
                var fn = function (request) { return request.path === '/test'; },
                    stub = {
                        predicates: [{ inject: fn.toString() }],
                        responses: [{ is: { body: 'MATCHED' } }]
                    },
                    request = { protocol: protocol, port: port, stubs: [stub], name: this.name };

                return api.post('/imposters', request).then(function (response) {
                    assert.strictEqual(response.statusCode, 201, JSON.stringify(response.body));

                    var spec = {
                        path: '/test?key=value',
                        port: port,
                        method: 'POST',
                        headers: {
                            'X-Test': 'test header',
                            'Content-Type': 'text/plain'
                        },
                        body: 'BODY'
                    };
                    return client.responseFor(spec);
                }).then(function (response) {
                    assert.strictEqual(response.body, 'MATCHED');
                }).finally(function () {
                    return api.del('/imposters');
                });
            });

            promiseIt('should not validate a bad predicate injection', function () {
                var stub = {
                        predicates: [{ inject: 'return true;' }],
                        responses: [{ is: { body: 'MATCHED' } }]
                    },
                    request = { protocol: protocol, port: port, stubs: [stub], name: this.name };

                return api.post('/imposters', request).then(function (response) {
                    assert.strictEqual(response.statusCode, 201, JSON.stringify(response.body));
                }).finally(function () {
                    return api.del('/imposters');
                });
            });

            promiseIt('should allow synchronous javascript injection for responses', function () {
                var fn = function (request) { return { body: request.method + ' INJECTED' }; },
                    stub = { responses: [{ inject: fn.toString() }] },
                    request = { protocol: protocol, port: port, stubs: [stub], name: this.name };

                return api.post('/imposters', request).then(function () {
                    return client.get('/', port);
                }).then(function (response) {
                    assert.strictEqual(response.body, 'GET INJECTED');
                    assert.strictEqual(response.statusCode, 200);
                    assert.strictEqual(response.headers.connection, 'close');
                }).finally(function () {
                    return api.del('/imposters');
                });
            });

            promiseIt('should not validate a bad response injection', function () {
                var fn = function () { throw new Error('BOOM'); },
                    stub = { responses: [{ inject: fn.toString() }] },
                    request = { protocol: protocol, port: port, stubs: [stub], name: this.name };

                return api.post('/imposters', request).then(function (response) {
                    assert.strictEqual(response.statusCode, 201, JSON.stringify(response.body));
                }).finally(function () {
                    return api.del('/imposters');
                });
            });

            promiseIt('should allow javascript injection to keep state between requests', function () {
                var fn = function (request, state) {
                        if (!state.calls) { state.calls = 0; }
                        state.calls += 1;
                        return { body: state.calls.toString() };
                    },
                    stub = { responses: [{ inject: fn.toString() }] },
                    request = { protocol: protocol, port: port, stubs: [stub], name: this.name };

                return api.post('/imposters', request).then(function (response) {
                    assert.strictEqual(response.statusCode, 201, JSON.stringify(response.body));

                    return client.get('/', port);
                }).then(function (response) {
                    assert.strictEqual(response.body, '1');

                    return client.get('/', port);
                }).then(function (response) {
                    assert.deepEqual(response.body, '2');
                }).finally(function () {
                    return api.del('/imposters');
                });
            });

            promiseIt('should allow access to the global process object', function () {
                // https://github.com/bbyars/mountebank/issues/134
                var fn = function () {
                        return { body: process.env.USER || 'test' };
                    },
                    stub = { responses: [{ inject: fn.toString() }] },
                    request = { protocol: protocol, port: port, stubs: [stub], name: this.name };

                return api.post('/imposters', request).then(function (response) {
                    assert.strictEqual(response.statusCode, 201, JSON.stringify(response.body));
                    return client.get('/', port);
                }).then(function (response) {
                    assert.strictEqual(response.body, process.env.USER || 'test');
                }).finally(function () {
                    return api.del('/imposters');
                });
            });

            if (process.env.MB_AIRPLANE_MODE !== 'true') {
                promiseIt('should allow asynchronous injection', function () {
                    var fn = function (request, state, logger, callback) {
                            var http = require('http'),
                                options = {
                                    method: request.method,
                                    hostname: 'www.google.com',
                                    port: 80,
                                    path: request.path,
                                    headers: request.headers
                                },
                                httpRequest;

                            options.headers.host = options.hostname;
                            httpRequest = http.request(options, function (response) {
                                response.body = '';
                                response.setEncoding('utf8');
                                response.on('data', function (chunk) {
                                    response.body += chunk;
                                });
                                response.on('end', function () {
                                    callback({
                                        statusCode: response.statusCode,
                                        headers: response.headers,
                                        body: response.body
                                    });
                                });
                            });
                            httpRequest.end();
                            // No return value!!!
                        },
                        stub = { responses: [{ inject: fn.toString() }] },
                        request = { protocol: protocol, port: port, stubs: [stub], name: this.name };

                    return api.post('/imposters', request).then(function (response) {
                        assert.strictEqual(response.statusCode, 201, JSON.stringify(response.body));

                        return client.get('/', port);
                    }).then(function (response) {
                        // sometimes 301, sometimes 302
                        // 200 on new Mac with El Capitan?
                        assert.ok(response.statusCode <= 302, response.statusCode);
                        if (response.statusCode === 200) {
                            assert.ok(response.body.indexOf('google') >= 0, response.body);
                        }
                        else {
                            // google.com.br in Brasil, google.ca in Canada, etc
                            assert.ok(response.headers.location.indexOf('google.') >= 0, response.headers.location);
                        }
                    }).finally(function () {
                        return api.del('/imposters');
                    });
                });
            }
        });
    });
});
