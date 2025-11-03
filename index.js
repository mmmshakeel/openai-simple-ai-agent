#!/usr/bin/env node

/**
 * OpenAI Node.js Agent - Interactive CLI
 * Main entry point for the AI agent with command-line interface
 */

import readline from 'readline';
import dotenv from 'dotenv';
import chalk from 'chalk';
import OpenAIClient from './src/openai-client.js';
import FunctionRegistry from './src/function-registry.js';
import ChatManager from './src/chat-manager.js';
import { functionSchemas, availableFunctions } from './src/built-in-functions.js';

// Load environment variables
dotenv.config();

class AgentCLI {
    constructor() {
        this.rl = null;
        this.openaiClient = null;
        this.functionRegistry = null;
        this.chatManager = null;
        this.isRunning = false;
        this.loadingInterval = null;
        this.loadingFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.loadingIndex = 0;
    }

    /**
     * Initialize the CLI application
     */
    async initialize() {
        try {
            // Display enhanced startup banner
            this.showStartupBanner();

            // Initialize OpenAI client
            await this.initializeOpenAI();

            // Initialize function registry
            this.initializeFunctionRegistry();

            // Initialize chat manager
            this.initializeChatManager();

            // Set up readline interface
            this.setupReadline();

            console.log(chalk.green('✅ Agent initialized successfully!'));
            console.log('');
            this.showWelcomeMessage();
            console.log('');

        } catch (error) {
            console.error(chalk.red('❌ Failed to initialize agent:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Initialize OpenAI client with API key validation
     */
    async initializeOpenAI() {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error(
                chalk.red('OpenAI API key not found.') + ' Please set OPENAI_API_KEY environment variable.\n' +
                chalk.cyan('You can find your API key at: https://platform.openai.com/api-keys') + '\n' +
                chalk.yellow('Example: export OPENAI_API_KEY="sk-your-key-here"')
            );
        }

        this.openaiClient = new OpenAIClient();
        
        console.log(chalk.blue('🔑 Validating OpenAI API key...'));
        await this.openaiClient.initialize(apiKey, {
            model: process.env.OPENAI_MODEL || 'gpt-4',
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000')
        });
        
        console.log(chalk.green('✅ OpenAI client initialized'));
    }

    /**
     * Initialize function registry with built-in functions
     */
    initializeFunctionRegistry() {
        this.functionRegistry = new FunctionRegistry();
        
        console.log(chalk.blue('🔧 Registering built-in functions...'));
        this.functionRegistry.registerBuiltInFunctions(functionSchemas, availableFunctions);
        
        const registeredFunctions = this.functionRegistry.getRegisteredFunctions();
        console.log(chalk.green(`✅ Registered ${registeredFunctions.length} functions: ${chalk.cyan(registeredFunctions.join(', '))}`));
    }

    /**
     * Initialize chat manager
     */
    initializeChatManager() {
        this.chatManager = new ChatManager(this.openaiClient, this.functionRegistry);
        console.log(chalk.green('💬 Chat manager initialized'));
    }

    /**
     * Set up readline interface for user input
     */
    setupReadline() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.green('💬 You: '),
            historySize: 100
        });

        // Handle user input
        this.rl.on('line', (input) => {
            this.handleUserInput(input.trim());
        });

        // Handle Ctrl+C gracefully
        this.rl.on('SIGINT', () => {
            this.handleExit().catch(error => {
                console.error('Error during exit:', error.message);
                process.exit(1);
            });
        });

        // Handle readline close
        this.rl.on('close', () => {
            this.handleExit().catch(error => {
                console.error('Error during exit:', error.message);
                process.exit(1);
            });
        });
    }

    /**
     * Start the interactive conversation loop
     */
    start() {
        this.isRunning = true;
        this.chatManager.startConversation();
        this.rl.prompt();
    }

    /**
     * Handle user input and special commands
     * @param {string} input - User input string
     */
    async handleUserInput(input) {
        // Handle empty input
        if (!input) {
            this.rl.prompt();
            return;
        }

        // Handle special commands
        const command = input.toLowerCase();
        
        if (command === 'exit' || command === 'quit' || command === 'q') {
            await this.handleExit();
            return;
        }

        if (command === 'help' || command === 'h') {
            this.showHelp();
            this.rl.prompt();
            return;
        }

        if (command === 'clear' || command === 'cls') {
            this.handleClear();
            return;
        }

        if (command === 'stats') {
            this.showStats();
            this.rl.prompt();
            return;
        }

        if (command === 'functions') {
            this.showFunctions();
            this.rl.prompt();
            return;
        }

        if (command === 'config') {
            this.showConfig();
            this.rl.prompt();
            return;
        }

        // Process regular chat message
        await this.processChatMessage(input);
    }

