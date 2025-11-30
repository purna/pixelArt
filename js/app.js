// app.js
// Application initialization and startup

/**
 * Initialize the application
 */
function init() {
    // Initialize canvas with default size
    CanvasManager.init(Config.defaultWidth, Config.defaultHeight);
    
    // NEW: Initialize current palette (assuming Config.defaultPalette exists or is defined in state.js)
    if (!State.currentPalette || State.currentPalette.length === 0) {
        // Example default palette - adjust based on your state/config.js
        State.currentPalette = Config.defaultPalette || ['#000000', '#ffffff', '#ff0000', '#0000ff', '#00ff00']; 
    }
    // Render initial UI
    ColorManager.render();
    LayerManager.renderList();
    AnimationManager.renderTimeline();
    
    // Set up event listeners
    InputHandler.init();
    
    console.log('PixlPro v3.1 initialized');
    console.log('Keyboard shortcuts:');
    console.log('  P - Pencil, B - Brush, E - Eraser, F - Fill');
    console.log('  V - Mirror, D - Dither');
    console.log('  L - Line, R - Rectangle, C - Circle');
    console.log('  I - Eyedropper, M - Move');
    console.log('  Space - Play/Stop animation');
    console.log('  Arrow Keys - Navigate frames');
    console.log('  +/- - Zoom in/out, 0 - Reset zoom');
    console.log('  Ctrl+S - Save project, Ctrl+O - Load project');
    console.log('  Ctrl+Scroll - Zoom');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
