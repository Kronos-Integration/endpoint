import { isEndpoint, Endpoint } from "./endpoint.mjs";
import { ReceivableEndpoint } from "./receivable-endpoint.mjs";

/**
 * Sending Endpoint.
 * Can only hold one connection.
 * Back connections to any further endpoints will not be established
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service)
 * @param {Object|undefined} options
 * @param {Endpoint|undefined} [options.connected] where te requests are delivered to
 * @param {Function|undefined} [options.didConnect] called after receiver is present
 */
export class SendEndpoint extends ReceivableEndpoint {
  #connection;
  #state;

  constructor(name, owner, options) {
    super(name, owner, options);
    if (isEndpoint(options?.connected)) {
      this.addConnection(options.connected);
    }
  }

  /**
   * We are always _out_
   * @return {boolean} always true
   */
  get isOut() {
    return true;
  }

  get isOpen() {
    return this.#connection !== undefined;
  }

  getConnectionState(other) {
    return other === this.#connection ? this.#state : undefined;
  }

  setConnectionState(other, state) {
    if (other === this.#connection) {
      this.#state = state;
    }
  }

  /**
   * Add a connection.
   * @param {Endpoint} other
   * @param {boolean} [backpointer] true if this is the call form back call from the other side
   */
  addConnection(other, backpointer) {
    if (this.#connection === other) {
      return;
    }

    if (!this.connectable(other)) {
      throw new Error(
        `Can't connect ${this.direction} to ${other.direction}: ${this.identifier} = ${other.identifier}`
      );
    }

    if (this.#connection !== undefined) {
      // do not break standing connection if only setting backpinter
      if (backpointer) {
        return;
      }

      throw new Error(`Already connected to: ${this.#connection.identifier}`);
    }

    this.removeConnection(this.#connection, backpointer);

    this.#connection = other;

    if (!backpointer) {
      other.addConnection(this, true);
    }
  }

  /**
   * Actually stop the communication.
   * @param {Endpoint} other
   * @param {boolean} [backpointer] true if this is the call form back call from the other side
   */
  removeConnection(other, backpointer) {
    this.closeConnection(other);

    if (!backpointer && other !== undefined) {
      other.removeConnection(this, true);
    }
    this.#connection = undefined;
  }

  *connections() {
    if (this.#connection) {
      yield this.#connection;
    }
  }

  async send(...args) {
    if (this.#connection === undefined) {
      throw new Error(`${this.identifier} is not connected`);
    }
    if (!this.#connection.isOpen) {
      throw new Error(
        `${this.identifier}: ${this.#connection.identifier} is not open`
      );
    }

    const interceptors = this.interceptors;
    let c = 0;

    const next = async (...args) =>
      c >= interceptors.length
        ? this.#connection.receive(...args)
        : interceptors[c++].receive(this, next, ...args);

    return next(...args);
  }
}
