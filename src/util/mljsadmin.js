#!/usr/bin/env node

//var mljs = require('mljs');
var mljsBackend = require("./backend-mljs.js");
var pwd = process.env.PWD + "/";


var parseArgs = require("minimist");
var Q = require("q");
var winston = require('winston');
//var colors = require('colors/safe');
//var term = require('terminal-kit').terminal; // see https://www.npmjs.com/package/terminal-kit#ref.colors
var term = require('chalk');

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

//var db = new mljs();
// override Winston logger for the command line output and hidden error messages (to a file)
//db.setLogger(logger);
//db.configure(env);
//log("ENV: " + JSON.stringify(env));

// TODO abstract logging out to a platform specific file, so that mljsadmin works in windows again.

var crapout = function(msg) {
  //console.log(colors.error("FATAL ERROR: " + msg));
  //console.log(colors.error(" - Check mljsadmin.log for details"));
  console.log(term.red("FATAL ERROR: " + msg));
  //term("\n");
  console.log(term.red(" - Check mljsadmin.log for details"));
  //term("\n");
  process.exit(1);
};
var error = function(msg) {
  //console.log(colors.error(msg));
  console.log(term.red(msg));
  //term("\n");
};
var warn = function(msg) {
  //console.log(colors.warn("    - WARN: " + msg));
  //term.color256(175,"    - WARN: " + msg);
  //term.colorRgb(252,127,0,"    - WARN: " + msg);
  console.log(term.yellow("    - WARN: " + msg));
  //term("\n");
};
var log = function(msg) {
  //console.log(colors.info(msg));
  console.log(msg);
  //term("\n");
};
var ok = function(msg) {
  //console.log(colors.ok(msg));
  console.log(term.green(msg));
  //term("\n");
};
var debug = function(msg) {
  //console.log(colors.debug(msg));
  //term.brightBlack(msg);
  console.log(term.gray(msg));
  //term("\n");
};
var title = function(msg) {
  //console.log(colors.title(msg));
  console.log(term.cyan.bold(msg));
  //term("\n");
};

var monitor = {
  crapout: crapout, error: error,warn: warn,log: log,ok: ok,debug:debug,title:title
}; // for passing to backend instance

var deployer = new (require("./mlnodetools.js").deployer)(monitor);
deployer.setLogger(logger);

var ranSetup = false;
var ensureEnvironmentExists = function() {
  var defaultEnvironment = null;
  if (!ranSetup) {
    deployer.loadEnvironment([pwd + "config/env.json",pwd + "config/env.js"]);
    ranSetup = true;
  }
  defaultEnvironment = deployer.getEnvironment();
  if (defaultEnvironment.inError()) {
    warn(defaultEnvironment.getError());
    usage("Must execute mljsadmin in a folder that contains ./config/env.json , or use the --conf=FILENAME option");
    process.exit(0);
  }

  if (!deployer.hasBackend()) {
    // problem getting hold of MLJS library
    warn("Could not load Backend driver: '" + deployer.getBackend().getException().toString() + "'");

    // TODO fall back to other drivers
    crapout("Missing mljs library. Execute 'npm install -g mljs' and try again.");
  }
};


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
  log("       mljsadmin --load");// works in mlnodetools 8.0.6-8.0.12 (none specified)
  log("       mljsadmin --load=initial");// works in mlnodetools 8.0.6-8.0.12 (none specified)
  log("       mljsadmin --load=folder -f /some/base/folder");// works in mlnodetools 8.0.6 (none specified)
  log("       mljsadmin clean [-i includeCollection1,includeCollection2] [-e excludeCollection3,excludeCollection4]"); // removes all content from database (including workplace)
  log("       mljsadmin reset "); // clean followed by update ontology, workplace, load initial
  log("       mljsadmin patch NOT IMPLEMENTED"); // patch mljs and mljsadmin to latest MASTER release
  log("       mljsadmin devpatch NOT IMPLEMENTED"); // patch mljs and mljsadmin to latest DEV release
  log("  GLOBAL OPTIONS:-");
  log("    --conf=<FILENAME> (Use an alternative configuration file to ./config/env.js or env.json)");
  process.exit(1);
};



