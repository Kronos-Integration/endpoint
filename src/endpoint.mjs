import { Interceptor } from "@kronos-integration/interceptor";

/**
 * @typedef {Object} ConnectionState
 */

/**
 * Connection endpoint.
 */
export class Endpoint {
  /**
   * @param {string} name endpoint name
   * @param {Object} owner of the endpoint (service)
   * @param {Object} options
   * @param {function(Endpoint,Endpoint):void|undefined} [options.didConnect] called after receiver is present
   * @param {Interceptor[]|string[]|undefined} [options.interceptors] interceptors
   */
  constructor(name, owner, options) {
    this.name = name;
    this.owner = owner;

    if (options?.didConnect !== undefined) {
      this.didConnect = options.didConnect;
    }

    this.interceptors = instanciateInterceptors(
      options?.interceptors,
      this.owner
    );
  }

  /**
   * Name as presented for humans.
   * @return {string}
   */
  get displayName() {
    return this.name;
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
   * Indicate whatever we are a dummy endpoint.
   * Dummy endpoints are used duiring construction of the endpoint mesh.
   * @return {boolean} false
   */
  get isDummy() {
    return false;
  }

  /**
   * Mapping of properties used in toString.
   * @return {Object}
   */
  get toStringAttributes() {
    return {};
  }

  /**
   *
   * @param {Object} options
   */
  connectionNamesWithStates(options = { includeRuntimeInfo: true }) {
    return [...this.connections()]
      .map(c => {
        if (!options.includeRuntimeInfo) {
          return c.identifier;
        }
        const states = [];
        if (this.getConnectionState(c)) states.push("T");
        if (c.getConnectionState(this)) states.push("C");
        return states.length
          ? `${c.identifier}[${states.join("")}]`
          : c.identifier;
      })
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

    if (this.isDummy) {
      entries.push("dummy");
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
    return false;
  }

  /**
   * @return {boolean} false
   */
  get isOut() {
    return false;
  }

  /**
   * Deliver data flow direction.
   * @return {string|undefined} delivers data flow direction 'in', 'out', 'inout' or undefined
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
      includeConfig: true,
      includePrivate: false
    });
  }

  /**
   * Additional attributes to present in json output.
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

    if (this.isDummy) {
      json.dummy = true;
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
      json.interceptors = this.interceptors.map(i =>
        i.toJSONWithOptions(options)
      );
    }

    return json;
  }

  /**
   * @return {boolean} true if there is at least one interceptor assigned
   */
  get hasInterceptors() {
    return this.interceptors.length > 0;
  }

  get isOpen() {
    return false;
  }

  /**
   * Can we form a connection to the other side.
   * in to out and out to in.
   * @param {Endpoint} other
   * @return {boolean} true if we can be connected to the other endpoint
   */
  connectable(other) {
    return (this.isIn && other.isOut) || (this.isOut && other.isIn);
  }

  /**
   * @return {boolean} true if there is at least one connection
   */
  get hasConnections() {
    for (const c of this.connections()) {
      return true;
    }

    return false;
  }

  /**
   * Are we connected to a endpoint.
   * @param {Endpoint} other to check for the connection
   * @return {boolean} true if there is a connection to the other endpoint
   */
  isConnected(other) {
    for (const c of this.connections()) {
      if (c === other) {
        return true;
      }
    }

    return false;
  }

  /**
   * Actually start with the communication.
   * @param {Endpoint} other
   * @param {boolean} [backpointer] true if this is the call from back call from the other side
   */
  openConnection(other, backpointer) {
    if (other !== undefined) {
      const state = this.getConnectionState(other);

      if (state === undefined) {
        if (other.isOpen) {
          this.setConnectionState(other, this.didConnect(this, other));
        } else {
          if (this.owner) {
            this.owner.warn(`Opening ${this}: ${other} is not open`);
          }
        }
      }

      if (!backpointer) {
        other.openConnection(this, true);
      }
    }
  }

  /**
   * Actually stop the communication.
   * @param {Endpoint} other
   * @param {boolean} [backpointer] true if this is the call from back call from the other side
   */
  closeConnection(other, backpointer) {
    if (other !== undefined) {
      const state = this.getConnectionState(other);
      if (state !== undefined) {
        state();
        this.setConnectionState(other, undefined);
      }

      if (!backpointer) {
        other.closeConnection(this, true);
      }
    }
  }

  /**
   * Opens all connections.
   */
  openConnections() {
    for (const c of this.connections()) {
      this.openConnection(c, false);
    }
  }

  /**
   * Closes all connections.
   */
  closeConnections() {
    for (const c of this.connections()) {
      this.closeConnection(c, false);
    }
  }

  /**
   * @return {Iterable<Endpoint>}
   */
  *connections() {}

  /**
   *
   * @param {Endpoint} connection
   * @param {boolean} [backpointer] true if this is the call form back call from the other side
   */
  addConnection(connection, backpointer) {}

  /**
   * Actually stop the communication.
   * @param {Endpoint} other
   * @param {boolean} [backpointer] true if this is the call form back call from the other side
   */
  removeConnection(other, backpointer) {}

  /**
   * Deliver state for a given connection.
   * @param {Endpoint} other
   * @return {ConnectionState}
   */
  getConnectionState(other) {}

  /**
   * Set state for a given connection.
   * @param {Endpoint} other
   * @param {ConnectionState} state
   */
  setConnectionState(other, state) {}

  /**
   *
   * @param {Endpoint} endpoint
   * @param {Endpoint} other
   */
  didConnect(endpoint, other) {}

  get receivingInterceptors() {
    return [];
  }
}

/**
 * Check for Endpoint.
 * @param {any} object to be checked
 * @return {boolean} true if object is an Endpoint
 */
export function isEndpoint(object) {
  return object instanceof Endpoint;
}

/**
 * Instanciate interceptors from its definitions.
 * @param {Interceptor[]|string[]|undefined} interceptors
 * @param {Object} owner
 * @return {Interceptor[]}
 */
export function instanciateInterceptors(interceptors, owner) {
  if (interceptors === undefined) return [];

  return (Array.isArray(interceptors) ? interceptors : [interceptors])
    .map(interceptor => {
      if (interceptor instanceof Interceptor) {
        return interceptor;
      }
      switch (typeof interceptor) {
        case "function":
          return new interceptor();
        case "string":
          return owner.instantiateInterceptor({ type: interceptor });
      }

      switch (typeof interceptor.type) {
        case "function":
          return new interceptor.type(interceptor);
        case "string":
          return owner.instantiateInterceptor(interceptor);
      }
    })
    .filter(i => i);
}
