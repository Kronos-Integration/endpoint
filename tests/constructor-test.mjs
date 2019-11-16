import test from "ava";
import { nameIt } from "./util.mjs";

import {
  Endpoint,
  SendEndpoint,
  SendEndpointDefault,
  ReceiveEndpoint,
  ReceiveEndpointDefault
} from "../src/endpoint.mjs";

function et(t, factory, options, expected) {
  expected = {
    toString: "o.e(connected=false,open=false)",
    identifier: "o.e",
    direction: undefined,
    opposite: undefined,
    isConnected: false,
    isOpen: false,
    isDefault: false,
    // interceptors: [],
    hasInterceptors: false,
    firstInterceptor: undefined,
    lastInterceptor: undefined,
    ...expected
  };

  const e = new factory("e", nameIt("o"), options);

  for (const [name, v] of Object.entries(expected)) {
    const rv = e[name] instanceof Function ? e[name]() : e[name];
    const ev = expected[name];

    if (Array.isArray(ev) || typeof ev === "object") {
      // console.log(name, ev, typeof ev, rv);

      t.deepEqual(rv, ev, name);
    } else {
      t.is(rv, ev, name);
    }
  }
}

et.title = (providedTitle = "", factory, b) =>
  `interceptor ${providedTitle} ${factory.name} ${b}`.trim();

test(et, Endpoint, undefined, {});

test(et, SendEndpoint, undefined, {
  direction: "out",
  toJSON: { out: true },
  interceptors: []
});

test(et, SendEndpointDefault, undefined, {
  isDefault: true,
  direction: "out"
});

test(et, ReceiveEndpoint, undefined, {
  direction: "in"
});

test(et, ReceiveEndpointDefault, undefined, {
  isDefault: true,
  direction: "in"
});
