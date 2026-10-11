PROJECT: CLOUD9-STYLE WEB IDE WITH FULL LINUX TERMINAL 
PROJECT NAME: WEBCLI 

1. ROLE AND OBJECTIVE

You are a senior full-stack engineer, Linux systems engineer, DevOps engineer, and UI/UX designer.

Build a production-oriented web-based IDE inspired by the original AWS Cloud9 interface.

The application combines:

A real Linux web terminal.
A browser-based code editor.
A file explorer with directory tree.
A multi-tab editor workspace.
A terminal session manager.
A responsive, professional IDE interface.

The application must be fully functional, not a static prototype, mockup, or simulated terminal.

The primary objective is to provide a browser-based development environment where users can interact with a real Linux shell, execute commands, create and edit files, install packages, run development servers, and manage projects from a single browser window.

Use Cloud9 as the primary UX reference, but implement an original, maintainable codebase.

2. CORE PRINCIPLE: REAL TERMINAL, NOT SIMULATION

The terminal must execute commands on a real Linux environment.

Do not simulate terminal output in JavaScript.

Do not use a command allowlist as the primary terminal implementation.

Do not fake commands such as ls, cd, cat, mkdir, touch, nano, vim, git, python, node, npm, pip, apt, or sudo.

The application must support normal interactive shell behavior, including:

Command execution and output streaming.
Standard input, standard output, and standard error.
Interactive programs.
Shell history.
Command chaining, pipes, redirection, and environment variables.
Working directory changes that persist within the shell session.
Foreground and background processes.
Long-running commands.
Process interruption using Ctrl+C.
Terminal resizing.
ANSI colors and terminal escape sequences.
Interactive terminal applications such as vim, htop, and other compatible TUI programs.
Multiple independent terminal tabs and sessions.
Shell initialization files and user-specific environment configuration.

Use a real PTY (pseudo-terminal), not a simple subprocess that only returns command output.

Recommended terminal technology:

Frontend: xterm.js and its required addons.
Backend: a real PTY implementation such as node-pty, or an equivalent robust PTY library.
Transport: WebSocket.
Shell: Bash by default, with support for other installed shells where appropriate.

The frontend terminal must feel like a native Linux terminal running inside the browser.

3. SUDO AND PRIVILEGE MANAGEMENT

Support Linux privilege escalation using sudo when the underlying execution environment and account permissions permit it.

Requirements:

Support interactive sudo password prompts through the PTY.
Never hardcode sudo passwords.
Never store sudo passwords in browser storage, application logs, or plaintext configuration.
Preserve normal Linux permission checks and process ownership.
Clearly distinguish the application user, Linux execution user, and privileged processes.
Do not assume that sudo is available or enabled on every Linux image.
Detect and explain permission errors or unavailable sudo configurations.
Never bypass Linux security controls or silently escalate privileges.

The terminal should expose the capabilities of the configured Linux execution environment rather than pretending to have unrestricted host access.

If the application runs in Docker, explain which operations are available inside the container and which require explicit host-level configuration.

4. REQUIRED APPLICATION LAYOUT

Recreate the overall workflow and layout of the original AWS Cloud9 IDE.

Desktop layout:

+------------------------------------------------------------------+ | Top menu / Application toolbar | +------------------------------------------------------------------+ | Workspace tabs / Project selector | +----------------------+-------------------------------------------+ | | | | FILE EXPLORER | EDITOR WORKSPACE | | | | | Directory tree | Editor tabs | | File operations | Code editor | | Search files | Syntax highlighting | | | | | +-------------------------------------------+ | | TERMINAL PANEL | | | Terminal tabs | | | Real interactive Linux shell | +----------------------+-------------------------------------------+ | Status bar | +------------------------------------------------------------------+

Implement the following regions:

A. Top Navigation Bar

Include:

Application logo and name.
Current workspace or project name.
File and Edit menus.
View and Terminal menus.
Settings.
Theme selector.
User profile and logout.
Connection status.

Menu items must perform real actions. Do not create decorative buttons without functionality.

