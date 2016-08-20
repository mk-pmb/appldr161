/*jslint indent: 2, maxlen: 80, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var D = require('lib-demo-util-160404')(), mf = require('../m.js'),
  fakeWin = require('./lib_fakewin.js');
D.expect.verbose = true;

fakeWin.fakeScriptTag.src = 'http://example.net/' +
  module.filename.split(/\//).slice(-3).join('/');
mf.setWindow(fakeWin);

D.result = fakeWin.fakeScriptTag.src;
D.expect('regexp', /\.net\/[a-z\-]+\/|$:$0/);
  //= `+ (string) … → ".net/cjs-minifake/"`

console.error(':TODO: more tests!');









D.ok(module);     //= "+OK all resolver.demo tests passed."
