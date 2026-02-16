document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById('codeEditor');
    const highlightedCode = document.querySelector('#highlighted-code code');
    const lineNumbers = document.getElementById('line-numbers');
    const tabsContainer = document.getElementById('tabs');
    const addTabBtn = document.getElementById('add-tab');
    const clearAllBtn = document.getElementById('clear-all');
    const themeToggle = document.getElementById('theme-toggle');
    
    let currentCanvas = localStorage.getItem('currentCodeCanvas') || '1';
    let tabsList = JSON.parse(localStorage.getItem('tabsList')) || ['1'];
    let isDarkMode = localStorage.getItem('isDarkMode') !== 'false';

    function updateLineNumbers() {
        const lines = codeEditor.value.split('\n').length;
        lineNumbers.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\n');
    }

    function updateHighlight() {
        const code = codeEditor.value;
        highlightedCode.textContent = code;
        highlightedCode.removeAttribute('data-highlighted');
        highlightedCode.className = 'hljs';
        
        // Force highlight.js to process the code
        if (typeof hljs !== 'undefined') {
            const result = hljs.highlightAuto(code);
            highlightedCode.innerHTML = result.value;
        } else {
            console.error('highlight.js not loaded');
        }
        
        updateLineNumbers();
    }

    function createTab(canvasId) {
        const tab = document.createElement('button');
        tab.className = 'tab';
        tab.dataset.canvas = canvasId;
        
        const tabName = document.createElement('span');
        tabName.className = 'tab-name';
        tabName.textContent = localStorage.getItem(`tab_name_${canvasId}`) || '';
        
        const tabEdit = document.createElement('span');
        tabEdit.className = 'tab-edit';
        tabEdit.title = 'Rename tab';
        tabEdit.textContent = '✎';
        
        const tabClose = document.createElement('span');
        tabClose.className = 'tab-close';
        tabClose.title = 'Close tab';
        tabClose.textContent = '×';
        
        tab.appendChild(tabName);
        tab.appendChild(tabEdit);
        if (tabsList.length > 1) {
            tab.appendChild(tabClose);
        }
        
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-edit')) {
                e.stopPropagation();
                const newName = prompt('Enter tab name:', tabName.textContent);
                if (newName !== null) {
                    tabName.textContent = newName.trim();
                    localStorage.setItem(`tab_name_${canvasId}`, newName.trim());
                }
            } else if (e.target.classList.contains('tab-close')) {
                e.stopPropagation();
                removeTab(canvasId);
            } else {
                loadCanvas(canvasId);
            }
        });
        
        return tab;
    }

    function renderTabs() {
        tabsContainer.innerHTML = '';
        tabsList.forEach(canvasId => {
            const tab = createTab(canvasId);
            if (canvasId === currentCanvas) {
                tab.classList.add('active');
            }
            tabsContainer.appendChild(tab);
        });
    }

    function addTab() {
        const newId = String(Math.max(...tabsList.map(id => parseInt(id) || 0)) + 1);
        tabsList.push(newId);
        localStorage.setItem('tabsList', JSON.stringify(tabsList));
        renderTabs();
        loadCanvas(newId);
    }

    function removeTab(canvasId) {
        if (tabsList.length === 1) return;
        
        tabsList = tabsList.filter(id => id !== canvasId);
        localStorage.setItem('tabsList', JSON.stringify(tabsList));
        localStorage.removeItem(`code_canvas_${canvasId}`);
        localStorage.removeItem(`tab_name_${canvasId}`);
        
        if (currentCanvas === canvasId) {
            loadCanvas(tabsList[0]);
        } else {
            renderTabs();
        }
    }

    function clearAll() {
        if (!confirm('Clear all tabs and content? This cannot be undone.')) return;
        
        tabsList.forEach(id => {
            localStorage.removeItem(`code_canvas_${id}`);
            localStorage.removeItem(`tab_name_${id}`);
        });
        
        tabsList = ['1'];
        currentCanvas = '1';
        localStorage.setItem('tabsList', JSON.stringify(tabsList));
        localStorage.setItem('currentCodeCanvas', currentCanvas);
        
        renderTabs();
        loadCanvas(currentCanvas);
    }

    function loadCanvas(canvasId) {
        codeEditor.value = localStorage.getItem(`code_canvas_${canvasId}`) || '';
        currentCanvas = canvasId;
        localStorage.setItem('currentCodeCanvas', canvasId);
        renderTabs();
        updateHighlight();
        codeEditor.focus();
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.body.classList.toggle('light-mode', !isDarkMode);
        themeToggle.textContent = isDarkMode ? '☀' : '🌙';
        localStorage.setItem('isDarkMode', isDarkMode);
        updateHighlight();
    }

    // Initialize theme
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    themeToggle.textContent = isDarkMode ? '☀' : '🌙';

    renderTabs();
    loadCanvas(currentCanvas);

    codeEditor.addEventListener('input', () => {
        localStorage.setItem(`code_canvas_${currentCanvas}`, codeEditor.value);
        updateHighlight();
    });

    codeEditor.addEventListener('scroll', () => {
        highlightedCode.parentElement.scrollTop = codeEditor.scrollTop;
        highlightedCode.parentElement.scrollLeft = codeEditor.scrollLeft;
        lineNumbers.scrollTop = codeEditor.scrollTop;
    });

    codeEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
            localStorage.setItem(`code_canvas_${currentCanvas}`, codeEditor.value);
            updateHighlight();
        }
    });

    addTabBtn.addEventListener('click', addTab);
    clearAllBtn.addEventListener('click', clearAll);
    themeToggle.addEventListener('click', toggleTheme);
});
