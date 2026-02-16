# Code Editor - Multi-Tab Syntax Highlighting

A minimalist browser-based code editor with syntax highlighting and multiple tabs.

## Features

- Syntax highlighting for multiple languages (auto-detected by highlight.js)
- Dark/light mode toggle
- Line numbers that sync with scrolling
- Multiple tabs with custom names
- Tab key support (inserts 4 spaces)
- Add/close/rename tabs
- Clear all content option
- Auto-save to browser local storage
- No sign-up or server required

## Live Demo

Open `index.html` in your browser to start coding.

## Usage

Everything is stored locally in your browser's localStorage. Your code persists between sessions.

- Click the pencil icon (✎) on any tab to rename it
- Click the × to close a tab (can't close the last one)
- Use the + button to add new tabs
- Toggle theme with the ☀/🌙 button
- Clear all tabs and content with the 🗑 button

## Deployment

This is a static site - just serve the HTML files. Works with:
- GitHub Pages
- Railway
- Netlify
- Vercel
- Any static hosting

## Local Development

No build process needed. Just open `index.html` in a browser.

## Technologies

- Pure JavaScript (no frameworks)
- [highlight.js](https://highlightjs.org/) for syntax highlighting
- localStorage for persistence
