vscode-welcome - vscode extension
=================================

# Table of Contents

-   [Getting Started](#getting-started)
    -   [How to build](#how-to-build)
    -   [How to install](#how-to-install)
    -   [How to use](#how-to-use)
-   [Package Documentation](#package-documentation)
-   [Feedback](#feedback)
-   [Maintainers](#maintainers)
-   [Contributors](#contributors)
-   [License](#license)

# Getting Started
**VSCodeWelcome** is a VSCodium extension that enhances the user
experience by displaying a RobotFramework-AIO introduction for new
users.

## How to build

-   Clone the "RobotFramework_AIO_website" repository.

-   Run `build_vsix.sh` to build the extension.

## How to install

This extension is currently not available on [Visual Studio
Marketplace](https://marketplace.visualstudio.com/vscode) or [Open VSX
Registry](https://open-vsx.org/), so you can install it manually as
following steps:

-   Get the latest extension *vscode-welcome-x.x.x.vsix* file from this
    repo.
-   Open [Visual Studio Code](https://code.visualstudio.com/) or
    [VSCodium](https://vscodium.com/), select **Extensions** Tab then
    chose **Install from VSIX**
-   Browse to the downloaded *vscode-welcome-x.x.x.vsix* file then
    install.

As soon as the installation is completed, the welcome page will be
displayed for the newly installed RobotFramework-AIO.

## How to use

If you want to display a custom URL in the welcome page, follow these steps:

1. Look for the setting named `robotframeworkWelcome.welcomeUrl` in `settings.json` of vscode.
2. Enter the desired URL (e.g., `https://your-custom-url.com`) or a local file path (e.g., `path/to/file.html`) in the input field.
3. Save the settings.

The status bar (bottom-right) now includes a "Welcome" button, allowing you to easily reopen the redesigned welcome page at any time.

# Package Documentation

A detailed documentation of the **VSCodeWelcome** can be found here:
[VSCodeWelcome.pdf](https://github.com/test-fullautomation/vscode-welcome/blob/develop/VSCodeWelcome/VSCodeWelcome.pdf)

# Feedback

To give us a feedback, you can send an email to [Thomas
Pollerspöck](mailto:Thomas.Pollerspoeck@de.bosch.com)

In case you want to report a bug or request any interesting feature,
please don't hesitate to raise a ticket.

# Maintainers

[Thomas Pollerspöck](mailto:Thomas.Pollerspoeck@de.bosch.com)

[Mai Minh Tri](mailto:Tri.MaiMinh@vn.bosch.com)

# Contributors

[Mai Minh Tri](mailto:Tri.MaiMinh@vn.bosch.com)

# License

Copyright 2020-2023 Robert Bosch GmbH

Licensed under the Apache License, Version 2.0 (the "License"); you
may not use this file except in compliance with the License. You may
obtain a copy of the License at

> [![License: Apache
> v2](https://img.shields.io/pypi/l/robotframework.svg)](http://www.apache.org/licenses/LICENSE-2.0.html)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
