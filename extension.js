const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
    const config = vscode.workspace.getConfiguration('robotframeworkWelcome');
    const hasSeenWelcome = config.get('hasSeenWelcome', false);

    // Function to get Webview URI for resources (images, CSS, etc.)
    function getResourceUri(webview, folder, fileName) {
        try {
            const resourcePath = path.join(context.extensionPath, folder, fileName);
            if (!fs.existsSync(resourcePath)) {
                throw new Error(`Resource file not found: ${fileName}`);
            }
            return webview.asWebviewUri(vscode.Uri.file(resourcePath));
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load ${folder}/${fileName}: ${error.message}`);
            return '';
        }
    }

    // Function to load content from html/content/<section>.html
    function loadContent(content, folder, resourceUris) {
        try {
            const contentPath = path.join(context.extensionPath, folder, `${content}.html`);
            let contentData = fs.existsSync(contentPath) ? fs.readFileSync(contentPath, 'utf8') : `<p>Content for ${content} not found.</p>`;

            return contentData;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load ${folder}/${content}.html: ${error.message}`);
            return `<p>Error loading ${content} content.</p>`;
        }
    }

    if (!hasSeenWelcome) {
        let disposable = vscode.commands.registerCommand('extension.showRobotframeworkWelcome', () => {
            const panel = vscode.window.createWebviewPanel(
                'robotframeworkWelcome',
                'Welcome to Robotframework AIO',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            const htmlPath = path.join(context.extensionPath, 'index.html');
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');

            const resourceUris = {
                // Get CSS resources
                bootstrapUri: getResourceUri(panel.webview, 'css', "bootstrap.min.css"),
                styleUri: getResourceUri(panel.webview, 'css', "styles.css"),
                allminUri: getResourceUri(panel.webview, 'css', "all.min.css"),
                prismUri: getResourceUri(panel.webview, 'css', "prism-tomorrow.min.css"),

                // Load images
                packageUri: getResourceUri(panel.webview, 'images', 'AIO_package.png'),
                puzzleUri: getResourceUri(panel.webview, 'images', 'puzzle.png'),
                vscodiumWorkspaceUri: getResourceUri(panel.webview, 'images', 'VSCodium-workspace.png'),
                tsmUri: getResourceUri(panel.webview, 'images', 'tsm.png'),
                dashboardUri: getResourceUri(panel.webview, 'images', 'Dashboard.png'),
                windowsLogoUri: getResourceUri(panel.webview, 'images', 'Windows-logo.png'),
                linuxLogoUri: getResourceUri(panel.webview, 'images', 'Linux-logo.png'),
                tutorialGifUri: getResourceUri(panel.webview, 'images', 'Tutorial.gif'),
                robotframeworkIcoUri: getResourceUri(panel.webview, 'images', 'RobotFramework_AIO.ico'),

                // Load js resources
                jqueryJsUri: getResourceUri(panel.webview, 'js', 'jquery-3.6.0.min.js'),
                popperJsUri: getResourceUri(panel.webview, 'js', 'popper.min.js'),
                bootstrapJsUri: getResourceUri(panel.webview, 'js', 'bootstrap.min.js'),
                prismJsUri: getResourceUri(panel.webview, 'js', 'prism.min.js'),
                prismBashJsUri: getResourceUri(panel.webview, 'js', 'prism-bash.min.js'),
                scriptsJsUri: getResourceUri(panel.webview, 'js', 'scripts.js'),
            }

            // Load nav and footer
            const navContent = loadContent('navigation', 'html', resourceUris);
            const footerContent = loadContent('footer', 'html', resourceUris);

            htmlContent = htmlContent
                .replace('{{navContent}}', navContent)
                .replace('{{footerContent}}', footerContent)

            // Load content from html/content
            const sectionFolder = path.join('html', 'contents');
            const sections = ['background', 'features', 'downloads', 'usage', 'documentation', 'about'];
            for (const section of sections) {
                const sectionContent = loadContent(section, sectionFolder, resourceUris);
                htmlContent = htmlContent.replaceAll(`{{sectionContent:${section}}}`, sectionContent);
            }

            htmlContent = htmlContent
                .replaceAll('{{bootstrapUri}}', resourceUris.bootstrapUri)
                .replaceAll('{{allminUri}}', resourceUris.allminUri)
                .replaceAll('{{prismUri}}', resourceUris.prismUri)
                .replaceAll('{{styleUri}}', resourceUris.styleUri)
                .replaceAll('{{packageUri}}', resourceUris.packageUri)
                .replaceAll('{{puzzleUri}}', resourceUris.puzzleUri)
                .replaceAll('{{vscodiumWorkspaceUri}}', resourceUris.vscodiumWorkspaceUri)
                .replaceAll('{{tsmUri}}', resourceUris.tsmUri)
                .replaceAll('{{dashboardUri}}', resourceUris.dashboardUri)
                .replaceAll('{{tutorialGifUri}}', resourceUris.tutorialGifUri)
                .replaceAll('{{windowsLogoUri}}', resourceUris.windowsLogoUri)
                .replaceAll('{{linuxLogoUri}}', resourceUris.linuxLogoUri)
                .replaceAll('{{robotframeworkIcoUri}}', resourceUris.robotframeworkIcoUri)
                .replaceAll('{{jqueryJsUri}}', resourceUris.jqueryJsUri)
                .replaceAll('{{popperJsUri}}', resourceUris.popperJsUri)
                .replaceAll('{{bootstrapJsUri}}', resourceUris.bootstrapJsUri)
                .replaceAll('{{prismJsUri}}', resourceUris.prismJsUri)
                .replaceAll('{{prismBashJsUri}}', resourceUris.prismBashJsUri)
                .replaceAll('{{scriptsJsUri}}', resourceUris.scriptsJsUri);

            panel.webview.html = htmlContent;

            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'openExtensions':
                            vscode.commands.executeCommand('workbench.view.extensions');
                            break;
                        case 'openSettings':
                            vscode.commands.executeCommand('workbench.action.openSettings');
                            break;
                        case 'closeWebview':
                            panel.dispose();
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );

            panel.onDidDispose(() => {
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