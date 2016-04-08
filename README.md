# mlnodetools

This project provides command line tools to simplify administration of MarkLogic Server Enterprise NoSQL installations,
and applications built against them.

This project provides the below tools:-
- mljsadmin - installs, updates, deploys, captures, and tears down entire MarkLogic Server applications and databases
- mljsserve - runs an Express based web app that also proxies /v1/ REST API URLs to a MarkLogic Server database app server

## Recent changes
2016-Apr-08 - V. 8.0.11 - More reliable folder loading with threading. Support for file permissions. Reliability improvements. Colour coding in terminal window. (No Windows support)

## Installing mlnodetools

WARNING: You MUST install mlnodetools GLOBALLY:-

1. npm install -g mlnodetools
2. If you receive permission warnings, follow the advice on the following page, and then try the above command again: https://docs.npmjs.com/getting-started/fixing-npm-permissions
3. Test by typing just 'mljsadmin' with no parameters from the command line (this MUST be issued in the root folder of your app)

## Other tools

In order to create a new MLJS Workplace based web application project, use the companion Yeoman mljsworkplace generator.

For details and how to use this command, please visit: https://github.com/adamfowleruk/generator-mljsworkplace

## Administering a MarkLogic Server application

Once generated, you simply:-
- Open a terminal
- cd to your new project folder
- type 'mljsadmin' for a list of commands you can run at the root of that application

## Examples

Below are a few examples

### Installing a new application

If you've just downloaded an MLJS Workplace based application, execute these commands to fully install it:-

- mljsadmin install
- mljsadmin update

If you see any WARN or ERROR lines, follow the advice that mljsadmin gives to resolve them, before continuing.

### Capturing an existing application's settings

If you've created or modified a new application, reconfigured a database, or modified your workplace pages or application
ontology then you need to capture the configuration of your system in order to share the full application with others.

This is achieved by:-

- mljsadmin capture

Again, correct any WARN or ERROR messages, if required

### Removing an application

To remove all databases, triggers, app servers and so on from your MarkLogic installation, you need to remove your
application:-

- mljsadmin remove

### Other commands

To see a full list of commands, type:-

- mljsadmin

## Logging bugs

Please visit http://github.com/adamfowleruk/mlnodetools/issues in order to log bugs and feature requests
