import test from "ava";
import { nameIt } from "./util.mjs";

import { SendEndpoint, ReceiveEndpoint } from "../src/endpoint.mjs";

test("connecting SendEndpoint to itself", t => {
  const se = new SendEndpoint("se", nameIt("ss"));
  t.throws(() => se.connected = se, Error);
});

test("connecting ReceiveEndpoint to itself", t => {
  const re = new ReceiveEndpoint("se", nameIt("ss"));
  t.throws(() => re.connected = re, Error);
});

test("SendEndpoint connecting with hasBeen...", t => {
  const se = new SendEndpoint("se", nameIt("o1"));
  const re = new ReceiveEndpoint("re", nameIt("o2"));

  t.is(se.isConnected, false);
  t.is(re.isConnected, false);

  se.connected = re;

  t.is(se.isConnected, true);
  t.is(re.isConnected, true);

  se.connected = undefined;

  t.is(se.isConnected, false);
  t.is(re.isConnected, false);
});
