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
                }
            );

            // Set the HTML content of the webview
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
                </html>
            `;
        });

        vscode.commands.executeCommand('extension.showRobotframeworkWelcome');

        context.subscriptions.push(disposable);
    }
}

module.exports = {
    activate
};