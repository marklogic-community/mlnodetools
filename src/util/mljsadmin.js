#!/usr/bin/env node

var mljs = require('mljs');
var fs = require('fs');
var pwd = process.env.PWD + "/";
var jsonText = fs.readFileSync(pwd + "config/env.js", "UTF-8");
var env = null;
if (undefined != jsonText) {
  env = JSON.parse(jsonText);
}
var parseArgs = require("minimist");
var Q = require("q");
var winston = require('winston');
var itob = require('istextorbinary');
//var colors = require('colors/safe');
var term = require('terminal-kit').terminal; // see https://www.npmjs.com/package/terminal-kit#ref.colors

Q.longStackSupport = true;

/*
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'white',
  ok: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'cyan',
  debug: 'blue',
  error: 'red',
//  title: ['yellow','bold']
  title: 'bold' // ['yellow','bold'] results in a bug in colors - https://github.com/Marak/colors.js/issues/124
});*/

// TODO checkout http://blog.soulserv.net/terminal-friendly-application-with-node-js-part-iii-user-inputs/

// globals
if (undefined == Array.prototype.contains) {
  Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
      if (this[i] === obj) {
        return true;
      }
    }
    return false;
  };
}



// Command line administration tool for MarkLogic using MLJS and the REST API


var logger = new(winston.Logger)({
  transports: [
    new winston.transports.File({
      filename: 'mljsadmin.log',
      level: 'debug'
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'mljsadmin.log',
      level: 'debug'
    })
  ]
});


env.appname = env.database + "-rest-" + env.port; // fix for naming of rest api instance
var db = new mljs();
// override Winston logger for the command line output and hidden error messages (to a file)
db.setLogger(logger);
db.configure(env);
//log("ENV: " + JSON.stringify(env));

//var mdb = new mljs();
//mdb.setLogger(logger);
var menv = {};
for (var name in env) {
  menv[name] = "" + env[name];
}
menv.port = menv.modulesport;
menv.database = menv.modulesdatabase;
menv.appname = menv.database + "-rest-" + menv.port;



var crapout = function(msg) {
  //console.log(colors.error("FATAL ERROR: " + msg));
  //console.log(colors.error(" - Check mljsadmin.log for details"));
  term.red("FATAL ERROR: " + msg);
  term("\n");
  term.red(" - Check mljsadmin.log for details");
  term("\n");
  process.exit(1);
};
var error = function(msg) {
  //console.log(colors.error(msg));
  term.red(msg);
  term("\n");
};
var warn = function(msg) {
  //console.log(colors.warn("    - WARN: " + msg));
  //term.color256(175,"    - WARN: " + msg);
  //term.colorRgb(252,127,0,"    - WARN: " + msg);
  term.yellow("    - WARN: " + msg);
  term("\n");
};
var log = function(msg) {
  //console.log(colors.info(msg));
  term(msg);
  term("\n");
};
var ok = function(msg) {
  //console.log(colors.ok(msg));
  term.green(msg);
  term("\n");
};
var debug = function(msg) {
  //console.log(colors.debug(msg));
  term.brightBlack(msg);
  term("\n");
};
var title = function(msg) {
  //console.log(colors.title(msg));
  term.blue.bold(msg);
  term("\n");
};

//mdb.configure(menv);
debug("CONTENTENV: " + JSON.stringify(env));
debug("MODULESENV: " + JSON.stringify(menv));


