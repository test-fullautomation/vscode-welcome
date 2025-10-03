const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const configPath = path.join(__dirname, '..', 'assets', 'assets_config.json');

function getAssets() {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Assets configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const assets = JSON.parse(configContent);
    return assets;
}

/**
 * Replaces asset placeholders in the HTML content with actual paths.
 * @param {string} htmlContent - The HTML content.
 * @param {Object} assets - The object containing asset paths.
 * @returns {string} - The updated HTML content.
 */

function replaceAssets(webview, context, htmlContent, assets, defaultAssets = true) {
    let resources = {};

    Object.keys(assets).forEach((key) => {
        const assetList = assets[key];
        if (Array.isArray(assetList) && assetList.length > 0) {
            assetList.forEach((asset) => {
                try {
                    // Split the asset path into parts
                    const splitParts = asset.split('/');
                    const placeholder = splitParts[splitParts.length - 1];
                    let resourcePath = asset;

                    if (defaultAssets) {
                        resourcePath = path.join(context.extensionPath, ...splitParts);
                    }

                    if (!fs.existsSync(resourcePath)) {
                        throw new Error(`Resource file not found: ${placeholder}`);
                    }

                    const assetPath = webview.asWebviewUri(vscode.Uri.file(resourcePath));
                    htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), assetPath.toString());
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to load asset: ${error.message}`);
                }
            });
        }
    });

    return htmlContent;
}

module.exports = {
    getAssets,
    replaceAssets
};