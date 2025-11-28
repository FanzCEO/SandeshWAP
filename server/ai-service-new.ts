/**
 * Enhanced AI Service using Provider Abstraction Layer
 * 
 * Refactored to use the new provider system with Adult Mode support,
 * provider selection, fallbacks, and comprehensive audit logging.
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { aiProviderRegistry } from './ai-providers/registry';
import { AdultModeManager, AdultModeContentFilter } from './ai-providers/adult-mode';
import { AIRequest, AIResponse, ProviderError } from './ai-providers/base';
import type {
  AIProviderRequest,
  AIProviderResponse,
  AdultModeConsentRequest,
  AdultModeConsentResponse
} from '@shared/schema';

// Legacy interfaces for backward compatibility
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

export interface AIServiceConfig {
  defaultProvider?: string;
  fallbackProviders?: string[];
  enableAdultMode?: boolean;
  enableAuditLogging?: boolean;
  contentFilterLevel?: 'strict' | 'moderate' | 'minimal';
  maxRetries?: number;
}

export class EnhancedAIService {
  private adultModeManager: AdultModeManager;
  private auditLog: Array<{
    timestamp: Date;
    sessionId: string;
    providerId: string;
    function: string;
    success: boolean;
    error?: string;
    duration: number;
  }> = [];

  constructor() {
    this.adultModeManager = AdultModeManager.getInstance();
  }

  /**
   * Enhanced command explanation with provider selection and Adult Mode support
   */
  async explainCommand(
    command: string,
    sessionId: string = 'default',
    config: AIServiceConfig = {}
  ): Promise<CommandExplanation> {
    const startTime = Date.now();
    let providerId = config.defaultProvider || 'openai';
    const fallbackProviders = config.fallbackProviders || ['anthropic', 'gemini'];
    const isAdultMode = config.enableAdultMode && this.adultModeManager.isAdultModeAllowed(sessionId);

    try {
      // Content filtering
      const contentFilter = AdultModeContentFilter.filterContent(command, sessionId, isAdultMode);
      
      if (contentFilter.blocked) {
        throw new Error(`Content blocked: ${contentFilter.violations.join(', ')}`);
      }

      const request: AIRequest = {
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that explains shell commands. Provide clear, concise explanations of what commands do, potential risks, and suggestions for safer alternatives if applicable. ${
              isAdultMode ? 'You can discuss all technical aspects without content restrictions.' : ''
            } Respond in JSON format with fields: explanation (string), risks (array of strings), suggestions (optional array of strings).`
          },
          {
            role: "user",
            content: `Explain this shell command: ${contentFilter.filteredContent}`
          }
        ],
        responseFormat: 'json',
        temperature: 0.3,
        maxTokens: 500
      };

      const response = await aiProviderRegistry.generateResponseWithFallback(
        providerId,
        fallbackProviders,
        request,
        sessionId,
        isAdultMode
      );

      let result;
      try {
        result = JSON.parse(response.content);
      } catch {
        // Fallback if JSON parsing fails
        result = {
          explanation: response.content,
          risks: [],
          suggestions: []
        };
      }

      this.logUsage(sessionId, response.provider, 'explainCommand', true, Date.now() - startTime);

      return {
        command,
        explanation: result.explanation || 'Could not generate explanation',
        risks: result.risks || [],
        suggestions: result.suggestions,
        provider: response.provider,
        model: response.model
      };

    } catch (error: any) {
      this.logUsage(sessionId, providerId, 'explainCommand', false, Date.now() - startTime, error.message);
      
      if (error instanceof ProviderError) {
        throw new Error(`AI Provider Error: ${error.message}`);
      }
      
      throw new Error(`Failed to explain command: ${error.message}`);
    }
  }

  /**
   * Enhanced Dockerfile generation with provider selection
   */
  async generateDockerfile(
    projectPath: string,
    sessionId: string = 'default',
    config: AIServiceConfig = {}
  ): Promise<DockerfileResult> {
    const startTime = Date.now();
    let providerId = config.defaultProvider || 'openai';
    const fallbackProviders = config.fallbackProviders || ['anthropic', 'gemini'];
    const isAdultMode = config.enableAdultMode && this.adultModeManager.isAdultModeAllowed(sessionId);

    try {
      // Read project files to understand the structure
      const files = await fs.readdir(projectPath);
      let projectInfo = `Project files: ${files.join(', ')}\n`;
      
      // Check for common project files
      const importantFiles = ['package.json', 'requirements.txt', 'Gemfile', 'pom.xml', 'build.gradle', 'go.mod'];
      
      for (const file of importantFiles) {
        if (files.includes(file)) {
          try {
            const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
            projectInfo += `\n${file} content:\n${content.substring(0, 1000)}\n`;
          } catch {
            // Ignore read errors
          }
        }
      }

      // Content filtering
      const contentFilter = AdultModeContentFilter.filterContent(projectInfo, sessionId, isAdultMode);

      const request: AIRequest = {
        messages: [
          {
            role: "system",
            content: "You are an expert in containerization. Generate appropriate Dockerfiles based on project structure. Include best practices like multi-stage builds when appropriate. Respond in JSON format with fields: content (the Dockerfile content as a string), explanation (brief explanation of the Dockerfile structure)."
          },
          {
            role: "user",
            content: `Generate a Dockerfile for this project:\n${contentFilter.filteredContent}`
          }
        ],
        responseFormat: 'json',
        temperature: 0.3,
        maxTokens: 1000
      };

      const response = await aiProviderRegistry.generateResponseWithFallback(
        providerId,
        fallbackProviders,
        request,
        sessionId,
        isAdultMode
      );

      let result;
      try {
        result = JSON.parse(response.content);
      } catch {
        result = {
          content: response.content,
          explanation: 'Generated Dockerfile based on project structure'
        };
      }

      this.logUsage(sessionId, response.provider, 'generateDockerfile', true, Date.now() - startTime);

      return {
        content: result.content || '# Could not generate Dockerfile',
        explanation: result.explanation || 'Generated Dockerfile for your project',
        provider: response.provider,
        model: response.model
      };

    } catch (error: any) {
      this.logUsage(sessionId, providerId, 'generateDockerfile', false, Date.now() - startTime, error.message);
      
      if (error instanceof ProviderError) {
        throw new Error(`AI Provider Error: ${error.message}`);
      }
      
      throw new Error(`Failed to generate Dockerfile: ${error.message}`);
    }
  }

  /**
   * Enhanced log analysis with provider selection
   */
  async analyzeLogs(
    logs: string,
    sessionId: string = 'default',
    config: AIServiceConfig = {}
  ): Promise<LogAnalysis> {
    const startTime = Date.now();
    let providerId = config.defaultProvider || 'openai';
    const fallbackProviders = config.fallbackProviders || ['perplexity', 'anthropic'];
    const isAdultMode = config.enableAdultMode && this.adultModeManager.isAdultModeAllowed(sessionId);

    try {
      // Truncate logs if too long
      const truncatedLogs = logs.length > 4000 ? logs.substring(logs.length - 4000) : logs;

      // Content filtering
      const contentFilter = AdultModeContentFilter.filterContent(truncatedLogs, sessionId, isAdultMode);

      const request: AIRequest = {
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing error logs and debugging issues. Analyze the provided logs, identify errors, and suggest fixes. Respond in JSON format with fields: summary (brief summary of the issue), errors (array of identified errors), suggestions (array of fix suggestions), commands (optional array of commands to run)."
          },
          {
            role: "user",
            content: `Analyze these logs and suggest fixes:\n${contentFilter.filteredContent}`
          }
        ],
        responseFormat: 'json',
        temperature: 0.3,
        maxTokens: 800
      };

      const response = await aiProviderRegistry.generateResponseWithFallback(
        providerId,
        fallbackProviders,
        request,
        sessionId,
        isAdultMode
      );

      let result;
      try {
        result = JSON.parse(response.content);
      } catch {
        result = {
          summary: response.content,
          errors: [],
          suggestions: []
        };
      }

      this.logUsage(sessionId, response.provider, 'analyzeLogs', true, Date.now() - startTime);

      return {
        summary: result.summary || 'Log analysis complete',
        errors: result.errors || [],
        suggestions: result.suggestions || [],
        commands: result.commands,
        provider: response.provider,
        model: response.model
      };

    } catch (error: any) {
      this.logUsage(sessionId, providerId, 'analyzeLogs', false, Date.now() - startTime, error.message);
      
      if (error instanceof ProviderError) {
        throw new Error(`AI Provider Error: ${error.message}`);
      }
      
      throw new Error(`Failed to analyze logs: ${error.message}`);
    }
  }

  /**
   * Adult Mode consent management
   */
  async requestAdultModeConsent(
    sessionId: string,
    request: AdultModeConsentRequest,
    clientIp: string,
    userAgent: string
  ): Promise<AdultModeConsentResponse> {
    try {
      if (!request.acceptTerms) {
        return {
          success: false,
          errors: ['Terms must be accepted to enable Adult Mode']
        };
      }

      const result = this.adultModeManager.recordConsent(
        sessionId,
        request.userAge,
        clientIp,
        userAgent
      );

      if (result.success) {
        const status = this.adultModeManager.getConsentStatus(sessionId);
        return {
          success: true,
          consentId: sessionId,
          expiresAt: new Date(Date.now() + (status.timeRemaining || 0)),
          warnings: result.errors.length > 0 ? result.errors : undefined
        };
      } else {
        return {
          success: false,
          errors: result.errors
        };
      }
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Failed to process consent request']
      };
    }
  }

  /**
   * Revoke Adult Mode consent
   */
  revokeAdultModeConsent(sessionId: string): void {
    this.adultModeManager.revokeConsent(sessionId);
  }

  /**
   * Get consent status
   */
  getAdultModeStatus(sessionId: string): {
    hasConsent: boolean;
    timeRemaining?: number;
    consentRecord?: any;
  } {
    return this.adultModeManager.getConsentStatus(sessionId);
  }

  /**
   * Generate AI response using provider selection
   */
  async generateResponse(
    request: AIProviderRequest,
    sessionId: string = 'default',
    config: AIServiceConfig = {}
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const providerId = request.providerId || config.defaultProvider || 'openai';
    const isAdultMode = request.isAdultMode || (config.enableAdultMode && this.adultModeManager.isAdultModeAllowed(sessionId));

    try {
      // Content filtering
      const filteredMessages = request.messages.map(msg => {
        const filtered = AdultModeContentFilter.filterContent(msg.content, sessionId, isAdultMode);
        if (filtered.blocked) {
          throw new Error(`Content blocked: ${filtered.violations.join(', ')}`);
        }
        return {
          ...msg,
          content: filtered.filteredContent
        };
      });

      const aiRequest: AIRequest = {
        messages: filteredMessages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        responseFormat: request.responseFormat
      };

      const response = await aiProviderRegistry.generateResponse(
        providerId,
        aiRequest,
        sessionId,
        isAdultMode
      );

      this.logUsage(sessionId, providerId, 'generateResponse', true, Date.now() - startTime);

      return {
        content: response.content,
        usage: response.usage,
        model: response.model,
        provider: response.provider
      };

    } catch (error: any) {
      this.logUsage(sessionId, providerId, 'generateResponse', false, Date.now() - startTime, error.message);
      throw error;
    }
  }

  /**
   * Get available providers with health status
   */
  async getAvailableProviders(): Promise<any[]> {
    const providers = aiProviderRegistry.getAllProviders();
    
    return Promise.all(providers.map(async (provider) => {
      const status = await aiProviderRegistry.getProviderStatus(provider.id);
      return {
        ...provider,
        isHealthy: status?.isHealthy || false,
        latency: status?.latency,
        errorMessage: status?.errorMessage,
        lastChecked: status?.lastChecked
      };
    }));
  }

  /**
   * Get provider recommendations
   */
  getProviderRecommendations(useCase: 'general' | 'creative' | 'technical' | 'research'): string[] {
    const recommendations: Record<string, string[]> = {
      general: ['openai', 'anthropic', 'gemini'],
      creative: ['anthropic', 'together', 'replicate'],
      technical: ['openai', 'perplexity', 'gemini'],
      research: ['perplexity', 'anthropic', 'together']
    };

    return recommendations[useCase] || recommendations.general;
  }

  /**
   * Usage logging
   */
  private logUsage(
    sessionId: string,
    providerId: string,
    functionName: string,
    success: boolean,
    duration: number,
    error?: string
  ): void {
    this.auditLog.push({
      timestamp: new Date(),
      sessionId,
      providerId,
      function: functionName,
      success,
      error,
      duration
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(sessionId?: string): any {
    const logs = sessionId 
      ? this.auditLog.filter(log => log.sessionId === sessionId)
      : this.auditLog;

    const total = logs.length;
    const successful = logs.filter(log => log.success).length;
    const avgDuration = logs.reduce((sum, log) => sum + log.duration, 0) / total || 0;

    const providerStats = logs.reduce((stats: any, log) => {
      stats[log.providerId] = (stats[log.providerId] || 0) + 1;
      return stats;
    }, {});

    return {
      totalRequests: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      providerUsage: providerStats,
      recentErrors: logs
        .filter(log => !log.success)
        .slice(-10)
        .map(log => ({
          timestamp: log.timestamp,
          provider: log.providerId,
          function: log.function,
          error: log.error
        }))
    };
  }
}

// Global instance
export const enhancedAIService = new EnhancedAIService();

// Backward compatibility functions
export async function explainCommand(command: string, clientIp: string = 'default'): Promise<CommandExplanation> {
  return enhancedAIService.explainCommand(command, clientIp);
}

export async function generateDockerfile(projectPath: string, clientIp: string = 'default'): Promise<DockerfileResult> {
  return enhancedAIService.generateDockerfile(projectPath, clientIp);
}

export async function analyzeLogs(logs: string, clientIp: string = 'default'): Promise<LogAnalysis> {
  return enhancedAIService.analyzeLogs(logs, clientIp);
}