/**
 * Built-in Functions for OpenAI Agent
 * Contains demonstration functions for weather and location services
 */

/**
 * Get user's location based on their IP address
 * @returns {Promise<Object>} Location data including latitude, longitude, city, etc.
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
 * Get current weather for a given location
 * @param {Object} args - Arguments object containing latitude and longitude
 * @returns {Promise<Object>} Weather data from Open-Meteo API
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
 * Get current time (simple demonstration function)
 * @returns {string} Current date and time
 */
function getCurrentTime() {
  return new Date().toISOString();
}

/**
 * Calculate simple math expressions (demonstration function)
 * @param {Object} args - Arguments object containing expression
 * @returns {number} Result of the calculation
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

// OpenAI-compatible function schemas
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

// Available functions mapping
export const availableFunctions = {
  getCurrentWeather,
  getLocation,
  getCurrentTime,
  calculateMath,
};

export default {
  functionSchemas,
  availableFunctions,
  getCurrentWeather,
  getLocation,
  getCurrentTime,
  calculateMath,
};