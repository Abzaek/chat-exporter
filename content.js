// content.js

function extractConversation() {
    const messages = document.querySelectorAll('[data-message-author-role]');
    if (messages.length === 0) {
        return null;
    }

    let markdown = '';
    // Optional: Extract title if available
    const titleEl = document.title;
    if (titleEl) {
        markdown += `# ${titleEl.replace(' - ChatGPT', '')}\n\n`;
    }

    messages.forEach(msg => {
        const role = msg.getAttribute('data-message-author-role');

        if (role === 'user') {
            const textContainer = msg.querySelector('.whitespace-pre-wrap');
            if (textContainer) {
                const userText = normalizeUserText(textContainer.textContent);
                markdown += `**User:**\n${userText}\n\n`;
            }
        } else if (role === 'assistant') {
            const contentContainer = msg.querySelector('.markdown.prose');
            if (contentContainer) {
                markdown += `**ChatGPT:**\n`;
                const assistantMd = cleanupMarkdown(parseHtmlToMarkdown(contentContainer)).trim();
                markdown += assistantMd + '\n\n';
            }
        }
    });

    return markdown;
}

function normalizeUserText(text) {
    return collapseInlineWhitespace(text).trim();
}

function cleanupMarkdown(markdown) {
    const text = String(markdown ?? '').replace(/\r\n/g, '\n');
    const lines = text.split('\n');

    let inFence = false;
    let fenceMarker = '';
    let consecutiveBlankLines = 0;

    const cleaned = [];

    for (const line of lines) {
        const fenceMatch = line.match(/^[ \t]{0,3}(`{3,})(.*)$/);
        if (fenceMatch) {
            const marker = fenceMatch[1];
            if (!inFence) {
                inFence = true;
                fenceMarker = marker;
                cleaned.push(line.replace(/[ \t]+$/g, ''));
                consecutiveBlankLines = 0;
                continue;
            }

            // Only treat this as a closing fence if it's at least as long as the opening.
            if (marker.length >= fenceMarker.length) {
                inFence = false;
                fenceMarker = '';
                cleaned.push(line.replace(/[ \t]+$/g, ''));
                consecutiveBlankLines = 0;
                continue;
            }
        }

        if (inFence) {
            cleaned.push(line);
            continue;
        }

        const withoutTrailingWhitespace = line.replace(/[ \t]+$/g, '');
        if (withoutTrailingWhitespace === '') {
            consecutiveBlankLines++;
            if (consecutiveBlankLines <= 2) cleaned.push('');
            continue;
        }

        consecutiveBlankLines = 0;
        cleaned.push(withoutTrailingWhitespace);
    }

    return cleaned.join('\n');
}

function trimLeadingWhitespacePerLine(text) {
    return String(text ?? '').replace(/\n[ \t]+/g, '\n');
}

function collapseInlineWhitespace(text) {
    return String(text ?? '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t\f\v]+/g, ' ')
        .replace(/\s+/g, ' ');
}

function renderInlineCode(codeText) {
    const text = String(codeText ?? '');
    const maxRun = Math.max(0, ...Array.from(text.matchAll(/`+/g), match => match[0].length));
    const fence = '`'.repeat(maxRun + 1);
    // If the code starts/ends with a backtick or space, pad to keep Markdown parsers happy.
    const needsPadding = text.startsWith('`') || text.endsWith('`') || text.startsWith(' ') || text.endsWith(' ');
    return needsPadding ? `${fence} ${text} ${fence}` : `${fence}${text}${fence}`;
}

