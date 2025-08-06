const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
    const config = vscode.workspace.getConfiguration('robotframeworkWelcome');
    const hasSeenWelcome = config.get('hasSeenWelcome', false);
    const welcomeUrl = config.get('welcomeUrl', 'https://robotframework-aio.org/');

    if (!hasSeenWelcome) {
        let disposable = vscode.commands.registerCommand('extension.showRobotframeworkWelcome', () => {
            const panel = vscode.window.createWebviewPanel(
                'robotframeworkWelcome',
                'Welcome to Robotframework AIO',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: (welcomeUrl.startsWith('http://') || welcomeUrl.startsWith('https://'))
                        ? []
                        : [vscode.Uri.file(path.dirname(welcomeUrl))], // Allow local file access
                }
            );

            if (welcomeUrl.startsWith('file://')) {
                // Convert the file URI to a local file path
                const localFilePath = vscode.Uri.file(welcomeUrl.replace('file://', '')).fsPath;

                // Check if the file exists
                if (fs.existsSync(localFilePath)) {
                    // Read the file content and set it as the Webview's HTML
                    const fileContent = fs.readFileSync(localFilePath, 'utf8');
                    panel.webview.html = fileContent;
                } else {
                    vscode.window.showErrorMessage(`File not found: ${localFilePath}`);
                }
            } else if (welcomeUrl.startsWith('http://') || welcomeUrl.startsWith('https://')) {
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
                         <iframe src="${welcomeUrl}"></iframe>
                     </body>
                     </html>`;
            } else {
                vscode.window.showErrorMessage('Invalid URL format for welcomeUrl.');
            }

            panel.onDidDispose(() => {
                // Update the configuration to mark that the welcome has been seen
                config.update('hasSeenWelcome', true, vscode.ConfigurationTarget.Global);
            }, null, context.subscriptions);
        });

        vscode.commands.executeCommand('extension.showRobotframeworkWelcome');

        context.subscriptions.push(disposable);
    }
}

module.exports = {
    activate
};