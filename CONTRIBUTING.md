# Contributing to mlnodetools

We welcome new contributors. This document will guide you
through the process.

 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Feature Requests](#feature)
 - [Submission Guidelines](#submit)

## <a name="question"></a> Got a Question or Problem?

If you have questions about how to use mlnodetools, please direct these to the
Adam Fowler - adam.fowler@marklogic.com.

## <a name="issue"></a> Found an Issue?
If you find a bug in the source code or a mistake in the documentation, you can help us by
submitting an issue to our [GitHub Issue Tracker][issue tracker]. Even better you can submit a Pull Request
with a fix for the issue you filed.

## <a name="feature"></a> Want a Feature?
You can request a new feature by submitting an issue to our [GitHub Issue Tracker][issue tracker].  If you
would like to implement a new feature then first create a new issue and discuss it with one of our
project maintainers.

## <a name="submit"></a> Submission Guidelines

### Submitting an Issue
Before you submit your issue search the archive, maybe your question was already answered.

If your issue appears to be a bug, and hasn't been reported, open a new issue.
Help us to maximize the effort we can spend fixing issues and adding new
features, by not reporting duplicate issues.  Providing the following information will increase the
chances of your issue being dealt with quickly:

* **Overview of the Issue** - if an error is being thrown a stack trace helps
* **Motivation for or Use Case** - explain why this is a bug for you
* **mlnodetools Version** - is it a tagged version, npm version, or the develop branch
* **Operating System** - Mac, windows? details help
* **Suggest a Fix** - if you can't fix the bug yourself, perhaps you can point to what might be
  causing the problem (line of code or commit)

### Submitting a Pull Request

We use [GitFlow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) to manage the
progress so multiple dev teams can work at the same time. Below is a description.

I recommend using GitKraken to manage your GitFlow and as a git client.

#### Fork mlnodetools

First ask Adam Fowler for access to the project, passing him your GitHub account name. Then:-

```sh
$ git clone ssh://user@github.com/adamfowleruk/mlnodetools.git
$ cd mlnodetools
$ git checkout -b develop origin/develop
```

The following rules apply:-
- master is used only for releases
- A develop branch is used to merge in changes between releases
- Feature branches (feature-ISSUEID) branch off of the develop branch
- Release branches are forked off of develop and called release-sprint-004, testing and builds are done, then merged with master AND then develop
 - Each release is tagged as v8.0.12 where the major and minor numbers correspond to the MarkLogic version tested against, and the revision number is the version of mljsadmin within this major version. (Thus mljsadmin 8.0.12 runs fine against MarkLogic 8.0.4)
- Hotfix branches are taken off of master, fixed, then committed to master AND then develop

We ask that you open an issue in the [issue tracker][] and get agreement from
at least one of the project maintainers before you start coding.

Nothing is more frustrating than seeing your hard work go to waste because
your vision does not align with that of a project maintainer.


#### Create a branch for your feature

Okay, so you have decided to add something. Create an issue on GitHub if you haven't already, as you'll need the ID.
Now create a feature branch and start hacking. You can do this on your own fork, or the main site if a 'Contributor':

```sh
$ git checkout -b feature-ISSUEID develop
```

Now develop as normal:-

```sh
$ git status
$ git add myfile
$ git commit
```

To share the branch so others can see it (although advised not to work on it) do this:-

```sh
$ git push --set-upstream origin feature-ISSUEID
```

Now your feature branch [will be visible on GitHub](https://github.com/adamfowleruk/mlnodetools/branches) if you
are a contributor.

#### Formatting code

We use [.editorconfig][] to configure our editors for proper code formatting. If you don't
use a tool that supports editorconfig be sure to configure your editor to use the settings
equivalent to our .editorconfig file.

#### Test your code (pre-release mainly)

We are working hard to improve mlnodetools's testing. Currently the best way to do this is to create a dummy app
folder and run mljsadmin install, then load, then clean, then reset, then capture, then remove.

#### Commit your complete feature

When the feature is complete and ready to be integrated back in to the develop branch:-

1. If on your own Fork (99% of people):-
```sh
$ git commit -m "Fixes #ISSUEID"
$ git pull origin develop
$ git checkout develop
$ git merge feature-ISSUEID
$ git push
```

2. If an assigned admin user (contributor) on the main project, do this instead:-
```sh
$ git commit -m "Fixes #ISSUEID"
$ git push
```

Now issue a pull request for your changes to the main project.


You're now done! Adding the 'Fixes #ISSUEID' comment to the last commit automatically closes the issue with a reference
to your code.

### Further information

- [issue tracker](https://github.com/adamfowleruk/mlnodetools/issues)
- [.editorconfig](http://editorconfig.org/)
