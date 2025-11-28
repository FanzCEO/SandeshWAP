/**
 * AI Service with Provider Abstraction Layer
 * 
 * This service now uses the new provider abstraction system while maintaining
 * backward compatibility with existing function signatures.
 */

import { enhancedAIService } from './ai-service-new';

// Re-export interfaces for backward compatibility
export interface CommandExplanation {
  command: string;
  explanation: string;
  risks: string[];
  suggestions?: string[];
  provider?: string;
  model?: string;
}

export interface LogAnalysis {
  summary: string;
  errors: string[];
  suggestions: string[];
  commands?: string[];
  provider?: string;
  model?: string;
}

export interface DockerfileResult {
  content: string;
  explanation: string;
  provider?: string;
  model?: string;
}

// Backward compatibility wrapper using the enhanced AI service
export async function explainCommand(command: string, clientIp: string = 'default'): Promise<CommandExplanation> {
  try {
    return await enhancedAIService.explainCommand(command, clientIp, {
      defaultProvider: 'openai',
      fallbackProviders: ['anthropic', 'gemini']
    });
  } catch (error: any) {
    // Maintain backward compatibility by throwing similar errors
    if (error.message.includes('Rate limit')) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }
    throw error;
  }
}

// Backward compatibility wrapper using the enhanced AI service
export async function generateDockerfile(projectPath: string, clientIp: string = 'default'): Promise<DockerfileResult> {
  try {
    return await enhancedAIService.generateDockerfile(projectPath, clientIp, {
      defaultProvider: 'openai',
      fallbackProviders: ['anthropic', 'gemini']
    });
  } catch (error: any) {
    // Maintain backward compatibility by throwing similar errors
    if (error.message.includes('Rate limit')) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }
    throw error;
  }
}

// Backward compatibility wrapper using the enhanced AI service
export async function analyzeLogs(logs: string, clientIp: string = 'default'): Promise<LogAnalysis> {
  try {
    return await enhancedAIService.analyzeLogs(logs, clientIp, {
      defaultProvider: 'openai',
      fallbackProviders: ['perplexity', 'anthropic']
    });
  } catch (error: any) {
    // Maintain backward compatibility by throwing similar errors
    if (error.message.includes('Rate limit')) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }
    throw error;
  }
}

// Export the enhanced service for new functionality
export { enhancedAIService } from './ai-service-new';