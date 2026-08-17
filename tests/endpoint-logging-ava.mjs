import test from "ava";
import { nameIt } from "./helpers/util.mjs";
import { ReceiveEndpoint } from "@kronos-integration/endpoint";

test("logging interceptor", t => {
  const owner = nameIt("owner");

  let log;

  owner.log = (...args) => {
    log = args;
  };

  const re = new ReceiveEndpoint("re", owner, {});

  re.info("xinfo");

  t.deepEqual(log, ["info", { endpoint: "re", message: "xinfo" }]);
});
