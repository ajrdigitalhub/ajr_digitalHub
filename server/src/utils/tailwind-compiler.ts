import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

export function compileTailwind(htmlContent: string, customCssContent: string): string {
  if (!htmlContent) return customCssContent || '';

  // Find directory containing package.json
  let current = __dirname;
  let rootDir = '';
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      rootDir = current;
      break;
    }
    current = path.dirname(current);
  }
  if (!rootDir) {
    rootDir = process.cwd();
  }

  // Create a local tmp folder in the project workspace
  const tmpDir = path.join(rootDir, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const id = randomUUID();
  const htmlPath = path.join(tmpDir, `tailwind-input-${id}.html`);
  const cssInputPath = path.join(tmpDir, `tailwind-input-${id}.css`);
  const cssOutputPath = path.join(tmpDir, `tailwind-output-${id}.css`);

  try {
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    // Convert Windows backslashes to forward slashes for Tailwind @source directive compatibility
    const normalizedHtmlPath = htmlPath.replace(/\\/g, '/');
    const inputCss = `@import "tailwindcss";\n@source "${normalizedHtmlPath}";\n${customCssContent || ''}`;
    fs.writeFileSync(cssInputPath, inputCss, 'utf8');

    const cliPath = path.join(rootDir, 'node_modules/@tailwindcss/cli/dist/index.mjs');
    let cmd = '';
    if (fs.existsSync(cliPath)) {
      cmd = `node "${cliPath}" -i "${cssInputPath}" -o "${cssOutputPath}" --minify`;
    } else {
      cmd = `npx @tailwindcss/cli -i "${cssInputPath}" -o "${cssOutputPath}" --minify`;
    }
    execSync(cmd, { cwd: rootDir, stdio: 'pipe' });

    if (fs.existsSync(cssOutputPath)) {
      return fs.readFileSync(cssOutputPath, 'utf8');
    }
    return customCssContent || '';
  } catch (err) {
    console.error('Tailwind Compilation failed:', err);
    return customCssContent || '';
  } finally {
    try { if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath); } catch {}
    try { if (fs.existsSync(cssInputPath)) fs.unlinkSync(cssInputPath); } catch {}
    try { if (fs.existsSync(cssOutputPath)) fs.unlinkSync(cssOutputPath); } catch {}
  }
}
