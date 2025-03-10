import * as vscode from 'vscode';
import { CodeSelectionProvider, CodeSelectionItem } from './CodeSelectionProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "ghinspect" is now active!');

  const codeSelectionProvider = new CodeSelectionProvider();
  const treeView = vscode.window.createTreeView('codeSelectionView', {
    treeDataProvider: codeSelectionProvider
  });

  // Register selection change handler
  vscode.window.onDidChangeTextEditorSelection(event => {
    const editor = event.textEditor;
    if (editor && editor.selection && !editor.selection.isEmpty) {
      const document = editor.document;
      const selection = editor.selection;
      const selectedText = document.getText(selection);
      const fileName = document.fileName.split('/').pop() || 'Unknown';
      
      codeSelectionProvider.addSelection(
        `${fileName} (${selection.start.line + 1}-${selection.end.line + 1})`,
        selectedText
      );
    }
  }, null, context.subscriptions);

  // Register copy to clipboard command
  let copyDisposable = vscode.commands.registerCommand('ghinspect.copyToClipboard', async (item: CodeSelectionItem) => {
    if (item) {
      await vscode.env.clipboard.writeText(item.code);
      vscode.window.showInformationMessage('Code copied to clipboard!');
    }
  });

  context.subscriptions.push(copyDisposable);
  context.subscriptions.push(treeView);
}

export function deactivate() {} 