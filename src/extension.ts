// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NinjaBuildTaskProvider } from './NinjaBuildTaskProvider';
import { SettingsCache } from './SettingsCache';
import { NinjaTreeDataProvider } from './TreeDataProvider';
import { NinjaTreeProvider } from './NinjaTreeProvider';
import * as commands from './NinjaCommands';
import * as constants from './constants';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let ninjaTreeDataProvider: NinjaTreeDataProvider;
let ninjaTreeProviderDebug: vscode.Disposable | undefined;
let ninjaTreeProviderRelease: vscode.Disposable | undefined;
let ninjaTreeProviderFavourites: vscode.Disposable | undefined;
let ninjaTaskProvider: vscode.Disposable | undefined;
let settingsCacheProvider: SettingsCache;
let ninjaDebugProvider: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
  settingsCacheProvider = new SettingsCache(context);
  ninjaTreeDataProvider = new NinjaTreeDataProvider(context);

  ninjaTreeProviderDebug = vscode.window.registerTreeDataProvider('ninjaDebug', new NinjaTreeProvider(context, ninjaTreeDataProvider, constants.DEBUG_CACHE));
  ninjaTreeProviderRelease = vscode.window.registerTreeDataProvider('ninjaRelease', new NinjaTreeProvider(context, ninjaTreeDataProvider, constants.RELEASE_CACHE));
  ninjaTreeProviderFavourites = vscode.window.registerTreeDataProvider('ninjaFavourites', new NinjaTreeProvider(context, ninjaTreeDataProvider, constants.FAVOURITES_CACHE));

  ninjaTaskProvider = vscode.tasks.registerTaskProvider("ninja-build", new NinjaBuildTaskProvider(context));
  
  
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.refresh', () => ninjaTreeDataProvider.refresh()));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.buildAllDebug', () => commands.buildAll(context, constants.DEBUG_CACHE)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.buildAllRelease', () => commands.buildAll(context, constants.RELEASE_CACHE)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.buildAllFavourites', () => commands.buildAll(context, constants.FAVOURITES_CACHE)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.runAll', () => commands.runAll(context, constants.FAVOURITES_CACHE)));


  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.build', target => commands.build(target)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.run', target => commands.run(target)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.debug', target => commands.debug(target)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.favourite', target => commands.favourite(target, ninjaTreeDataProvider)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.favouriteIs', target => commands.favourite(target, ninjaTreeDataProvider)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaTargets.createLaunchConfiguration', target => commands.createLaunchConfiguration(target)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaCommand.createTestMateConfig', target => commands.createTestMateConfig(target)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaCommand.createCPPConfig', target => commands.createCPPConfig(target)));
  context.subscriptions.push(vscode.commands.registerCommand('ninjaCommand.flushCaches', () => commands.flushCaches(context)));
  

}


export function deactivate(): void {
  if (ninjaTreeProviderDebug) {
    ninjaTreeProviderDebug.dispose();
  }
  if (ninjaTreeProviderRelease) {
    ninjaTreeProviderRelease.dispose();
  }
  if (ninjaTreeProviderFavourites) {
    ninjaTreeProviderFavourites.dispose();
  }
  if (ninjaTaskProvider) {
    ninjaTaskProvider.dispose();
  }
  if(settingsCacheProvider){
    settingsCacheProvider.dispose();
  }
  if(ninjaTreeDataProvider){
    ninjaTreeDataProvider.dispose();
  }
  if(ninjaDebugProvider){
    ninjaDebugProvider.dispose();
  }

}