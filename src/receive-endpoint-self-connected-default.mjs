import { ReceiveEndpointDefault } from "./receive-endpoint-default.mjs";

/**
 * Receiving endpoint wich can also send to itself
 */
export class ReceiveEndpointSelfConnectedDefault extends ReceiveEndpointDefault {
  *connections() {
    yield this;
    yield * super.connections();
  }

  get isOut() {
    return true;
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
