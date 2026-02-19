const API_URL = window.location.origin + '/api';

document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById('codeEditor');
    const highlightedCode = document.querySelector('#highlighted-code code');
    const lineNumbers = document.getElementById('line-numbers');
    const tabsContainer = document.getElementById('tabs');
    const addTabBtn = document.getElementById('add-tab');
    const clearAllBtn = document.getElementById('clear-all');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Sync elements
    const syncBtn = document.getElementById('sync-btn');
    const syncModal = document.getElementById('sync-modal');
    const closeModal = document.querySelector('.close');
    const loginForm = document.getElementById('login-form');
    const loggedInDiv = document.getElementById('logged-in');
    const usernameInput = document.getElementById('username');
    const pinInput = document.getElementById('pin');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const syncNowBtn = document.getElementById('sync-now-btn');
    const syncStatus = document.getElementById('sync-status');
    const currentUserSpan = document.getElementById('current-user');
    
    let currentCanvas = localStorage.getItem('currentCodeCanvas') || '1';
    let tabsList = JSON.parse(localStorage.getItem('tabsList')) || ['1'];
    let isDarkMode = localStorage.getItem('isDarkMode') !== 'false';
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let autoSyncInterval = null;

    function updateLineNumbers() {
        const lines = codeEditor.value.split('\n').length;
        lineNumbers.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\n');
    }

    function updateHighlight() {
        const code = codeEditor.value;
        highlightedCode.textContent = code;
        highlightedCode.removeAttribute('data-highlighted');
        highlightedCode.className = 'hljs';
        
        if (typeof hljs !== 'undefined') {
            const result = hljs.highlightAuto(code);
            highlightedCode.innerHTML = result.value;
        } else {
            console.error('highlight.js not loaded');
        }
        
        updateLineNumbers();
    }

    function showStatus(message, isError = false) {
        syncStatus.textContent = message;
        syncStatus.className = 'sync-status ' + (isError ? 'error' : 'success');
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 3000);
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
                    if (currentUser) autoSync();
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
        if (currentUser) autoSync();
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
        
        if (currentUser) {
            fetch(`${API_URL}/tabs/${currentUser.id}/${canvasId}`, { method: 'DELETE' })
                .catch(err => console.error('Delete sync error:', err));
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
        
        if (currentUser) {
            fetch(`${API_URL}/tabs/${currentUser.id}`, { method: 'DELETE' })
                .catch(err => console.error('Clear sync error:', err));
        }
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

    // Sync functions
    async function register() {
        const username = usernameInput.value.trim();
        const pin = pinInput.value;

        if (!username || username.length < 4 || username.length > 16) {
            showStatus('Username must be 4-16 characters', true);
            return;
        }

        if (!pin || pin.length < 4 || pin.length > 16) {
            showStatus('PIN must be 4-16 characters', true);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, pin })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showStatus('Account created successfully!');
                updateSyncUI();
                await syncToServer();
            } else {
                showStatus(data.error || 'Registration failed', true);
            }
        } catch (err) {
            showStatus('Connection error', true);
            console.error('Register error:', err);
        }
    }

    async function login() {
        const username = usernameInput.value.trim();
        const pin = pinInput.value;

        if (!username || !pin) {
            showStatus('Please enter username and PIN', true);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, pin })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showStatus('Logged in successfully!');
                updateSyncUI();
                await syncFromServer();
            } else {
                showStatus(data.error || 'Login failed', true);
            }
        } catch (err) {
            showStatus('Connection error', true);
            console.error('Login error:', err);
        }
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('currentUser');
        if (autoSyncInterval) {
            clearInterval(autoSyncInterval);
            autoSyncInterval = null;
        }
        updateSyncUI();
        showStatus('Logged out');
        syncBtn.classList.remove('synced');
    }

    async function syncToServer() {
        if (!currentUser) return;

        try {
            const promises = tabsList.map(tabId => {
                const content = localStorage.getItem(`code_canvas_${tabId}`) || '';
                const tabName = localStorage.getItem(`tab_name_${tabId}`) || '';
                
                return fetch(`${API_URL}/tabs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        tabId,
                        tabName,
                        content
                    })
                });
            });

            await Promise.all(promises);
            syncBtn.classList.add('synced');
            console.log('Synced to server');
        } catch (err) {
            console.error('Sync to server error:', err);
        }
    }

    async function syncFromServer() {
        if (!currentUser) return;

        try {
            const response = await fetch(`${API_URL}/tabs/${currentUser.id}`);
            const data = await response.json();

            if (response.ok && data.tabs.length > 0) {
                // Clear local storage
                tabsList.forEach(id => {
                    localStorage.removeItem(`code_canvas_${id}`);
                    localStorage.removeItem(`tab_name_${id}`);
                });

                // Load from server
                tabsList = data.tabs.map(tab => tab.tab_id);
                data.tabs.forEach(tab => {
                    localStorage.setItem(`code_canvas_${tab.tab_id}`, tab.content || '');
                    localStorage.setItem(`tab_name_${tab.tab_id}`, tab.tab_name || '');
                });

                localStorage.setItem('tabsList', JSON.stringify(tabsList));
                currentCanvas = tabsList[0];
                localStorage.setItem('currentCodeCanvas', currentCanvas);

                renderTabs();
                loadCanvas(currentCanvas);
                showStatus('Synced from server!');
                syncBtn.classList.add('synced');
            } else {
                // No data on server, push local data
                await syncToServer();
            }
        } catch (err) {
            showStatus('Sync error', true);
            console.error('Sync from server error:', err);
        }
    }

    function autoSync() {
        if (currentUser) {
            syncToServer();
        }
    }

    function updateSyncUI() {
        if (currentUser) {
            loginForm.style.display = 'none';
            loggedInDiv.style.display = 'block';
            currentUserSpan.textContent = currentUser.username;
            syncBtn.title = `Synced as ${currentUser.username}`;
            
            // Start auto-sync every 30 seconds
            if (!autoSyncInterval) {
                autoSyncInterval = setInterval(autoSync, 30000);
            }
        } else {
            loginForm.style.display = 'block';
            loggedInDiv.style.display = 'none';
            syncBtn.title = 'Sync across devices';
        }
    }

    // Initialize theme
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    themeToggle.textContent = isDarkMode ? '☀' : '🌙';

    renderTabs();
    loadCanvas(currentCanvas);
    updateSyncUI();

    // Event listeners
    codeEditor.addEventListener('input', () => {
        localStorage.setItem(`code_canvas_${currentCanvas}`, codeEditor.value);
        updateHighlight();
        if (currentUser) {
            // Debounced auto-sync
            clearTimeout(window.syncTimeout);
            window.syncTimeout = setTimeout(autoSync, 2000);
        }
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
    
    // Sync modal
    syncBtn.addEventListener('click', () => {
        syncModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        syncModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === syncModal) {
            syncModal.style.display = 'none';
        }
    });

    loginBtn.addEventListener('click', login);
    registerBtn.addEventListener('click', register);
    logoutBtn.addEventListener('click', logout);
    syncNowBtn.addEventListener('click', async () => {
        await syncFromServer();
    });

    // Handle Enter key in inputs
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
});
