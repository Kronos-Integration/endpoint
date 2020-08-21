import { Interceptor } from "@kronos-integration/interceptor";
import { Endpoint } from "./endpoint.mjs";

/**
 * check for Endpoint
 * @param {any} object
 * @return {boolean} true if object is an Endpoint
 */
export function isEndpoint(object) {
  return object instanceof Endpoint;
}

export function instanciateInterceptors(interceptors, owner) {
  return interceptors
    .map(interceptor => {
      if (interceptor instanceof Interceptor) {
        return interceptor;
      }
      switch (typeof interceptor) {
        case "function":
          return new interceptor();
        case "string":
          return owner.instantiateInterceptor(interceptor);
      }

      switch (typeof interceptor.type) {
        case "function":
          return new interceptor.type(interceptor);
        case "string":
          return owner.instantiateInterceptor(interceptor);
      }

      console.log("Unknown interceptor", interceptor);
    })
    .filter(i => i);
}
