import { SendEndpoint } from "./send-endpoint.mjs";

export class SendReceiveEndpoint extends SendEndpoint {
  get isIn() {
    return true;
  }
}
