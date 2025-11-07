/**
 * Function Registry for OpenAI Agent
 * 
 * Manages the registration, validation, and safe execution of functions
 * that can be called by the AI agent. Provides schema validation,
 * argument checking, timeout protection, and error handling.
 * 
 * @class FunctionRegistry
 * @example
 * // Create a new registry
 * const registry = new FunctionRegistry();
 * 
 * // Register a function
 * registry.registerFunction(
 *   'greet',
 *   {
 *     name: 'greet',
 *     description: 'Greet a user',
 *     parameters: {
 *       type: 'object',
 *       properties: {
 *         name: { type: 'string', description: 'User name' }
 *       },
 *       required: ['name']
 *     }
 *   },
 *   (args) => `Hello, ${args.name}!`
 * );
 * 
 * // Execute the function
 * const result = await registry.executeFunction('greet', { name: 'Alice' });
 * console.log(result.result); // "Hello, Alice!"
 */

class FunctionRegistry {
    constructor() {
        this.functions = new Map();
    }

    /**
     * Register a function with OpenAI-compatible schema.
     * The function will be available for the AI agent to call during conversations.
     * 
     * @param {string} name - Unique function name (must match schema.name)
     * @param {Object} schema - OpenAI-compatible function schema
     * @param {string} schema.name - Function name
     * @param {string} schema.description - Human-readable description
     * @param {Object} schema.parameters - JSON Schema for parameters
     * @param {Function} handler - Function implementation that receives args object
     * @throws {Error} If name, schema, or handler is invalid
     * @example
     * registry.registerFunction(
     *   'addNumbers',
     *   {
     *     name: 'addNumbers',
     *     description: 'Add two numbers together',
     *     parameters: {
     *       type: 'object',
     *       properties: {
     *         a: { type: 'number', description: 'First number' },
     *         b: { type: 'number', description: 'Second number' }
     *       },
     *       required: ['a', 'b']
     *     }
     *   },
     *   (args) => args.a + args.b
     * );
     */
    registerFunction(name, schema, handler) {
        // Validate function name
        if (!name || typeof name !== 'string') {
            throw new Error('Function name must be a non-empty string');
        }

        // Validate schema structure
        if (!this.validateSchema(schema)) {
            throw new Error('Invalid function schema');
        }

        // Validate handler
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        // Store function with its metadata
        this.functions.set(name, {
            schema,
            handler,
            name
        });
    }

