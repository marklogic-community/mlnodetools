/**
 * The abstracted mljsadmin deployer library
 */

var fs = require('fs');
var Q = require("q");
var itob = require('istextorbinary');

var environment = require("./environment.js");
var mljsBackend = require("./backend-mljs.js");

var deployer = function(monitor) {
  this._environment = null;

  var log = function(msg) {
    console.log(msg);
  };

  this._monitor = monitor || {
    warn: log, debug: log, error: log, log: log, ok:log // not title or crapout as these are mljsadmin command line specific
  };

  // TODO set up a default (logs nothing) this._logger instance

  this._env = {};
  this._menv = {};
  this._lenv = {};

  this._hasEnvironment = false;

  this._backend = null;
};

// SETUP FUNCTIONS
deployer.prototype.setLogger = function(logger) {
  this._logger = logger;
};

deployer.prototype.loadEnvironment = function(name,envFiles) {
  this._environment = new environment(name);
  this._environment.load(envFiles);

  this._setupEnvironment();
};

deployer.prototype._setupEnvironment = function() {
  // standard mljsadmin parsing of a single environment, creation of env, menv, lenv, and then backend
  this._setupBackend();

  var self = this;

  var ranSetup = false;
  var setupEnvironment = function() {
    if (ranSetup) {
      return;
    }
  ranSetup = true;

  // TODO get rid of this hack - may break tear down, and should be ignored if env.appname already exists
  self._env = self._environment.get();
  self._env.appname = self._env.database + "-rest-" + self._env.port; // fix for naming of rest api instance

  self._backend.setAdminDBSettings(self._env);

  var loaddb = null;
  self._lenv = {};
  for (var name in self._env) {
    self._lenv[name] = "" + self._env[name];
  }
  //log("dboptions username before lenv: " + db.dboptions.username);
  // Allow special username for loading content vs. administration
  if (undefined != self._env.loadusername) {
    //loaddb = new mljs();
    self._lenv.username = self._env.loadusername;
    self._lenv.password = self._env.loadpassword;
  } else {
    //loaddb = db;
  }
  self._backend.setContentDBSettings(self._lenv);
  //log("dboptions username after lenv: " + db.dboptions.username);
  //log("load dboptions username after lenv: " + loaddb.dboptions.username);

  //var mdb = new mljs();
  //mdb.setLogger(logger);
  self._menv = {};
  for (var name in self._env) {
    self._menv[name] = "" + self._env[name];
  }
  self._menv.port = self._menv.modulesport;
  self._menv.database = self._menv.modulesdatabase;
  self._menv.appname = self._menv.database + "-rest-" + self._menv.port;

  self._backend.setModulesDBSettings(self._menv);

  //mdb.configure(menv);
  self._monitor.debug("CONTENTENV: " + JSON.stringify(self._env));
  self._monitor.debug("MODULESENV: " + JSON.stringify(self._menv));
  self._monitor.debug("LOADENV: " + JSON.stringify(self._lenv));

  };

  setupEnvironment();

  this._hasEnvironment = this._backend.hasDriver();
};

deployer.prototype.hasBackend = function() {
  if (null == this._backend) {
    return false;
  }
  return this._backend.hasDriver();
};

deployer.prototype.getBackend = function() {
  return this._backend;
};

deployer.prototype._setupBackend = function() {
  // create backend based on the three connections required

  // TODO detect which backend to use
  this._backend = new mljsBackend(this._monitor);
  this._backend.setLogger(this._logger);

};

deployer.prototype.hasEnvironment = function() {
  return this._hasEnvironment;
}

deployer.prototype.getEnvironment = function() {
  return this._environment;
};

deployer.prototype.setEnvironment = function(adminEnvJson,modulesEnvJson,loadEnvJson) {
  // for those libraries that need to explicitly set each connections' settings (TODO standard format not just MLJS')
  this._env = adminEnvJson;
  this._menv = modulesEnvJson;
  this._lenv = loadEnvJson;
  this._setupBackend();
  this._backend.setAdminDBSettings(this._env);
  this._backend.setModulesDBSettings(this._menv);
  this._backend.setContentDBSettings(this._lenv);

  this._hasEnvironment = this._backend.hasDriver();
};



