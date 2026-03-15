const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
    args[key] = value;
    if (value !== true) i++;
  }
  return args;
}

function readFileOrThrow(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function writeFileEnsuringDir(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function generateMarkdownFromHtml({ htmlPath, contentScriptPath }) {
  const html = readFileOrThrow(htmlPath);
  const contentScriptSource = readFileOrThrow(contentScriptPath);

  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const { window } = dom;

  window.__CHATGPT_EXPORTER_NO_AUTO_RUN__ = true;
  window.eval(contentScriptSource);

  if (typeof window.extractConversation !== 'function') {
    throw new Error('extractConversation() was not found after evaluating content.js');
  }

  const markdown = window.extractConversation();
  if (!markdown) {
    throw new Error('No markdown generated (extractConversation returned null/empty).');
  }

  return markdown;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(
      [
        'Usage: node scripts/generate-test-output.js [--html <path>] [--out <path>] [--content <path>]',
        '',
        'Defaults:',
        '  --html    ./chatgpt.html',
        '  --out     ./test-output.md',
        '  --content ./content.js',
        ''
      ].join('\n')
    );
    return;
  }

  const htmlPath = path.resolve(repoRoot, String(args.html || 'chatgpt.html'));
  const contentScriptPath = path.resolve(repoRoot, String(args.content || 'content.js'));
  const outputPath = path.resolve(repoRoot, String(args.out || 'test-output.md'));

  if (!fs.existsSync(htmlPath)) {
    throw new Error(
      [
        `Missing input HTML: ${htmlPath}`,
        'Tip: save a ChatGPT conversation page as HTML and pass it via --html, or place it at ./chatgpt.html.'
      ].join('\n')
    );
  }

  const markdown = generateMarkdownFromHtml({ htmlPath, contentScriptPath });
  writeFileEnsuringDir(outputPath, markdown.trimEnd() + '\n');

  process.stdout.write(`Wrote ${path.relative(repoRoot, outputPath)}\n`);
}

main();
