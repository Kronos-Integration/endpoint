import { ReceiveEndpoint } from "./receive-endpoint.mjs";

/**
  * Dummy endpoints are used duiring construction of the endpoint mesh.
  * 
  */
export class DummyReceiveEndpoint extends ReceiveEndpoint {
  constructor(name,owner,options) {
    super(name,owner,{ receive: async () => undefined }); 
  }
 /**
   * Indicate whatever we are a dummy endpoint.
   * Dummy endpoints are used duiring construction of the endpoint mesh.
   * @return {boolean} true 
   */
  get isDummy() { return true; }
}