    /**
     * Process chat message through the chat manager
     * @param {string} message - User message
     */
    async processChatMessage(message) {
        try {
            // Start enhanced loading indicator
            this.startLoadingIndicator('Thinking');

            const response = await this.chatManager.processMessage(message);

            // Stop loading indicator
            this.stopLoadingIndicator();

            if (response.success) {
                console.log(chalk.cyan('🤖') + ' ' + response.message);
                
                // Show additional info if available
                if (response.usage) {
                    const tokens = response.usage.total_tokens;
                    console.log(chalk.gray(`   (${tokens} tokens used)`));
                }
            } else {
                console.log(chalk.red('❌') + ' ' + response.message);
                
                if (response.error && response.error.type) {
                    console.log(chalk.gray(`   Error type: ${response.error.type}`));
                }
            }

        } catch (error) {
            // Stop loading indicator
            this.stopLoadingIndicator();
            console.error(chalk.red('❌ Unexpected error:'), error.message);
        }

        console.log('');
        this.rl.prompt();
    }

    /**
     * Display enhanced startup banner
     */
    showStartupBanner() {
        console.clear();
        console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.cyan.bold('║') + chalk.white.bold('                    🤖 OpenAI Node.js Agent                    ') + chalk.cyan.bold('║'));
        console.log(chalk.cyan.bold('║') + chalk.gray('                   Powered by GPT & Function Calling            ') + chalk.cyan.bold('║'));
        console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝'));
        console.log('');
        console.log(chalk.yellow('🚀 Starting up...'));
        console.log('');
    }

    /**
     * Display welcome message with instructions
     */
    showWelcomeMessage() {
        console.log(chalk.green.bold('🎉 Welcome to your AI Assistant!'));
        console.log('');
        console.log(chalk.white('I\'m ready to help you with:'));
        console.log(chalk.cyan('  • ') + 'Answering questions and having conversations');
        console.log(chalk.cyan('  • ') + 'Getting current time and weather information');
        console.log(chalk.cyan('  • ') + 'Performing mathematical calculations');
        console.log(chalk.cyan('  • ') + 'And much more!');
        console.log('');
        console.log(chalk.yellow('💡 Quick Tips:'));
        console.log(chalk.gray('  • Type ') + chalk.white('"help"') + chalk.gray(' to see all available commands'));
        console.log(chalk.gray('  • Type ') + chalk.white('"functions"') + chalk.gray(' to see what I can do'));
        console.log(chalk.gray('  • Use ') + chalk.white('Ctrl+C') + chalk.gray(' or type ') + chalk.white('"exit"') + chalk.gray(' to quit'));
        console.log('');
        console.log(chalk.magenta('Ready to chat! What would you like to know?'));
    }

    /**
     * Start animated loading indicator
     * @param {string} message - Loading message to display
     */
    startLoadingIndicator(message = 'Loading') {
        this.stopLoadingIndicator(); // Clear any existing indicator
        
        let dots = '';
        this.loadingIndex = 0;
        
        this.loadingInterval = setInterval(() => {
            // Clear the current line
            process.stdout.write('\r\x1b[K');
            
            // Show spinning animation with message
            const spinner = this.loadingFrames[this.loadingIndex];
            dots = '.'.repeat((this.loadingIndex % 3) + 1);
            
            process.stdout.write(chalk.blue(spinner) + ' ' + chalk.gray(message + dots));
            
            this.loadingIndex = (this.loadingIndex + 1) % this.loadingFrames.length;
        }, 100);
    }

    /**
     * Stop loading indicator
     */
    stopLoadingIndicator() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
            
            // Clear the loading line
            process.stdout.write('\r\x1b[K');
        }
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log(chalk.blue.bold('📖 Available Commands:'));
        console.log(chalk.cyan('  help, h       ') + chalk.gray('- Show this help message'));
        console.log(chalk.cyan('  clear, cls    ') + chalk.gray('- Clear conversation history'));
        console.log(chalk.cyan('  stats         ') + chalk.gray('- Show conversation statistics'));
        console.log(chalk.cyan('  functions     ') + chalk.gray('- List available functions'));
        console.log(chalk.cyan('  config        ') + chalk.gray('- Show current configuration'));
        console.log(chalk.cyan('  exit, quit, q ') + chalk.gray('- Exit the application'));
        console.log('');
        console.log(chalk.yellow.bold('💡 Tips:'));
        console.log(chalk.gray('  • Ask me anything! I can help with various tasks'));
        console.log(chalk.gray('  • I can call functions like getting weather, time, or doing math'));
        console.log(chalk.gray('  • Use ') + chalk.white('Ctrl+C') + chalk.gray(' to exit at any time'));
        console.log(chalk.gray('  • Type your message and press ') + chalk.white('Enter') + chalk.gray(' to chat'));
    }

    /**
     * Clear conversation history
     */
    handleClear() {
        this.chatManager.clearHistory();
        console.clear();
        console.log(chalk.cyan.bold('🤖 OpenAI Node.js Agent'));
        console.log(chalk.cyan('========================'));
        console.log('');
        console.log(chalk.green('🗑️ Conversation history cleared'));
        console.log('');
        this.rl.prompt();
    }

    /**
     * Show conversation statistics
     */
    showStats() {
        const stats = this.chatManager.getConversationStats();
        
        console.log(chalk.blue.bold('📊 Conversation Statistics:'));
        console.log(chalk.cyan('  Total messages: ') + chalk.white(stats.totalMessages));
        console.log(chalk.cyan('  User messages: ') + chalk.white(stats.userMessages));
        console.log(chalk.cyan('  Assistant messages: ') + chalk.white(stats.assistantMessages));
        console.log(chalk.cyan('  Function calls: ') + chalk.white(stats.functionMessages));
        console.log(chalk.cyan('  Estimated tokens: ') + chalk.white(stats.estimatedTokens));
        
        if (stats.conversationStarted) {
            const startTime = new Date(stats.conversationStarted);
            console.log(chalk.cyan('  Started: ') + chalk.white(startTime.toLocaleString()));
        }
        
        console.log('');
    }

    /**
     * Show available functions
     */
    showFunctions() {
        const functions = this.chatManager.getAvailableFunctions();
        
        console.log(chalk.blue.bold('🔧 Available Functions:'));
        
        if (functions.length === 0) {
            console.log(chalk.gray('  No functions registered'));
        } else {
            functions.forEach(func => {
                console.log(chalk.cyan(`  ${func.name}`) + chalk.gray(' - ') + chalk.white(func.description));
                if (func.parameters.length > 0) {
                    console.log(chalk.gray('    Parameters: ') + chalk.yellow(func.parameters.join(', ')));
                    if (func.required.length > 0) {
                        console.log(chalk.gray('    Required: ') + chalk.red(func.required.join(', ')));
                    }
                }
                console.log('');
            });
        }
    }

    /**
     * Show current configuration
     */
    showConfig() {
        const config = this.openaiClient.getConfig();
        
        console.log(chalk.blue.bold('⚙️ Current Configuration:'));
        console.log(chalk.cyan('  Model: ') + chalk.white(config.model));
        console.log(chalk.cyan('  Temperature: ') + chalk.white(config.temperature));
        console.log(chalk.cyan('  Max tokens: ') + chalk.white(config.maxTokens));
        console.log(chalk.cyan('  API key: ') + (process.env.OPENAI_API_KEY ? chalk.green('Set (hidden)') : chalk.red('Not set')));
        console.log('');
    }

    /**
     * Handle graceful exit with resource cleanup and optional state saving
     */
    async handleExit() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        // Stop any running loading indicators
        this.stopLoadingIndicator();
        
        console.log('');
        console.log(chalk.yellow('🔄 Shutting down gracefully...'));
        
        try {
            // Save conversation state if there's meaningful conversation history
            await this.saveConversationState();
            
            // Clean up resources
            await this.cleanupResources();
            
            console.log(chalk.green('✅ Cleanup completed successfully'));
            console.log(chalk.yellow('👋 Thanks for using OpenAI Node.js Agent!'));
            console.log(chalk.cyan('   Goodbye!'));
            
        } catch (error) {
            console.error(chalk.red('⚠️ Error during shutdown:'), error.message);
            console.log(chalk.yellow('👋 Goodbye! (with warnings)'));
        }
        
        // Force exit after cleanup attempt
        setTimeout(() => {
            process.exit(0);
        }, 100);
    }

    /**
     * Save conversation state to file if there's meaningful content
     */
    async saveConversationState() {
        if (!this.chatManager) {
            return;
        }

        try {
            const stats = this.chatManager.getConversationStats();
            
            // Only save if there's meaningful conversation (more than just system message)
            if (stats.totalMessages > 0 && (stats.userMessages > 0 || stats.assistantMessages > 0)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `conversation-${timestamp}.json`;
                
                // Create conversations directory if it doesn't exist
                const fs = await import('fs');
                const path = await import('path');
                
                const conversationsDir = path.join(process.cwd(), 'conversations');
                
                try {
                    await fs.promises.access(conversationsDir);
                } catch {
                    await fs.promises.mkdir(conversationsDir, { recursive: true });
                }
                
                // Export conversation data
                const conversationData = {
                    timestamp: new Date().toISOString(),
                    stats: stats,
                    messages: this.chatManager.getHistory(false), // Exclude system message
                    config: {
                        model: this.openaiClient.getConfig().model,
                        temperature: this.openaiClient.getConfig().temperature,
                        maxTokens: this.openaiClient.getConfig().maxTokens
                    }
                };
                
                const filepath = path.join(conversationsDir, filename);
                await fs.promises.writeFile(
                    filepath, 
                    JSON.stringify(conversationData, null, 2), 
                    'utf8'
                );
                
                console.log(chalk.blue(`💾 Conversation saved to: ${filename}`));
                console.log(chalk.gray(`   Messages: ${stats.totalMessages}, Tokens: ~${stats.estimatedTokens}`));
            }
            
        } catch (error) {
            console.error(chalk.yellow('⚠️ Could not save conversation:'), error.message);
        }
    }

    /**
     * Clean up all resources and connections
     */
    async cleanupResources() {
        const cleanupTasks = [];
        
        // Close readline interface
        if (this.rl) {
            cleanupTasks.push(new Promise((resolve) => {
                this.rl.close();
                this.rl = null;
                resolve();
            }));
        }
        
        // Clear any remaining intervals or timeouts
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
        
        // Clean up OpenAI client resources (if any)
        if (this.openaiClient && typeof this.openaiClient.cleanup === 'function') {
            cleanupTasks.push(this.openaiClient.cleanup());
        }
        
        // Clean up chat manager resources (if any)
        if (this.chatManager && typeof this.chatManager.cleanup === 'function') {
            cleanupTasks.push(this.chatManager.cleanup());
        }
        
        // Clean up function registry resources (if any)
        if (this.functionRegistry && typeof this.functionRegistry.cleanup === 'function') {
            cleanupTasks.push(this.functionRegistry.cleanup());
        }
        
        // Wait for all cleanup tasks to complete with timeout
        try {
            await Promise.race([
                Promise.all(cleanupTasks),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Cleanup timeout')), 2000)
                )
            ]);
        } catch (error) {
            console.error(chalk.yellow('⚠️ Some cleanup tasks timed out:'), error.message);
        }
    }

    /**
     * Handle unexpected errors
     * @param {Error} error - The error that occurred
     */
    handleError(error) {
        // Stop any running loading indicators
        this.stopLoadingIndicator();
        
        console.error('');
        console.error(chalk.red.bold('💥 Unexpected error occurred:'));
        console.error(chalk.red(`   ${error.message}`));
        console.error('');
        console.error(chalk.yellow('   Please check your configuration and try again.'));
        console.error(chalk.gray('   Type ') + chalk.white('"help"') + chalk.gray(' for available commands or ') + chalk.white('"exit"') + chalk.gray(' to quit.'));
        console.error('');
        
        if (this.rl && this.isRunning) {
            this.rl.prompt();
        }
    }
}

/**
 * Main application entry point
 */
async function main() {
    const cli = new AgentCLI();
    
    try {
        // Set up global error handlers
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error.message);
            cli.handleError(error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            cli.handleError(new Error(reason));
        });

        // Set up graceful shutdown handlers for various signals
        const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        
        shutdownSignals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\nReceived ${signal}, initiating graceful shutdown...`);
                try {
                    await cli.handleExit();
                } catch (error) {
                    console.error('Error during graceful shutdown:', error.message);
                    process.exit(1);
                }
            });
        });

        // Handle process exit event
        process.on('exit', (code) => {
            if (code !== 0) {
                console.log(`Process exiting with code: ${code}`);
            }
        });

        // Handle beforeExit event (last chance for async operations)
        process.on('beforeExit', (code) => {
            if (cli.isRunning) {
                console.log('Process is about to exit, performing final cleanup...');
            }
        });

        // Initialize and start the CLI
        await cli.initialize();
        cli.start();

    } catch (error) {
        console.error('❌ Failed to start application:', error.message);
        process.exit(1);
    }
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}