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

  if (options) {
    options = {
      ...options, willBeClosed: (value) => {
        t.is(value, 77);
      }, hasBeenOpened: () => { return 77; }
    };
  }

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

et.title = (providedTitle = "", factory, config) =>
  `endpoint ${providedTitle} ${factory.name} ${JSON.stringify(
    config
  )}`.trim();

test(et, Endpoint, undefined, {});

const SendEndpointExpectations = {
  direction: "out",
  toJSON: { out: true },
  interceptors: []
};

test(et, SendEndpoint, undefined, SendEndpointExpectations);
test(et, SendEndpoint, {}, SendEndpointExpectations);

const oppositeReceiver = new ReceiveEndpoint("c", nameIt("o"));
test(
  et,
  SendEndpoint,
  { opposite: oppositeReceiver },
  { ...SendEndpointExpectations, opposite: oppositeReceiver }
);

const otherReceiver = new ReceiveEndpoint("c", nameIt("o"));
test(
  et,
  SendEndpoint,
  { connected: otherReceiver },
  {
    ...SendEndpointExpectations,
    toJSON: { out: true, connected: "o.c" },
    toString: "o.e(connected=true,open=false)",
    isConnected: true,
    otherEnd: otherReceiver
  }
);

test(et, SendEndpointDefault, undefined, {
  ...SendEndpointExpectations,
  isDefault: true
});

const ReceiveEndpointExpectations = {
  direction: "in",
  toJSON: { in: true }
  //  interceptors: []
};

test(et, ReceiveEndpoint, undefined, ReceiveEndpointExpectations);
test(et, ReceiveEndpoint, {}, ReceiveEndpointExpectations);

const oppositeSender = new SendEndpoint("c", nameIt("o"));

test(
  et,
  ReceiveEndpoint,
  { opposite: oppositeSender },
  { ...ReceiveEndpointExpectations, opposite: oppositeSender }
);

test(
  "with receiver",
  et,
  ReceiveEndpoint,
  { receive: () => { } },
  {
    ...ReceiveEndpointExpectations,
    isOpen: true,
    toString: "o.e(connected=false,open=true)"
  }
);

test(et, ReceiveEndpointDefault, undefined, {
  ...ReceiveEndpointExpectations,
  isDefault: true
});
