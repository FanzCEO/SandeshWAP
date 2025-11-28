/**
 * Together AI Provider Implementation
 * 
 * Cloud platform for open-source AI models with permissive policies.
 * Supports various open-source models at scale.
 * Adult-content-friendly for creative applications.
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

interface TogetherMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface TogetherResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class TogetherProvider extends BaseAIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'together',
      name: 'Together AI',
      description: 'Open-source AI models with flexible content policies',
      type: ProviderType.ADULT_FRIENDLY,
      website: 'https://together.ai',
      pricing: 'Pay-per-token',
      capabilities: {
        supportsJsonMode: true,
        supportsImageGeneration: true,
        supportsStreamingResponse: true,
        maxContextLength: 32768, // Varies by model
        supportedModalities: ['text', 'image']
      },
      compliance: {
        allowsAdultContent: true,
        requiresExplicitConsent: true,
        hasBuiltInFiltering: false,
        termsOfServiceUrl: 'https://together.ai/terms',
        contentPolicyUrl: 'https://together.ai/usage-policy'
      },
      defaultModel: 'meta-llama/Llama-2-70b-chat-hf',
      availableModels: [
        'meta-llama/Llama-2-70b-chat-hf',
        'meta-llama/Llama-2-13b-chat-hf',
        'meta-llama/Llama-2-7b-chat-hf',
        'mistralai/Mixtral-8x7B-Instruct-v0.1',
        'mistralai/Mistral-7B-Instruct-v0.1',
        'teknium/OpenHermes-2.5-Mistral-7B',
        'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
        'togethercomputer/RedPajama-INCITE-Chat-3B-v1',
        'WizardLM/WizardLM-70B-V1.0',
        'garage-bAInd/Platypus2-70B-instruct'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 20,
      requestsPerHour: 200,
      requestsPerDay: 1000,
      tokensPerMinute: 100000,
      separate: {
        adult: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
        },
        regular: {
          requestsPerMinute: 20,
          requestsPerHour: 200,
        }
      }
    };

    super(config, info, rateLimitConfig);

    if (!config.apiKey) {
      throw new ProviderError('Together AI API key is required', 'together', 'MISSING_API_KEY');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.together.xyz/v1';
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    try {
      const model = this.config.model || this.info.defaultModel || 'meta-llama/Llama-2-70b-chat-hf';
      const temperature = request.temperature ?? this.config.temperature ?? 0.7;
      const maxTokens = request.maxTokens ?? this.config.maxTokens ?? 1000;

      const messages: TogetherMessage[] = request.messages.map(msg => ({
        role: msg.role,
        content: isAdultMode ? msg.content : this.sanitizeContent(msg.content, false)
      }));

      const requestPayload = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
        ...(request.responseFormat === 'json' && { response_format: { type: 'json_object' } })
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
          throw new ProviderError('Rate limit exceeded', 'together', 'RATE_LIMIT', 429);
        }
        
        if (response.status === 401) {
          throw new ProviderError('Invalid API key', 'together', 'INVALID_API_KEY', 401);
        }

        if (response.status === 400 && errorData.includes('model')) {
          throw new ProviderError(`Model ${model} not available`, 'together', 'MODEL_NOT_AVAILABLE', 400);
        }

        throw new ProviderError(
          `HTTP ${response.status}: ${errorData}`,
          'together',
          'API_ERROR',
          response.status
        );
      }

      const data: TogetherResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new ProviderError('No response generated', 'together', 'NO_RESPONSE');
      }

      const choice = data.choices[0];
      if (!choice.message?.content) {
        throw new ProviderError('No content in response', 'together', 'NO_RESPONSE');
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        model: data.model,
        provider: 'together'
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
        model: 'meta-llama/Llama-2-7b-chat-hf', // Use smaller model for health check
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

  // Together AI specific methods
  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new ProviderError('Failed to fetch models', 'together');
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || this.info.availableModels;
    } catch (error) {
      console.warn('Failed to fetch Together AI models:', error);
      return this.info.availableModels;
    }
  }

  async generateImage(prompt: string, model: string = 'runwayml/stable-diffusion-v1-5'): Promise<string> {
    if (!this.info.capabilities.supportsImageGeneration) {
      throw new ProviderError('Image generation not supported', 'together', 'NOT_SUPPORTED');
    }

    try {
      const requestPayload = {
        model,
        prompt: this.sanitizeContent(prompt, true), // Allow more permissive content for images
        negative_prompt: 'blurry, low quality, distorted',
        steps: 20,
        n: 1,
        width: 512,
        height: 512
      };

      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new ProviderError(`Image generation failed: HTTP ${response.status}`, 'together');
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new ProviderError('No image generated', 'together');
      }

      return data.data[0].url || data.data[0].b64_json;
    } catch (error) {
      throw this.formatError(error);
    }
  }
}