import { Endpoint } from "./endpoint.mjs";
import { isEndpoint } from "./util.mjs";

/**
 * Multiple Sending Endpoint.
 * Can hold several connections.
 * Back connections to any further endpoints will not be established
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Endpoint} [options.connected] where te requests are delivered to
 * @param {Function} [options.didConnect] called after receiver is present
 */
export class MultiSendEndpoint extends Endpoint {
  constructor(name, owner, options = {}) {
    super(name, owner, options);
    if (isEndpoint(options.connected)) {
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
    return this._connections.length > 0;
  }

  _connections = new Map();

  /**
   * Deliver connection state
   * @param {Entpoint} other
   * @return {any} our state for the connection to other
   */
  getConnectionState(other) {
    return this._connections.get(other);
  }

  /**
   * Set connection state
   * @param {Entpoint} other
   * @param {any} state for the connection to other
   */
  setConnectionState(other, state) {
    this._connections.set(other, state);
  }

  addConnection(other, backpointer) {
    if (!this.connectable(other)) {
      throw new Error(
        `Can't connect ${this.direction} to ${other.direction}: ${this.identifier} = ${other.identifier}`
      );
    }

    if (!this._connections.get(other)) {
      if (!backpointer) {
        other.addConnection(this, true);
      }

      this._connections.set(other, undefined); // dummy

      if (this.isOpen) {
        process.nextTick(() => this.openConnection(other));
      }
    }
  }

  removeConnection(other, backpointer) {
    this.closeConnection(other);
    this._connections.delete(other);

    if (!backpointer) {
      other.removeConnection(this, true);
    }
  }

  /**
   * Check connectivity
   * @param {Endpoint} other
   * @return {boolean} true if we are connected with other
   */
  isConnected(other) {
    return this._connections.has(other);
  }

  /**
   * All connections
   */
  *connections() {
    yield* this._connections.keys();
  }

  async send(...args) {
    const interceptors = this.interceptors;

    for (const connection of this.connections()) {
      if (!connection.isOpen) {
        throw new Error(`${this.identifier}: ${connection.identifier} is not open`);
      }

      let c = 0;

      const next = async (...args) =>
        c >= interceptors.length
          ? connection.receive(...args)
          : interceptors[c++].receive(this, next, ...args);

      next(...args);
    }
  }
}
