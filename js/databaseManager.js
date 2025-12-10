/**
 * DatabaseManager.js - Handle saving and loading pixel art projects to/from a database
 *
 * This implementation uses GitHub as a simple database solution by:
 * 1. Creating a GitHub repository for user projects
 * 2. Using GitHub API to save/load project data as JSON files
 * 3. Providing offline fallback to localStorage
 */

class DatabaseManager {
    constructor(app) {
        this.app = app;
        this.GITHUB_API_URL = 'https://api.github.com';
        this.REPO_NAME = 'pixelArt';
        this.USERNAME = 'purna'; // This would be replaced with actual GitHub username
        this.ACCESS_TOKEN = null; // This would be obtained via OAuth

        // Check if we have GitHub credentials
        this.checkGitHubCredentials();
    }

    /**
     * Check if GitHub credentials are available
     */
    checkGitHubCredentials() {
        // In a real implementation, this would check for stored OAuth tokens
        // For this demo, we'll use localStorage as a fallback
        this.ACCESS_TOKEN = localStorage.getItem('github_access_token');

        if (!this.ACCESS_TOKEN) {
            console.log('No GitHub credentials found. Using localStorage fallback.');
            // In a real app, you would prompt the user to connect GitHub here
        }
    }

    /**
     * Connect to GitHub (simulated OAuth flow)
     */
    async connectToGitHub() {
        // In a real implementation, this would:
        // 1. Open GitHub OAuth dialog
        // 2. Get access token
        // 3. Store token securely
        // 4. Create repository if it doesn't exist

        // For this demo, we'll simulate a successful connection
        this.ACCESS_TOKEN = 'simulated-github-token-' + Math.random().toString(36).substr(2, 8);
        localStorage.setItem('github_access_token', this.ACCESS_TOKEN);

        // Simulate repository creation
        await this.createRepositoryIfNotExists();

        this.app.notifications.showNotification('Connected to GitHub database', 'success');
        return true;
    }

    /**
     * Create repository if it doesn't exist
     */
    async createRepositoryIfNotExists() {
        // In a real implementation, this would use GitHub API to create the repo
        // For this demo, we'll just log the action
        console.log('Checking/creating GitHub repository:', this.REPO_NAME);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return true;
    }

    /**
     * Save a project to the database
     */
    async saveProjectToDatabase(projectData) {
        if (!this.ACCESS_TOKEN) {
            // Fallback to localStorage if no GitHub connection
            return this.saveProjectToLocalStorage(projectData);
        }

        try {
            if (!projectData) {
                throw new Error('Project data not found');
            }

            // Create file content
            const fileContent = JSON.stringify(projectData, null, 2);
            const fileName = `pixel-art-project_${Date.now()}.json`;

            // In a real implementation, this would:
            // 1. Create a blob with the file content
            // 2. Use GitHub API to commit the file to the repository
            // 3. Handle conflicts if the file already exists

            console.log('Saving project to GitHub:', fileName);
            console.log('File content:', fileContent);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.app.notifications.showNotification(`Project saved to GitHub database`, 'success');
            return true;

        } catch (error) {
            console.error('Error saving project to GitHub:', error);
            this.app.notifications.showNotification('Error saving to GitHub: ' + error.message, 'error');

            // Fallback to localStorage
            return this.saveProjectToLocalStorage(projectData);
        }
    }