function getCodeFence(codeText) {
    const text = String(codeText ?? '');
    const maxRun = Math.max(2, ...Array.from(text.matchAll(/`{3,}/g), match => match[0].length));
    return '`'.repeat(maxRun + 1);
}

function extractCodeBlockLanguage(preNode) {
    // ChatGPT code blocks often have a header div with a language label.
    const headerCandidates = preNode.querySelectorAll(':scope > div, :scope > header, :scope > span');
    for (const header of headerCandidates) {
        if (header.closest('code')) continue;
        const spans = header.querySelectorAll('span');
        for (const span of spans) {
            const text = span.textContent.trim();
            if (!text) continue;
            if (/^copy$/i.test(text) || /^copied$/i.test(text)) continue;
            if (text.length > 40) continue;
            return text;
        }
        const headerText = header.textContent.trim();
        if (headerText && headerText.length <= 40 && !/copy|copied/i.test(headerText)) {
            return headerText;
        }
    }
    return '';
}

function quoteMarkdown(markdown) {
    const trimmed = String(markdown ?? '').replace(/\s+$/g, '');
    if (!trimmed) return '';
    const lines = trimmed.split('\n');
    return lines.map(line => (line ? `> ${line}` : '>')).join('\n');
}

const BLOCK_TAGS = new Set([
    'p',
    'div',
    'section',
    'article',
    'header',
    'footer',
    'aside',
    'nav',
    'ul',
    'ol',
    'li',
    'pre',
    'blockquote',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr'
]);

function isBlockTag(tagName) {
    const tag = String(tagName ?? '').toLowerCase();
    return BLOCK_TAGS.has(tag);
}

function shouldKeepWhitespaceTextNodeAsSpace(textNode) {
    const prevSibling = textNode.previousSibling;
    const nextSibling = textNode.nextSibling;

    // Don't keep leading/trailing whitespace inside a container.
    if (!prevSibling || !nextSibling) return false;

    const prevIsBlock = prevSibling.nodeType === Node.ELEMENT_NODE && isBlockTag(prevSibling.tagName);
    const nextIsBlock = nextSibling.nodeType === Node.ELEMENT_NODE && isBlockTag(nextSibling.tagName);
    if (prevIsBlock || nextIsBlock) return false;

    return true;
}

function renderTextNode(textNode, context) {
    const rawText = String(textNode.textContent ?? '');
    if (context.inPre) {
        return rawText.replace(/\r\n/g, '\n');
    }

    const normalized = rawText.replace(/\u00a0/g, ' ');
    if (normalized.trim() === '') {
        return shouldKeepWhitespaceTextNodeAsSpace(textNode) ? ' ' : '';
    }
    return normalized.replace(/\s+/g, ' ');
}

function parseHtmlToMarkdown(node, context = {}) {
    if (!node) return '';

    const currentContext = {
        inPre: Boolean(context.inPre)
    };

    if (node.nodeType === Node.TEXT_NODE) {
        return renderTextNode(node, currentContext);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const tag = node.tagName.toLowerCase();

    switch (tag) {
        case 'p': {
            let content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext));
            content = trimLeadingWhitespacePerLine(content).trim();
            return content ? `${content}\n\n` : '';
        }
        case 'br':
            return '\n';
        case 'h1': {
            let content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext));
            content = trimLeadingWhitespacePerLine(content).trim();
            return content ? `# ${content}\n\n` : '';
        }
        case 'h2': {
            let content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext));
            content = trimLeadingWhitespacePerLine(content).trim();
            return content ? `## ${content}\n\n` : '';
        }
        case 'h3': {
            let content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext));
            content = trimLeadingWhitespacePerLine(content).trim();
            return content ? `### ${content}\n\n` : '';
        }
        case 'h4': {
            let content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext));
            content = trimLeadingWhitespacePerLine(content).trim();
            return content ? `#### ${content}\n\n` : '';
        }
        case 'h5': {
            let content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext));
            content = trimLeadingWhitespacePerLine(content).trim();
            return content ? `##### ${content}\n\n` : '';
        }
        case 'h6': {
            let content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext));
            content = trimLeadingWhitespacePerLine(content).trim();
            return content ? `###### ${content}\n\n` : '';
        }
        case 'strong':
        case 'b': {
            const content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext)).trim();
            return content ? `**${content}**` : '';
        }
        case 'em':
        case 'i': {
            const content = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext)).trim();
            return content ? `*${content}*` : '';
        }
        case 'a': {
            const href = node.getAttribute('href') || '';
            const label = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext)).trim() || href;
            return href ? `[${label}](${href})` : label;
        }
        case 'ul':
            return `${parseList(node, false)}\n\n`;
        case 'ol':
            return `${parseList(node, true)}\n\n`;
        case 'code': {
            // Code inside a pre should be handled by the pre renderer.
            if (node.closest('pre')) return '';
            const codeText = node.textContent ?? '';
            return renderInlineCode(codeText);
        }
        case 'pre': {
            const codeEl = node.querySelector('code');
            const codeText = codeEl ? codeEl.textContent : node.textContent;
            const language = extractCodeBlockLanguage(node);
            const fence = getCodeFence(codeText);
            const langSuffix = language ? language : '';
            const normalizedCode = String(codeText ?? '').replace(/\r\n/g, '\n').replace(/\n$/, '');
            return `${fence}${langSuffix ? langSuffix : ''}\n${normalizedCode}\n${fence}\n\n`;
        }
        case 'blockquote': {
            const inner = cleanupMarkdown(parseChildrenToMarkdown(node, currentContext)).trim();
            const quoted = quoteMarkdown(inner);
            return quoted ? `${quoted}\n\n` : '';
        }
        case 'hr':
            return '---\n\n';
        case 'img': {
            const alt = node.getAttribute('alt') || '';
            const src = node.getAttribute('src') || '';
            return src ? `![${alt}](${src})` : '';
        }
        case 'button':
        case 'svg':
        case 'path':
            return '';
        default:
            return parseChildrenToMarkdown(node, currentContext);
    }
}

function parseChildrenToMarkdown(element, context) {
    let md = '';
    for (const childNode of element.childNodes) {
        md += parseHtmlToMarkdown(childNode, context);
    }
    return md;
}

function parseList(listNode, isOrdered) {
    let listMd = '';
    let index = 1;
    const items = Array.from(listNode.children).filter(child => child.tagName && child.tagName.toLowerCase() === 'li');

    for (const li of items) {
        const prefix = isOrdered ? `${index}. ` : '- ';
        let itemMd = cleanupMarkdown(parseChildrenToMarkdown(li, { inPre: false })).trim();
        itemMd = itemMd.replace(/\n/g, '\n  ');
        listMd += `${prefix}${itemMd}\n`;
        index++;
    }
    return listMd.trimEnd();
}

function downloadMarkdown(markdown) {
    if (!markdown) return;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    let filename = 'chatgpt-export.md';
    const titleEl = document.title;
    if (titleEl) {
        // sanitize filename
        filename = titleEl.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

// Intentionally no auto-run here.
// The extension popup triggers extraction and download via the Downloads API,
// which avoids the browser blocking repeated programmatic downloads on SPAs.
