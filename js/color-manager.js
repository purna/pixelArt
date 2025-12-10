// color-manager.js modifications

const ColorManager = {

    /**
     * Initialize color history overlay
     */
    initColorHistory() {
        // Create color history overlay if it doesn't exist
        const historyOverlay = document.querySelector('.floating-color-history');
        if (historyOverlay) {
            // Add event listeners to color swatches
            const swatches = historyOverlay.querySelectorAll('.color-swatch');
            swatches.forEach((swatch, index) => {
                swatch.addEventListener('click', () => {
                    if (State.recentColors[index]) {
                        this.setColor(State.recentColors[index]);
                        this.updateColorHistoryDisplay();
                    }
                });
            });

            // Initialize display
            this.updateColorHistoryDisplay();
        }
    },

    /**
     * Update the color history display
     */
    updateColorHistoryDisplay() {
        const swatches = document.querySelectorAll('.color-history-swatches .color-swatch');
        if (!swatches.length) return;

        swatches.forEach((swatch, index) => {
            if (State.recentColors[index]) {
                swatch.style.backgroundColor = State.recentColors[index];
                swatch.title = `Recent Color ${index + 1} (Press ${index + 1}) - ${State.recentColors[index]}`;
            } else {
                swatch.style.backgroundColor = 'transparent';
                swatch.style.border = '2px dashed var(--border-color)';
                swatch.title = `Empty slot ${index + 1}`;
            }

            // Mark active color
            if (State.color && State.recentColors[index] === State.color) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
        });
    },
    
    /**
     * Add color to history/palette when a color is used.
     */
    addToHistory(hex) {
        // Ensure color is at the top of the palette/history and render
        if (!State.currentPalette.includes(hex)) {
            State.currentPalette.unshift(hex);
        }
        // Move to the front if it already exists (like history)
        const index = State.currentPalette.indexOf(hex);
        if (index > 0) {
            State.currentPalette.splice(index, 1);
            State.currentPalette.unshift(hex);
        }

        // Update recent colors (keep only last 4)
        const colorIndex = State.recentColors.indexOf(hex);
        if (colorIndex > -1) {
            // Move existing color to front
            State.recentColors.splice(colorIndex, 1);
        }
        State.recentColors.unshift(hex);
        // Keep only last 4 colors
        if (State.recentColors.length > 4) {
            State.recentColors = State.recentColors.slice(0, 4);
        }

        // Update color history display
        this.updateColorHistoryDisplay();

        this.render();
    },

    /**
     * Set current color
     */
    setColor(hex) {
        State.color = hex;
        UI.colorPicker.value = hex;
        UI.colorHex.textContent = hex;
        this.render(); // Re-render to update the 'active' highlight
    },
    
    /**
     * NEW: Save current color to the active palette.
     */
    saveColorToPalette(hex) {
        // User requested to save to current one.
        if (State.currentPalette.includes(hex)) {
            alert('Color is already in the palette!');
            return;
        }

        State.currentPalette.push(hex);
        this.render();
        alert(`Color ${hex} saved to the current palette!`);
    },

    /**
     * NEW: Parse a Coolors URL and import the colors.
     * Example URL: https://coolors.co/daffed-9bf3f0-473198-4a0d67-adfc92
     */
    importPaletteFromUrl(url) {
        // 1. Validate and extract the color segment
        const coolorsRegex = /(?:coolors\.co\/)([a-fA-F0-9]{6}(?:-[a-fA-F0-9]{6})+)/;
        const match = url.match(coolorsRegex);

        if (!match) {
            alert('Invalid Coolors URL format. Please ensure it follows the pattern: https://coolors.co/HEX1-HEX2-HEX3...');
            return;
        }

        // The second group (index 1) contains the hyphen-separated colors
        const colorSegment = match[1];
        
        // 2. Split and format colors
        const hexCodes = colorSegment.split('-').map(hex => '#' + hex.toUpperCase());
        
        // 3. Import the palette
        this.importPalette(hexCodes);
    },

    /**
     * NEW: Replace current palette with new colors (from .ase import)
     */
    importPalette(colors) {
        if (!colors || colors.length === 0) {
             alert('No valid colors found in the imported file.');
             return;
        }

        // Filter for valid hex colors before replacing
        State.currentPalette = colors.filter(c => /^#([0-9A-F]{3}){1,2}$/i.test(c));        
        // Set the first imported color as the active color
        this.setColor(State.currentPalette[0] || Config.defaultColor);
        this.render();
        alert(`Successfully imported ${State.currentPalette.length} colors into the current palette.`);
    },

    /**
     * Render color palette swatches
     */
    render() {
        UI.paletteContainer.innerHTML = '';
        
        // RENDER CURRENT PALETTE
        State.currentPalette.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.onclick = () => this.setColor(color);
            
            // Highlight the currently selected color
            if (color.toLowerCase() === State.color.toLowerCase()) {
                 swatch.classList.add('active');
            }
            
            UI.paletteContainer.appendChild(swatch);
        });
    }
};