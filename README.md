# ChatGPT to Markdown Exporter

A seamless Chrome extension to export your ChatGPT conversations into clean, readable Markdown (`.md`) files. 

## The Problem

If you use Large Language Models (LLMs) frequently, you've likely run into this frustrating cycle:
1. **Hitting Limits:** You're in the middle of deep work and suddenly hit the ChatGPT message cap. To continue, you are forced to switch to Gemini, Claude, or another model.
2. **Context Loss:** Switching models means you lose all the context you've meticulously built up.
3. **The "Getting Dumb" Effect:** Even without hitting limits, sometimes an LLM loses the plot deep into a long chat, and starting fresh with the current context on another model is the best way to move forward.
4. **Link Blindness:** You can't just send a new LLM the link to your ChatGPT conversation because they natively limit accessing external links or require special scraping tools.

**The result?** You end up manually copy-pasting your chat history or completely re-feeding the context.

## The Solution

This extension solves this problem by generating a completely formatted `.md` file of your current conversation instantly. Since Markdown is highly readable and extremely token-efficient for language models, you can simply upload the generated `.md` file straight into Gemini, Claude, or another ChatGPT instance to instantly resume your workflow with **zero context loss**.

## Features

- ⚡️ **1-Click Export:** Instantly downloads the active ChatGPT conversation as a `.md` file.
- 🧹 **Clean Formatting:** Persists headings, code blocks (with language tags intact), bolding, lists, and quotes beautifully. 
- 🔒 **Privacy First:** All parsing is done locally in your browser. No data is sent to external servers.

## Installation

You can install this extension locally manually:

1. Clone or download this repository.
2. Open Chrome/Edge/Brave and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing this repository.
5. Pin the extension to your toolbar, navigate to a ChatGPT conversation, and export!

## Usage

1. Open your desired conversation on [chatgpt.com](https://chatgpt.com).
2. Click the ChatGPT Exporter extension icon in your browser toolbar.
3. Click **"Export as Markdown"**.
4. The Markdown file will be downloaded to your machine automatically, ready to feed into any LLM!

## Future Expansion & Contributing 🤝

This tool was built to solve a personal pain point, but the potential for expansion is huge. Some ideas for the future:
- Exporting to other formats (PDF, JSON, HTML).
- Supporting exports from other platforms (e.g., exporting from Claude or Gemini).
- Selective export (e.g., ticking checkboxes to only export certain parts of a long conversation).
- Injecting system prompts into the exported `.md` automatically.

**Contributions are highly encouraged!** Whether it's fixing a bug, adding a new feature, or improving the parsing logic, feel free to open an issue or submit a Pull Request.

### How to Contribute

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
[MIT License](LICENSE)
