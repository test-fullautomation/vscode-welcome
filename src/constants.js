module.exports = {
   DEFAULT_WELCOME_URL: "./assets/index.html/",
   REGEX_DEFAULT_FILE_PATH: /test-fullautomation\.vscode-welcome-\d+\.\d+\.\d+[\\/]+assets[\\/]+.*$/,
   TAGS_TO_PROCESS: [
      { tag: 'a', attribute: 'href' },
      { tag: 'script', attribute: 'src' },
      { tag: 'link', attribute: 'href' },
      { tag: 'img', attribute: 'src' }
  ],
  CURRENT_HTML_CONTENT_PATH: "",
  DEFAULT_ASSETS_PATH: "",
  IS_WELCOME_PAGE_OPEN: true,
  CONFIG_SECTION: "robotframeworkWelcome",
  TITLE: "Welcome to Robotframework AIO",
  WELCOME_BUTTON_COMMAND: "extension.showRobotframeworkWelcome",
  HISTORY_WEBVIEW: []
};