import {
  Interceptor,
  ConnectorMixin,
  rejectingReceiver,
  CONNECTED
} from "@kronos-integration/interceptor";

import { definePropertiesFromOptions } from "./util.mjs";

const ENDPOINT = Symbol("endpoint");

const FIRST = Symbol("first");
const LAST = Symbol("last");
const RECEIVE = Symbol("receive");
const OPENED_STATE = Symbol("openedState");

/**
 * - ![Opposite Endbpoint](doc/images/opposite.svg "Opposite Endbpoint")
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service)
 * @param {Object} options
 * @param {Endpoint|Object} [options.opposite] opposite endpoint
 */
export class Endpoint {
  constructor(name, owner, options = {}) {
    const properties = {
      name: { value: name },
      owner: { value: owner }
    };

    const opposite = options.opposite;

    if (isEndpoint(opposite)) {
      properties.opposite = {
        value: opposite
      };

      Object.defineProperty(opposite, "opposite", {
        value: this
      });
    } else if (opposite) {
      properties.opposite = {
        value: new this.oppositeFactory(opposite.name || name, owner, {
          ...opposite,
          opposite: this
        })
      };
    }
    Object.defineProperties(this, properties);
  }

  /**
   * Indicate whatever we are a default endpoint.
   * Default means buildin.
   * @return {boolean} false
   */
  get isDefault() {
    return false;
  }

  /**
   * mapping of properties used in toString
   * @return {Object}
   */
  get toStringAttributes() {
    return { connected: "isConnected", open: "isOpen" };
  }

  toString() {
    return `${this.owner}.${this.name}(${Object.entries(this.toStringAttributes)
      .map(([name, prop]) => `${name}=${this[prop]}`)
      .join(",")})`;
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

  opened() { }
  close() { }

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
    return this.toJSONWithOptions({
      includeDefaults: false,
      includeConfig: false,
      includeOpposite: true
    });
  }

  /**
   * additional Attributes to present in json output
   */
  get jsonAttributes() {
    return [];
  }

  toJSONWithOptions(options) {
    const json = {};

    for (const attr of this.jsonAttributes) {
      if (this[attr] !== undefined) {
        json[attr] = this[attr];
      }
    }

    if (this.isIn) {
      json.in = true;
    }
    if (this.isOut) {
      json.out = true;
    }

    const c = this.connected;
    if (c) {
      json.connected = c.identifier;
    }

    if (this.hasInterceptors) {
      json.interceptors = this.interceptors.map(i => i.toJSON());
    }

    if (this.opposite && options.includeOpposite) {
      json.opposite = this.opposite.toJSONWithOptions({ ...options, includeOpposite: false  });
    }

    return json;
  }

  get hasInterceptors() {
    return false;
  }

  get interceptors() { return []; }
}

/**
 * Endpoint with a list of interceptors
 *
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service)
 * @param {Object} options
 * @param {Interceptor|Object[]} [options.interceptors] opposite endpoint
 */
export class InterceptedEndpoint extends Endpoint {
  constructor(name, owner, options) {
    super(name, owner, options);

    this.instanciateInterceptors(options.interceptors);
  }

  /**
   * @return {boolean} true if there is at least one interceptor assigned
   */
  get hasInterceptors() {
    return this[LAST] !== undefined;
  }

  /**
   * Deliver array of all assigned interceptors
   * @return {Interceptor[]} the interceptors or empty array if none are present
   */
  get interceptors() {
    const itcs = [];

    const last = this[LAST];
    if (last) {
      let i = this[FIRST];
      while (i) {
        itcs.push(i);
        if (i === last) break;
        i = i.connected;
      }
    }

    return itcs;
  }

  /**
   * Set the interceptors
   * a connected chain from array element 0 over all entries up to the last element
   * in the array is formed.
   * @param {Interceptor[]} newInterceptors replaces all interceptors
   */
  set interceptors(newInterceptors) {
    this.updateInterceptors(newInterceptors, undefined);
  }

  updateInterceptors(newInterceptors, connected) {
    if (newInterceptors === undefined || newInterceptors.length === 0) {
      this[FIRST] = connected;
      this[LAST] = undefined;
    } else {
      this[FIRST] = newInterceptors[0];
      this[LAST] = newInterceptors.reduce(
        (previous, current) => (previous.connected = current),
        this[FIRST]
      );
      this[LAST].connected = connected;
    }
  }

  instanciateInterceptors(interceptors) {
    if (interceptors === undefined) return;

    this.interceptors = interceptors.map(interceptor => {
      if (interceptor instanceof Interceptor) {
        return interceptor;
      }
      if (typeof interceptor === "function") {
        return new interceptor(this);
      }
      return new interceptor.type(this, interceptor);
    });
  }
}

