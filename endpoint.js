/* jslint node: true, esnext: true */
/* eslint-env es6 */
/* eslint valid-jsdoc: 2 */

'use strict';

const cnm = require('kronos-interceptor');


class Endpoint {
  /**
   * possible options:
   * - opposite endpoint specify opposite endpoint
   * - createOpposite creates an opposite endpoint
   * @param {Object} options
   */
  constructor(name, owner, options) {
    Object.defineProperty(this, 'name', {
      value: name
    });

    Object.defineProperty(this, 'owner', {
      value: owner
    });

    if (options) {
      if (options.opposite) {
        Object.defineProperty(this, 'opposite', {
          value: options.opposite
        });
        Object.defineProperty(options.opposite, 'opposite', {
          value: this
        });
      }
      if (options.createOpposite) {
        const opposite = this.isIn ? new SendEndpoint(name, owner, {
          opposite: this
        }) : new ReceiveEndpoint(name, owner, {
          opposite: this
        });

        Object.defineProperty(this, 'opposite', {
          value: opposite
        });
      }
    }
  }

  get isDefault() {
    return false;
  }

  toString() {
    return `${this.owner}/${this.name}`;
  }

  get isIn() {
    return false;
  }

  get isOut() {
    return false;
  }

  /**
   * Deliver data flow direction
   * @return {String} delivers data flow direction 'in', 'out' or undefined
   */
  get direction() {
    return this.isIn ? 'in' : this.isOut ? 'out' : undefined;
  }

  /**
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
class InterceptedEndpoint extends Endpoint {

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
   * @return {Array} the interceptors or empty array if none are present
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
   * @param {Array} newInterceptors replaces all interceptors
   */
  set interceptors(newInterceptors) {
    if (newInterceptors === undefined || newInterceptors.length === 0) {
      this._firstInterceptor = undefined;
      this._lastInterceptor = undefined;
    } else {
      this._firstInterceptor = newInterceptors[0];
      this._lastInterceptor = newInterceptors.reduce((previous, current) => previous.connected = current,
        this._firstInterceptor);
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
class ReceiveEndpoint extends InterceptedEndpoint {

  /**
   * Set dummy rejecting receiver
   */
  constructor(name, owner, options) {
    super(name, owner, options);

    this._receive = cnm.rejectingReceiver;
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
   * Currently only endpoints with opposite direction are able to deliver
   * the sending endpoint.
   * @return {SendEndpoint} the sending side
   */
  get sender() {
    const o = this.opposite;
    if (o) {
      const c = o.connected;
      if (c) {
        return c.opposite;
      }
    }
    return undefined;
  }

  get receive() {
    return this._receive;
  }

  /**
   * If we know the sender we will inform him about our open/close state
   * by calling willBeClosed() and hasBeenOpened()
   */
  set receive(receive = cnm.rejectingReceiver) {
    const s = this.sender;

    if (s && s.willBeClosed && receive === cnm.rejectingReceiver) {
      s.willBeClosed();
    }

    if (this.hasInterceptors) {
      this._internalEndpoint.receive = receive;
    } else {
      this._receive = receive;
    }

    if (s && s.hasBeenOpened && receive !== cnm.rejectingReceiver) {
      s.hasBeenOpened();
    }
  }

  set interceptors(newInterceptors) {
    const lastReceive = this.hasInterceptors ? this._internalEndpoint.receive : this.receive;

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
   * @return {boolean} always true
   */
  get isIn() {
    return true;
  }
}

class ReceiveEndpointDefault extends ReceiveEndpoint {
  get isDefault() {
    return true;
  }
}

class SendEndpoint extends cnm.ConnectorMixin(InterceptedEndpoint) {

  /**
   * supported options:
   * - opposite endpoint
   * - hasBeenConnected() called after connected
   * - hasBeenDisconected() called after disconnected
   * - hasBeenOpened() called after receiver is open
   * - willBeClosed() called before receiver is closed
   * @param {Object} options
   */
  constructor(name, owner, options) {
    super(name, owner, options);

    if (options) {
      for (const key of['hasBeenConnected', 'hasBeenDisConnected', 'hasBeenOpened', 'willBeClosed']) {
        if (options[key]) {
          Object.defineProperty(this, key, {
            value: options[key]
          });
        }
      }
    }
  }

  receive(request, formerRequest) {
    return this.connected.receive(request, formerRequest);
  }

  toJSON() {
    const json = super.toJSON();

    if (this.isConnected) {
      const o = this.otherEnd;
      if (o && o.owner) {
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
    const lastConnected = this.hasInterceptors ? this.lastInterceptor.connected : this._connected;

    super.interceptors = newInterceptors;
    if (this.hasInterceptors) {
      this.lastInterceptor.connected = lastConnected;
      this._connected = this.firstInterceptor;
    } else {
      this._connected = lastConnected;
    }
  }

  set connected(e) {
    let oldConnected;

    if (!e) {
      if (this.willBeClosed && this.connected.receiver !== cnm.rejectingReceiver) {
        this.willBeClosed();
      }
    }

    if (this.hasInterceptors) {
      oldConnected = this.lastInterceptor.connected;
      this.lastInterceptor.connected = e;
    } else {
      oldConnected = super.connected;
      super.connected = e;
    }

    if (e) {
      if (e.opposite && this.opposite && e.opposite.connected !== this.opposite) {
        e.opposite.connected = this.opposite;
        if (this.hasBeenOpened && this.connected.receiver !== cnm.rejectingReceiver) {
          this.hasBeenOpened();
        }
      }

      if (this.hasBeenConnected) {
        this.hasBeenConnected();
      }
    } else if (e === undefined) {
      if (this.hasBeenDisConnected) {
        this.hasBeenDisConnected(oldConnected);
      }
    }
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

class SendEndpointDefault extends SendEndpoint {
  get isDefault() {
    return true;
  }
}

exports.Endpoint = Endpoint;
exports.ReceiveEndpoint = ReceiveEndpoint;
exports.ReceiveEndpointDefault = ReceiveEndpointDefault;
exports.SendEndpoint = SendEndpoint;
exports.SendEndpointDefault = SendEndpointDefault;
