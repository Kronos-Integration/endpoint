[![npm](https://img.shields.io/npm/v/kronos-endpoint.svg)](https://www.npmjs.com/package/kronos-endpoint)
[![Greenkeeper](https://badges.greenkeeper.io/Kronos-Integration/kronos-endpoint.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/Kronos-Integration/kronos-endpoint)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Build Status](https://secure.travis-ci.org/Kronos-Integration/kronos-endpoint.png)](http://travis-ci.org/Kronos-Integration/kronos-endpoint)
[![bithound](https://www.bithound.io/github/Kronos-Integration/kronos-endpoint/badges/score.svg)](https://www.bithound.io/github/Kronos-Integration/kronos-endpoint)
[![codecov.io](http://codecov.io/github/Kronos-Integration/kronos-endpoint/coverage.svg?branch=master)](http://codecov.io/github/Kronos-Integration/kronos-endpoint?branch=master)
[![Coverage Status](https://coveralls.io/repos/Kronos-Integration/kronos-endpoint/badge.svg)](https://coveralls.io/r/Kronos-Integration/kronos-endpoint)
[![Known Vulnerabilities](https://snyk.io/test/github/Kronos-Integration/kronos-endpoint/badge.svg)](https://snyk.io/test/github/Kronos-Integration/kronos-endpoint)
[![GitHub Issues](https://img.shields.io/github/issues/Kronos-Integration/kronos-endpoint.svg?style=flat-square)](https://github.com/Kronos-Integration/kronos-endpoint/issues)
[![Stories in Ready](https://badge.waffle.io/Kronos-Integration/kronos-endpoint.svg?label=ready&title=Ready)](http://waffle.io/Kronos-Integration/kronos-endpoint)
[![Dependency Status](https://david-dm.org/Kronos-Integration/kronos-endpoint.svg)](https://david-dm.org/Kronos-Integration/kronos-endpoint)
[![devDependency Status](https://david-dm.org/Kronos-Integration/kronos-endpoint/dev-status.svg)](https://david-dm.org/Kronos-Integration/kronos-endpoint#info=devDependencies)
[![docs](http://inch-ci.org/github/Kronos-Integration/kronos-endpoint.svg?branch=master)](http://inch-ci.org/github/Kronos-Integration/kronos-endpoint)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![downloads](http://img.shields.io/npm/dm/kronos-endpoint.svg?style=flat-square)](https://npmjs.org/package/kronos-endpoint)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

kronos-endpoint
=====
Named communication (end)-points inside of kronos

![request forwarding](doc/images/requestForwarding.png "Requests Forwading")

# API Reference

* <a name="set"></a>

## set()
If we know the sender we will inform him about our open/close state
by calling willBeClosed() and hasBeenOpened()

**Kind**: global function  

* <a name="<anonymous>..Endpoint"></a>

## &lt;anonymous&gt;~Endpoint(options)
possible options:
- opposite endpoint specify opposite endpoint
- createOpposite creates an opposite endpoint

**Kind**: inner method of <code>&lt;anonymous&gt;</code>  

| Param | Type |
| --- | --- |
| options | <code>Object</code> | 


* <a name="<anonymous>..ReceiveEndpoint"></a>

## &lt;anonymous&gt;~ReceiveEndpoint()
Set dummy rejecting receiver

**Kind**: inner method of <code>&lt;anonymous&gt;</code>  

* <a name="<anonymous>..SendEndpoint"></a>

## &lt;anonymous&gt;~SendEndpoint(options)
supported options:
- opposite endpoint
- hasBeenConnected() called after connected
- hasBeenDisconected() called after disconnected
- hasBeenOpened() called after receiver is open
- willBeClosed() called before receiver is closed

**Kind**: inner method of <code>&lt;anonymous&gt;</code>  

| Param | Type |
| --- | --- |
| options | <code>Object</code> | 


* * *

install
=======

With [npm](http://npmjs.org) do:

```shell
npm install kronos-endpoint
```

license
=======

BSD-2-Clause
