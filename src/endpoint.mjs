import { Interceptor } from "@kronos-integration/interceptor";

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
  interceptors = [];

  constructor(name, owner, options = {}) {
    const properties = {
      name: { value: name },
      owner: { value: owner }
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

    const is = [...this.connections()].map(c => c.identifier);

    if (is.length) {
      entries.push(`connected=${is}`);
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

    const is = [...this.connections()].map(c => c.identifier);

    switch (is.length) {
      case 0:
        break;
      case 1:
        json.connected = is[0];
        break;
      default:
        json.connected = is;
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

  connectable(other) {
    return (this.isIn && other.isOut) || (this.isOut && other.isIn);
  }

  get hasConnections() {
    for (const c of this.connections()) {
      return true;
    }

    return false;
  }

  isConnected(other) {
    for (const c of this.connections()) {
      if (c === other) {
        return true;
      }
    }

    return false;
  }

  *connections() {}

  addConnection() {}

  removeConnection() {}

  didConnect() {}
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
  _connections = new Map();

  constructor(name, owner, options={}) {
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

  addConnection(other, backpointer) {
    if (!this.connectable(other)) {
      throw new Error(
        `Can't connect ${this.direction} to ${other.direction}: ${this.identifier} = ${other.identifier}`
      );
    }

    if (!this._connections.get(other)) {
      this._connections.set(other, this.didConnect(this, other));
      if (!backpointer) {
        other.addConnection(this, true);
      }
    }
  }

  removeConnection(other,backpointer) {
    const state = this._connections.get(other);
    if (state) {
      this._connections.delete(other);
      state();
    }

    if(!backpointer) {
      other.removeConnection(this,true);
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

/**
 * Sending Endpoint
 * @param {string} name endpoint name
 * @param {Object} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Endpoint} [options.connected] where te requests are delivered to
 * @param {Function} [options.didConnect] called after receiver is present
 */
export class SendEndpoint extends Endpoint {
  constructor(name, owner, options={}) {
    super(name, owner, options);
    if (isEndpoint(options.connected)) {
      this.addConnection(options.connected);
    }
  }

  /**
   * We are always _out_
   * @return {boolean} always true
   */
  get isOut() {
    return true;
  }

  _connection;
  _state;

  addConnection(other, backpointer) {
    if (this._connection === other) {
      return;
    }

    if (!this.connectable(other)) {
      throw new Error(
        `Can't connect ${this.direction} to ${other.direction}: ${this.identifier} = ${other.identifier}`
      );
    }

    if (this._state !== undefined) {
      this._state();
      this._state = undefined;
    }

    this._connection = other;

    if (!backpointer) {
      other.addConnection(this, true);
    }

    this._state = this.didConnect(this, other);
  }

  removeConnection(other,backpointer) {
    if (this._connection === other) {
      if (this._state) {
        this._state();
        this._state = undefined;
      }
      if(!backpointer) {
        other.removeConnection(this,true);
      }
      this._connection = undefined;
    }
  }

  *connections() {
    if (this._connection) {
      yield this._connection;
    }
  }

  async send(...args) {
    const interceptors = this.interceptors;
    let c = 0;

    const next = async (...args) =>
      c >= interceptors.length
        ? this._connection.receive(...args)
        : interceptors[c++].receive(this, next, ...args);

    return next(...args);
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
