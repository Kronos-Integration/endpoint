import {
  ConnectorMixin,
  rejectingReceiver
} from "@kronos-integration/interceptor";
import { definePropertiesFromOptions } from "./util.mjs";

const FIRST = Symbol("first");
const LAST = Symbol("last");
const RECEIVE = Symbol("receive");
const SENDER = Symbol("sender");
const ENDPOINT = Symbol("endpoint");

// TODO why is this not working as a symbol
const CONNECTED = "_connected"; // Symbol('connected');

/**
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Endpoint} [options.opposite] opposite endpoint
 * @param {boolean} [options.createOpposite] true to auto create an opposite endpoint
 */
export class Endpoint {
  constructor(name, owner, options = {}) {
    const properties = {
      name: { value: name },
      owner: { value: owner }
    };

    if (options.opposite !== undefined) {
      properties.opposite = {
        value: options.opposite
      };

      Object.defineProperty(options.opposite, "opposite", {
        value: this
      });
    } else if (options.createOpposite) {
      properties.opposite = {
        value: new (this.isIn ? SendEndpoint : ReceiveEndpoint)(
          name,
          owner,
          {
            opposite: this
          }
        )
      };
    }

    Object.defineProperties(this,properties);
  }

  /**
   * Indicate whatever we are a default endpoint.
   * Default means buildin.
   * @return {boolean} false
   */
  get isDefault() {
    return false;
  }

  toString() {
    return `${this.owner}.${this.name}(connected=${this.isConnected},open=${this.isOpen})`;
  }

  get identifier() {
    return this.owner.endpointIdentifier(this);
  }

  /**
   * @return {boolean} false
   */
  get isIn() {
    return false;
  }

  /**
   * @return {boolean} false
   */
  get isOut() {
    return false;
  }

  /**
   * @return {boolean} false
   */
  get isOpen() {
    return false;
  }

  /**
   * @return {boolean} false
   */
  get isConnected() {
    return false;
  }

  hasBeenConnected() {}
  hasBeenDisConnected(formerConnected) {}
  hasBeenOpened() {}
  willBeClosed() {}

  /**
   * Deliver data flow direction
   * @return {string} delivers data flow direction 'in', 'out' or undefined
   */
  get direction() {
    return this.isIn ? "in" : this.isOut ? "out" : undefined;
  }

  /**
   * Deliver the opposite endpoint
   * @return {Endpoint} representing the opposite direction
   */
  get opposite() {
    return undefined;
  }

  toJSON() {
    const json = {};

    if (this.isIn) {
      json.in = true;
    }
    if (this.isOut) {
      json.out = true;
    }

    return json;
  }
}

/**
 * Endpoint with a list of interceptors
 * also provides fistInterceptor and lastInterceptor
 */
export class InterceptedEndpoint extends Endpoint {
  /**
   * @return {boolean} true if there is at least one interceptor assigned
   */
  get hasInterceptors() {
    return this[FIRST] !== undefined;
  }

  get firstInterceptor() {
    return this[FIRST];
  }

  get lastInterceptor() {
    return this[LAST];
  }

  /**
   * Deliver array of all assigned interceptors
   * @return {Interceptor[]} the interceptors or empty array if none are present
   */
  get interceptors() {
    const itcs = [];
    let i = this.firstInterceptor;
    while (i) {
      itcs.push(i);
      if (i === this.lastInterceptor) break;
      i = i.connected;
    }

    return itcs;
  }

  /**
   * Set the interceptors
   * a connected chain from array element 0 over all entries up to the last element
   * in the array is formed.
   * Additionally firstInterceptor and lastInterceptor are set.
   * @param {Interceptor[]} newInterceptors replaces all interceptors
   */
  set interceptors(newInterceptors) {
    if (newInterceptors === undefined || newInterceptors.length === 0) {
      this[FIRST] = undefined;
      this[LAST] = undefined;
    } else {
      this[FIRST] = newInterceptors[0];
      this[LAST] = newInterceptors.reduce(
        (previous, current) => (previous.connected = current),
        this[FIRST]
      );
    }
  }

  toJSON() {
    const json = super.toJSON();
    const its = this.interceptors;

    if (its && its.length > 0) {
      json.interceptors = its.map(i => i.toJSON());
    }

    return json;
  }
}

/**
 * Receiving Endpoint
 * by default a dummy rejecting receiver is assigned
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 */
export class ReceiveEndpoint extends InterceptedEndpoint {
  constructor(name, owner, options) {
    super(name, owner, options);

    this[RECEIVE] = rejectingReceiver;
  }

  /**
   * Connect other side to us
   * @param {Endpoint} other endpoint to be connected to
   */
  set connected(other) {
    other.connected = this;
  }

  /**
   * Deliver the sending side Endpoint
   * @return {SendEndpoint} the sending side
   */
  get sender() {
    return this[SENDER];
  }

  set sender(sender) {
    this[SENDER] = sender;
  }

  /**
   * get the recive function
   * @return {Function}
   */
  get receive() {
    return this[RECEIVE];
  }

