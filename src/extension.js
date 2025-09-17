const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const assetsManager = require('./assets_manager.js');
const outputChannel = vscode.window.createOutputChannel('Asset Manager');
let isWelcomePageOpen = false;

function activate(context) {
    const config = vscode.workspace.getConfiguration('robotframeworkWelcome');
    const hasSeenWelcome = config.get('hasSeenWelcome', false);
    const welcomeUrl = config.get('welcomeUrl', 'https://robotframework-aio.org/');

    // Register a command to show the welcome page
    const showWelcomeCommand = vscode.commands.registerCommand('extension.showRobotframeworkWelcome', () => {
        if (!isWelcomePageOpen) {
            isWelcomePageOpen = true;
            showWelcomePage(context, welcomeUrl);
        }
    });

    // Add a status bar button to toggle the welcome page
    const welcomeButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment, 100);
    welcomeButton.text = '$(home) Welcome';
    welcomeButton.tooltip = 'Reopen the Welcome Page';
    welcomeButton.command = 'extension.showRobotframeworkWelcome';
    welcomeButton.show();

    // Add the button and command to the context subscriptions
    context.subscriptions.push(showWelcomeCommand, welcomeButton);

    if (!hasSeenWelcome) {
        vscode.commands.executeCommand('extension.showRobotframeworkWelcome');
        config.update('hasSeenWelcome', true, vscode.ConfigurationTarget.Global);
    }
}

function showWelcomePage(context, welcomeUrl) {
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
            let fileContent = fs.readFileSync(localFilePath, 'utf8');
            fileContent = loadResources(fileContent)
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
            case 'openSelectedFolder':
                await openSelectedFolder(message);
                break;
            case 'openRobotTestWorkspace':
                await openRobotTestWorkspace();
                break;
            default:
                console.warn(`Unknown command: ${message.command}`);
        }
    });

    panel.onDidDispose(() => {
        // Update the configuration to mark that the welcome has been seen
        isWelcomePageOpen = false
        config.update('hasSeenWelcome', true, vscode.ConfigurationTarget.Global);
    }, null, context.subscriptions);
}

function loadResources(htmlContent) {
    // Replace environment variables in the HTML content
    let resources = ['ROBOTTESTPATH', 'ROBOTPYTHONPATH']

    resources.forEach(resource => {
        const value = process.env[resource];
        htmlContent = htmlContent.replaceAll(resource, value);
    });
    outputChannel.append(htmlContent)
    return htmlContent
}

async function openRobotTestWorkspace() {
    try {
        let workspacePath = process.env['ROBOTTESTPATH'];
        workspacePath = path.join(workspacePath, 'RobotTest.code-workspace');

        // Show a confirmation dialog
        const userChoice = await vscode.window.showInformationMessage(
            'Do you want to open the RobotTest workspace?',
            { modal: true }, // Makes the dialog modal
            'Yes',
            'No'
        );

        // Check the user's choice
        if (userChoice === 'Yes') {
            openSelectedFolder({ uri: workspacePath });
        } else {
            vscode.window.showInformationMessage('Operation canceled.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
}

async function openSelectedFolder(message) {
    try {
        const folderPath = vscode.Uri.file(message.uri)
        await vscode.commands.executeCommand('vscode.openFolder', folderPath, false);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open folder: ${error.message}`);
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
        let fileContent = await fs.promises.readFile(filePath, 'utf8');
        fileContent = loadResources(fileContent)
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
