import test from "ava";

import {
  Endpoint,
  SendEndpoint,
  SendEndpointDefault,
  ReceiveEndpoint,
  ReceiveEndpointDefault
} from "../src/endpoint.mjs";
import { Interceptor } from "@kronos-integration/interceptor";

//import { testResponseHandler } from "kronos-test-interceptor";

const testResponseHandler = {
  async receive(request, oldRequest) {
  }
};

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
      return `${this.name}.${e.name}`;
    }
  };
}

test("Endpoint constructor", t => {
  const e = new Endpoint("e", nameIt("o1"));
  t.is(e.direction, undefined);
  t.is(e.toString(), "o1.e(connected=false,open=false)");
  t.is(e.identifier, "o1.e");
  t.is(e.isOpen, false);
});

test("SendEndpointDefault constructor", t => {
  const e = new SendEndpointDefault("se", nameIt("o1"));
  t.is(e.isDefault, true);
  t.is(e.direction, "out");
  t.is(e.isOpen, false);
  t.is(e.toString(), "o1.se(connected=false,open=false)");
});

test("ReceiveEndpointDefault constructor", t => {
  const e = new ReceiveEndpointDefault("se", nameIt("o1"));
  t.is(e.isDefault, true);
  t.is(e.direction, "in");
  t.is(e.isOpen, false);
  t.is(e.toString(), "o1.se(connected=false,open=false)");
});

test("SendEndpoint connect", t => {
  const e = new SendEndpoint("se", nameIt("o1"));
  t.is(e.isDefault, false);
  t.is(e.opposite, undefined);
  t.is(e.isConnected, false);
  t.deepEqual(e.toJSON(), {
    out: true
  });
});

test("SendEndpoint connecting with hasBeen...", t => {
  let hasBeenConnected, hasBeenDisConnected, oldConnection;
  const se = new SendEndpoint("se", nameIt("o1"), {
    hasBeenConnected() {
      hasBeenConnected = true;
    },
    hasBeenDisConnected(endpoint) {
      oldConnection = endpoint;
      hasBeenDisConnected = true;
    }
  });

  const re = new ReceiveEndpoint("re", nameIt("o2"));

  se.connected = re;

  t.is(hasBeenConnected, true);
  t.is(se.isOpen, false);
  t.is(re.isOpen, false);
  //it('hasBeenDisConnected was not already called', () => assert.isUndefined(hasBeenDisConnected));

  se.connected = undefined;

  t.is(hasBeenDisConnected, true);
  t.is(oldConnection, re);
  t.is(se.isOpen, false);
  t.is(re.isOpen, false);
});

test("SendEndpoint initial", t => {
  const se = new SendEndpoint("se", nameIt("o1"));

  t.is(se.isConnected, false);
  t.deepEqual(se.interceptors, []);
  t.is(se.firstInterceptor, undefined);
  t.is(se.lastInterceptor, undefined);
});

test("connecting Receiver conveniance otherEnd", t => {
  const se = new SendEndpoint("se", nameIt("ss"));
  const re = new ReceiveEndpoint("re", nameIt("rs"));

  re.connected = se;
  t.is(se.isConnected, true);
  t.is(se.otherEnd, re);
});

test("connecting with interceptor", t => {
  const se = new SendEndpoint("se", nameIt("ss"));
  const re = new ReceiveEndpoint("re", nameIt("rs"));

  se.connected = re;
  t.is(se.isConnected, true);
  t.is(se.otherEnd, re);
  t.is(re.sender, se);

  const in1 = new Interceptor(undefined, se);
  se.injectNext(in1);

  t.is(se.isConnected, true);
  t.is(in1.isConnected, true);
  t.is(se.otherEnd, re);

  se.removeNext();
  t.is(se.connected, re);
});

test("interceptor send", async t => {
  const ep1 = new SendEndpoint("ep1", nameIt("o1"));
  const ep2 = new ReceiveEndpoint("ep2", nameIt("o2"));

  ep2.receive = testResponseHandler;
  ep1.connected = ep2;

  t.is(ep1.isConnected, true);
  t.is(ep1.otherEnd, ep2);

  const response = await ep1.receive({
    value: 1
  });

  t.is(response.value, 1);
});

