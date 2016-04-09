#!/usr/bin/env node

//var mljs = require('mljs');
var mljsBackend = require("./backend-mljs.js");
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
//var db = new mljs();
// override Winston logger for the command line output and hidden error messages (to a file)
//db.setLogger(logger);
//db.configure(env);
//log("ENV: " + JSON.stringify(env));


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

var monitor = {
  crapout: crapout, error: error,warn: warn,log: log,ok: ok,debug:debug,title:title
}; // for passing to backend


// detect which backend to use
var backend = new mljsBackend(monitor);
backend.setLogger(logger);

if (!backend.hasDriver()) {
  // problem getting hold of MLJS library
  warn("Could not load MLJS driver: '" + backend.getException().toString() + "'");

  // TODO fall back to other drivers
  crapout("Missing mljs library. Execute 'npm install -g mljs' and try again.");
}

backend.setAdminDBSettings(env);

var loaddb = null;
var lenv = {};
for (var name in env) {
  lenv[name] = "" + env[name];
}
//log("dboptions username before lenv: " + db.dboptions.username);
// Allow special username for loading content vs. administration
if (undefined != env.loadusername) {
  //loaddb = new mljs();
  lenv.username = env.loadusername;
  lenv.password = env.loadpassword;
} else {
  //loaddb = db;
}
backend.setContentDBSettings(lenv);
//log("dboptions username after lenv: " + db.dboptions.username);
//log("load dboptions username after lenv: " + loaddb.dboptions.username);

//var mdb = new mljs();
//mdb.setLogger(logger);
var menv = {};
for (var name in env) {
  menv[name] = "" + env[name];
}
menv.port = menv.modulesport;
menv.database = menv.modulesdatabase;
menv.appname = menv.database + "-rest-" + menv.port;

backend.setModulesDBSettings(menv);

