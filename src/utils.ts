import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { SettingsCache } from './SettingsCache';
import { env } from 'process';


export function makeNinjaBuildCommand(target: String): string {
  const ninjaexe = SettingsCache.instance().getNinjaBuildExecutable();
  const ninjaargs = SettingsCache.instance().ninjaArguments;
  const ninjabuildpath = SettingsCache.instance().ninjaBuildPath;

  const command = variables(`${ninjaexe} ${ninjaargs.join(" ")} ${ninjabuildpath} ${target}`);
  console.log("Ninja Command ", command);
  return command;

}

export function makeNinjaTargetCommand(): string {
  const ninjaexe = SettingsCache.instance().ninjaExecutable;
  const ninjabuildpath = SettingsCache.instance().ninjaBuildPath;

  const command = variables(`${ninjaexe} ${ninjabuildpath} -t targets`);
  console.log("Ninja Target Command ", command);
  return command;

}

export function makeNinjaQueryCommand(target: string): string {
  const ninjaexe = SettingsCache.instance().ninjaExecutable;
  const ninjabuildpath = SettingsCache.instance().ninjaBuildPath;

  const command = variables(`${ninjaexe} ${ninjabuildpath} -t query ${target}`);
  console.log("Ninja Query Command ", command);
  return command;

}

export function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    cp.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      }
      resolve({ stdout, stderr });
    });
  });
}

export function pathExists(p: string): boolean {
  try {
    fs.accessSync(p);
  } catch (err) {
    return false;
  }

  return true;
}

export function getWorkspaceFolder(): string | undefined{
  const workspace = getWorkspace();
  if (!workspace) {
    return undefined;
  }
  const folderString = workspace.uri.fsPath;
  if (!folderString) {
    return undefined;
  }
  return folderString;
}

export function getWorkspace(): vscode.WorkspaceFolder | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  return workspaceFolders[0];
}

export function hasExtension(id: string): boolean {
  return vscode.extensions.all.find(e => e.id === id) !== undefined;
}

let uidCounter = 0;

export function generateId(): string {
  return (++uidCounter).toString();
}

export function getNinjaCwd(): string {
  const np = SettingsCache.instance().ninjaBuildPath;
  if(np){
    return getWorkspaceFolder() + "/" + np;
  }
  return getWorkspaceFolder() || "";
}


export function getApplicationName(appPath: string):string{
  return path.basename(appPath);
}

export function arrayVariables(arr: string[]): string[]{
  
  arr.forEach((value, index, array) => {
    array[index] = variables(value);
  });
  return arr;
}

export function variables(string: string, recursive: boolean = false){
  let workspaces = vscode.workspace.workspaceFolders;
  if(workspaces){
    let workspace = workspaces.length ? workspaces[0] : null;
    let activeFile = vscode.window.activeTextEditor?.document;
    let absoluteFilePath = activeFile?.uri.fsPath;
    if(workspace && absoluteFilePath){
      string = string.replace(/\${workspaceFolder}/g, workspace?.uri.fsPath);
      string = string.replace(/\${workspaceFolderBasename}/g, workspace?.name);

      string = string.replace(/\${file}/g, absoluteFilePath);
    
      let activeWorkspace = workspace;
      let relativeFilePath = absoluteFilePath;
      for (let workspace of workspaces) {
          if (absoluteFilePath.replace(workspace.uri.fsPath, '') !== absoluteFilePath) {
              activeWorkspace = workspace;
              relativeFilePath = absoluteFilePath.replace(workspace.uri.fsPath, '').substr(path.sep.length);
              break;
          }
      }

      let parsedPath = path.parse(absoluteFilePath);
      string = string.replace(/\${fileWorkspaceFolder}/g, activeWorkspace?.uri.fsPath);
      string = string.replace(/\${relativeFile}/g, relativeFilePath);
      string = string.replace(/\${relativeFileDirname}/g, relativeFilePath.substr(0, relativeFilePath.lastIndexOf(path.sep)));
      string = string.replace(/\${fileBasename}/g, parsedPath.base);
      string = string.replace(/\${fileBasenameNoExtension}/g, parsedPath.name);
      string = string.replace(/\${fileExtname}/g, parsedPath.ext);
      string = string.replace(/\${fileDirname}/g, parsedPath.dir.substr(parsedPath.dir.lastIndexOf(path.sep) + 1));
      string = string.replace(/\${cwd}/g, parsedPath.dir);
      string = string.replace(/\${pathSeparator}/g, path.sep);
      string = string.replace(/\${userHome}/g, env['HOME']||"");

      if (recursive && string.match(/\${(workspaceFolder|workspaceFolderBasename|fileWorkspaceFolder|relativeFile|fileBasename|fileBasenameNoExtension|fileExtname|fileDirname|cwd|pathSeparator|lineNumber|selectedText|userHome|env:(.*?)|config:(.*?))}/)) {
          string = variables(string, recursive);
      }
    }
  }
  return string;
}