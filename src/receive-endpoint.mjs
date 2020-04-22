import { Endpoint } from "./endpoint.mjs";
import { isEndpoint } from "./util.mjs";

/**
 * Receiving Endpoint.
 * Can receive from several endpoints.
 * By default a dummy rejecting receiver is assigned
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Function} [options.receive] reciever function
 * @param {Endpoint} [options.connected] sending side
 */
export class ReceiveEndpoint extends Endpoint {
  _connections = new Map();

  constructor(name, owner, options = {}) {
    super(name, owner, options);
    if (isEndpoint(options.connected)) {
      this.addConnection(options.connected);
    }
  }

  /**
   * We are always _in_
   * @return {boolean} always true
   */
  get isIn() {
    return true;
  }

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
  setConnectionState(other,state) {
    this._connections.set(other,state);
  }

  /**
   * Add connection to other.
   * if backpointer is false the opposite connection will be added to
   * @param {Endpoint} other
   * @param {boolean} backpointer
   */
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

  /**
   * Remove connection to other.
   * if backpointer is false the opposite connection will be removed to
   * @param {Endpoint} other
   * @param {boolean} backpointer
   */
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
}

