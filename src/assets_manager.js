const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const configPath = path.join(__dirname, '..', 'assets', 'assets_config.json');
const outputChannel = vscode.window.createOutputChannel('Asset Manager');
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

function replaceAssets(webview, context, htmlContent, assets, isDefaultAssets = true) {
    let resources = {};

    Object.keys(assets).forEach((key) => {
        const assetList = assets[key];
        if (Array.isArray(assetList) && assetList.length > 0) {
            for (let i = 0; i < assetList.length; i++) {
                try {
                    let asset = assetList[i];
                    if (asset.toUpperCase() === "DEFAULT") {
                        let defaultAssetsList = getAssets();
                        assetList.splice(i, 1); // Remove the "DEFAULT" asset
                        i--; // Adjust the index to account for the removed element

                        defaultAssetsList[key] = defaultAssetsList[key].map(defaultAsset => {
                            const splitParts = defaultAsset.split('/');
                            const updatedAsset = path.join(context.extensionPath, ...splitParts);
                            assetList.push(updatedAsset); // Add new assets to the list
                            return updatedAsset;
                        });

                        continue; // Skip the rest of the loop for this iteration
                    }

                    // Split the asset path into parts
                    const splitParts = asset.split(/[/\\]/);
                    const placeholder = splitParts[splitParts.length - 1];
                    let resourcePath = asset;
                    outputChannel.append(`Placeholder: ${placeholder}\n`);

                    if (isDefaultAssets) {
                        resourcePath = path.join(context.extensionPath, ...splitParts);
                    }

                    if (!fs.existsSync(resourcePath)) {
                        throw new Error(`Resource file not found: ${placeholder}`);
                    }

                    const assetPath = webview.asWebviewUri(vscode.Uri.file(resourcePath));
                    outputChannel.append(`Resource: ${assetPath}\n`);
                    htmlContent = htmlContent.replace(new RegExp(`\\b${placeholder}\\b`, 'g'), assetPath.toString());
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to load asset: ${error.message}`);
                }
            }
        }
    });
    return htmlContent;
}
outputChannel.show()
module.exports = {
    getAssets,
    replaceAssets
};