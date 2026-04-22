// animation-manager.js
// Handles frame management and animation playback

const AnimationManager = {
    /**
     * Render the timeline with all frames
     */
    renderTimeline() {
        UI.framesList.innerHTML = '';
        
        State.frames.forEach((frame, i) => {
            const div = document.createElement('div');
            div.className = `frame-thumb ${i === State.currentFrameIndex ? 'active' : ''}`;
            div.setAttribute('data-index', i);
            div.onclick = () => this.switchFrame(i);
            
            // Add drag events for reordering
            div.setAttribute('draggable', 'true');
            
            // Create thumbnail by copying from composition canvas
            const canvas = document.createElement('canvas');
            canvas.width = State.width;
            canvas.height = State.height;
            const ctx = canvas.getContext('2d');

            // Save current frame index
            const currentFrameIndex = State.currentFrameIndex;

            // Temporarily switch to this frame to render it
            State.currentFrameIndex = i;
            CanvasManager.render();

            // Copy the rendered composition to thumbnail
            ctx.drawImage(UI.compositionCanvas, 0, 0);

            // Restore current frame index
            State.currentFrameIndex = currentFrameIndex;
            
            div.appendChild(canvas);
            
            // Frame number label
            const num = document.createElement('span');
            num.className = "frame-number";
            num.innerText = i + 1;
            div.appendChild(num);
            
            UI.framesList.appendChild(div);
        });
        
        this.setupDragAndDrop();
    },
    
    /**
     * Set up drag and drop for frame reordering
     */
    setupDragAndDrop() {
        const frames = UI.framesList.querySelectorAll('.frame-thumb');
        
        frames.forEach((frame, index) => {
            frame.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                frame.classList.add('dragging');
            });
            
            frame.addEventListener('dragend', () => {
                frame.classList.remove('dragging');
                frames.forEach(f => f.classList.remove('drag-over', 'drag-over-last'));
            });
            
            frame.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const rect = frame.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                frames.forEach(f => f.classList.remove('drag-over', 'drag-over-last'));
                
                if (e.clientY < midpoint) {
                    frame.classList.add('drag-over');
                } else {
                    frame.classList.add('drag-over-last');
                }
            });
            
            frame.addEventListener('dragleave', () => {
                frame.classList.remove('drag-over', 'drag-over-last');
            });
            
            frame.addEventListener('drop', (e) => {
                e.preventDefault();
                
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (isNaN(draggedIndex)) return;
                
                const dropIndex = parseInt(frame.getAttribute('data-index'), 10);
                if (dropIndex === draggedIndex || dropIndex < 0) return;
                
                // Get the dragged frame
                const draggedFrame = State.frames.splice(draggedIndex, 1)[0];
                
                // Adjust drop index if needed
                const actualDropIndex = (draggedIndex < dropIndex) ? dropIndex : dropIndex;
                State.frames.splice(actualDropIndex, 0, draggedFrame);
                
                // Update current frame index if needed
                if (State.currentFrameIndex === draggedIndex) {
                    State.currentFrameIndex = actualDropIndex;
                } else if (draggedIndex < State.currentFrameIndex && actualDropIndex >= State.currentFrameIndex) {
                    State.currentFrameIndex--;
                } else if (draggedIndex > State.currentFrameIndex && actualDropIndex <= State.currentFrameIndex) {
                    State.currentFrameIndex++;
                }
                
                // Re-render the timeline
                this.renderTimeline();
                
                // Update canvas
                CanvasManager.render();
                
                // Update frame badge
                if (UI.frameDisplay) {
                    UI.frameDisplay.textContent = `${State.currentFrameIndex + 1} / ${State.frames.length}`;
                }
            });
        });
    },

    /**
     * Update a specific frame's thumbnail
     */
    updateTimelineThumb(index) {
        if (!UI.framesList.children[index]) return;

        const canvas = UI.framesList.children[index].querySelector('canvas');
        const ctx = canvas.getContext('2d');

        // Save current frame index
        const currentFrameIndex = State.currentFrameIndex;

        // Temporarily switch to this frame to render it
        State.currentFrameIndex = index;
        CanvasManager.render();

        // Copy the rendered composition to thumbnail
        ctx.drawImage(UI.compositionCanvas, 0, 0);

        // Restore current frame index
        State.currentFrameIndex = currentFrameIndex;
    },

    /**
     * Switch to a different frame
     */
    switchFrame(index) {
        if (index < 0 || index >= State.frames.length) return;

        State.currentFrameIndex = index;
        LayerManager.renderList();
        CanvasManager.render();

        // Update active state in timeline
        Array.from(UI.framesList.children).forEach((el, idx) => {
            el.classList.toggle('active', idx === index);
            el.classList.toggle('onion-before',
                State.onionSkinEnabled &&
                idx > State.currentFrameIndex - State.onionSkinFramesBefore &&
                idx < State.currentFrameIndex
            );
            el.classList.toggle('onion-after',
                State.onionSkinEnabled &&
                idx > State.currentFrameIndex &&
                idx <= State.currentFrameIndex + State.onionSkinFramesAfter
            );
        });

        // Update frame badge
        if (UI.frameDisplay) {
            UI.frameDisplay.textContent = `${State.currentFrameIndex + 1} / ${State.frames.length}`;
        }
    },

    /**
     * Add a new frame
     */
    addFrame() {
        // Create new frame with same layer structure as current frame
        const newLayers = State.frames[0].layers.map(layer => 
            CanvasManager.createLayer(layer.name)
        );
        
        State.frames.splice(State.currentFrameIndex + 1, 0, { layers: newLayers });
        this.switchFrame(State.currentFrameIndex + 1);
        this.renderTimeline();
    },

    /**
     * Duplicate current frame
     */
    duplicateFrame() {
        const src = State.frames[State.currentFrameIndex];
        
        // Deep copy all layers
        const newLayers = src.layers.map(layer => ({
            name: layer.name,
            visible: layer.visible,
            data: new ImageData(new Uint8ClampedArray(layer.data.data), State.width, State.height)
        }));
        
        State.frames.splice(State.currentFrameIndex + 1, 0, { layers: newLayers });
        this.switchFrame(State.currentFrameIndex + 1);
        this.renderTimeline();
    },

    /**
     * Delete a frame
     */
    deleteFrame() {
        if (State.frames.length <= 1) {
            alert('Cannot delete the last frame');
            return;
        }
        
        if (!confirm('Delete this frame?')) return;
        
        State.frames.splice(State.currentFrameIndex, 1);
        
        if (State.currentFrameIndex >= State.frames.length) {
            State.currentFrameIndex = State.frames.length - 1;
        }
        
        this.switchFrame(State.currentFrameIndex);
        this.renderTimeline();
    },

    /**
     * Start animation playback
     */
    play() {
        // If already playing, just return (don't restart)
        if (State.isPlaying) {
            return;
        }

        State.isPlaying = true;
        this.syncUIState();

        let frameIndex = 0;
        const loop = () => {
            if (!State.isPlaying) return;

            prevCtx.clearRect(0, 0, State.width, State.height);

            // Composite frame layers
            State.frames[frameIndex].layers.forEach(layer => {
                if (layer.visible) {
                    const temp = document.createElement('canvas');
                    temp.width = State.width;
                    temp.height = State.height;
                    temp.getContext('2d').putImageData(layer.data, 0, 0);
                    prevCtx.drawImage(temp, 0, 0);
                }
            });

            frameIndex = (frameIndex + 1) % State.frames.length;
            State.timer = setTimeout(loop, 1000 / State.fps);
        };

        loop();
    },

    /**
     * Stop animation playback
     */
    stop() {
        State.isPlaying = false;
        clearTimeout(State.timer);
        this.syncUIState();
        CanvasManager.render(); // Restore current frame view
    },

    /**
     * Synchronize UI state with internal animation state
     */
    syncUIState() {
        if (State.isPlaying) {
            UI.playBtn.classList.add('active');
        } else {
            UI.playBtn.classList.remove('active');
        }
    },

    /**
     * Update FPS and restart animation if playing
     */
    updateFPS(fps) {
        State.fps = fps;
        UI.fpsDisplay.textContent = `${fps} FPS`;

        if (State.isPlaying) {
            // Clear the existing timer
            clearTimeout(State.timer);

            // Restart the animation loop with the new FPS
            let frameIndex = 0;
            const loop = () => {
                if (!State.isPlaying) return;

                prevCtx.clearRect(0, 0, State.width, State.height);

                // Composite frame layers
                State.frames[frameIndex].layers.forEach(layer => {
                    if (layer.visible) {
                        const temp = document.createElement('canvas');
                        temp.width = State.width;
                        temp.height = State.height;
                        temp.getContext('2d').putImageData(layer.data, 0, 0);
                        prevCtx.drawImage(temp, 0, 0);
                    }
                });

                frameIndex = (frameIndex + 1) % State.frames.length;
                State.timer = setTimeout(loop, 1000 / State.fps);
            };

            loop();
        }

        // Ensure UI state is synchronized
        this.syncUIState();
    },


};
