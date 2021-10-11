import * as vscode from 'vscode';
import * as utils from './utils';
import { NinjaTarget } from './NinjaTarget';
import * as constants from './constants';

export interface NinjaTaskDefinition extends vscode.TaskDefinition {
  target: string;
}

export class NinjaBuildTaskProvider implements vscode.TaskProvider {
  private ninjaPromise: Thenable<vscode.Task[]> | undefined = undefined;
  private _channel: vscode.OutputChannel | undefined = undefined;

  constructor(private readonly context: vscode.ExtensionContext) {

  }

  provideTasks(token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
    if (!this.ninjaPromise) {
      this.ninjaPromise = this.getNinjaTasks(token);
    }
    return this.ninjaPromise;
  }


  resolveTask(_task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
    const target = _task.definition.target;
    if (target) {
      const definition: NinjaTaskDefinition = <any>_task.definition;
      const task = new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.target, 'ninja',
        new vscode.ShellExecution(utils.makeNinjaBuildCommand(target)));
      task.group = vscode.TaskGroup.Build;
      task.problemMatchers.push("$gcc");
      return task;
    }
    return undefined;
  }



  private getOutputChannel(): vscode.OutputChannel {
    if (!this._channel) {
      this._channel = vscode.window.createOutputChannel('Ninja Build Auto Detection');
    }
    return this._channel;
  }

  private async getNinjaTasks(token: vscode.CancellationToken): Promise<vscode.Task[]> {
    const result: vscode.Task[] = [];
    const folderString = utils.getWorkspaceFolder();
    if (!folderString) {
      return result;
    }

    if (this.context.workspaceState.get<boolean>(constants.IS_CACHED)) {
      var deps: NinjaTarget[] = [];

      const cachedDebug = this.context.workspaceState.get<NinjaTarget[]>(constants.DEBUG_CACHE);
      if(cachedDebug){
        deps = deps.concat(cachedDebug);
      }
      const cachedRelease = this.context.workspaceState.get<NinjaTarget[]>(constants.RELEASE_CACHE);
      if(cachedRelease){
        deps = deps.concat(cachedRelease);
      }

      for(const targeti in deps){
        const target = deps[targeti];
        const kind: NinjaTaskDefinition = {
          type: 'ninja-build',
          target: target.target
        };
        const task = new vscode.Task(kind, vscode.TaskScope.Workspace, target.target, 'ninja-build', new vscode.ShellExecution(utils.makeNinjaBuildCommand(target.target)));
        task.group = vscode.TaskGroup.Build;
        task.problemMatchers.push("$gcc");
        result.push(task);
      }
      return result;
    }

    const commandLine = utils.makeNinjaTargetCommand();
    try {
      const { stdout, stderr } = await utils.exec(commandLine, { cwd: folderString });
      if (stderr && stderr.length > 0) {
        this.getOutputChannel().appendLine(stderr);
        this.getOutputChannel().show(true);
      }
      if (stdout) {
        const lines = stdout.split(/\r{0,1}\n/);
        for (const line of lines) {
          if (token.isCancellationRequested) {
            return result;
          }
          if (line.length > 0) {
            const target = line.replace(": phony", "");
            if (target.endsWith("_debug_linux")) {
              const kind: NinjaTaskDefinition = {
                type: 'ninja-build',
                target: target
              };
              const task = new vscode.Task(kind, vscode.TaskScope.Workspace, target, 'ninja-build', new vscode.ShellExecution(utils.makeNinjaBuildCommand(target)));
              task.group = vscode.TaskGroup.Build;
              task.problemMatchers.push("$gcc");
              result.push(task);
            }
          }
        }
      }
    } catch (err: any) {
      const channel = this.getOutputChannel();
      if (err.stderr) {
        channel.appendLine(err.stderr);
      }
      if (err.stdout) {
        channel.appendLine(err.stdout);
      }
      channel.appendLine('Auto detecting ninja build tasks failed.');
      channel.show(true);
    }
    return result;

  }
}