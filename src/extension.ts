import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "ghinspect" is now active!');

  let disposable = vscode.commands.registerCommand('ghinspect.helloWorld', () => {
    vscode.window.showInformationMessage('Hello from GH Inspect!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {} 