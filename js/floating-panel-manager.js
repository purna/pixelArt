// floating-panel-manager.js
// Manages floating panels like color history and brush controls

const FloatingPanelManager = {
    init() {
        this.initColorHistory();
        this.initBrushControls();
        this.initBrushAndOpacitySync();
        console.log('Floating Panel Manager initialized');
    },

    initColorHistory() {
        const historyOverlay = document.querySelector('.floating-color-history');
        if (historyOverlay) {
            this.makeDraggable(historyOverlay);
        }
    },

    initBrushControls() {
        const brushControlsOverlay = document.querySelector('.brush-controls-overlay');
        if (brushControlsOverlay) {
            this.makeDraggable(brushControlsOverlay);
        }
    },

    initBrushAndOpacitySync() {
        const floatingBrushSlider = document.getElementById('brushSizeSlider');
        const floatingBrushDisplay = document.getElementById('brushSizeDisplay');
        const floatingOpacitySlider = document.getElementById('opacitySlider');
        const floatingOpacityDisplay = document.getElementById('opacityDisplay');

        const mainBrushSlider = document.getElementById('brushSizeSlider');
        const mainBrushDisplay = document.getElementById('brushSizeDisplay');
        const mainOpacitySlider = document.getElementById('opacitySlider');
        const mainOpacityDisplay = document.getElementById('opacityDisplay');

        if (floatingBrushSlider && mainBrushSlider) {
            floatingBrushSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                mainBrushSlider.value = size;
                if (mainBrushDisplay) mainBrushDisplay.textContent = size;
                if (floatingBrushDisplay) floatingBrushDisplay.textContent = size;
                State.brushSize = size;
                this.updateBrushPresetButtons(size);
            });
        }

        if (floatingOpacitySlider && mainOpacitySlider) {
            floatingOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                mainOpacitySlider.value = value;
                if (mainOpacityDisplay) mainOpacityDisplay.textContent = value;
                if (floatingOpacityDisplay) floatingOpacityDisplay.textContent = value;
                State.opacity = value / 100;
                this.updateOpacityButtons(value);
            });
        }

        document.querySelectorAll('.floating-brush-presets .preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = parseInt(e.target.dataset.size);
                State.brushSize = size;
                if (mainBrushSlider) mainBrushSlider.value = size;
                if (mainBrushDisplay) mainBrushDisplay.textContent = size;
                if (floatingBrushSlider) floatingBrushSlider.value = size;
                if (floatingBrushDisplay) floatingBrushDisplay.textContent = size;
                this.updateBrushPresetButtons(size);
            });
        });

        document.querySelectorAll('.opacity-presets .preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const opacity = parseInt(e.target.dataset.opacity);
                State.opacity = opacity / 100;
                if (mainOpacitySlider) mainOpacitySlider.value = opacity;
                if (mainOpacityDisplay) mainOpacityDisplay.textContent = opacity;
                if (floatingOpacitySlider) floatingOpacitySlider.value = opacity;
                if (floatingOpacityDisplay) floatingOpacityDisplay.textContent = opacity;
                this.updateOpacityButtons(opacity);
            });
        });

        this.syncFromMainUI();
    },

    syncFromMainUI() {
        const floatingBrushSlider = document.getElementById('brushSizeSlider');
        const floatingBrushDisplay = document.getElementById('brushSizeDisplay');
        const floatingOpacitySlider = document.getElementById('opacitySlider');
        const floatingOpacityDisplay = document.getElementById('opacityDisplay');

        const mainBrushSlider = document.getElementById('brushSizeSlider');
        const mainBrushDisplay = document.getElementById('brushSizeDisplay');
        const mainOpacitySlider = document.getElementById('opacitySlider');
        const mainOpacityDisplay = document.getElementById('opacityDisplay');

        if (mainBrushSlider && floatingBrushSlider) {
            floatingBrushSlider.value = mainBrushSlider.value;
            if (floatingBrushDisplay) floatingBrushDisplay.textContent = mainBrushSlider.value;
        }

        if (mainOpacitySlider && floatingOpacitySlider) {
            floatingOpacitySlider.value = mainOpacitySlider.value;
            if (floatingOpacityDisplay) floatingOpacityDisplay.textContent = mainOpacitySlider.value;
        }

        this.updateBrushPresetButtons(State.brushSize);
        this.updateOpacityButtons(Math.floor(State.opacity * 100));
    },

    updateBrushPresetButtons(size) {
        document.querySelectorAll('.floating-brush-presets .preset-btn').forEach(btn => {
            const btnSize = parseInt(btn.dataset.size);
            if (btnSize === size) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    updateOpacityButtons(opacity) {
        document.querySelectorAll('.opacity-presets .preset-btn').forEach(btn => {
            const btnOpacity = parseInt(btn.dataset.opacity);
            if (btnOpacity === opacity) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    makeDraggable(element) {
        let isDragging = false;
        let offsetX, offsetY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('color-swatch') || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'BUTTON' ||
                e.target.closest('button')) {
                return;
            }

            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            element.style.left = x + 'px';
            element.style.top = y + 'px';
            element.style.transform = 'none';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.cursor = 'move';
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FloatingPanelManager };
}
