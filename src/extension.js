const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const assetsManager = require('./assets_manager.js');
const outputChannel = vscode.window.createOutputChannel('Asset Manager');
import constants from './constants.js';

let isWelcomePageOpen = false;

function handleWelcomeUrl(context, config = vscode.workspace.getConfiguration('robotframeworkWelcome')) {
    try {
        //Use the default welcome URL if it is null or empty.
        let welcomeUrl = config.get('welcomeUrl', constants.DEFAULT_WELCOME_URL)?.trim() || constants.DEFAULT_WELCOME_URL;

        let resolvedWelcomeUrl = welcomeUrl.startsWith('http://') || welcomeUrl.startsWith('https://') || welcomeUrl.startsWith('file://')
            ? welcomeUrl
            : vscode.Uri.file(path.join(context.extensionPath, welcomeUrl)).toString();

        return resolvedWelcomeUrl
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error handling welcomeUrl: ${error.message}`);
    }
}

// Add a status bar button to toggle the welcome page
function createWelcomeButton() {
    const welcomeButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment, 100);
    welcomeButton.text = '$(home) Welcome';
    welcomeButton.tooltip = 'Reopen the Welcome Page';
    welcomeButton.command = 'extension.showRobotframeworkWelcome';
    welcomeButton.show();

    return welcomeButton;
}

function activate(context) {
    // Main entry point for the extension
    const config = vscode.workspace.getConfiguration('robotframeworkWelcome');
    const hasSeenWelcome = config.get('hasSeenWelcome', false);

    // Register a command to show the welcome page
    const showWelcomeCommand = vscode.commands.registerCommand('extension.showRobotframeworkWelcome', () => {
        if (!isWelcomePageOpen) {
            isWelcomePageOpen = true;
            showWelcomePage(context);
        }
    });

    // Add a status bar button to toggle the welcome page
    const welcomeButton = createWelcomeButton()

    // Add the button and command to the context subscriptions
    context.subscriptions.push(showWelcomeCommand, welcomeButton, vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('robotframeworkWelcome.welcomeUrl')) {
            // Update the webview with the new configuration
            const config = vscode.workspace.getConfiguration('robotframeworkWelcome');
            showWelcomePage(context, config);
        }
    }));

    if (!hasSeenWelcome) {
        vscode.commands.executeCommand('extension.showRobotframeworkWelcome');
        config.update('hasSeenWelcome', true, vscode.ConfigurationTarget.Global);
    }
}

function showWelcomePage(context, config = vscode.workspace.getConfiguration('robotframeworkWelcome')) {
    const resolvedWelcomeUrl = handleWelcomeUrl(context);
    const isRemoteUrl = resolvedWelcomeUrl.startsWith('http://') || resolvedWelcomeUrl.startsWith('https://');
    
    // Precompute the localResourceRoots based on resolvedWelcomeUrl
    const localResourceRoots = isRemoteUrl
        ? []
        : [vscode.Uri.file(path.dirname(vscode.Uri.parse(resolvedWelcomeUrl).fsPath))];

    const panel = vscode.window.createWebviewPanel(
        'robotframeworkWelcome',
        'Welcome to Robotframework AIO',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: localResourceRoots // Allow local file access
        }
    );

    if (isRemoteUrl) {
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
    }
    else {
        // Convert the file URI to a local file path
        const localFilePath = vscode.Uri.parse(resolvedWelcomeUrl).fsPath;
        // Check if the file exists
        if (fs.existsSync(localFilePath)) {
            // Read the file content and set it as the Webview's HTML
            const regexDefaultLocalPath = /test-fullautomation\.vscode-welcome-\d+\.\d+\.\d+\\assets\\index\.html\\?$/;
            const isDefaultWelcomePage = regexDefaultLocalPath.test(localFilePath)
            let assets = null

            if (isDefaultWelcomePage) {
                outputChannel.appendLine('Using the default welcome page from the extension assets.')
                assets = assetsManager.getAssets();
                outputChannel.appendLine(`Assets: ${assets.img}`)
            } else {
                outputChannel.appendLine('Using a custom welcome page from the user configuration.')
                config = vscode.workspace.getConfiguration('robotframeworkWelcome');
                assets = {
                    css: config.get('css', []),
                    js: config.get('js', []),
                    img: config.get('img', []),
                    html: config.get('html', [])
                }
                outputChannel.appendLine(`Assets: ${assets.img}`)
            }
            let fileContent = fs.readFileSync(localFilePath, 'utf8');
            panel.webview.html = assetsManager.replaceAssets(panel.webview, context, fileContent, assets, isDefaultWelcomePage);
        } else {
            vscode.window.showErrorMessage(`File not found: ${localFilePath}`);
        }
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
