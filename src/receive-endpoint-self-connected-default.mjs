import { ReceiveEndpointDefault } from "./receive-endpoint-default.mjs";
import { Endpoint } from "./endpoint.mjs";

/**
 * Receiving endpoint wich can also send to itself.
 */
export class ReceiveEndpointSelfConnectedDefault extends ReceiveEndpointDefault {
  get isOut() {
    return true;
  }

  *connections() {
    yield this;
    yield* super.connections();
  }

  addConnection(other, backpointer) {
    if (other === this) {
      return;
    }
    return super.addConnection(other, backpointer);
  }

  /**
   * Actually stop the communication.
   * @param {Endpoint} other
   * @param {boolean?} backpointer true if this is the call form back call from the other side
   */
  removeConnection(other, backpointer) {
    // @ts-ignore
    if (other === this) {
      return;
    }
    return super.removeConnection(other, backpointer);
  }

  isConnected(other) {
    if (this === other) {
      return true;
    }
    return super.isConnected(other);
  }
  
  async send(...args) {
    const interceptors = this.interceptors;
    let c = 0;

    const next = async (...args) =>
      c >= interceptors.length
        ? this.receive(...args)
        : interceptors[c++].receive(this, next, ...args);

    return next(...args);
  }
}