B. Left Sidebar: File Explorer

Create a collapsible sidebar with a hierarchical file tree.

Required features:

Display files and folders from the real workspace filesystem.
Expand and collapse directories.
Create files.
Create folders.
Rename files and folders.
Delete files and folders with confirmation.
Copy and paste files where practical.
Drag and drop file operations where practical.
Upload files.
Download files.
Refresh directory contents.
Show file icons based on file type.
Context menu on right-click.
Open files in the editor by clicking them.
Highlight the currently selected file.
Update the tree after filesystem changes.
Display hidden files, including dotfiles, with an option to toggle their visibility.

The file tree must reflect the actual filesystem used by the terminal.

For example, when a user executes:

mkdir my-project && touch my-project/index.js

the file explorer must show the new directory and file without requiring a page reload.

Likewise, files created, renamed, or deleted from the editor or terminal must be reflected in the file explorer.

C. Main Editor Workspace

Build a lightweight but capable code editor.

Prefer Monaco Editor, the editor engine used by VS Code, unless there is a strong compatibility reason to choose another editor.

Required features:

Multiple open files.
Editor tabs.
Syntax highlighting.
Line numbers.
Automatic indentation.
Bracket matching.
Basic code completion.
Find and replace.
Go to line.
Dirty-file indicator for unsaved changes.
Save with Ctrl+S or Cmd+S.
Close tabs.
Detect external file modifications.
Warn before discarding unsaved changes.
Display the file path.
Support common languages such as JavaScript, TypeScript, Python, Go, Rust, Java, C/C++, PHP, HTML, CSS, JSON, YAML, Markdown, Shell Script, and SQL.
Light and dark themes.
Configurable editor font size.
Word wrap toggle.

Opening a file from the file tree should open it in a new editor tab or activate its existing tab.

Saving a file must write the actual contents to the workspace filesystem. The terminal must immediately see those changes.

Avoid keeping editor contents only in frontend state.

D. Bottom Panel: Integrated Terminal

The terminal is the most important part of this application.

Use xterm.js on the frontend and a persistent PTY session on the backend.

Required features:

Multiple terminal tabs.
Create and close terminal sessions.
Persistent working directory per terminal session.
Interactive Bash shell.
Real-time input and output over WebSocket.
ANSI color support.
Keyboard shortcuts.
Ctrl+C, Ctrl+D, Ctrl+L, and other normal terminal key combinations.
Terminal resize support.
Scrollback buffer.
Copy and paste.
Full-screen terminal panel mode.
Adjustable terminal panel height using a draggable splitter.
Reconnect handling for temporary network disconnections.
Session cleanup when users log out or sessions expire.
Appropriate handling of terminal process exit codes.
Clear visual indicators for connected, disconnected, and terminated sessions.

The terminal must support commands such as:

pwd ls -la cd /workspace mkdir my-app touch app.py cat app.py vim app.py python3 app.py node app.js npm install git status sudo apt-get update

These are examples, not a command allowlist.

Actual command availability depends on the installed operating system, configured packages, network access, and user permissions.

Do not execute shell commands by concatenating untrusted input into a shell command string. Allocate a PTY and transmit terminal input and output through the terminal protocol.

E. Workspace Management

Support multiple workspaces or projects.

Each workspace should have:

A unique identifier.
A workspace name.
A root directory.
An owner or access-control policy.
A persistent filesystem.
Its own terminal working directory.
Workspace settings.

Users must be able to select a workspace and work with its corresponding files and terminal sessions.

Ensure that the terminal and file explorer operate on the same workspace.

Do not allow users to access arbitrary host filesystem paths simply by changing a URL or submitting a manipulated API request.

5. AUTHENTICATION AND USER MANAGEMENT

Implement a proper authentication system.

Required features:

Login page.
Logout.
Secure session management.
Password hashing using an appropriate password-hashing algorithm.
Authentication middleware for protected API endpoints.
WebSocket authentication.
Authorization checks for workspace and file access.
Secure session expiration.
Basic user profile management.

