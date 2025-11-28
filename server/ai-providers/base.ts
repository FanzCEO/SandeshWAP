/**
 * Base AI Provider Interface and Types
 * 
 * This module defines the core abstractions for AI providers, supporting both
 * mainstream and adult-content-friendly providers with proper compliance controls.
 */

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  customHeaders?: Record<string, string>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider: string;
}

export interface ProviderCapabilities {
  supportsJsonMode: boolean;
  supportsImageGeneration: boolean;
  supportsStreamingResponse: boolean;
  maxContextLength: number;
  supportedModalities: ('text' | 'image' | 'audio' | 'video')[];
}

export interface ComplianceConfig {
  allowsAdultContent: boolean;
  requiresExplicitConsent: boolean;
  hasBuiltInFiltering: boolean;
  termsOfServiceUrl?: string;
  contentPolicyUrl?: string;
}

export enum ProviderType {
  MAINSTREAM = 'mainstream',
  ADULT_FRIENDLY = 'adult_friendly',
  SELF_HOSTED = 'self_hosted'
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  type: ProviderType;
  website?: string;
  pricing?: string;
  capabilities: ProviderCapabilities;
  compliance: ComplianceConfig;
  defaultModel?: string;
  availableModels: string[];
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute?: number;
  separate: {
    adult: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    regular: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
  };
}

export interface AIProviderStatus {
  isHealthy: boolean;
  lastChecked: Date;
  latency?: number;
  errorMessage?: string;
  availableModels?: string[];
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  protected info: ProviderInfo;
  protected rateLimitConfig: RateLimitConfig;

  constructor(config: AIProviderConfig, info: ProviderInfo, rateLimitConfig?: RateLimitConfig) {
    this.config = config;
    this.info = info;
    this.rateLimitConfig = rateLimitConfig || this.getDefaultRateLimit();
  }

  abstract generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse>;
  abstract checkHealth(): Promise<AIProviderStatus>;
  abstract validateConfig(): Promise<boolean>;

  getInfo(): ProviderInfo {
    return this.info;
  }

  getCapabilities(): ProviderCapabilities {
    return this.info.capabilities;
  }

  getComplianceInfo(): ComplianceConfig {
    return this.info.compliance;
  }

  supportsAdultContent(): boolean {
    return this.info.compliance.allowsAdultContent;
  }

  protected getDefaultRateLimit(): RateLimitConfig {
    return {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 500,
      separate: {
        adult: {
          requestsPerMinute: 5,
          requestsPerHour: 30,
        },
        regular: {
          requestsPerMinute: 15,
          requestsPerHour: 150,
        }
      }
    };
  }

  protected validateRequest(request: AIRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request must contain at least one message');
    }

    if (request.maxTokens && request.maxTokens > this.info.capabilities.maxContextLength) {
      throw new Error(`Max tokens exceeds provider limit of ${this.info.capabilities.maxContextLength}`);
    }
  }

  protected sanitizeContent(content: string, isAdultMode: boolean = false): string {
    // Basic content sanitization - can be extended for specific providers
    if (!isAdultMode) {
      // Remove potential adult content markers in non-adult mode
      const adultKeywords = ['nsfw', 'explicit', 'adult', 'sexual'];
      let sanitized = content;
      
      adultKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        sanitized = sanitized.replace(regex, '[filtered]');
      });
      
      return sanitized;
    }
    
    return content;
  }

  protected formatError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    
    return new Error(typeof error === 'string' ? error : 'Unknown provider error');
  }
}

// Content filtering utilities
export class ContentFilter {
  private static readonly ILLEGAL_CONTENT_PATTERNS = [
    /\b(child|minor|underage)\b.*\b(sexual|explicit|nsfw)\b/gi,
    /\b(illegal|criminal)\b.*\b(activity|content)\b/gi,
    // Add more patterns as needed for compliance
  ];

  static containsIllegalContent(content: string): boolean {
    return this.ILLEGAL_CONTENT_PATTERNS.some(pattern => pattern.test(content));
  }

  static filterIllegalContent(content: string): string {
    let filtered = content;
    
    this.ILLEGAL_CONTENT_PATTERNS.forEach(pattern => {
      filtered = filtered.replace(pattern, '[BLOCKED - ILLEGAL CONTENT]');
    });
    
    return filtered;
  }
}

// Provider error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for provider ${provider}`, provider, 'RATE_LIMIT');
    this.retryAfter = retryAfter;
  }
  
  retryAfter?: number;
}

export class ConfigurationError extends ProviderError {
  constructor(provider: string, message: string) {
    super(`Configuration error for provider ${provider}: ${message}`, provider, 'CONFIG_ERROR');
  }
}