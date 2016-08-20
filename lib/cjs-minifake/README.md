
cjs-minifake
============

What it can't do
----------------
  * Understand module metadata. (e.g. `package.json`)
  * Detect dependencies of modules.
  * Fetch/read modules' files.

Then what's it good for?
------------------------
  * If the structure of your module is simple enough,
    cjs-minifake might be able to load it even in circumstances where
    a fully-featured loader could run into problems, including:
    * Package metadata missing or inaccessible.
    * HTML served from local file system instead of from a server.


License
-------
ISC
