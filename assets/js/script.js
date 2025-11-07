const vscode = acquireVsCodeApi();

// Function to send a message to the extension
function openFileDialog() {
   vscode.postMessage({ command: 'openFileDialog' });
}

function openFolderDialog() {
   vscode.postMessage({ command: 'openFolderDialog' });
}

function changeWebview(webviewName) {
   document.body.classList.add('slide-out-left');
   setTimeout(() => {
      vscode.postMessage({ command: 'changeWebview', name: webviewName });
   }, 300);
}

function openSelectedFolder(uri) {
   vscode.postMessage({ command: 'openSelectedFolder', uri: uri });
}

function openRobotTestWorkspace() {
   vscode.postMessage({ command: 'openRobotTestWorkspace' });
}