For the initial version, implement a simple registration or administrator-provisioned account flow.

Do not store plaintext passwords.

Never expose terminal sessions, files, or workspace identifiers across users without explicit authorization.

6. RECOMMENDED TECHNOLOGY STACK

Choose a coherent and compatible stack.

Suggested architecture:

Frontend:

React.
TypeScript.
Vite.
Tailwind CSS.
Monaco Editor.
xterm.js.
A lightweight state management solution.
A suitable icon library.
WebSocket client.

Backend:

Node.js.
TypeScript.
Express or Fastify.
WebSocket server.
node-pty or a suitable equivalent PTY implementation.
Filesystem APIs.
Authentication and authorization middleware.

Persistence:

SQLite for an initial single-server deployment, or PostgreSQL if justified.
Store user accounts, workspace metadata, and relevant application settings.
Store actual project files in the workspace filesystem rather than in the database.

Deployment:

Docker and Docker Compose.
Linux-based execution environment.
Persistent volumes for workspace data.
Reverse proxy with HTTPS support.

You may improve this architecture if a better option is justified, but document your decisions and keep the system maintainable.

7. BACKEND API AND REALTIME ARCHITECTURE

Design clear API boundaries.

Include endpoints or equivalent operations for:

Authentication.
Workspace listing and creation.
Workspace details.
File and directory listing.
Reading and writing files.
Creating, renaming, and deleting files.
Uploading and downloading files.
Terminal session creation.
Terminal session termination.
Terminal session resizing.
Workspace settings.

Use WebSockets for interactive terminal input and output.

Implement authorization at the backend, not just in the UI.

Implement robust error handling for:

Missing files.
Permission denied.
Invalid paths.
Filesystem errors.
Terminal process failures.
Disconnected WebSockets.
Expired authentication sessions.
Workspace access violations.

Add filesystem change notifications where appropriate so the UI can synchronize with changes made from the terminal.

Validate paths and enforce workspace-root boundaries for file operations. Resolve symbolic links safely and prevent path traversal.

Do not assume that lexical path normalization alone prevents symlink-based escapes.

8. SECURITY ARCHITECTURE

A web terminal provides access to a shell and must be treated as a remote code execution service.

Security is a mandatory architectural requirement.

Implement the following principles:

Run terminal processes inside an isolated Linux container or equivalent sandbox.
Do not run arbitrary user commands as the backend application's privileged host account.
Never mount the host root filesystem into a user workspace.
Never expose the Docker socket to the web application or user terminal.
Do not run the application container in privileged mode.
Apply CPU, memory, process-count, disk, and execution-resource limits where supported.
Use per-user or per-workspace isolation for multi-user deployments.
Use least-privilege permissions.
Apply authentication and authorization to every terminal and filesystem operation.
Validate WebSocket origins and authenticate WebSocket upgrades.
Protect against path traversal, symlink escapes, cross-workspace access, and unauthorized session attachment.
Do not expose secrets or environment variables belonging to other users.
Use HTTPS and secure session cookies in production.
Add rate limits to authentication and sensitive management endpoints.
Record relevant security events without logging terminal passwords, secrets, or sensitive command output.
Document the trust model and the limitations of the isolation boundary.

For a single-user development installation, provide a simple local setup.

For a multi-user or public-facing installation, enforce container isolation and separate execution identities.

Do not promise that arbitrary shell access is safe merely because the application uses authentication.

9. UI/UX DESIGN REQUIREMENTS

The interface should resemble the original AWS Cloud9 development workflow.

Design characteristics:

Professional developer-tool appearance.
Compact toolbar.
Dark IDE theme by default.
File tree on the left.
Main editor on the upper right.
Terminal panel on the lower right.
Adjustable panel sizes.
Resizable sidebar.
Multiple tabs.
Subtle borders and separators.
Clear active-tab indicators.
Consistent icons.
Minimal unnecessary whitespace.
Keyboard-first workflow.
Smooth but restrained transitions.
Responsive behavior for smaller screens.

The layout should be built using a resizable panel system or CSS grid with draggable splitters.

