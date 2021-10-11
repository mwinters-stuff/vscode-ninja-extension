import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { SettingsCache } from './SettingsCache';
import { NinjaTreeDataProvider } from './TreeDataProvider';
import { NinjaTaskDefinition } from './NinjaBuildTaskProvider';
import * as utils from './utils';
import { NinjaTarget } from './NinjaTarget';
import * as constants from './constants';


var _terminals: any = {};

export async function build(ag: any) {
  if (ag.target) {
    const terminalId = 'NinjaBuild-' + ag.target;
    if (!_terminals[terminalId]) {
      _terminals[terminalId] = vscode.window.createTerminal('Ninja Build (' + ag.target + ')');
    }
    _terminals[terminalId].sendText(utils.makeNinjaBuildCommand(ag.targetPath));
    _terminals[terminalId].show(false);
  }
}

export async function run(ag: any) {
  if (ag.target) {
    await runTarget(ag);
  }
}

async function runTarget(target: any) {
  const workspaceFolder = utils.getWorkspace();
  if (!workspaceFolder) {
    return;
  }
  const workspacePath = workspaceFolder.uri.fsPath;
  const label = target.target;
  const program = path.join(workspacePath, SettingsCache.instance().ninjaBuildPath, target.targetPath);
  const appName = utils.getApplicationName(program);

  const argsArray = utils.arrayVariables(SettingsCache.instance().getAppArguments(appName));
  const envObj = SettingsCache.instance().debugEnv;

  const cwd: string = utils.variables(SettingsCache.instance().getAppCwd(appName) || path.join(workspacePath, SettingsCache.instance().ninjaProjectRoot));

  if (!_terminals[label]) {
    _terminals[label] = vscode.window.createTerminal(label);
  }
  _terminals[label].sendText(`cd ${cwd}`);
  for (const ei in envObj) {
    _terminals[label].sendText(`export ${ei} ${envObj[ei as keyof Object]}`);
  }
  _terminals[label].sendText(`${program} ${argsArray.join(' ')}`);
  _terminals[label].show(false);

}


export async function debug(ag: any) {
  const workspaceFolder = utils.getWorkspace();
  if (!workspaceFolder) {
    return;
  }
  const workspacePath = workspaceFolder.uri.fsPath;
  if (ag.target) {
    const label = ag.target;
    const program = path.join(workspacePath, SettingsCache.instance().ninjaBuildPath, ag.targetPath);
    const appName = utils.getApplicationName(program);

    const argsArray = utils.arrayVariables(SettingsCache.instance().getAppArguments(appName));
    const envObj = SettingsCache.instance().debugEnv;
    const sourceFileMapObj = SettingsCache.instance().debugSourceMap;
    const postRunCommands = SettingsCache.instance().getAppPostRunCommands(appName);

    const cwd: string = utils.variables(SettingsCache.instance().getAppCwd(appName) || path.join(workspacePath, SettingsCache.instance().ninjaProjectRoot));

    var debugConfig: vscode.DebugConfiguration = {
      name: label,
      request: 'launch',
      type: 'lldb',
      stopOnEntry: false,
      program: program,
      args: argsArray,
      cwd: cwd,
      env: envObj,
      sourceMap: sourceFileMapObj,
      postRunCommands: postRunCommands,
    };

    const magicValueKey = 'magic variable  X🤦🏼‍';
    const magicValue = utils.generateId();
    debugConfig[magicValueKey] = magicValue;


    console.log(debugConfig);

    const cancellationTokenSource = new vscode.CancellationTokenSource();

    let terminateConn: vscode.Disposable | undefined;

    const terminated = new Promise<void>(resolve => {
      terminateConn = vscode.debug.onDidTerminateDebugSession((session: vscode.DebugSession) => {
        const session2 = (session as unknown) as { configuration: { [prop: string]: string } };
        if (session2.configuration && session2.configuration[magicValueKey] === magicValue) {
          cancellationTokenSource.cancel();
          resolve();
          terminateConn && terminateConn.dispose();
        }
      });
    }).finally(() => {
      console.log('debugSessionTerminated');
    });

    console.log('startDebugging');

    vscode.debug.startDebugging(workspaceFolder, debugConfig).then(debugSessionStarted => {
      if (debugSessionStarted) {
        console.log('debugSessionStarted');
        terminated.then(() => {
        });
      } else {
        terminateConn && terminateConn.dispose();
        return Promise.reject('Failed starting the debug session. Maybe something wrong with "ninjabuild.runConfigurations".',
        );
      }
    });
  }
}


export async function favourite(ag: any, dataProvider: NinjaTreeDataProvider) {
  dataProvider.toggleFavourite(ag.target);
}

class _td implements NinjaTaskDefinition {
  constructor(public readonly target: string, public readonly type: string) {

  }
}

