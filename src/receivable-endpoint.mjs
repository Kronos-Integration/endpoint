import { Endpoint, instanciateInterceptors } from "./endpoint.mjs";

/**
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service)
 * @param {Object} options
 * @param {Function} [options.receive] reciever function
 * @param {Function} [options.receivingInterceptors]
 */
export class ReceivableEndpoint extends Endpoint {

  #receive;
 
  constructor(name, owner, options) {
    super(name, owner, options);
    if (options?.receive) {
      this.receive = options.receive;
    }

    if (options?.receivingInterceptors) {
      Object.defineProperties(this, {
        receivingInterceptors: {
          value: instanciateInterceptors(
            options.receivingInterceptors,
            this.owner
          )
        }
      });
    }
  }

  /**
   * @return {boolean} true is receive function is present
   */
  get isIn() {
    return this.#receive !== undefined;
  }

  /**
   * Get the receive function.
   * @return {Function}
   */
  get receive() {
    return this.#receive;
  }

  /**
   * Set the receive function.
   * @param {Function} receive
   */
  set receive(receive) {
    this.#receive = receive;
  }

  get isOpen() {
    return this.#receive !== undefined;
  }
}
