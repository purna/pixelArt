const AI_SETTINGS_KEY = 'pixelArt-ai-settings';

const DEFAULTS = {
    provider: 'gemini',
    openrouterFallbackEnabled: false,
    gemini: { apiKey: '', model: 'gemini-1.5-flash' },
    openai: { apiKey: '', model: 'gpt-4.1-mini' },
    claude: { apiKey: '', model: 'claude-3-5-sonnet-20241022' },
    openrouter: { apiKey: '', model: 'openrouter/auto' }
};

class AIManager {
    constructor() {
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            const stored = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}');
            const settings = { ...DEFAULTS, ...stored };
            for (const provider of ['gemini', 'openai', 'claude', 'openrouter']) {
                settings[provider] = { ...DEFAULTS[provider], ...(stored[provider] || {}) };
            }
            if (!DEFAULTS[settings.provider]) settings.provider = DEFAULTS.provider;
            settings.openrouterFallbackEnabled = stored.openrouterFallbackEnabled === true;
            return settings;
        } catch {
            return JSON.parse(JSON.stringify(DEFAULTS));
        }
    }

    saveSettings(settings) {
        const provider = DEFAULTS[settings.provider] ? settings.provider : DEFAULTS.provider;
        this.settings = { ...DEFAULTS, ...settings, provider };
        for (const name of ['gemini', 'openai', 'claude', 'openrouter']) {
            this.settings[name] = { ...DEFAULTS[name], ...(settings[name] || {}) };
        }
        this.settings.openrouterFallbackEnabled = settings.openrouterFallbackEnabled === true;
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(this.settings));
    }

    get activeProvider() { return this.settings.provider; }

    async request(userText, systemText) {
        const primaryProvider = this.settings.provider;
        const primaryConfig = this.settings[primaryProvider];
        if (!primaryConfig?.apiKey?.trim()) throw new Error(`Add your ${this.providerLabel(primaryProvider)} API key in Settings → AI first.`);
        if (!primaryConfig?.model?.trim()) throw new Error('Enter a model name in Settings → AI.');

        try {
            const text = await this.requestWithProvider(primaryProvider, userText, systemText);
            this.lastUsedProvider = primaryProvider;
            this.lastUsedModel = primaryConfig.model.trim();
            return text;
        } catch (primaryError) {
            if (primaryProvider !== 'openrouter' || !this.settings.openrouterFallbackEnabled || !this.isRetryableProviderError(primaryError)) {
                throw primaryError;
            }

            const freeModels = await this.getOpenRouterFreeModels();
            if (freeModels.length < 2) throw primaryError;
            const currentModel = primaryConfig.model.trim();
            const currentIndex = freeModels.findIndex(model => model.id === currentModel);
            const nextModels = currentIndex < 0
                ? freeModels
                : [...freeModels.slice(currentIndex + 1), ...freeModels.slice(0, currentIndex)];
            const fallbackErrors = [primaryError];

            for (const model of nextModels) {
                try {
                    const text = await this.requestWithProvider('openrouter', userText, systemText, model.id);
                    this.lastUsedProvider = 'openrouter';
                    this.lastUsedModel = model.id;
                    return text;
                } catch (error) {
                    fallbackErrors.push(error);
                    if (!this.isRetryableProviderError(error)) throw error;
                }
            }

            const failures = fallbackErrors.map(error => error.message).join(' | ');
            throw new Error(`OpenRouter and its remaining free models are unavailable. ${failures}`);
        }
    }

    isRetryableProviderError(error) {
        return error instanceof TypeError || [402, 408, 425, 429].includes(error.status) || error.status >= 500;
    }

    async requestWithProvider(provider, userText, systemText, modelOverride = '') {
        const config = this.settings[provider];
        if (!config?.apiKey?.trim()) throw new Error(`Add your ${this.providerLabel(provider)} API key in Settings → AI first.`);
        const model = modelOverride || config.model.trim();
        if (!model) throw new Error('Enter a model name in Settings → AI.');

        let response;
        if (provider === 'gemini') {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey.trim())}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ systemInstruction: { parts: [{ text: systemText }] }, contents: [{ parts: [{ text: userText }] }] })
            });
        } else {
            const isClaude = provider === 'claude';
            const apiKey = config.apiKey.trim().replace(/^Bearer\s+/i, '');
            const endpoint = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions'
                : isClaude ? 'https://api.anthropic.com/v1/messages' : 'https://openrouter.ai/api/v1/chat/completions';
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
            let body;
            if (isClaude) {
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
                headers['anthropic-dangerous-direct-browser-access'] = 'true';
                delete headers.Authorization;
                body = { model, max_tokens: 2048, system: systemText, messages: [{ role: 'user', content: userText }] };
            } else {
                if (provider === 'openrouter') headers['X-OpenRouter-Title'] = 'PixelArt';
                body = { model, messages: [{ role: 'system', content: systemText }, { role: 'user', content: userText }], temperature: 0.2 };
            }
            response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
        }

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detail = result.error?.message || result.message || `HTTP ${response.status}`;
            const error = new Error(`${this.providerLabel(provider)} request failed: ${detail}`);
            error.status = response.status;
            throw error;
        }
        const text = provider === 'gemini' ? result.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('')
            : provider === 'claude' ? result.content?.filter(p => p.type === 'text').map(p => p.text).join('')
                : result.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text.trim()) throw new Error('The AI provider returned an empty response.');
        return text;
    }

    async getOpenRouterFreeModels() {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`Could not load OpenRouter's free model list (HTTP ${response.status}).`);
        return (Array.isArray(data.data) ? data.data : [])
            .filter(model => Number(model.pricing?.prompt) === 0 && Number(model.pricing?.completion) === 0 && typeof model.id === 'string')
            .sort((a, b) => a.id.localeCompare(b.id));
    }

    providerLabel(provider) {
        return ({ gemini: 'Gemini', openai: 'OpenAI', claude: 'Claude', openrouter: 'OpenRouter' })[provider] || 'AI';
    }
}

const AIManagerInstance = new AIManager();