// PUBLIC FUNCTIONS

deployer.prototype.installContentDBRestAPI = function() {
  //console.log("installContentDBRestAPI. backend: " + this._backend);
  return this._backend.createContentDBRestAPI();
};

deployer.prototype.installModulesDBRestAPI = function() {
  return this._backend.createModulesDBRestAPI();
};

deployer.prototype.installExtensions = function(pwd) {

  var deferred = Q.defer();
  var self = this;
  //log("db user: " + db.dboptions.username);
  // install rest extensions in REST server
  // read data/restapi.json file for list of extensions

  var readFile = function(ext) {
    var deferred2 = Q.defer();
    fs.readFile(pwd + './rest-api/ext/' + ext.name + ".xqy", 'utf8', function(err, content) {
      if (err) {
        self._monitor.error("Error in installExtensions.readFile: " + err);
        deferred.reject(err);
      }
      self._backend.installExtension(ext.name, ext.methods, content).then(function(output) {
        //self._monitor.log("Install extension completed for: " + ext.name);
        deferred2.resolve(ext.name);
      }).catch(function(err) {
        self._monitor.error("Error in installExtensions.readFile: " + err);
        deferred2.reject(err);
      });
    });
    return deferred2.promise;
  };
  fs.readFile(pwd + 'data/restapi.json', 'utf8', function(err, data) {
    if (err) {
      self._monitor.error(err);
      deferred.reject(err);
    }
    self._monitor.log("Data:-");
    self._monitor.log(data);
    var json = JSON.parse(data);
    var exts = json.extensions;
    var promises = [];
    for (var e = 0, maxe = exts.length, ext; e < maxe; e++) {
      ext = exts[e];
      self._monitor.log("    - Attempting to install MarkLogic REST API extension '" + ext.name + "'");
      // process each extension and install
      // TODO check for xqy vs js implementation (V8 only)
      promises[e] = readFile(ext);
    }
    Q.all(promises).then(function(result) {
      //self._monitor.ok("  - install_extensions() complete");
    }).catch(function(error) {
      self._monitor.warn(
        "Could not install all extensions. Fix problem then try mljsadmin --install=extensions again (source: " +
        error + ")");
    }).finally(function(output) {
      deferred.resolve("SUCCESS - completed rest extensions installation");
    });
  });
  return deferred.promise;
};

deployer.prototype.installModules = function(folder) {
  // loop through folder recursively and save modules to mdb
/*
  var settings = {
    folder: folder,
    recursive: true,
    ignore: [".load.json", ".initial.json", ".DS_Store"],
    prefix: "/",
    stripBaseFolder: true,
    collections: []
  };*/
  this._monitor.log("calling load folder: " + folder /*+ ", settings: " + JSON.stringify(settings)*/ );
  return this.loadModulesFolder(folder);
  //return targets._loadFolder2(backend.saveModules, folder, settings);
};

deployer.prototype.installTriggers = function(pwd) {
  var deferred = Q.defer();
  var self = this;
  // read data/restapi.json file for list of extensions
  fs.readFile(pwd + './data/restapi.json', 'utf8', function(err, data) {
    if (err) {
      self._monitor.error(err);
      deferred.reject(err);
    }
    var json = JSON.parse(data);
    var triggers = json.triggers;
    var promises = [];
    if (undefined != triggers) {
      for (var e = 0, maxe = triggers.length, trg; e < maxe; e++) {
        trg = triggers[e];
        // process each trigger and install

        // MUST OVERWRITE DB NAME!
        trg.module.database = self._env.modulesdatabase;

        promises[e] = self._backend.installTrigger(trg);
      }
    }
    Q.all(promises).catch(function(error) {
      deferred.reject(error);
    }).finally(function(output) {
      deferred.resolve("SUCCESS");
    });
  });

  return deferred.promise;
};

