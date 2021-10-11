import * as vscode from 'vscode';


export class SettingsCache implements vscode.Disposable{
  static _instance: SettingsCache;
  public ninjaExecutable: string = "";
  public ninjaBuildAlternate: string = "";
  public ninjaArguments: string[]  = [];  
  public ninjaBuildPath: string = "";
  public ninjaProjectRoot: string = "";
  public debugSourceMap: Object = {};
  public debugEnv: Object = {};
  public runConfigurations: any = {};
  public testExecutablesPath: string = "";
  public testExecutablesArguments: string[] = [];
  public targetIncludeFilter: RegExp|undefined;
  public debugTargetFilter: RegExp|undefined;
  public releaseTargetFilter: RegExp|undefined;
  public cppConfigIncludePaths: any[] = [];
  public cppConfigDefines: string[] = [];
  
  constructor(private readonly context: vscode.ExtensionContext){
    SettingsCache._instance = this;
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => this.onConfigurationChange(e));
    this.loadCache();
  }

  public static instance(): SettingsCache{
    return SettingsCache._instance;
  }
  
  private onConfigurationChange(e: vscode.ConfigurationChangeEvent): void {
    this.loadCache();
  }


  private loadCache() {
    const config = vscode.workspace.getConfiguration("ninjabuild");

    this.ninjaExecutable = config.get( "ninjaExecutable", "");
    this.ninjaBuildAlternate = config.get( "ninjaAlternateBuildExecutable", "");
    
    this.ninjaArguments = config.get( "ninjaArguments",[]);
    this.ninjaBuildPath = config.get("ninjaBuildPath", "");
    if(this.ninjaBuildPath){
      this.ninjaBuildPath = `-C ${this.ninjaBuildPath}`;
    }
    this.ninjaProjectRoot = config.get( "ninjaProjectRoot","");
    this.debugSourceMap = config.get("debugSourceMap", {});
    this.debugEnv = config.get("debugEnv", {});
    this.runConfigurations = config.get("runConfigurations", {});
    this.testExecutablesPath = config.get("testExecutablesPath", "");
    this.testExecutablesArguments = config.get("testExecutablesArguments", []);
    this.targetIncludeFilter = new RegExp(config.get<string>("filters.targetincludefilter",".*"));
    this.debugTargetFilter = new RegExp(config.get<string>("filters.debugtargetfilter",".*"));
    this.releaseTargetFilter = new RegExp(config.get<string>("filters.releasetargetfilter",".*"));
    this.cppConfigIncludePaths = config.get<Object[]>("cppconfig.includePaths", []);
    this.cppConfigDefines = config.get<string[]>("cppconfig.defines",[]);
  }

  dispose() {
    
  }

  public getNinjaBuildExecutable(): string {
    return this.ninjaBuildAlternate || this.ninjaExecutable;
  }

  public getAppArguments(appName: string): string[]{
    if(this.runConfigurations.hasOwnProperty(appName)){
      const appConfig = this.runConfigurations[appName];
      if(appConfig.hasOwnProperty("args")){
        return appConfig["args"];
      }
    }

    return [];
  }

  public getAppCwd(appName: string): string{
    if(this.runConfigurations.hasOwnProperty(appName)){
      const appConfig = this.runConfigurations[appName];
      if(appConfig.hasOwnProperty("cwd")){
        return appConfig["cwd"];
      }
    }

    return "";
  }

  public getAppPostRunCommands(appName: string): string {
    if(this.runConfigurations.hasOwnProperty(appName)){
      const appConfig = this.runConfigurations[appName];
      if(appConfig.hasOwnProperty("postRunCommands")){
        return appConfig["postRunCommands"];
      }
    }

    return "";
  }


}