export async function createLaunchConfiguration(ag: any) {
  const target = ag.target;
  if (target) {
    const workspaceFolder = utils.getWorkspaceFolder();
    if (workspaceFolder) {
      const launchJsonPath = path.join(workspaceFolder, '.vscode', 'launch.json');
      vscode.window.showTextDocument(vscode.Uri.file(launchJsonPath)).then((document) => {
        const label = ag.target;
        var text = document.document.getText();
        if (text.includes(label)) {
          return;
        }


        const program = '${workspaceFolder}/' + path.join(SettingsCache.instance().ninjaBuildPath, ag.targetPath);
        const appName = utils.getApplicationName(program);

        const argsArray: string[] = SettingsCache.instance().getAppArguments(appName);
        const envObj = SettingsCache.instance().debugEnv;
        const sourceFileMapObj = SettingsCache.instance().debugSourceMap;

        const cwd: string = SettingsCache.instance().getAppCwd(appName) || path.join('${workspaceFolder}', SettingsCache.instance().ninjaProjectRoot);
        const postRunCommands = SettingsCache.instance().getAppPostRunCommands(appName);

        const debugConfig = {
          name: label,
          request: 'launch',
          type: 'lldb',
          stopOnEntry: false,
          program: program,
          args: argsArray,
          cwd: cwd,
          env: envObj,
          sourceMap: sourceFileMapObj,
          postRunCommands: postRunCommands
        };
        var debugConfigStr = JSON.stringify(debugConfig, null, 2);
        var debugConfigStr = "    " + debugConfigStr.replace(/\n/g, "\n    ") + ",\n";

        for (var l = 0; l < document.document.lineCount; l++) {
          const line = document.document.lineAt(l);
          if (line.text.includes("configurations")) {
            document.edit((editBuilder) => {
              editBuilder.insert(new vscode.Position(l + 1, 0), debugConfigStr);
            });

            break;
          }
        }

      });
    }
  }
}

export async function createTestMateConfig(target: any) {
  const settingsCache = SettingsCache.instance();
  const exePath = path.join(utils.variables(settingsCache.testExecutablesPath), "*");
  const config = vscode.workspace.getConfiguration("testMate");
  await config.update("cpp.test.parallelExecutionLimit", 4, false, false);
  var advanced = [
    {
      pattern: exePath,
      gtest: {
        prependTestRunningArgs: utils.arrayVariables(settingsCache.testExecutablesArguments)
      }
    }
  ];

  await config.update("cpp.test.advancedExecutables", advanced, false, false);

}

export async function buildAll(context: vscode.ExtensionContext, targetCache: string) {
  const terminalId = 'NinjaBuild-' + targetCache;
  if (!_terminals[terminalId]) {
    _terminals[terminalId] = vscode.window.createTerminal('Ninja Build (' + targetCache + ')');
  }
  var commandStr: string = utils.makeNinjaBuildCommand('');
  const targets = context.workspaceState.get<NinjaTarget[]>(targetCache);
  var buildTargetPaths: string[] = [];
  targets?.forEach((target) => {
    buildTargetPaths.push(target.targetPath);
  });
  if (buildTargetPaths) {
    _terminals[terminalId].sendText(commandStr + ' ' + buildTargetPaths?.join(' '));
    _terminals[terminalId].show(false);
  } else {
    vscode.window.showErrorMessage("No targets to build.");
  }

}

export async function runAll(context: vscode.ExtensionContext, targetCache: string) {
  const targets = context.workspaceState.get<NinjaTarget[]>(targetCache);
  targets?.forEach((target) => {
    runTarget(target);
  });
}


export async function createCPPConfig(context: vscode.ExtensionContext) {
  const workspaceFolder = utils.getWorkspaceFolder();
  if (workspaceFolder) {
    const launchJsonPath = path.join(workspaceFolder, '.vscode', 'c_cpp_properties.json');
    vscode.window.showTextDocument(vscode.Uri.file(launchJsonPath)).then((document) => {

      createCPPConfiguration(workspaceFolder).then(doc => {
        var firstLine = document.document.lineAt(0);
        var lastLine = document.document.lineAt(document.document.lineCount - 1);
        var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
  
        document.edit((editBuilder) => {
          editBuilder.replace(textRange, JSON.stringify(doc, null, 2));
        });
      });
    });
  }
}

async function createCPPConfiguration(workspaceFolder: string): Promise<Object> {
  const doc =
  {
    version: 4,
    configurations: [
      {
        name: "Linux",
        includePath: ["${workspaceFolder}/**"],
        defines: [""],
        cStandard: "c11",
        cppStandard: "c++17",
        intelliSenseMode: "clang-x64"
      }
    ]
  };

  const settingsCache = SettingsCache.instance();

  doc.configurations[0].defines = settingsCache.cppConfigDefines;

  for (const key in settingsCache.cppConfigIncludePaths) {
    const pathDef = settingsCache.cppConfigIncludePaths[key];
    if (!("subPath" in pathDef)) {
      doc.configurations[0].includePath.push("${workspaceFolder}/" + pathDef.basePath + "/**");
    } else {
      const x: string[] = await listCppIncludes(workspaceFolder, pathDef);
      doc.configurations[0].includePath = doc.configurations[0].includePath.concat(x);

    }
  }
  return Promise.resolve(doc);
}

async function listCppIncludes(workspaceFolder: string, pathDef: any): Promise<string[]> {
  const list: string[] = fs.readdirSync(path.join(workspaceFolder, pathDef.basePath));
  var result: string[] = [];
  list.forEach((file: string) => {
    const filer = path.resolve(workspaceFolder, pathDef.basePath, file);
    if(fs.existsSync(filer)){
      const stat = fs.statSync(filer);
      if (stat && stat.isDirectory()) {
        const file3r = path.resolve(filer, pathDef.subPath);
        if(fs.existsSync(file3r)){
          const stat3 = fs.statSync(file3r);
          if (stat3 && stat3.isDirectory()) {
            result.push("${workspaceFolder}/" + path.join(pathDef.basePath, file, pathDef.subPath,"**"));
          }
        }
      }
    }
  });
  return Promise.resolve(result.sort());
}


export async function flushCaches(context: vscode.ExtensionContext) {
  await context.workspaceState.update(constants.DEBUG_CACHE, []);
  await context.workspaceState.update(constants.RELEASE_CACHE, []);
  await context.workspaceState.update(constants.FAVOURITES_CACHE, []);
  await context.workspaceState.update(constants.IS_CACHED, false);
  await context.workspaceState.update(constants.TARGET_PATHS, {});
  vscode.commands.executeCommand('ninjaTargets.refresh');
}