/*
 * send receive request and check if we whent though some interceptors

function testReceive(name, ep, value, hops, cb) {
  describe(name, () => {
    it(`interceptors ${hops ? hops : 'none'} passed`, done => {
      ep
        .receive({
          value: value
        })
        .then(response => {
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
        })
        .catch(done);
    });
  });
}

describe('endpoint', () => {
    describe('interceptors send', () => {
      describe('set/get array', () => {
        const ep1 = new endpoint.SendEndpoint('ep1', nameIt('o1'));
        const ep2 = new endpoint.ReceiveEndpoint('ep2', nameIt('o2'));

        ep2.receive = kti.testResponseHandler;

        ep1.connected = ep2;

        describe('passes though', () => {
          it('isConnected', () => assert.isTrue(ep1.isConnected));
          it('otherEnd', () => assert.equal(ep1.otherEnd, ep2));

          it('without interceptor', done => {
            ep1
              .receive({
                value: 1
              })
              .then(response => {
                assert.equal(response.value, 1);
                done();
              })
              .catch(done);
          });
        });

        const ic1 = new kti.TestInterceptor(
          {
            name: 'ic1'
          },
          ep1
        );
        const ic2 = new kti.TestInterceptor(
          {
            name: 'ic2'
          },
          ep1
        );

        ep1.interceptors = [ic1, ic2];

        describe('connected chain', () => {
          it('ep1->ic1', () => assert.equal(ep1.connected, ic1));
          it('ic1->ic2', () => assert.equal(ic1.connected, ic2));
          it('ic1->ep2', () => assert.equal(ic2.connected, ep2));
        });

        it('is firstInterceptor', () =>
          assert.equal(ic1, ep1.firstInterceptor));
        it('is lastInterceptor', () => assert.equal(ic2, ep1.lastInterceptor));

        describe('json with interceptor', () => {
          it('toJSON', () =>
            assert.deepEqual(ep1.toJSON(), {
              out: true,
              target: 'o2/ep2',
              interceptors: [
                {
                  type: 'test-interceptor'
                },
                {
                  type: 'test-interceptor'
                }
              ]
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
          const ic1 = new kti.TestInterceptor(
            {
              name: 'ic1'
            },
            ep1
          );
          ep1.interceptors = [ic1];

          ep1.interceptors = [];
          it('empty interceptors', () =>
            assert.deepEqual(ep1.interceptors, []));
          it('no firstInterceptor', () =>
            assert.isUndefined(ep1.firstInterceptor));
          it('no lastInterceptor', () =>
            assert.isUndefined(ep1.lastInterceptor));

          describe('connected chain', () => {
            it('ep1->ic1', () => assert.equal(ep1.connected, ep2));
          });
        });
      });
    });

    describe('interceptors on the receive side', function() {
      const se = new endpoint.SendEndpoint('se', nameIt('st'));
      const re = new endpoint.ReceiveEndpoint('re', nameIt('rt'));

      se.connected = re;
      re.receive = kti.testResponseHandler;

      testReceive('passes without', se, 3, undefined, done => {
        const ic1 = new kti.TestInterceptor(
          {
            name: 'ic1'
          },
          re
        );
        const ic2 = new kti.TestInterceptor(
          {
            name: 'ic2'
          },
          re
        );

        re.interceptors = [ic1, ic2];

        testReceive('receiving endpoint', se, 4, ['ic1', 'ic2'], done => {
          const ic3 = new kti.TestInterceptor(
            {
              name: 'ic3'
            },
            re
          );

          // ep2.receive now at the internalEndpoint
          re.receive = kti.testResponseHandler;
          re.interceptors = [ic3];

          testReceive(
            'receiving endpoint internal endpoint',
            se,
            5,
            ['ic3'],
            done => {
              re.interceptors = undefined;
              testReceive(
                'receiving endpoint removed interceptos',
                se,
                6,
                undefined,
                done => {
                  done();
                }
              );
              done();
            }
          );
          done();
        });
        done();
      });
    });

    describe('with opposite', () => {
      const ss = nameIt('ss'),
        rs = nameIt('rs');

      let hasBeenOpened, willBeClosed;
      let se, re;

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

      beforeEach(function() {
        se.connected = re;
      });

      it('sender opposite', () => assert.isTrue(se.opposite.isIn));
      it('sender opposite opposite', () =>
        assert.equal(se.opposite.opposite, se));

      it('receiver opposite', () => assert.isTrue(re.opposite.isOut));
      it('receiver opposite opposite', () =>
        assert.equal(re.opposite.opposite, re));

      it('receiver sender', () => assert.equal(re.sender, se));
      it('sender opposite sender', () =>
        assert.equal(se.opposite.sender, re.opposite));

      describe('open / close with receive', () => {
        describe('after open', () => {
          before(() => (re.receive = request => {}));
          it('hasBeenOpened was called', () => assert.isTrue(hasBeenOpened));
          it('se isOpen', () => assert.isTrue(se.isOpen));
          it('re isOpen', () => assert.isTrue(re.isOpen));
        });

        describe('after close', () => {
          before(() => (re.receive = undefined));
          it('willBeClosed was called', () => assert.isTrue(willBeClosed));
          it('se not isOpen', () => assert.isFalse(se.isOpen));
          it('re not isOpen', () => assert.isFalse(re.isOpen));
        });
      });

      describe('open / close with connected', () => {
        beforeEach(() => {
          hasBeenOpened = false;
          willBeClosed = false;
          re.receive = request => {};
          se.connected = undefined;
        });

        describe('after open', () => {
          before(() => (se.connected = re));
          it('hasBeenOpened', () => assert.isTrue(hasBeenOpened));
          xit('se isOpen', () => assert.isTrue(se.isOpen));
          it('re isOpen', () => assert.isTrue(re.isOpen));
        });

        describe('after close', () => {
          before(() => (se.connected = undefined));
          it('willBeClosed', () => assert.isTrue(willBeClosed));
          it('se not isOpen', () => assert.isFalse(se.isOpen));
          xit('re not isOpen', () => assert.isFalse(re.isOpen));
        });
      });
    });
  });
});
*/