  /**
   * Are we able to receive requests
   * @return {boolean} true if we are able to receive requests
   */
  get isOpen() {
    return (
      (this.hasInterceptors ? this[ENDPOINT].receive : this[RECEIVE]) !==
      rejectingReceiver
    );
  }

  /**
   * Set the recive function
   * If we know the sender we will inform him about our open/close state
   * by calling willBeClosed() and hasBeenOpened()
   * @param {Function} receive
   */
  set receive(receive = rejectingReceiver) {
    const s = this.sender;

    if (s && receive === rejectingReceiver) {
      s.willBeClosed();
    }

    if (this.hasInterceptors) {
      this[ENDPOINT].receive = receive;
    } else {
      this[RECEIVE] = receive;
    }

    if (s && s.isOpen) {
      s.hasBeenOpened();
    }
  }

  set interceptors(newInterceptors) {
    const lastReceive = this.hasInterceptors
      ? this[ENDPOINT].receive
      : this.receive;

    super.interceptors = newInterceptors;

    if (this.hasInterceptors) {
      if (!this[ENDPOINT]) {
        let internalReceive = lastReceive;
        this[ENDPOINT] = Object.create(this, {
          receive: {
            get() {
              return internalReceive;
            },
            set(r) {
              internalReceive = r;
            }
          }
        });
      }

      this.lastInterceptor.connected = this[ENDPOINT];
      this[RECEIVE] = request => this.firstInterceptor.receive(request);
    } else {
      this[RECEIVE] = lastReceive;
    }
  }

  /**
   * We are always _in_
   * @return {boolean} always true
   */
  get isIn() {
    return true;
  }
}

/**
 * Receive Endpoint acting as a default endpoints
 */
export class ReceiveEndpointDefault extends ReceiveEndpoint {
  /**
   * We are a default endpoint
   * @return {boolean} always true
   */
  get isDefault() {
    return true;
  }
}

/**
 * Sending Endpoint
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Endpoint} [options.opposite] endpoint going into the opposite direction
 * @param {Function} [options.hasBeenConnected] called after connected
 * @param {Function} [options.hasBeenDisconected] called after disconnected
 * @param {Function} [options.hasBeenOpened] called after receiver is open
 * @param {Function} [options.willBeClosed] called before receiver is closed
 */
export class SendEndpoint extends ConnectorMixin(InterceptedEndpoint) {
  constructor(name, owner, options = {}) {
    super(name, owner, options);

    definePropertiesFromOptions(this, options, [
      "hasBeenConnected",
      "hasBeenDisConnected",
      "hasBeenOpened",
      "willBeClosed"
    ]);
  }

  receive(request, formerRequest) {
    return this.connected.receive(request, formerRequest);
  }

  toJSON() {
    const json = super.toJSON();

    if (this.isConnected) {
      const o = this.otherEnd;
      if (o !== undefined && o.owner !== undefined) {
        const ei = o.owner.endpointIdentifier(o);
        if (ei !== undefined) {
          json.target = ei;
        }
      }
    }

    return json;
  }

  /**
   * We are always _out_
   * @return {boolean} always true
   */
  get isOut() {
    return true;
  }

  set interceptors(newInterceptors) {
    const lastConnected = this.hasInterceptors
      ? this.lastInterceptor.connected
      : this[CONNECTED];

    super.interceptors = newInterceptors;
    if (this.hasInterceptors) {
      this.lastInterceptor.connected = lastConnected;
      this[CONNECTED] = this.firstInterceptor;
    } else {
      this[CONNECTED] = lastConnected;
    }
  }

  set connected(toBeConnected) {
    let formerConnected;

    if (toBeConnected !== undefined) {
      toBeConnected.sender = this;
    } else {
      if (this.isOpen) {
        this.willBeClosed();
      }
    }

    if (this.hasInterceptors) {
      formerConnected = this.lastInterceptor.connected;
      this.lastInterceptor.connected = toBeConnected;
    } else {
      formerConnected = super.connected;
      super.connected = toBeConnected;
    }

    /* TODO
    if (formerConnected) {
      formerConnected.sender = undefined;
    }
    */

    if (toBeConnected) {
      if (
        toBeConnected.opposite &&
        this.opposite &&
        toBeConnected.opposite.connected !== this.opposite
      ) {
        toBeConnected.opposite.connected = this.opposite;
      }

      this.hasBeenConnected();

      if (this.isOpen) {
        this.hasBeenOpened();
      }
    } else if (toBeConnected === undefined) {
      this.hasBeenDisConnected(formerConnected);
    }
  }

  get isOpen() {
    return this.isConnected && this.connected.isOpen;
  }

  // TODO why is this required ?
  get connected() {
    return this[CONNECTED];
  }
  get interceptors() {
    return super.interceptors;
  }
  get otherEnd() {
    return super.otherEnd;
  }
}

/**
 * Send Endpoint acting as a default endpoints
 */
export class SendEndpointDefault extends SendEndpoint {
  /**
   * We are a default endpoint
   * @return {boolean} always true
   */
  get isDefault() {
    return true;
  }
}
