/**
 * Perplexity Provider Implementation
 * 
 * AI provider with web search integration for real-time information.
 * Uses OpenAI-compatible API format.
 */

import { 
  BaseAIProvider, 
  AIProviderConfig, 
  ProviderInfo, 
  ProviderType,
  AIRequest, 
  AIResponse,
  AIProviderStatus,
  ProviderCapabilities,
  ComplianceConfig,
  RateLimitConfig,
  ProviderError
} from './base';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityProvider extends BaseAIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'perplexity',
      name: 'Perplexity',
      description: 'AI with real-time web search and up-to-date information',
      type: ProviderType.MAINSTREAM,
      website: 'https://perplexity.ai',
      pricing: 'Pay-per-token',
      capabilities: {
        supportsJsonMode: false,
        supportsImageGeneration: false,
        supportsStreamingResponse: true,
        maxContextLength: 16384, // Varies by model
        supportedModalities: ['text']
      },
      compliance: {
        allowsAdultContent: false,
        requiresExplicitConsent: false,
        hasBuiltInFiltering: true,
        termsOfServiceUrl: 'https://perplexity.ai/hub/terms',
        contentPolicyUrl: 'https://perplexity.ai/hub/privacy'
      },
      defaultModel: 'llama-3.1-sonar-small-128k-online',
      availableModels: [
        'llama-3.1-sonar-small-128k-online',
        'llama-3.1-sonar-large-128k-online',
        'llama-3.1-sonar-huge-128k-online',
        'llama-3.1-8b-instruct',
        'llama-3.1-70b-instruct',
        'mixtral-8x7b-instruct'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 5, // More conservative due to web search
      requestsPerHour: 50,
      requestsPerDay: 200,
      tokensPerMinute: 20000,
      separate: {
        adult: {
          requestsPerMinute: 0, // No adult content supported
          requestsPerHour: 0,
        },
        regular: {
          requestsPerMinute: 5,
          requestsPerHour: 50,
        }
      }
    };

    super(config, info, rateLimitConfig);

    if (!config.apiKey) {
      throw new ProviderError('Perplexity API key is required', 'perplexity', 'MISSING_API_KEY');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.perplexity.ai';
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    if (isAdultMode) {
      throw new ProviderError(
        'Perplexity does not support adult content mode',
        'perplexity',
        'ADULT_MODE_NOT_SUPPORTED'
      );
    }

    try {
      const model = this.config.model || this.info.defaultModel || 'llama-3.1-sonar-small-128k-online';
      const temperature = request.temperature ?? this.config.temperature ?? 0.3;
      const maxTokens = request.maxTokens ?? this.config.maxTokens ?? 1000;

      const messages: PerplexityMessage[] = request.messages.map(msg => ({
        role: msg.role,
        content: this.sanitizeContent(msg.content, false)
      }));

      const requestPayload = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.config.customHeaders || {})
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        if (response.status === 429) {
          throw new ProviderError('Rate limit exceeded', 'perplexity', 'RATE_LIMIT', 429);
        }
        
        if (response.status === 401) {
          throw new ProviderError('Invalid API key', 'perplexity', 'INVALID_API_KEY', 401);
        }

        if (response.status === 400 && errorData.includes('content_filter')) {
          throw new ProviderError('Content filtered by Perplexity', 'perplexity', 'CONTENT_FILTERED', 400);
        }

        throw new ProviderError(
          `HTTP ${response.status}: ${errorData}`,
          'perplexity',
          'API_ERROR',
          response.status
        );
      }

      const data: PerplexityResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new ProviderError('No response generated', 'perplexity', 'NO_RESPONSE');
      }

      const choice = data.choices[0];
      if (!choice.message?.content) {
        throw new ProviderError('No content in response', 'perplexity', 'NO_RESPONSE');
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        model: data.model,
        provider: 'perplexity'
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw this.formatError(error);
    }
  }

  async checkHealth(): Promise<AIProviderStatus> {
    try {
      const startTime = Date.now();
      
      // Simple health check with minimal token usage
      const requestPayload = {
        model: 'llama-3.1-8b-instruct', // Use non-online model for health check
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        temperature: 0
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      const latency = Date.now() - startTime;
      const isHealthy = response.ok;

      if (isHealthy) {
        const data = await response.json();
        const hasValidResponse = data.choices && data.choices.length > 0;
        
        return {
          isHealthy: hasValidResponse,
          lastChecked: new Date(),
          latency,
          availableModels: this.info.availableModels
        };
      }

      return {
        isHealthy: false,
        lastChecked: new Date(),
        errorMessage: `HTTP ${response.status}`
      };
    } catch (error: any) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        errorMessage: error.message || 'Health check failed'
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch {
      return false;
    }
  }

  // Perplexity-specific method for web search
  async searchWeb(query: string, maxResults: number = 5): Promise<any> {
    try {
      const requestPayload = {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Be precise and informative. Use your web search capabilities to provide current information.'
          },
          {
            role: 'user',
            content: `Search for: ${this.sanitizeContent(query, false)}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.2
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new ProviderError(`Search failed: HTTP ${response.status}`, 'perplexity');
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No search results found';
    } catch (error) {
      throw this.formatError(error);
    }
  }
}