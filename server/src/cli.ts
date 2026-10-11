import readline from 'readline';
import crypto from 'crypto';
import { db } from './db.js';
import { hashPassword } from './auth.js';
import { WorkspaceService } from './services/workspace.service.js';

function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function createAccount(username?: string, email?: string, password?: string) {
  const rl = createPrompt();
  try {
    if (!username) {
      username = await ask(rl, 'Enter Username (3-30 chars): ');
    }
    if (!username || username.length < 3 || username.length > 30) {
      console.error('\x1b[31m[ERROR] Username must be between 3 and 30 characters.\x1b[0m');
      return;
    }

    if (!email) {
      email = await ask(rl, 'Enter Email: ');
    }
    if (!email || !email.includes('@')) {
      console.error('\x1b[31m[ERROR] A valid email address is required.\x1b[0m');
      return;
    }

    if (!password) {
      password = await ask(rl, 'Enter Password (min 6 chars): ');
    }
    if (!password || password.length < 6) {
      console.error('\x1b[31m[ERROR] Password must be at least 6 characters long.\x1b[0m');
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      console.error(`\x1b[31m[ERROR] A user with username "${username}" or email "${email}" already exists.\x1b[0m`);
      return;
    }

    const id = crypto.randomUUID();
    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(id, username, email, password_hash, 'user', now);

    // Auto-create initial default workspace (which seeds ./hello.sh)
    const defaultWs = WorkspaceService.createWorkspace(id, 'Default Workspace', 'Primary development workspace');

    console.log('\n\x1b[32m✔ Account created successfully!\x1b[0m');
    console.log(`  User ID:          ${id}`);
    console.log(`  Username:         ${username}`);
    console.log(`  Email:            ${email}`);
    console.log(`  Default Workspace: ${defaultWs.name} (${defaultWs.root_path})\n`);
  } finally {
    rl.close();
  }
}

export async function listAccounts() {
  const stmt = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.created_at, COUNT(w.id) as workspace_count
    FROM users u
    LEFT JOIN workspaces w ON u.id = w.user_id
    GROUP BY u.id
    ORDER BY u.created_at ASC
  `);
  const users = stmt.all() as any[];

  console.log('\n========================================================================================');
  console.log('                                 REGISTERED WEBCLI ACCOUNTS                             ');
  console.log('========================================================================================');
  if (users.length === 0) {
    console.log('  No user accounts found. Use option 1 to create an account.');
    console.log('========================================================================================\n');
    return;
  }

  console.log(
    `  ${'User ID'.padEnd(36)} | ${'Username'.padEnd(18)} | ${'Email'.padEnd(28)} | ${'Role'.padEnd(6)} | Workspaces`
  );
  console.log('  ' + '-'.repeat(36) + '-+-' + '-'.repeat(18) + '-+-' + '-'.repeat(28) + '-+-' + '-'.repeat(6) + '-+-----------');
  for (const u of users) {
    console.log(
      `  ${u.id.padEnd(36)} | ${u.username.padEnd(18)} | ${u.email.padEnd(28)} | ${u.role.padEnd(6)} | ${String(u.workspace_count).padStart(10)}`
    );
  }
  console.log('========================================================================================\n');
}

export async function resetPassword(username?: string, newPassword?: string) {
  const rl = createPrompt();
  try {
    if (!username) {
      username = await ask(rl, 'Enter Username to reset password: ');
    }
    if (!username) {
      console.error('\x1b[31m[ERROR] Username is required.\x1b[0m');
      return;
    }

    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      console.error(`\x1b[31m[ERROR] User "${username}" not found.\x1b[0m`);
      return;
    }

    if (!newPassword) {
      newPassword = await ask(rl, `Enter new password for "${user.username}" (min 6 chars): `);
    }
    if (!newPassword || newPassword.length < 6) {
      console.error('\x1b[31m[ERROR] Password must be at least 6 characters long.\x1b[0m');
      return;
    }

    const password_hash = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, user.id);

    console.log(`\n\x1b[32m✔ Password for user "${user.username}" has been successfully updated!\x1b[0m\n`);
  } finally {
    rl.close();
  }
}

export async function deleteAccount(username?: string) {
  const rl = createPrompt();
  try {
    if (!username) {
      username = await ask(rl, 'Enter Username to delete: ');
    }
    if (!username) {
      console.error('\x1b[31m[ERROR] Username is required.\x1b[0m');
      return;
    }

    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      console.error(`\x1b[31m[ERROR] User "${username}" not found.\x1b[0m`);
      return;
    }

    const confirm = await ask(
      rl,
      `\x1b[33mAre you sure you want to delete user "${user.username}" and all their files? (yes/no): \x1b[0m`
    );
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('Deletion cancelled.');
      return;
    }

    // Delete workspaces & workspace files
    const workspaces = WorkspaceService.getUserWorkspaces(user.id);
    for (const ws of workspaces) {
      WorkspaceService.deleteWorkspace(ws.id, user.id);
    }

    // Delete user from DB
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    console.log(`\n\x1b[32m✔ User "${user.username}" and all associated workspaces were deleted successfully.\x1b[0m\n`);
  } finally {
    rl.close();
  }
}

async function interactiveMenu() {
  while (true) {
    console.log('\n\x1b[35m============================================================\x1b[0m');
    console.log('\x1b[1m\x1b[35m                WEBCLI ACCOUNT MANAGEMENT                   \x1b[0m');
    console.log('\x1b[35m============================================================\x1b[0m');
    console.log('  1) Create account');
    console.log('  2) List account');
    console.log('  3) Reset Password');
    console.log('  4) Delete Account');
    console.log('  5) Exit');
    console.log('------------------------------------------------------------');

    const rl = createPrompt();
    const choice = await ask(rl, 'Select option [1-5]: ');
    rl.close();

    switch (choice) {
      case '1':
        await createAccount();
        break;
      case '2':
        await listAccounts();
        break;
      case '3':
        await resetPassword();
        break;
      case '4':
        await deleteAccount();
        break;
      case '5':
      case 'q':
      case 'exit':
        console.log('Exiting WebCLI Account Manager.');
        process.exit(0);
      default:
        console.log('\x1b[33mInvalid choice. Please select 1, 2, 3, 4, or 5.\x1b[0m');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  if (!command) {
    await interactiveMenu();
    return;
  }

  switch (command) {
    case 'create':
    case 'create-account':
    case '1':
      await createAccount(args[1], args[2], args[3]);
      break;
    case 'list':
    case 'list-account':
    case 'list-accounts':
    case '2':
      await listAccounts();
      break;
    case 'reset':
    case 'reset-password':
    case '3':
      await resetPassword(args[1], args[2]);
      break;
    case 'delete':
    case 'delete-account':
    case '4':
      await deleteAccount(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log('Usage: ./webcli.sh [command]');
      console.log('Commands:');
      console.log('  (no command)             Open interactive menu');
      console.log('  create [user] [email] [pwd]  Create a new user account');
      console.log('  list                     List all registered user accounts');
      console.log('  reset [user] [new_pwd]   Reset password for user');
      console.log('  delete [user]            Delete user account and workspaces');
      break;
    default:
      console.error(`\x1b[31mUnknown command: ${command}\x1b[0m`);
      console.log('Run ./webcli.sh --help for available commands or ./webcli.sh for interactive menu.');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err);
  process.exit(1);
});
