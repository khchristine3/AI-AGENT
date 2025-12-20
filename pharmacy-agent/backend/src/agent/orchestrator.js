/**
 * Agent Orchestrator Module
 *
 * This module orchestrates the AI agent's conversation flow, managing interactions
 * between the user, the OpenAI API, and various tools. It implements an agentic
 * loop where the AI can make decisions, call tools, and respond to users.
 *
 * Key Features:
 * - Multi-step agent reasoning with tool calls
 * - Conversation history management
 * - Streaming and non-streaming response modes
 * - Automatic tool execution and result injection
 * - Safety limits (max steps) to prevent infinite loops
 *
 * @module agent/orchestrator
 */

const OpenAI = require('openai');
const config = require('../config');
const SYSTEM_PROMPT = require('./systemPrompt');
const TOOL_DEFINITIONS = require('./tools/definitions');
const { executeTool } = require('./tools');

// Initialize OpenAI client with API key from config
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * Handle Chat Streaming Mode
 *
 * Similar to handleChat but streams the final response token-by-token for a
 * better user experience. Tool calls are executed normally (non-streaming),
 * but the final response is streamed in real-time.
 *
 * Agent Flow:
 * 1. Receives user message and conversation history
 * 2. Executes tool calls normally (non-streaming)
 * 3. Once ready to respond, creates a new streaming completion
 * 4. Streams response chunks via onChunk callback
 * 5. Returns complete response and updated history when done
 *
 * @param {string} userMessage - The user's input message
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @param {Function} onChunk - Callback function to receive response chunks as they arrive
 * @returns {Promise<Object>} Response object with success status, full message, and updated history
 *
 * @example
 * await handleChatStreaming("Tell me about Acamol", [], (chunk) => {
 *   process.stdout.write(chunk); // Stream to console
 * });
 */
async function handleChatStreaming(userMessage, conversationHistory = [], onChunk) {
  console.log('\n===========================================');
  console.log('Agent Starting (Streaming Mode)');
  console.log('===========================================');
  console.log('User message:', userMessage);

  // Build the message array with system prompt, history, and new user message
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  let stepCount = 0;
  const maxSteps = 10; // Safety limit to prevent infinite loops

  // Agentic loop: execute tool calls until ready to respond
  while (stepCount < maxSteps) {
    stepCount++;
    console.log(`\nStep ${stepCount}`);

    // Request completion from OpenAI (non-streaming for tool calls)
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto' // Let the model decide when to use tools
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Handle tool calls: execute requested tools
    if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
      console.log(`Agent wants to call ${assistantMessage.tool_calls.length} tool(s)`);

      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Calling: ${toolName}`);

        // Execute the tool and get result
        const toolResult = await executeTool(toolName, toolArgs);

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Continue loop to process tool results
      continue;
    }

    // Ready for final response: stream it token-by-token
    if (choice.finish_reason === 'stop') {
      console.log('\nStreaming final response...');

      // Create a new streaming completion
      const stream = await openai.chat.completions.create({
        model: config.openai.model,
        messages: messages,
        stream: true // Enable streaming
      });

      let fullContent = '';

      // Process each chunk as it arrives
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          // Send chunk to callback for real-time display
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      console.log(`\nAgent finished after ${stepCount} step(s)`);

      // Build updated conversation history with full response
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullContent }
      ];

      return {
        success: true,
        response: fullContent,
        conversationHistory: updatedHistory,
        toolCallsCount: stepCount - 1
      };
    }

    // Unexpected finish reason
    console.warn(`Unexpected finish_reason: ${choice.finish_reason}`);
    break;
  }

  // Max steps reached - safety mechanism activated
  console.error(`Max steps (${maxSteps}) reached`);
  return {
    success: false,
    error: 'MAX_STEPS_REACHED',
    response: 'I apologize, but I encountered an issue processing your request. Please try again.',
    conversationHistory: conversationHistory
  };
}

/**
 * Handle Chat (Non-Streaming Mode)
 *
 * Manages a complete conversation turn with the AI agent, executing tool calls
 * as needed and returning the final response once complete.
 *
 * @param {string} userMessage - The user's input message
 * @param {number} userId - The authenticated user's database ID (1-10)
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @param {Function|null} onChunk - Optional callback for response content
 * @returns {Promise<Object>} Response object with success status, message, and updated history
 */
async function handleChat(userMessage, userId, conversationHistory = [], onChunk = null) {
  console.log('\n===========================================');
  console.log('Agent Starting');
  console.log('===========================================');
  console.log('User ID:', userId);
  console.log('User message:', userMessage);

  // Build the message array with system prompt, history, and new user message
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: `CONTEXT: The current user is authenticated with database ID: ${userId}. When calling get_user_prescriptions, the user_id parameter will be provided automatically - do NOT ask the user for identification.` },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  let stepCount = 0;
  const maxSteps = 10; // Safety limit to prevent infinite loops

  // Agentic loop: agent can make multiple tool calls before responding
  while (stepCount < maxSteps) {
    stepCount++;
    console.log(`\nStep ${stepCount}`);

    // Request completion from OpenAI with tool calling capability
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto'
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // ============================================
    // HANDLE TOOL CALLS FIRST
    // ============================================
    if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
      console.log(`Agent wants to call ${assistantMessage.tool_calls.length} tool(s)`);

      // Add assistant's message with tool calls
      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = JSON.parse(toolCall.function.arguments);

        // Auto-inject user_id for user-specific tools
        if (toolName === 'get_user_prescriptions') {
          toolArgs.user_id = userId;
          console.log(`→ Injecting user_id=${userId} into ${toolName}`);
        }

        console.log(`→ Calling: ${toolName}`, toolArgs);

        // Execute the tool
        const toolResult = await executeTool(toolName, toolArgs);
        console.log(`→ Result:`, JSON.stringify(toolResult, null, 2));

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Continue loop to let agent process tool results
      continue;
    }

    // ============================================
    // HANDLE FINAL RESPONSE
    // ============================================
    if (choice.finish_reason === 'stop') {
      console.log(`\n✅ Agent finished after ${stepCount} step(s)`);

      const finalContent = assistantMessage.content || '';

      // Stream content to callback if provided
      if (onChunk && finalContent) {
        onChunk(finalContent);
      }

      // Build updated conversation history (for frontend state)
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: finalContent }
      ];

      return {
        success: true,
        response: finalContent,
        conversationHistory: updatedHistory,
        toolCallsCount: stepCount - 1
      };
    }

    // ============================================
    // HANDLE UNEXPECTED FINISH REASONS
    // ============================================
    console.warn(`Unexpected finish_reason: ${choice.finish_reason}`);
    break;
  }

  // Max steps reached - safety mechanism
  console.error(`Max steps (${maxSteps}) reached`);
  return {
    success: false,
    error: 'MAX_STEPS_REACHED',
    response: 'I apologize, but I encountered an issue processing your request. Please try again.',
    conversationHistory: conversationHistory
  };
}
// Export both chat handlers
module.exports = { handleChat, handleChatStreaming };