//mdb.configure(menv);
debug("CONTENTENV: " + JSON.stringify(env));
debug("MODULESENV: " + JSON.stringify(menv));
debug("LOADENV: " + JSON.stringify(lenv));


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
    title(" - install_restapi()");

    return backend.createContentDBRestAPI();
  },

  // WORKS
  install_modulesrestapi: function() {
    title(" - install_modulesrestapi()");

    return backend.createModulesDBRestAPI();
  },

  // WORKS
  install_modules: function(params) {
    title(" - install_modules()");
    var folder = pwd + "modules";
    if (undefined != params && undefined != params.m) {
      folder = params.m;
    }

    // loop through folder recursively and save modules to mdb

    //var mdb = new mljs();
    //mdb.setLogger(logger);
    //mdb.configure(menv);

    var settings = {
      folder: folder,
      recursive: true,
      ignore: [".load.json", ".initial.json", ".DS_Store"],
      prefix: "/",
      stripBaseFolder: true,
      collections: []
    };
    log("calling load folder: " + JSON.stringify(settings));
    return targets._loadFolder2(backend.saveModules, folder, settings);
  },

  // WORKS
  install_extensions: function() {
    var deferred = Q.defer();
    title(" - install_extensions()");
    log("user: " + env.username);
    //log("db user: " + db.dboptions.username);
    // install rest extensions in REST server
    // read data/restapi.json file for list of extensions

    var readFile = function(ext) {
      var deferred2 = Q.defer();
      fs.readFile(pwd + './rest-api/ext/' + ext.name + ".xqy", 'utf8', function(err, content) {
        if (err) {
          crapout(err);
        }
        backend.installExtension(ext.name, ext.methods, content).then(function(output) {
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

          promises[e] = backend.installTrigger(trg);
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
        backend.saveGraph(data,graphName).then(function() {
          ok("    - SUCCESS installing ontology to graph: " + graphname);
          deferred.resolve("SUCCESS");
        }).catch(function(error) {
          crapout(error);
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
      backend.saveWorkplace(data).then(function() {
        deferred.resolve(params);
      }).catch(function(error) {
        crapout(error);
      });
    });
    return deferred.promise;
  },

  // WORKS
  /**
   * Install extra database configuration if it exists (config/ml-config.xml OR deploy/ml-config.xml (Roxy old files))
   **/
  update_dbconfig: function(params) {
    var deferred = Q.defer();

    title(" - update_dbconfig()");
    backend.applyDatabasePackage(env.database, pwd,"contentdbconfig").then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  },

  // WORKS
  update_modulesdbconfig: function(params) {
    var deferred = Q.defer();

    title(" - update_modulesdbconfig()");
    backend.applyDatabasePackage(env.modulesdatabase, pwd,"modulesdbconfig").then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      deferred.reject(error);
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
          backend.installSearchOptions(name,file,doc).then(function() {
            deferred2.resolve(file);
          }).catch(function(error) {
            crapout(error);
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
    backend.captureWorkplace(file).then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
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

    backend.captureGraph(graphName,settings,file).then(function(result) {
      ok("    - SUCCESS capturing ontology to file: " + file);
      title(" - capture_ontology() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
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

      backend.captureTriggers(file,restapi).then(function(result) {
        ok("    - SUCCESS capturing installed triggers to file: " + file);
        title(" - capture_triggers() complete");
        deferred.resolve(params);
      }).catch (function(error) {
        deferred.reject(error);
      });
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
    backend.captureSearchOptions().then(function(result) {
      self._monitor.title("  - capture_searchoptions() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  },

  // WORKS
  /**
   * Capture MarkLogic database configuration (Packaging API?)
   **/
  capture_dbconfig: function(params) {
    var deferred = Q.defer();
    backend.captureDatabase(params, env.database, pwd,"contentdbconfig").then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
    });
    return deferred.promise;
  },

  // WORKS
  capture_modulesdbconfig: function(params) {
    var deferred = Q.defer();
    backend.captureDatabase(params, env.modulesdatabase, pwd,"modulesdbconfig").then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
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
    title(" - remove_restapi()");

    return backend.removeContentDBRestAPI();
  },

  // WORKS
  remove_modulesrestapi: function() {
    title(" - remove_modulesrestapi()");
    /*
    var modulesenv = {};
    for (var name in env) {
      modulesenv[name] = env[name];
    }
    modulesenv.port = modulesenv.modulesport;
    modulesenv.database = modulesenv.modulesdatabase;
    modulesenv.appname = modulesenv.database + "-rest-" + modulesenv.port;
    */
    //log("    - config: " + JSON.stringify(modulesenv));
    /*
    db.destroy(modulesenv, function(result) {
      if (result.inError) {
        crapout(result.detail);
      } else {
        // all ok
        ok("    - SUCCESS");
        deferred.resolve("SUCCESS");
      }
    });
    return deferred.promise;*/
    return backend.removeModulesDBRestAPI();
  },


  remove_triggers: function(params) {
    var deferred = Q.defer();
    title(" - remove_triggers()");
    // install rest extensions in REST server
    // read data/restapi.json file for list of extensions
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
          promises[e] = backend.removeTrigger(trg.name, env.triggersdatabase);
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
    var readFile = function(ext) {
      return backend.removeExtension(ext.name);
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
    return targets._loadFolder2(backend.saveContent, pwd + "data", ".initial.json");
  },

  // WORKS
  load_folderold: function(args) {
    // check to see if we have a parameter folder or not
    title(" - load_folderold()");
    // TODO handle trailing slash in folder name of args.f
    // TODO windows file / and \ testing
    return targets._loadFolder(loaddb, args.f, ".load.json");
  },

  load_folder: function(args) {
    // check to see if we have a parameter folder or not
    title(" - load_folder()");
    // TODO handle trailing slash in folder name of args.f
    // TODO windows file / and \ testing
    return targets._loadFolder2(backend.saveContent, args.f, ".load.json");
  },

  _loadFolder2: function(dbSaveFunc,folder,settingsFile,base_opt,inheritedSettings) {
    var deferred = Q.defer();
    var saveFile = function(settings,file) {
      var deferred2 = Q.defer();
      //log("      - Found: " + settings.folder + "/" + file);
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
              dbSaveFunc(data,uri,props).then(function() {
                deferred2.resolve(settings.folder + "/" + file);
              }).catch(function(error) {
                warn(JSON.stringify(error));
              });

            }); // end itob
          } // end error if
        });
      }

      return deferred2.promise;
    }; // end saveFile

    var uploadFile = function(ctx) {
      log("   - uploading file array portion: start: " + ctx.start + " to end: " + ctx.end + " of max: " + ctx.arr.length);
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
        end = cts.arr.length - 1;
      }
      Q.all(ufpromises).then(function() {
        deferred4.resolve({arr: ctx.arr,start: ctx.start + ctx.size,end: end, size: ctx.size});
      });

      return deferred4.promise;
    };

    var fileInfoArray = []; // hold fileInfoArray elements

    // recursively pass through each folder, loading settings and file path info as you go
    var processFolder = function(settings) {
      // This producer only returns a promise, and recursively steps through each folder, returning a deferred promise
      var deferred2 = Q.defer();

      var filename = settings.folder + "/" + (settingsFile || ".load.json");


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


      // load DIRs
      fs.readdir(settings.folder, function(err, files) {
        //log("Reading folder: " + settings.folder);
        if (err) {
          crapout(err);
        }

        var dofile = function(file) {
          //log("dofile called for: " + file);
          var deferred7 = Q.defer();

          fs.lstat(settings.folder + '/' + file, function(err, stats) {
            //log("Got stat for: " + settings.folder + "/" + file);
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
          console.log(" - Finished processing folder: " + settings.folder);
          deferred2.resolve();
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
      log("Finished processing all folders");
      var deferred3 = Q.defer();

      // actually upload each file in groups of 10 (or -thread_count)
      var promises = [];

      var threads = 20;
      log("fileInfoArray length: " + fileInfoArray.length);
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
      log("Number of file upload splits: " + promises.length);
      log("Number of file batches: " + batches);
      //Q.all(promises).then(deferred3.resolve("SUCCESS"));
      var end = threads - 1;
      if (end > fileInfoArray.length) {
        end = fileInfoArray.length - 1;
      }
      promises.reduce(Q.when,Q({arr: fileInfoArray,start: 0,end: end,size: threads})).then(function() {
        log("Finished processing all uploaded files");
        deferred3.resolve("SUCCESS");
      });


      return deferred3.promise;
    }).then(function(output){
      deferred.resolve("SUCCESS");
    });

    return deferred.promise;
  },

  // WORKS - OLD - NO LONGER USED - KEPT JUST IN CASE I'VE BORKED THE NEW ONE!!!
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
                  //log("Doc props: " + JSON.stringify(props));
                  //log(uri);
                  db.save(data, uri, props, function(result) {
                    if (result.inError) {
                      // just log the message
                      error("    - ERROR saving file to uri: " + uri);
                      error(result.detail);
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
    var colsExclude = [];
    var colsInclude = [];
    if (undefined != params && undefined != params.e) {
      colsExclude = params.e.split(",");
    }
    if (undefined != params && undefined != params.i) {
      colsInclude = params.i.split(",");
    }

    backend.clean(colsExclude,colsInclude).then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      deferred.reject(error);
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
