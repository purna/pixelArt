/**
 * Tutorial Configuration System
 *
 * This file defines the tutorial steps configuration and provides
 * an easy-to-use interface for setting up tutorials.
 */

/*
Config Seettings
arrowPositionOverride
Vertical Arrows (top/bottom): 'top-third', 'middle-third', 'bottom-third'
Horizontal Arrows (left/right): 'left-third', 'center-third', 'right-third'
Center Position: 'center' (default)
*/

class TutorialConfig {
    constructor() {
        // Default tutorial configuration
        this.tutorials = {
            'main': {
                enabled: true,
                steps: [
                    {
                        id: 'welcome',
                        elementId: 'canvas-wrapper',
                        position: 'center',
                        arrowPosition: 'none', // No arrow for center position
                        arrowPositionOverride: 'center', // Arrow position along the side (center, top-third, middle-third, bottom-third)
                        marginOverride: '0',
                        heading: 'Welcome to Pixel Art Studio Pro!',
                        content: 'This quick tutorial will guide you through the main features of the Pixel Art Studio Pro application.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'toolbar',
                        elementId: 'tool-buttons',
                        position: 'left',
                        arrowPosition: 'right', // Arrow is on the right side of the tutorial panel, points right (towards target panel)
                        arrowPositionOverride: 'middle-third', // Arrow positioned in the middle third of the left side
                        marginOverride: '20px', // Additional margin for better spacing
                        heading: 'Tool Bar',
                        content: 'Here you can find all your drawing tools including Pencil, Brush, Eraser, Fill Bucket, and various shape tools. Each tool has keyboard shortcuts for quick access.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'layers',
                        elementId: 'panel-layers',
                        position: 'right',
                        arrowPosition: 'left', // Arrow is on the left side of the tutorial panel, points left (away from tutorial panel)
                        arrowPositionOverride: 'top-third', // Arrow positioned in the top third of the right side
                        marginOverride: '60px', // Additional margin for better spacing
                        heading: 'Layers Panel',
                        content: 'Manage your artwork layers here. Add, remove, reorder, and toggle visibility of layers to organize your pixel art.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'palette',
                        elementId: 'panel-palette',
                        position: 'right',
                        arrowPosition: 'left', // Arrow is on the left side of the tutorial panel, points left (away from tutorial panel)
                        marginOverride: '35px', // Slightly less margin for this panel
                        heading: 'Color Palette',
                        content: 'Choose and manage your colors here. Click on swatches to select colors, or use the color picker for custom colors. Save your favorite colors to your palette.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'timeline',
                        elementId: 'timeline-panel',
                        position: 'bottom',
                        arrowPosition: 'top', // Arrow is on the top side of the tutorial panel, points up (towards target panel)
                        marginOverride: '10px', // Margin for timeline positioning
                        heading: 'Animation Timeline',
                        content: 'Create frame-by-frame animations with the timeline. Add, duplicate, and delete frames to bring your pixel art to life. Use the play/stop buttons to preview your animation.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'export',
                        elementId: 'downloadSheetBtn',
                        position: 'top',
                        arrowPosition: 'bottom', // Arrow is on the bottom side of the tutorial panel, points down (towards target panel)
                        marginOverride: '15px', // Margin for export button positioning
                        heading: 'Export Your Artwork',
                        content: 'When you\'re happy with your creation, use the Export button to save your pixel art as an image file or share it with others.',
                        showNext: true,
                        showSkip: true
                    }
                ]
            }
        };

        // Current tutorial state
        this.currentTutorial = 'main';
        this.currentStep = 0;
        this.isActive = false;
        this.showHints = true;
    }

    /**
     * Add a new tutorial
     * @param {string} tutorialId - Unique identifier for the tutorial
     * @param {Object} config - Tutorial configuration
     */
    addTutorial(tutorialId, config) {
        this.tutorials[tutorialId] = config;
    }

    /**
     * Get tutorial by ID
     * @param {string} tutorialId - Tutorial identifier
     * @returns {Object|null} Tutorial configuration or null if not found
     */
    getTutorial(tutorialId) {
        return this.tutorials[tutorialId] || null;
    }

    /**
     * Get current step in current tutorial
     * @returns {Object|null} Current step or null if no active tutorial
     */
    getCurrentStep() {
        const tutorial = this.getTutorial(this.currentTutorial);
        if (!tutorial || !tutorial.steps || this.currentStep >= tutorial.steps.length) {
            return null;
        }
        return tutorial.steps[this.currentStep];
    }

    /**
     * Move to next step
     * @returns {Object|null} Next step or null if tutorial is complete
     */
    nextStep() {
        const tutorial = this.getTutorial(this.currentTutorial);
        if (!tutorial || !tutorial.steps) return null;

        this.currentStep++;
        if (this.currentStep >= tutorial.steps.length) {
            // Tutorial complete
            return null;
        }
        return this.getCurrentStep();
    }

    /**
     * Move to previous step
     * @returns {Object|null} Previous step or null if at beginning
     */
    prevStep() {
        if (this.currentStep <= 0) return null;
        this.currentStep--;
        return this.getCurrentStep();
    }

    /**
     * Reset tutorial to first step
     */
    resetTutorial() {
        this.currentStep = 0;
    }

    /**
     * Start a specific tutorial
     * @param {string} tutorialId - Tutorial to start
     */
    startTutorial(tutorialId) {
        if (this.tutorials[tutorialId]) {
            this.currentTutorial = tutorialId;
            this.currentStep = 0;
            this.isActive = true;
        }
    }

    /**
     * Stop current tutorial
     */
    stopTutorial() {
        this.isActive = false;
    }

    /**
     * Check if tutorial is active
     * @returns {boolean} True if tutorial is active
     */
    isTutorialActive() {
        return this.isActive;
    }

    /**
     * Get position class for tutorial step
     * @param {string} position - Position value from step config
     * @returns {string} CSS class for positioning
     */
    getPositionClass(position) {
        switch(position) {
            case 'top': return 'tutorial-top';
            case 'bottom': return 'tutorial-bottom';
            case 'left': return 'tutorial-left';
            case 'right': return 'tutorial-right';
            case 'center': return 'tutorial-center';
            default: return 'tutorial-right';
        }
    }
}

// Export for use in other modules
const tutorialConfig = new TutorialConfig();