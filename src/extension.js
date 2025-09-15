const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const assetsManager = require('./assets_manager.js');
const outputChannel = vscode.window.createOutputChannel('Asset Manager');

function activate(context) {
    const config = vscode.workspace.getConfiguration('robotframeworkWelcome');
    const hasSeenWelcome = config.get('hasSeenWelcome', false);
    const welcomeUrl = config.get('welcomeUrl', 'https://robotframework-aio.org/');

    if (!hasSeenWelcome) {
        let disposable = vscode.commands.registerCommand('extension.showRobotframeworkWelcome', () => {
            const resolvedWelcomeUrl = welcomeUrl.startsWith('http://') || welcomeUrl.startsWith('https://')
                ? welcomeUrl
                : vscode.Uri.file(path.join(context.extensionPath, welcomeUrl)).toString();

            const panel = vscode.window.createWebviewPanel(
                'robotframeworkWelcome',
                'Welcome to Robotframework AIO',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: (welcomeUrl.startsWith('http://') || welcomeUrl.startsWith('https://'))
                        ? []
                        : [vscode.Uri.file(path.dirname(path.join(context.extensionPath, welcomeUrl)))], // Allow local file access
                }
            );

            if (resolvedWelcomeUrl.startsWith('file://')) {
                // Convert the file URI to a local file path
                const localFilePath = vscode.Uri.parse(resolvedWelcomeUrl).fsPath;
                // Check if the file exists
                if (fs.existsSync(localFilePath)) {
                    // Read the file content and set it as the Webview's HTML
                    outputChannel.append(localFilePath, 'utf8');
                    const fileContent = fs.readFileSync(localFilePath, 'utf8');
                    const assets = assetsManager.getAssets();
                    panel.webview.html = assetsManager.replaceAssets(panel.webview, context, fileContent, assets);
                } else {
                    vscode.window.showErrorMessage(`File not found: ${localFilePath}`);
                }
            } else if (resolvedWelcomeUrl.startsWith('http://') || resolvedWelcomeUrl.startsWith('https://')) {
                // For HTTP/HTTPS URLs, set the Webview's HTML to load the URL
                panel.webview.html = `
                     <!DOCTYPE html>
                     <html lang="en">
                     <head>
                         <meta charset="UTF-8">
                         <meta name="viewport" content="width=device-width, initial-scale=1.0">
                         <title>Robotframework AIO</title>
                         <style>
                             body {
                                 margin: 0;
                                 padding: 0;
                                 overflow: hidden;
                             }
                             iframe {
                                 width: 100%;
                                 height: 100vh;
                                 border: none;
                             }
                         </style>
                     </head>
                     <body>
                         <iframe src="${resolvedWelcomeUrl}"></iframe>
                     </body>
                     </html>`;
            } else {
                vscode.window.showErrorMessage('Invalid URL format for welcomeUrl.');
            }

            panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'openFileDialog':
                        await openFileDialog();
                        break;
                    case 'openFolderDialog':
                        await openFolderDialog(context);
                        break;
                    case 'changeWebview':
                        await loadWebviewContent(message, panel, context);
                        break;
                    default:
                        console.warn(`Unknown command: ${message.command}`);
                }
            });

            panel.onDidDispose(() => {
                // Update the configuration to mark that the welcome has been seen
                config.update('hasSeenWelcome', true, vscode.ConfigurationTarget.Global);
            }, null, context.subscriptions);
        });
        // Automatically show the welcome page on activation
        vscode.commands.executeCommand('extension.showRobotframeworkWelcome');

        context.subscriptions.push(disposable);
    }
}

async function openFileDialog() {
    const options = {
        canSelectMany: false,
        openLabel: 'Open',
        filters: {
            'Text files': ['txt'],
            'All files': ['*']
        }
    };

    const fileUri = await vscode.window.showOpenDialog(options);
    if (fileUri && fileUri[0]) {
        // Open the file as a text document
        const document = await vscode.workspace.openTextDocument(fileUri[0]);
         // Show the document in the editor
        await vscode.window.showTextDocument(document);
    }
}

async function openFolderDialog(context) {
    const folderUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Open Folder',
        canSelectFolders: true,
        canSelectFiles: false,
        title: 'Open Folder'
    });

    if (folderUri && folderUri[0]) {
        // This replaces the current workspace with the selected folder
        vscode.commands.executeCommand('vscode.openFolder', folderUri[0], false);
    }
}

async function loadWebviewContent(message, panel, context) {
    try {
        // Decode the URL
        let decodedUrl = decodeURIComponent(message.name);

        // Remove the prefix
        let filePath = decodedUrl.replace("https://file+.vscode-resource.vscode-cdn.net/", "");

        // Replace forward slashes with backslashes
        filePath = filePath.replace(/\//g, "\\");

        // Read the file asynchronously
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const assets = assetsManager.getAssets();

        // Replace assets and set the webview HTML
        panel.webview.html = assetsManager.replaceAssets(panel.webview, context, fileContent, assets);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to load asset: ${error.message}`);
    }
}

outputChannel.show();
module.exports = {
    activate
};
