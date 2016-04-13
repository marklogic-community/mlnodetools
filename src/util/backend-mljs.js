/*
 * MLJS Backend for mljsadmin tool
 */

var Q = require("q");
var fs = require("fs");

var backend = function(monitor) {
  this._monitor = monitor; // for logging live info

  this._driver = null;
  this._exception = null;
  this._hasDriver = false;

  var self = this;

  try {
    self._driver = require('mljs');
    self._hasDriver = true;
  } catch (e) {
    self._hasDriver = false;
    self._exception = e;
  }
};

backend.prototype.hasDriver = function() {
  return this._hasDriver;
};

backend.prototype.getDriverException = function() {
  return this._exception;
};






backend.prototype.setLogger = function(logger) {
  this._logger = logger;
};





backend.prototype.setAdminDBSettings = function(settings) {
  this._dbAdmin = new this._driver();
  this._dbAdmin.configure(settings);
  this._dbAdmin.setLogger(this._logger);
  this._dbContent = this._dbAdmin;
};

backend.prototype.setModulesDBSettings = function(settings) {
  this._dbModules = new this._driver();
  this._dbModules.configure(settings);
  this._dbModules.setLogger(this._logger);
};

backend.prototype.setContentDBSettings = function(settings) {
  this._dbContent = new this._driver();
  this._dbContent.configure(settings);
  this._dbContent.setLogger(this._logger);
};





backend.prototype.createContentDBRestAPI = function() {
  //console.log("createContentDBRestAPI");
  if (undefined == this._dbAdmin) {
    //console.log("dbAdmin undefined");
    throw new Exception("Admin connection has not been configured");
  }
  //console.log("after undefined check");

  var deferred = Q.defer();
  var self = this;
  //log("    - config: " + JSON.stringify(env));
  //console.log("calling create");
  this._dbAdmin.create(function(result) {
    //console.log("have create result: " + result);
    if (result.inError) {
      self._monitor.log(JSON.stringify(result));
      //crapout(result.detail);
      deferred.reject(result.detail);
    } else {
      // all ok
      self._monitor.ok("    - SUCCESS");
      deferred.resolve("SUCCESS");
    }
  });
  //console.log("after create call");
  return deferred.promise;
};

backend.prototype.createModulesDBRestAPI = function() {
  if (undefined == this._dbAdmin) {
    throw new Exception("Admin connection has not been configured");
  }

  var deferred = Q.defer();
  var self = this;
  //log("    - config: " + JSON.stringify(modulesenv));
  this._dbModules.create(function(result) {
    if (result.inError) {
      //crapout(result.error);
      self._monitor.error(result.error);
      deferred.reject(result.error); // TODO verify not result.detail
    } else {
      // all ok
      self._monitor.ok("    - SUCCESS");
      deferred.resolve("SUCCESS");
    }
  });
  return deferred.promise;

};

backend.prototype.installExtension = function(moduleName, methodArray, content) {
  var deferred = Q.defer();
  var self = this;

    this._dbAdmin.installExtension(moduleName, methodArray, content, function(result) {
      if (result.inError) {
        //warn("FAILED to install REST API extension '" + moduleName + "': " + result.details.errorResponse.message);
        self._monitor.warn("Error whilst installing extension '" + moduleName + "': " + JSON.stringify(result));
        deferred.reject("Error whilst installing extension '" + moduleName + "': " + result.details.errorResponse
          .message);
      } else {
        self._monitor.ok("    - SUCCESS - " + moduleName);
        deferred.resolve(moduleName);
      }
    });

  return deferred.promise;
};

backend.prototype.installTrigger = function(triggerInfo) {
    var deferred = Q.defer();
    var self = this;

    self._dbAdmin.installTrigger(triggerInfo, function(result) {
      self._monitor.log("    - result: " + JSON.stringify(result));
      if (result.inError) {
        //throw new Error(result.detail);
        deferred.reject("Error whilst installing trigger '" + triggerInfo.name + "': " + result.details.errorResponse
          .message);
      } else {
        self._monitor.ok("    - SUCCESS - installing trigger " + triggerInfo.name + " : " + triggerInfo.comment);
        deferred.resolve("SUCCESS");
      }
    });
    return deferred.promise;
};

backend.prototype.captureTriggers = function(file,restapi) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.triggers(function(result) {
    if (result.inError) {
      //crapout(result.detail);
      deferred.reject("Could not retrieve trigger configuration (no triggers.xqy?) source: " +
        result.details.errorResponse.message);
    } else {
      // patch this JSON config by reading trigger information from the GET /v1/resources/triggers REST extension in MLJS
      restapi.triggers = result.doc.summary.triggers;
      //console.log(restapi);
      // all ok

      fs.writeFile(file, JSON.stringify(restapi), function(err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve("SUCCESS");
        }
      });
    }
  });

  return deferred.promise;
};