deployer.prototype.installWorkplace = function(rootFolder,fileOverride) {
  var deferred = Q.defer();
  var self = this;
  var file = fileOverride || (rootFolder + 'data/mljs-workplace.xml');

  this._monitor.log("    - Installing workplace xml file: " + file);
  //log("   - Not yet implemented");
  fs.readFile(file, 'utf8', function(err, data) {
    if (err) {
      deferred.reject(err);
    }
    //log("data: " + data);
    //log("data.toString(): " + data.toString());
    self._backend.installWorkplace(data,file).then(function() {
      deferred.resolve(file);
    }).catch(function(error) {
      deferred.reject(error);
    });
  });
  return deferred.promise;
};


deployer.prototype.removeExtensions = function(pwd) {
  var deferred = Q.defer();
  var self = this;
  // install rest extensions in REST server
  // read data/restapi.json file for list of extensions
  var readFile = function(ext) {
    return self.removeExtension(ext.name);
  };
  fs.readFile(pwd + './data/restapi.json', 'utf8', function(err, data) {
    if (err) {
      self._monitor.error(err);
      deferred.reject(err);
    }
    var json = JSON.parse(data);
    var exts = json.extensions;
    var promises = [];
    for (var e = 0, maxe = exts.length, ext; e < maxe; e++) {
      ext = exts[e];
      // process each extension and remove
      promises[e] = readFile(ext);
    }
    Q.all(promises).then(function(output) {
      deferred.resolve("SUCCESS");
    });
  });
  return deferred.promise;
};

deployer.prototype.removeExtension = function(name) {
  return this._backend.removeExtension(name);
};


deployer.prototype.removeContentDBRestAPI = function() {
  return this._backend.removeContentDBRestAPI();
};


deployer.prototype.removeModulesDBRestAPI = function() {
  return this._backend.removeModulesDBRestAPI();
};

deployer.prototype.removeTriggers = function(pwd,fileOverride) {
  var self = this;
  var deferred = Q.defer();

  var file = fileOverride || (pwd + './data/restapi.json');

  // install rest extensions in REST server
  // read data/restapi.json file for list of extensions
  fs.readFile(file, 'utf8', function(err, data) {
    if (err) {
      defferred.reject(err);
    }
    var json = JSON.parse(data);
    var triggers = json.triggers;
    var promises = [];
    if (undefined != triggers) {
      for (var e = 0, maxe = triggers.length, trg; e < maxe; e++) {
        trg = triggers[e];
        // process each extension and install
        // TODO check for xqy vs js implementation (V8 only)
        promises[e] = self._backend.removeTrigger(trg.name, self._env.triggersdatabase);
      }
    }
    Q.all(promises).then(function(output) {
      deferred.resolve("SUCCESS");
    });
  });
  return deferred.promise;
};

deployer.prototype.updateOntology = function(pwd,graphname) {
  var self = this;
  var deferred = Q.defer();
  var file = pwd + 'data/ontology.ttl';
  this._monitor.log("    - loading ontology from file: " + file);
  //log("   - Not yet implemented");
  // TODO check if OPTIONAL ontology exists
  fs.readFile(file, 'utf8', function(err, data) {
    if (err) {
      // doesn't exist
      self._monitor.warn("SKIPPING as Ontology file does not exist: " + file);
      deferred.resolve("SUCCESS");
      //crapout(err);
    } else {
      self._backend.saveGraph(data,graphName).then(function() {
        ok("    - SUCCESS installing ontology to graph: " + graphname);
        deferred.resolve("SUCCESS");
      }).catch(function(error) {
        deferred.reject(error);
      });
    }
  });
  return deferred.promise;
};

deployer.prototype.updateContentDBConfig = function(pwd) {
  // TODO allow file override
  return this._backend.applyDatabasePackage(this._env.database, pwd,"contentdbconfig");
};

deployer.prototype.updateModulesDBConfig = function(pwd) {
  // TODO allow file override
  return this._backend.applyDatabasePackage(this._env.modulesdatabase, pwd,"modulesdbconfig");
};