    /**
     * Validate OpenAI function schema
     * @param {Object} schema - Schema to validate
     * @returns {boolean} - True if valid
     */
    validateSchema(schema) {
        if (!schema || typeof schema !== 'object') {
            return false;
        }

        // Required fields for OpenAI function schema
        if (!schema.name || typeof schema.name !== 'string') {
            return false;
        }

        if (!schema.description || typeof schema.description !== 'string') {
            return false;
        }

        // Parameters should be a valid JSON Schema object
        if (schema.parameters) {
            if (typeof schema.parameters !== 'object') {
                return false;
            }

            // Basic JSON Schema validation
            if (schema.parameters.type && schema.parameters.type !== 'object') {
                return false;
            }

            if (schema.parameters.properties && typeof schema.parameters.properties !== 'object') {
                return false;
            }

            if (schema.parameters.required && !Array.isArray(schema.parameters.required)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Execute a registered function with argument validation and timeout protection.
     * Validates arguments against the function's schema before execution.
     * 
     * @async
     * @param {string} name - Name of the function to execute
     * @param {Object} [args={}] - Arguments to pass to the function
     * @returns {Promise<Object>} Execution result object
     * @returns {boolean} return.success - Whether execution succeeded
     * @returns {*} return.result - Function result (if successful)
     * @returns {Object} return.error - Error details (if failed)
     * @returns {string} return.functionName - Name of executed function
     * @returns {string} return.timestamp - ISO timestamp of execution
     * @example
     * const result = await registry.executeFunction('calculateMath', { expression: '2 + 2' });
     * if (result.success) {
     *   console.log('Result:', result.result); // 4
     * } else {
     *   console.error('Error:', result.error.message);
     * }
     */
    async executeFunction(name, args = {}) {
        const functionData = this.functions.get(name);

        if (!functionData) {
            return this.formatError(`Function '${name}' not found`, 'FUNCTION_NOT_FOUND');
        }

        try {
            // Validate arguments against schema
            if (functionData.schema.parameters) {
                const validationResult = this.validateArguments(args, functionData.schema.parameters);
                if (!validationResult.isValid) {
                    return this.formatError(validationResult.error, 'VALIDATION_ERROR');
                }
            }

            // Execute function with timeout protection (5 seconds)
            const timeoutMs = 5000;
            let timeoutId;

            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Function execution timeout after ${timeoutMs}ms`));
                }, timeoutMs);
            });

            const executionPromise = Promise.resolve(functionData.handler(args));

            const result = await Promise.race([executionPromise, timeoutPromise]);

            // Clear timeout if execution completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            return this.formatSuccess(result, name);

        } catch (error) {
            return this.formatError(
                `Function execution failed: ${error.message}`,
                'EXECUTION_ERROR',
                { functionName: name, originalError: error.name }
            );
        }
    }

    /**
     * Format successful function result
     * @param {any} result - Function execution result
     * @param {string} functionName - Name of executed function
     * @returns {Object} - Formatted success response
     */
    formatSuccess(result, functionName) {
        return {
            success: true,
            result: result,
            functionName: functionName,
            timestamp: new Date().toISOString(),
            error: null
        };
    }

    /**
     * Format error response
     * @param {string} message - Error message
     * @param {string} errorType - Type of error
     * @param {Object} metadata - Additional error metadata
     * @returns {Object} - Formatted error response
     */
    formatError(message, errorType, metadata = {}) {
        return {
            success: false,
            result: null,
            error: {
                message: message,
                type: errorType,
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };
    }

    /**
     * Validate function arguments against schema
     * @param {Object} args - Arguments to validate
     * @param {Object} parameters - Parameter schema
     * @returns {Object} - Validation result with isValid flag and error message
     */
    validateArguments(args, parameters) {
        if (!parameters.properties) {
            return { isValid: true, error: null };
        }

        // Ensure args is an object
        if (typeof args !== 'object' || args === null) {
            return {
                isValid: false,
                error: 'Arguments must be an object'
            };
        }

        // Check required parameters
        if (parameters.required && Array.isArray(parameters.required)) {
            for (const requiredParam of parameters.required) {
                if (!(requiredParam in args)) {
                    return {
                        isValid: false,
                        error: `Missing required parameter: ${requiredParam}`
                    };
                }
            }
        }

        // Basic type validation for provided arguments
        for (const [paramName, paramValue] of Object.entries(args)) {
            const paramSchema = parameters.properties[paramName];

            if (paramSchema) {
                // Type validation
                if (paramSchema.type && !this.validateParameterType(paramValue, paramSchema.type)) {
                    return {
                        isValid: false,
                        error: `Invalid type for parameter '${paramName}': expected ${paramSchema.type}, got ${typeof paramValue}`
                    };
                }

                // Additional validations
                const additionalValidation = this.validateParameterConstraints(paramValue, paramSchema, paramName);
                if (!additionalValidation.isValid) {
                    return additionalValidation;
                }
            }
        }

        // Check for unexpected parameters (if additionalProperties is false)
        if (parameters.additionalProperties === false) {
            const allowedParams = Object.keys(parameters.properties || {});
            const providedParams = Object.keys(args);
            const unexpectedParams = providedParams.filter(param => !allowedParams.includes(param));

            if (unexpectedParams.length > 0) {
                return {
                    isValid: false,
                    error: `Unexpected parameters: ${unexpectedParams.join(', ')}`
                };
            }
        }

        return { isValid: true, error: null };
    }

    /**
     * Validate parameter constraints (min, max, pattern, etc.)
     * @param {any} value - Parameter value
     * @param {Object} schema - Parameter schema
     * @param {string} paramName - Parameter name
     * @returns {Object} - Validation result
     */
    validateParameterConstraints(value, schema, paramName) {
        // String constraints
        if (schema.type === 'string') {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                return {
                    isValid: false,
                    error: `Parameter '${paramName}' must be at least ${schema.minLength} characters long`
                };
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                return {
                    isValid: false,
                    error: `Parameter '${paramName}' must be at most ${schema.maxLength} characters long`
                };
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                return {
                    isValid: false,
                    error: `Parameter '${paramName}' does not match required pattern`
                };
            }
        }

        // Number constraints
        if (schema.type === 'number' || schema.type === 'integer') {
            if (schema.minimum !== undefined && value < schema.minimum) {
                return {
                    isValid: false,
                    error: `Parameter '${paramName}' must be at least ${schema.minimum}`
                };
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
                return {
                    isValid: false,
                    error: `Parameter '${paramName}' must be at most ${schema.maximum}`
                };
            }
        }

        // Array constraints
        if (schema.type === 'array') {
            if (schema.minItems !== undefined && value.length < schema.minItems) {
                return {
                    isValid: false,
                    error: `Parameter '${paramName}' must have at least ${schema.minItems} items`
                };
            }
            if (schema.maxItems !== undefined && value.length > schema.maxItems) {
                return {
                    isValid: false,
                    error: `Parameter '${paramName}' must have at most ${schema.maxItems} items`
                };
            }
        }

        // Enum validation
        if (schema.enum && !schema.enum.includes(value)) {
            return {
                isValid: false,
                error: `Parameter '${paramName}' must be one of: ${schema.enum.join(', ')}`
            };
        }

        return { isValid: true, error: null };
    }

    /**
     * Validate parameter type
     * @param {any} value - Value to validate
     * @param {string} expectedType - Expected JSON Schema type
     * @returns {boolean} - True if valid
     */
    validateParameterType(value, expectedType) {
        // Handle null values
        if (value === null) {
            return expectedType === 'null';
        }

        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value) && isFinite(value);
            case 'integer':
                return typeof value === 'number' && Number.isInteger(value) && isFinite(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'null':
                return value === null;
            default:
                // For unknown types, be permissive but log a warning
                console.warn(`Unknown parameter type: ${expectedType}`);
                return true;
        }
    }

    /**
     * Get OpenAI-compatible function schemas for all registered functions.
     * These schemas can be passed directly to the OpenAI API.
     * 
     * @returns {Array<Object>} Array of function schemas in OpenAI format
     * @example
     * const schemas = registry.getFunctionSchemas();
     * const response = await openai.chat.completions.create({
     *   messages: [...],
     *   functions: schemas
     * });
     */
    getFunctionSchemas() {
        return Array.from(this.functions.values()).map(func => func.schema);
    }

    /**
     * Get list of registered function names
     * @returns {Array<string>} - Array of function names
     */
    getRegisteredFunctions() {
        return Array.from(this.functions.keys());
    }

    /**
     * Check if a function is registered
     * @param {string} name - Function name
     * @returns {boolean} - True if registered
     */
    hasFunction(name) {
        return this.functions.has(name);
    }

    /**
     * Remove a registered function
     * @param {string} name - Function name
     */
    unregisterFunction(name) {
        return this.functions.delete(name);
    }

    /**
     * Register multiple functions from schema and handler mappings.
     * This is a convenience method for bulk registration of functions.
     * 
     * @param {Array<Object>} schemas - Array of OpenAI function schema wrappers
     * @param {Object} schemas[].function - The actual function schema
     * @param {Object<string, Function>} handlers - Object mapping function names to handler functions
     * @throws {Error} If a handler is missing for any schema
     * @example
     * const schemas = [
     *   { function: { name: 'func1', description: '...', parameters: {...} } },
     *   { function: { name: 'func2', description: '...', parameters: {...} } }
     * ];
     * const handlers = {
     *   func1: (args) => 'result1',
     *   func2: (args) => 'result2'
     * };
     * registry.registerBuiltInFunctions(schemas, handlers);
     */
    registerBuiltInFunctions(schemas, handlers) {
        for (const schemaWrapper of schemas) {
            const schema = schemaWrapper.function;
            const handler = handlers[schema.name];

            if (!handler) {
                throw new Error(`No handler found for function: ${schema.name}`);
            }

            this.registerFunction(schema.name, schema, handler);
        }
    }

    /**
     * Sanitize function result to ensure it's JSON serializable
     * @param {any} result - Function result to sanitize
     * @returns {any} - Sanitized result
     */
    sanitizeResult(result) {
        try {
            // Test if result is JSON serializable
            JSON.stringify(result);
            return result;
        } catch (error) {
            // If not serializable, convert to string representation
            if (typeof result === 'function') {
                return '[Function]';
            }
            if (typeof result === 'undefined') {
                return null;
            }
            if (typeof result === 'symbol') {
                return result.toString();
            }
            if (result instanceof Error) {
                return {
                    error: true,
                    message: result.message,
                    name: result.name,
                    stack: result.stack
                };
            }

            // For other non-serializable objects, try to extract meaningful data
            try {
                return Object.getOwnPropertyNames(result).reduce((acc, key) => {
                    try {
                        const value = result[key];
                        if (typeof value !== 'function') {
                            acc[key] = this.sanitizeResult(value);
                        }
                    } catch (e) {
                        // Skip properties that can't be accessed
                    }
                    return acc;
                }, {});
            } catch (e) {
                return String(result);
            }
        }
    }

    /**
     * Execute function with comprehensive safety measures including timeout,
     * result sanitization, and execution metadata.
     * 
     * @async
     * @param {string} name - Function name to execute
     * @param {Object} [args={}] - Function arguments
     * @param {Object} [options={}] - Execution options
     * @param {number} [options.timeout=5000] - Timeout in milliseconds
     * @param {boolean} [options.sanitizeResults=true] - Whether to sanitize results for JSON serialization
     * @returns {Promise<Object>} Enhanced execution result with metadata
     * @returns {boolean} return.success - Whether execution succeeded
     * @returns {*} return.result - Function result (sanitized if enabled)
     * @returns {number} return.executionTime - Execution time in milliseconds
     * @returns {number} return.timeout - Timeout value used
     * @example
     * const result = await registry.executeFunctionSafely(
     *   'slowFunction',
     *   { data: 'test' },
     *   { timeout: 10000, sanitizeResults: true }
     * );
     * console.log(`Executed in ${result.executionTime}ms`);
     */
    async executeFunctionSafely(name, args = {}, options = {}) {
        const { timeout = 5000, sanitizeResults = true } = options;

        const startTime = Date.now();

        try {
            const result = await this.executeFunction(name, args);

            if (result.success && sanitizeResults) {
                result.result = this.sanitizeResult(result.result);
            }

            // Add execution metadata
            result.executionTime = Date.now() - startTime;
            result.timeout = timeout;

            return result;

        } catch (error) {
            return this.formatError(
                `Unexpected error during function execution: ${error.message}`,
                'UNEXPECTED_ERROR',
                {
                    functionName: name,
                    executionTime: Date.now() - startTime,
                    originalError: error.name
                }
            );
        }
    }

    /**
     * Clean up function registry resources
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            // Clear all registered functions
            this.functions.clear();
            
            console.log('🧹 Function registry cleanup completed');
            
        } catch (error) {
            console.error('Error during function registry cleanup:', error.message);
            throw error;
        }
    }
}

export default FunctionRegistry;