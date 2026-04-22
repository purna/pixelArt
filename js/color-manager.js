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
     * Add color to history when a color is used.
     * This only updates the floating color history, not the main palette.
     */
    addToHistory(hex) {
        // Update recent colors (keep only last 4) - separate from main palette
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

        // Update color history display only, not the main palette
        this.updateColorHistoryDisplay();
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
     * Save current color to the active palette group.
     */
    saveColorToPalette(hex) {
        const currentGroup = State.paletteGroups[State.activePaletteGroup];
        if (currentGroup.colors.includes(hex)) {
            return;
        }

        currentGroup.colors.push(hex);
        State.currentPalette = currentGroup.colors;
        this.render();
    },

    /**
     * Parse a Coolors URL and import the colors.
     * Example URL: https://coolors.co/daffed-9bf3f0-473198-4a0d67-adfc92
     */
    importPaletteFromUrl(url) {
        // 1. Validate and extract the color segment
        const coolorsRegex = /(?:coolors\.co\/)([a-fA-F0-9]{6}(?:-[a-fA-F0-9]{6})+)/;
        const match = url.match(coolorsRegex);

        if (!match) {
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
     * Replace current palette with new colors (from .ase import)
     */
    importPalette(colors) {
        if (!colors || colors.length === 0) {
            return;
        }

        // Prompt for group name
        const groupName = prompt('Enter a name for this palette group:', 'Palette ' + (State.paletteGroups.length + 1));
        if (!groupName) return;
        
        // Add as a new group
        const newGroup = {
            name: groupName,
            colors: colors.filter(c => /^#([0-9A-F]{3}){1,2}$/i.test(c)),
            collapsed: false
        };
        
        State.paletteGroups.push(newGroup);
        State.activePaletteGroup = State.paletteGroups.length - 1;
        State.currentPalette = newGroup.colors;
        
        // Set the first imported color as the active color
        this.setColor(State.currentPalette[0] || Config.defaultColor);
        this.render();
    },

    /**
     * Render color palette swatches with groups
     */
    render() {
        UI.paletteContainer.innerHTML = '';
        
        State.paletteGroups.forEach((group, groupIndex) => {
            // Create group container
            const groupContainer = document.createElement('div');
            groupContainer.className = `palette-group ${group.collapsed ? 'collapsed' : ''}`;
            
            // Create group header
            const groupHeader = document.createElement('div');
            groupHeader.className = 'palette-group-header';
            groupHeader.innerHTML = `
                <span class="palette-group-toggle">${group.collapsed ? '▶' : '▼'}</span>
                <span class="palette-group-name">${group.name}</span>
                <button class="palette-group-delete" data-group="${groupIndex}" title="Delete group">×</button>
            `;
            
            groupHeader.querySelector('.palette-group-toggle').addEventListener('click', (e) => {
                e.stopPropagation();
                group.collapsed = !group.collapsed;
                this.render();
            });
            
            groupHeader.querySelector('.palette-group-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (State.paletteGroups.length <= 1) {
                    return;
                }
                if (confirm(`Delete group "${group.name}"?`)) {
                    State.paletteGroups.splice(groupIndex, 1);
                    if (State.activePaletteGroup >= State.paletteGroups.length) {
                        State.activePaletteGroup = State.paletteGroups.length - 1;
                    }
                    State.currentPalette = State.paletteGroups[State.activePaletteGroup].colors;
                    this.render();
                }
            });
            
            groupHeader.addEventListener('click', () => {
                State.activePaletteGroup = groupIndex;
                State.currentPalette = group.colors;
                this.setColor(State.currentPalette[0] || Config.defaultColor);
                this.render();
            });
            
            groupContainer.appendChild(groupHeader);
            
            // Create colors container
            const colorsContainer = document.createElement('div');
            colorsContainer.className = 'palette-group-colors';
            
            group.colors.forEach(color => {
                const swatch = document.createElement('div');
                swatch.className = 'swatch';
                swatch.style.backgroundColor = color;
                swatch.title = color;
                swatch.onclick = (e) => {
                    e.stopPropagation();
                    this.setColor(color);
                };
                
                if (color.toLowerCase() === State.color.toLowerCase()) {
                    swatch.classList.add('active');
                }
                
                if (groupIndex === State.activePaletteGroup) {
                    swatch.classList.add('active-group');
                }
                
                colorsContainer.appendChild(swatch);
            });
            
            groupContainer.appendChild(colorsContainer);
            UI.paletteContainer.appendChild(groupContainer);
        });
    }
};