/**
 * Receiving Endpoint
 * by default a dummy rejecting receiver is assigned
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Function} [options.receive] reciever function
 * @param {Endpoint} [options.connected] sending side
 */
export class ReceiveEndpoint extends InterceptedEndpoint {
  constructor(name, owner, options = {}) {
    super(name, owner, options);

    this.receive = options.receive;

    if (isEndpoint(options.connected)) {
      this.connected = options.connected;
    }
  }

  /**
   * Connect other side to us
   * @param {Endpoint} other endpoint to be connected to
   */
  set connected(other) {
    if(other !== undefined) {
      if (other === this) {
        throw new Error(
          `Can't connect to myself ${identifier}`
        );
      }  

      if(!other.isOut) {
        throw new Error(
          `Can't connect to none out: ${this.identifier} = ${other.identifier}`
        );  
      }
    }

    if (other !== undefined && other.connected !== this) {
      other.connected = this;
    }

    this[CONNECTED] = other;
  }

  /**
   * Deliver the sending side Endpoint
   * @return {SendEndpoint} the sending side
   */
  get connected() {
    return this[CONNECTED];
  }

  
  get isConnected() {
    return this[CONNECTED] !== undefined;
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
   * get the receive function
   * @return {Function}
   */
  get receive() {
    return this[RECEIVE];
  }

  /**
   * Set the receive function
   * If we know the sender we will inform him about our open/close state
   * by calling willBeClosed() and hasBeenOpened()
   * @param {Function} receive
   */
  set receive(receive = rejectingReceiver) {
    if (receive === rejectingReceiver) {
      if (this.connected) {
        this.connected.close();
      }
    }

    if (this.hasInterceptors) {
      this[ENDPOINT].receive = receive;
    } else {
      this[RECEIVE] = receive;
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

      this[LAST].connected = this[ENDPOINT];
      this[RECEIVE] = request => this[FIRST].receive(request);
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

  get oppositeFactory() {
    return SendEndpoint;
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

  get oppositeFactory() {
    return SendEndpointDefault;
  }
}

/**
 * Sending Endpoint
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Endpoint} [options.connected] where te requests are delivered to
 * @param {Endpoint} [options.opposite] endpoint going into the opposite direction
 * @param {Function} [options.opened] called after receiver is present
 */
export class SendEndpoint extends ConnectorMixin(InterceptedEndpoint) {
  constructor(name, owner, options = {}) {
    super(name, owner, options);

    definePropertiesFromOptions(this, options, [
      "opened",
    ]);

    if (isEndpoint(options.connected)) {
      this.connected = options.connected;
    }
  }

  receive(...args) {
    return this[FIRST].receive(...args);
  }

  /**
   * We are always _out_
   * @return {boolean} always true
   */
  get isOut() {
    return true;
  }

  set interceptors(newInterceptors) {
    this.updateInterceptors(newInterceptors, this[CONNECTED]);
  }

  close() {
    if (this[OPENED_STATE]) {
      this[OPENED_STATE](this);
      delete this[OPENED_STATE];
    }
  }

  set connected(newConnected) {
    const oldConnected = this.connected;

    if (newConnected === oldConnected) {
      return;
    }

    if(newConnected !== undefined) {
      if (newConnected === this) {
        throw new Error(
          `Can't connect to myself ${identifier}`
        );
      }  

      if(!newConnected.isIn) {
        throw new Error(
          `Can't connect to none in: ${this.identifier} = ${newConnected.identifier}`
        );  
      }
    }

    this.close();

    this[CONNECTED] = newConnected;

    if (this[FIRST] === oldConnected) {
      this[FIRST] = newConnected;
    } else {
      this[LAST].connected = newConnected;
    }

    if (oldConnected) {
      oldConnected.connected = undefined;
    }

    if (newConnected !== undefined) {
      newConnected.connected = this;

      const nco = newConnected.opposite;
      if (nco && this.opposite) {
        nco.connected = this.opposite;
      }

      if (this.isOpen) {
        this[OPENED_STATE] = this.opened(this);
      }
    }
  }

  get isOpen() {
    return this.isConnected && this.connected.isOpen;
  }

  get isConnected() {
    if (this.hasInterceptors) {
      return this[LAST].isConnected;
    }

    return super.isConnected;
  }

  // TODO why is this required ?
  get connected() {
    return this[CONNECTED];
  }

  get interceptors() {
    return super.interceptors;
  }

  get oppositeFactory() {
    return ReceiveEndpoint;
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

  get oppositeFactory() {
    return ReceiveEndpointDefault;
  }
}

/**
 * check for Endpoint
 * @param {any} object
 * @return {boolean} true if object is an Endpoint
 */
export function isEndpoint(object) {
  return object instanceof Endpoint;
}
