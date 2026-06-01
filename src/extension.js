// Import required modules
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const assetsManager = require('./assets_manager.js');
const constants = require('./constants.js');

function handleWelcomeUrl(context, config = vscode.workspace.getConfiguration(constants.CONFIG_SECTION)) {
    try {
        //Use the default welcome URL if it is null or empty.
        let welcomeUrl = config.get('welcomeUrl', constants.DEFAULT_WELCOME_URL)?.trim() || constants.DEFAULT_WELCOME_URL;

        let resolvedWelcomeUrl = ""

        if (welcomeUrl.startsWith('http://') || welcomeUrl.startsWith('https://') || welcomeUrl.startsWith('file://')) {
            resolvedWelcomeUrl = welcomeUrl
        }
        else {
            resolvedWelcomeUrl = fs.existsSync(welcomeUrl)
                ? vscode.Uri.file(welcomeUrl).toString()
                : vscode.Uri.file(path.join(context.extensionPath, welcomeUrl)).toString();
        }
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
    welcomeButton.command = constants.WELCOME_BUTTON_COMMAND;
    welcomeButton.show();

    return welcomeButton;
}

function activate(context) {
    // Main entry point for the extension

    const config = vscode.workspace.getConfiguration(constants.CONFIG_SECTION);
    const hasSeenWelcome = config.get('hasSeenWelcome', false)

    if (!hasSeenWelcome) {
        constants.IS_WELCOME_PAGE_OPEN = true;
        showWelcomePage(context);
    }

    const showWelcomeCommand = vscode.commands.registerCommand(constants.WELCOME_BUTTON_COMMAND, () => {
        if (!constants.IS_WELCOME_PAGE_OPEN) {
            constants.IS_WELCOME_PAGE_OPEN = true;
            showWelcomePage(context);
        }
    });

    // Add a status bar button to toggle the welcome page
    const welcomeButton = createWelcomeButton();

    // Add the button and command to the context subscriptions
    context.subscriptions.push(showWelcomeCommand, welcomeButton, vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(`${constants.CONFIG_SECTION}.welcomeUrl`)) {
            // Update the webview with the new configuration
            const config = vscode.workspace.getConfiguration(constants.CONFIG_SECTION);
            showWelcomePage(context, config);
        }
    }));
}

function showWelcomePage(context, config = vscode.workspace.getConfiguration(constants.CONFIG_SECTION)) {
    const resolvedWelcomeUrl = handleWelcomeUrl(context);
    const isRemoteUrl = resolvedWelcomeUrl.startsWith('http://') || resolvedWelcomeUrl.startsWith('https://');

    // Precompute the localResourceRoots based on resolvedWelcomeUrl
    const localResourceRoots = isRemoteUrl
        ? []
        : [vscode.Uri.file(path.dirname(vscode.Uri.parse(resolvedWelcomeUrl).fsPath)), vscode.Uri.file(path.join(context.extensionPath, "assets"))];

    // Store the default assets path in constants
    constants.DEFAULT_ASSETS_PATH = path.join(context.extensionPath, "assets").toString();

    const panel = vscode.window.createWebviewPanel(
        constants.CONFIG_SECTION,
        constants.TITLE,
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
        constants.HISTORY_WEBVIEW.push(resolvedWelcomeUrl)
    }
    else {
        // Convert the file URI to a local file path
        const localFilePath = vscode.Uri.parse(resolvedWelcomeUrl).fsPath;
        // Store the current HTML content path in constants
        constants.CURRENT_HTML_CONTENT_PATH = localFilePath;
        constants.HISTORY_WEBVIEW.push(resolvedWelcomeUrl)
        // Check if the file exists
        if (fs.existsSync(localFilePath)) {
            let fileContent = fs.readFileSync(localFilePath, 'utf8');
            panel.webview.html = assetsManager.resolveWebviewPath(panel.webview, fileContent)
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
                await openFolderDialog();
                break;
            case 'changeWebview':
                await loadWebviewContent(message, panel);
                break;
            case 'openSelectedFolder':
                await openSelectedFolder(message);
                break;
            case 'openRobotTestWorkspace':
                await openRobotTestWorkspace();
                break;
            case 'setWelcomePagePreference':
                await setWelcomePagePreference(message.dontShowAgain);
                break;
            case 'getWelcomePagePreference':
                await getWelcomePagePreference(panel);
                break;
            case 'openSelectedFile':
                await openSelectedFile(message.file);
                break;
            default:
                console.warn(`Unknown command: ${message.command}`);
        }
    });

    panel.onDidDispose(() => {
        constants.IS_WELCOME_PAGE_OPEN = false;
        constants.LIBDOC_BACK = false
    }, null, context.subscriptions);
}

async function openSelectedFile(message) {
    if (message === 'Reference Documentation') {
        let testcasesDir = process.env.RobotTestPath;
        let documentationDir = testcasesDir.replace('testcases', 'documentation');
        try {
            // Read directory with promises
            const files = await fsp.readdir(vscode.Uri.parse(documentationDir).fsPath);
            // Filter for PDF files
            const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
            if (pdfFiles.length === 0) {
                console.error('No PDF files found in documentation directory.');
                return;
            }

            // Pick the first PDF file (or adjust if you want multiple)
            const pdfPath = path.join(documentationDir, pdfFiles[0]);
            constants.REFERENCE_DOCUMENT = pdfPath;

            // Open PDF using VS Code command
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(pdfPath));
        } catch (error) {
            console.error('Error opening PDF:', error);
        }
    }
}