Persist user preferences such as theme, sidebar width, terminal height, and editor settings.

Suggested default layout:

Sidebar width: approximately 250 px.
Terminal height: approximately 35% of the main workspace.
Editor occupies the remaining vertical space.

These values should be adjustable by the user.

Do not use oversized dashboard cards or generic SaaS landing-page styling inside the IDE.

Prioritize the actual development workspace.

10. KEYBOARD SHORTCUTS

Implement appropriate shortcuts, including:

Ctrl+S / Cmd+S: Save current file.
Ctrl+P / Cmd+P: Quick file open.
Ctrl+Shift+F / Cmd+Shift+F: Search files.
Ctrl+ / Cmd+: Toggle terminal panel where practical.
Ctrl+W / Cmd+W: Close active editor tab, with unsaved-change protection.
Ctrl+Shift+T / Cmd+Shift+T: Create a new terminal tab.
F2: Rename selected file in the file explorer.
F5: Refresh the file tree.

Avoid browser shortcut conflicts where the browser prevents an application shortcut from working.

Provide a keyboard shortcut reference.

11. TESTING REQUIREMENTS

Write automated tests for important functionality.

Backend tests must cover:

Authentication.
Workspace authorization.
File operations.
Path traversal prevention.
Symlink escape prevention.
Terminal session lifecycle.
WebSocket authentication.
Workspace isolation.
Permission-denied errors.

Frontend tests should cover:

File tree rendering.
Editor tab behavior.
Saving files.
Unsaved changes.
Terminal connection state.
Workspace switching.

Include end-to-end tests for the most important user workflows.

At minimum, verify this scenario:

Log in.
Open a workspace.
Create a directory from the terminal.
Create a source file from the file explorer.
Open and edit the file.
Save it.
Read the saved file from the terminal.
Execute the file using the appropriate runtime.
Modify the file directly from the terminal.
Verify that the file explorer and editor handle the external modification correctly.
Open a second terminal and verify that it has an independent shell session.
Verify that an unauthorized user cannot access another user's workspace.

Do not mark tests as passing unless they have actually been executed.

12. PROJECT STRUCTURE AND CODE QUALITY

Use a clean, maintainable project structure.

Separate:

Frontend components.
Frontend state management.
Editor integration.
Terminal integration.
Authentication.
Workspace management.
Filesystem services.
PTY session management.
WebSocket handling.
API routes.
Security utilities.
Database models.
Tests.
Deployment configuration.

Use TypeScript types appropriately.

Avoid giant components, duplicated business logic, unnecessary abstractions, and hardcoded mock data.

Provide useful error messages and structured server-side logging.

Include configuration through environment variables and provide a .env.example without real secrets.

Pin compatible dependency versions and document native build requirements for the PTY dependency.

13. IMPLEMENTATION WORKFLOW

Work directly in the current project directory.

First inspect the existing repository, available runtime, operating system, and installed dependencies.

Then:

Summarize the existing project structure.
Propose a practical implementation plan.
Establish the frontend/backend architecture.
Implement the application in working increments.
Install the required dependencies.
Build the authentication flow.
Implement workspace and filesystem operations.
Implement the real PTY terminal and WebSocket communication.
Integrate Monaco Editor and xterm.js.
Build the Cloud9-style layout.
Implement synchronization between the terminal, editor, and file explorer.
Implement security boundaries.
Add Docker configuration and persistent workspace storage.
Run tests and production builds.
Fix actual errors before reporting completion.

Do not stop after creating a plan, generating a mockup, or scaffolding the project.

Continue implementing the application until the core end-to-end workflow works.

If a requirement cannot be completed, state the exact limitation and implement the best safe alternative.

Do not claim that a feature works without verifying it.

Prefer small, functional milestones over generating the entire application as one untested code dump.

14. DELIVERABLES

Produce a working application containing:

