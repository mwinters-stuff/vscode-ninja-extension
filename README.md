# ninjabuild README

[![Release](https://github.com/mwinters-stuff/vscode-ninja-extension/actions/workflows/release.yaml/badge.svg)](https://github.com/mwinters-stuff/vscode-ninja-extension/actions/workflows/release.yaml)

## What?

VS Code extension for working with ninja build cpp projects.

## Features

* Lists build targets.
* Favourite list of build targets.
* Build any target.
* Debug any target.
* Run any target.
* Debug/Run argument templates configurable.
* Create Build / Launch Configurations.
* Create C++ TestMate Configuration
* Create c_cpp_properties.json configuration.
* Sane default plugin configuration to start with.

## Extension Dependencies

* [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb)

Reading the documentation on these plugins is a good idea.
CodeLLDB will require lldb installed.

## General Plugin Settings

| Config | Description | Default |
|---|---|---|
|ninjabuild.ninjaExecutable|Path to "ninja"|```ninja```|
|ninjabuild.ninjaAlternateBuildExecutable|Path to an alternate "ninja" or script used when building (eg via docker).||
|ninjabuild.ninjaArguments|Array of additional arguments passed to ninja when building.|```["-j","10"]```|
|ninjabuild.ninjaBuildPath|Path from the workspace root to find the "build.ninja".|```generated```|
|ninjabuild.ninjaProjectRoot|Path to the project root.|```${workspaceFolder}```|
|ninjabuild.debugSourceMap|Path map for debugger source files.|```{"/tmp/": "${workspaceRoot}"}```|
|ninjabuild.debugEnv|Map of environment variables to pass to the debugger.|```{}```|
|ninjabuild.filters.targetincludefilter|Regex filter of ninja targets to include in the view, default is for linux - and not ".a"|```^.*\/linux\/.*[^\\.a]$```|
|ninjabuild.filters.debugtargetfilter|Regex filter to show targets under "Debug". Use a group to remove match from shown target name - eg "_debug_linux" is removed.|```^.*(_debug_linux)$```|
|ninjabuild.filters.releasetargetfilter|Regex filter to show targets under "Release". Use a group to remove match from shown target name - eg "_release_linux" is removed.|```^.*(_release_linux)$```|
|ninjabuild.cppconfig.includePaths|Array of paths to put into the c_cpp_properties as include paths. Will search subpaths to make a usable path list. ```${workspaceRoot}``` will be prepended to paths.| ```[]``` |
|ninjabuild.cppconfig.defines|Array of defines put into the c_cpp_properties.| ```[]``` |
|ninjabuild.testExecutablesPath|For Test configuration, where the test runner will find the test executables|```${workspaceFolder}/tests/```|
|ninjabuild.testExecutablesArguments|For C++ TestMate configuration, array of arguments given to the test executables|```[]]```
|ninjabuild.runConfigurations|Run configurations for applications, See below|```{}```|

## Run Configurations

When debugging or running an application various parameters are required, these can be configured up as defaults in your user vscode settings and will be used
each time you run, debug or create a launch configuration. The configuration is a json object with a number of fields.
The following example, is a best way to show how to setup the run configurations.

```json
 "ninjabuild.runConfigurations": {
    "AnApp":{ # the ninja target name after filtering.
      "args":[ # array of arguments to pass, optional
        "--parameter-one",
        "--parameter-two",
        "--address=localhost",
        "--logfile=/tmp/log.out"
      ],
      "cwd": "${workspaceFolder}", # current working directory, optional
    }, 
    "OtherApp": {
      "args": [
        "--address=localhost:8080",
        "--some-other-parameter",
        "--datadir=${userHome}/app-data",
        "--otherData=${workspaceFolder}/otherdata/plugins",
      ],
      "cwd": "${workspaceFolder}/app"
    }
  }
```

will create launch.json configurations like the following depending on other settings.

```json
{
  "configurations":[
    {
      "name": "OtherApp_debug_linux",
      "request": "launch",
      "type": "lldb",
      "stopOnEntry": false,
      "program": "${workspaceFolder}/bin/OtherApp",
      "args": [
        "--address=localhost:8080",
        "--some-other-parameter",
        "--datadir=${env:HOME}/app-data",
        "--otherData=${workspaceFolder}/otherdata/plugins",
      ],
      "cwd": "${workspaceFolder}/app"
    },
    {
      "name": "AnApp_debug_linux",
      "request": "launch",
      "type": "lldb",
      "stopOnEntry": false,
      "program": "${workspaceFolder}/bin/AnApp",
      "args": [
        "--parameter-one",
        "--parameter-two",
        "--address=localhost",
        "--logfile=/tmp/log.out"
      ],
      "cwd": "${workspaceFolder}",
    }
  ]
}
```

## VSCode Commands

|Command|Description|
|---|---|
|Ninja: Create Test Config|Creates a test configuration using this extensions settings|
|Ninja: Create CPP Config|Creates the c_cpp_properties.json files using extension settings|
|Ninja: Flush Caches and Reload|Flushes all stored target information and reloads|

## Getting started

1. Install the plugin.
2. Configure the settings for the workspace.
3. Use the `Flush Caches and Reload` command.
4. After a few seconds the list of ninja targets should appear.

## Warning

This extension was made to work with a particular project, but was hopefully made generic enough
to work with other ninja projects.
