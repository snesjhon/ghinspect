import * as vscode from 'vscode';

export interface SearchResult {
    path: string;
    repository: string;
    code: string;
    url: string;
}

export class GitHubSearchItem extends vscode.TreeItem {
    constructor(
        public readonly result: SearchResult,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(result.path, collapsibleState);
        this.tooltip = result.code;
        this.description = result.repository;
        this.code = result.code;
        
        // Add repository URL as a command
        this.command = {
            command: 'vscode.open',
            title: 'Open in Browser',
            arguments: [vscode.Uri.parse(result.url)]
        };
    }

    public readonly code: string;
}

export class GitHubSearchProvider implements vscode.TreeDataProvider<GitHubSearchItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitHubSearchItem | undefined | null | void> = new vscode.EventEmitter<GitHubSearchItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GitHubSearchItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private results: SearchResult[] = [];

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GitHubSearchItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GitHubSearchItem): Thenable<GitHubSearchItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        return Promise.resolve(
            this.results.map(result => new GitHubSearchItem(result, vscode.TreeItemCollapsibleState.None))
        );
    }

    setResults(results: SearchResult[]): void {
        this.results = results;
        this.refresh();
    }

    clear(): void {
        this.results = [];
        this.refresh();
    }
} 