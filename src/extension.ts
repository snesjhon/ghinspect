import * as vscode from "vscode";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import {
  CodeSelectionProvider,
  CodeSelectionItem,
} from "./CodeSelectionProvider";
import {
  GitHubSearchProvider,
  GitHubSearchItem,
  SearchResult,
} from "./GitHubSearchProvider";
import { GitBlameProvider, GitBlameItem, BlameInfo } from './GitBlameProvider';

const exec = promisify(execCallback);

async function checkGitHubCLI(): Promise<boolean> {
  try {
    await exec("gh --version");
    return true;
  } catch (error) {
    return false;
  }
}

async function searchGitHub(query: string): Promise<SearchResult[]> {
  try {
    const { stdout } = await exec(
      `gh search code "${query}" --json path,repository,url --limit 10`
    );
    const results = JSON.parse(stdout);

    // Fetch content for each result
    const searchResults: SearchResult[] = [];
    for (const result of results) {
      try {
        const { stdout: content } = await exec(`gh api ${result.url}`);
        const contentData = JSON.parse(content);
        searchResults.push({
          path: result.path,
          repository: result.repository.nameWithOwner,
          code: Buffer.from(contentData.content, "base64").toString("utf-8"),
          url: result.html_url || result.url,
        });
      } catch (error) {
        console.error("Error fetching content:", error);
      }
    }

    return searchResults;
  } catch (error) {
    throw new Error(`GitHub search failed: ${error}`);
  }
}

async function getBlameInfo(filePath: string, startLine: number, endLine: number): Promise<BlameInfo[]> {
  try {
    const { stdout: blameOutput } = await exec(
      `git blame -L ${startLine},${endLine} ${filePath}`
    );

    const blameLines = blameOutput.split('\n').filter(line => line.trim());
    const blameInfo: BlameInfo[] = [];

    for (const line of blameLines) {
      const sha = line.split(' ')[0];
      if (!sha) continue;

      try {
        const { stdout: prOutput } = await exec(
          `gh pr list --search "${sha}" --state merged --json number,title,body --jq '.[] | "PR #\(.number): \(.title)\nDescription: \(.body)\n"'`
        );

        // Parse PR info from the output
        const prMatch = prOutput.match(/PR #(\d+): (.*?)\nDescription: (.*?)\n/s);
        const prInfo = prMatch ? {
          number: parseInt(prMatch[1]),
          title: prMatch[2],
          body: prMatch[3]
        } : undefined;

        blameInfo.push({
          sha,
          filePath,
          lineRange: {
            start: startLine,
            end: endLine
          },
          blameLine: line,
          prInfo
        });
      } catch (error) {
        console.error('Error fetching PR info:', error);
        blameInfo.push({
          sha,
          filePath,
          lineRange: {
            start: startLine,
            end: endLine
          },
          blameLine: line
        });
      }
    }

    return blameInfo;
  } catch (error) {
    throw new Error(`Git blame failed: ${error}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const codeSelectionProvider = new CodeSelectionProvider();
  const githubSearchProvider = new GitHubSearchProvider();
  const gitBlameProvider = new GitBlameProvider();

  const codeSelectionView = vscode.window.createTreeView("codeSelectionView", {
    treeDataProvider: codeSelectionProvider,
  });

  const githubSearchView = vscode.window.createTreeView("ghSearchView", {
    treeDataProvider: githubSearchProvider,
  });

  const gitBlameView = vscode.window.createTreeView('gitBlameView', {
    treeDataProvider: gitBlameProvider
  });

  // Register selection change handler
  vscode.window.onDidChangeTextEditorSelection(
    (event) => {
      const editor = event.textEditor;
      if (editor && editor.selection && !editor.selection.isEmpty) {
        const document = editor.document;
        const selection = editor.selection;
        const selectedText = document.getText(selection);
        const fileName = document.fileName.split("/").pop() || "Unknown";

        codeSelectionProvider.addSelection(
          `${fileName} (${selection.start.line + 1}-${selection.end.line + 1})`,
          selectedText
        );
      }
    },
    null,
    context.subscriptions
  );

  // Register copy to clipboard command
  let copyDisposable = vscode.commands.registerCommand('ghinspect.copyToClipboard', async (item: GitBlameItem) => {
    if (item) {
      await vscode.env.clipboard.writeText(item.info.blameLine);
      vscode.window.showInformationMessage('Blame info copied to clipboard!');
    }
  });

  // Register GitHub search command
  let searchDisposable = vscode.commands.registerCommand(
    "ghinspect.searchGitHub",
    async (item: CodeSelectionItem) => {
      if (!item) return;

      const isGHInstalled = await checkGitHubCLI();
      if (!isGHInstalled) {
        vscode.window.showErrorMessage(
          "GitHub CLI (gh) is not installed. Please install it to use this feature."
        );
        return;
      }

      try {
        vscode.window.showInformationMessage("Searching GitHub...");
        const results = await searchGitHub(item.code);
        githubSearchProvider.setResults(results);
        vscode.window.showInformationMessage(
          `Found ${results.length} results on GitHub`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`GitHub search failed: ${error}`);
        githubSearchProvider.clear();
      }
    }
  );

  // Register get blame info command
  let blameDisposable = vscode.commands.registerCommand('ghinspect.getBlameInfo', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor!');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showErrorMessage('No text selected!');
      return;
    }

    const isGHInstalled = await checkGitHubCLI();
    if (!isGHInstalled) {
      vscode.window.showErrorMessage('GitHub CLI (gh) is not installed. Please install it to use this feature.');
      return;
    }

    try {
      vscode.window.showInformationMessage('Getting git blame info...');
      const blameInfo = await getBlameInfo(
        editor.document.fileName,
        selection.start.line + 1,
        selection.end.line + 1
      );
      gitBlameProvider.setBlameInfo(blameInfo);
      vscode.window.showInformationMessage(`Found blame info for ${blameInfo.length} lines`);
    } catch (error) {
      vscode.window.showErrorMessage(`Git blame failed: ${error}`);
      gitBlameProvider.clear();
    }
  });

  context.subscriptions.push(copyDisposable);
  context.subscriptions.push(searchDisposable);
  context.subscriptions.push(codeSelectionView);
  context.subscriptions.push(githubSearchView);
  context.subscriptions.push(gitBlameView);
  context.subscriptions.push(blameDisposable);
}

export function deactivate() {}