Complete frontend.
Complete backend.
Real interactive Linux terminal.
PTY and WebSocket integration.
Monaco-based text editor.
Live filesystem-backed file explorer.
Authentication.
Workspace management.
Secure execution environment.
Dockerfile and Docker Compose configuration.
Database initialization or migrations.
Automated tests.
.env.example.
README with architecture and setup instructions.
Local development instructions.
Production deployment instructions.
Security and sudo configuration documentation.
Troubleshooting instructions.

The README must explain how to install dependencies, start the application, create an account, open a workspace, and use the terminal.

Include exact commands for starting the application.

15. DEFINITION OF DONE

The project is complete only when:

The application starts successfully.
A user can log in.
The IDE layout works.
The file explorer reads the actual workspace filesystem.
The editor can open, modify, and save real files.
The terminal executes real commands through a PTY.
Interactive terminal applications work where supported.
Terminal sessions maintain their working directories.
Terminal and editor changes are reflected in the same filesystem.
Multiple terminal tabs work independently.
Permission errors and unavailable sudo are handled correctly.
Workspace access controls are enforced on the backend.
The execution environment has an explicit and documented security boundary.
The production frontend builds successfully.
Core automated tests run successfully.

Begin by inspecting the current repository and then implement the application. Do not create a static demo as a substitute for the requested functionality.
16. EXISTING PROJECT DISCOVERY, CLONING, AND REUSE

Before creating a new application from scratch, investigate whether an existing project can be reused or extended.

The goal is to minimize unnecessary implementation and maximize reuse of existing, working code.

A. Inspect the Current Environment

Inspect:

The current working directory.
Existing source code and directory structure.
Git repositories, branches, remotes, and recent commit history.
Existing package manifests and lockfiles.
Frameworks, runtime versions, and installed dependencies.
Existing UI components and design systems.
Existing authentication implementations.
Environment configuration files.
Database schemas and migrations.
Existing terminal, editor, filesystem, and workspace implementations.
Existing Dockerfiles and deployment configuration.

Do not assume the current directory is an empty project.

Do not overwrite an existing implementation before understanding it.

B. Find Suitable Existing Projects

If the current project is incomplete or unsuitable, investigate whether an existing open-source project can serve as the foundation.

Potential reference projects include:

Eclipse Theia.
OpenVSCode Server.
code-server.
Other actively maintained browser-based IDEs or web terminal projects.

Evaluate candidates based on:

Actual interactive terminal support.
Filesystem integration.
Code editor capabilities.
Workspace management.
Authentication extensibility.
Customizable UI and CSS.
Deployment complexity.
License compatibility.
Maintenance status and security posture.
Compatibility with the intended sudo and Linux execution model.

Do not choose a project merely because its UI looks similar. Verify its actual architecture and capabilities.

C. Clone and Extend Existing Projects

If a suitable project exists and its license permits the intended use:

Clone it into a separate directory or a dedicated Git worktree.
Inspect its README, architecture, dependencies, license, and configuration.
Install dependencies using the project's documented process.
Build and run the unmodified project first.
Identify which required features already work.
Identify missing functionality and customization points.
Implement the requested features on top of the existing codebase.
Preserve useful upstream changes and document local modifications.

Never blindly replace an existing repository or destroy user changes.

Do not delete .git, overwrite environment files, reset branches, force-push, or remove user data without explicit authorization.

If the existing project is already a suitable foundation, extend it instead of rebuilding equivalent functionality.

If the upstream project already provides a terminal, editor, or file explorer, reuse those components whenever practical rather than implementing duplicate subsystems.

If a candidate cannot be installed or run in the current environment, explain why and evaluate the next-best option.

D. Git and License Requirements
Prefer official repositories and verified upstream sources.
Inspect the actual repository URL before cloning.
Review the project's license and relevant dependency licenses.
Preserve required copyright and license notices.
Follow applicable attribution and source-distribution obligations.
Pin the selected version or commit for reproducibility.
Keep local customizations in clearly documented commits.
Do not copy proprietary source code or bypass access restrictions.
Do not assume that every open-source project permits every intended redistribution or commercial use.

Provide a short comparison of the best candidates before committing to a major architectural migration.

