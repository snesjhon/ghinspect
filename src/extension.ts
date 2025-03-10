import * as vscode from "vscode";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
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
        const query = `gh pr list --search "${sha}" --state merged --json number,title,body,commits`;
        const { stdout: prOutput } = await exec(query, {
          cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        });

        if (prOutput) {
          const prParsed = JSON.parse(prOutput);
          const pr = prParsed[0];
          const commits = pr.commits.map(
            (commit: any) => commit.messageHeadline
          );
          prResults.push({
            sha,
            number: pr.number,
            title: pr.title,
            body: pr.body,
            blameLine,
            commit: commits as string[],
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
  const prResultProvider = new PRResultProvider();

  const prResultView = vscode.window.createTreeView("prResultView", {
    treeDataProvider: prResultProvider,
  });

  // Register get blame info command

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

      await vscode.env.clipboard.writeText(
        allResults +
          "\n\n Given the git blame and log history, why was this change made?"
      );
      vscode.window.showInformationMessage(
        "All PR results copied to clipboard!"
      );
    }
  );

  context.subscriptions.push(prSearchDisposable);
  context.subscriptions.push(copyPRResultsDisposable);
  context.subscriptions.push(prResultView);
}

export function deactivate() {}
