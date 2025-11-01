/**
 * Function Registry for OpenAI Agent
 * Manages function registration, schema validation, and execution
 */

class FunctionRegistry {
    constructor() {
        this.functions = new Map();
    }

    /**
     * Register a function with OpenAI-compatible schema
     * @param {string} name - Function name
     * @param {Object} schema - OpenAI function schema
     * @param {Function} handler - Function implementation
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
     * Execute a registered function with argument validation
     * @param {string} name - Function name
     * @param {Object} args - Function arguments
     * @returns {Promise<Object>} - Formatted function result
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
     * Get OpenAI-compatible function schemas for all registered functions
     * @returns {Array} - Array of function schemas
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
     * Register multiple functions from a schema/handler mapping
     * @param {Array} schemas - Array of OpenAI function schemas
     * @param {Object} handlers - Object mapping function names to handlers
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
     * Execute function with comprehensive safety measures
     * @param {string} name - Function name
     * @param {Object} args - Function arguments
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} - Execution result
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
}

export default FunctionRegistry;