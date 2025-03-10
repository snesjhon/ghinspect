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

export function activate(context: vscode.ExtensionContext) {
  const codeSelectionProvider = new CodeSelectionProvider();
  const githubSearchProvider = new GitHubSearchProvider();

  const codeSelectionView = vscode.window.createTreeView("codeSelectionView", {
    treeDataProvider: codeSelectionProvider,
  });

  const githubSearchView = vscode.window.createTreeView("ghSearchView", {
    treeDataProvider: githubSearchProvider,
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
  let copyDisposable = vscode.commands.registerCommand(
    "ghinspect.copyToClipboard",
    async (item: CodeSelectionItem | GitHubSearchItem) => {
      if (item) {
        await vscode.env.clipboard.writeText(item.code);
        vscode.window.showInformationMessage("Code copied to clipboard!");
      }
    }
  );

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

  context.subscriptions.push(copyDisposable);
  context.subscriptions.push(searchDisposable);
  context.subscriptions.push(codeSelectionView);
  context.subscriptions.push(githubSearchView);
}

export function deactivate() {}
