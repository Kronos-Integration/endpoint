/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  kti = require('kronos-test-interceptor'),
  endpoint = require('../endpoint'),
  Interceptor = require('kronos-interceptor').Interceptor;

/* simple owner with name */
function nameIt(name) {
  return {
    toString() {
        return name;
      },
      get name() {
        return name;
      },
      endpointIdentifier(e) {
        if (name === undefined) return undefined;
        return `${this.name}/${e.name}`;
      }
  };
}

/*
 * send receive request and check if we whent though some interceptors
 */
function testReceive(name, ep, value, hops, cb) {
  describe(name, () => {
    it(`interceptors ${hops ? hops : 'none'} passed`, done => {
      ep.receive({
        value: value
      }).then(response => {
        const exp = {
          value: value
        };
        if (hops) {
          exp.hops = hops;
        }
        assert.deepEqual(response, exp);

        if (cb) {
          cb(done);
        } else {
          done();
        }
      }).catch(done);
    });
  });
}

describe('endpoint', () => {
  describe('base Endpoint', () => {
    const e = new endpoint.Endpoint('e', nameIt('o1'));
    it('no direction', () => assert.isUndefined(e.direction));
    it('toString', () => assert.equal(e.toString(), 'o1/e'));
    it('identifier', () => assert.equal(e.identifier, 'o1/e'));
    it('isOpen', () => assert.isFalse(e.isOpen));
  });

  describe('defaultEndpoint', () => {
    describe('send', () => {
      const se = new endpoint.SendEndpointDefault('se', nameIt('o1'));
      it('isDefault', () => assert.isTrue(se.isDefault));
      it('direction out', () => assert.equal(se.direction, 'out'));
      it('isOpen', () => assert.isFalse(se.isOpen));
    });
    describe('receive', () => {
      const re = new endpoint.ReceiveEndpointDefault('re', nameIt('o1'));
      it('isDefault', () => assert.isTrue(re.isDefault));
      it('direction in', () => assert.equal(re.direction, 'in'));
      it('isOpen', () => assert.isFalse(re.isOpen));
    });
  });

  describe('connecting', () => {
    describe('initial SendEndpoint', () => {
      const se = new endpoint.SendEndpoint('se', nameIt('o1'));
      it('not isDefault', () => assert.isFalse(se.isDefault));
      it('no opposite', () => assert.isUndefined(se.opposite));
      it('not isConnected', () => assert.isFalse(se.isConnected));
      it('json', () => assert.deepEqual(se.toJSON(), {
        out: true
      }));
    });

    describe('with hasBeen...', () => {
      let hasBeenConnected, hasBeenDisConnected, oldConnection;
      const se = new endpoint.SendEndpoint('se', nameIt('o1'), {
        hasBeenConnected() {
            hasBeenConnected = true;
          },
          hasBeenDisConnected(endpoint) {
            oldConnection = endpoint;
            hasBeenDisConnected = true;
          }
      });

      const re = new endpoint.ReceiveEndpoint('re', nameIt('o2'));

      describe('connect', () => {
        se.connected = re;
        it('hasBeenConnected was called', () => assert.isTrue(hasBeenConnected));
        it('se not isOpen', () => assert.isFalse(se.isOpen));
        it('re not isOpen', () => assert.isFalse(re.isOpen));
        //it('hasBeenDisConnected was not already called', () => assert.isUndefined(hasBeenDisConnected));
      });

      describe('disconnect', () => {
        se.connected = undefined;
        it('hasBeenDisConnected was called', () => assert.isTrue(hasBeenDisConnected));
        it('with old connection', () => assert.equal(oldConnection, re));

        it('se not isOpen', () => assert.isFalse(se.isOpen));
        it('re not isOpen', () => assert.isFalse(re.isOpen));
      });
    });

    describe('interceptors send', () => {
      describe('initial', () => {
        const se = new endpoint.SendEndpoint('se', nameIt('o1'));
        it('not isConnected', () => assert.isFalse(se.isConnected));
        it('empty interceptors', () => assert.deepEqual(se.interceptors, []));
        it('no firstInterceptor', () => assert.isUndefined(se.firstInterceptor));
        it('no lastInterceptor', () => assert.isUndefined(se.lastInterceptor));
      });

      describe('set/get array', () => {
        const ep1 = new endpoint.SendEndpoint('ep1', nameIt('o1'));
        const ep2 = new endpoint.ReceiveEndpoint('ep2', nameIt('o2'));

        ep2.receive = kti.testResponseHandler;

        ep1.connected = ep2;

        describe('passes though', () => {
          it('isConnected', () => assert.isTrue(ep1.isConnected));
          it('otherEnd', () => assert.equal(ep1.otherEnd, ep2));

          it('without interceptor', done => {
            ep1.receive({
              value: 1
            }).then(response => {
              assert.equal(response.value, 1);
              done();
            }).catch(done);
          });
        });

        const ic1 = new kti.TestInterceptor({
          name: 'ic1'
        }, ep1);
        const ic2 = new kti.TestInterceptor({
          name: 'ic2'
        }, ep1);

        ep1.interceptors = [ic1, ic2];

        describe('connected chain', () => {
          it('ep1->ic1', () => assert.equal(ep1.connected, ic1));
          it('ic1->ic2', () => assert.equal(ic1.connected, ic2));
          it('ic1->ep2', () => assert.equal(ic2.connected, ep2));
        });

        it('is firstInterceptor', () => assert.equal(ic1, ep1.firstInterceptor));
        it('is lastInterceptor', () => assert.equal(ic2, ep1.lastInterceptor));

        describe('json with interceptor', () => {
          it('toJSON', () => assert.deepEqual(ep1.toJSON(), {
            out: true,
            target: 'o2/ep2',
            interceptors: [{
              type: 'test-interceptor'
            }, {
              type: 'test-interceptor'
            }]
          }));
        });

        testReceive('passes with interceptor', ep1, 2, ['ic1', 'ic2']);

        const itcs = ep1.interceptors;
        it('is array', () => assert.isArray(itcs));
        it('one interceptor', () => assert.equal(itcs[0], ic1));

        describe('can be removed again', () => {
          const ep1 = new endpoint.SendEndpoint('ep1', nameIt('o1'));
          const ep2 = new endpoint.ReceiveEndpoint('ep2', nameIt('o1'));

          ep1.connected = ep2;
          const ic1 = new kti.TestInterceptor({
            name: 'ic1'
          }, ep1);
          ep1.interceptors = [ic1];

          ep1.interceptors = [];
          it('empty interceptors', () => assert.deepEqual(ep1.interceptors, []));
          it('no firstInterceptor', () => assert.isUndefined(ep1.firstInterceptor));
          it('no lastInterceptor', () => assert.isUndefined(ep1.lastInterceptor));

          describe('connected chain', () => {
            it('ep1->ic1', () => assert.equal(ep1.connected, ep2));
          });
        });
      });
    });

    describe('interceptors on the receive side', function () {
      const se = new endpoint.SendEndpoint('se', nameIt('st'));
      const re = new endpoint.ReceiveEndpoint('re', nameIt('rt'));

      se.connected = re;
      re.receive = kti.testResponseHandler;

      testReceive('passes without', se, 3, undefined, done => {
        const ic1 = new kti.TestInterceptor({
          name: 'ic1'
        }, re);
        const ic2 = new kti.TestInterceptor({
          name: 'ic2'
        }, re);

        re.interceptors = [ic1, ic2];

        testReceive('receiving endpoint', se, 4, ['ic1', 'ic2'], done => {
          const ic3 = new kti.TestInterceptor({
            name: 'ic3'
          }, re);

          // ep2.receive now at the internalEndpoint
          re.receive = kti.testResponseHandler;
          re.interceptors = [ic3];

          testReceive('receiving endpoint internal endpoint', se, 5, ['ic3'], done => {
            re.interceptors = undefined;
            testReceive('receiving endpoint removed interceptos', se, 6, undefined, done => {
              done();
            });
            done();
          });
          done();
        });
        done();
      });
    });

    describe('connecting Receiver conveniance', () => {
      const se = new endpoint.SendEndpoint('se', nameIt('ss'));
      const re = new endpoint.ReceiveEndpoint('re', nameIt('rs'));

      re.connected = se;
      it('isConnected', () => assert.isTrue(se.isConnected));
      it('has otherEnd', () => assert.equal(se.otherEnd, re));
    });

    describe('connecting', () => {
      const se = new endpoint.SendEndpoint('se', nameIt('ss'));
      const re = new endpoint.ReceiveEndpoint('re', nameIt('rs'));

      se.connected = re;
      it('isConnected', () => assert.isTrue(se.isConnected));
      it('has otherEnd', () => assert.equal(se.otherEnd, re));
      it('receiver sender', () => assert.equal(re.sender, se));

      describe('with interceptor', () => {
        const in1 = new Interceptor(undefined, se);
        se.injectNext(in1);

        it('still isConnected', () => assert.isTrue(se.isConnected));
        it('interceptor also isConnected', () => assert.isTrue(in1.isConnected));
        it('has otherEnd', () => assert.equal(se.otherEnd, re));

        describe('remove', () => {
          se.removeNext();
          it('connected', () => assert.equal(se.connected, re));
        });
      });
    });

    describe('with opposite', () => {
      const ss = nameIt('ss'),
        rs = nameIt('rs');

      let hasBeenOpened, willBeClosed;
      let se, re;

      //beforeEach(function () {
      se = new endpoint.SendEndpoint('se', ss, {
        createOpposite: true,
        hasBeenOpened() {
          hasBeenOpened = true;
        },
        willBeClosed() {
          willBeClosed = true;
        }
      });
      re = new endpoint.ReceiveEndpoint('re', rs, {
        createOpposite: true
      });

      se.connected = re;
      //  });


      it('sender opposite', () => assert.isTrue(se.opposite.isIn));
      it('sender opposite opposite', () => assert.equal(se.opposite.opposite, se));

      it('receiver opposite', () => assert.isTrue(re.opposite.isOut));
      it('receiver opposite opposite', () => assert.equal(re.opposite.opposite, re));

      it('receiver sender', () => assert.equal(re.sender, se));
      it('sender opposite sender', () => assert.equal(se.opposite.sender, re.opposite));

      describe('open / close with receive', () => {
        describe('after open', () => {
          re.receive = request => {};
          it('hasBeenOpened was called', () => assert.isTrue(hasBeenOpened));
          it('se isOpen', () => assert.isTrue(se.isOpen));
          it('re isOpen', () => assert.isTrue(re.isOpen));
        });

        describe('after close', () => {
          re.receive = undefined;
          it('willBeClosed was called', () => assert.isTrue(willBeClosed));
          it('se not isOpen', () => assert.isFalse(se.isOpen));
          it('re not isOpen', () => assert.isFalse(re.isOpen));
        });
      });

      /*
            describe('open / close with connected', () => {
              re.receive = request => {};
              se.connected = undefined;

              hasBeenOpened = false;
              willBeClosed = false;

              se.connected = re;

              it('hasBeenOpened', () => assert.isTrue(hasBeenOpened));
              se.connected = undefined;

              it('willBeClosed', () => assert.isTrue(willBeClosed));
            });
            */
    });
  });
});
