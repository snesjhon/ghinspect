# GH Inspect VSCode Extension

A VSCode extension built with TypeScript and Vite.

## Development

### Prerequisites

- Node.js
- pnpm
- Visual Studio Code

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development Commands

- `pnpm run dev` - Watch mode for development
- `pnpm run build` - Build the extension
- `pnpm test` - Run tests

### Running the Extension

1. Open this project in VS Code
2. Press F5 to start debugging
3. In the Extension Development Host window that appears, try the command:
   - Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   - Type "Hello World" and select the command

---

# Using Composer to build this extension

<details>
<summary>Initial Setup</summary>

Goal: Generate a repo for a VSCode extension
use pnpm as a package manager
use the latest version of extension api
use the vite build tool

Warnings:
Don't create an icon for the extension
Don't focus on adding panels or views yet

</details>

<details>
<summary>Copying lines of code</summary>

Goal: When the user selects lines of code, have it copy and paste it into a new sidebar
This sidebar should have a button to copy the lines to the clipboard
The sidebar's name should be the name of the file with the lines of code

Warnings:

- Only focus on adding a sidebar for now, don't use WebviewPanel. Only extension API.
- Try to only use the extension api and not any other packages
- Do not use webview, this should only be extension api

</details>

<details>
<summary> Running a `gh` command </summary>

Goal: Run a `gh` Github CLI command when the user selects lines of code

- This would run a check if `gh` is installed
- If it is, run the command
- If it isn't, show an error message
- If the command is successful, show a success message
- use the `exec` command to run the command, using `promisify` to handle the promise
- Run `gh search code` with the selected code
- The output of the command should be shown in a sidebar
- The sidebar should have a button to copy the lines to the clipboard

Warnings:

- Try to only use the extension api and not any other packages
- If you need to add a package to run a terminal command, then do so
- Do not use webviews, no html, it should all be vscode extension api
</details>

<details>
<summary>Replace Snippet View with Git Blame View</summary>

Goal: Replace Snippet View with Git Blame View

- Instead of using a CodeSnippetView, we want to get a list of GitBlame sha to search PRs using `gh`
- Replace the CodeSnippetProvider with a GitBlameProvider
- Replace the searchGitHub function with a searchPRs function
- Replace the searchResultProvider with a gitBlameResultProvider
- Add a `getBlameInfo` command that will get the blame info from the selected range of lines of code

Use the following format and output this in the sidebar:

```
git blame -L ${LINE_RANGE_START},${LINE_RANGE_END} ${RELATIVE_FILE_PATH} | \
while read -r line; do
  sha=$(echo $line | awk '{print $1}')
  {
    echo "$line"
    echo "PR Info for $sha:"
    gh pr list --search "$sha" --state merged --json number,title,body --jq '.[] | "PR #\(.number): \(.title)\nDescription: \(.body)\n"'
    echo "-------------------"
  }
done
```

Warnings:

- Don't use `path` or `relativePath` for the file path, just use the filePath
</details>

<details>
<summary>Revise Blame Info</summary>

Goal: Revise the blame Info and PR search into a single command

- Add a `searchPRs` command that will search for PRs using the blame info
- Add a `prResultProvider` that will display the PR search results in a sidebar
- Add a way of copying the whole result of the PR search to the clipboard

Warnings:

- Don't use `path` or `relativePath` for the file path, just use the filePath
</details>

<details>
<summary>Add commits from each PR to the blame sidebar</summary>

Goal: Add the commits from each PR to to the blame sidebar

Only add the commit message and body to the sidebar.
Reuse the `searchPRsForBlame` function to get the PRs and commit messages and just add `commits` to the `gh pr list --search`

Warnings:

- Do not use another `gh` command, reuse the existing `gh` commands
</details>
