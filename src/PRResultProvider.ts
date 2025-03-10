import * as vscode from "vscode";

export interface PRResult {
  sha: string;
  number: number;
  title: string;
  body: string;
  blameLine: string;
  commit?: string[];
}

export class PRResultItem extends vscode.TreeItem {
  constructor(
    public readonly result: PRResult,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`PR #${result.number}`, collapsibleState);
    this.description = result.title;
    this.tooltip = `${result.blameLine}\n\nPR Description:\n${result.body}`;

    // Add PR info as a command
    this.command = {
      command: "vscode.open",
      title: "Open PR in Browser",
      arguments: [
        vscode.Uri.parse(`https://github.com/pulls/${result.number}`),
      ],
    };
  }

  getFullText(): string {
    return `Commit: ${this.result.sha}
PR #${this.result.number}: ${this.result.title}

Description:
${this.result.body}

Commit Message:
${this.result.commit?.join("\n") || "No commit message available"}

Blame Info:
${this.result.blameLine}`;
  }
}

export class PRResultProvider implements vscode.TreeDataProvider<PRResultItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    PRResultItem | undefined | null | void
  > = new vscode.EventEmitter<PRResultItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    PRResultItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private results: PRResult[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PRResultItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PRResultItem): Thenable<PRResultItem[]> {
    if (element) {
      if (element.result.commit) {
        const commitDetails = new PRResultItem(
          {
            ...element.result,
            title: "Commit Details",
            body: `${element.result.commit.join("\n")}`,
          },
          vscode.TreeItemCollapsibleState.None
        );
        return Promise.resolve([commitDetails]);
      }
      return Promise.resolve([]);
    }

    return Promise.resolve(
      this.results.map(
        (result) =>
          new PRResultItem(
            result,
            result.commit
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.None
          )
      )
    );
  }

  setResults(results: PRResult[]): void {
    this.results = results;
    this.refresh();
  }

  clear(): void {
    this.results = [];
    this.refresh();
  }

  getAllResultsText(): string {
    return this.results
      .map(
        (result) =>
          `Commit: ${result.sha}
PR #${result.number}: ${result.title}

Description:
${result.body}

Commit Message:
${result.commit?.join("\n") || "No commit message available"}

Blame Info:
${result.blameLine}

-------------------`
      )
      .join("\n\n");
  }
}
