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

// Handle "Don't show again" checkbox
document.addEventListener('DOMContentLoaded', function() {
   const checkbox = document.getElementById('dontShowAgain');

   if (checkbox) {
      // Request current state from extension
      vscode.postMessage({ command: 'getWelcomePagePreference' });

      checkbox.addEventListener('change', function() {
         vscode.postMessage({
            command: 'setWelcomePagePreference',
            dontShowAgain: checkbox.checked
         });
      });
   }
});

// Listen for messages from the extension
window.addEventListener('message', event => {
   const message = event.data;

   if (message.command === 'setCheckboxState') {
      const checkbox = document.getElementById('dontShowAgain');
      if (checkbox) {
         checkbox.checked = message.checked;
      }
   }

   if (message.command === 'libdoc_back') {
      console.log("doc-tab")
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max

      const intervalId = setInterval(() => {
         const docsTab = document.getElementById('documents-tab');

         if (docsTab) {
            console.log('Found documents tab:', docsTab);
            docsTab.click();
            clearInterval(intervalId);
         }
         else if (++attempts >= maxAttempts) {
            console.warn('documents-tab not found, stopping wait');
            clearInterval(intervalId);
         }
      }, 50);
   }
});
