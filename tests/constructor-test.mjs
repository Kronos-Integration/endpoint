import test from "ava";
import { nameIt, checkEndpoint } from "./util.mjs";

import { LimitingInterceptor } from "@kronos-integration/interceptor";

import {
  Endpoint,
  SendEndpoint,
  SendEndpointDefault,
  ReceiveEndpoint,
  ReceiveEndpointDefault
} from "../src/endpoint.mjs";

function et(t, factory, options, expected) {
  let e;

  try {
    e = new factory("e", nameIt("o"), options);
  }
  catch (error) {
    t.is(error.message,expected);
    return;
  }

  checkEndpoint(t, e,
    {
      toString: "o.e(connected=false,open=false)",
      identifier: "o.e",
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
      out: true,
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

function willBeClosed() { }
function hasBeenOpened() { }

test(
  "opposite from options",
  et,
  SendEndpoint,
  {
    opposite: {
      name: "c75"
    }
  },
  {
    ...SendEndpointExpectations,
    opposite: { name: "c75", direction: "in" },
    toJSON: {
      out: true,
      opposite: {
        in: true
      }
    }
  }
);

test(
  et,
  SendEndpoint,
  { opposite: new ReceiveEndpoint("c76", nameIt("o")) },
  {
    ...SendEndpointExpectations,
    opposite: {
      name: "c76",
      direction: "in"
    },
    toJSON: {
      out: true,
      opposite: {
        in: true
      }
    }
  }
);


test(
  et,
  SendEndpoint,
  { connected: new SendEndpoint("c", nameIt("o")) },
  "Can't connect to none in: o.e = o.c"
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
};

test(et, ReceiveEndpoint, undefined, ReceiveEndpointExpectations);
test(et, ReceiveEndpoint, {}, ReceiveEndpointExpectations);

test(
  et,
  ReceiveEndpoint,
  { connected: new ReceiveEndpoint("c", nameIt("o")) },
  "Can't connect to none out: o.e = o.c"
);

test(
  et,
  ReceiveEndpoint,
  { opposite: new SendEndpoint("c77", nameIt("o")) },
  {
    ...ReceiveEndpointExpectations,
    opposite: {
      name: "c77",
      direction: "out"
    },
    toJSON: {
      in: true,
      opposite: {
        out: true
      }
    }
  }
);

test(
  et,
  ReceiveEndpoint,
  { opposite: { hasBeenOpened } },
  {
    ...ReceiveEndpointExpectations,
    opposite: {
      name: "e",
      direction: "out"
      //hasBeenOpened
    },
    toJSON: {
      in: true,
      opposite: {
        out: true
      }
    }
  }
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
