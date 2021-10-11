import * as vscode from 'vscode';

export class NinjaTarget extends vscode.TreeItem {

  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly target: string,
    public readonly targetPath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string
  ) {
    super(label, collapsibleState);
    this.description = this.targetPath;
  }
}