var targets = {

  // WORKS 8.0.12
  /**
   * Base install command, calls all other commands in order
   **/
  install: function(params) {
    ensureEnvironmentExists();
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



  // WORKS 8.0.12
  /**
   * Create REST API instance. Optionally create database if it doesn't exist
   **/
  install_restapi: function() {
    title(" - install_restapi()");

    return deployer.createContentDBRestAPI();
  },

  // WORKS 8.0.12
  install_modulesrestapi: function() {
    title(" - install_modulesrestapi()");

    return deployer.createModulesDBRestAPI();
  },

  // WORKS 8.0.12
  install_modules: function(params) {
    title(" - install_modules()");
    var folder = pwd + "modules";
    if (undefined != params && undefined != params.m) {
      folder = params.m;
    }

    return deployer.installModules(folder);
  },

  // WORKS 8.0.12
  install_extensions: function() {
    title(" - install_extensions()");
    //log("user: " + env.username);
    return deployer.installExtensions(pwd);
  },

  // WORKS 8.0.12
  install_triggers: function(params) {
    title(" - install_triggers()");
    // install rest extensions in REST server
    var deferred = Q.defer();
    deployer.installTriggers(pwd).catch(function(error) {
        warn(
          "Could not install all triggers. Fix problem then try mljsadmin --install=triggers again (source: " +
          error + ")");
      }).finally(function(output) {
        deferred.resolve(params);
      });
    });
    return deferred.promise;
  },

  // WORKS 8.0.12
  /**
   * Generic update handler - calls all remaining configuration updating handlers
   **/
  update: function(params) {
    ensureEnvironmentExists();
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


  // TODO TBD
  /**
   * Install ontology, if it exists (config/ontology.ttl) in Turtle format ('ontology' named graph) - optional custom name
   **/
  update_ontology: function(params) {
    title(" - update_ontology()");
    if (undefined != params && undefined != params.o) {
      file = params.o;
    }
    var graphname = "ontology";
    if (undefined != params && undefined != params.g) {
      graphname = params.g;
    }
    var deferred = Q.defer();
    deployer.updateOntology(pwd,graphname).then(function() {
      ok("    - SUCCESS installing ontology to graph: " + graphname);
      deferred.resolve("SUCCESS");
    }).catch(function(error) {
      crapout(error);
    });
    return deferred.promise;
  },

  // WORKS 8.0.12
  /**
   * Install workplace file, if it exists (config/mljs-workplace.xml)
   **/
  update_workplace: function(params) {
    title(" - update_workplace()");
    var file = null;
    if (undefined != params && undefined != params.w) {
      file = params.w;
    }
    var deferred = Q.defer();
    deployer.installWorkplace(pwd,file).then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
    });
    return deferred.promise;
  },

  // WORKS 8.0.12
  /**
   * Install extra database configuration if it exists (config/ml-config.xml OR deploy/ml-config.xml (Roxy old files))
   **/
  update_dbconfig: function(params) {
    var deferred = Q.defer();

    title(" - update_dbconfig()");
    deployer.updateContentDBConfig(pwd).then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  },

  // WORKS 8.0.12
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


  // WORKS 8.0.12
  /**
   * Install REST API extensions, if they exist (rest-api/ext/*)
   **/
  update_searchoptions: function() {
    title(" - update_searchoptions()");
    var deferred = Q.defer();
    deployer.updateSearchOptions(pwd).then(function(output) {
        title(" - update_searchoptions() complete");
        deferred.resolve("All search options installed");
    }).catch(function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  },



  /*
   * READ ONLY COMMANDS, FOR PRE-SHARING DEMOS
   */

  // WORKS 8.0.12
  capture: function(params) {
    ensureEnvironmentExists();
    targets.capture_workplace(params); //.then(targets.capture_ontology());
    var funcs = [/*targets.capture_confirm, */ targets.capture_dbconfig, targets.capture_modulesdbconfig,
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

  // WORKS 8.0.12
  /**
   * Capture workplace configuration
   **/
  capture_workplace: function(params) {
    var deferred = Q.defer();

    var override = null;
    if (undefined != params && undefined != params.w) {
      override = params.w;
    }
    title(" - capture_workplace()");
    log("   - saving workplace configuration to file: " + file);

    deployer.captureWorkplace(pwd,override).then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
    });

    return deferred.promise;
  },

  // WORKS 8.0.12
  /**
   * Capture ontology in Turtle format ('ontology' named graph) - optional custom name
   **/
  capture_ontology: function(params) {
    title(" - capture_ontology()");
    var override = null;
    if (undefined != params && undefined != params.o) {
      override = params.o;
    }
    var graphname = "ontology";
    if (undefined != params && undefined != params.g) {
      graphname = params.g;
    }
    var deferred = Q.defer();
    deployer.captureGraph(graphname,pwd,override).then(function(result) {
      title(" - capture_ontology() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      //crapout(error);
      warn(" - capture_ontology() errored - perhaps ontology graph name (" + graphname + ") does not exist?");
      warn(error);
    });

    return deferred.promise;
  },

  // WORKS 8.0.12
  capture_triggers: function(params) {
    title(" - capture_triggers()");

    var deferred = Q.defer();

    deployer.captureTriggers(pwd).then(function(result) {
      ok("    - SUCCESS capturing installed triggers to file: " + file);
      title(" - capture_triggers() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      warn("    - Error caught capturing triggers: " + error);
      deferred.reject(error);
    });

    return deferred.promise;
  },


  // WORKS 8.0.12
  /**
   * Capture all search options (Packaging API?)
   **/
  capture_searchoptions: function(params) {
    var deferred = Q.defer();
    title(" - capture_searchoptions()");
    deployer.captureSearchOptions(pwd).then(function(result) {
      title("  - capture_searchoptions() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  },

  // WORKS 8.0.12
  /**
   * Capture MarkLogic database configuration (Packaging API?)
   **/
  capture_dbconfig: function(params) {
    var deferred = Q.defer();
    title(" - capture_dbconfig()");
    deployer.captureContentDBConfig(pwd).then(function(result) {
      title(" - capture_dbconfig() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
    });
    return deferred.promise;
  },

  // WORKS 8.0.12
  capture_modulesdbconfig: function(params) {
    var deferred = Q.defer();
    title(" - capture_modulesdbconfig()");
    deployer.captureModulesDBConfig(pwd).then(function(result) {
      title(" - capture_modulesdbconfig() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
    });
    return deferred.promise;
  },



  /**
   * TODO NA - just create with our scripts??? - Capture MarkLogic app server configuration (Packaging API?)
   **/



  // WORKS 8.0.12
  remove: function(params) {
    ensureEnvironmentExists();
    //targets.remove_extensions().then(targets.remove_restapi()).then(targets.remove_modulesrestapi());
    var funcs = [targets.remove_triggers, targets.remove_extensions, targets.remove_restapi, function() {
      return Q.delay(10000);
    }, targets.remove_modulesrestapi];
    funcs.reduce(Q.when, Q(params));
  },

  // WORKS 8.0.12
  remove_restapi: function() {
    title(" - remove_restapi()");

    return deployer.removeContentDBRestAPI();
  },

  // WORKS 8.0.12
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
    return deployer.removeModulesDBRestAPI();
  },

  // WORKS 8.0.12
  remove_triggers: function(params) {
    title(" - remove_triggers()");
    var deferred = Q.defer();

    deployer.removeTriggers(pwd).then(function(result) {
      title(" - remove_triggers() complete");
      deferred.resolve(params);
    }).catch(function(error) {
      crapout(error);
    });
    
    return deferred.promise;
  },

  // WORKS 8.0.12
  remove_extensions: function() {
    title(" - remove_extensions()");

    return deployer.removeExtensions(pwd);
  },



  // WORKS 8.0.12
  load: function(params) {
    ensureEnvironmentExists();
    targets.load_initial(params);
  },

  // WORKS 8.0.12
  load_initial: function() {
    // check for ./data/.initial.json to see what folder to load
    // process as for load
    title(" - load_initial()");
    return deployer.loadContentFolder(pwd + "data", ".initial.json");
  },

  // WORKS 8.0.12
  load_folder: function(args) {
    // check to see if we have a parameter folder or not
    title(" - load_folder()");
    // TODO handle trailing slash in folder name of args.f
    // TODO windows file / and \ testing
    return deployer.loadContentFolder(args.f, ".load.json");
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

  selftest: function(params) {
    ensureEnvironmentExists();
    // RUN INSTALL
    // create test config with random DB name
    // create content db rest API
    // create modules db rest API
    // deploy modules (including test lib)
    // deploy extensions (including test ext)
    // load content in to db
    // TEST INSTALL
    // invoke extension (look for HTTP 200 response)
    // fetch content from DB
    // RUN UPDATE
    // test update
    // RUN CAPTURE
    // test capture
    // RUN clean
    // check content db
    // RUN REMOVE
    // test remove
  },

  // WORKS 8.0.12
  clean: function(params) {
    ensureEnvironmentExists();
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

    deployer.clean(colsExclude,colsInclude).then(function(result) {
      deferred.resolve(params);
    }).catch(function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  },

  // WORKS 8.0.12
  reset: function(params) {
    ensureEnvironmentExists();
    var funcs = [targets.clean, targets.update_ontology, targets.update_workplace, targets.load_initial];
    funcs.reduce(Q.when, Q(params));
  },

  help: function(params) {
    // display usage and quit
    usage();
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
var targetGroups = ["install", "update", "capture", "remove", "load", "patch", "devpatch", "reset", "clean","help"];
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
          // check config exists now
          ensureEnvironmentExists();
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
              // check config exists now
              ensureEnvironmentExists();
            func(argv);
          } else {
            usage("Unknown " + group + " target: '" + argv[group] + "'");
          }
        }
      }

    } // end group function exists if
  } // end target groups or


  // execute chosen main command
  if (!found) {
    var name = "";
    for (var n in argv) {
      if ("_" != n) {
        name = n;
      }
    }
    if ("h" == name || "help" == name) {
      found = true;
      targets.help(argv);
    } else {
      usage("Unknown option: '" + name + "'");
    }
  }
  //} else {
  //  usage("Only one --option=whatever parameter allowed");
  //}
  //} else {
  // fail
  //  usage("Only one instruction (E.g. 'install') OR one option (E.g. '--install=something') can be used");
  //}
}
