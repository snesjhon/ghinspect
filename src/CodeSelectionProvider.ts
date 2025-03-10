import * as vscode from 'vscode';

export class CodeSelectionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly code: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = code;
        this.description = `Lines: ${code.split('\n').length}`;
    }
}

export class CodeSelectionProvider implements vscode.TreeDataProvider<CodeSelectionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeSelectionItem | undefined | null | void> = new vscode.EventEmitter<CodeSelectionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeSelectionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private selections: Map<string, string> = new Map();

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CodeSelectionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CodeSelectionItem): Thenable<CodeSelectionItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        const items: CodeSelectionItem[] = [];
        this.selections.forEach((code, fileName) => {
            items.push(new CodeSelectionItem(
                fileName,
                code,
                vscode.TreeItemCollapsibleState.None
            ));
        });

        return Promise.resolve(items);
    }

    addSelection(fileName: string, code: string): void {
        this.selections.set(fileName, code);
        this.refresh();
    }

    getSelection(fileName: string): string | undefined {
        return this.selections.get(fileName);
    }

    clear(): void {
        this.selections.clear();
        this.refresh();
    }
} 