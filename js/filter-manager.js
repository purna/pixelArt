// filter-manager.js
// Manages image filters using Lena.js

const FilterManager = {
    /**
     * Apply a filter to the current active layer
     */
    applyFilter(filterName) {
        if (!window.Lena) {
            alert('Lena.js library not loaded. Please check your internet connection.');
            return;
        }

        const layer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];

        // Create temporary canvas for filter application
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = State.width;
        tempCanvas.height = State.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Put current layer data onto temp canvas
        tempCtx.putImageData(layer.data, 0, 0);

        // Apply Lena.js filter
        window.Lena[filterName](tempCanvas, State.width, State.height);

        // Get filtered data back
        layer.data = tempCtx.getImageData(0, 0, State.width, State.height);

        // Re-render canvas
        CanvasManager.render();
        AnimationManager.updateTimelineThumb(State.currentFrameIndex);
    },

    /**
     * Initialize filter buttons
     */
    initFilters() {
        const filtersList = document.getElementById('filters-list');
        filtersList.innerHTML = '';

        // Common Lena.js filters
        const filters = [
            { name: 'grayscale', label: 'Grayscale' },
            { name: 'sepia', label: 'Sepia' },
            { name: 'invert', label: 'Invert' },
            { name: 'brightness', label: 'Brightness' },
            { name: 'contrast', label: 'Contrast' },
            { name: 'saturation', label: 'Saturation' },
            { name: 'hueRotate', label: 'Hue Rotate' },
            { name: 'threshold', label: 'Threshold' },
            { name: 'sharpen', label: 'Sharpen' },
            { name: 'blur', label: 'Blur' }
        ];

        filters.forEach(filter => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.style.width = '100%';
            button.textContent = filter.label;
            button.onclick = () => this.applyFilter(filter.name);
            filtersList.appendChild(button);
        });
    }
};