Once the best foundation has been selected, proceed with implementation instead of repeatedly asking for approval on routine development decisions.

17. VISUAL DESIGN REFERENCE: EXISTING CSS

Use this stylesheet as the primary visual design reference:

https://lab.xundefined.cc/assets/css/app.css

The target is to reproduce its visual design language as closely as reasonably possible while adapting it to the web IDE.

A. Inspect the Reference CSS Directly

Before implementing the UI:

Attempt to retrieve the stylesheet from the development environment.
Inspect the target URL using available HTTP tools or a browser.
If necessary, inspect the associated website's HTML, stylesheet imports, and other publicly accessible assets.
Identify the actual color palette, typography, CSS variables, background colors, borders, shadows, spacing scale, radii, and component styles.
Identify reusable patterns for buttons, inputs, tabs, menus, panels, dialogs, dropdowns, tooltips, and notifications.
Check whether the stylesheet depends on external fonts, icon libraries, CSS frameworks, or additional stylesheets.
Determine whether the CSS can legally and technically be reused or whether its visual design should be independently recreated.

Do not assume the reference uses Tailwind, Bootstrap, or any particular framework until verified.

Do not fabricate a description of the stylesheet if it cannot be retrieved.

If direct access fails, use the existing repository, browser inspection tools, or any locally available copy. If the original styling still cannot be inspected, report the limitation and implement a clearly documented approximation rather than claiming an exact reproduction.

B. Reuse and Extend the Existing Design System

If the stylesheet is accessible and its reuse is appropriate:

Preserve useful existing CSS variables and design tokens.
Reuse existing component classes where they are compatible.
Keep the original styling conventions wherever practical.
Add new styles through separate, clearly organized extension files.
Override only the necessary properties.
Avoid duplicating existing rules.
Avoid widespread !important declarations.
Do not replace the entire stylesheet just to implement a few additional components.

If the current application already has a design system, integrate the reference styles carefully rather than introducing conflicting frameworks.

Create an explicit design-token mapping when the existing CSS and new IDE components use different naming conventions.

C. Adapt the Design to the IDE

Apply the reference design language consistently to:

Login page.
Main application shell.
Top navigation.
File explorer.
File and folder icons.
Editor tabs.
Code editor container.
Terminal panel.
Terminal tabs.
Buttons and icon buttons.
Dropdown menus and context menus.
Dialogs and confirmation prompts.
Settings panels.
Status bar.
Notifications and error messages.
Loading, empty, and disconnected states.

The web IDE must look like one coherent product, not a collection of components copied from unrelated UI libraries.

Keep the Cloud9-style layout and interaction model, but use the specified stylesheet as the visual styling reference.

D. Additional IDE-Specific Styling

Where the reference CSS does not provide suitable IDE components, create additional styles that match its existing design language.

Pay particular attention to:

Compact developer-tool spacing.
Resizable split panels.
Clear panel separators.
Selected and hovered file-tree rows.
Active and inactive editor tabs.
Unsaved-file indicators.
Monospace typography for the editor and terminal.
Terminal ANSI colors that remain readable against the terminal background.
Keyboard focus indicators.
Accessible color contrast.
Scrollbars.
Drag-and-drop feedback.
Tooltips and contextual actions.
Responsive behavior.

Use design tokens for new colors, spacing, radii, borders, and typography rather than scattering unrelated hardcoded values throughout the codebase.

E. CSS Integration and Verification

After integrating the design:

Verify that the stylesheet loads successfully.
Verify all referenced assets and fonts.
Check for CSS conflicts with Monaco Editor and xterm.js.
Confirm that the terminal retains its required dimensions and behavior.
Verify that resizable panels work correctly.
Test both light and dark themes if both are supported.
Compare the resulting interface with the reference design.
Fix layout regressions and browser console errors.

Do not use a remote stylesheet as the sole production dependency if it can reasonably be bundled and maintained locally and the license permits that approach.

Document the origin of reused assets and styles.

18. AUTHENTICATION AND LOGIN MUST FOLLOW EXISTING CONFIGURATION

