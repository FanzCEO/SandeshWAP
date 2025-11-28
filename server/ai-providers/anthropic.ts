/**
 * Anthropic Claude Provider Implementation
 * 
 * Mainstream AI provider with excellent reasoning capabilities.
 * Supports Claude 3 models with built-in safety features.
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

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ text: string; type: string }>;
  id: string;
  model: string;
  role: string;
  stop_reason: string;
  stop_sequence: string | null;
  type: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider extends BaseAIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'Advanced AI assistant with excellent reasoning and safety',
      type: ProviderType.MAINSTREAM,
      website: 'https://anthropic.com',
      pricing: 'Pay-per-token',
      capabilities: {
        supportsJsonMode: false,
        supportsImageGeneration: false,
        supportsStreamingResponse: true,
        maxContextLength: 200000, // Claude 3 Opus
        supportedModalities: ['text']
      },
      compliance: {
        allowsAdultContent: false,
        requiresExplicitConsent: false,
        hasBuiltInFiltering: true,
        termsOfServiceUrl: 'https://console.anthropic.com/legal/terms',
        contentPolicyUrl: 'https://docs.anthropic.com/claude/docs/content-policies'
      },
      defaultModel: 'claude-3-haiku-20240307',
      availableModels: [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-2.1',
        'claude-2.0',
        'claude-instant-1.2'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 500,
      tokensPerMinute: 50000,
      separate: {
        adult: {
          requestsPerMinute: 0, // No adult content supported
          requestsPerHour: 0,
        },
        regular: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
        }
      }
    };

    super(config, info, rateLimitConfig);

    if (!config.apiKey) {
      throw new ProviderError('Anthropic API key is required', 'anthropic', 'MISSING_API_KEY');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    if (isAdultMode) {
      throw new ProviderError(
        'Anthropic does not support adult content mode',
        'anthropic',
        'ADULT_MODE_NOT_SUPPORTED'
      );
    }

    try {
      const model = this.config.model || this.info.defaultModel || 'claude-3-haiku-20240307';
      const temperature = request.temperature ?? this.config.temperature ?? 0.3;
      const maxTokens = request.maxTokens ?? this.config.maxTokens ?? 1000;

      // Convert messages to Anthropic format
      const messages: AnthropicMessage[] = [];
      let systemPrompt = '';

      for (const msg of request.messages) {
        if (msg.role === 'system') {
          systemPrompt += msg.content + '\n';
        } else {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: this.sanitizeContent(msg.content, false)
          });
        }
      }

      const requestPayload = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages,
        ...(systemPrompt && { system: systemPrompt.trim() })
      };

      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          ...(this.config.customHeaders || {})
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        if (response.status === 429) {
          throw new ProviderError('Rate limit exceeded', 'anthropic', 'RATE_LIMIT', 429);
        }
        
        if (response.status === 401) {
          throw new ProviderError('Invalid API key', 'anthropic', 'INVALID_API_KEY', 401);
        }

        if (response.status === 400 && errorData.includes('content_filter')) {
          throw new ProviderError('Content filtered by Anthropic', 'anthropic', 'CONTENT_FILTERED', 400);
        }

        throw new ProviderError(
          `HTTP ${response.status}: ${errorData}`,
          'anthropic',
          'API_ERROR',
          response.status
        );
      }

      const data: AnthropicResponse = await response.json();

      if (!data.content || data.content.length === 0) {
        throw new ProviderError('No response generated', 'anthropic', 'NO_RESPONSE');
      }

      const textContent = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('');

      return {
        content: textContent,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        model: data.model,
        provider: 'anthropic'
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
        model: 'claude-3-haiku-20240307',
        max_tokens: 5,
        temperature: 0,
        messages: [{ role: 'user', content: 'Hi' }]
      };

      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestPayload)
      });

      const latency = Date.now() - startTime;
      const isHealthy = response.ok;

      return {
        isHealthy,
        lastChecked: new Date(),
        latency,
        availableModels: this.info.availableModels,
        ...(isHealthy ? {} : { errorMessage: `HTTP ${response.status}` })
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
}