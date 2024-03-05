import { SendEndpoint } from "./send-endpoint.mjs";

/**
 * bi directional endpint
 */
export class SendReceiveEndpoint extends SendEndpoint {

  /**
   * Always receiving.
   * @return {boolean} true
   */
  get isIn() {
    return true;
  }
}
