import test from "ava";
import { Interceptor } from "@kronos-integration/interceptor";
import {
  SendEndpoint,
  instanciateInterceptors
} from "@kronos-integration/endpoint";

test("instanciateInterceptors", t => {
  const id0 = { type: "my-type", limits: [{ count: 3 }] };

  let requestedInterceptorDefinition;
  const owner = {
    instantiateInterceptor(interceptorDef) {
      requestedInterceptorDefinition = interceptorDef;
      return new Interceptor(interceptorDef);
    }
  };

  const e1 = new SendEndpoint("e1", owner, {
    interceptors: [id0]
  });

  t.is(e1.interceptors.length, 1);
  t.deepEqual(requestedInterceptorDefinition, id0);
});

function iit(t, definition, expected) {
  const owner = {
    instantiateInterceptor(interceptorDef) {
      return new Interceptor(interceptorDef);
    }
  };

  t.deepEqual(
    expected,
    JSON.parse(JSON.stringify(instanciateInterceptors(definition, owner)))
  );
}

iit.title = (providedTitle = "instanciateInterceptors", definition) =>
  `${providedTitle} ${JSON.stringify(definition)}`.trim();

  test(iit, [], []);
  test(iit, undefined, []);
