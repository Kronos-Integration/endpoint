import { ConnectorMixin, rejectingReceiver } from 'kronos-interceptor';
import { definePropertiesFromOptions } from './util';

/**
 * @param {string} name endpoint name
 * @param {Objects} owner of the endpoint (service or step)
 * @param {Object} options
 * @param {Endpoint} options.opposite opposite endpoint
 * @param {boolean} options.createOpposite creates an opposite endpoint
 */
export class Endpoint {
  constructor(name, owner, options = {}) {
    Object.defineProperties(this, {
      name: { value: name },
      owner: { value: owner }
    });

    if (options.opposite !== undefined) {
      Object.defineProperty(this, 'opposite', {
        value: options.opposite
      });
      Object.defineProperty(options.opposite, 'opposite', {
        value: this
      });
    } else if (options.createOpposite) {
      const opposite = new (this.isIn ? SendEndpoint : ReceiveEndpoint)(
        name,
        owner,
        {
          opposite: this
        }
      );

      Object.defineProperty(this, 'opposite', {
        value: opposite
      });
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

  toString() {
    return `${this.owner}/${this.name}(connected=${this.isConnected},open=${
      this.isOpen
    })`;
  }

  get identifier() {
    return this.owner.endpointIdentifier(this);
  }

  get isIn() {
    return false;
  }

  get isOut() {
    return false;
  }

  get isOpen() {
    return false;
  }

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
    return this.isIn ? 'in' : this.isOut ? 'out' : undefined;
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
    return this._firstInterceptor !== undefined;
  }

  get firstInterceptor() {
    return this._firstInterceptor;
  }

  get lastInterceptor() {
    return this._lastInterceptor;
  }

  /**
   * Deliver arry of all assigned interceptors
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
      this._firstInterceptor = undefined;
      this._lastInterceptor = undefined;
    } else {
      this._firstInterceptor = newInterceptors[0];
      this._lastInterceptor = newInterceptors.reduce(
        (previous, current) => (previous.connected = current),
        this._firstInterceptor
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
 */
export class ReceiveEndpoint extends InterceptedEndpoint {
  /**
   * Set dummy rejecting receiver
   */
  constructor(name, owner, options) {
    super(name, owner, options);

    this._receive = rejectingReceiver;
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
    return this._sender;
  }

  set sender(sender) {
    this._sender = sender;
  }

  get receive() {
    return this._receive;
  }

  /**
   * Are we able to receive requests
   * @return {boolean} true if we are able to receive requests
   */
  get isOpen() {
    return (
      (this.hasInterceptors
        ? this._internalEndpoint.receive
        : this._receive) !== rejectingReceiver
    );
  }

  /**
   * If we know the sender we will inform him about our open/close state
   * by calling willBeClosed() and hasBeenOpened()
   */
  set receive(receive = rejectingReceiver) {
    const s = this.sender;

    if (s && receive === rejectingReceiver) {
      s.willBeClosed();
    }

    if (this.hasInterceptors) {
      this._internalEndpoint.receive = receive;
    } else {
      this._receive = receive;
    }

    if (s && s.isOpen) {
      s.hasBeenOpened();
    }
  }

  set interceptors(newInterceptors) {
    const lastReceive = this.hasInterceptors
      ? this._internalEndpoint.receive
      : this.receive;

    super.interceptors = newInterceptors;

    if (this.hasInterceptors) {
      if (!this._internalEndpoint) {
        let internalReceive = lastReceive;
        this._internalEndpoint = Object.create(this, {
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

      this.lastInterceptor.connected = this._internalEndpoint;
      this._receive = request => this.firstInterceptor.receive(request);
    } else {
      this._receive = lastReceive;
    }
  }

  /**
   * We are always 'in'
   * @return {boolean} always true
   */
  get isIn() {
    return true;
  }
}

export class ReceiveEndpointDefault extends ReceiveEndpoint {
  get isDefault() {
    return true;
  }
}

/**
 * @param {Object} options
 * @param {Endpoint} options.opposite
 * @param {Function} options.hasBeenConnected called after connected
 * @param {Function} options.hasBeenDisconected called after disconnected
 * @param {Function} options.hasBeenOpened called after receiver is open
 * @param {Function} options.willBeClosed called before receiver is closed
 */
export class SendEndpoint extends ConnectorMixin(InterceptedEndpoint) {
  constructor(name, owner, options = {}) {
    super(name, owner, options);

    definePropertiesFromOptions(this, options, [
      'hasBeenConnected',
      'hasBeenDisConnected',
      'hasBeenOpened',
      'willBeClosed'
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

  get isOut() {
    return true;
  }

  set interceptors(newInterceptors) {
    const lastConnected = this.hasInterceptors
      ? this.lastInterceptor.connected
      : this._connected;

    super.interceptors = newInterceptors;
    if (this.hasInterceptors) {
      this.lastInterceptor.connected = lastConnected;
      this._connected = this.firstInterceptor;
    } else {
      this._connected = lastConnected;
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
    return this._connected;
  }
  get interceptors() {
    return super.interceptors;
  }
  get otherEnd() {
    return super.otherEnd;
  }
}

export class SendEndpointDefault extends SendEndpoint {
  get isDefault() {
    return true;
  }
}
