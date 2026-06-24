/**
 * Right Panel Manager
 * Handles tabbed interface for effects panel and other right panel functionality
 */

class RightPanelManager {
    constructor() {
        this.activeEffectsTab = 'mirror'; // Default active tab
        this.activeTransformTab = 'move'; // Default active transform tab
        this.init();
    }

    init() {
        this.bindEvents();
        // Set initial active tabs
        this.setActiveEffectsTab(this.activeEffectsTab);
        this.setActiveTransformTab(this.activeTransformTab);
    }

    /**
     * Set active effects tab
     */
    setActiveEffectsTab(tabType) {
        // Hide all sub-panels
        const allPanels = document.querySelectorAll('#effects-panel .sub-panel-section');
        allPanels.forEach(panel => {
            panel.classList.add('hidden');
        });

        // Show selected panel
        const selectedPanel = document.getElementById(this.getEffectsPanelId(tabType));
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
        }

        // Update button highlighting
        const allButtons = document.querySelectorAll('#effects-container [data-content]');
        allButtons.forEach(button => {
            if (button.dataset.content === this.getEffectsPanelId(tabType)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        this.activeEffectsTab = tabType;

        // Trigger custom event for other modules
        document.dispatchEvent(new CustomEvent('effectsTabChanged', {
            detail: { tabType }
        }));
    }

    /**
     * Set active transform tab
     */
    setActiveTransformTab(tabType) {
        // Hide all sub-panels
        const allPanels = document.querySelectorAll('#transform-panel .sub-panel-section');
        allPanels.forEach(panel => {
            panel.classList.add('hidden');
        });

        // Show selected panel
        const selectedPanel = document.getElementById(this.getTransformPanelId(tabType));
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
        }

        // Update button highlighting
        const allButtons = document.querySelectorAll('#transform-container [data-content]');
        allButtons.forEach(button => {
            if (button.dataset.content === this.getTransformPanelId(tabType)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        this.activeTransformTab = tabType;

        // Trigger custom event for other modules
        document.dispatchEvent(new CustomEvent('transformTabChanged', {
            detail: { tabType }
        }));
    }

    /**
     * Get panel ID for transform type
     */
    getTransformPanelId(transformType) {
        const panelMap = {
            'move': 'move-options',
            'rotate': 'rotate-options',
            'flip': 'flip-options',
            'align': 'align-options'
        };
        return panelMap[transformType];
    }

    /**
     * Get panel ID for effect type
     */
    getEffectsPanelId(effectType) {
        const panelMap = {
            'mirror': 'mirror-options',
            'dither': 'dither-options',
            'contrast': 'contrast-options',
            'filters': 'filters-options'
        };
        return panelMap[effectType];
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Effects panel button clicks
        const effectsContainer = document.getElementById('effects-container');
        if (effectsContainer) {
            effectsContainer.addEventListener('click', (e) => {
                const effectButton = e.target.closest('[data-content]');
                if (!effectButton) return;

                e.preventDefault(); e.stopPropagation();
                const contentId = effectButton.dataset.content;
                const effectType = contentId.replace('-options', ''); // e.g., "mirror-options" -> "mirror"
                
                // First, ensure the parent 'Effects' tab is active
                const effectsTab = document.querySelector('.panel-tab[data-content="effects-panel"]');
                if (effectsTab && !effectsTab.classList.contains('active')) {
                    selectPanelTab(effectsTab);
                }

                // Then, set the active sub-tab
                this.setActiveEffectsTab(effectType); 
            });
        }

        // Transform panel button clicks - This is the key fix
        const transformContainer = document.getElementById('transform-container');
        if (transformContainer) {
            transformContainer.addEventListener('click', (e) => {
                const transformButton = e.target.closest('[data-content]');
                if (!transformButton) return;

                e.preventDefault(); e.stopPropagation();
                const contentId = transformButton.dataset.content;
                const transformType = contentId.replace('-options', '');

                // First, ensure the parent 'Transform' tab is active
                const transformTab = document.querySelector('.panel-tab[data-content="transform-panel"]');
                if (transformTab && !transformTab.classList.contains('active')) {
                    selectPanelTab(transformTab);
                }

                // Then, set the active sub-tab
                this.setActiveTransformTab(transformType);
            });
        }

        // Handle toggle section buttons
        document.addEventListener('click', (e) => {
            // Check if the click target is a toggle button or a child of a toggle button
            const toggleButton = e.target.closest('.toggle-sect-btn') || e.target.closest('.section-toggle');
            if (toggleButton) {
                const targetId = toggleButton.dataset.target;
                if (targetId) {
                    this.toggleSection(targetId);
                }
            }
        });
    }

    /**
     * Toggle panel section - updated to work with dropins-container
     */
    toggleSection(sectionId) {
        // Find the section in the entire document (not just dropins-container)
        const section = document.getElementById(sectionId);
        if (!section) {
            console.warn(`Section not found: ${sectionId}`);
            return;
        }

        // Find the parent panel-section element to toggle the minimized class
        const panelSection = section.closest('.panel-section');
        if (panelSection) {
            panelSection.classList.toggle('minimized');
        } else {
            // Fallback to original behavior if no panel-section parent found
            section.classList.toggle('minimized');
        }

        // Find the toggle button that controls this section
        const button = document.querySelector(`[data-target="${sectionId}"]`);
        if (button) {
            const icon = button.querySelector('i');
            // Check if the panel section is minimized (or the section itself if no parent)
            const isMinimized = panelSection ? panelSection.classList.contains('minimized') : section.classList.contains('minimized');
            if (isMinimized) {
                icon.className = 'fas fa-plus';
            } else {
                icon.className = 'fas fa-minus';
            }
        } else {
            console.warn(`Toggle button not found for section: ${sectionId}`);
        }
    }

    /**
     * Get current active effects tab
     */
    getActiveEffectsTab() {
        return this.activeEffectsTab;
    }

    /**
     * Switch to specific effects tab programmatically
     */
    switchToEffectsTab(tabType) {
        this.setActiveEffectsTab(tabType);
    }

    /**
     * Get current active transform tab
     */
    getActiveTransformTab() {
        return this.activeTransformTab;
    }

    /**
     * Switch to specific transform tab programmatically
     */
    switchToTransformTab(tabType) {
        this.setActiveTransformTab(tabType);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rightPanelManager = new RightPanelManager();

    // Initialize tabbed interface
    initTabbedInterface();

    // Set up panel toggle button for dropins-container
    setupPanelToggle();

    // Set up timeline panel toggle button
    setupTimelineToggle();

    // Initialize floating panels (draggable color history and brush controls)
    FloatingPanelManager.init();
});

// Set up the floating panel toggle button
function setupPanelToggle() {
    const panelToggle = document.getElementById('panel-toggle');
    if (panelToggle) {
        panelToggle.addEventListener('click', () => {
            const container = document.querySelector('.dropins-container.right');
            if (container) {
                container.classList.toggle('closed');
                panelToggle.classList.toggle('closed-toggle');

                const icon = panelToggle.querySelector('i');
                if (container.classList.contains('closed')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-left';
                }
            }
        });
    }
}

// Set up timeline panel toggle button
function setupTimelineToggle() {
    const timelineToggle = document.getElementById('panel-toggle-timeline');
    if (timelineToggle) {
        timelineToggle.addEventListener('click', () => {
            const timelinePanel = document.querySelector('.timeline-panel');
            if (timelinePanel) {
                timelinePanel.classList.toggle('closed');
                timelineToggle.classList.toggle('closed-toggle');

                const icon = timelineToggle.querySelector('i');
                if (timelinePanel.classList.contains('closed')) {
                    icon.className = 'fas fa-chevron-up';
                } else {
                    icon.className = 'fas fa-chevron-down';
                }
            }
        });
    }
}

// Tabbed Interface Functionality
function initTabbedInterface() {
    // Set up tab clicking for main panel tabs
    const panelTabs = document.querySelectorAll('.panel-tab');
    panelTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            selectPanelTab(this);
        });
    });

