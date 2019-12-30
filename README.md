[![Build Status](https://secure.travis-ci.org/Kronos-Integration/endpoint.png)](http://travis-ci.org/Kronos-Integration/endpoint)
[![codecov.io](http://codecov.io/github/Kronos-Integration/endpoint/coverage.svg?branch=master)](http://codecov.io/github/Kronos-Integration/endpoint?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![downloads](http://img.shields.io/npm/dm/@kronos-integration/endpoint.svg?style=flat-square)](https://npmjs.org/package/@kronos-integration/endpoint)
[![GitHub Issues](https://img.shields.io/github/issues/Kronos-Integration/endpoint.svg?style=flat-square)](https://github.com/Kronos-Integration/endpoint/issues)
[![Greenkeeper](https://badges.greenkeeper.io/Kronos-Integration/endpoint.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/Kronos-Integration/endpoint/badge.svg)](https://snyk.io/test/github/Kronos-Integration/endpoint)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/@kronos-integration/endpoint)](https://bundlephobia.com/result?p=@kronos-integration/endpoint)
[![npm](https://img.shields.io/npm/v/@kronos-integration/endpoint.svg)](https://www.npmjs.com/package/@kronos-integration/endpoint)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/Kronos-Integration/endpoint)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

# kronos-endpoint

Named communication (end)-points inside of kronos

![request forwarding](doc/images/requestForwarding.svg "Requests Forwading"){:height="310pt" width="325pt"}

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [isEndpoint](#isendpoint)
    -   [Parameters](#parameters)
-   [Endpoint](#endpoint)
    -   [Parameters](#parameters-1)
    -   [isDefault](#isdefault)
    -   [toStringAttributes](#tostringattributes)
    -   [isIn](#isin)
    -   [isOut](#isout)
    -   [direction](#direction)
    -   [jsonAttributes](#jsonattributes)
    -   [hasInterceptors](#hasinterceptors)
    -   [receive](#receive)
    -   [receive](#receive-1)
        -   [Parameters](#parameters-2)
-   [SendEndpoint](#sendendpoint)
    -   [Parameters](#parameters-3)
    -   [isOut](#isout-1)
-   [ReceiveEndpoint](#receiveendpoint)
    -   [Parameters](#parameters-4)
    -   [isIn](#isin-1)
-   [SendEndpointDefault](#sendendpointdefault)
    -   [isDefault](#isdefault-1)
-   [ReceiveEndpointDefault](#receiveendpointdefault)
    -   [isDefault](#isdefault-2)
-   [ReceiveEndpointSelfConnectedDefault](#receiveendpointselfconnecteddefault)

## isEndpoint

check for Endpoint

### Parameters

-   `object` **any** 

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** true if object is an Endpoint

## Endpoint

### Parameters

-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** endpoint name
-   `owner` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** of the endpoint (service)
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)
    -   `options.didConnect` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** called after receiver is present
    -   `options.receive` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** reciever function
    -   `options.interceptors` **(Interceptor | [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>)?** interceptors

### isDefault

Indicate whatever we are a default endpoint.
Default means buildin.

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** false

### toStringAttributes

mapping of properties used in toString

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

### isIn

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** false

### isOut

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** false

### direction

Deliver data flow direction

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** delivers data flow direction 'in', 'out', 'inout' or undefined

### jsonAttributes

additional Attributes to present in json output

### hasInterceptors

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** true if there is at least one interceptor assigned

### receive

get the receive function

Returns **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** 

### receive

Set the receive function

#### Parameters

-   `receive` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** 

## SendEndpoint

**Extends Endpoint**

Sending Endpoint.
Can only hold one connection.
Back connections to any further endpoints will not be established

### Parameters

-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** endpoint name
-   `owner` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** of the endpoint (service or step)
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)
    -   `options.connected` **[Endpoint](#endpoint)?** where te requests are delivered to
    -   `options.didConnect` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** called after receiver is present

### isOut

We are always _out_

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** always true

## ReceiveEndpoint

**Extends Endpoint**

Receiving Endpoint
by default a dummy rejecting receiver is assigned

### Parameters

-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** endpoint name
-   `owner` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** of the endpoint (service or step)
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)
    -   `options.receive` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** reciever function
    -   `options.connected` **[Endpoint](#endpoint)?** sending side

### isIn

We are always _in_

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** always true

## SendEndpointDefault

**Extends SendEndpoint**

Send Endpoint acting as a default endpoints

### isDefault

We are a default endpoint

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** always true

## ReceiveEndpointDefault

**Extends ReceiveEndpoint**

Receive Endpoint acting as a default endpoints

### isDefault

We are a default endpoint

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** always true

## ReceiveEndpointSelfConnectedDefault

**Extends ReceiveEndpointDefault**

Receiving endpoint wich can also send to itself

# install

With [npm](http://npmjs.org) do:

```shell
npm install kronos-endpoint
```

# license

BSD-2-Clause
