// tilemap-manager.js
// Manages tilemap preview and seamless grid drawing

const TilemapManager = {
    activeSquares: new Set(),
    isSeamlessModeEnabled: false,
    seamlessCanvases: [], // Array of 9 canvas elements for seamless grid
    seamlessContexts: [], // Array of 9 contexts
    isDrawing: false,
    currentBrush: null,
    TILE_DIM: 32, // Will be updated from actual canvas size
    // New: Independent tile editing
    tileData: [], // Array of 9 ImageData objects, one per tile
    activeTileIndex: 4, // Center tile (1,1) is index 4
    
    /**
     * Initialize the tilemap manager
     */
    init() {
        // Check if UI elements are ready
        if (!UI.compositionCanvas || !document.getElementById('tilemapGrid')) {
            console.warn('TilemapManager: UI elements not ready, deferring initialization');
            return;
        }
        
        // Initialize tile data with empty layers
        this.initTileData();
        
        this.setupTilemapGrid();
        this.setupSeamlessGrid();
        this.attachEventListeners();
    },
    
    /**
     * Initialize tile data for all 9 tiles
     */
    initTileData() {
        this.tileData = [];
        for (let i = 0; i < 9; i++) {
            this.tileData.push(new ImageData(State.width, State.height));
        }
        // Copy current layer data to center tile
        const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
        this.tileData[4] = new ImageData(new Uint8ClampedArray(currentLayer.data.data), State.width, State.height);
    },
    
    /**
     * Get the currently active tile's ImageData
     */
    getActiveTileData() {
        return this.tileData[this.activeTileIndex];
    },
    
    /**
     * Set the active tile index (0-8)
     */
    setActiveTile(index) {
        if (index < 0 || index >= 9) return;
        
        // Save current canvas content to previous active tile
        if (this.activeTileIndex !== null && UI.compositionCanvas) {
            const ctx = UI.compositionCanvas.getContext('2d');
            this.tileData[this.activeTileIndex] = ctx.getImageData(0, 0, State.width, State.height);
        }
        
        this.activeTileIndex = index;
        
        // Load new active tile content to main canvas
        const ctx = UI.compositionCanvas.getContext('2d');
        ctx.putImageData(this.tileData[index], 0, 0);
        
        // Update layer data
        const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
        currentLayer.data = new ImageData(new Uint8ClampedArray(this.tileData[index].data), State.width, State.height);
        
        CanvasManager.render();
        this.updateTilePreviewHighlight();
        
        // Update seamless grid if enabled
        if (this.isSeamlessModeEnabled) {
            this.updateAllSeamlessCanvases();
        }
    },
    
    /**
     * Update visual highlight of active tile in preview grid
     */
    updateTilePreviewHighlight() {
        document.querySelectorAll('.tilemap-square').forEach(square => {
            square.classList.remove('active-tile');
            const tileIndex = parseInt(square.dataset.tileIndex);
            if (tileIndex === this.activeTileIndex) {
                square.classList.add('active-tile');
            }
        });
    },
    
    /**
     * Setup the original 3x3 tilemap preview grid
     */
    setupTilemapGrid() {
        const grid = document.getElementById('tilemapGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Create 3x3 grid
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const square = document.createElement('div');
                square.className = 'tilemap-square';
                square.dataset.row = r;
                square.dataset.col = c;
                square.dataset.tileIndex = r * 3 + c;

                // Center square (1,1)
                if (r === 1 && c === 1) {
                    square.classList.add('center');
                }

                // Create canvas for this square
                const canvas = document.createElement('canvas');
                const canvasSize = Math.min(State.width, State.height);
                canvas.width = canvasSize;
                canvas.height = canvasSize;
                square.appendChild(canvas);

                // Make each tile clickable for editing
                square.addEventListener('click', (e) => {
                    if (this.isSeamlessModeEnabled) {
                        // In seamless mode, clicking a tile switches the active tile for editing
                        this.setActiveTile(r * 3 + c);
                    } else {
                        this.toggleSquare(r, c);
                    }
                });

                grid.appendChild(square);
            }
        }

        this.refresh();
    },
    
    /**
     * Highlight a tile briefly when clicked in seamless mode
     */
    highlightTile(row, col) {
        const square = document.querySelector(`.tilemap-square[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add('editing');
            setTimeout(() => square.classList.remove('editing'), 200);
        }
    },

    /**
     * Setup the seamless 3x3 grid overlay on the main canvas
     */
    setupSeamlessGrid() {
        // Check if overlay already exists
        let overlay = document.getElementById('seamlessGridOverlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'seamlessGridOverlay';
            overlay.className = 'seamless-grid-overlay';
            
            // Create 9 cells for the 3x3 grid
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'seamless-grid-cell';
                    cell.dataset.gridR = r;
                    cell.dataset.gridC = c;
                    cell.dataset.tileIndex = r * 3 + c;
                    
                    // Center cell (1,1) is the main canvas
                    if (r === 1 && c === 1) {
                        cell.classList.add('center');
                    }
                    
                    // Create canvas for this cell
                    const canvas = document.createElement('canvas');
                    canvas.width = State.width;
                    canvas.height = State.height;
                    cell.appendChild(canvas);
                    
                    overlay.appendChild(cell);
                }
            }
            
            // Insert overlay into drawing area
            const drawingArea = document.getElementById('drawing-area');
            if (drawingArea) {
                drawingArea.appendChild(overlay);
            }
        }

        // Store references to all canvases and contexts
        this.seamlessCanvases = [];
        this.seamlessContexts = [];
        
        const cells = overlay.querySelectorAll('.seamless-grid-cell');
        cells.forEach(cell => {
            const canvas = cell.querySelector('canvas');
            if (canvas) {
                this.seamlessCanvases.push(canvas);
                // Get context with willReadFrequently hint for better performance
                this.seamlessContexts.push(canvas.getContext('2d', { willReadFrequently: true }));
            }
        });
        
        this.updateSeamlessCanvasSizes();
    },

    /**
     * Update seamless canvas sizes when main canvas size changes
     */
    updateSeamlessCanvasSizes() {
        this.TILE_DIM = State.width; // Update tile dimension
        
        this.seamlessCanvases.forEach(canvas => {
            canvas.width = State.width;
            canvas.height = State.height;
        });
        
        if (this.isSeamlessModeEnabled) {
            this.updateAllSeamlessCanvases();
        }
    },

    /**
     * Attach event listeners for seamless mode and tilemap controls
     */
    attachEventListeners() {
        const toggleBtn = document.getElementById('toggleSeamlessModeBtn');
        const clearBtn = document.getElementById('clearTilemapBtn');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSeamlessMode());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }

        // Attach drawing handlers to seamless canvases
        this.attachSeamlessDrawingHandlers();
    },

    /**
     * Attach drawing event handlers to all seamless canvases
     */
    attachSeamlessDrawingHandlers() {
        const overlay = document.getElementById('seamlessGridOverlay');
        if (!overlay) return;

        const cells = overlay.querySelectorAll('.seamless-grid-cell');
        
        cells.forEach((cell, index) => {
            const canvas = cell.querySelector('canvas');
            if (!canvas) return;

            const gridR = parseInt(cell.dataset.gridR);
            const gridC = parseInt(cell.dataset.gridC);
            const isCenter = (gridR === 1 && gridC === 1);

            if (isCenter) {
                // Center tile is the main canvas - no overlay handlers needed
                // Main canvas handles drawing through normal flow
                canvas.style.display = 'none';
                canvas.style.pointerEvents = 'none';
                return;
            }

            // Non-center tiles: click to select tile for editing
            canvas.addEventListener('click', (e) => {
                if (!this.isSeamlessModeEnabled) return;
                // Select this tile for editing on main canvas
                this.setActiveTile(gridR * 3 + gridC);
            });

            // Hover effect
            canvas.addEventListener('mouseenter', () => {
                if (this.isSeamlessModeEnabled) {
                    cell.style.borderColor = 'rgba(0, 255, 65, 0.8)';
                }
            });
            canvas.addEventListener('mouseleave', () => {
                cell.style.borderColor = 'rgba(0, 255, 65, 0.2)';
            });
        });
    },

    /**
     * Handle drawing start on seamless canvas
     */
    handleSeamlessDrawStart(e, cell) {
        if (!this.isSeamlessModeEnabled) return;

        // Determine brush type
        if (e.type === 'contextmenu' || e.button === 2) {
            this.currentBrush = 'rgba(255, 255, 255, 1)'; // Eraser
        } else {
            // Use current color and opacity from State
            const r = parseInt(State.color.slice(1, 3), 16);
            const g = parseInt(State.color.slice(3, 5), 16);
            const b = parseInt(State.color.slice(5, 7), 16);
            this.currentBrush = `rgba(${r}, ${g}, ${b}, ${State.opacity})`;
        }

        this.isDrawing = true;
        this.handleSeamlessDrawMove(e, cell);
    },

    /**
     * Handle drawing move on seamless canvas
     * Key fix: When drawing on any of the 9 grid cells, the drawing wraps to the main canvas
     * The 9 cells represent the same canvas content offset by (-1, 0, 1) * canvas_size in each direction
     * When drawing on center cell, also wrap to opposite edges for seamless tiling
     */
    handleSeamlessDrawMove(e, cell) {
        if (!this.isDrawing || !this.isSeamlessModeEnabled) return;

        const canvas = cell.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        
        // Get mouse/touch position
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        
        if (!clientX || !clientY) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Convert to canvas coordinates
        const zoom = State.zoom;
        const tileX = Math.floor(x / zoom);
        const tileY = Math.floor(y / zoom);

        if (tileX < 0 || tileX >= this.TILE_DIM || tileY < 0 || tileY >= this.TILE_DIM) return;

        // Calculate which tile in the 3x3 grid this cell represents
        // gridR, gridC are 0, 1, 2 for the 3x3 grid
        // Center is at (1, 1) 
        const gridR = parseInt(cell.dataset.gridR);
        const gridC = parseInt(cell.dataset.gridC);
        
        // Offset from center tile in canvas coordinates
        // Center tile (1,1) has offset (0, 0)
        // Tile (0,1) - left of center - has offset (-width, 0)
        // Tile (2,1) - right of center - has offset (+width, 0)
        // etc.
        const deltaX = (gridC - 1) * this.TILE_DIM;
        const deltaY = (gridR - 1) * this.TILE_DIM;

        // Draw with brush size
        const brushR = Math.floor(State.brushSize / 2);
        
        // Get the current layer data from the main canvas
        const layerData = CanvasManager.getCurrentLayerData();
        
        // Determine if we're drawing on the center tile (which should wrap edges)
        const isCenterTile = (gridR === 1 && gridC === 1);
        
        for (let dx = -brushR; dx <= brushR; dx++) {
            for (let dy = -brushR; dy <= brushR; dy++) {
                // Position on the current tile being drawn
                const brushTileX = tileX + dx;
                const brushTileY = tileY + dy;

                // Convert to absolute position (including tile offset)
                const absX = brushTileX + deltaX;
                const absY = brushTileY + deltaY;

                // Wrap to main canvas coordinates using modulo
                // This is the key fix: properly wrap negative values
                let drawX = ((absX % this.TILE_DIM) + this.TILE_DIM) % this.TILE_DIM;
                let drawY = ((absY % this.TILE_DIM) + this.TILE_DIM) % this.TILE_DIM;

                // Draw on main canvas layer
                const index = (drawY * State.width + drawX) * 4;

                if (this.currentBrush === 'rgba(255, 255, 255, 1)') {
                    // Eraser - set to transparent
                    layerData.data[index] = 0;
                    layerData.data[index + 1] = 0;
                    layerData.data[index + 2] = 0;
                    layerData.data[index + 3] = 0;
                } else {
                    // Extract RGBA from current brush
                    const match = this.currentBrush.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
                    if (match) {
                        const r = parseInt(match[1]);
                        const g = parseInt(match[2]);
                        const b = parseInt(match[3]);
                        const a = match[4] ? parseFloat(match[4]) * 255 : 255;

                        layerData.data[index] = r;
                        layerData.data[index + 1] = g;
                        layerData.data[index + 2] = b;
                        layerData.data[index + 3] = a;
                    }
                }
                
                // If drawing on center tile, also draw on wrapped positions for seamless edges
                if (isCenterTile) {
                    // Check if we're near edges and need to wrap
                    // Right edge wraps to left
                    if (brushTileX + brushR >= this.TILE_DIM - 1) {
                        const wrapX = ((absX + this.TILE_DIM) % this.TILE_DIM + this.TILE_DIM) % this.TILE_DIM;
                        const wrapIndex = (drawY * State.width + wrapX) * 4;
                        this.applyBrushToLayer(layerData, wrapIndex);
                    }
                    // Left edge wraps to right
                    if (brushTileX - brushR <= 0) {
                        const wrapX = ((absX - this.TILE_DIM) % this.TILE_DIM + this.TILE_DIM) % this.TILE_DIM;
                        const wrapIndex = (drawY * State.width + wrapX) * 4;
                        this.applyBrushToLayer(layerData, wrapIndex);
                    }
                    // Bottom edge wraps to top
                    if (brushTileY + brushR >= this.TILE_DIM - 1) {
                        const wrapY = ((absY + this.TILE_DIM) % this.TILE_DIM + this.TILE_DIM) % this.TILE_DIM;
                        const wrapIndex = (wrapY * State.width + drawX) * 4;
                        this.applyBrushToLayer(layerData, wrapIndex);
                    }
                    // Top edge wraps to bottom
                    if (brushTileY - brushR <= 0) {
                        const wrapY = ((absY - this.TILE_DIM) % this.TILE_DIM + this.TILE_DIM) % this.TILE_DIM;
                        const wrapIndex = (wrapY * State.width + drawX) * 4;
                        this.applyBrushToLayer(layerData, wrapIndex);
                    }
                }
            }
        }

        // Update all seamless canvases to reflect changes
        this.updateAllSeamlessCanvases();
    },

    /**
     * Handle drawing end
     */
    handleSeamlessDrawEnd() {
        if (this.isDrawing) {
            this.isDrawing = false;
            // Save state for undo/redo
            if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
                InputHandler.saveState();
            }
            // Update main canvas render
            CanvasManager.saveLayerChange();
        }
    },

    /**
     * Update all seamless canvases with each tile's independent content
     * Each of the 9 canvases shows its own tile content
     */
    updateAllSeamlessCanvases() {
        if (!this.seamlessContexts.length) return;
        
        // Each seamless canvas shows its corresponding tile data
        this.seamlessContexts.forEach((ctx, index) => {
            if (this.tileData[index]) {
                ctx.putImageData(this.tileData[index], 0, 0);
            }
        });
        
        // Draw seam lines between adjacent tiles to show seamless boundaries
        if (this.isSeamlessModeEnabled) {
            this.drawSeamLines();
        }
    },

    /**
     * Apply current brush color to a specific pixel index in layer data
     */
    applyBrushToLayer(layerData, index) {
        if (this.currentBrush === 'rgba(255, 255, 255, 1)') {
            // Eraser - set to transparent
            layerData.data[index] = 0;
            layerData.data[index + 1] = 0;
            layerData.data[index + 2] = 0;
            layerData.data[index + 3] = 0;
        } else {
            // Extract RGBA from current brush
            const match = this.currentBrush.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
            if (match) {
                const r = parseInt(match[1]);
                const g = parseInt(match[2]);
                const b = parseInt(match[3]);
                const a = match[4] ? parseFloat(match[4]) * 255 : 255;

                layerData.data[index] = r;
                layerData.data[index + 1] = g;
                layerData.data[index + 2] = b;
                layerData.data[index + 3] = a;
            }
        }
    },
    
    /**
     * Draw seam lines between adjacent tiles to show seamless boundaries
     */
    drawSeamLines() {
        const w = State.width;
        const h = State.height;
        
        // Draw vertical and horizontal lines at tile boundaries on all non-center tiles
        for (let i = 0; i < 9; i++) {
            if (i === 4) continue; // Skip center tile
            
            const ctx = this.seamlessContexts[i];
            if (!ctx) continue;
            
            const gridR = Math.floor(i / 3);
            const gridC = i % 3;
            
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red semi-transparent for seam lines
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            
            // Draw vertical seam line if not on left edge
            if (gridC > 0) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, h);
                ctx.stroke();
            }
            
            // Draw vertical seam line if not on right edge
            if (gridC < 2) {
                ctx.beginPath();
                ctx.moveTo(w - 1, 0);
                ctx.lineTo(w - 1, h);
                ctx.stroke();
            }
            
            // Draw horizontal seam line if not on top edge
            if (gridR > 0) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(w, 0);
                ctx.stroke();
            }
            
            // Draw horizontal seam line if not on bottom edge
            if (gridR < 2) {
                ctx.beginPath();
                ctx.moveTo(0, h - 1);
                ctx.lineTo(w, h - 1);
                ctx.stroke();
            }
            
            // Draw cross-hair marks at corners where 4 tiles meet
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; // Yellow for cross marks
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            
            // Corner tiles - draw cross at the corner where 4 tiles meet
            // Top-left corner
            if (gridC === 0 && gridR === 0) {
                ctx.beginPath();
                ctx.moveTo(w - 1, h - 6);
                ctx.lineTo(w - 1, h + 1);
                ctx.moveTo(w - 6, h - 1);
                ctx.lineTo(w + 1, h - 1);
                ctx.stroke();
            }
            // Top-right corner
            else if (gridC === 2 && gridR === 0) {
                ctx.beginPath();
                ctx.moveTo(0, h - 6);
                ctx.lineTo(0, h + 1);
                ctx.moveTo(-1, h - 1);
                ctx.lineTo(6, h - 1);
                ctx.stroke();
            }
            // Bottom-left corner
            else if (gridC === 0 && gridR === 2) {
                ctx.beginPath();
                ctx.moveTo(w - 1, 0);
                ctx.lineTo(w - 1, 6);
                ctx.moveTo(w - 6, 0);
                ctx.lineTo(w + 1, 0);
                ctx.stroke();
            }
            // Bottom-right corner
            else if (gridC === 2 && gridR === 2) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, 6);
                ctx.moveTo(-1, 0);
                ctx.lineTo(6, 0);
                ctx.stroke();
            }
            // Middle column (not center) - draw horizontal cross marks at top/bottom
            else if (gridC === 1 && gridR === 0) {
                // Top middle - draw cross at bottom edge
                ctx.beginPath();
                ctx.moveTo(w / 2 - 5, h - 1);
                ctx.lineTo(w / 2 + 5, h - 1);
                ctx.moveTo(w / 2, h - 6);
                ctx.lineTo(w / 2, h + 1);
                ctx.stroke();
            }
            else if (gridC === 1 && gridR === 2) {
                // Bottom middle - draw cross at top edge
                ctx.beginPath();
                ctx.moveTo(w / 2 - 5, 0);
                ctx.lineTo(w / 2 + 5, 0);
                ctx.moveTo(w / 2, -1);
                ctx.lineTo(w / 2, 6);
                ctx.stroke();
            }
            // Middle row (not center) - draw vertical cross marks at left/right
            else if (gridC === 0 && gridR === 1) {
                // Left middle - draw cross at right edge
                ctx.beginPath();
                ctx.moveTo(w - 1, h / 2 - 5);
                ctx.lineTo(w - 1, h / 2 + 5);
                ctx.moveTo(w - 6, h / 2);
                ctx.lineTo(w + 1, h / 2);
                ctx.stroke();
            }
            else if (gridC === 2 && gridR === 1) {
                // Right middle - draw cross at left edge
                ctx.beginPath();
                ctx.moveTo(0, h / 2 - 5);
                ctx.lineTo(0, h / 2 + 5);
                ctx.moveTo(-1, h / 2);
                ctx.lineTo(6, h / 2);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    },

    /**
     * Toggle seamless mode on/off
     */
    toggleSeamlessMode() {
        this.isSeamlessModeEnabled = !this.isSeamlessModeEnabled;
        
        const overlay = document.getElementById('seamlessGridOverlay');
        const toggleBtn = document.getElementById('toggleSeamlessModeBtn');
        const toggleText = document.getElementById('toggleSeamlessModeText');
        
        if (this.isSeamlessModeEnabled) {
            // Enable seamless mode - show overlay
            overlay.classList.add('enabled');
            if (toggleBtn) toggleBtn.classList.add('active');
            if (toggleText) toggleText.textContent = 'Disable Seamless Grid';
            
            // Initialize tile data: copy current canvas to all tiles
            this.initTileData();
            this.activeTileIndex = 4; // Center tile
            
            // Update tilemap grid UI for editing mode
            this.updateTilemapGridForSeamlessMode();
            
            // Update all seamless canvases with current canvas content
            this.updateAllSeamlessCanvases();
        } else {
            // Disable seamless mode - hide overlay
            overlay.classList.remove('enabled');
            if (toggleBtn) toggleBtn.classList.remove('active');
            if (toggleText) toggleText.textContent = 'Enable Seamless Grid';
            
            // Update tilemap grid UI for preview mode
            this.updateTilemapGridForPreviewMode();
            
            // When disabling, merge active tile back to main canvas
            if (this.activeTileIndex !== null && UI.compositionCanvas) {
                const ctx = UI.compositionCanvas.getContext('2d');
                ctx.putImageData(this.tileData[this.activeTileIndex], 0, 0);
                
                // Update layer data
                const currentLayer = State.frames[State.currentFrameIndex].layers[State.activeLayerIndex];
                currentLayer.data = new ImageData(new Uint8ClampedArray(this.tileData[this.activeTileIndex].data), State.width, State.height);
                
                CanvasManager.render();
            }
        }
        
        // Update seamless grid visibility
        this.updateSeamlessGridVisibility();
    },

    /**
     * Update tilemap grid UI for seamless editing mode
     */
    updateTilemapGridForSeamlessMode() {
        const squares = document.querySelectorAll('.tilemap-square');
        squares.forEach(sq => {
            sq.title = `Edit Tile ${sq.dataset.row},${sq.dataset.col} (all tiles mirror main canvas)`;
            sq.classList.remove('active'); // Clear preview active state
        });
    },
    
    /**
     * Update tilemap grid UI for preview mode
     */
    updateTilemapGridForPreviewMode() {
        const squares = document.querySelectorAll('.tilemap-square');
        squares.forEach(sq => {
            sq.title = `Toggle Tile ${sq.dataset.row},${sq.dataset.col} Preview`;
            sq.classList.remove('editing');
        });
        // Restore active squares from preview mode
        this.activeSquares.forEach(index => {
            const sq = document.querySelector(`.tilemap-square[data-tile-index="${index}"]`);
            if (sq) sq.classList.add('active');
        });
    },
    
    /**
     * Update visibility of seamless grid cells based on active tilemap squares
     */
    updateSeamlessGridVisibility() {
        const overlay = document.getElementById('seamlessGridOverlay');
        if (!overlay) return;

        const cells = overlay.querySelectorAll('.seamless-grid-cell');
        
        cells.forEach(cell => {
            const tileIndex = parseInt(cell.dataset.tileIndex);
            const isCenter = tileIndex === 4;
            
            if (this.isSeamlessModeEnabled) {
                // In seamless mode, all non-center cells are editable
                if (!isCenter) {
                    cell.style.opacity = '0.5';
                    cell.style.pointerEvents = 'auto';
                }
            } else {
                // In preview mode, show only active squares (non-center)
                if (!isCenter && this.activeSquares.has(tileIndex)) {
                    cell.style.opacity = '0.5';
                    cell.style.pointerEvents = 'none';
                } else if (!isCenter) {
                    cell.style.opacity = '0';
                    cell.style.pointerEvents = 'none';
                }
            }
        });
    },

    /**
     * Toggle a square in the tilemap preview grid (preview mode only)
     */
    toggleSquare(row, col) {
        if (this.isSeamlessModeEnabled) return; // Don't toggle in editing mode
        
        const index = row * 3 + col;
        
        if (this.activeSquares.has(index)) {
            this.activeSquares.delete(index);
        } else {
            this.activeSquares.add(index);
        }
        
        // Update UI
        const square = document.querySelector(`.tilemap-square[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.toggle('active', this.activeSquares.has(index));
        }
        
        // Update seamless grid visibility
        this.updateSeamlessGridVisibility();
        
        // Refresh preview
        this.refresh();
    },

    /**
     * Clear all tilemap data
     */
    clearAll() {
        this.activeSquares.clear();
        
        // Update UI
        const squares = document.querySelectorAll('.tilemap-square');
        squares.forEach(sq => {
            sq.classList.remove('active', 'editing');
        });
        
        // Clear seamless grid
        this.seamlessContexts.forEach(ctx => {
            ctx.clearRect(0, 0, State.width, State.height);
        });
        
        // Clear main canvas layer
        const layerData = CanvasManager.getCurrentLayerData();
        const data = layerData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 0;
        }
        
        // Save state
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }
        
        // Re-render
        CanvasManager.saveLayerChange();
    },
    
    /**
     * Refresh the tilemap preview grid (uses activeSquares for preview mode)
     */
    refresh() {
        const grid = document.getElementById('tilemapGrid');
        if (!grid) return;

        const squares = grid.querySelectorAll('.tilemap-square');
        
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const index = row * 3 + col;
            const canvas = square.querySelector('canvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Get tile data
            let tileImageData;
            if (this.isSeamlessModeEnabled) {
                // In seamless mode, show each tile's independent content
                tileImageData = this.tileData[index];
            } else {
                // In preview mode, center square shows current frame, others show if active
                if (row === 1 && col === 1) {
                    const currentFrame = State.frames[State.currentFrameIndex];
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = State.width;
                    tempCanvas.height = State.height;
                    const tempCtx = tempCanvas.getContext('2d');

                    currentFrame.layers.forEach(layer => {
                        if (layer.visible) {
                            tempCtx.putImageData(layer.data, 0, 0);
                        }
                    });

                    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
                    return;
                } else if (this.activeSquares.has(index)) {
                    const currentFrame = State.frames[State.currentFrameIndex];
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = State.width;
                    tempCanvas.height = State.height;
                    const tempCtx = tempCanvas.getContext('2d');

                    currentFrame.layers.forEach(layer => {
                        if (layer.visible) {
                            tempCtx.putImageData(layer.data, 0, 0);
                        }
                    });

                    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
                    return;
                } else {
                    return; // Inactive squares in preview mode are empty
                }
            }
            
            // Draw tile content to preview
            if (tileImageData) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = State.width;
                tempCanvas.height = State.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(tileImageData, 0, 0);
                ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
            }
        });
        
        // Update active tile highlight
        this.updateTilePreviewHighlight();
    }
};

// Initialize when called from app.js (after DOM and other managers are ready)
// Don't auto-initialize on DOMContentLoaded since we need other managers first
if (typeof window !== 'undefined') {
    window.TilemapManager = TilemapManager;
}