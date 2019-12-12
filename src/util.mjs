import { Endpoint } from './endpoint.mjs';

/**
 * check for Endpoint
 * @param {any} object
 * @return {boolean} true if object is an Endpoint
 */
export function isEndpoint(object) {
  return object instanceof Endpoint;
}
