import * as vscode from "vscode";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import { GitBlameProvider, GitBlameItem, BlameInfo } from "./GitBlameProvider";
import { PRResultProvider, PRResult } from "./PRResultProvider";

const exec = promisify(execCallback);

async function checkGitHubCLI(): Promise<boolean> {
  try {
    await exec("gh --version");
    return true;
  } catch (error) {
    return false;
  }
}

async function getBlameInfo(
  filePath: string,
  startLine: number,
  endLine: number
): Promise<BlameInfo[]> {
  try {
    const { stdout: blameOutput } = await exec(
      `git blame -L ${startLine},${endLine} ${filePath}`
    );

    const blameLines = blameOutput.split("\n").filter((line) => line.trim());
    const blameInfo: BlameInfo[] = [];

    for (const line of blameLines) {
      const sha = line.split(" ")[0];
      if (!sha) continue;

      try {
        const { stdout: prOutput } = await exec(
          `gh pr list --search "${sha}" --state merged --json number,title,body --jq '.[] | "PR #\(.number): \(.title)\nDescription: \(.body)\n"'`,
          {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
          }
        );

        // Parse PR info from the output
        const prMatch = prOutput.match(
          /PR #(\d+): (.*?)\nDescription: (.*?)\n/s
        );
        const prInfo = prMatch
          ? {
              number: parseInt(prMatch[1]),
              title: prMatch[2],
              body: prMatch[3],
            }
          : undefined;

        blameInfo.push({
          sha,
          filePath,
          lineRange: {
            start: startLine,
            end: endLine,
          },
          blameLine: line,
          prInfo,
        });
      } catch (error) {
        console.error("Error fetching PR info:", error);
        blameInfo.push({
          sha,
          filePath,
          lineRange: {
            start: startLine,
            end: endLine,
          },
          blameLine: line,
        });
      }
    }

    return blameInfo;
  } catch (error) {
    throw new Error(`Git blame failed: ${error}`);
  }
}

async function searchPRsForBlame(
  filePath: string,
  startLine: number,
  endLine: number
): Promise<PRResult[]> {
  try {
    const { stdout: blameOutput } = await exec(
      `git blame -L ${startLine},${endLine} ${filePath}`,
      {
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      }
    );

    const blameLines = blameOutput.split("\n").filter((line) => line.trim());
    const prResults: PRResult[] = [];

    for (const blameLine of blameLines) {
      const sha = blameLine.split(" ")[0];
      if (!sha) continue;

      try {
        const query = `gh pr list --search "${sha}" --state merged --json number,title,body`;

        const { stdout: prOutput } = await exec(query, {
          cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        });

        if (prOutput) {
          const pr = JSON.parse(prOutput);
          prResults.push({
            sha,
            number: parseInt(pr[0].number),
            title: pr[0].title,
            body: pr[0].body,
            blameLine,
          });
        }
      } catch (error) {
        console.error("Error fetching PR info:", error);
      }
    }

    return prResults;
  } catch (error) {
    throw new Error(`Git blame search failed: ${error}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const gitBlameProvider = new GitBlameProvider();
  const prResultProvider = new PRResultProvider();

  const gitBlameView = vscode.window.createTreeView("gitBlameView", {
    treeDataProvider: gitBlameProvider,
  });

  const prResultView = vscode.window.createTreeView("prResultView", {
    treeDataProvider: prResultProvider,
  });

  // Register copy to clipboard command
  let copyDisposable = vscode.commands.registerCommand(
    "ghinspect.copyToClipboard",
    async (item: GitBlameItem) => {
      if (item) {
        await vscode.env.clipboard.writeText(item.info.blameLine);
        vscode.window.showInformationMessage("Blame info copied to clipboard!");
      }
    }
  );

  // Register get blame info command
  let blameDisposable = vscode.commands.registerCommand(
    "ghinspect.getBlameInfo",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor!");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage("No text selected!");
        return;
      }

      const isGHInstalled = await checkGitHubCLI();
      if (!isGHInstalled) {
        vscode.window.showErrorMessage(
          "GitHub CLI (gh) is not installed. Please install it to use this feature."
        );
        return;
      }

      try {
        vscode.window.showInformationMessage("Getting git blame info...");
        const blameInfo = await getBlameInfo(
          editor.document.fileName,
          selection.start.line + 1,
          selection.end.line + 1
        );
        gitBlameProvider.setBlameInfo(blameInfo);
        vscode.window.showInformationMessage(
          `Found blame info for ${blameInfo.length} lines`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Git blame failed: ${error}`);
        gitBlameProvider.clear();
      }
    }
  );

  // Register PR search command
  let prSearchDisposable = vscode.commands.registerCommand(
    "ghinspect.searchPRs",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor!");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage("No text selected!");
        return;
      }

      const isGHInstalled = await checkGitHubCLI();
      if (!isGHInstalled) {
        vscode.window.showErrorMessage(
          "GitHub CLI (gh) is not installed. Please install it to use this feature."
        );
        return;
      }

      try {
        vscode.window.showInformationMessage("Searching for PRs...");
        const results = await searchPRsForBlame(
          editor.document.fileName,
          selection.start.line + 1,
          selection.end.line + 1
        );
        prResultProvider.setResults(results);
        vscode.window.showInformationMessage(`Found ${results.length} PRs`);
      } catch (error) {
        vscode.window.showErrorMessage(`PR search failed: ${error}`);
        prResultProvider.clear();
      }
    }
  );

  // Register copy results command
  let copyPRResultsDisposable = vscode.commands.registerCommand(
    "ghinspect.copyPRResults",
    async () => {
      const allResults = prResultProvider.getAllResultsText();
      if (!allResults) {
        vscode.window.showInformationMessage("No PR results to copy");
        return;
      }

      await vscode.env.clipboard.writeText(allResults);
      vscode.window.showInformationMessage(
        "All PR results copied to clipboard!"
      );
    }
  );

  context.subscriptions.push(copyDisposable);
  context.subscriptions.push(gitBlameView);
  context.subscriptions.push(blameDisposable);
  context.subscriptions.push(prSearchDisposable);
  context.subscriptions.push(copyPRResultsDisposable);
  context.subscriptions.push(prResultView);
}

export function deactivate() {}
