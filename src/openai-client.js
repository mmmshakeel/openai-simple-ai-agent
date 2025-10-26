import OpenAI from 'openai';

/**
 * OpenAI Client Configuration Module
 * Handles OpenAI API client initialization, configuration, and error handling
 */
class OpenAIClient {
    constructor() {
        this.client = null;
        this.config = {
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000
        };
    }

    /**
     * Initialize the OpenAI client with API key validation
     * @param {string} apiKey - The OpenAI API key
     * @param {Object} options - Configuration options
     * @param {string} options.model - The model to use (default: gpt-4)
     * @param {number} options.temperature - Temperature setting (default: 0.7)
     * @param {number} options.maxTokens - Maximum tokens (default: 1000)
     * @throws {Error} If API key is invalid or missing
     */
    async initialize(apiKey, options = {}) {
        // Validate API key
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
            throw new Error('OpenAI API key is required and must be a non-empty string');
        }

        if (!apiKey.startsWith('sk-')) {
            throw new Error('Invalid OpenAI API key format. API key should start with "sk-"');
        }

        // Update configuration with provided options
        this.config = {
            ...this.config,
            ...options
        };

        // Validate configuration options
        this._validateConfig();

        try {
            // Initialize OpenAI client
            this.client = new OpenAI({
                apiKey: apiKey.trim()
            });

            // Test the API key by making a simple request
            await this._validateApiKey();

        } catch (error) {
            this.client = null;
            throw this._handleAuthenticationError(error);
        }
    }

    /**
     * Get the current configuration
     * @returns {Object} Current configuration object
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration options
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
        this._validateConfig();
    }

    /**
     * Check if client is initialized and ready
     * @returns {boolean} True if client is ready
     */
    isReady() {
        return this.client !== null;
    }

    /**
     * Get the OpenAI client instance
     * @returns {OpenAI} The OpenAI client instance
     * @throws {Error} If client is not initialized
     */
    getClient() {
        if (!this.client) {
            throw new Error('OpenAI client is not initialized. Call initialize() first.');
        }
        return this.client;
    }

    /**
     * Create a chat completion with retry logic and function calling support
     * @param {Array} messages - Array of message objects with role and content
     * @param {Array} functions - Optional array of function definitions for function calling
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} The chat completion response
     * @throws {Error} If request fails after retries
     */
    async createChatCompletion(messages, functions = null, options = {}) {
        if (!this.client) {
            throw new Error('OpenAI client is not initialized. Call initialize() first.');
        }

        // Validate messages array
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('Messages must be a non-empty array');
        }

        // Validate message format
        for (const message of messages) {
            if (!message.role || !message.content) {
                throw new Error('Each message must have role and content properties');
            }
        }

        // Prepare request parameters
        const requestParams = {
            model: this.config.model,
            messages: messages,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            ...options
        };

        // Add functions if provided
        if (functions && Array.isArray(functions) && functions.length > 0) {
            requestParams.functions = functions;
            requestParams.function_call = 'auto';
        }

        // Execute request with retry logic
        return await this._executeWithRetry(async () => {
            return await this.client.chat.completions.create(requestParams);
        });
    }

    /**
     * Execute a request with exponential backoff retry logic
     * @private
     * @param {Function} requestFn - The request function to execute
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @returns {Promise<Object>} The response from the request
     */
    async _executeWithRetry(requestFn, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain error types
                if (this._shouldNotRetry(error)) {
                    throw this._handleApiError(error);
                }

                // If this was the last attempt, throw the error
                if (attempt === maxRetries) {
                    throw this._handleApiError(error);
                }

                // Calculate delay with exponential backoff and jitter
                const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                const jitter = Math.random() * 1000; // Add up to 1s jitter
                const delay = baseDelay + jitter;

                console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms...`);
                await this._sleep(delay);
            }
        }

        throw this._handleApiError(lastError);
    }

    /**
     * Determine if an error should not be retried
     * @private
     * @param {Error} error - The error to check
     * @returns {boolean} True if the error should not be retried
     */
    _shouldNotRetry(error) {
        // Don't retry on authentication errors
        if (error.status === 401 || error.status === 403) {
            return true;
        }

        // Don't retry on bad request errors
        if (error.status === 400) {
            return true;
        }

        // Don't retry on not found errors
        if (error.status === 404) {
            return true;
        }

        return false;
    }

    /**
     * Handle API errors with user-friendly messages
     * @private
     * @param {Error} error - The API error
     * @returns {Error} A user-friendly error
     */
    _handleApiError(error) {
        if (error.status === 401) {
            return new Error(
                'Authentication failed: Invalid API key. Please check your OpenAI API key.\n' +
                'You can find your API key at: https://platform.openai.com/api-keys'
            );
        }

        if (error.status === 429) {
            return new Error(
                'Rate limit exceeded: Too many requests to OpenAI API. Please wait before making more requests.'
            );
        }

        if (error.status === 400) {
            return new Error(
                `Bad request: ${error.message || 'Invalid request parameters'}`
            );
        }

        if (error.status === 403) {
            return new Error(
                'Access forbidden: Your API key may not have the required permissions or your account may have insufficient credits.'
            );
        }

        if (error.status === 404) {
            return new Error(
                'Model not found: The specified model is not available. Please check the model name.'
            );
        }

        if (error.status === 500 || error.status === 502 || error.status === 503) {
            return new Error(
                'OpenAI server error: The service is temporarily unavailable. Please try again later.'
            );
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return new Error(
                'Network error: Unable to connect to OpenAI API. Please check your internet connection.'
            );
        }

        // Generic error handling
        return new Error(`OpenAI API request failed: ${error.message || 'Unknown error'}`);
    }

    /**
     * Sleep for a specified number of milliseconds
     * @private
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validate configuration options
     * @private
     */
    _validateConfig() {
        const { model, temperature, maxTokens } = this.config;

        if (typeof model !== 'string' || model.trim().length === 0) {
            throw new Error('Model must be a non-empty string');
        }

        if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
            throw new Error('Temperature must be a number between 0 and 2');
        }

        if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 4096) {
            throw new Error('Max tokens must be a number between 1 and 4096');
        }
    }

    /**
     * Validate API key by making a test request
     * @private
     */
    async _validateApiKey() {
        try {
            // Make a minimal request to validate the API key
            await this.client.models.list();
        } catch (error) {
            throw new Error(`API key validation failed: ${error.message}`);
        }
    }

    /**
     * Handle authentication errors with user-friendly messages
     * @private
     * @param {Error} error - The original error
     * @returns {Error} A user-friendly error
     */
    _handleAuthenticationError(error) {
        if (error.status === 401) {
            return new Error(
                'Authentication failed: Invalid API key. Please check your OpenAI API key and try again.\n' +
                'You can find your API key at: https://platform.openai.com/api-keys'
            );
        }

        if (error.status === 429) {
            return new Error(
                'Rate limit exceeded: Too many requests. Please wait a moment and try again.'
            );
        }

        if (error.status === 403) {
            return new Error(
                'Access forbidden: Your API key may not have the required permissions or your account may have insufficient credits.'
            );
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new Error(
                'Network error: Unable to connect to OpenAI API. Please check your internet connection.'
            );
        }

        // Generic error handling
        return new Error(`OpenAI client initialization failed: ${error.message}`);
    }
}

export default OpenAIClient;