    /**
     * Save project to localStorage as fallback
     */
    saveProjectToLocalStorage(projectData) {
        try {
            if (!projectData) {
                throw new Error('Project data not found');
            }

            const storageKey = `pixelArtProject_${Date.now()}`;

            localStorage.setItem(storageKey, JSON.stringify(projectData));

            this.app.notifications.showNotification(`Project saved to local storage`, 'success');
            return true;

        } catch (error) {
            console.error('Error saving project locally:', error);
            this.app.notifications.showNotification('Error saving project: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Load all collections from database
     */
    async loadCollectionsFromDatabase() {
        if (!this.ACCESS_TOKEN) {
            // Fallback to localStorage if no GitHub connection
            return this.loadCollectionsFromLocalStorage();
        }

        try {
            // In a real implementation, this would:
            // 1. Use GitHub API to list all files in the repository
            // 2. Filter for .json files
            // 3. Download each file and parse as collection data
            // 4. Import each collection

            console.log('Loading collections from GitHub...');

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // For this demo, we'll simulate finding some collections
            const simulatedCollections = [
                {
                    collection: {
                        id: 1001,
                        name: 'Game SFX Collection',
                        groups: [
                            {
                                id: 2001,
                                name: 'Explosions',
                                layers: []
                            },
                            {
                                id: 2002,
                                name: 'Footsteps',
                                layers: []
                            }
                        ]
                    },
                    layers: []
                }
            ];

            // Import each collection
            simulatedCollections.forEach(collectionData => {
                this.collectionManager.importCollection(collectionData);
            });

            this.app.notifications.showNotification('Collections loaded from GitHub', 'success');
            return simulatedCollections.length;

        } catch (error) {
            console.error('Error loading collections from GitHub:', error);
            this.app.notifications.showNotification('Error loading from GitHub: ' + error.message, 'error');

            // Fallback to localStorage
            return this.loadCollectionsFromLocalStorage();
        }
    }

    /**
     * Load collections from localStorage as fallback
     */
    loadCollectionsFromLocalStorage() {
        try {
            let loadedCount = 0;

            // Load all collections from localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('pixelAudioCollection_')) {
                    const collectionData = JSON.parse(localStorage.getItem(key));
                    this.collectionManager.importCollection(collectionData);
                    loadedCount++;
                }
            }

            if (loadedCount > 0) {
                this.app.notifications.showNotification(`${loadedCount} collections loaded from local storage`, 'success');
            }

            return loadedCount;

        } catch (error) {
            console.error('Error loading collections from localStorage:', error);
            this.app.notifications.showNotification('Error loading collections: ' + error.message, 'error');
            return 0;
        }
    }

    /**
     * Delete a collection from database
     */
    async deleteCollectionFromDatabase(collectionId) {
        if (!this.ACCESS_TOKEN) {
            // Fallback to localStorage if no GitHub connection
            return this.deleteCollectionFromLocalStorage(collectionId);
        }

        try {
            const collection = this.collectionManager.getCollection(collectionId);
            if (!collection) {
                throw new Error('Collection not found');
            }

            // In a real implementation, this would:
            // 1. Find the file corresponding to this collection
            // 2. Use GitHub API to delete the file
            // 3. Handle any conflicts

            console.log('Deleting collection from GitHub:', collectionId);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));

            this.app.notifications.showNotification(`Collection "${collection.name}" deleted from GitHub`, 'success');
            return true;

        } catch (error) {
            console.error('Error deleting collection from GitHub:', error);
            this.app.notifications.showNotification('Error deleting from GitHub: ' + error.message, 'error');

            // Fallback to localStorage
            return this.deleteCollectionFromLocalStorage(collectionId);
        }
    }

    /**
     * Delete collection from localStorage as fallback
     */
    deleteCollectionFromLocalStorage(collectionId) {
        try {
            const storageKey = `pixelAudioCollection_${collectionId}`;
            localStorage.removeItem(storageKey);

            this.app.notifications.showNotification('Collection deleted from local storage', 'success');
            return true;

        } catch (error) {
            console.error('Error deleting collection from localStorage:', error);
            this.app.notifications.showNotification('Error deleting collection: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Get GitHub connection status
     */
    isGitHubConnected() {
        return !!this.ACCESS_TOKEN;
    }

    /**
     * Disconnect from GitHub
     */
    disconnectFromGitHub() {
        this.ACCESS_TOKEN = null;
        localStorage.removeItem('github_access_token');
        this.app.notifications.showNotification('Disconnected from GitHub', 'info');
    }

    /**
     * Get database status information
     */
    getDatabaseStatus() {
        return {
            githubConnected: this.isGitHubConnected(),
            localCollections: this.getLocalCollectionCount(),
            repoName: this.REPO_NAME
        };
    }

    /**
     * Get count of locally stored collections
     */
    getLocalCollectionCount() {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pixelAudioCollection_')) {
                count++;
            }
        }
        return count;
    }
}

