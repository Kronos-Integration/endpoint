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

  connectionNamesWithStates(options={includeRuntimeInfo:true}) {
    return [...this.connections()]
      .map(c => {
        if(!options.includeRuntimeInfo) {
          return c.identifier;
        }
        const states = [];
        if(this.getConnectionState(c)) states.push('T');
        if(c.getConnectionState(this)) states.push('C');
        return states.length ? `${c.identifier}[${states.join('')}]` : c.identifier;
      }
      )
      .sort();
  }

  toString() {
    const entries = Object.entries(this.toStringAttributes).map(
      ([name, prop]) => `${name}=${this[prop]}`
    );

    const cs = this.connectionNamesWithStates();

    if (cs.length) {
      entries.push(`connected=${cs}`);
    }

    if (this.direction) {
      entries.push(this.direction);
    }

    if (this.isOpen) {
      entries.push("open");
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
      includeRuntimeInfo: true,
      includeDefaults: true,
      includeConfig: true
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

    if (this.isOpen) {
      json.open = true;
    }

    const cs = this.connectionNamesWithStates(options);

    switch (cs.length) {
      case 0:
        break;
      case 1:
        json.connected = cs[0];
        break;
      default:
        json.connected = cs;
    }

    if (this.interceptors.length > 0) {
      json.interceptors = this.interceptors.map(i => i.toJSONWithOptions(options));
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

  get isOpen() {
    return this[RECEIVE] !== undefined;
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

  openConnection(other) {
    const state = this.getConnectionState(other);

    if (state === undefined) {
      if (other.isOpen) {
        this.setConnectionState(other, this.didConnect(this, other));
      } else {
        if (this.owner) {
          this.owner.warn(`Opening ${this} connected is not open`);
        }
      }
    }
  }

  closeConnection(other) {
    const state = this.getConnectionState(other);
    if (state !== undefined) {
      state();
      this.setConnectionState(other, undefined);
    }
  }

  *connections() {}

  addConnection() {}

  removeConnection() {}

  getConnectionState() {}

  setConnectionState() {}

  didConnect() {}
}