async function setWelcomePagePreference(dontShowAgain) {
    try {
        const config = vscode.workspace.getConfiguration(constants.CONFIG_SECTION);
        await config.update('hasSeenWelcome', dontShowAgain, vscode.ConfigurationTarget.Global);

        if (dontShowAgain) {
            vscode.window.showInformationMessage('Welcome page will not be shown on startup. You can still access it from the status bar.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to save preference: ${error.message}`);
    }
}

async function getWelcomePagePreference(panel) {
    try {
        const config = vscode.workspace.getConfiguration(constants.CONFIG_SECTION);
        const hasSeenWelcome = config.get('hasSeenWelcome', false);

        panel.webview.postMessage({
            command: 'setCheckboxState',
            checked: hasSeenWelcome
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to get preference: ${error.message}`);
    }
}

async function openRobotTestWorkspace() {
    try {
        let workspacePath = process.env.RobotTestPath;
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
            if (vscode.workspace.name == 'RobotTest (Workspace)') {
                vscode.window.showInformationMessage('You are already in the RobotTest workspace.')
            }
            else {
                openSelectedFolder({ uri: workspacePath });
            }
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

function configureDefaultRobotTestcaseFolder() {
    try {
        if (vscode.workspace.workspaceFolders == undefined) {
            constants.DEFAULT_ROBOT_TESTCASE_FOLDER = process.env.RobotTestPath
        }
        else {
            workspaceFolder = path.normalize(vscode.workspace.workspaceFolders[0].uri.fsPath)
            let split = workspaceFolder.split(path.sep)
            if (split.length > 1 && (split[split.length-1] == 'documentation' && split[split.length-2] == 'RobotTest')) {
                constants.DEFAULT_ROBOT_TESTCASE_FOLDER = process.env.RobotTestPath
            }
            else {
                constants.DEFAULT_ROBOT_TESTCASE_FOLDER = vscode.workspace.workspaceFolders[0].uri.fsPath;
            }
        }
    }
    catch {
        constants.DEFAULT_ROBOT_TESTCASE_FOLDER = process.env.RobotTestPath
        return
    }
}

async function openFileDialog() {
    configureDefaultRobotTestcaseFolder()
    const options = {
        canSelectMany: false,
        openLabel: 'Open', 
        defaultUri: vscode.Uri.file(constants.DEFAULT_ROBOT_TESTCASE_FOLDER),
        filters: {
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

async function openFolderDialog() {
    configureDefaultRobotTestcaseFolder()
    const options = {
        canSelectMany: false,
        openLabel: 'Open Folder',
        defaultUri: vscode.Uri.file(constants.DEFAULT_ROBOT_TESTCASE_FOLDER),
        canSelectFolders: true,
        canSelectFiles: false,
        title: 'Open Folder'
    };

    const folderUri = await vscode.window.showOpenDialog(options);
    if (folderUri && folderUri[0]) {
        // This replaces the current workspace with the selected folder
        vscode.commands.executeCommand('vscode.openFolder', folderUri[0], false);
    }
}

async function loadWebviewContent(message, panel) {
    try {
        const baseDir = path.dirname(constants.CURRENT_HTML_CONTENT_PATH);
        let filePath = '';

        // Resolve the file path based on message.name
        if (message.name.startsWith("file://")) {
            filePath = vscode.Uri.parse(message.name).fsPath;
        }
        else {
            filePath = message.name.startsWith("vscode-welcome:")
            ? assetsManager.resolveResourcePath(baseDir, message.name)
            : path.resolve(baseDir, message.name);
        }

        // Update the current HTML content path
        constants.CURRENT_HTML_CONTENT_PATH = filePath;

        // Read the file content asynchronously
        let fileContent = await fs.promises.readFile(filePath, 'utf8');

        // Inject styles and scripts if it's a default welcome page with "libdoc-title"
        if (constants.REGEX_DEFAULT_FILE_PATH.test(filePath) && fileContent.includes("libdoc-title")) {
            constants.LIBDOC_BACK = true
            const styles = `
                <link href="vscode-welcome:styles.css" rel="stylesheet">
                <link href="vscode-welcome:libdoc_styles.css" rel="stylesheet">
            `;
            const scriptsAndButton = `
                <script src="vscode-welcome:script.js"></script>
                <button class="back-button" onclick="changeWebview('${constants.HISTORY_WEBVIEW.pop()}')">Back</button>
            `;
            fileContent = fileContent.replace('</head>', `${styles}\n</head>`);
            fileContent = fileContent.replace('<body>', `<body>\n${scriptsAndButton}\n`);
        }

        // Replace assets and set the webview HTML
        panel.webview.html = assetsManager.resolveWebviewPath(panel.webview, fileContent);
        if (constants.LIBDOC_BACK && constants.CURRENT_HTML_CONTENT_PATH.includes("index.html")) {
            constants.LIBDOC_BACK = false

            panel.webview.postMessage({
                command: 'libdoc_back',
            });
        }
        constants.HISTORY_WEBVIEW.push(message.name)
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to load asset: ${error.message}`);
    }
}

module.exports = {
    activate
};
