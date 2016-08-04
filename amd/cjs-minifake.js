/*jslint indent: 2, maxlen: 80, browser: true */
/* -*- tab-width: 2 -*- */
/*global window */
(function () {
  "use strict";

  function req(modName) { return req.modules[modName]; }
  req.modules = Object.create(null);
  window.require = req;

  req.getExports = function () {
    var modName = req.guessModuleName(), exp = req.modules[modName];
    if (!exp) {
      exp = {};
      req.modules[modName] = exp;
    }
    return exp;
  };

  Object.defineProperty(window, 'exports', {
    configurable: false,
    enumerable: true,
    get: req.getExports
  });

  window.module = Object.create(null, {
    filename: { enumerable: true, value: document.URL },
    exports: { get: req.getExports,
      set: function (exp) { req.modules[req.guessModuleName()] = exp; } },
  });

  function getLenMinus(o, i) { return (o[o.length - (i || 1)] || false); }

  req.guessActiveScriptTag = function guessActiveScriptTag() {
    var st = getLenMinus(document.getElementsByTagName('script'));
    if (st) { return st; }
    throw new Error('Unable to guessActiveScriptTag()');
  };

  req.guessModuleName = function guessModuleNameFromScriptTag() {
    var sTag = req.guessActiveScriptTag(), modName;
    modName = String(sTag.getAttribute('modname') || '');
    if (modName) { return modName; }
    modName = (getLenMinus(String(sTag.src || '').split(/#|\?/)[0
      ].split(/\//), 2) || '');
    if (modName) { return modName; }
    throw new Error('Unable to guessModuleNameFromScriptTag()');
  };



}());
