/**
 * Chat Manager for OpenAI Agent
 * Orchestrates conversations, maintains context, and handles function calling flow
 */

class ChatManager {
    constructor(openaiClient, functionRegistry) {
        this.openaiClient = openaiClient;
        this.functionRegistry = functionRegistry;
        
        // Conversation state
        this.messageHistory = [];
        this.maxHistoryLength = 20; // Limit to last 20 messages for token management
        this.maxTokensPerMessage = 4000; // Approximate token limit per message
        
        // Configuration
        this.systemMessage = {
            role: 'system',
            content: 'You are a helpful AI assistant. You can use the available functions to help users with various tasks.'
        };
        
        // Add system message to history
        this.messageHistory.push(this.systemMessage);
    }

    /**
     * Initialize a new conversation session
     * @param {string} systemPrompt - Optional custom system prompt
     */
    startConversation(systemPrompt = null) {
        // Reset conversation history
        this.messageHistory = [];
        
        // Set system message
        const systemContent = systemPrompt || this.systemMessage.content;
        this.systemMessage = {
            role: 'system',
            content: systemContent
        };
        
        // Add system message to history
        this.messageHistory.push(this.systemMessage);
        
        console.log('🤖 New conversation started. Type your message or "exit" to quit.');
    }

    /**
     * Add a message to conversation history
     * @param {string} role - Message role ('user', 'assistant', 'system', 'function')
     * @param {string} content - Message content
     * @param {Object} metadata - Optional metadata (function_call, name, etc.)
     */
    addToHistory(role, content, metadata = {}) {
        // Validate role
        const validRoles = ['user', 'assistant', 'system', 'function'];
        if (!validRoles.includes(role)) {
            throw new Error(`Invalid message role: ${role}. Must be one of: ${validRoles.join(', ')}`);
        }

        // Validate content
        if (typeof content !== 'string') {
            throw new Error('Message content must be a string');
        }

        // Create message object
        const message = {
            role,
            content,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        // Add to history
        this.messageHistory.push(message);

        // Trim history if it exceeds maximum length
        this.trimHistory();
    }

    /**
     * Get current conversation history
     * @param {boolean} includeSystem - Whether to include system message
     * @returns {Array} Array of message objects
     */
    getHistory(includeSystem = true) {
        if (includeSystem) {
            return [...this.messageHistory];
        }
        
        return this.messageHistory.filter(msg => msg.role !== 'system');
    }

    /**
     * Get conversation history formatted for OpenAI API
     * @returns {Array} Array of messages in OpenAI format
     */
    getFormattedHistory() {
        return this.messageHistory.map(msg => {
            // Create base message object
            const formattedMsg = {
                role: msg.role,
                content: msg.content
            };

            // Add function call information if present
            if (msg.function_call) {
                formattedMsg.function_call = msg.function_call;
            }

            // Add function name for function messages
            if (msg.role === 'function' && msg.name) {
                formattedMsg.name = msg.name;
            }

            return formattedMsg;
        });
    }

    /**
     * Trim conversation history to manage token limits
     * Keeps system message and most recent messages within limits
     */
    trimHistory() {
        // Always keep the system message (first message)
        if (this.messageHistory.length <= this.maxHistoryLength) {
            return;
        }

        // Keep system message and trim from the middle
        const systemMessage = this.messageHistory[0];
        const recentMessages = this.messageHistory.slice(-this.maxHistoryLength + 1);
        
        this.messageHistory = [systemMessage, ...recentMessages];
        
        console.log(`📝 Conversation history trimmed to ${this.messageHistory.length} messages`);
    }

    /**
     * Estimate token count for messages (rough approximation)
     * @param {Array} messages - Array of messages
     * @returns {number} Estimated token count
     */
    estimateTokenCount(messages) {
        let totalTokens = 0;
        
        for (const message of messages) {
            // Rough estimation: 1 token ≈ 4 characters for English text
            const contentTokens = Math.ceil(message.content.length / 4);
            
            // Add overhead for message structure
            totalTokens += contentTokens + 10;
            
            // Add tokens for function call data
            if (message.function_call) {
                const functionCallTokens = Math.ceil(JSON.stringify(message.function_call).length / 4);
                totalTokens += functionCallTokens;
            }
        }
        
        return totalTokens;
    }

    /**
     * Trim messages to fit within token limit
     * @param {Array} messages - Messages to trim
     * @param {number} maxTokens - Maximum token limit
     * @returns {Array} Trimmed messages
     */
    trimToTokenLimit(messages, maxTokens) {
        if (messages.length === 0) {
            return messages;
        }

        // Always keep system message if present
        const systemMessage = messages.find(msg => msg.role === 'system');
        const otherMessages = messages.filter(msg => msg.role !== 'system');
        
        let currentTokens = systemMessage ? this.estimateTokenCount([systemMessage]) : 0;
        const trimmedMessages = systemMessage ? [systemMessage] : [];
        
        // Add messages from most recent, working backwards
        for (let i = otherMessages.length - 1; i >= 0; i--) {
            const message = otherMessages[i];
            const messageTokens = this.estimateTokenCount([message]);
            
            if (currentTokens + messageTokens <= maxTokens) {
                trimmedMessages.unshift(message);
                currentTokens += messageTokens;
            } else {
                break;
            }
        }
        
        // If we have a system message, make sure it's first
        if (systemMessage) {
            const systemIndex = trimmedMessages.findIndex(msg => msg.role === 'system');
            if (systemIndex > 0) {
                const [sys] = trimmedMessages.splice(systemIndex, 1);
                trimmedMessages.unshift(sys);
            }
        }
        
        return trimmedMessages;
    }

    /**
     * Clear conversation history (except system message)
     */
    clearHistory() {
        const systemMessage = this.messageHistory.find(msg => msg.role === 'system');
        this.messageHistory = systemMessage ? [systemMessage] : [];
        console.log('🗑️ Conversation history cleared');
    }

    /**
     * Update system message
     * @param {string} newSystemPrompt - New system prompt
     */
    updateSystemMessage(newSystemPrompt) {
        this.systemMessage.content = newSystemPrompt;
        
        // Update in history if present
        const systemIndex = this.messageHistory.findIndex(msg => msg.role === 'system');
        if (systemIndex >= 0) {
            this.messageHistory[systemIndex].content = newSystemPrompt;
        }
        
        console.log('🔄 System message updated');
    }

    /**
     * Get conversation statistics
     * @returns {Object} Statistics about the conversation
     */
    getConversationStats() {
        const history = this.getHistory(false); // Exclude system message
        const userMessages = history.filter(msg => msg.role === 'user');
        const assistantMessages = history.filter(msg => msg.role === 'assistant');
        const functionMessages = history.filter(msg => msg.role === 'function');
        
        return {
            totalMessages: history.length,
            userMessages: userMessages.length,
            assistantMessages: assistantMessages.length,
            functionMessages: functionMessages.length,
            estimatedTokens: this.estimateTokenCount(this.messageHistory),
            conversationStarted: this.messageHistory.length > 1 ? this.messageHistory[1].timestamp : null
        };
    }

    /**
     * Export conversation history
     * @param {string} format - Export format ('json' or 'text')
     * @returns {string} Exported conversation
     */
    exportConversation(format = 'json') {
        const history = this.getHistory(false);
        
        if (format === 'json') {
            return JSON.stringify(history, null, 2);
        }
        
        if (format === 'text') {
            return history.map(msg => {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                const role = msg.role.toUpperCase();
                return `[${timestamp}] ${role}: ${msg.content}`;
            }).join('\n');
        }
        
        throw new Error(`Unsupported export format: ${format}`);
    }

    /**
     * Process user input and generate response
     * Main conversation flow that handles both regular responses and function calling
     * @param {string} userInput - User's message
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Response object with message and metadata
     */
    async processMessage(userInput, options = {}) {
        const { 
            includeHistory = true,
            maxTokens = null,
            temperature = null 
        } = options;

        try {
            // Validate input
            if (!userInput || typeof userInput !== 'string' || userInput.trim().length === 0) {
                throw new Error('User input must be a non-empty string');
            }

            // Check if OpenAI client is ready
            if (!this.openaiClient.isReady()) {
                throw new Error('OpenAI client is not initialized');
            }

            // Add user message to history
            this.addToHistory('user', userInput.trim());

            // Prepare messages for API call
            let messages = includeHistory ? this.getFormattedHistory() : [
                this.systemMessage,
                { role: 'user', content: userInput.trim() }
            ];

            // Trim messages to token limit if specified
            if (maxTokens) {
                messages = this.trimToTokenLimit(messages, maxTokens);
            }

            // Get available functions
            const functions = this.functionRegistry.getFunctionSchemas();
            const hasFunctions = functions.length > 0;

            // Prepare request options
            const requestOptions = {};
            if (temperature !== null) {
                requestOptions.temperature = temperature;
            }

            console.log('🤔 Thinking...');

            // Make API call to OpenAI
            const response = await this.openaiClient.createChatCompletion(
                messages,
                hasFunctions ? functions : null,
                requestOptions
            );

            // Process the response
            return await this.processOpenAIResponse(response);

        } catch (error) {
            console.error('❌ Error processing message:', error.message);
            
            // Create error response
            const errorResponse = {
                success: false,
                message: `I encountered an error: ${error.message}`,
                error: {
                    type: 'PROCESSING_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString()
                },
                requiresFunctionCall: false,
                functionCall: null
            };

            // Add error message to history for context
            this.addToHistory('assistant', errorResponse.message);

            return errorResponse;
        }
    }

    /**
     * Process OpenAI API response and handle function calls
     * @param {Object} response - OpenAI API response
     * @returns {Promise<Object>} Processed response object
     */
    async processOpenAIResponse(response) {
        try {
            const choice = response.choices[0];
            const message = choice.message;

            // Check if the model wants to call a function
            if (message.function_call) {
                console.log('🔧 Function call requested:', message.function_call.name);
                return await this.handleFunctionCall(message.function_call);
            }

            // Regular text response
            const assistantMessage = message.content;

            // Add assistant response to history
            this.addToHistory('assistant', assistantMessage);

            return {
                success: true,
                message: assistantMessage,
                error: null,
                requiresFunctionCall: false,
                functionCall: null,
                usage: response.usage,
                model: response.model,
                finishReason: choice.finish_reason
            };

        } catch (error) {
            throw new Error(`Failed to process OpenAI response: ${error.message}`);
        }
    }

    /**
     * Handle streaming responses (for future implementation)
     * @param {string} userInput - User's message
     * @param {Function} onChunk - Callback for each response chunk
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Final response object
     */
    async processMessageStream(userInput, onChunk, options = {}) {
        // This is a placeholder for streaming implementation
        // For now, fall back to regular processing
        console.log('📡 Streaming not yet implemented, using regular processing...');
        return await this.processMessage(userInput, options);
    }

    /**
     * Process multiple messages in batch
     * @param {Array<string>} messages - Array of user messages
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Array of response objects
     */
    async processMessageBatch(messages, options = {}) {
        const responses = [];
        
        for (const message of messages) {
            try {
                const response = await this.processMessage(message, options);
                responses.push(response);
                
                // Add small delay between messages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                responses.push({
                    success: false,
                    message: `Error processing message: ${error.message}`,
                    error: {
                        type: 'BATCH_PROCESSING_ERROR',
                        message: error.message,
                        originalMessage: message
                    }
                });
            }
        }
        
