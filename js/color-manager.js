// color-manager.js modifications

const ColorManager = {
    
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
        
        // Optional: limit palette size if it grows too large from history/saved colors
        
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