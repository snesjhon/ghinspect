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

## Features

- Basic Hello World command implementation

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