        return responses;
    }

    /**
     * Generate a response without adding to history (for testing/preview)
     * @param {string} userInput - User's message
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Response object
     */
    async generateResponse(userInput, options = {}) {
        const originalHistory = [...this.messageHistory];
        
        try {
            const response = await this.processMessage(userInput, options);
            
            // Restore original history
            this.messageHistory = originalHistory;
            
            return response;
            
        } catch (error) {
            // Restore original history on error
            this.messageHistory = originalHistory;
            throw error;
        }
    }

    /**
     * Continue conversation with follow-up processing
     * @param {string} followUpInput - Follow-up message
     * @param {Object} context - Previous conversation context
     * @returns {Promise<Object>} Response object
     */
    async continueConversation(followUpInput, context = {}) {
        const { 
            preserveContext = true,
            addContextMessage = false 
        } = context;

        if (addContextMessage && context.message) {
            this.addToHistory('system', context.message);
        }

        return await this.processMessage(followUpInput, { 
            includeHistory: preserveContext 
        });
    }

    /**
     * Handle function call from OpenAI model
     * Executes the function and sends result back to model for final response
     * @param {Object} functionCall - Function call object from OpenAI
     * @returns {Promise<Object>} Final response after function execution
     */
    async handleFunctionCall(functionCall) {
        try {
            const { name, arguments: argsString } = functionCall;

            // Add the assistant's function call to history
            this.addToHistory('assistant', '', { function_call: functionCall });

            console.log(`🔧 Executing function: ${name}`);

            // Parse function arguments
            let functionArgs = {};
            try {
                functionArgs = argsString ? JSON.parse(argsString) : {};
            } catch (parseError) {
                console.error('❌ Failed to parse function arguments:', parseError.message);
                
                const errorMessage = `Failed to parse function arguments: ${parseError.message}`;
                this.addToHistory('function', errorMessage, { name });
                
                return await this.getFinalResponseAfterFunction();
            }

            // Execute the function through the registry
            const functionResult = await this.functionRegistry.executeFunctionSafely(
                name, 
                functionArgs,
                { timeout: 10000, sanitizeResults: true }
            );

            // Format function result for OpenAI
            const resultMessage = this.formatFunctionResult(functionResult, name);

            // Add function result to history
            this.addToHistory('function', resultMessage, { name });

            console.log(`✅ Function ${name} executed successfully`);

            // Get final response from model with function result
            return await this.getFinalResponseAfterFunction();

        } catch (error) {
            console.error('❌ Error handling function call:', error.message);

            // Add error to conversation history
            const errorMessage = `Function execution failed: ${error.message}`;
            this.addToHistory('function', errorMessage, { name: functionCall.name });

            // Try to get a response from the model even with the error
            try {
                return await this.getFinalResponseAfterFunction();
            } catch (finalError) {
                // If we can't get a final response, return error response
                return {
                    success: false,
                    message: `I encountered an error while executing the function: ${error.message}`,
                    error: {
                        type: 'FUNCTION_EXECUTION_ERROR',
                        message: error.message,
                        functionName: functionCall.name,
                        timestamp: new Date().toISOString()
                    },
                    requiresFunctionCall: false,
                    functionCall: null
                };
            }
        }
    }

    /**
     * Get final response from model after function execution
     * @returns {Promise<Object>} Final response object
     */
    async getFinalResponseAfterFunction() {
        try {
            // Get current conversation history including function results
            const messages = this.getFormattedHistory();

            // Get available functions (in case model wants to call another function)
            const functions = this.functionRegistry.getFunctionSchemas();

            console.log('🔄 Generating final response...');

            // Make API call with function results
            const response = await this.openaiClient.createChatCompletion(
                messages,
                functions.length > 0 ? functions : null
            );

            // Process the response (could be another function call or final answer)
            return await this.processOpenAIResponse(response);

        } catch (error) {
            throw new Error(`Failed to get final response after function execution: ${error.message}`);
        }
    }

    /**
     * Format function execution result for OpenAI
     * @param {Object} functionResult - Result from function registry
     * @param {string} functionName - Name of the executed function
     * @returns {string} Formatted result message
     */
    formatFunctionResult(functionResult, functionName) {
        if (functionResult.success) {
            // Successful function execution
            const result = functionResult.result;
            
            if (typeof result === 'string') {
                return result;
            }
            
            if (typeof result === 'object' && result !== null) {
                return JSON.stringify(result, null, 2);
            }
            
            return String(result);
        } else {
            // Function execution failed
            const error = functionResult.error;
            return `Error executing ${functionName}: ${error.message} (Type: ${error.type})`;
        }
    }

    /**
     * Check if model response indicates a function call
     * @param {Object} message - OpenAI message object
     * @returns {boolean} True if message contains function call
     */
    isFunctionCall(message) {
        return message && message.function_call && message.function_call.name;
    }

    /**
     * Validate function call request
     * @param {Object} functionCall - Function call object
     * @returns {Object} Validation result
     */
    validateFunctionCall(functionCall) {
        if (!functionCall || typeof functionCall !== 'object') {
            return {
                isValid: false,
                error: 'Function call must be an object'
            };
        }

        if (!functionCall.name || typeof functionCall.name !== 'string') {
            return {
                isValid: false,
                error: 'Function call must have a valid name'
            };
        }

        // Check if function is registered
        if (!this.functionRegistry.hasFunction(functionCall.name)) {
            return {
                isValid: false,
                error: `Function '${functionCall.name}' is not registered`
            };
        }

        // Validate arguments format
        if (functionCall.arguments) {
            try {
                JSON.parse(functionCall.arguments);
            } catch (error) {
                return {
                    isValid: false,
                    error: `Invalid function arguments JSON: ${error.message}`
                };
            }
        }

        return {
            isValid: true,
            error: null
        };
    }

    /**
     * Execute multiple function calls in sequence
     * @param {Array} functionCalls - Array of function call objects
     * @returns {Promise<Array>} Array of function results
     */
    async executeFunctionSequence(functionCalls) {
        const results = [];

        for (const functionCall of functionCalls) {
            try {
                const validation = this.validateFunctionCall(functionCall);
                if (!validation.isValid) {
                    results.push({
                        success: false,
                        functionName: functionCall.name,
                        error: validation.error
                    });
                    continue;
                }

                const args = functionCall.arguments ? JSON.parse(functionCall.arguments) : {};
                const result = await this.functionRegistry.executeFunctionSafely(
                    functionCall.name,
                    args
                );

                results.push({
                    success: result.success,
                    functionName: functionCall.name,
                    result: result.result,
                    error: result.error
                });

            } catch (error) {
                results.push({
                    success: false,
                    functionName: functionCall.name,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Handle parallel function execution (for future use)
     * @param {Array} functionCalls - Array of function call objects
     * @returns {Promise<Array>} Array of function results
     */
    async executeFunctionParallel(functionCalls) {
        const promises = functionCalls.map(async (functionCall) => {
            try {
                const validation = this.validateFunctionCall(functionCall);
                if (!validation.isValid) {
                    return {
                        success: false,
                        functionName: functionCall.name,
                        error: validation.error
                    };
                }

                const args = functionCall.arguments ? JSON.parse(functionCall.arguments) : {};
                const result = await this.functionRegistry.executeFunctionSafely(
                    functionCall.name,
                    args
                );

                return {
                    success: result.success,
                    functionName: functionCall.name,
                    result: result.result,
                    error: result.error
                };

            } catch (error) {
                return {
                    success: false,
                    functionName: functionCall.name,
                    error: error.message
                };
            }
        });

        return await Promise.all(promises);
    }

    /**
     * Get available functions summary
     * @returns {Array} Array of function summaries
     */
    getAvailableFunctions() {
        const schemas = this.functionRegistry.getFunctionSchemas();
        return schemas.map(schema => ({
            name: schema.name,
            description: schema.description,
            parameters: Object.keys(schema.parameters?.properties || {}),
            required: schema.parameters?.required || []
        }));
    }

    /**
     * Test function calling capability
     * @param {string} functionName - Function to test
     * @param {Object} testArgs - Test arguments
     * @returns {Promise<Object>} Test result
     */
    async testFunctionCall(functionName, testArgs = {}) {
        try {
            console.log(`🧪 Testing function: ${functionName}`);
            
            const result = await this.functionRegistry.executeFunctionSafely(
                functionName,
                testArgs
            );

            console.log(`✅ Function test completed:`, result);
            return result;

        } catch (error) {
            console.error(`❌ Function test failed:`, error.message);
            return {
                success: false,
                error: error.message,
                functionName
            };
        }
    }

    /**
     * Clean up chat manager resources
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            // Clear any pending timeouts or intervals
            // (Currently none, but placeholder for future use)
            
            // Clear message history to free memory
            this.messageHistory = [];
            
            // Reset state
            this.maxHistoryLength = 20;
            this.maxTokensPerMessage = 4000;
            
            console.log('🧹 Chat manager cleanup completed');
            
        } catch (error) {
            console.error('Error during chat manager cleanup:', error.message);
            throw error;
        }
    }
}

export default ChatManager;