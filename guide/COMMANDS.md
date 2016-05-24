# mljsadmin full command listing

Below is a full list of commands for mljsadmin. mljsadmin includes individual commands accessible with --GROUP=SEGMENT
style options. Just running as mljsadmin GROUP will run all segments of each group.

For example mljsadmin install will run --install=restapi then --install=modulesrestapi and so on, covering all
commands for install. (Install actually also calls all update commands too).

Note that command options can have either a gap between option and value, or an equals sign. Thus the two below options
are equivalent:-

```sh
-f=./some/folder
-f ./some/folder
```

## Help

Running mljsadmin with any of the below commands will show usage help information:-
```sh
mljsadmin
mljsadmin -h
mljsadmin --help
mljsadmin help
```

## Install

This commands takes the configuration of a MarkLogic system from ./config/env.json (or env.js) and creates an entirely
new MarkLogic set of databases and app servers. This command also runs all update commands too, as a convenience.

```sh
mljsadmin install
```

The above will execute all install commands in the following order, followed by the update group command.

### --install=restapi

Create a content database and REST API instance that executes the code in the modules database against this content
database.

### --install=modulesrestapi

Create a modules database and REST API instance to allow pushing of module files to that modules database.

WARNING: DO NOT ENABLE THE MODULES REST API IN PRODUCTION! It is a security risk.

### --install=extensions

Deploys all rest extensions with files in ./rest-api/ext BUT only those mentioned in the ./data/restapi.json file.

### --install=modules [-m ./modules]

Deploy the module files to the modules database. Defaults to deploying the ./modules folder, but using the -m option
will override the folder to be deployed.

Code and content deployment are non destructive - i.e. they will add files to the database and only replace files
with the same URI - this command will not delete existing files in the modules database.

### --install=triggers

Deploys trigger configuration as detailed in the ./data/restapi.json file.

WARNING: Requires the "triggers.xqy" REST extension found within this package.


## Update

This group command will update an already deployed MarkLogic system with precise configuration information. It is
primarily used to configure database indexes, and install search options and MLJS Workplace application files.

```sh
mljsadmin update
```

### --update=dbconfig

Uses the previously captured content database configuration in ./packages/databases/contentdbconfig.xml to update
the configuration of the (likely newly created) content database. Effectively sets up indexes and database settings.

### --update=modulesdbconfig

As --update=dbconfig, but for the modules database. File used is ./packages/databases/modulesdbconfig.xml .

### --update=searchoptions

Deploys all search options found in ./rest-api/config/options to the content REST API server instance.

### --update=ontology [-o ./data/ontology.ttl] [-g ontologyGraphName]

Deploys the specified Turtle based semantic triples to the "ontology" graph (or the graphname specified).

Can in fact be used to load any turtle file to any graph name in MarkLogic Server's triple store.

### --update=workplace [-w ./data/mljs-workplace.xml]

Deploys all application configuration (pages) for the MLJS Workplace web application to the content database.

WARNING: Requires the "workplace.xqy" REST extension found within this package.

## Capture

### --capture=dbconfig

### --capture=modulesdbconfig

### --capture=searchoptions

### --capture=ontology [-o ./data/ontology.ttl] [-g ontologyGraphName]

### --capture=workplace [-w ./data/mljs-workplace.xml]

WARNING: Requires the "workplace.xqy" REST extension found within this package.

### --capture=triggers

## Remove

### --remove=restapi

### --remove=modulesrestapi

### --remove=extensions

### --remove=triggers

WARNING: Requires the "triggers.xqy" REST extension found within this package.

## Load

The load command loads initial data as specified in ./data/.initial.json. An alternative allows you to specify a named
folder. The import settings for that folder are loaded from ./SOME/FOLDER/.load.json. The format of these files is
identical, and is described in [LOAD.md](LOAD.md).

```sh
mljsadmin load
```

### load or --load=initial

Loads all content in to the database as specified in ./data/.initial.json. If no .initial.json file exists, all
content in the ./data folder will be deployed.

### --load=folder -f ./some/folder/name

Deploys the specified folder to the content database, using settings found in the folder's child .load.json file, if
it exists.

## Clean and Reset

Removes content.

### clean

### reset