// TODO validate options. If any look dumb, then fail with usage message and examples
var usage = function(msg) {
  if (undefined != msg) {
    error("INVALID COMMAND: " + msg);
  }
  log("usage: mljsadmin install");
  log("       mljsadmin --install");
  log("       mljsadmin --install=restapi");
  log("       mljsadmin --install=modulesrestapi");
  log("       mljsadmin --install=extensions"); // works in mlnodetools 8.0.6
  log("       mljsadmin --install=modules [-m ./modules]"); // works in mlnodetools 8.0.6 (both forms tested)
  log("       mljsadmin --install=triggers"); // works in mlnodetools 8.0.6
  log("       mljsadmin update");
  log("       mljsadmin --update");
  log("       mljsadmin --update=restapi NOT IMPLEMENTED");
  log("       mljsadmin --update=dbconfig");
  log("       mljsadmin --update=modulesdbconfig");
  log("       mljsadmin --update=searchoptions"); // works in mlnodetools 8.0.6 (including malformed searchoptions)
  log("       mljsadmin --update=ontology [-o ./data/ontology.ttl] [-g ontologyGraphName]"); // works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin --update=workplace [-w ./data/mljs-workplace.xml]");
  log("       mljsadmin capture");
  log("       mljsadmin --capture=restapi NOT IMPLEMENTED");
  log("       mljsadmin --capture=dbconfig");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin --capture=modulesdbconfig");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin --capture=extensions NOT IMPLEMENTED");
  log("       mljsadmin --capture=searchoptions");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin --capture=ontology [-o ./data/ontology.ttl] [-g ontologyGraphName]"); // works in mlnodetools 8.0.6 (although blank ontology is malformed - rest extension issue)
  log("       mljsadmin --capture=workplace [-w ./data/mljs-workplace.xml]");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin --capture=triggers"); // works in mlnodetools 8.0.6
  log("       mljsadmin remove");
  log("       mljsadmin --remove");
  log("       mljsadmin --remove=restapi");
  log("       mljsadmin --remove=modulesrestapi");
  log("       mljsadmin --remove=extensions");
  log("       mljsadmin --remove=triggers");
  log("       mljsadmin load");
  log("       mljsadmin --load");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin --load=initial");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin --load=folder -f /some/base/folder");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin clean [-i includeCollection1,includeCollection2] [-e excludeCollection3,excludeCollection4]"); // removes all content from database (including workplace)
  log("       mljsadmin reset "); // clean followed by update ontology, workplace, load initial
  log("       mljsadmin patch NOT IMPLEMENTED"); // patch mljs and mljsadmin to latest MASTER release
  log("       mljsadmin devpatch NOT IMPLEMENTED"); // patch mljs and mljsadmin to latest DEV release
  log("  GLOBAL OPTIONS:-");
  log("    --conf=<FILENAME> (Use an alternative configuration file to ./config/env.js)");
  process.exit(1);
};



