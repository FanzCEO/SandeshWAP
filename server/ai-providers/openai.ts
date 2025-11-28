/**
 * OpenAI Provider Implementation
 * 
 * Mainstream AI provider with built-in content filtering.
 * Supports GPT-4, GPT-3.5, and other OpenAI models.
 */

import OpenAI from 'openai';
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

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'openai',
      name: 'OpenAI',
      description: 'Leading AI provider with GPT models',
      type: ProviderType.MAINSTREAM,
      website: 'https://openai.com',
      pricing: 'Pay-per-token',
      capabilities: {
        supportsJsonMode: true,
        supportsImageGeneration: true,
        supportsStreamingResponse: true,
        maxContextLength: 128000, // GPT-4 Turbo
        supportedModalities: ['text', 'image']
      },
      compliance: {
        allowsAdultContent: false,
        requiresExplicitConsent: false,
        hasBuiltInFiltering: true,
        termsOfServiceUrl: 'https://openai.com/terms',
        contentPolicyUrl: 'https://openai.com/usage-policies'
      },
      defaultModel: 'gpt-4o-mini',
      availableModels: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'dall-e-3',
        'dall-e-2'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 15,
      requestsPerHour: 200,
      requestsPerDay: 1000,
      tokensPerMinute: 150000,
      separate: {
        adult: {
          requestsPerMinute: 0, // No adult content supported
          requestsPerHour: 0,
        },
        regular: {
          requestsPerMinute: 15,
          requestsPerHour: 200,
        }
      }
    };

    super(config, info, rateLimitConfig);

    if (!config.apiKey) {
      throw new ProviderError('OpenAI API key is required', 'openai', 'MISSING_API_KEY');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
      timeout: config.timeout || 30000
    });
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    if (isAdultMode) {
      throw new ProviderError(
        'OpenAI does not support adult content mode',
        'openai',
        'ADULT_MODE_NOT_SUPPORTED'
      );
    }

    try {
      const model = this.config.model || this.info.defaultModel || 'gpt-4o-mini';
      const temperature = request.temperature ?? this.config.temperature ?? 0.3;
      const maxTokens = request.maxTokens ?? this.config.maxTokens ?? 1000;

      const messages = request.messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: this.sanitizeContent(msg.content, false)
      }));

      const requestPayload: OpenAI.ChatCompletionCreateParams = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(request.responseFormat === 'json' && { response_format: { type: 'json_object' } })
      };

      const completion = await this.client.chat.completions.create(requestPayload);

      const choice = completion.choices[0];
      if (!choice || !choice.message?.content) {
        throw new ProviderError('No response generated', 'openai', 'NO_RESPONSE');
      }

      return {
        content: choice.message.content,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined,
        model: completion.model,
        provider: 'openai'
      };
    } catch (error: any) {
      if (error.status === 429) {
        throw new ProviderError('Rate limit exceeded', 'openai', 'RATE_LIMIT', 429);
      }
      
      if (error.status === 401) {
        throw new ProviderError('Invalid API key', 'openai', 'INVALID_API_KEY', 401);
      }

      if (error.status === 400 && error.message?.includes('content_filter')) {
        throw new ProviderError('Content filtered by OpenAI', 'openai', 'CONTENT_FILTERED', 400);
      }

      throw this.formatError(error);
    }
  }

  async checkHealth(): Promise<AIProviderStatus> {
    try {
      const startTime = Date.now();
      
      // Simple health check with minimal token usage
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
        temperature: 0
      });

      const latency = Date.now() - startTime;

      return {
        isHealthy: !!response.choices[0]?.message?.content,
        lastChecked: new Date(),
        latency,
        availableModels: this.info.availableModels
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

  // OpenAI-specific methods
  async generateImage(prompt: string, size: '256x256' | '512x512' | '1024x1024' = '1024x1024'): Promise<string> {
    if (!this.info.capabilities.supportsImageGeneration) {
      throw new ProviderError('Image generation not supported', 'openai', 'NOT_SUPPORTED');
    }

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: this.sanitizeContent(prompt, false),
        size,
        quality: 'standard',
        n: 1
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new ProviderError('No image generated', 'openai', 'NO_IMAGE');
      }

      return imageUrl;
    } catch (error: any) {
      if (error.status === 400 && error.message?.includes('content_filter')) {
        throw new ProviderError('Image prompt filtered by OpenAI', 'openai', 'CONTENT_FILTERED', 400);
      }
      
      throw this.formatError(error);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data
        .filter(model => model.id.startsWith('gpt-') || model.id.startsWith('dall-e-'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      console.warn('Failed to fetch OpenAI models:', error);
      return this.info.availableModels;
    }
  }
}