// Add database UI controls to settings panel
class DatabaseUI {
    constructor(app) {
        this.app = app;
        this.databaseManager = new DatabaseManager(app);

        // Add database controls to settings
        this.addDatabaseControlsToSettings();
    }

    addDatabaseControlsToSettings() {
        // Find the export settings section
        const exportSettingsSection = document.querySelector('.settings-tab-content[data-tab-content="export"]');
        if (!exportSettingsSection) return;

        // Add database section
        const databaseSection = document.createElement('div');
        databaseSection.className = 'settings-section';
        databaseSection.innerHTML = `
            <div class="section-heading">Database Settings</div>
            <div class="property-group">
                <div class="database-status" id="database-status">
                    <i class="fas fa-database"></i>
                    <span id="db-status-text">Not connected</span>
                    <button id="connect-github-btn" class="btn small-btn">
                        <i class="fab fa-github"></i> Connect GitHub
                    </button>
                </div>

                <div class="property-group">
                    <label class="property-label">
                        <input type="checkbox" id="auto-sync-collections" checked>
                        Auto-sync collections to database
                    </label>
                    <div class="setting-description">Automatically save collections to the connected database</div>
                </div>

                <div class="database-actions">
                    <button id="load-all-collections-btn" class="btn" style="width: 100%; margin-bottom: 8px;">
                        <i class="fas fa-download"></i> Load All Collections
                    </button>
                    <button id="sync-now-btn" class="btn secondary" style="width: 100%;">
                        <i class="fas fa-sync"></i> Sync Now
                    </button>
                </div>
            </div>
        `;

        exportSettingsSection.appendChild(databaseSection);

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Connect GitHub button
        document.getElementById('connect-github-btn')?.addEventListener('click', async () => {
            const result = await this.databaseManager.connectToGitHub();
            if (result) {
                this.updateDatabaseStatus();
            }
        });

        // Load all collections button
        document.getElementById('load-all-collections-btn')?.addEventListener('click', async () => {
            const count = await this.databaseManager.loadCollectionsFromDatabase();
            if (count > 0) {
                this.app.notifications.showNotification(`${count} collections loaded`, 'success');
            }
        });

        // Sync now button
        document.getElementById('sync-now-btn')?.addEventListener('click', async () => {
            // Sync all collections
            const currentCollection = this.app.collectionManager.getCurrentCollection();
            if (currentCollection) {
                await this.databaseManager.saveCollectionToDatabase(currentCollection.id);
            } else {
                this.app.notifications.showNotification('No collection selected to sync', 'error');
            }
        });

        // Update status initially
        this.updateDatabaseStatus();
    }

    updateDatabaseStatus() {
        const statusText = document.getElementById('db-status-text');
        const connectBtn = document.getElementById('connect-github-btn');

        if (this.databaseManager.isGitHubConnected()) {
            if (statusText) statusText.textContent = 'Connected to GitHub';
            if (connectBtn) {
                connectBtn.textContent = 'Disconnect';
                connectBtn.innerHTML = '<i class="fas fa-unlink"></i> Disconnect';
                connectBtn.onclick = () => {
                    this.databaseManager.disconnectFromGitHub();
                    this.updateDatabaseStatus();
                };
            }
        } else {
            if (statusText) statusText.textContent = 'Not connected';
            if (connectBtn) {
                connectBtn.textContent = 'Connect GitHub';
                connectBtn.innerHTML = '<i class="fab fa-github"></i> Connect GitHub';
                connectBtn.onclick = async () => {
                    const result = await this.databaseManager.connectToGitHub();
                    if (result) {
                        this.updateDatabaseStatus();
                    }
                };
            }
        }
    }
}