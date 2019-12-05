import { Interceptor } from "@kronos-integration/interceptor";

const OPEN = Symbol("open");
const DISCONNECTING = Symbol("disconnecting");
const RECEIVE = Symbol("receive");

/**
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service)
 * @param {Object} options
 * @param {Function} [options.didConnect] called after receiver is present
 * @param {Function} [options.receive] reciever function
 * @param {Interceptor|Object[]} [options.interceptors] interceptors
 */
export class Endpoint {
  constructor(name, owner, options = {}) {
    let connected;
    let interceptors = [];

    const properties = {
      name: { value: name },
      owner: { value: owner },
      interceptors: {
        set(value) {
          interceptors = value;
        },
        get() {
          return interceptors;
        }
      },
      _connected: {
        set(other) {
          if (this.prepareConnection(other)) {
            connected = other;
            if (other !== undefined) {
              other.addConnection(this);
              
              if (this[OPEN]) {
                throw new Error(`Has still open state ${this.identifier}`);
              }
              this[OPEN] = this.didConnect(this);
            }
          }
        },
        get() {
          return connected;
        }
      }
    };

    if (options.didConnect !== undefined) {
      properties.didConnect = {
        value: options.didConnect
      };
    }

    Object.defineProperties(this, properties);

    this.instanciateInterceptors(options.interceptors);

    if (options.receive) {
      this.receive = options.receive;
    }

    if (isEndpoint(options.connected)) {
      this.addConnection(options.connected);
    }
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
    return {};
  }

  toString() {
    const entries = Object.entries(this.toStringAttributes).map(
      ([name, prop]) => `${name}=${this[prop]}`
    );

    if (this._connected) {
      entries.push(`connected=${this._connected.identifier}`);
    }

    if (this.direction) {
      entries.push(this.direction);
    }

    return entries.length
      ? `${this.identifier}(${entries.join(",")})`
      : this.identifier;
  }

  get identifier() {
    return this.owner ? `service(${this.owner.name}).${this.name}` : this.name;
  }

  /**
   * @return {boolean} false
   */
  get isIn() {
    return this[RECEIVE] !== undefined;
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
  get isConnected() {
    return this.connected !== undefined;
  }

  set connected(value)
  {
    throw new Error("no longer supported use addConnection/removeConnection");
  }

  get connected()
  {
    throw new Error("no longer supported use isConnected");
   // return undefined;
  }


  addConnection(other) {
    this._connected = other;
  }

  removeConnection(other) {
    if (this._connected === other) {
      this._connected = undefined;
    }
  }

  isConnected(other)
  {
    return this._connected === other;
  }

  didConnect() {}

  connectable(other) {
    return (this.isIn && other.isOut) || (this.isOut && other.isIn);
  }

  /**
   *
   * @param {Endpoint} other
   * @returns {boolean} true if connection can continue
   */
  prepareConnection(other) {
    if (this.isConnected(other) || this[DISCONNECTING]) {
      return false;
    }

    if (other !== undefined) {
      if (!this.connectable(other)) {
        throw new Error(
          `Can't connect ${this.direction} to ${other.direction}: ${this.identifier} = ${other.identifier}`
        );
      }
    }

    if (this._connected) {
      this[DISCONNECTING] = true;
      this._connected.removeConnection(this);
      delete this[DISCONNECTING];
    }

    if (this[OPEN]) {
      this[OPEN](this);
      delete this[OPEN];
    }

    return true;
  }

  /**
   * Deliver data flow direction
   * @return {string} delivers data flow direction 'in', 'out', 'inout' or undefined
   */
  get direction() {
    if (this.isIn) {
      return this.isOut ? "inout" : "in";
    }

    return this.isOut ? "out" : undefined;
  }

  toJSON() {
    return this.toJSONWithOptions({
      includeDefaults: false,
      includeConfig: false
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

    const c = this._connected;
    if (c) {
      json.connected = c.identifier;
    }

    if (this.interceptors.length > 0) {
      json.interceptors = this.interceptors.map(i => i.toJSON());
    }

    return json;
  }

  /**
   * @return {boolean} true if there is at least one interceptor assigned
   */
  get hasInterceptors() {
    return this.interceptors.length > 0;
  }

  instanciateInterceptors(interceptors) {
    if (interceptors === undefined) return;

    this.interceptors = interceptors.map(interceptor => {
      if (interceptor instanceof Interceptor) {
        return interceptor;
      }
      if (typeof interceptor === "function") {
        return new interceptor();
      }
      return new interceptor.type(interceptor);
    });
  }

  async send(...args) {
    if (this._connected === undefined || this._connected.receive === undefined) {
      console.log(
        "SEND",
        this.identifier,
        this.isOut,
        this.isIn,
        this._connected
      );
      return;
    }
    const interceptors = this.interceptors;
    let c = 0;

    const next = async (...args) =>
      c >= interceptors.length
        ? this._connected.receive(...args)
        : interceptors[c++].receive(this, next, ...args);

    return next(...args);
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
   * @param {Function} receive
   */
  set receive(receive) {
    this[RECEIVE] = receive;
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
export class ReceiveEndpoint extends Endpoint {
  /**
   * We are always _in_
   * @return {boolean} always true
   */
  get isIn() {
    return true;
  }
}

/**
 * Sending Endpoint
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Endpoint} [options.connected] where te requests are delivered to
 * @param {Function} [options.didConnect] called after receiver is present
 */
export class SendEndpoint extends Endpoint {
  /**
   * We are always _out_
   * @return {boolean} always true
   */
  get isOut() {
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

/**
 * check for Endpoint
 * @param {any} object
 * @return {boolean} true if object is an Endpoint
 */
export function isEndpoint(object) {
  return object instanceof Endpoint;
}
