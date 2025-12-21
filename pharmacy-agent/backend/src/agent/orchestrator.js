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
 * @param {string} userMessage - The user's input message
 * @param {number} userId - The authenticated user's database ID (1-10)
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @param {Function} onChunk - Callback function to receive response chunks as they arrive
 * @returns {Promise<Object>} Response object with success status, full message, and updated history
 */
async function handleChatStreaming(userMessage, userId, conversationHistory = [], onChunk) {
  console.log('\n===========================================');
  console.log('Agent Starting (Streaming Mode)');
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

      // Continue loop to process tool results
      continue;
    }

    // ============================================
    // HANDLE FINAL RESPONSE WITH STREAMING
    // ============================================
    if (choice.finish_reason === 'stop') {
      console.log('\n🔄 Starting streaming response...');

      // Create a new streaming completion
      const stream = await openai.chat.completions.create({
        model: config.openai.model,
        messages: messages,
        stream: true // Enable streaming
      });

      let fullContent = '';
      let chunkCount = 0;

      console.log('📡 Stream created, processing chunks...');

      try {
        // Process each chunk as it arrives
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          
          if (content) {
            chunkCount++;
            fullContent += content;
            
            // Log first 20 chars of each chunk
            console.log(`📨 Chunk ${chunkCount}: "${content.substring(0, 20)}${content.length > 20 ? '...' : ''}"`);
            
            // Send chunk to callback for real-time display
            if (onChunk) {
              onChunk(content);
            }
          }
        }
      } catch (streamError) {
        console.error('❌ Stream error:', streamError);
        throw streamError;
      }

      console.log(`\n✅ Streaming complete!`);
      console.log(`📊 Total chunks sent: ${chunkCount}`);
      console.log(`📝 Full content length: ${fullContent.length} characters`);

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

    // ============================================
    // HANDLE UNEXPECTED FINISH REASONS
    // ============================================
    console.warn(`⚠️ Unexpected finish_reason: ${choice.finish_reason}`);
    break;
  }

  // Max steps reached - safety mechanism activated
  console.error(`❌ Max steps (${maxSteps}) reached`);
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
      console.log(`\nAgent finished after ${stepCount} step(s)`);

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