backend.prototype.installGraph = function(data,graphName) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.saveGraph(data, graphname, {
    format: "turtle"
  }, function(result) {
    if (result.inError) {
      deferred.reject(result.detail);
    } else {
      // all ok
      deferred.resolve("SUCCESS");
    }
  });
  return deferred.promise;
};

backend.prototype.captureGraph = function(graphName,settings,file) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.graph(graphName, settings, function(result) {
    if (result.inError) {
      deferred.reject(result.detail);
    } else {
      // all ok
      fs.writeFile(file, result.body, function(err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve("SUCCESS");
        }
      });
    }
  });

  return deferred.promise;
};

backend.prototype.installWorkplace = function(data,file) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.saveWorkplace(data, function(result) {
    if (result.inError) {
      self._monitor.log(JSON.stringify(result));
      deferred.reject(result.detail);
    } else {
      // all ok
      self._monitor.ok("    - SUCCESS installing workplace xml file: " + file);
      deferred.resolve("SUCCESS");
    }
  });
  return deferred.promise;
};

backend.prototype.captureWorkplace = function(file) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.workplace(function(result) {
    if (result.inError) {
      deferred.reject(result.detail); // workplace extension not installed???
    } else {
      //log(JSON.stringify(result));
      // all ok
      fs.writeFile(file, result.body, function(err) {
        if (err)  {
          self._monitor.error(err);
          deferred.reject(err);
        } else {
          self._monitor.ok("   - SUCCESS capturing workplace to: " + file);
          deferred.resolve("SUCCESS");
        }
      });
    }
  });

  return deferred.promise;
};

backend.prototype.applyDatabasePackage = function(name, pwd,filename) {
    var deferred = Q.defer();
    var self = this;
    // read file
    var file = pwd + "packages/databases/" + filename + ".xml"; // TODO check and skip
    self._monitor.log("    - reading package xml file: " + file);
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        //crapout(err);
        self._monitor.warn("No package found for: " + filename + ", skipping");
        deferred.resolve("SUCCESS");
      } else {
        self._monitor.log("    - Read file: " + file);
        // create/update package
        self._dbAdmin.createPackage(name, data, function(result) {
          if (result.inError) {
            deferred.reject(result.detail);
          } else {
            self._monitor.log("    - Created package: " + name);

            self._dbAdmin.addDatabaseToPackage(name, name, data, function(result) {
              if (result.inError) {
                deferred.reject(result.detail);
              } else {
                self._monitor.log("    - Added database to package: " + name);

                // apply package
                self._dbAdmin.installPackage(name, function(result) {
                  if (result.inError) {
                    deferred.reject(result.detail);
                  } else {
                    self._monitor.ok("   - SUCCESS installed database package for " + name);

                    self._dbAdmin.deletePackage(name, function(result) {
                      if (result.inError) {
                        deferred.reject(result.detail);
                      } else {
                        deferred.resolve("SUCCESS");
                      }

                    });
                  }
                });
              }
            });
          }
        });
      }
    });
    return deferred.promise;
};

backend.prototype.captureDatabase = function(name, pwd,filename) {
    var deferred = Q.defer();
    var self = this;

    // get content database XML package file
    this._dbAdmin.getDatabasePackage(name, function(result) {
      if (result.inError) {
        self._monitor.log(JSON.stringify(result));
        deferred.reject(result.detail);
      } else {
        // add to correct package folder
        fs.writeFile(pwd + "./packages/databases/" + filename + ".xml", result.body, function(err) {
          if (err) {
            deferred.reject(err);
          } else {
            self._monitor.ok("    - SUCCESS saving database package: " + name + " as " + filename + ".xml");
            deferred.resolve("SUCCESS");
          }
        });
      }
    });
    return deferred.promise;
};

backend.prototype.removeContentDBRestAPI = function() {
  var deferred = Q.defer();
  var self = this;

  //log("    - config: " + JSON.stringify(env));
  self._dbAdmin.destroy(function(result) {
    if (result.inError) {
      self._monitor.error(result.detail);
      deferred.reject(result.detail);
    } else {
      // all ok
      self._monitor.ok("    - SUCCESS");
      deferred.resolve("SUCCESS");
    }
  });
  return deferred.promise;
};

backend.prototype.removeModulesDBRestAPI = function() {
  var deferred = Q.defer();
  var self = this;

  //log("    - config: " + JSON.stringify(env));
  this._dbModules.destroy(function(result) {
    if (result.inError) {
      self._monitor.error(JSON.stringify(result));
      deferred.reject(result);
    } else {
      // all ok
      self._monitor.ok("    - SUCCESS");
      deferred.resolve("SUCCESS");
    }
  });
  return deferred.promise;
};

backend.prototype.removeTrigger = function(triggerName, triggersDatabase) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.removeTrigger(triggerName, triggersDatabase, function(result) {
    if (result.inError) {
      self._monitor.error(result.detail);
      deferred.reject(result.detail);
    } else {
      self._monitor.ok("    - SUCCESS - removed trigger " + triggerName);
      deferred.resolve("SUCCESS");
    }
  });
  return deferred.promise;
};

