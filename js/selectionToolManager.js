// selectionToolManager.js
// Handles all selection tools with Piskel-style functionality

const SelectionToolManager = {
    // Selection state
    state: {
        active: false,
        type: null, // 'rect', 'circle', 'lasso', 'shape'
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        lassoPoints: [],
        pixels: null,
        bounds: null, // { x, y, width, height }
        isMoving: false,
        moveStartX: 0,
        moveStartY: 0,
        floatingImageData: null,
        originalPosition: null
    },
    
    // Clipboard for copy/paste
    clipboard: null,
    
    // Marching ants animation
    marchingAntsOffset: 0,
    marchingAntsAnimationId: null,
    
    // High-resolution selection canvas
    selectionCanvas: null,
    selectionCtx: null,
    BASE_SCALE: 3, // Base scale factor (looks good at x3 zoom)
    
    /**
     * Get the current zoom-adjusted scale factor
     */
    getScale() {
        // Get current zoom level from State (default to 1 if not available)
        const zoom = State.zoom || 1;
        // At x1 zoom, use higher scale. At x20 zoom, use lower scale.
        // This keeps the visual line thickness consistent
        return Math.max(1, Math.ceil(this.BASE_SCALE * zoom));
    },
    
    /**
     * Initialize the selection tool manager
     */
    init() {
        this.createSelectionCanvas();
        this.startMarchingAntsAnimation();
        this.setupKeyboardShortcuts();
    },
    
    /**
     * Create high-resolution selection canvas for smooth marching ants
     */
    createSelectionCanvas() {
        // Find the drawing area
        const drawingArea = document.getElementById('drawing-area');
        if (!drawingArea) {
            console.warn('Drawing area not found, will retry...');
            setTimeout(() => this.createSelectionCanvas(), 100);
            return;
        }
        
        // Remove existing selection canvas if any
        const existing = document.getElementById('selection-canvas');
        if (existing) existing.remove();
        
        // Create the selection canvas
        this.selectionCanvas = document.createElement('canvas');
        this.selectionCanvas.id = 'selection-canvas';
        
        // Set high-resolution size first
        const scale = this.getScale();
        const width = State.width || 64;
        const height = State.height || 64;
        this.selectionCanvas.width = width * scale;
        this.selectionCanvas.height = height * scale;
        
        // Apply styles
        this.selectionCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            z-index: 50;
        `;
        
        // Add to drawing area
        drawingArea.appendChild(this.selectionCanvas);
        this.selectionCtx = this.selectionCanvas.getContext('2d');
        
        // Enable anti-aliasing for smooth lines
        this.selectionCtx.imageSmoothingEnabled = true;
        this.selectionCtx.imageSmoothingQuality = 'high';
        
        console.log(`Selection canvas created: ${width * scale}x${height * scale} (${scale}x scale at zoom ${State.zoom || 1})`);
    },
    
    /**
     * Update selection canvas size based on current canvas dimensions and zoom
     */
    updateSelectionCanvasSize() {
        if (!this.selectionCanvas) {
            this.createSelectionCanvas();
            return;
        }
        
        const scale = this.getScale();
        const width = State.width || 64;
        const height = State.height || 64;
        const newWidth = width * scale;
        const newHeight = height * scale;
        
        // Only update if size changed
        if (this.selectionCanvas.width !== newWidth || 
            this.selectionCanvas.height !== newHeight) {
            this.selectionCanvas.width = newWidth;
            this.selectionCanvas.height = newHeight;
            
            // Re-enable anti-aliasing after resize
            if (this.selectionCtx) {
                this.selectionCtx.imageSmoothingEnabled = true;
                this.selectionCtx.imageSmoothingQuality = 'high';
            }
            
            console.log(`Selection canvas resized to ${newWidth}x${newHeight} (${scale}x scale at zoom ${State.zoom || 1})`);
        }
    },
    
    /**
     * Setup keyboard shortcuts for selection operations
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isMeta = e.metaKey || e.ctrlKey;
            
            // Copy selection
            if (isMeta && e.key.toLowerCase() === 'c' && this.state.pixels) {
                e.preventDefault();
                this.copySelection();
            }
            
            // Cut selection
            if (isMeta && e.key.toLowerCase() === 'x' && this.state.pixels) {
                e.preventDefault();
                this.cutSelection();
            }
            
            // Paste selection
            if (isMeta && e.key.toLowerCase() === 'v' && this.clipboard) {
                e.preventDefault();
                this.pasteSelection();
            }
            
            // Clear selection with Escape
            if (e.key === 'Escape' && this.state.active) {
                e.preventDefault();
                this.clearSelection();
            }
            
            // Delete selection content
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.state.pixels) {
                e.preventDefault();
                this.deleteSelectionContent();
            }
        });
    },
    
    /**
     * Start marching ants animation
     */
    startMarchingAntsAnimation() {
        const animate = () => {
            // Slower animation - 0.2 instead of 0.5
            this.marchingAntsOffset = (this.marchingAntsOffset + 0.2) % 8;
            if (this.state.active && this.state.bounds) {
                this.drawMarchingAnts();
            }
            this.marchingAntsAnimationId = requestAnimationFrame(animate);
        };
        animate();
    },
    
    /**
     * Draw marching ants border around selection
     */
    drawMarchingAnts() {
        if (!this.state.bounds) return;
        
        // Ensure selection canvas exists and is properly sized
        if (!this.selectionCtx) {
            this.createSelectionCanvas();
            if (!this.selectionCtx) return;
        }
        
        // Update canvas size if zoom changed
        this.updateSelectionCanvasSize();
        
        const ctx = this.selectionCtx;
        const scale = this.getScale();
        
        const { x, y, width, height } = this.state.bounds;
        
        // Clear previous drawing
        ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        
        // Scale coordinates for high-res canvas
        const sx = x * scale;
        const sy = y * scale;
        const sw = width * scale;
        const sh = height * scale;
        
        // Shorter dash pattern (2px dashes)
        const dashSize = Math.max(2, scale);
        const lineWidth = Math.max(1, scale / 3);
        
        // Draw based on selection type
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([dashSize, dashSize]);
        ctx.lineDashOffset = -this.marchingAntsOffset * scale;
        
        if (this.state.type === 'circle') {
            // Draw circular marching ants
            const centerX = this.state.startX * scale;
            const centerY = this.state.startY * scale;
            const r = Math.sqrt(
                Math.pow(this.state.endX - this.state.startX, 2) +
                Math.pow(this.state.endY - this.state.startY, 2)
            ) * scale;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.state.type === 'lasso' && this.state.lassoPoints.length > 1) {
            // Draw lasso polygon marching ants
            ctx.beginPath();
            ctx.moveTo(this.state.lassoPoints[0].x * scale, this.state.lassoPoints[0].y * scale);
            
            for (let i = 1; i < this.state.lassoPoints.length; i++) {
                ctx.lineTo(this.state.lassoPoints[i].x * scale, this.state.lassoPoints[i].y * scale);
            }
            
            ctx.closePath();
            ctx.stroke();
        } else if (this.state.type === 'shape') {
            // For shape selection, draw the bounding box
            ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
        } else {
            // Default to rectangle for rect selection
            ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
        }
        
        // Draw white dashed line (offset)
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = -this.marchingAntsOffset * scale + dashSize;
        
        if (this.state.type === 'circle') {
            const centerX = this.state.startX * scale;
            const centerY = this.state.startY * scale;
            const r = Math.sqrt(
                Math.pow(this.state.endX - this.state.startX, 2) +
                Math.pow(this.state.endY - this.state.startY, 2)
            ) * scale;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.state.type === 'lasso' && this.state.lassoPoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.state.lassoPoints[0].x * scale, this.state.lassoPoints[0].y * scale);
            
            for (let i = 1; i < this.state.lassoPoints.length; i++) {
                ctx.lineTo(this.state.lassoPoints[i].x * scale, this.state.lassoPoints[i].y * scale);
            }
            
            ctx.closePath();
            ctx.stroke();
        } else if (this.state.type === 'shape') {
            ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
        } else {
            ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
        }
        
        ctx.restore();
    },
    
    /**
     * Check if a point is inside the current selection
     */
    isPointInSelection(x, y) {
        if (!this.state.bounds) return false;
        
        const { x: sx, y: sy, width, height } = this.state.bounds;
        return x >= sx && x <= sx + width && y >= sy && y <= sy + height;
    },
    
    /**
     * Start selection operation
     */
    startSelection(x, y, type) {
        // Check if clicking inside existing selection with shift key - start moving
        if (this.state.pixels && this.isPointInSelection(x, y)) {
            this.startMoveSelection(x, y);
            return;
        }
        
        // Clear previous selection
        this.clearSelectionPreview();
        
        this.state.active = true;
        this.state.type = type;
        this.state.startX = x;
        this.state.startY = y;
        this.state.endX = x;
        this.state.endY = y;
        this.state.pixels = null;
        this.state.bounds = null;
        this.state.isMoving = false;
        
        if (type === 'lasso') {
            this.state.lassoPoints = [{ x, y }];
        } else if (type === 'shape') {
            // Magic wand - select immediately
            this.captureShapeSelection(x, y);
        }
    },
    
    /**
     * Start moving the selection content
     */
    startMoveSelection(x, y) {
        if (!this.state.pixels || !this.state.bounds) return;
        
        this.state.isMoving = true;
        this.state.moveStartX = x;
        this.state.moveStartY = y;
        this.state.originalPosition = { ...this.state.bounds };
        
        // Capture the floating image data if not already captured
        if (!this.state.floatingImageData) {
            const currentFrame = State.frames[State.currentFrameIndex];
            const layer = currentFrame.layers[State.activeLayerIndex];
            const { x: sx, y: sy, width, height } = this.state.bounds;
            
            // Create a temporary canvas to extract the selection
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Copy the selection area
            const layerCanvas = document.createElement('canvas');
            layerCanvas.width = State.width;
            layerCanvas.height = State.height;
            const layerCtxTemp = layerCanvas.getContext('2d');
            layerCtxTemp.putImageData(layer.data, 0, 0);
            
            tempCtx.drawImage(layerCanvas, sx, sy, width, height, 0, 0, width, height);
            this.state.floatingImageData = tempCtx.getImageData(0, 0, width, height);
            
            // Clear the original area on the layer
            layerCtxTemp.clearRect(sx, sy, width, height);
            layer.data = layerCtxTemp.getImageData(0, 0, State.width, State.height);
            
            // Update the layer canvas
            layerCtx.putImageData(layer.data, 0, 0);
            CanvasManager.render();
        }
        
        // Immediately draw the floating selection so it's visible
        this.drawFloatingSelection();
    },
    
    /**
     * Update selection during drag
     */
    updateSelection(x, y, shiftKey = false) {
        // Handle moving selection
        if (this.state.isMoving) {
            this.moveSelection(x, y);
            return;
        }
        
        // Check if shift is held and we have a selection - start moving
        if (shiftKey && this.state.pixels && this.isPointInSelection(x, y)) {
            this.startMoveSelection(x, y);
            return;
        }
        
        if (!this.state.active) return;
        
        this.state.endX = x;
        this.state.endY = y;
        
        if (this.state.type === 'lasso') {
            this.state.lassoPoints.push({ x, y });
        }
        
        this.drawSelectionPreview();
    },
    
    /**
     * Move the selection to a new position
     */
    moveSelection(x, y) {
        if (!this.state.isMoving || !this.state.bounds) return;
        
        const dx = x - this.state.moveStartX;
        const dy = y - this.state.moveStartY;
        
        // Update bounds
        this.state.bounds.x = this.state.originalPosition.x + dx;
        this.state.bounds.y = this.state.originalPosition.y + dy;
        
        // Draw the floating selection at the new position
        this.drawFloatingSelection();
    },
    
    /**
     * Draw the floating selection during move
     */
    drawFloatingSelection() {
        if (!this.state.floatingImageData || !this.state.bounds) return;
        
        // Ensure selection canvas exists
        if (!this.selectionCtx) {
            this.createSelectionCanvas();
            if (!this.selectionCtx) return;
        }
        
        this.updateSelectionCanvasSize();
        
        const ctx = this.selectionCtx;
        const scale = this.getScale();
        const { x, y, width, height } = this.state.bounds;
        
        // Clear the selection canvas
        ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        
        // Create a temporary canvas to draw the floating image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(this.state.floatingImageData, 0, 0);
        
        // Draw the floating content on the preview layer (low-res for the actual pixels)
        pCtx.clearRect(0, 0, State.width, State.height);
        pCtx.drawImage(tempCanvas, x, y);
        
        // Draw marching ants on the high-res selection canvas
        const sx = x * scale;
        const sy = y * scale;
        const sw = width * scale;
        const sh = height * scale;
        
        const dashSize = Math.max(2, scale);
        const lineWidth = Math.max(1, scale / 3);
        
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([dashSize, dashSize]);
        ctx.lineDashOffset = -this.marchingAntsOffset * scale;
        
        // Draw based on selection type
        if (this.state.type === 'circle') {
            // For circle selection, we need to store the original center and radius
            // Use the bounds to calculate the circle
            const centerX = x * scale + width * scale / 2;
            const centerY = y * scale + height * scale / 2;
            const r = (width * scale) / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.state.type === 'lasso' && this.state.lassoPoints.length > 1) {
            // For lasso, draw the polygon
            ctx.beginPath();
            ctx.moveTo(this.state.lassoPoints[0].x * scale, this.state.lassoPoints[0].y * scale);
            
            for (let i = 1; i < this.state.lassoPoints.length; i++) {
                ctx.lineTo(this.state.lassoPoints[i].x * scale, this.state.lassoPoints[i].y * scale);
            }
            
            ctx.closePath();
            ctx.stroke();
        } else {
            // Default to rectangle
            ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
        }
        
        // Draw white dashed line (offset)
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = -this.marchingAntsOffset * scale + dashSize;
        
        if (this.state.type === 'circle') {
            const centerX = x * scale + width * scale / 2;
            const centerY = y * scale + height * scale / 2;
            const r = (width * scale) / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.state.type === 'lasso' && this.state.lassoPoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.state.lassoPoints[0].x * scale, this.state.lassoPoints[0].y * scale);
            
            for (let i = 1; i < this.state.lassoPoints.length; i++) {
                ctx.lineTo(this.state.lassoPoints[i].x * scale, this.state.lassoPoints[i].y * scale);
            }
            
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
        }
        
        ctx.restore();
    },
    
    /**
     * End selection operation
     */
    endSelection(x, y) {
        // Handle end of move operation
        if (this.state.isMoving) {
            this.commitMoveSelection();
            return;
        }
        
        if (!this.state.active) return;
        
        this.state.active = false;
        this.state.endX = x;
        this.state.endY = y;
        
        // Capture the selected pixels
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        
        if (this.state.type === 'rect') {
            this.captureRectSelection(layer.data);
        } else if (this.state.type === 'circle') {
            this.captureCircleSelection(layer.data);
        } else if (this.state.type === 'lasso') {
            this.captureLassoSelection(layer.data);
        }
        // Shape selection is handled in startSelection
        
        // Keep the selection visible with marching ants
        if (this.state.bounds) {
            this.state.active = true;
            this.drawMarchingAnts();
        }
    },
    
    /**
     * Commit the move operation - place the floating selection on the layer
     */
    commitMoveSelection() {
        if (!this.state.floatingImageData || !this.state.bounds) return;
        
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const { x, y, width, height } = this.state.bounds;
        
        // Create a temporary canvas with the layer data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = State.width;
        tempCanvas.height = State.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(layer.data, 0, 0);
        
        // Draw the floating selection at the new position
        const floatCanvas = document.createElement('canvas');
        floatCanvas.width = width;
        floatCanvas.height = height;
        const floatCtx = floatCanvas.getContext('2d');
        floatCtx.putImageData(this.state.floatingImageData, 0, 0);
        
        tempCtx.drawImage(floatCanvas, x, y);
        
        // Update the layer
        layer.data = tempCtx.getImageData(0, 0, State.width, State.height);
        layerCtx.putImageData(layer.data, 0, 0);
        
        // Clear floating state
        this.state.isMoving = false;
        this.state.floatingImageData = null;
        this.state.originalPosition = null;
        
        // Update canvas
        CanvasManager.render();
        CanvasManager.saveLayerChange();
        
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }
        
        InputHandler.showNotification('Selection moved', 'success');
    },
    
    /**
     * Draw selection preview during drag
     */
    drawSelectionPreview() {
        // Ensure selection canvas exists
        if (!this.selectionCtx) {
            this.createSelectionCanvas();
            if (!this.selectionCtx) return;
        }
        
        this.updateSelectionCanvasSize();
        
        const ctx = this.selectionCtx;
        const scale = this.getScale();
        
        // Clear previous drawing
        ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        
        // Use black at 15% opacity for fill (like Piskel)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = Math.max(1, scale / 3);
        ctx.setLineDash([Math.max(2, scale), Math.max(2, scale)]);
        
        if (this.state.type === 'rect') {
            const x = Math.min(this.state.startX, this.state.endX) * scale;
            const y = Math.min(this.state.startY, this.state.endY) * scale;
            const w = Math.abs(this.state.endX - this.state.startX) * scale;
            const h = Math.abs(this.state.endY - this.state.startY) * scale;
            
            // Fill with light grey (black at 15% opacity)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        } else if (this.state.type === 'circle') {
            const r = Math.sqrt(
                Math.pow(this.state.endX - this.state.startX, 2) +
                Math.pow(this.state.endY - this.state.startY, 2)
            ) * scale;
            
            ctx.beginPath();
            ctx.arc(this.state.startX * scale, this.state.startY * scale, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fill();
            ctx.stroke();
        } else if (this.state.type === 'lasso' && this.state.lassoPoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.state.lassoPoints[0].x * scale, this.state.lassoPoints[0].y * scale);
            
            for (let i = 1; i < this.state.lassoPoints.length; i++) {
                ctx.lineTo(this.state.lassoPoints[i].x * scale, this.state.lassoPoints[i].y * scale);
            }
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    },
    
    /**
     * Clear selection preview
     */
    clearSelectionPreview() {
        pCtx.clearRect(0, 0, State.width, State.height);
        pCtx.setLineDash([]);
        
        // Also clear high-res selection canvas
        if (this.selectionCtx && this.selectionCanvas) {
            this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        }
    },
    
    /**
     * Clear the current selection
     */
    clearSelection() {
        // If there's a floating selection, commit it first
        if (this.state.floatingImageData) {
            this.commitMoveSelection();
        }
        
        this.state.active = false;
        this.state.type = null;
        this.state.pixels = null;
        this.state.bounds = null;
        this.state.lassoPoints = [];
        this.state.isMoving = false;
        this.state.floatingImageData = null;
        this.state.originalPosition = null;
        
        this.clearSelectionPreview();
        InputHandler.showNotification('Selection cleared', 'info');
    },
    
    /**
     * Capture rectangular selection
     */
    captureRectSelection(imageData) {
        const x0 = Math.min(this.state.startX, this.state.endX);
        const y0 = Math.min(this.state.startY, this.state.endY);
        const x1 = Math.max(this.state.startX, this.state.endX);
        const y1 = Math.max(this.state.startY, this.state.endY);
        
        const width = x1 - x0;
        const height = y1 - y0;
        
        if (width < 1 || height < 1) return;
        
        // Store bounds
        this.state.bounds = { x: x0, y: y0, width, height };
        
        // Create selection ImageData
        const selectionData = new ImageData(width, height);
        const srcData = imageData.data;
        const destData = selectionData.data;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = ((y0 + y) * State.width + (x0 + x)) * 4;
                const destIdx = (y * width + x) * 4;
                
                destData[destIdx] = srcData[srcIdx];
                destData[destIdx + 1] = srcData[srcIdx + 1];
                destData[destIdx + 2] = srcData[srcIdx + 2];
                destData[destIdx + 3] = srcData[srcIdx + 3];
            }
        }
        
        this.state.pixels = selectionData;
        InputHandler.showNotification(`Rectangle selection: ${width}×${height}`, 'success');
    },
    
    /**
     * Capture circular selection
     */
    captureCircleSelection(imageData) {
        const cx = this.state.startX;
        const cy = this.state.startY;
        const r = Math.floor(Math.sqrt(
            Math.pow(this.state.endX - cx, 2) +
            Math.pow(this.state.endY - cy, 2)
        ));
        
        if (r < 1) return;
        
        const diameter = r * 2;
        const x0 = cx - r;
        const y0 = cy - r;
        
        // Store bounds
        this.state.bounds = { x: x0, y: y0, width: diameter, height: diameter };
        
        // Create selection ImageData
        const selectionData = new ImageData(diameter, diameter);
        const srcData = imageData.data;
        const destData = selectionData.data;
        
        for (let y = 0; y < diameter; y++) {
            for (let x = 0; x < diameter; x++) {
                const dx = x - r;
                const dy = y - r;
                
                // Only include pixels inside the circle
                if (dx * dx + dy * dy <= r * r) {
                    const srcX = x0 + x;
                    const srcY = y0 + y;
                    
                    if (srcX >= 0 && srcX < State.width && srcY >= 0 && srcY < State.height) {
                        const srcIdx = (srcY * State.width + srcX) * 4;
                        const destIdx = (y * diameter + x) * 4;
                        
                        destData[destIdx] = srcData[srcIdx];
                        destData[destIdx + 1] = srcData[srcIdx + 1];
                        destData[destIdx + 2] = srcData[srcIdx + 2];
                        destData[destIdx + 3] = srcData[srcIdx + 3];
                    }
                }
            }
        }
        
        this.state.pixels = selectionData;
        InputHandler.showNotification(`Circle selection: radius ${r}`, 'success');
    },
    
    /**
     * Capture lasso selection
     */
    captureLassoSelection(imageData) {
        if (this.state.lassoPoints.length < 3) {
            InputHandler.showNotification('Lasso selection too small', 'error');
            return;
        }
        
        // Find bounding box
        let minX = State.width, minY = State.height, maxX = 0, maxY = 0;
        
        for (const point of this.state.lassoPoints) {
            minX = Math.min(minX, Math.floor(point.x));
            minY = Math.min(minY, Math.floor(point.y));
            maxX = Math.max(maxX, Math.ceil(point.x));
            maxY = Math.max(maxY, Math.ceil(point.y));
        }
        
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        
        // Store bounds
        this.state.bounds = { x: minX, y: minY, width, height };
        
        // Create selection ImageData
        const selectionData = new ImageData(width, height);
        const srcData = imageData.data;
        const destData = selectionData.data;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const canvasX = minX + x;
                const canvasY = minY + y;
                
                if (this.isPointInPolygon(canvasX, canvasY, this.state.lassoPoints)) {
                    const srcIdx = (canvasY * State.width + canvasX) * 4;
                    const destIdx = (y * width + x) * 4;
                    
                    destData[destIdx] = srcData[srcIdx];
                    destData[destIdx + 1] = srcData[srcIdx + 1];
                    destData[destIdx + 2] = srcData[srcIdx + 2];
                    destData[destIdx + 3] = srcData[srcIdx + 3];
                }
            }
        }
        
        this.state.pixels = selectionData;
        InputHandler.showNotification(`Lasso selection: ${width}×${height}`, 'success');
    },
    
    /**
     * Capture shape selection (magic wand)
     */
    captureShapeSelection(x, y) {
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const imageData = layer.data;
        const data = imageData.data;
        
        const startPos = (y * State.width + x) * 4;
        const targetR = data[startPos];
        const targetG = data[startPos + 1];
        const targetB = data[startPos + 2];
        const targetA = data[startPos + 3];
        
        if (targetA === 0) {
            InputHandler.showNotification('Cannot select transparent area', 'error');
            this.state.active = false;
            return;
        }
        
        const width = State.width;
        const height = State.height;
        const visited = new Uint8Array(width * height);
        const stack = [{ x, y }];
        const selectedPixels = [];
        const tolerance = 32;
        
        const matchColor = (px, py) => {
            if (px < 0 || px >= width || py < 0 || py >= height) return false;
            const idx = (py * width + px) * 4;
            return Math.abs(data[idx] - targetR) <= tolerance &&
                   Math.abs(data[idx + 1] - targetG) <= tolerance &&
                   Math.abs(data[idx + 2] - targetB) <= tolerance &&
                   Math.abs(data[idx + 3] - targetA) <= tolerance;
        };
        
        while (stack.length) {
            const { x: cx, y: cy } = stack.pop();
            const idx = cy * width + cx;
            
            if (visited[idx]) continue;
            visited[idx] = 1;
            
            if (!matchColor(cx, cy)) continue;
            
            selectedPixels.push({ x: cx, y: cy });
            
            if (cx > 0) stack.push({ x: cx - 1, y: cy });
            if (cx < width - 1) stack.push({ x: cx + 1, y: cy });
            if (cy > 0) stack.push({ x: cx, y: cy - 1 });
            if (cy < height - 1) stack.push({ x: cx, y: cy + 1 });
        }
        
        if (selectedPixels.length === 0) {
            InputHandler.showNotification('No pixels selected', 'error');
            this.state.active = false;
            return;
        }
        
        // Find bounding box
        let minX = width, minY = height, maxX = 0, maxY = 0;
        for (const pixel of selectedPixels) {
            minX = Math.min(minX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxX = Math.max(maxX, pixel.x);
            maxY = Math.max(maxY, pixel.y);
        }
        
        const selWidth = maxX - minX + 1;
        const selHeight = maxY - minY + 1;
        
        // Store bounds
        this.state.bounds = { x: minX, y: minY, width: selWidth, height: selHeight };
        
        // Create selection ImageData
        const selectionData = new ImageData(selWidth, selHeight);
        const destData = selectionData.data;
        
        for (const pixel of selectedPixels) {
            const srcIdx = (pixel.y * width + pixel.x) * 4;
            const destX = pixel.x - minX;
            const destY = pixel.y - minY;
            const destIdx = (destY * selWidth + destX) * 4;
            
            destData[destIdx] = data[srcIdx];
            destData[destIdx + 1] = data[srcIdx + 1];
            destData[destIdx + 2] = data[srcIdx + 2];
            destData[destIdx + 3] = data[srcIdx + 3];
        }
        
        this.state.pixels = selectionData;
        this.state.active = true;
        
        InputHandler.showNotification(`Magic wand: ${selectedPixels.length} pixels`, 'success');
    },
    
    /**
     * Point-in-polygon algorithm (ray casting)
     */
    isPointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    },
    
    /**
     * Copy selection to clipboard
     */
    copySelection() {
        if (!this.state.pixels) {
            InputHandler.showNotification('No selection to copy', 'error');
            return;
        }
        
        this.clipboard = {
            pixels: this.state.pixels,
            width: this.state.pixels.width,
            height: this.state.pixels.height
        };
        
        InputHandler.showNotification(`Copied: ${this.clipboard.width}×${this.clipboard.height}`, 'success');
    },
    
    /**
     * Cut selection (copy and delete)
     */
    cutSelection() {
        if (!this.state.pixels || !this.state.bounds) {
            InputHandler.showNotification('No selection to cut', 'error');
            return;
        }
        
        this.copySelection();
        this.deleteSelectionContent();
        InputHandler.showNotification('Selection cut', 'success');
    },
    
    /**
     * Delete selection content from layer
     */
    deleteSelectionContent() {
        if (!this.state.bounds) return;
        
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        const { x, y, width, height } = this.state.bounds;
        
        // Clear the selection area
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = State.width;
        tempCanvas.height = State.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(layer.data, 0, 0);
        tempCtx.clearRect(x, y, width, height);
        
        layer.data = tempCtx.getImageData(0, 0, State.width, State.height);
        layerCtx.putImageData(layer.data, 0, 0);
        
        CanvasManager.render();
        CanvasManager.saveLayerChange();
        
        if (typeof InputHandler !== 'undefined' && InputHandler.saveState) {
            InputHandler.saveState();
        }
        
        InputHandler.showNotification('Selection deleted', 'info');
    },
    
    /**
     * Paste selection to a new layer
     */
    pasteSelection() {
        if (!this.clipboard) {
            InputHandler.showNotification('Nothing to paste', 'error');
            return;
        }
        
        const currentFrame = State.frames[State.currentFrameIndex];
        
        // Create a new layer
        const newLayer = {
            name: 'Pasted Selection',
            visible: true,
            opacity: 1,
            data: new ImageData(State.width, State.height)
        };
        
        // Position at center
        const pasteX = Math.floor((State.width - this.clipboard.width) / 2);
        const pasteY = Math.floor((State.height - this.clipboard.height) / 2);
        
        // Create temporary canvas to position the paste
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = State.width;
        tempCanvas.height = State.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(this.clipboard.pixels, pasteX, pasteY);
        
        newLayer.data = tempCtx.getImageData(0, 0, State.width, State.height);
        
        // Add layer
        currentFrame.layers.push(newLayer);
        State.activeLayerIndex = currentFrame.layers.length - 1;
        
        // Update UI
        CanvasManager.render();
        LayerManager.renderList();
        
        // Set up selection on the pasted content
        this.state.active = true;
        this.state.bounds = {
            x: pasteX,
            y: pasteY,
            width: this.clipboard.width,
            height: this.clipboard.height
        };
        this.state.pixels = this.clipboard.pixels;
        
        InputHandler.showNotification(`Pasted: ${this.clipboard.width}×${this.clipboard.height}`, 'success');
    },
    
    /**
     * Select all content on current layer
     */
    selectAll() {
        const currentFrame = State.frames[State.currentFrameIndex];
        const layer = currentFrame.layers[State.activeLayerIndex];
        
        this.state.active = true;
        this.state.type = 'rect';
        this.state.bounds = { x: 0, y: 0, width: State.width, height: State.height };
        this.state.pixels = new ImageData(
            new Uint8ClampedArray(layer.data.data),
            State.width,
            State.height
        );
        
        this.drawMarchingAnts();
        InputHandler.showNotification('All selected', 'success');
    },
    
    /**
     * Check if selection tool is active
     */
    isSelectionTool(tool) {
        return tool && tool.startsWith('select-');
    },
    
    /**
     * Get selection type from tool name
     */
    getSelectionType(tool) {
        if (!tool) return null;
        return tool.replace('select-', '');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    SelectionToolManager.init();
});
