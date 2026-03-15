document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportBtn');
  const statusEl = document.getElementById('status');

  exportBtn.addEventListener('click', async () => {
    statusEl.textContent = 'Exporting...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Ensure extraction helpers exist in the page (isolated world).
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (typeof extractConversation !== 'function') {
            return { error: 'Extractor not available on this page.' };
          }

          const markdown = extractConversation();
          if (!markdown) {
            return { error: 'No conversation found to export.' };
          }

          const title = document.title || 'chatgpt-export';
          const base = title.replace(' - ChatGPT', '') || 'chatgpt-export';
          const filename = base.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';

          const blob = new Blob([markdown], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          setTimeout(() => URL.revokeObjectURL(url), 60_000);

          return { url, filename };
        }
      });

      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to extract conversation.');
      }

      await chrome.downloads.download({
        url: result.url,
        filename: result.filename,
        saveAs: false,
        conflictAction: 'uniquify'
      });
      
      statusEl.textContent = 'Export complete!';
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      const message = error && typeof error.message === 'string' && error.message.trim()
        ? error.message.trim()
        : 'Make sure you are on chatgpt.com';
      statusEl.textContent = `Error: ${message}`;
      console.error(error);
    }
  });
});
