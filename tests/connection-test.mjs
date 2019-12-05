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

  t.is(se.isConnected, true);
  t.is(se.connected, re);
  t.is(re.isConnected, true);
  t.is(re.connected, se);

  t.is(await se.send(1), 1 + 1);
  se.interceptors = [];
  t.is(await se.send(2), 2 + 1);

  se.interceptors = [new PlusTenInterceptor()];
  t.is(await se.send(3), 3 + 10 + 1);

  t.is(se.isConnected, true);

  se.interceptors = [];

  t.is(se.connected, re);
  t.is(await se.send(4), 4 + 1);

  se.interceptors = [new PlusTenInterceptor(), new PlusTenInterceptor()];
  t.is(await se.send(5), 5 + 10 + 10 + 1);

  se.connected = undefined;

  t.is(receiveOpenedCalled, 1);

  t.is(sendClosedCalled, 1);
  t.is(receiveClosedCalled, 1);

  se.connected = re;
  t.is(sendOpenedCalled, 2);
  t.is(receiveOpenedCalled, 2);
});

test("interceptor send", async t => {
  const ep1 = new SendEndpoint("ep1", nameIt("o1"));
  const ep2 = new ReceiveEndpoint("ep2", nameIt("o2"));

  ep2.receive = async arg => arg;
  ep1.connected = ep2;

  t.is(ep1.isConnected, true);

  const response = await ep1.send({
    value: 1
  });

  t.is(response.value, 1);
});

test.skip("connect to myself", async t => {
  const e = new ReceiveEndpoint("e", nameIt("o"));
  e.receive = async arg => arg;

  e.connected = e;

  t.is(e.isConnected, true);

  const response = await e.send({
    value: 1
  });

  t.is(response.value, 1);
});