    // Set initial active tab
    const initialActiveTab = document.querySelector('.panel-tab.active');
    if (initialActiveTab) {
        const contentId = initialActiveTab.dataset.content;
        const initialContent = document.getElementById(contentId);
        if (initialContent) {
            // Add active class to the aside element instead of its child
            initialContent.classList.add('active');
        }
    }
}



function selectPanelTab(el) {
    const container = el.closest(".dropins-container");
    if (!container) return;

    const activeTab = container.querySelector(".panel-tab.active");
    const relContent = document.getElementById(el.dataset.content);

    if (!relContent) {
        console.error('Content not found for tab:', el.dataset.content);
        return;
    }
    

    // Find the panel-tab-content element inside the targeted aside
    const targetPanelContent = relContent.querySelector('.panel-tab-content');

    if (!targetPanelContent) {
        //console.error('Panel tab content not found inside:', el.dataset.content);
        return;
    }
  

    // Hide ALL tab contents first
    const allTabContents = container.querySelectorAll('.panel-tab-content');
    allTabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all aside elements
    const allActiveAsides = container.querySelectorAll('aside.content.active');
    allActiveAsides.forEach(aside => {
        aside.classList.remove('active');
    });

    // Remove active class from all tabs
    const allTabs = container.querySelectorAll('.panel-tab.active');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Add active class to the aside element instead of its child
    relContent.classList.add('active');

    // Add active class to the tab
    el.classList.add('active');

    // Special handling for effects panel - ensure panel-effects is visible
    if (el.dataset.content === 'effects-panel') {
        const panelEffects = document.getElementById('effects-panel');
        if (panelEffects) panelEffects.classList.remove('hidden');
    }

    // Special handling for transform panel - ensure transform-container is visible
    if (el.dataset.content === 'transform-panel') {
        const transformContainer = document.getElementById('transform-container');
        if (transformContainer) transformContainer.classList.remove('hidden');
    }

    // Add active class to the target panel content
    targetPanelContent.classList.add('active');

    // Ensure container is showing
    if (!container.classList.contains("showing")) {
        container.classList.add("showing");
    }

}




// Update panel toggle button icon and position based on container state
function updatePanelToggleIcon() {
    const container = document.querySelector('.dropins-container.right');
    const panelToggle = document.getElementById('panel-toggle');
    if (container && panelToggle) {
        const icon = panelToggle.querySelector('i');

        if (container.classList.contains('closed')) {
            icon.className = 'fas fa-chevron-right';
            panelToggle.classList.add('closed-toggle');
        } else {
            icon.className = 'fas fa-chevron-left';
            panelToggle.classList.remove('closed-toggle');
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RightPanelManager;
}
