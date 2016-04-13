/*
 * Represents a MarkLogic Environment. Allows loading of environment information from the file system
 */

var Q = require("q");
var fs = require("fs");
var environment = function(name) {
  this._name = name;
  this._env = {};

  this._error = null;
};

environment.prototype.load = function(envFiles) {
  if (!Array.isArray(envFiles)) {
    envFiles = [envFiles];
  }

  var jsonText = null;
  for (var i = 0;i < envFiles.length && null == jsonText;i++) {
    try {
      this._error = null; // reset for each attempted file load
      jsonText = fs.readFileSync(envFiles[i], "UTF-8");
    } catch (e) {
      // ignore
      this._error = e;
    }
  }
  this._env = {};
  if (undefined != jsonText) {
    this._env = JSON.parse(jsonText);
  }
};

environment.prototype.inError = function() {
  return (null != this._error);
};

environment.prototype.getError = function() {
  return this._error;
};

environment.prototype.get = function() {
  return this._env;
};


module.exports = environment;
