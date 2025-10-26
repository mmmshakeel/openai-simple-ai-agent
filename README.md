# OpenAI Node Agent

An AI agent built with the OpenAI Node.js SDK that demonstrates conversational AI and function calling capabilities.

## Features

- **OpenAI Client Wrapper**: Robust client with configuration management and error handling
- **Chat Completion API**: Send messages to OpenAI with retry logic and function calling support
- **Function Calling**: Support for OpenAI function calling to extend AI capabilities
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Retry Logic**: Automatic retry with exponential backoff for rate limits and network errors

## Prerequisites

- Node.js 18.0.0 or higher
- OpenAI API key

## Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd openai-node-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
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

## Usage
//TODO: update usage details

## Testing

Run the basic test:
```bash
node test-basic-chat.js
```

## Development

This project uses ES modules. Make sure your Node.js version supports them (18.0.0+).

## License

MIT
