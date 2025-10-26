import OpenAIClient from './src/openai-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBasicChat() {
    const client = new OpenAIClient();

    try {
        // Initialize client
        await client.initialize(process.env.OPENAI_API_KEY);
        console.log('✓ Client initialized');

        // Test basic chat
        const messages = [
            { role: 'user', content: 'Hello! What is 2+2?' }
        ];

        const response = await client.createChatCompletion(messages);
        console.log('Response:', response.choices[0].message.content);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testBasicChat();
