import test from "ava";
import { nameIt, wait } from "./util.mjs";
import { Interceptor } from "@kronos-integration/interceptor";
import {
  SendEndpoint,
  ReceiveEndpoint,
  ReceiveEndpointSelfConnectedDefault
} from "../src/module.mjs";

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

  await wait(1);

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

  await wait(1);

  t.is(receiveOpenedCalled, 1);
  t.is(sendClosedCalled, 1);
  t.is(receiveClosedCalled, 1);

  se.addConnection(re);

  await wait(1);

  t.is(sendOpenedCalled, 2);
  t.is(receiveOpenedCalled, 2);
});

test("interceptor send", async t => {
  const ep1 = new SendEndpoint("ep1", nameIt("o1"));
  const ep2 = new ReceiveEndpoint("ep2", nameIt("o2"), {
    receive: async arg => arg * arg
  });

  ep1.addConnection(ep2);

  t.true(ep1.isConnected(ep2));
  t.is(await ep1.send(4), 16);
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

test("send connect to itself", async t => {
  const e = new SendEndpoint("e", nameIt("o1"), {
    receive: async arg => arg * arg
  });

  e.addConnection(e);

  t.true(e.isConnected(e));
  t.is(await e.send(3), 9);
});

test.only("receive self connected", async t => {
  const e = new ReceiveEndpointSelfConnectedDefault("e", nameIt("o1"), {
    receive: async arg => arg * arg
  });

  t.true(e.isConnected(e));
  t.is(await e.send(3), 9);

  const s2 = new SendEndpoint("s2", nameIt("o2"));
  s2.addConnection(e);  
  t.true(s2.isConnected(e));

  t.true(e.isConnected(e));
  t.is(await s2.send(3), 9);
});

test("receive connect to itself -> exception", async t => {
  const e = new ReceiveEndpoint("e", nameIt("o"), {
    receive: async arg => arg * arg
  });
  t.throws(
    () => e.addConnection(e),
    "Can't connect in to in: service(o).e = service(o).e"
  );
});

test("connect several send to one receive", async t => {
  const s1 = new SendEndpoint("s1", nameIt("o"));
  const s2 = new SendEndpoint("s1", nameIt("o"));

  const r1 = new ReceiveEndpoint("r1", nameIt("o"), {
    receive: async arg => arg * arg
  });

  s1.addConnection(r1);
  s2.addConnection(r1);

  t.true(s1.isConnected(r1));
  t.true(s2.isConnected(r1));

  t.is(await s1.send(2), 4);
  t.is(await s2.send(2), 4);
});
