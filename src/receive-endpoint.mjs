import { Endpoint } from "./endpoint.mjs";
import { isEndpoint } from "./util.mjs";

/**
 * Receiving Endpoint
 * by default a dummy rejecting receiver is assigned
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

  openConnection(other) {
    const state = this._connections.get(other);

    if (state === undefined) {
      this._connections.set(other, this.didConnect(this, other));
    }
  }

  closeConnection(other) {
    const state = this._connections.get(other);
    if (state !== undefined) {
      state();
      this._connections.set(other, undefined);
    }
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

  isConnected(other) {
    return this._connections.get(other) !== undefined;
  }

  get hasConnections() {
    return this._connections.size > 0;
  }

  *connections() {
    yield* this._connections.values();
  }
}

