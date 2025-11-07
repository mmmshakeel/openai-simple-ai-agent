/**
 * Built-in Functions for OpenAI Agent
 * 
 * This module provides pre-configured functions that the AI agent can call
 * during conversations. These functions demonstrate the OpenAI function calling
 * capability and can be used as templates for creating custom functions.
 * 
 * @module built-in-functions
 * @example
 * // Import and use in your agent
 * import { functionSchemas, availableFunctions } from './built-in-functions.js';
 * functionRegistry.registerBuiltInFunctions(functionSchemas, availableFunctions);
 */

/**
 * Get user's location based on their IP address using the ipapi.co service.
 * This function makes an external API call to determine the user's approximate
 * location including city, region, country, and coordinates.
 * 
 * @async
 * @function getLocation
 * @returns {Promise<Object>} Location data object
 * @returns {string} return.city - City name
 * @returns {string} return.region - Region/state name
 * @returns {string} return.country - Country code
 * @returns {number} return.latitude - Latitude coordinate
 * @returns {number} return.longitude - Longitude coordinate
 * @throws {Error} If the API request fails or returns invalid data
 * @example
 * const location = await getLocation();
 * console.log(`You are in ${location.city}, ${location.country}`);
 */
async function getLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const locationData = await response.json();
    return locationData;
  } catch (error) {
    throw new Error(`Failed to get location: ${error.message}`);
  }
}

/**
 * Get current weather for a given location using the Open-Meteo API.
 * This function retrieves real-time weather data including temperature,
 * wind speed, and weather conditions for the specified coordinates.
 * 
 * @async
 * @function getCurrentWeather
 * @param {Object} args - Function arguments
 * @param {string} args.latitude - Latitude coordinate as a string
 * @param {string} args.longitude - Longitude coordinate as a string
 * @returns {Promise<Object>} Weather data object
 * @returns {Object} return.current_weather - Current weather conditions
 * @returns {number} return.current_weather.temperature - Temperature in Celsius
 * @returns {number} return.current_weather.windspeed - Wind speed in km/h
 * @returns {number} return.current_weather.weathercode - WMO weather code
 * @throws {Error} If the API request fails or coordinates are invalid
 * @example
 * const weather = await getCurrentWeather({ latitude: "40.7128", longitude: "-74.0060" });
 * console.log(`Temperature: ${weather.current_weather.temperature}°C`);
 */
async function getCurrentWeather(args) {
  try {
    const { latitude, longitude } = args;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=apparent_temperature&current_weather=true`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const weatherData = await response.json();
    return weatherData;
  } catch (error) {
    throw new Error(`Failed to get weather data: ${error.message}`);
  }
}

/**
 * Get the current date and time in ISO 8601 format.
 * This is a simple demonstration function that returns the current
 * timestamp without requiring any parameters.
 * 
 * @function getCurrentTime
 * @returns {string} Current date and time in ISO 8601 format (e.g., "2025-11-07T10:30:45.123Z")
 * @example
 * const time = getCurrentTime();
 * console.log(`Current time: ${time}`);
 */
function getCurrentTime() {
  return new Date().toISOString();
}

/**
 * Calculate simple mathematical expressions safely.
 * This function evaluates basic arithmetic expressions with safety checks
 * to prevent code injection. Only numbers and basic operators are allowed.
 * 
 * @function calculateMath
 * @param {Object} args - Function arguments
 * @param {string} args.expression - Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5 - 3")
 * @returns {number} The calculated result
 * @throws {Error} If the expression contains invalid characters or produces invalid results
 * @example
 * const result = calculateMath({ expression: "15 * 8 + 42" });
 * console.log(`Result: ${result}`); // Result: 162
 */
function calculateMath(args) {
  try {
    const expression = args.expression;
    
    if (typeof expression !== 'string') {
      throw new Error('Expression must be a string');
    }
    
    // Basic safety check - only allow numbers, operators, parentheses, and spaces
    if (!/^[0-9+\-*/().() \s]+$/.test(expression)) {
      throw new Error(`Invalid characters in expression: "${expression}"`);
    }
    
    // Use Function constructor for safer evaluation than eval
    const result = new Function('return ' + expression)();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid calculation result');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Math calculation failed: ${error.message}`);
  }
}

/**
 * OpenAI-compatible function schemas for all built-in functions.
 * These schemas define the function signatures that the AI model uses
 * to understand when and how to call each function.
 * 
 * @constant {Array<Object>} functionSchemas
 * @property {string} type - Always "function" for function definitions
 * @property {Object} function - Function definition object
 * @property {string} function.name - Function name (must match handler name)
 * @property {string} function.description - Human-readable description for the AI
 * @property {Object} function.parameters - JSON Schema defining function parameters
 * @example
 * // Use these schemas when registering functions
 * functionRegistry.registerBuiltInFunctions(functionSchemas, availableFunctions);
 */
export const functionSchemas = [
  {
    type: "function",
    function: {
      name: "getCurrentWeather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "string",
            description: "Latitude coordinate of the location"
          },
          longitude: {
            type: "string", 
            description: "Longitude coordinate of the location"
          },
        },
        required: ["longitude", "latitude"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "getLocation",
      description: "Get the user's location based on their IP address",
      parameters: {
        type: "object",
        properties: {},
      },
    }
  },
  {
    type: "function",
    function: {
      name: "getCurrentTime",
      description: "Get the current date and time",
      parameters: {
        type: "object",
        properties: {},
      },
    }
  },
  {
    type: "function",
    function: {
      name: "calculateMath",
      description: "Calculate simple math expressions",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5')"
          }
        },
        required: ["expression"],
      },
    }
  }
];

/**
 * Mapping of function names to their handler implementations.
 * This object connects the function schemas to their actual implementations.
 * 
 * @constant {Object<string, Function>} availableFunctions
 * @property {Function} getCurrentWeather - Weather data retrieval function
 * @property {Function} getLocation - Location detection function
 * @property {Function} getCurrentTime - Current time function
 * @property {Function} calculateMath - Math calculation function
 * @example
 * // Access a specific function
 * const timeHandler = availableFunctions.getCurrentTime;
 * const currentTime = timeHandler();
 */
export const availableFunctions = {
  getCurrentWeather,
  getLocation,
  getCurrentTime,
  calculateMath,
};

/**
 * Default export containing all functions and schemas.
 * 
 * @example
 * // Import everything
 * import builtInFunctions from './built-in-functions.js';
 * 
 * // Or import specific items
 * import { getCurrentTime, functionSchemas } from './built-in-functions.js';
 * 
 * // Extending with custom functions:
 * // 1. Create your function handler
 * function myCustomFunction(args) {
 *   return `Hello, ${args.name}!`;
 * }
 * 
 * // 2. Define the schema
 * const mySchema = {
 *   type: "function",
 *   function: {
 *     name: "myCustomFunction",
 *     description: "Greet a user by name",
 *     parameters: {
 *       type: "object",
 *       properties: {
 *         name: { type: "string", description: "User's name" }
 *       },
 *       required: ["name"]
 *     }
 *   }
 * };
 * 
 * // 3. Register with the function registry
 * functionRegistry.registerFunction("myCustomFunction", mySchema.function, myCustomFunction);
 */
export default {
  functionSchemas,
  availableFunctions,
  getCurrentWeather,
  getLocation,
  getCurrentTime,
  calculateMath,
};