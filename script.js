document.addEventListener('DOMContentLoaded', () => {
    const typingCanvas = document.getElementById('typingCanvas');
    const tabs = document.querySelectorAll('.tab');
    let currentCanvas = localStorage.getItem('currentCanvas') || '1';

    function loadCanvas(canvasId) {
        typingCanvas.value = localStorage.getItem(`canvas_${canvasId}`) || '';
        currentCanvas = canvasId;
        localStorage.setItem('currentCanvas', canvasId);
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.canvas === canvasId);
        });
        
        typingCanvas.focus();
    }

    loadCanvas(currentCanvas);

    typingCanvas.addEventListener('input', () => {
        localStorage.setItem(`canvas_${currentCanvas}`, typingCanvas.value);
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            loadCanvas(tab.dataset.canvas);
        });
    });
});