var targets = {

  // WORKS
  /**
   * Base install command, calls all other commands in order
   **/
  install: function(params) {
    //targets.install_restapi().then(targets.install_modulesrestapi()).then(targets.install_extensions());
    var funcs = [targets.install_restapi, function() {
        return Q.delay(10000);
      }, targets.install_modulesrestapi,
      function() {
        return Q.delay(10000);
      },
      targets.install_modules, targets.install_extensions, targets.install_triggers,
      function() {
        return Q.delay(5000);
      },
      targets.update, targets.load_initial
    ]; // NB triggers done immediately after extensions incase any triggers need to run on loaded initial content
    funcs.reduce(Q.when, Q(params));
  },



  // WORKS
  /**
   * Create REST API instance. Optionally create database if it doesn't exist
   **/
  install_restapi: function() {
    var deferred = Q.defer();
    title(" - install_restapi()");
    //log("    - config: " + JSON.stringify(env));
    db.create(function(result) {
      if (result.inError) {
        log(JSON.stringify(result));
        crapout(result.detail);
      } else {
        // all ok
        ok("    - SUCCESS");
        deferred.resolve("SUCCESS");
      }
    });
    return deferred.promise;
  },

  // WORKS
  install_modulesrestapi: function() {
    var deferred = Q.defer();
    title(" - install_modulesrestapi()");
    //log("    - config: " + JSON.stringify(modulesenv));
    db.create(menv, function(result) {
      if (result.inError) {
        crapout(result.error);
      } else {
        // all ok
        ok("    - SUCCESS");
        deferred.resolve("SUCCESS");
      }
    });
    return deferred.promise;
  },

  // WORKS
  install_modules: function(params) {
    title(" - install_modules()");
    var folder = pwd + "modules";
    if (undefined != params && undefined != params.m) {
      folder = params.m;
    }

    // loop through folder recursively and save modules to mdb

    var mdb = new mljs();
    mdb.setLogger(logger);
    mdb.configure(menv);

    var settings = {
      folder: folder,
      recursive: true,
      ignore: [".load.json", ".initial.json", ".DS_Store"],
      prefix: "/",
      stripBaseFolder: true,
      collections: []
    };
    log("calling load folder: " + JSON.stringify(settings));
    return targets._loadFolder(mdb, folder, settings);
  },

  // WORKS
  install_extensions: function() {
    var deferred = Q.defer();
    title(" - install_extensions()");
    // install rest extensions in REST server
    // read data/restapi.json file for list of extensions
    var installModule = function(moduleName, methodArray, content) {
      var deferred3 = Q.defer();
      db.installExtension(moduleName, methodArray, content, function(result) {
        if (result.inError) {
          //warn("FAILED to install REST API extension '" + moduleName + "': " + result.details.errorResponse.message);
          deferred3.reject("Error whilst installing extension '" + moduleName + "': " + result.details.errorResponse
            .message);
        } else {
          ok("    - SUCCESS - " + moduleName);
          deferred3.resolve(moduleName);
        }
      });
      return deferred3.promise;
    };
    var readFile = function(ext) {
      var deferred2 = Q.defer();
      fs.readFile(pwd + './rest-api/ext/' + ext.name + ".xqy", 'utf8', function(err, content) {
        if (err) {
          crapout(err);
        }
        installModule(ext.name, ext.methods, content).then(function(output) {
          deferred2.resolve(ext.name);
        }).catch(function(err) {
          deferred2.reject(err);
        });
      });
      return deferred2.promise;
    };
    fs.readFile(pwd + './data/restapi.json', 'utf8', function(err, data) {
      if (err) {
        crapout(err);
      }
      var json = JSON.parse(data);
      var exts = json.extensions;
      var promises = [];
      for (var e = 0, maxe = exts.length, ext; e < maxe; e++) {
        ext = exts[e];
        log("    - Attempting to install MarkLogic REST API extension '" + ext.name + "'");
        // process each extension and install
        // TODO check for xqy vs js implementation (V8 only)
        promises[e] = readFile(ext);
      }
      Q.all(promises).catch(function(error) {
        warn(
          "Could not install all extensions. Fix problem then try mljsadmin --install=extensions again (source: " +
          error + ")");
      }).finally(function(output) {
        info("  - install_extensions() complete");
        deferred.resolve("SUCCESS - completed rest extension installation");
      });
    });
    return deferred.promise;
  },


  install_triggers: function(params) {
    var deferred = Q.defer();
    title(" - install_triggers()");
    // install rest extensions in REST server
    // read data/restapi.json file for list of extensions
    var installTrigger = function(triggerInfo) {
      var deferred3 = Q.defer();
      db.installTrigger(triggerInfo, function(result) {
        log("    - result: " + JSON.stringify(result));
        if (result.inError) {
          //throw new Error(result.detail);
          deferred3.reject("Error whilst installing trigger '" + triggerInfo.name + "': " + result.details.errorResponse
            .message);
        } else {
          ok("    - SUCCESS - installing trigger " + triggerInfo.name + " : " + triggerInfo.comment);
          deferred3.resolve(params);
        }
      });
      return deferred3.promise;
    };
    fs.readFile(pwd + './data/restapi.json', 'utf8', function(err, data) {
      if (err) {
        crapout(err);
      }
      var json = JSON.parse(data);
      var triggers = json.triggers;
      var promises = [];
      if (undefined != triggers) {
        for (var e = 0, maxe = triggers.length, trg; e < maxe; e++) {
          trg = triggers[e];
          // process each trigger and install

          // MUST OVERWRITE DB NAME!
          trg.module.database = env.modulesdatabase;

          promises[e] = installTrigger(trg);
        }
      }
      Q.all(promises).catch(function(error) {
        warn(
          "Could not install all triggers. Fix problem then try mljsadmin --install=triggers again (source: " +
          error + ")");
      }).finally(function(output) {
        deferred.resolve(params);
      });
    });
    return deferred.promise;
  },


  /**
   * Generic update handler - calls all remaining configuration updating handlers
   **/
  update: function(params) {
    title(" - update()");
    //targets.update_ontology()
    //  .then(targets.update_workplace()).then(targets.update_searchoptions());
    var funcs = [targets.update_dbconfig, targets.update_modulesdbconfig,
      targets.update_workplace, targets.update_searchoptions, targets.update_ontology
    ];
    return funcs.reduce(Q.when, params);
  },



  /**
   * Install REST API extensions, if they exist (rest-api/ext/*)
   **/
  update_restapi: function() {
    title(" - update_restapi()");
    log("   - Not yet implemented");
  },



  /**
   * Install ontology, if it exists (config/ontology.ttl) in Turtle format ('ontology' named graph) - optional custom name
   **/
  update_ontology: function(params) {
    var deferred = Q.defer();
    title(" - update_ontology()");
    var file = pwd + 'data/ontology.ttl';
    if (undefined != params && undefined != params.o) {
      file = params.o;
    }
    var graphname = "ontology";
    if (undefined != params && undefined != params.g) {
      graphname = params.g;
    }
    log("    - loading ontology from file: " + file);
    //log("   - Not yet implemented");
    // TODO check if OPTIONAL ontology exists
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        // doesn't exist
        warn("SKIPPING as Ontology file does not exist: " + file);
        deferred.resolve(params);
        //crapout(err);
      } else {
        db.saveGraph(data, graphname, {
          format: "turtle"
        }, function(result) {
          if (result.inError) {
            crapout(result.detail);
          } else {
            // all ok
            ok("    - SUCCESS installing ontology to graph: " + graphname);
            deferred.resolve("SUCCESS");
          }
        });
      }
    });
    return deferred.promise;
  },

  // WORKS
  /**
   * Install workplace file, if it exists (config/mljs-workplace.xml)
   **/
  update_workplace: function(params) {
    var deferred = Q.defer();
    title(" - update_workplace()");
    var file = pwd + 'data/mljs-workplace.xml';
    if (undefined != params && undefined != params.w) {
      file = params.w;
    }
    log("    - Installing workplace xml file: " + file);
    //log("   - Not yet implemented");
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        crapout(err);
      }
      //log("data: " + data);
      //log("data.toString(): " + data.toString());
      db.saveWorkplace(data, function(result) {
        if (result.inError) {
          log(JSON.stringify(result));
          crapout(result.detail);
        } else {
          // all ok
          ok("    - SUCCESS installing workplace xml file: " + file);
          deferred.resolve(params);
        }
      });
    });
    return deferred.promise;
  },

  // WORKS
  /**
   * Install extra database configuration if it exists (config/ml-config.xml OR deploy/ml-config.xml (Roxy old files))
   **/
  update_dbconfig: function(params) {
    title(" - update_dbconfig()");
    return targets.__applyDatabasePackage(params, env.database, "contentdbconfig");
  },

  // WORKS
  update_modulesdbconfig: function(params) {
    title(" - update_modulesdbconfig()");
    return targets.__applyDatabasePackage(params, env.modulesdatabase, "modulesdbconfig");
  },

  __applyDatabasePackage: function(params, name, filename) {
    var deferred = Q.defer();
    // read file
    var file = pwd + "packages/databases/" + filename + ".xml"; // TODO check and skip
    log("    - reading package xml file: " + file);
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        //crapout(err);
        warn("No package found for: " + filename + ", skipping");
        deferred.resolve(params);
      } else {
        log("    - Read file: " + file);
        // create/update package
        db.createPackage(name, data, function(result) {
          if (result.inError) {
            crapout(result.detail);
          } else {
            log("    - Created package: " + name);

            db.addDatabaseToPackage(name, name, data, function(result) {
              if (result.inError) {
                crapout(result.detail);
              } else {
                log("    - Added database to package: " + name);

                // apply package
                db.installPackage(name, function(result) {
                  if (result.inError) {
                    crapout(result.detail);
                  } else {
                    ok("   - SUCCESS installed database package for " + name);

                    db.deletePackage(name, function(result) {
                      if (result.inError) {
                        crapout(result.detail);
                      } else {
                        deferred.resolve(params);
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
  },


  // WORKS
  /**
   * Install REST API extensions, if they exist (rest-api/ext/*)
   **/
  update_searchoptions: function() {
    var deferred = Q.defer();
    title(" - update_searchoptions()");
    fs.readdir(pwd + "./rest-api/config/options", function(err, files) {
      if (err) {
        crapout(err);
      }
      log("    - Found options: " + files);
      var saveWP = function(file) {
        var deferred2 = Q.defer();

        fs.readFile(pwd + "rest-api/config/options/" + file, 'utf8', function(err, data) {
          if (err) {
            crapout(err);
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
          db.saveSearchOptions(name, doc, function(result) {
            if (result.inError) {
              crapout(JSON.stringify(result) + " for " + file);
            } else {
              // all ok
              ok("    - SUCCESS for " + file); // TODO may not work, may need to be shielded in function wrapper
              deferred2.resolve(file);
            }
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
        title(" - update_searchoptions() complete");
        deferred.resolve("All search options installed");
      }); // no fail() as we instantly end the app anyway
      //log("   - Not yet implemented");
    });
    return deferred.promise;
  },



  /*
   * READ ONLY COMMANDS, FOR PRE-SHARING DEMOS
   */


  capture: function(params) {
    targets.capture_workplace(params); //.then(targets.capture_ontology());
    var funcs = [targets.capture_confirm, targets.capture_dbconfig, targets.capture_modulesdbconfig,
      targets.capture_workplace, targets.capture_ontology,
      targets.capture_searchoptions, targets.capture_triggers
    ];
    return funcs.reduce(Q.when, Q(params)); // TODO pass in params
  },

  capture_confirm: function(params) {
    var deferred = Q.defer();
    title(" - capture_confirm()");
    // read content database name
    // ask for user confirmation, or selection of other DB
    // if other, list other content databases
    // once selected, fetch modules db and triggers db and REST application port for both (if they exist)
    // save all these settings in env.js so they are available to all other capture commands
  },

  // WORKS
  /**
   * Capture workplace configuration
   **/
  capture_workplace: function(params) {
    var deferred = Q.defer();
    var file = pwd + 'data/mljs-workplace.xml';
    if (undefined != params && undefined != params.w) {
      folder = params.w;
    }
    title(" - capture_workplace()");
    log("   - saving workplace configuration to file: " + file);
    db.workplace(function(result) {
      if (result.inError) {
        crapout(result.detail); // workplace extension not installed???
      } else {
        //log(JSON.stringify(result));
        // all ok
        fs.writeFile(file, result.body, function(err) {
          if (err) return crapout(err);
          ok("   - SUCCESS capturing workplace to: " + file);
          deferred.resolve(params);
        });
      }
    });
    return deferred.promise;
  },

  // WORKS
  /**
   * Capture ontology in Turtle format ('ontology' named graph) - optional custom name
   **/
  capture_ontology: function(params) {
    var deferred = Q.defer();
    title(" - capture_ontology()");
    var file = pwd + 'data/ontology.ttl';
    if (undefined != params && undefined != params.o) {
      file = params.o;
    }
    var graphname = "ontology";
    if (undefined != params && undefined != params.g) {
      graphname = params.g;
    }
    log("   - Storing ontology in file: " + file + " from ontology graph: " + graphname);
    db.graph(graphname, {
      format: "turtle"
    }, function(result) {
      if (result.inError) {
        crapout(result.detail);
      } else {
        // all ok
        fs.writeFile(file, result.body, function(err) {
          if (err) return crapout(err);
          ok("    - SUCCESS capturing ontology to file: " + file);
          title(" - capture_ontology() complete");
          deferred.resolve(params);
        });
      }
    });
    return deferred.promise;
  },

  capture_triggers: function(params) {
    var deferred = Q.defer();
    title(" - capture_triggers()");

    // read existing restapi.json file
    var file = pwd + 'data/restapi.json';
    log("    - Reading existing Workplace rest api config: " + file);

    var restapi = {}; // defaults

    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        //crapout(err);
        warn("Could not read restapi.json file(doesn't exist yet?), using assumed defaults");
        // do nothing - create the config from defaults
      } else {
        restapi = JSON.parse(data);
      }

      db.triggers(function(result) {
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
            if (err) return crapout(err);
            ok("    - SUCCESS capturing installed triggers to file: " + file);
            title(" - capture_triggers() complete");
            deferred.resolve(params);
          });

          deferred.resolve(params);
        }
      });
    });
    return deferred.promise;
  },


  __saveSearchOptions: function(params, name, uri) {
    var deferred = Q.defer();

    db.searchOptions(name, {
      format: "xml"
    }, function(result) {
      if (result.inError) {
        //crapout(result.detail);
        deferred.reject("Could not fetch search options configuration for '" + name + "' source: " +
          result.details.errorResponse.message);
      } else {
        fs.writeFile(pwd + "rest-api/config/options/" + name + ".xml", result.body, function(err) {
          if (err) return crapout(err);
          ok("    - SUCCESS saving search options: " + name);
          deferred.resolve(params);
        });
      }
    });

    return deferred.promise;
  },

  // WORKS
  /**
   * Capture all search options (Packaging API?)
   **/
  capture_searchoptions: function(params) {
    var deferred = Q.defer();
    title(" - capture_searchoptions()");
    db.searchoptions(function(result) {
      if (result.inError) {
        //crapout(result.detail);
        deferred.reject("Could not retrieve search options. Source: " +
          result.details.errorResponse.message);
      } else {
        var promises = [];
        var files = result.doc;
        for (var f = 0, maxf = files.length, file; f < maxf; f++) {
          file = files[f];
          promises[f] = targets.__saveSearchOptions(params, file.name, file.uri);
        }
        Q.all(promises).catch(function(error) {
          warn(
            "Could not capture all searchoptions. Fix problem then try mljsadmin --capture=searchoptions again (source: " +
            error + ")");
        }).finally(function(output) {
          title("  - capture_searchoptions() complete");
          deferred.resolve(params);
        });
      }
    });
    return deferred.promise;
  },

  // WORKS
  /**
   * Capture MarkLogic database configuration (Packaging API?)
   **/
  capture_dbconfig: function(params) {
    return targets.__captureDatabase(params, env.database, "contentdbconfig");
  },

  // WORKS
  capture_modulesdbconfig: function(params) {
    return targets.__captureDatabase(params, env.modulesdatabase, "modulesdbconfig");
  },

  __captureDatabase: function(params, name, filename) {
    var deferred = Q.defer();
    // get content database XML package file
    db.getDatabasePackage(name, function(result) {
      if (result.inError) {
        log(JSON.stringify(result));
        crapout(result.detail);
      } else {
        // add to correct package folder
        fs.writeFile(pwd + "./packages/databases/" + filename + ".xml", result.body, function(err) {
          if (err) return crapout(err);
          ok("    - SUCCESS saving database package: " + name + " as " + filename + ".xml");
          deferred.resolve(params);
        });
      }
    });
    return deferred.promise;
  },



  /**
   * TODO NA - just create with our scripts??? - Capture MarkLogic app server configuration (Packaging API?)
   **/



  // WORKS
  remove: function(params) {
    //targets.remove_extensions().then(targets.remove_restapi()).then(targets.remove_modulesrestapi());
    var funcs = [targets.remove_triggers, targets.remove_extensions, targets.remove_restapi, function() {
      return Q.delay(10000);
    }, targets.remove_modulesrestapi];
    funcs.reduce(Q.when, Q(params));
  },

  // WORKS
  remove_restapi: function() {
    var deferred = Q.defer();
    title(" - remove_restapi()");
    //log("    - config: " + JSON.stringify(env));
    db.destroy(function(result) {
      if (result.inError) {
        crapout(result.detail);
      } else {
        // all ok
        ok("    - SUCCESS");
        deferred.resolve("SUCCESS");
      }
    });
    return deferred.promise;

  },

  // WORKS
  remove_modulesrestapi: function() {
    var deferred = Q.defer();
    title(" - remove_modulesrestapi()");
    var modulesenv = {};
    for (var name in env) {
      modulesenv[name] = env[name];
    }
    modulesenv.port = modulesenv.modulesport;
    modulesenv.database = modulesenv.modulesdatabase;
    modulesenv.appname = modulesenv.database + "-rest-" + modulesenv.port;
    //log("    - config: " + JSON.stringify(modulesenv));
    db.destroy(modulesenv, function(result) {
      if (result.inError) {
        crapout(result.detail);
      } else {
        // all ok
        ok("    - SUCCESS");
        deferred.resolve("SUCCESS");
      }
    });
    return deferred.promise;

  },


  remove_triggers: function(params) {
    var deferred = Q.defer();
    title(" - remove_triggers()");
    // install rest extensions in REST server
    // read data/restapi.json file for list of extensions
    var removeTrigger = function(triggerName, triggersDatabase) {
      var deferred3 = Q.defer();
      db.removeTrigger(triggerName, triggersDatabase, function(result) {
        ok("    - SUCCESS - removed trigger " + triggerName);
        deferred3.resolve(params);
      });
      return deferred3.promise;
    };
    fs.readFile(pwd + './data/restapi.json', 'utf8', function(err, data) {
      if (err) {
        crapout(err);
      }
      var json = JSON.parse(data);
      var triggers = json.triggers;
      var promises = [];
      if (undefined != triggers) {
        for (var e = 0, maxe = triggers.length, trg; e < maxe; e++) {
          trg = triggers[e];
          // process each extension and install
          // TODO check for xqy vs js implementation (V8 only)
          promises[e] = removeTrigger(trg.name, env.triggersdatabase);
        }
      }
      Q.all(promises).then(function(output) {
        deferred.resolve(params);
      });
    });
    return deferred.promise;
  },

  // WORKS
  remove_extensions: function() {
    var deferred = Q.defer();
    title(" - remove_extensions()");
    // install rest extensions in REST server
    // read data/restapi.json file for list of extensions
    var removeModule = function(moduleName) {
      var deferred2 = Q.defer();
      db.removeExtension(moduleName, function(result) {
        ok("    - SUCCESS - " + moduleName);
        deferred2.resolve(moduleName);
      });
      return deferred2.promise;
    };
    var readFile = function(ext) {
      return removeModule(ext.name);
    };
    fs.readFile(pwd + './data/restapi.json', 'utf8', function(err, data) {
      if (err) {
        crapout(err);
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
  },



  // WORKS
  load: function(params) {
    targets.load_initial(params);
  },

  // WORKS
  load_initial: function() {
    // check for ./data/.initial.json to see what folder to load
    // process as for load
    title(" - load_initial()");
    return targets._loadFolder(db, pwd + "data", ".initial.json");
  },

  // WORKS
  load_folder: function(args) {
    // check to see if we have a parameter folder or not
    title(" - load_folder()");
    // TODO handle trailing slash in folder name of args.f
    // TODO windows file / and \ testing
    return targets._loadFolder(db, args.f, ".load.json");
  },

  // WORKS
  _loadFolder: function(db, folder, settingsFile, base_opt, inheritedSettings) {
    var base = base_opt || folder;
    log("    - " + folder);
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

    //log("settings defaults: " + JSON.stringify(settings));

    for (var name in inheritedSettings) {
      settings[name] = inheritedSettings[name];
    }

    //log("settings now: " + JSON.stringify(settings));

    // get base folder
    // process this folder with those settings, recursively

    var deferred = Q.defer();

    // load extra override settings
    fs.readFile(filename, 'utf8', function(err, data) {
      if (err) {
        //crapout(err);
        log("    - settings file doesn't exist: " + filename);
        // doesn't exist - ignore and carry on
      } else {
        log("    - settings file found: " + filename);
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
      log("      - Folder now: " + settings.folder);

      //log("settings finally: " + JSON.stringify(settings));

      // list all files and folders and treat these as width first progress update percentages
      fs.readdir(settings.folder, function(err, files) {
        if (err) {
          crapout(err);
        }
        //log("    - Found options: " + files);
        var saveFile = function(file) {
          var deferred2 = Q.defer();
          log("      - Found: " + settings.folder + "/" + file);
          if (settings.ignore.contains(file)) {
            log("      - Not uploading: " + settings.folder + "/" + file +
              " (File in ignore array in settings file)");
            deferred2.resolve(settings.folder + "/" + file);
          } else {

            fs.readFile(settings.folder + "/" + file, function(err, data) {


              if (err) {
                //crapout(err);
                warn("Problem reading file prior to save: " + settings.folder + "/" +
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
                  if (settings.stripBaseFolder) {
                    vf = settings.folder.substring(base.length + 1);
                  }
                  /*if (0 == vf.indexOf("/")) {
                    vf = vf.substring(1);
                  }*/
                  if (0 != vf.indexOf("/") && vf.length != 0) {
                    vf = "/" + vf;
                  }
                  var vff = file;
                  /*if (0 == vff.indexOf("/")) {
                    vff = vff.substring(1);
                  }*/
                  if (0 != vff.indexOf("/")) {
                    vff = "/" + vff;
                  }
                  var uri = settings.prefix + vf + vff;
                  if ("//" == uri.substring(0, 2)) {
                    uri = uri.substring(1); // remove extra slash at front
                  }
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
                  //uri = uri.replace(/ /g,"_");
                  uri = escape(uri);
                  //log("Doc props: " + JSON.stringify(props));
                  //log(uri);
                  db.save(data, uri, props, function(result) {
                    if (result.inError) {
                      // just log the message
                      error("    - ERROR saving file to uri: " + uri);
                    } else {
                      ok("    - SUCCESS " + settings.folder + "/" + file + " => " + uri +
                        " (" + result.docuri + ")");
                    }
                    deferred2.resolve(settings.folder + "/" + file);
                  });

                }); // end itob
              } // end error if
            });
          }

          return deferred2.promise;
        };


        var promises = [];
/*
        // OPT 1: saveAllParallel
        // strip out folder
        // for each file, generate a URI and get a Blob object for it
        // once all collected, call saveAllParallel
        saveAllParallel(doc_array,uri_array,transaction_size,thread_count,props,callback,progress_callback);

*/
        // OPT 2: traditional save on each file
        files.forEach(function(file, idx) {
          fs.lstat(settings.folder + '/' + file, function(err, stats) {
            if (err) {
              crapout(settings.folder + "/" + file + " : " + err);
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
                  promises[idx] = targets._loadFolder(db, settings.folder + "/" + file,
                    ".load.json", base, news);
                } else {
                  log("    - Not recursively processing folder: " + settings.folder);
                }
              }
            } else {
              promises[idx] = saveFile(file);
            }
          });
        });
        /*
        for (var f = 0,maxf = files.length,file;f < maxf;f++) {
          file = files[f];
          // TODO test for file or folder
          promises[f] = saveFile(file);
        }*/
        Q.all(promises).then(function(output) {
          deferred.resolve("Folder processed: " + folder);
        }); // no fail() as we instantly end the app anyway
      });

    }); // fs.readFile JSON


    return deferred.promise;
  },

  patch: function(params) {
    title(" - patch()");
    error("   - NOT IMPLEMENTED");
    //crapout("Exiting");

    // like devpatch, but from MASTER not DEV
    return targets.__patch(params, "MASTER");
  },

  devpatch: function(params) {
    title(" - devpatch()");
    error("   - NOT IMPLEMENTED");
    //crapout("Exiting");

    // Fetch latest MLJS Workplace app from GitHub DEV branch repo
    return targets.__patch(params, "DEV");
  },

  __patch: function(params, branch) {
    // fetch

    // unpack
    // copy /apps/workplace/src to app
    // copy /apps/workplace/src/app and /apps/workplace/src/roxy to modules/app and modules/roxy
    // copy /apps/workplace/rest-api content over


    // Fetch latest MLJS core NPM content from GitHub DEV branch
    // in src/js/mljs.js and src/js/lib
    // copy to ./node_modules/mljs/
    // need to copy over package.json?

    // NB may need to list and fetch individual files :( or download tar.gz packages and unpack :)

  },



  clean: function(params) {
    var deferred = Q.defer();

    // wipe all data
    title(" - clean()");
    var qb = db.createQuery();
    var cqt = [];
    if (undefined != params && undefined != params.e) {
      // exclude
      var cols = params.e.split(",");
      for (var c = 0, maxc = cols.length, col; c < maxc; c++) {
        col = cols[c];
        cqt.push(qb.collection(col));
      }
    }
    var iqt = [];
    if (undefined != params && undefined != params.i) {
      // exclude
      var cols = params.i.split(",");
      for (var c = 0, maxc = cols.length, col; c < maxc; c++) {
        col = cols[c];
        iqt.push(qb.collection(col));
      }
    }

    var q = qb.and([qb.not(cqt), qb.or(iqt)]);
    qb.query(q);

    var query = qb.toJson();

    db.deleteUsingSearch(query, function(result) {
      if (result.inError) {
        // just log the message
        error("    - ERROR deleting content using query: " + JSON.stringify(query) + " ERROR: " + JSON.stringify(
          result));
      } else {
        ok("    - SUCCESS deleting content");
      }
      deferred.resolve(params);

    });

    return deferred.promise;
  },

  reset: function(params) {
    var funcs = [targets.clean, targets.update_ontology, targets.update_workplace, targets.load_initial];
    funcs.reduce(Q.when, Q(params));
  }



};



// DO THE THANG



var argv = parseArgs(process.argv.slice(2));
/* Notes on usage of minimist:-
$ node example/parse.js -x 3 -y 4 -n5 -abc --beep=boop foo bar baz
{ _: [ 'foo', 'bar', 'baz' ],
x: 3,
y: 4,
n: 5,
a: true,
b: true,
c: true,
beep: 'boop' }
*/
var targetGroups = ["install", "update", "capture", "remove", "load", "patch", "devpatch", "reset", "clean"];
if (argv._.length == 1) { // just one non option parameter, and no --option= parameters
  var found = false
  for (var g = 0, maxg = targetGroups.length, group; !found && g < maxg; g++) {
    group = targetGroups[g];
    if (argv._[0] == group) {
      found = true;
      targets[group]();
    }
  }
  if (!found) {
    /*
    if ("install" == argv._[0]) {
      // do install
      targets.install();
    } else if ("update" == argv._[0]) {
      // do update
      targets.update();
    } else if ("capture" == argv._[0]) {
      // do capture
      targets.capture();
    } else if ("remove" == argv._[0]) {
      // do capture
      targets.remove();
    } else {
    */
    // fail with usage
    usage("Unknown instruction: '" + argv._[0] + "'");
  }
} else { // either multiple or zero option parameters, and potentially many --option= parameters
  //log("_length=" + argv._.length + " , argv length: " + argv.length);
  //if (argv._.length == 0) {
  // try -- parameters
  //if (argv.length == 2) { // empty _ parameter and just one other option
  var found = false;
  for (var g = 0, maxg = targetGroups.length, group; g < maxg; g++) {
    group = targetGroups[g];
    if (undefined != argv[group]) {
      if (true === argv[group]) {
        found = true;
        targets[group](argv);
      } else {
        if (argv[group] == "conf" && null == env) {
          // don't parse this once PER group, just first time (hence null == env above)
          //jsonText = jsonText = fs.readFileSync(, "UTF-8");
          //env = JSON.parse(jsonText);
        } else {
          var funcname = group + "_" + argv[group];
          var func = targets[funcname];
          if (undefined != func && 'function' == typeof(func)) {
            found = true;
            // call function
            func(argv);
          } else {
            usage("Unknown " + group + " target: '" + argv[group] + "'");
          }
        }
      }

    } // end group function exists if
  } // end target groups or

  // check config exists now
  if (null == env) {
    usage("Must execute mljsadmin in a folder that contains ./config/env.js , or use the --conf=FILENAME option");
  }

  // execute chosen main command
  if (!found) {
    var name = "";
    for (var n in argv) {
      if ("_" != n) {
        name = n;
      }
    }
    usage("Unknown option: '" + name + "'");
  }
  //} else {
  //  usage("Only one --option=whatever parameter allowed");
  //}
  //} else {
  // fail
  //  usage("Only one instruction (E.g. 'install') OR one option (E.g. '--install=something') can be used");
  //}
}
