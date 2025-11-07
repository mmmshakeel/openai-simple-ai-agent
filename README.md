# OpenAI Node Agent

An interactive AI agent built with the OpenAI Node.js SDK that demonstrates conversational AI and function calling capabilities. Chat with an AI assistant that can execute functions like getting weather data, calculating math expressions, and retrieving the current time.

## Features

- **Interactive CLI**: User-friendly command-line interface with colored output and loading indicators
- **OpenAI Integration**: Robust client wrapper with configuration management and error handling
- **Function Calling**: Built-in support for OpenAI function calling to extend AI capabilities
- **Conversation Management**: Maintains conversation context with automatic history trimming
- **Error Handling**: Comprehensive error handling with user-friendly messages and retry logic
- **Graceful Shutdown**: Automatic conversation saving and resource cleanup on exit

## Prerequisites

- Node.js 18.0.0 or higher
- OpenAI API key (get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
- Internet connection for API calls

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd openai-node-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure your API key**:
   
   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   OPENAI_MODEL=gpt-4
   OPENAI_TEMPERATURE=0.7
   OPENAI_MAX_TOKENS=1000
   ```

   **Important**: Never commit your `.env` file or share your API key publicly.

## Usage

### Starting the Agent

Run the agent using npm:
```bash
npm start
```

Or directly with Node.js:
```bash
node index.js
```

### Chatting with the Agent

Once started, you'll see a welcome message and a prompt:
```
💬 You: 
```

Simply type your message and press Enter. The agent will respond and can call functions when needed.

### Example Conversations

**Basic conversation:**
```
💬 You: Hello! What can you help me with?
🤖 I can help you with various tasks including...
```

**Using function calling:**
```
💬 You: What time is it?
🔧 Executing function: getCurrentTime
✅ Function getCurrentTime executed successfully
🤖 The current time is 2025-11-07T10:30:45.123Z
```

**Math calculations:**
```
💬 You: Calculate 25 * 4 + 10
🔧 Executing function: calculateMath
🤖 The result is 110
```

**Weather information:**
```
💬 You: What's the weather like?
🔧 Executing function: getLocation
🔧 Executing function: getCurrentWeather
🤖 The current temperature is 72°F with clear skies...
```

### Available Commands

Type these commands at the prompt:

- `help` or `h` - Show available commands and tips
- `clear` or `cls` - Clear conversation history
- `stats` - Show conversation statistics (message count, tokens used)
- `functions` - List all available functions the agent can call
- `config` - Display current configuration and component status
- `exit`, `quit`, or `q` - Exit the application
- `Ctrl+C` - Gracefully exit the application

## Configuration

### Environment Variables

Configure the agent behavior using environment variables in your `.env` file:

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) | - | `sk-...` |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4` | `gpt-4`, `gpt-3.5-turbo`, etc. |
| `OPENAI_TEMPERATURE` | Response creativity (0-2) | `0.7` | `0.0` - `2.0` |
| `OPENAI_MAX_TOKENS` | Maximum response length | `1000` | `1` - `4096` |

### Model Selection

- **gpt-4**: More capable, better reasoning, higher cost
- **gpt-3.5-turbo**: Faster, lower cost, good for most tasks

### Temperature Settings

- **0.0-0.3**: More focused and deterministic responses
- **0.4-0.7**: Balanced creativity and consistency (recommended)
- **0.8-2.0**: More creative and varied responses

## Built-in Functions

The agent comes with these pre-configured functions:

### getCurrentTime
Get the current date and time in ISO format.
```
Example: "What time is it?"
```

### calculateMath
Evaluate simple mathematical expressions.
```
Example: "Calculate 15 * 8 + 42"
Parameters: expression (string)
```

### getLocation
Get the user's approximate location based on IP address.
```
Example: "Where am I?"
```

### getCurrentWeather
Get current weather data for a specific location.
```
Example: "What's the weather in my location?"
Parameters: latitude (string), longitude (string)
```

## Troubleshooting

### Common Issues

#### "OpenAI API key not found"
**Problem**: The API key is not set in your environment.

**Solution**:
1. Make sure you created a `.env` file in the project root
2. Verify your API key is correctly set: `OPENAI_API_KEY=sk-...`
3. Restart the application after setting the key

#### "Authentication failed: Invalid API key"
**Problem**: The API key is incorrect or expired.

**Solution**:
1. Check your API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Generate a new key if needed
3. Update your `.env` file with the correct key

#### "Rate limit exceeded"
**Problem**: Too many requests to the OpenAI API.

**Solution**:
1. Wait a few moments before sending another message
2. Consider upgrading your OpenAI plan for higher rate limits
3. The agent will automatically retry with exponential backoff

#### "Network error: Unable to connect"
**Problem**: Cannot reach the OpenAI API.

**Solution**:
1. Check your internet connection
2. Verify you can access https://api.openai.com
3. Check if a firewall or proxy is blocking the connection

#### "Model not found"
**Problem**: The specified model is not available.

**Solution**:
1. Check your model name in `.env` (should be `gpt-4` or `gpt-3.5-turbo`)
2. Verify your API key has access to the model
3. Some models require specific API access levels

### Getting Help

If you encounter issues:
1. Type `config` to check component status
2. Type `help` to see available commands
3. Check the console for detailed error messages
4. Review your `.env` configuration

## Project Structure

```
openai-node-agent/
├── index.js                    # Main CLI application entry point
├── src/
│   ├── openai-client.js       # OpenAI API client wrapper
│   ├── chat-manager.js        # Conversation orchestration
│   ├── function-registry.js   # Function registration and execution
│   └── built-in-functions.js  # Pre-configured functions
├── conversations/             # Saved conversation history (auto-generated)
├── .env                       # Environment configuration (create this)
├── .env.example              # Example environment file
├── package.json              # Project dependencies
└── README.md                 # This file
```

## Development

### Running in Development Mode

Enable development features:
```bash
NODE_ENV=development npm start
```

This enables:
- Additional debug logging
- Test integration command
- Detailed error stack traces

### Testing

Run the basic test script:
```bash
node test-basic-chat.js
```

### Extending with Custom Functions

You can easily add your own custom functions for the AI agent to call. Here's how:

#### 1. Create Your Function Handler

Create a function that takes an `args` object and returns a result:

```javascript
// In src/built-in-functions.js or your own module
function searchDatabase(args) {
  const { query, limit } = args;
  // Your implementation here
  return {
    results: [...],
    count: 10
  };
}
```

#### 2. Define the Function Schema

Create an OpenAI-compatible schema that describes your function:

```javascript
const searchDatabaseSchema = {
  type: "function",
  function: {
    name: "searchDatabase",
    description: "Search the database for records matching a query",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return"
        }
      },
      required: ["query"]
    }
  }
};
```

#### 3. Register Your Function

Add your function to the registry during initialization:

```javascript
// In index.js, after initializing the function registry
functionRegistry.registerFunction(
  'searchDatabase',
  searchDatabaseSchema.function,
  searchDatabase
);
```

Or add it to the built-in functions:

```javascript
// In src/built-in-functions.js

// Add to functionSchemas array
export const functionSchemas = [
  // ... existing schemas
  searchDatabaseSchema
];

// Add to availableFunctions object
export const availableFunctions = {
  // ... existing functions
  searchDatabase
};
```

#### Best Practices for Custom Functions

- **Keep functions focused**: Each function should do one thing well
- **Validate inputs**: Check that required parameters are present and valid
- **Handle errors gracefully**: Return meaningful error messages
- **Use timeouts**: Long-running operations should have timeout protection
- **Return JSON-serializable data**: Avoid returning functions, symbols, or circular references
- **Document thoroughly**: Add JSDoc comments for better IDE support

#### Example: Adding a File Reader Function

```javascript
// 1. Create the handler
async function readFile(args) {
  const { filepath } = args;
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

// 2. Define the schema
const readFileSchema = {
  type: "function",
  function: {
    name: "readFile",
    description: "Read the contents of a text file",
    parameters: {
      type: "object",
      properties: {
        filepath: {
          type: "string",
          description: "Path to the file to read"
        }
      },
      required: ["filepath"]
    }
  }
};

// 3. Register it
functionRegistry.registerFunction(
  'readFile',
  readFileSchema.function,
  readFile
);
```

Now the AI can call your function when users ask questions like "Read the contents of config.json".

## Conversation History

The agent automatically saves your conversations when you exit. Saved conversations are stored in the `conversations/` directory as JSON files with timestamps.

To review a past conversation:
```bash
cat conversations/conversation-2025-11-07T10-30-45-123Z.json
```

## Performance Notes

- **Response Time**: Typically 1-3 seconds depending on model and complexity
- **Token Usage**: Monitored automatically; use `stats` command to check
- **History Management**: Automatically trims to last 20 messages to manage tokens
- **Function Execution**: 5-second timeout protection for all function calls

## Security Considerations

- Never commit your `.env` file or API key to version control
- API keys are not logged or exposed in error messages
- Function execution is sandboxed with timeout protection
- Input validation prevents code injection attacks
- Conversation data is only stored locally

## License

MIT

## Support

For issues related to:
- **OpenAI API**: Visit [platform.openai.com/docs](https://platform.openai.com/docs)
- **This project**: Open an issue on the repository
- **API keys**: Check [platform.openai.com/account](https://platform.openai.com/account)
