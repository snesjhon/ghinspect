import * as vscode from 'vscode';

export interface BlameInfo {
    sha: string;
    filePath: string;
    lineRange: {
        start: number;
        end: number;
    };
    blameLine: string;
    prInfo?: {
        number: number;
        title: string;
        body: string;
    };
}

export class GitBlameItem extends vscode.TreeItem {
    constructor(
        public readonly info: BlameInfo,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(info.sha, collapsibleState);
        this.description = `Lines ${info.lineRange.start}-${info.lineRange.end}`;
        this.tooltip = info.blameLine;
        
        if (info.prInfo) {
            this.description = `PR #${info.prInfo.number} (${this.description})`;
        }
    }
}

export class GitBlameProvider implements vscode.TreeDataProvider<GitBlameItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitBlameItem | undefined | null | void> = new vscode.EventEmitter<GitBlameItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GitBlameItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private blameInfo: BlameInfo[] = [];

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GitBlameItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GitBlameItem): Thenable<GitBlameItem[]> {
        if (element) {
            if (element.info.prInfo) {
                const prDetails = new GitBlameItem(
                    {
                        ...element.info,
                        blameLine: `PR #${element.info.prInfo.number}: ${element.info.prInfo.title}\n\n${element.info.prInfo.body}`
                    },
                    vscode.TreeItemCollapsibleState.None
                );
                return Promise.resolve([prDetails]);
            }
            return Promise.resolve([]);
        }

        return Promise.resolve(
            this.blameInfo.map(info => new GitBlameItem(info, info.prInfo ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None))
        );
    }

    setBlameInfo(info: BlameInfo[]): void {
        this.blameInfo = info;
        this.refresh();
    }

    clear(): void {
        this.blameInfo = [];
        this.refresh();
    }
} 