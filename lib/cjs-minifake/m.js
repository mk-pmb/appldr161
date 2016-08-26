/*jslint indent: 2, maxlen: 80, browser: true */
/* -*- tab-width: 2 -*- */
/*globals window: true, define: true */
(function miniFakeFactory() {
  'use strict';
  var EX = {}, modReg = Object.create(null);
  function fail(msg) { throw new Error(msg); }
  EX.urlLib = {};
  (function selfreg(fakeUrl) {
    /* fakeUrl: because we can't detect the script name without a document,
       but also don't want defer selfreg until a window and document is set. */
    modReg[fakeUrl] = EX;
    modReg[':appldr161-cjs-minifake'] = fakeUrl;
  }('appldr://cjs-minifake'));

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
    modReg['appldr://window'] = win;
    modReg['appldr://document'] = win.document;
    Object.defineProperty(win, 'exports',
      { configurable: false, enumerable: true, get: EX.getExports });
  };
  EX.factory = miniFakeFactory;   /*
    ^-- make a new instance that can use another window */

  EX.registeredModules = function () { return modReg; };

  EX.require = function req(opts, modUrl) {
    modUrl = EX.require.resolve(opts, modUrl);
    opts = modReg[modUrl];
    if (opts) { return opts; }
    return fail('reqire: module not available: ' + modUrl);
  };

  EX.require.resolve = function (opts, modSpec) {
    var modUrl, foundWithSuffix = '';
    if ((typeof opts) === 'string') {
      modSpec = opts;
      opts = {};
    }
    if ((!modUrl) && modSpec.match(/^\.{1,2}\//)) {
      modUrl = EX.urlLib.resolveRelativePath((opts.from || ''), modSpec);
    }
    if ((!modUrl) && (!modSpec.match(/^[a-z]+:\//))) {
      modUrl = EX.urlLib.splitPath(modSpec);
      modUrl.base = modReg[':' + modUrl[0]];
      modUrl = (modUrl.base
        ? (modUrl.length === 1 ? modUrl.base
            : EX.urlLib.resolveRelativePath(modUrl.base, modUrl.slice(1)))
        : modUrl.join('/'));
    }
    if (!modUrl) { return fail('unsupported module spec: ' + modSpec); }
    if (modReg[modUrl]) { return modUrl; }
    (opts.suffixes || EX.require.suffixes).forEach(function (sfx) {
      if (foundWithSuffix) { return; }
      sfx = modUrl + sfx;
      if (modReg[sfx]) { foundWithSuffix = sfx; }
    });
    if (foundWithSuffix) { return foundWithSuffix; }
    return fail('Module not available: ' + JSON.stringify(modSpec) +
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
    if (!(destPath instanceof Array)) {
      destPath = EX.urlLib.splitPath(destPath);
    }
    while (destSub[0] === '.') { destSub.shift(); }
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

  EX.isEmptyObj = function (x) {
    return ((x instanceof Object) && (Object.keys(x).length === 0));
  };

  EX.getExports = function (modUrl) {
    if (!modUrl) { modUrl = EX.guessModuleUrl(true); }
    // ^-- guessModuleUrl will also ensure there's at least an empty object.
    return modReg[modUrl];
  };

  EX.setExports = function (modUrl, exp) {
    if ((typeof modUrl) !== 'string') { fail('modUrl must be a string'); }
    if (!modUrl) { modUrl = EX.guessModuleUrl(true); }
    var prevExp = modReg[modUrl];
    if (!prevExp) { fail("guessModuleUrl hasn't prepared empty exports??"); }
    if (prevExp === exp) { return; }
    if (EX.isEmptyObj(prevExp)) { prevExp = null; }
    if (prevExp) { fail("Won't overwrite previous exports for " + modUrl); }
    modReg[modUrl] = exp;
  };

  EX.guessModuleUrl = function guessModuleUrlFromScriptTag(registerModName) {
    var sTag = EX.guessActiveScriptTag(), modName,
      modUrl = EX.cutoffQueryHash(sTag.src || EX.doc().URL);
    if (!modUrl) { return fail('guessModuleUrlFromScriptTag(): no url'); }
    if (modReg[modUrl]) {
      // we've seen it before, no need to guess its name again.
      return modUrl;
    }
    modReg[modUrl] = {};
    if (!registerModName) { return modUrl; }
    modName = String(sTag.getAttribute('modname') || '');
    if (modName.match(/^\W/)) { return modUrl; }
    if (!modName) { modName = EX.guessModuleNameFromFilePath(modUrl); }
    EX.registerModuleByName(modName, modUrl);
    return modUrl;
  };

  EX.registerModuleByName = function (modName, modUrl) {
    if (!modName) { return; }
    if ((typeof modUrl) !== 'string') { fail('modUrl must be a string'); }
    if (modReg[':' + modName]) { return; }
    modReg[':' + modName] = modUrl;
  };

  EX.module = Object.create(null, {
    filename:   { enumerable: true, get: EX.guessModuleUrl.bind(null, false) },
    exports:    { enumerable: true, get: EX.getExports,
                  set: EX.setExports.bind(null, '') },
    scriptTag:  { enumerable: true, get: EX.guessActiveScriptTag },
  });

  EX.arrLast = function (o, i) { return (o[o.length - (i || 1)] || false); };

  EX.doc = function () {
    var doc = (EX.window || false).document;
    if ((doc && typeof doc) === 'object') { return doc; }
    return fail('Supply a window via .setWindow() first');
  };

  EX.guessActiveScriptTag = function guessActiveScriptTag() {
    var st = EX.arrLast(EX.doc().getElementsByTagName('script'));
    if (st) { return st; }
    return fail('Unable to guessActiveScriptTag()');
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

  EX.define = function (modName, modExp) {
    var srcUrl = EX.guessModuleUrl(true), modFac, tmpMod = modReg[srcUrl];
    if ((typeof modName) !== 'string') {
      modExp = modName;
      modName = null;
    }
    if (!EX.isEmptyObj(tmpMod)) {
      if (modExp === EX) {
        return; /* Probably because there was no previous define().amd,
          ours was installed to the window global, and thus the UMD loader
          at the end of this script called it a 2nd time. */
      }
      if (modExp !== modReg[srcUrl]) {
        return fail('cannot re-define().amd module ' + srcUrl);
      }
    } else {
      if (modExp instanceof Function) {
        modFac = modExp;
        modExp = {};
        tmpMod = { filename: srcUrl, exports: modExp,
          scriptTag: EX.guessActiveScriptTag() };
        modFac = modFac(EX.require.bind(null, { from: srcUrl }),
          modExp, tmpMod);
        if (tmpMod.exports) { modExp = tmpMod.exports; }
        if (modFac && EX.isEmptyObj(modExp)) { modExp = modFac; }
      }
      modReg[srcUrl] = modExp;
    }
    // console.log('amd.define()d:', srcUrl);
    EX.registerModuleByName(modName, srcUrl);
  };
  EX.define.amd = true;


  if (((typeof window) === 'object') && window) { EX.setWindow(window); }

  //$__UMD_EXPORT__$(EX)
  (((typeof module) === 'object') && ((module || false
    ).exports instanceof Object) ? module : {}).exports = EX;
  if (((typeof define) === 'function') && define.amd) { define(EX); }
}());
