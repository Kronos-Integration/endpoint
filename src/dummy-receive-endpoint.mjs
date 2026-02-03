import { Endpoint } from "./endpoint.mjs";

/**
 * Dummy endpoints are used during construction of the endpoint mesh.
 * The will be replaces by real endpoints during the resolving phase.
 */
export class DummyReceiveEndpoint extends Endpoint {
  /**
   * dummy does nothing by intention.
   */
  async receive() {}

  /**
   * @return {boolean} true
   */
  get isIn() {
    return true;
  }

  /**
   * @return {boolean} true
   */
  get isOpen() {
    return true;
  }

  /**
   * Indicate whatever we are a dummy endpoint.
   * Dummy endpoints are used duiring construction of the endpoint mesh.
   * @return {boolean} true
   */
  get isDummy() {
    return true;
  }
}
