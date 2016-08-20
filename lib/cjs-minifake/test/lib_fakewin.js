/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var EX = module.exports, doc = {};

EX.document = doc;

doc.getElementsByTagName = function byTag(tn) {
  switch (tn) {
  case 'script':
    return [EX.document.fakeScript];
  }
  return [];
};

EX.HTMLFakeElement = function (tagName) {
  this.tagName = tagName;
  this.attrib = Object.create(null);
  this.getAttribute = function (attr) { return this.attrib[attr]; };
  this.setAttribute = function (attr, val) { this.attrib[attr] = val; };
  this.innerHTML = '';
  switch (tagName) {
  case 'script':
    this.src = '';    // in Firefox, tags w/o src attribute have .src=""
    break;
  }
};

doc.createElement = function (tn) { return new EX.HTMLFakeElement(tn); };

EX.fakeScriptTag = doc.createElement('script');