deployer.prototype.updateSearchOptions = function(pwd) {
  var deferred = Q.defer();
  var self = this;

  fs.readdir(pwd + "./rest-api/config/options", function(err, files) {
    if (err) {
      deferred.reject(err);
    }
    self._monitor.log("    - Found options: " + files);
    var saveWP = function(file) {
      var deferred2 = Q.defer();

      fs.readFile(pwd + "rest-api/config/options/" + file, 'utf8', function(err, data) {
        if (err) {
          deferred.rejcet(err);
        }
        var pos = file.lastIndexOf(".");
        var ext = file.substring(pos + 1);
        var name = file.substring(0, pos);
        var format = "json";
        if (ext == "xml") {
          format = "xml";
        }
        //log("data: " + data);
        var doc = null;
        if ("json" == format) {
          doc = JSON.parse(data);
        } else {
          // XML
          doc = data; // db.textToXML(data);
        }
        self._backend.installSearchOptions(name,file,doc).then(function() {
          deferred2.resolve(file);
        }).catch(function(error) {
          deferred.reject(error);
        });
      });

      return deferred2.promise;
    };
    var promises = [];
    for (var f = 0, maxf = files.length, file; f < maxf; f++) {
      file = files[f];
      promises[f] = saveWP(file);
    }
    Q.all(promises).then(function(output) {
      deferred.resolve("SUCCESS");
    }); // no fail() as we instantly end the app anyway
    //log("   - Not yet implemented");
  });
  return deferred.promise;
};

deployer.prototype.captureWorkplace = function(pwd,fileOverride) {
  var self = this;
  var deferred = Q.defer();

  var file = fileOverride || (pwd + 'data/mljs-workplace.xml');
  //console.log("file: " + file);

  this._backend.captureWorkplace(file).then(function(result) {
    deferred.resolve("SUCCESS");
  }).catch(function(error) {
    deferred.reject(error);
  });

  return deferred.promise;
};

deployer.prototype.captureOntology = function(graphname,pwd,override) {
  var deferred = Q.defer();
  var file = override || (pwd + 'data/ontology.ttl');
  var self = this;
  this._monitor.log("   - Storing ontology in file: " + file + " from ontology graph: " + graphname);

  this._backend.captureGraph(graphname,{},file).then(function(result) {
    self._monitor.ok("    - SUCCESS capturing ontology to file: " + file);
  }).catch(function(error) {
    //crapout(error);
    self._monitor.warn(" - capture_ontology() errored - perhaps ontology graph name (" + graphname + ") does not exist?");
    self._monitor.warn(error);
  }).finally(function() {
    deferred.resolve("SUCCESS");
  });

  return deferred.promise;
};

deployer.prototype.captureTriggers = function(pwd,fileOverride) {
  var self = this;
      var deferred = Q.defer();
      // read existing restapi.json file
      var file = fileOverride || (pwd + 'data/restapi.json');
      self._monitor.log("    - Reading existing Workplace rest api config: " + file);

      var restapi = {}; // defaults

      fs.readFile(file, 'utf8', function(err, data) {
        if (err) {
          //crapout(err);
          self._monitor.warn("Could not read restapi.json file(doesn't exist yet?), using assumed defaults");
          // do nothing - create the config from defaults
        } else {
          restapi = JSON.parse(data);
        }

        self._backend.captureTriggers(file,restapi).then(function(result) {
          self._monitor.ok("    - SUCCESS capturing installed triggers to file: " + file);
          deferred.resolve("SUCCESS");
        }).catch (function(error) {
          deferred.reject(error);
        });
      });
      return deferred.promise;
};

