export function nameIt(name) {
  return {
    toString() {
      return name;
    },
    get name() {
      return name;
    },
    endpointIdentifier(e) {
      if (name === undefined) return undefined;
      return `${this.name}.${e.name}`;
    }
  };
}

export function checkEndpoint(t, endpoint, expected, checkOpposite = false) {
  expected = {
    direction: undefined,
    isConnected: false,
    isOpen: false,
    isDefault: false,
    hasInterceptors: false,
    firstInterceptor: undefined,
    lastInterceptor: undefined,
    ...expected
  };

  for (const [name, v] of Object.entries(expected)) {
    const rv =
      endpoint[name] instanceof Function ? endpoint[name]() : endpoint[name];
    const ev = expected[name];

    switch (name) {
      case "opposite":
        if (checkOpposite) {
          checkEndpoint(t, rv, ev, false);
        } else if (ev !== undefined) {
          t.truthy(rv);
        }
        break;
      case "firstInterceptor":
      case "lastInterceptor":
        break;

      case "interceptors":
        for (let i = 0; i < ev.length; i++) {
          checkInterceptor(t, rv[i], ev[i], i);
        }
        break;

      default:
        if (Array.isArray(ev) || typeof ev === "object") {
          t.deepEqual(rv, ev, name);
        } else {
          t.is(rv, ev, name);
        }
    }
  }
}

export function checkInterceptor(t, interceptor, expected, i) {
  t.is(interceptor.type, expected.type, `interceptor type [${i}]`);
}
