const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const constants = require('./constants.js');
const configPath = path.join(__dirname, '..', 'assets', 'assets_config.json');

function getAssets() {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Assets configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const assets = JSON.parse(configContent);
    return assets;
}

function resolveWebviewPath(webview, htmlContent) {
    const baseDir = path.dirname(constants.CURRENT_HTML_CONTENT_PATH);

    constants.TAGS_TO_PROCESS.forEach(({ tag, attribute }) => {
        htmlContent = processTagAndPath(webview, baseDir, htmlContent, tag, attribute);
    });

    return htmlContent;
}

// Processes tags and paths in the HTML content
function processTagAndPath(webview, baseDir, htmlContent, tag, attribute) {
    const regex = new RegExp(`<${tag}[^>]*${attribute}=["']([^"']+)["'][^>]*>`, 'gi');

    return htmlContent.replace(regex, (match, originalPath) => {
        if (/^(https?:|data:)/.test(originalPath) || originalPath === "#") {
            return match; // Ignore absolute URLs or "#" links
        }

        const resourcePath = resolveResourcePath(baseDir, originalPath);
        if (resourcePath && fs.existsSync(resourcePath)) {
            const webviewUri = webview.asWebviewUri(vscode.Uri.file(resourcePath));
            return match.replace(originalPath, webviewUri.toString());
        } else {
            console.error(`Resource file not found: ${originalPath}`);
            return match;
        }
    });
}

// Resolves the resource path based on the original path or message.name
function resolveResourcePath(baseDir, originalPath) {
    if (originalPath.startsWith("vscode-welcome:")) {
        const assetFile = originalPath.replace("vscode-welcome:", "");
        return findFileInSubdirectories(constants.DEFAULT_ASSETS_PATH, assetFile);
    } else if (path.isAbsolute(originalPath)) {
        return originalPath; // If the path is already absolute, return it directly
    } else {
        return path.join(baseDir, originalPath); // Resolve relative paths
    }
}

// Finds a file in subdirectories dynamically, including support for message.name
function findFileInSubdirectories(baseDir, fileName) {
    try {
        const items = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const item of items) {
            const filePath = path.join(baseDir, item.name);
            if (item.isDirectory()) {
                const nestedFilePath = findFileInSubdirectories(filePath, fileName);
                if (nestedFilePath) {
                    return nestedFilePath; // Return the file path if found in subdirectories
                }
            } else if (item.isFile() && item.name === fileName) {
                return filePath; // Return the file path if it matches the file name
            }
        }
    } catch (error) {
        console.error(`Error reading directory: ${error.message}`);
    }
    return null;
}

module.exports = {
    getAssets,
    resolveWebviewPath,
    resolveResourcePath
};