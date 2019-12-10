import test from "ava";
import { nameIt } from "./util.mjs";

import { SendEndpoint, ReceiveEndpoint } from "../src/endpoint.mjs";

import { Interceptor } from "@kronos-integration/interceptor";

class PlusTenInterceptor extends Interceptor {
  async receive(endpoint, next, value) {
    return next(value + 10);
  }
}

test("connecting with interceptor", async t => {
  const owner = nameIt("owner");
  let received;

  let receiveOpenedCalled = 0;
  let receiveClosedCalled = 0;

  const re = new ReceiveEndpoint("re", owner, {
    didConnect: endpoint => {
      receiveOpenedCalled++;
      return async () => {
        receiveClosedCalled++;
      };
    },
    receive: r => {
      received = r;
      return r + 1;
    }
  });

  let sendOpenedCalled = 0;
  let sendClosedCalled = 0;

  const se = new SendEndpoint("se", owner, {
    didConnect: endpoint => {
      sendOpenedCalled++;
      return async () => {
        sendClosedCalled++;
      };
    },
    connected: re
  });

  t.is(sendOpenedCalled, 1);
  t.is(receiveOpenedCalled, 1);

  t.true(se.isConnected(re));
  t.true(re.isConnected(se));

  t.is(await se.send(1), 1 + 1);
  se.interceptors = [];
  t.is(await se.send(2), 2 + 1);

  se.interceptors = [new PlusTenInterceptor()];
  t.is(await se.send(3), 3 + 10 + 1);

  t.true(se.isConnected(re));

  se.interceptors = [];

  t.true(se.isConnected(re));
  t.is(await se.send(4), 4 + 1);

  se.interceptors = [new PlusTenInterceptor(), new PlusTenInterceptor()];
  t.is(await se.send(5), 5 + 10 + 10 + 1);

  se.removeConnection(re);

  t.is(receiveOpenedCalled, 1);

  t.is(sendClosedCalled, 1);
  t.is(receiveClosedCalled, 1);

  se.addConnection(re);
  t.is(sendOpenedCalled, 2);
  t.is(receiveOpenedCalled, 2);
});

test("interceptor send", async t => {
  const ep1 = new SendEndpoint("ep1", nameIt("o1"));
  const ep2 = new ReceiveEndpoint("ep2", nameIt("o2"));

  ep2.receive = async arg => arg*arg;
  ep1.addConnection(ep2);

  t.true(ep1.isConnected(ep2));

  const response = await ep1.send(4);

  t.is(response, 16);
});


test("SendEndpoint connecting", t => {
  const se = new SendEndpoint("se", nameIt("o1"));
  const re = new ReceiveEndpoint("re", nameIt("o2"));

  t.false(se.isConnected(re));

  se.addConnection(re);

  t.true(se.isConnected(re));

  se.removeConnection(re);

  t.false(se.isConnected(re));
});

test("connect to myself", async t => {
  const e = new SendEndpoint("e", nameIt("o"));
  e.receive = async arg => arg*arg;

  e.addConnection(e);

  t.true(e.isConnected(e));

  const response = await e.send(3);

  t.is(response, 9);
});


test("connect several send to one receive", async t => {
  const s1 = new SendEndpoint("s1", nameIt("o"));
  const s2 = new SendEndpoint("s1", nameIt("o"));

  const r1 = new ReceiveEndpoint("r1", nameIt("o"));
  r1.receive = async arg => arg*arg;

  s1.addConnection(r1);
  s2.addConnection(r1);

  t.true(s1.isConnected(r1));
  t.true(s2.isConnected(r1));

  t.is(await s1.send(2), 4);
  t.is(await s2.send(2), 4);
});