Authentication must be based on the configuration and authentication infrastructure already present in the project.

Do not automatically create a new login system if the project already has a working authentication mechanism.

A. Discover Existing Authentication Configuration

Before changing the login flow, inspect:

.env and .env.example.
Application configuration files.
Existing authentication middleware.
Login and logout routes.
Session and cookie configuration.
OAuth or OpenID Connect configuration, if present.
LDAP or other identity-provider configuration, if present.
Database user models and existing user tables.
Existing API authentication and authorization mechanisms.
Reverse proxy and trusted-header configuration.
Existing role and permission definitions.

Treat existing configuration as the source of truth for authentication behavior.

Support the authentication provider already configured by the project whenever possible.

B. Authentication Behavior

Implement the following rules:

If the project already has login and logout functionality, reuse it.
If an existing authentication provider is configured, integrate with that provider rather than creating a competing identity system.
If authentication is intentionally disabled in an existing local development configuration, preserve that behavior only for the explicitly configured local development environment.
If authentication settings are missing or invalid, fail clearly and securely rather than silently disabling authentication.
If the project has an existing user database, reuse its user model and session lifecycle where appropriate.
If the project has role-based access control, preserve and extend its existing permission model.
Do not create hardcoded administrator credentials.
Do not invent default passwords or silently create privileged accounts.
Do not expose credentials, tokens, or session secrets to the frontend.
Keep authentication and workspace authorization enforced on the backend.

Do not assume that a configuration file contains valid authentication settings simply because the file exists. Validate required values and handle missing settings explicitly.

C. Environment Configuration

Use the existing configuration conventions.

If new variables are genuinely required, add them to the appropriate configuration files and document them in .env.example.

Examples of configuration categories include:

Authentication provider.
Session secret.
Session expiration.
Cookie security settings.
OAuth issuer and client configuration, where applicable.
Workspace storage root.
Terminal execution image.
Terminal resource limits.
Public application URL.

These are examples, not mandatory new variables. Reuse existing settings whenever possible and avoid introducing duplicate configuration keys.

Never print secret values in logs or include actual secrets in generated documentation.

D. Authentication and Terminal Isolation

A successful web login must not automatically grant unrestricted host-level shell access.

For every terminal session:

Authenticate the user.
Verify workspace permissions.
Bind the terminal session to the authorized user and execution environment.
Verify authorization before allowing session attachment or reconnection.
Prevent one user from attaching to another user's terminal session.
Terminate or revoke sessions according to the configured logout and expiration policy.
Enforce workspace filesystem boundaries independently of frontend checks.

Keep application authentication, workspace authorization, Linux user identity, and sudo privileges as distinct security concepts.

E. Login UI

Customize the login page using the specified CSS reference and existing application components.

Do not change the underlying authentication protocol just to match the visual design.

Preserve:

Existing login fields and validation rules.
Existing redirects.
Existing session lifecycle.
Existing CSRF protections where applicable.
Existing identity-provider redirects.
Existing logout behavior.
Existing error handling.

The result should be visually integrated with the IDE without breaking the configured authentication system.

19. FINAL DECISION RULES

Use the following priority order when making implementation decisions:

Preserve existing user data and working functionality.
Reuse a suitable existing codebase when practical and license-compatible.
Preserve the project's configured authentication behavior.
Maintain a real PTY-backed Linux terminal.
Enforce filesystem, workspace, and execution isolation.
Reuse and adapt the specified CSS design system.
Add only the components and dependencies that are actually needed.
Verify functionality with real tests instead of relying on visual appearance.

Before reporting completion, document:

Whether an existing project was reused or a new one was created.
Which upstream repository and version were selected, if applicable.
Which existing authentication configuration was retained.
How the CSS reference was inspected and integrated.
Which components were reused and which were newly implemented.
Which security boundaries were established.
Which tests were executed and their actual results.
Any remaining limitations or manual setup requirements.

Continue with implementation until the required core workflows work. Do not stop after producing recommendations or a design plan.