backend.prototype.removeExtension = function(moduleName) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.removeExtension(moduleName, function(result) {
    if (result.inError) {
      self._monitor.error(result.detail);
      deferred.reject(result.detail);
    } else {
      self._monitor.ok("    - SUCCESS - " + moduleName);
      deferred.resolve(moduleName);
    }
  });
  return deferred.promise;
};

backend.prototype.saveContent = function(data,uri,props,settings,file) {
  var self = this;
  var deferred = Q.defer();

  this._dbContent.save(data, uri, props, function(result) {
    if (result.inError) {
      // just log the message
      self._monitor.warn("    - ERROR saving file to uri: " + uri);
      self._monitor.warn(JSON.stringify(result.details));
    } else {
      self._monitor.ok("    - SUCCESS " + settings.folder + "/" + file + " => " + uri +
        " (" + result.docuri + ")");
    }
    deferred.resolve(settings.folder + "/" + file);
  });

  return deferred.promise;
};

backend.prototype.saveModules = function(data,uri,props,settings,file) {
  var self = this;
  var deferred = Q.defer();

  this._dbModules.save(data, uri, props, function(result) {
    if (result.inError) {
      // just log the message
      self._monitor.warn("    - ERROR saving file to uri: " + uri);
      self._monitor.warn(JSON.stringify(result.details));
    } else {
      self._monitor.ok("    - SUCCESS " + settings.folder + "/" + file + " => " + uri +
        " (" + result.docuri + ")");
    }
    deferred.resolve(settings.folder + "/" + file);
  });

  return deferred.promise;
};

backend.prototype.installSearchOptions = function(name,file,doc) {
  var deferred = Q.defer();
  var self = this;

  self._dbAdmin.saveSearchOptions(name, doc, function(result) {
    if (result.inError) {
      self._monitor.error(result.detail);
      deferred.reject(JSON.stringify(result) + " for " + file);
    } else {
      // all ok
      self._monitor.ok("    - SUCCESS for " + file); // TODO may not work, may need to be shielded in function wrapper
      deferred.resolve(file);
    }
  });

  return deferred.promise;
};

backend.prototype.captureSearchOptions = function(pwd) {
    var deferred = Q.defer();
    var self = this;


  this._dbAdmin.searchOptions(function(result) {
    if (result.inError) {
      //crapout(result.detail);
        self._monitor.error(result.detail);
      deferred.reject("Could not retrieve search options. Source: " +
        result.details.errorResponse.message);
    } else {
      var promises = [];
      var files = result.doc;
      for (var f = 0, maxf = files.length, file; f < maxf; f++) {
        file = files[f];
        promises[f] = self._captureSearchOptionsFile(pwd,file.name, file.uri);
      }
      Q.all(promises).catch(function(error) {
        self._monitor.warn(
          "Could not capture all searchoptions. Fix problem then try mljsadmin --capture=searchoptions again (source: " +
          error + ")");
      }).finally(function(output) {
        deferred.resolve("SUCCESS");
      });
    }
  });

  return deferred.promise;
};

backend.prototype._captureSearchOptionsFile = function(pwd,name, uri) {
    var deferred = Q.defer();
    var self = this;

    self._dbAdmin.searchOptions(name, {
      format: "xml"
    }, function(result) {
      if (result.inError) {
        self._monitor.error(result.detail);
        //crapout(result.detail);
        deferred.reject("Could not fetch search options configuration for '" + name + "' source: " +
          result.detail);
        self._monitor.log(JSON.stringify(result));
      } else {
        fs.writeFile(pwd + "rest-api/config/options/" + name + ".xml", result.body, function(err) {
          if (err) {
            deferred.reject(err);
          } else {
            self._monitor.ok("    - SUCCESS saving search options: " + name);
            deferred.resolve("SUCCESS");
          }
        });
      }
    });

    return deferred.promise;
};

backend.prototype.clean = function(colsExclude,colsInclude) {
  var deferred = Q.defer();
  var self = this;

  var qb = self._dbAdmin.createQuery();
  var cqt = [];
    // exclude
    for (var c = 0, maxc = colsExclude.length, col; c < maxc; c++) {
      col = colsExclude[c];
      cqt.push(qb.collection(col));
    }
  var iqt = [];
    // exclude
    for (var c = 0, maxc = colsInclude.length, col; c < maxc; c++) {
      col = colsInclude[c];
      iqt.push(qb.collection(col));
    }

  var q = qb.and([qb.not(cqt), qb.or(iqt)]);
  qb.query(q);

  var query = qb.toJson();

  self._dbAdmin.deleteUsingSearch(query, function(result) {
    if (result.inError) {
      // just log the message
      self._monitor.warn("    - WARN deleting content using query: " + JSON.stringify(query) + " ERROR: " + JSON.stringify(
        result));
    } else {
      self._monitor.ok("    - SUCCESS deleting content");
    }
    deferred.resolve("SUCCESS");

  });

  return deferred.promise;
};






module.exports = backend;
