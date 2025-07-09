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
                robotframeworkIcoUri: getResourceUri(panel.webview, 'images', 'RobotFramework_AIO.ico')
            }

            // Load nav and footer
            const navContent = loadContent('navigation', 'html', resourceUris);
            const footerContent = loadContent('footer', 'html', resourceUris);

            htmlContent = htmlContent
                .replace(/<nav([^>]*)>([\s\S]*?)<\/nav>/, `<nav$1>${navContent}</nav>`)
                .replace(/<footer([^>]*)>([\s\S]*?)<\/footer>/, `<footer$1>${footerContent}</footer>`);

            // Load content from html/content
            const sectionFolder = path.join('html', 'contents');
            const sections = ["background", "features", "downloads", "usage", "documentation", "about", "contribution"];
            for (const section of sections) {
                if (section == "contribution") {
                    htmlContent = htmlContent.replaceAll('contribution.html', 'https://robotframework-aio.org/contribution.html');
                    htmlContent = htmlContent.replaceAll('<i class="fas fa-thumbs-up"></i>', '');
                    htmlContent = htmlContent.replaceAll('<i class="fab fa-github"></i>', '');
                    continue;
                }
                const sectionContent = loadContent(section, sectionFolder, resourceUris);
                let modifiedStr = section.charAt(0).toUpperCase() + section.slice(1);
                if (section == "about") {
                    modifiedStr += " Us"
                }
                htmlContent = htmlContent.replaceAll(`<section id="${section}"></section>`, `<section id="${section}">${sectionContent}</section>`);
                htmlContent = htmlContent.replaceAll(`<a class="nav-link" href="index.html#${section}" data-target="#${section}">${modifiedStr}</a>`, `<a class="nav-link" href="#${section}" data-section="${section}">${modifiedStr}</a>`);
            }

            htmlContent = htmlContent
                .replaceAll('./css/styles.css', resourceUris.styleUri)
                .replaceAll('./images/AIO_package.png', resourceUris.packageUri)
                .replaceAll('./images/puzzle.png', resourceUris.puzzleUri)
                .replaceAll('./images/VSCodium-workspace.png', resourceUris.vscodiumWorkspaceUri)
                .replaceAll('./images/tsm.png', resourceUris.tsmUri)
                .replaceAll('./images/Dashboard.png', resourceUris.dashboardUri)
                .replaceAll('./images/Tutorial.gif', resourceUris.tutorialGifUri)
                .replaceAll('./images/Windows-logo.png', resourceUris.windowsLogoUri)
                .replaceAll('./images/Linux-logo.png', resourceUris.linuxLogoUri)
                .replaceAll('./images/RobotFramework_AIO.ico', resourceUris.robotframeworkIcoUri)
                .replaceAll('./js/scripts.js', resourceUris.scriptsJsUri)
                .replace(
                    /<link[^>]*href=["'](.*?\.css)["'][^>]*>/g,
                    (match, url) => {
                        if (url.includes('bootstrap')) return `<link href="${resourceUris.bootstrapUri}" rel="stylesheet">`;
                        if (url.includes('font-awesome') || url.includes('all.min')) return `<link href="${resourceUris.allminUri}" rel="stylesheet">`;
                        if (url.includes('prism')) return `<link href="${resourceUris.prismUri}" rel="stylesheet">`;
                        return match; // Return unchanged if no match
                    }
                );

            // Set the webview content
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