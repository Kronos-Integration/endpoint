import test from "ava";
import { nameIt } from "./util.mjs";
import { dummyResponseHandler } from "@kronos-integration/test-interceptor";

import { SendEndpoint, ReceiveEndpoint } from "../src/endpoint.mjs";

import { Interceptor } from "@kronos-integration/interceptor";

class PlusTenInterceptor extends Interceptor {
  async receive(value) {
    return this.connected.receive(value + 10);
  }
}

test("connecting with interceptor", async t => {
  const owner = nameIt("owner");
  let received;

  let receiveOpenedCalled = 0;
  let receiveClosedCalled = 0;

  const re = new ReceiveEndpoint("re", owner, {
    opened: endpoint => {
      receiveOpenedCalled++;
      return () => {
        receiveClosedCalled++;
      };
    },
    receive: r => {
      received = r;
      return r + 1;
    }
  });

  let openedCalled = 0;
  let closedCalled = 0;

  const se = new SendEndpoint("se", owner, {
    opened: endpoint => {
      openedCalled++;
      return () => {
        closedCalled++;
      };
    },
    connected: re
  });

  t.is(openedCalled, 1);

  t.is(se.isConnected, true);
  t.is(se.isOpen, true);
  t.is(se.otherEnd, re);
  t.is(se.connected, re);
  t.is(re.connected, se);
  t.is(re.isOpen, true);
 // t.is(re.isConnected, true);

  t.is(await se.receive(1), 1 + 1);
  se.interceptors = [];
  t.is(await se.receive(2), 2 + 1);

  se.interceptors = [new PlusTenInterceptor(se)];
  t.is(await se.receive(3), 3 + 10 + 1);

  t.is(se.isConnected, true);
  t.is(se.otherEnd, re);

  se.interceptors = [];

  t.is(se.connected, re);
  t.is(se.isOpen, true);
  t.is(await se.receive(4), 4 + 1);

  se.interceptors = [new PlusTenInterceptor(se), new PlusTenInterceptor(se)];
  t.is(await se.receive(5), 5 + 10 + 10 + 1);

  se.connected = undefined;
  t.is(closedCalled, 1);

  se.connected = re;
  t.is(openedCalled, 2);
});

test("interceptor send", async t => {
  const ep1 = new SendEndpoint("ep1", nameIt("o1"));
  const ep2 = new ReceiveEndpoint("ep2", nameIt("o2"));

  ep2.receive = dummyResponseHandler;
  ep1.connected = ep2;

  t.is(ep1.isConnected, true);
  t.is(ep1.otherEnd, ep2);

  const response = await ep1.receive({
    value: 1
  });

  t.is(response.value, 1);
});
