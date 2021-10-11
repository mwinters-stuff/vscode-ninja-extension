import * as vscode from 'vscode';
import { NinjaTarget } from './NinjaTarget';
import { NinjaTreeDataProvider } from './TreeDataProvider';


export class NinjaTreeProvider implements vscode.TreeDataProvider<NinjaTarget>{
  
  
  private _onDidChangeTreeData: vscode.EventEmitter<NinjaTarget | undefined | void> = new vscode.EventEmitter<NinjaTarget | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<NinjaTarget | undefined | void> = this._onDidChangeTreeData.event;
  
  constructor(private readonly context: vscode.ExtensionContext, private readonly dataProvider: NinjaTreeDataProvider, private readonly which: string) {
    dataProvider.onDidChangeData(() => this._onDidChangeTreeData.fire());
  }

  getTreeItem(element: NinjaTarget): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  
  getChildren(element?: NinjaTarget): Thenable<NinjaTarget[]> {
    var d = this.context.workspaceState.get<NinjaTarget[]>(this.which);
    if(d){
     return Promise.resolve(d);
    }
    return Promise.reject("no data");
  }
}
