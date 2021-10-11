import * as utils from './utils';
import * as vscode from 'vscode';
import * as path from 'path';
import { NinjaTarget } from './NinjaTarget';
import * as constants from './constants';
import { SettingsCache } from './SettingsCache';

export class NinjaTreeDataProvider implements vscode.Disposable {

  private _channels: any = {};

  private _onDidChangeData: vscode.EventEmitter<undefined | void> = new vscode.EventEmitter<undefined | void>();
  readonly onDidChangeData: vscode.Event<undefined | void> = this._onDidChangeData.event;


  constructor(private readonly context: vscode.ExtensionContext) {
  }


  dispose() {
    this._onDidChangeData.dispose();
  }

  refresh() {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Ninjas at work!  ",
      cancellable: true,
    }, (progress, token) => {
      return this.getNinjaTargets(progress, token);
    });


    
  }

  getOutputChannel(channelName: string): vscode.OutputChannel {
    if (!this._channels[channelName]) {
      this._channels[channelName] = vscode.window.createOutputChannel(channelName);
    }
    return this._channels[channelName];
  }

  async toggleFavourite(target: string) {
    var favourites = this.context.workspaceState.get<string[]>(constants.FAVOURITE_TARGETS);
    if (favourites) {
      if (favourites.includes(target)) {
        favourites.splice(favourites.indexOf(target), 1);
      } else {
        favourites.push(target);
      }
    } else {
      favourites = [target];
    }

    if (favourites) {
      this.context.workspaceState.update(constants.FAVOURITE_TARGETS, favourites.sort()).then(() => {
        vscode.commands.executeCommand('ninjaTargets.refresh');
      });
    }
  }


  private async getNinjaTargetPath(target: string, workspacePath: string): Promise<string | undefined> {
    var cached: any = this.context.workspaceState.get<any>(constants.TARGET_PATHS);
    if (cached && target in cached) {
      return Promise.resolve(cached[target]);
    }
    if(!cached){
      cached = {};
    }

    const outputChannel = this.getOutputChannel('getNinjaTargetPath');
    try {
      const commandLine = utils.makeNinjaQueryCommand(target);
      const { stdout, stderr } = await utils.exec(commandLine, { cwd: workspacePath });
      if (stderr && stderr.length > 0) {
        outputChannel.appendLine(stderr);
        outputChannel.show(true);
      }
      if (stdout) {
        const lines = stdout.split(/\r{0,1}\n/);
        if (lines.length >= 4) {
          const inputindex = lines.indexOf('  input: phony');
          if (inputindex) {
            const path = lines[inputindex + 1].trim();
            cached[target] = path;
            this.context.workspaceState.update(constants.TARGET_PATHS, cached);
            return Promise.resolve(path);
          }
        }
      }
    } catch (err) {
      if (err.stderr) {
        outputChannel.appendLine(err.stderr);
      }
      if (err.stdout) {
        outputChannel.appendLine(err.stdout);
      }
      outputChannel.appendLine('querying ninja target path.');
      outputChannel.show(true);
      return Promise.reject(err);
    }

    return Promise.resolve(undefined);
  }


  private async getNinjaTargets(progress : vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) {
    await this.context.workspaceState.update(constants.IS_CACHED, false);
    const workspacePath = utils.getWorkspaceFolder();
    if (workspacePath && utils.pathExists(workspacePath)) {
      const settingsCache = SettingsCache.instance();

      const commandLine = utils.makeNinjaTargetCommand();
      const outputChannel = this.getOutputChannel('getNinjaTargets');
      try {
        progress.report({increment: 1, message: "Getting Ninja Targets"});
        const { stdout, stderr } = await utils.exec(commandLine, { cwd: workspacePath });
        if (stderr && stderr.length > 0) {
          outputChannel.appendLine(stderr);
          outputChannel.show(true);
        }
        if (stdout) {
          var favourites = this.context.workspaceState.get<string[]>(constants.FAVOURITE_TARGETS);
          const lines = stdout.split(/\r{0,1}\n/);
          var favTargets: NinjaTarget[] = [];
          var debugTargets: NinjaTarget[] = [];
          var releaseTargets: NinjaTarget[] = [];
          var inc = 100 / lines.length;
          for (const linei in lines) {

            if(token.isCancellationRequested){
              return Promise.reject("Ninjas Dead!");
            }
            const line = lines[linei];
            if (line.trim().length > 0) {
              const target = line.replace(": phony", "");
              progress.report({increment: inc, message: "  Parsing " +  path.basename(target)});
              const targetPath = await this.getNinjaTargetPath(target, workspacePath);
              if (target && targetPath && settingsCache.targetIncludeFilter?.test(targetPath)) {
                console.log("Using Target with Path -> " + target + " => " + targetPath);

                const isFavourite = favourites?.includes(target) || false;
                const favContext = isFavourite ? "-favourite" : "";
                const matchDebug = settingsCache.debugTargetFilter?.exec(target);
                if (matchDebug && matchDebug.length) {
                  const simpleName = matchDebug.length === 2 ? target.replace(matchDebug[1], "") : "";
                  debugTargets.push(new NinjaTarget(line, simpleName, target, targetPath, vscode.TreeItemCollapsibleState.None, constants.NINJA_TARGET_DEBUG + favContext));
                  if (isFavourite) {
                    favTargets.push(new NinjaTarget(line, simpleName, target, targetPath, vscode.TreeItemCollapsibleState.None, constants.NINJA_TARGET_FAVOURITE + favContext));
                  }
                }
                const matchRelease = settingsCache.releaseTargetFilter?.exec(target);
                if (matchRelease && matchRelease.length) {
                  const simpleName = matchRelease.length == 2 ? target.replace(matchRelease[1], "") : "";
                  releaseTargets.push(new NinjaTarget(line, simpleName, target, targetPath, vscode.TreeItemCollapsibleState.None, constants.NINJA_TARGET_RELEASE + favContext));
                  if (isFavourite) {
                    favTargets.push(new NinjaTarget(line, simpleName, target, targetPath, vscode.TreeItemCollapsibleState.None, constants.NINJA_TARGET_FAVOURITE + favContext));
                  }
                }
              }

            }
          }
          await this.context.workspaceState.update(constants.DEBUG_CACHE, this.sort(debugTargets));
          await this.context.workspaceState.update(constants.RELEASE_CACHE, this.sort(releaseTargets));
          await this.context.workspaceState.update(constants.FAVOURITES_CACHE, this.sort(favTargets));
          await this.context.workspaceState.update(constants.IS_CACHED, debugTargets.length + releaseTargets.length > 0);
        }
      }
      catch (err: any) {
        if (err.stderr) {
          outputChannel.appendLine(err.stderr);
        }
        if (err.stdout) {
          outputChannel.appendLine(err.stdout);
        }
        outputChannel.appendLine('Auto detecting ninja build tasks failed.');
        outputChannel.show(true);
        return await Promise.reject(err);
      }
      this._onDidChangeData.fire();

      return await Promise.resolve();
    } else {
      return Promise.reject("Path doesn't exist");
    }

  }

  private sort(nodes: NinjaTarget[]): NinjaTarget[] {
    return nodes.sort((n1, n2) => {
      return n1.label.localeCompare(n2.label);
    });
  }

 
}