import test from "ava";
import { nameIt, checkEndpoint } from "./util.mjs";

import { LimitingInterceptor } from "@kronos-integration/interceptor";

import {
  Endpoint,
  SendEndpoint,
  SendEndpointDefault,
  ReceiveEndpoint,
  ReceiveEndpointDefault,
  ReceiveEndpointSelfConnectedDefault
} from "../src/module.mjs";

function et(t, factory, options, expected) {
  let e;

  try {
    e = new factory("e", nameIt("o"), options);
  } catch (error) {
    t.is(error.message, expected);
    return;
  }

  checkEndpoint(
    t,
    e,
    {
      toString: "service(o).e",
      identifier: "service(o).e",
      ...expected
    },
    true
  );
}

et.title = (providedTitle = "", factory, config) =>
  `endpoint ${providedTitle} ${factory.name} ${JSON.stringify(config)}`.trim();

test(et, Endpoint, undefined, {});

const SendEndpointExpectations = {
  direction: "out",
  toString: "service(o).e(out)",
  toJSON: { out: true },
  interceptors: []
};

test(et, SendEndpoint, undefined, SendEndpointExpectations);
test(et, SendEndpoint, {}, SendEndpointExpectations);

test(
  et,
  SendEndpoint,
  {
    interceptors: [
      LimitingInterceptor,
      { type: LimitingInterceptor, limits: [{ count: 5 }] }
    ]
  },
  {
    ...SendEndpointExpectations,
    toJSON: {
      ...SendEndpointExpectations.toJSON,
      interceptors: [
        {
          type: "request-limit",
          limits: [
            {
              count: 10
            }
          ]
        },
        {
          type: "request-limit",
          limits: [
            {
              count: 5
            }
          ]
        }
      ]
    },
    hasInterceptors: true,
    interceptors: [{ type: "request-limit" }]
  }
);

test(
  et,
  SendEndpoint,
  { connected: new SendEndpoint("c", nameIt("o")) },
  "Can't connect out to out: service(o).e = service(o).c"
);

const otherReceiver = new ReceiveEndpoint("c", nameIt("o"));
test(
  et,
  SendEndpoint,
  { connected: otherReceiver },
  {
    ...SendEndpointExpectations,
    toJSON: { ...SendEndpointExpectations.toJSON, connected: "service(o).c" },
    toString: "service(o).e(connected=service(o).c,out)"
  }
);

test(et, SendEndpointDefault, undefined, {
  ...SendEndpointExpectations,
  isDefault: true
});

const ReceiveEndpointExpectations = {
  direction: "in",
  toJSON: { in: true },
  toString: "service(o).e(in)"
};

test(et, ReceiveEndpoint, undefined, ReceiveEndpointExpectations);
test(et, ReceiveEndpoint, {}, ReceiveEndpointExpectations);

test(
  et,
  ReceiveEndpoint,
  { connected: new ReceiveEndpoint("c", nameIt("o")) },
  "Can't connect in to in: service(o).e = service(o).c"
);

test(
  "with receiver",
  et,
  ReceiveEndpoint,
  { receive: async x => {} },
  {
    ...ReceiveEndpointExpectations,
    toString: "service(o).e(in,open)",
    toJSON: { ...ReceiveEndpointExpectations.toJSON, open: true }
  }
);

test(et, ReceiveEndpointDefault, undefined, {
  ...ReceiveEndpointExpectations,
  isDefault: true
});

test(et, ReceiveEndpointSelfConnectedDefault, undefined, {
  ...ReceiveEndpointExpectations,
  direction: "inout",
  toString: "service(o).e(connected=service(o).e,inout)",
  toJSON: {
    ...ReceiveEndpointExpectations.toJSON,
    out: true,
    connected: "service(o).e"
  },
  isDefault: true
});