deployer.prototype.captureSearchOptions = function(pwd,fileOverride) {
  // TODO support fileOverride and refactor backend accordingly
    var deferred = Q.defer();
    this._backend.captureSearchOptions(pwd).then(function(result) {
      deferred.resolve("SUCCESS");
    }).catch(function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
};

deployer.prototype.captureContentDBConfig = function(pwd,fileOverride) {
  var self = this;
  // TODO support fileOverride and refactor backend accordingly
    var deferred = Q.defer();
    self._backend.captureDatabase(self._env.database, pwd,"contentdbconfig").then(function(result) {
      deferred.resolve("SUCCESS");
    }).catch(function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
};

deployer.prototype.captureModulesDBConfig = function(pwd,fileOverride) {
  var self = this;
  // TODO support fileOverride and refactor backend accordingly

    var deferred = Q.defer();
    self._backend.captureDatabase(self._env.modulesdatabase, pwd,"modulesdbconfig").then(function(result) {
      deferred.resolve("SUCCESS");
    }).catch(function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
};



deployer.prototype.clean = function(colsExclude,colsInclude) {
  return this._backend.clean(colsExclude,colsInclude);
};

deployer.prototype.loadContentFolder = function(folder,settings) {
  return this._loadFolder2(this._backend.saveContent, folder, settings || ".initial.json");
};

deployer.prototype.loadModulesFolder = function(folder,settings) {
  return this._loadFolder2(this._backend.saveModules, folder, settings || ".load.json");
};


  // WORKS 8.0.12
deployer.prototype._loadFolder2 = function(dbSaveFunc,folder,settingsFile,base_opt,inheritedSettings) {
    var deferred = Q.defer();
    var self = this;
    var saveFile = function(settings,file) {
      var deferred2 = Q.defer();
      //log("      - Found: " + settings.folder + "/" + file);
      if (settings.ignore.contains(file)) {
        self._monitor.log("      - Not uploading: " + settings.folder + "/" + file +
          " (File in ignore array in settings file)");
        deferred2.resolve(settings.folder + "/" + file);
      } else {

        fs.readFile(settings.folder + "/" + file, function(err, data) {


          if (err) {
            //crapout(err);
            self._monitor.warn("Problem reading file prior to save: " + settings.folder + "/" +
              file + " (source: " + err + ")");
            deferred2.resolve(settings.folder + "/" + file);
          } else {
            itob.isText(file, data, function(err, result) {
              //log("isBuffer?: " + Buffer.isBuffer(data));
              var props = {};
              if (true === result) {
                data = data.toString(); // convert to string if utf8, otherwise leave as binary buffer
              } else {
                props.contentType = "";
              }
              //log("isBuffer? now: " + Buffer.isBuffer(data));

              // actually upload the file once working

              var vf = settings.folder;
              //log("vf: " + vf);
              if (settings.stripBaseFolder) {
                vf = settings.folder.substring(base.length + 1);
              }
              //log("vf now: " + vf);
              /*if (0 == vf.indexOf("/")) {
                vf = vf.substring(1);
              }*/
              if (0 != vf.indexOf("/") && vf.length != 0) {
                vf = "/" + vf;
              }
              //log("vf now now: " + vf);
              var vff = file;
              /*if (0 == vff.indexOf("/")) {
                vff = vff.substring(1);
              }*/
              if (0 != vff.indexOf("/")) {
                vff = "/" + vff;
              }
              //log("vf finally: " + vf);
              var uri = settings.prefix + vf + vff;
              //log("uri: " + uri);
              if ("//" == uri.substring(0, 2)) {
                uri = uri.substring(1); // remove extra slash at front
              }
              //log("uri now: " + uri);
              var cols = "";
              for (var c = 0, maxc = settings.collections.length, col; c < maxc; c++) {
                col = settings.collections[c];
                if (c > 0) {
                  cols += ",";
                }
                cols += col;
              }
              if (undefined != cols && "" != cols) {
                props.collection = cols;
              }
              if (uri.substring(uri.length - 4) == ".xqy") {
                props.contentType = "application/xquery";
              } else
              if (uri.substring(uri.length - 4) == ".pdf") {
                props.contentType = "application/pdf";
              }
              if (undefined != settings.security && undefined != settings.security[file]) {
                props.permissions = [];
                var perms = settings.security[file];
                for (var pi = 0;pi < perms.length;pi++) {
                  var row = perms[pi];
                  for (var pui = 0;pui < row.permissions.length;pui++) {
                    var pupdate = row.permissions[pui];
                    props.permissions.push({"role": row.role, "permission": pupdate});
                  }
                }
              }
              //uri = uri.replace(/ /g,"_");
              uri = escape(uri);
              //log("uri escaped: " + uri);
              //log("Doc props: " + JSON.stringify(props));
              //log(uri);
              // Using .call() syntax to ensure correct member variables
              dbSaveFunc.call(self._backend,data,uri,props,settings,file).then(function() {
                //self._monitor.log("Saved file to URI: " + uri);
              }).catch(function(error) {
                self._monitor.warn(JSON.stringify(error));
              }).finally(function(result) {
                //self._monitor.log("finally");
                deferred2.resolve(settings.folder + "/" + file);
              });

            }); // end itob
          } // end error if
        });
      }

      return deferred2.promise;
    }; // end saveFile

    var uploadFile = function(ctx) {
      self._monitor.log("   - uploading file array portion: start: " + ctx.start + " to end: " + ctx.end + " of max: " + ctx.arr.length);
      var deferred4 = Q.defer();

      var fileInfoArray = ctx.arr;
      var startIdx = ctx.start;
      var endIdx = ctx.end;

      var ufpromises = [];
      for (var i = startIdx;i <= endIdx;i++) {
        var fileInfo = fileInfoArray[i];
        //log("file: " + fileInfo.file);
        ufpromises.push(saveFile(fileInfo.settings,fileInfo.file));
      }
      var end = ctx.start + ctx.size + ctx.size - 1;
      if (end > ctx.arr.length) {
        end = ctx.arr.length - 1;
      }
      Q.all(ufpromises).then(function() {
        deferred4.resolve({arr: ctx.arr,start: ctx.start + ctx.size,end: end, size: ctx.size});
      }).catch(function(error) {
        self._monitor.error("Error occurred in uploadFile: " + error);
        deferred4.reject(error);
      });

      return deferred4.promise;
    };

    var fileInfoArray = []; // hold fileInfoArray elements

    // recursively pass through each folder, loading settings and file path info as you go
    var processFolder = function(settings) {
      // This producer only returns a promise, and recursively steps through each folder, returning a deferred promise
      var deferred2 = Q.defer();

      var filename = settings.folder + "/" + (settingsFile || ".load.json");
      self._monitor.log("    - Attempting to read settings file: " + filename);

          // load extra override settings
          fs.readFile(filename, 'utf8', function(err, data) {
            if (err) {
              //crapout(err);
              self._monitor.log("    - settings file doesn't exist: " + filename);
              // doesn't exist - ignore and carry on
            } else {
              self._monitor.log("    - settings file found: " + filename);
            }
            var json = {};
            if (undefined != data) {
              //log("settings loaded: " + data);
              json = JSON.parse(data); // TODO handle parameters with RELATIVE file paths (needed? auto?)
            }
            for (var name in json) {
              if ("folder" == name) {
                settings.folder = base + "/" + json.folder; // WORKS
                base = settings.folder; // reset base
              } else {
                settings[name] = json[name];
              }
            }
            //log("JSON settings: " + JSON.stringify(json));
            self._monitor.log("      - Folder now: " + settings.folder);


      // load DIRs
      fs.readdir(settings.folder, function(err, files) {
        //log("Reading folder: " + settings.folder);
        if (err) {
          self._monitor.error(err);
          deferred.reject(err);
        }

        var dofile = function(file) {
          //log("dofile called for: " + file);
          var deferred7 = Q.defer();

          fs.lstat(settings.folder + '/' + file, function(err, stats) {
            //log("Got stat for: " + settings.folder + "/" + file);
            if (err) {
              self._monitor.error(err);
              deferred.reject(settings.folder + "/" + file + " : " + err);
            }
            if (stats.isDirectory()) {
              //get_folder(path+'/'+file,tree[idx].children);
              //log("Folder: " + folder + " , settings.folder: " + settings.folder + " , next folder: " + settings.folder+"/"+file);
              if (settings.folder + "/" + file != settings.folder /*&& settings.folder != folder*/ ) { // . and .. in directory listing
                if (settings.recursive) {
                  var news = {};
                  for (var name in settings) {
                    if (name != "folder") {
                      news[name] = settings[name];
                    }
                  }
                  news.folder = settings.folder + "/" + file;
                  //log("Calling processFolder for subFolder: " + settings.folder + "/" + file);

                  processFolder(news).then(function() {
                    //log(" - Finished processing file: " + settings.folder + "/" + file);
                    deferred7.resolve();
                  });
                } else {
                  //log("    - Not recursively processing folder: " + settings.folder);
                  deferred7.resolve();
                }
              }
            } else {
              // add files to fileinfo list
              //log("Found normal file: " + settings.folder + "/" + file);
              fileInfoArray.push({settings: settings,file: file});
              deferred7.resolve();
            }
          });

          return deferred7.promise;
        };

        // process each file in turn
        var folderPromises = [];
        for (var f = 0;f < files.length;f++) {
          folderPromises[f] = dofile(files[f]);
        }
        //log("Total folder promises: " + folderPromises.length);
        Q.all(folderPromises).then(function() {
          //console.log(" - Finished processing folder: " + settings.folder);
          deferred2.resolve();
        }).catch(function(error) {
          self._monitor.error("error during folder processing: " + error);
          deferred2.reject(error);
        });

      }); // after fs.readdir

    }); // end fs.readfile (settings)

      return deferred2.promise;
    };


      var base = base_opt || folder;
      //log("    - " + folder);
      //log("settings passed: " + JSON.stringify(inheritedSettings));
      // find .load.json in the folder for settings
      var settings = {
        folder: (folder || pwd + "data"),
        recursive: true,
        ignore: [".load.json", ".initial.json", ".DS_Store"],
        prefix: "/",
        stripBaseFolder: true,
        collections: []
          // TODO support linking .jpg and .xml (and XHTML) files automatically
          // TODO support <filename>.meta XML files alongside main files
      };
      var filename = settings.folder + "/" + (settingsFile || ".load.json");
      settings.filename = filename;

      //log("settings defaults: " + JSON.stringify(settings));

      for (var name in inheritedSettings) {
        settings[name] = inheritedSettings[name];
      }

    // pass these file names and details to the consumer
    processFolder(settings).then(function() {
      self._monitor.log("Finished processing all folders");
      var deferred3 = Q.defer();

      // actually upload each file in groups of 10 (or -thread_count)
      var promises = [];

      var threads = 20;
      self._monitor.log("fileInfoArray length: " + fileInfoArray.length);
      var batches = Math.ceil(fileInfoArray.length / threads);
      for (var split = 0;split < batches;split++) {
        var startIdx = split * threads;
        var endIdx = ((split + 1) * threads) - 1;
        if (endIdx > fileInfoArray.length - 1) {
          endIdx = fileInfoArray.length - 1;
        }
        promises[split] = uploadFile;
      }
      promises[split] = uploadFile; // hack
      self._monitor.log("Number of file upload splits: " + promises.length);
      self._monitor.log("Number of file batches: " + batches);
      //Q.all(promises).then(deferred3.resolve("SUCCESS"));
      var end = threads - 1;
      if (end > fileInfoArray.length) {
        end = fileInfoArray.length - 1;
      }
      promises.reduce(Q.when,Q({arr: fileInfoArray,start: 0,end: end,size: threads})).then(function() {
        self._monitor.log("Finished processing all uploaded files");
        deferred3.resolve("SUCCESS");
      }).catch(function(error) {
        self._monitor.error("Error during process Folder reduce: " + error);
        deferred3.reject(error);
      });


      return deferred3.promise;
    }).then(function(output){
      deferred.resolve("SUCCESS");
    }).catch(function(error) {
      self._monitor.error("Error in process Folder wider catch: " + error);
      deferred.reject(error);
    });

    return deferred.promise;
  };


module.exports = deployer;
