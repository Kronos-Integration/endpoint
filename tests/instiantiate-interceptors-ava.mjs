import test from "ava";
import {
  Interceptor,
  TimeoutInterceptor,
  TemplateInterceptor,
  LimitingInterceptor
} from "@kronos-integration/interceptor";
import {
  SendEndpoint,
  instanciateInterceptors
} from "@kronos-integration/endpoint";

const t2i = Object.fromEntries(
  [
    Interceptor,
    TimeoutInterceptor,
    TemplateInterceptor,
    LimitingInterceptor
  ].map(i => [i.name, i])
);

const id1 = { type: "request-limit", limits: [{ count: 3 }] };
const id2 = { type: "template", request: "tx" };

test("instanciateInterceptors", t => {
  let requestedInterceptorDefinition;
  const owner = {
    instantiateInterceptor(interceptorDef) {
      requestedInterceptorDefinition = interceptorDef;
      return new Interceptor(interceptorDef);
    }
  };

  const e1 = new SendEndpoint("e1", owner, {
    interceptors: [id1]
  });

  t.is(e1.interceptors.length, 1);
  t.deepEqual(requestedInterceptorDefinition, id1);
});

function iit(t, definition, expected) {
  const owner = {
    instantiateInterceptor(interceptorDef) {
      const factory = t2i[interceptorDef.type];
      return factory ? new factory(interceptorDef) : undefined;
    }
  };

  t.deepEqual(
    expected,
    JSON.parse(JSON.stringify(instanciateInterceptors(definition, owner)))
  );
}

function dp(definition) {
  if (definition === undefined) return "undefined";

  function dp(d) {
    function tt(type) {
      if (type === undefined) return undefined;
      switch (typeof type) {
        case "function":
          return "<class " + type.name + ">";
        case "string":
          return type;
        default:
          if (type instanceof Interceptor) {
            return `<instance ${type.type}>`;
          }
      }
    }

    const r = tt(d);
    if (r !== undefined) {
      return r;
    }

    let type = tt(d.type);

    return { ...d, type };
  }

  return JSON.stringify(
    Array.isArray(definition) ? definition.map(dp) : dp(definition)
  );
}

iit.title = (providedTitle = "instanciateInterceptors", definition) =>
  `${providedTitle} ${dp(definition)}`.trim();

test(iit, undefined, []);
test(iit, [], []);
test(iit, ["unknown"], []);
test(iit, id1, [id1]);
test(iit, [id1], [id1]);
test(iit, [id1, id2], [id1, id2]);
test(iit, [TemplateInterceptor], [{ type: "template", request: {} }]);
test(
  iit,
  [{ type: TemplateInterceptor, request: "rx" }],
  [{ type: "template", request: "rx" }]
);
test(
  iit,
  [new TemplateInterceptor({ request: "rx" })],
  [{ type: "template", request: "rx" }]
);
