import { Endpoint } from "./endpoint.mjs";

const RECEIVE = Symbol("receive");

/**
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service)
 * @param {Object} options
 * @param {Function} [options.receive] reciever function
 */
export class ReceivableEndpoint extends Endpoint {
  constructor(name, owner, options) {
    super(name, owner, options);
    if (options.receive) {
      this.receive = options.receive;
    }
  }

  /**
   * @return {boolean} false
   */
  get isIn() {
    return this[RECEIVE] !== undefined;
  }

  /**
   * get the receive function
   * @return {Function}
   */
  get receive() {
    return this[RECEIVE];
  }

  /**
   * Set the receive function
   * @param {Function} receive
   */
  set receive(receive) {
    this[RECEIVE] = receive;
  }

  get isOpen() {
    return this[RECEIVE] !== undefined;
  }
}
