/*jslint indent: 2, maxlen: 80, browser: true */
/* -*- tab-width: 2 -*- */
/*globals window: true, define: true */
(function factory() {
  'use strict';
  var EX = {}, modReg = Object.create(null);
  function fail(msg) { throw new Error(msg); }
  EX.urlLib = {};

  EX.window = false;
  EX.setWindow = function (win) {
    var byTag = ((win || false).document || false).getElementsByTagName;
    if ((typeof byTag) !== 'function') {
      fail('New window object must provide .document.getElementsByTagName');
    }
    EX.window = win;
    if ((win.navigator || false).vendor === undefined) { return; }
    if (win.require || win.module || win.exports) { return; }
    if (!win.define) { win.define = EX.define; }
    win.module = EX.module;
    win.require = EX.require;
    Object.defineProperty(win, 'exports',
      { configurable: false, enumerable: true, get: EX.getExports });
  };
  EX.factory = factory;   // make a new instance that can use another window

  EX.registeredModules = function () { return modReg; };

  EX.require = function req(opts, modUrl) {
    modUrl = EX.require.resolve(opts, modUrl);
    opts = modReg[modUrl];
    if (opts) { return opts; }
    fail('reqire: module not available: ' + modUrl);
  };

  EX.require.resolve = function (opts, modSpec) {
    var modUrl, foundWithSuffix = '';
    if ((typeof opts) === 'string') {
      modSpec = opts;
      opts = {};
    }
    if ((!modUrl) && modSpec.match(/^\.{1,2}/)) {
      modUrl = EX.urlLib.resolveRelativePath((opts.from || ''), modSpec);
    }
    if ((!modUrl) && (!modSpec.match(/^[a-z]+:\//))) {
      modUrl = EX.urlLib.splitPath(modSpec);
      modUrl[0] = (modReg[':' + modUrl[0]] || modUrl);
    }
    if (!modUrl) { fail('unsupported module spec: ' + modSpec); }
    if (modReg[modUrl]) { return modUrl; }
    (opts.suffixes || EX.require.suffixes).forEach(function (sfx) {
      if (foundWithSuffix) { return; }
      sfx = modUrl + sfx;
      if (modReg[sfx]) { foundWithSuffix = sfx; }
    });
    if (foundWithSuffix) { return foundWithSuffix; }
    fail('Module not available: ' + JSON.stringify(modSpec) +
      (modSpec === modUrl ? '' : ' = ' + JSON.stringify(modUrl)));
  };
  EX.require.suffixes = ['.js', '.json'];

  EX.urlLib.resolveRelativePath = function (from, destPath) {
    var destSub;
    if (!from) {
      try {
        from = EX.guessModuleUrl(false);
      } catch (modErr) {
        return fail('Cannot resolveRelativePath(' + JSON.stringify(destPath)
          + '): cannot guess origin: ' + String(modErr.message || modErr));
      }
    }
    from = EX.urlLib.splitServerRelPath(from);
    destSub = EX.urlLib.parentDir((from.relPath), Array);
    while (destSub[0] === '.') { destSub.shift(); }
    destPath = EX.urlLib.splitPath(destPath);
    destPath.forEach(function (dir) {
      if ((dir === '..') && (destSub.length > 0)) { destSub.pop(); }
      if ((dir === '') || EX.rgxNonDotChar.exec(dir)) { destSub.push(dir); }
    });
    destSub = destSub.join('/');
    if (destSub[0] !== '/') { destSub = '/' + destSub; }
    return from.origin + destSub;
  };

  EX.rgxNonDotChar = /[\x00-\-\/-\uFFFF]/;

  EX.urlLib.splitServerRelPath = function (url) {
    /* For simple URIs, this split should be roughly the same as
    /  location.{origin,pathname}. However, for URLs with server names
    /  in them (e.g. Wayback machine), the origin here part is greedy,
    /  in order to ensure the relPath stays inside one server even when
    /  proxied or archived. If you want cross-domain loading, specify
    /  a full URL instead of relative paths.  */
    url = String(url).split(/\b([a-z]+:\/+[\x00-\.0-\uFFFF]*)\/?/);
    url.rel = url.pop();
    return { origin: url.join(''), relPath: url.rel };
  };

  EX.urlLib.splitPath = function (path) {
    return String(path || '').split(/\/(?:\.\/)*/);
  };

  EX.urlLib.parentDir = function (path, fmt) {
    path = EX.urlLib.splitPath(path).slice(0, -1);
    if (fmt === Array) { return path; }
    return (path.legth > 0 ? path.join('/') : '.');
  };

  EX.getExports = function () {
    var modUrl = EX.guessModuleUrl(true);
    // ^-- guessModuleUrl will also ensure there's at least an empty object.
    return modReg[modUrl];
  };

  EX.guessModuleUrl = function guessModuleUrlFromScriptTag(registerModName) {
    var sTag = EX.guessActiveScriptTag(), modName,
      modUrl = EX.cutoffQueryHash(sTag.src || EX.doc().URL);
    if (!modUrl) { fail('guessModuleUrlFromScriptTag(): no url'); }
    if (modReg[modUrl]) {
      // we've seen it before, no need to guess its name again.
      return modUrl;
    }
    modReg[modUrl] = {};
    if (!registerModName) { return modUrl; }
    modName = String(sTag.getAttribute('modname') || '');
    if (modName.match(/^\W/)) { return modUrl; }
    if (!modName) { modName = EX.guessModuleNameFromFilePath(modUrl); }
    if (modName) {
      if (!modReg[':' + modName]) { modReg[':' + modName] = modUrl; }
    }
    return modUrl;
  };

  EX.module = Object.create(null, {
    filename: { enumerable: true,
      get: function () { return EX.guessModuleUrl(false); } },
    exports: { get: EX.getExports,
      set: function (exp) { modReg[EX.guessModuleUrl(true)] = exp; } },
  });

  EX.arrLast = function (o, i) { return (o[o.length - (i || 1)] || false); };

  EX.doc = function () {
    var doc = (EX.window || false).document;
    if ((doc && typeof doc) === 'object') { return doc; }
    fail('Supply a window via .setWindow() first');
  };

  EX.guessActiveScriptTag = function guessActiveScriptTag() {
    var st = EX.arrLast(EX.doc().getElementsByTagName('script'));
    if (st) { return st; }
    fail('Unable to guessActiveScriptTag()');
  };

  EX.cutoffQueryHash = function (fullUrl) {
    if (fullUrl instanceof Object) { fullUrl = fullUrl.href || fullUrl.src; }
    return String(fullUrl || '').split(/#|\?/)[0];
  };

  EX.guessModuleNameFromFilePath = function (modFile) {
    var modName;
    modFile = EX.arrLast(modFile.split(/[\/_](mod|module|lib)s?\//
      )).replace(/([\._\-](amd|node|min|dev)|)\.js$/, '');
    modFile = EX.urlLib.splitPath(modFile);
    modName = (((modFile.length === 1) && modFile[0])
      || EX.arrLast(modFile, 2) || '');
    if (modName.match(/^(lib|impl|src|js)$/)) { return ''; }
    return modName;
  };



  if (((typeof window) === 'object') && window) { EX.setWindow(window); }

  //$__UMD_EXPORT__$(EX)
  (((typeof module) === 'object') && ((module || false
    ).exports instanceof Object) ? module : {}).exports = EX;
  if (((typeof define) === 'function') && define.amd) { define(EX); }
}());
