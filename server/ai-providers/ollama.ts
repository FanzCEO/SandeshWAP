/**
 * Ollama Provider Implementation
 * 
 * Self-hosted AI provider with full control over content policies.
 * Supports various open-source models like Llama, Mixtral, Qwen.
 * Adult-content-friendly with user-controlled moderation.
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

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider extends BaseAIProvider {
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'ollama',
      name: 'Ollama (Self-hosted)',
      description: 'Self-hosted AI models with full content control',
      type: ProviderType.SELF_HOSTED,
      website: 'https://ollama.ai',
      pricing: 'Free (self-hosted)',
      capabilities: {
        supportsJsonMode: true,
        supportsImageGeneration: false,
        supportsStreamingResponse: true,
        maxContextLength: 32768, // Varies by model
        supportedModalities: ['text']
      },
      compliance: {
        allowsAdultContent: true,
        requiresExplicitConsent: true,
        hasBuiltInFiltering: false,
        termsOfServiceUrl: 'https://ollama.ai/license',
        contentPolicyUrl: 'User-controlled content policy'
      },
      defaultModel: 'llama3.1:8b',
      availableModels: [
        'llama3.1:8b',
        'llama3.1:70b',
        'llama3.1:405b',
        'mixtral:8x7b',
        'qwen2.5:7b',
        'qwen2.5:14b',
        'codellama:7b',
        'codellama:13b',
        'phi3:3.8b',
        'gemma2:9b'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 30, // Higher limits for self-hosted
      requestsPerHour: 500,
      requestsPerDay: 5000,
      separate: {
        adult: {
          requestsPerMinute: 15,
          requestsPerHour: 200,
        },
        regular: {
          requestsPerMinute: 30,
          requestsPerHour: 500,
        }
      }
    };

    super(config, info, rateLimitConfig);

    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    try {
      const model = this.config.model || this.info.defaultModel || 'llama3.1:8b';
      const temperature = request.temperature ?? this.config.temperature ?? 0.7;

      const messages: OllamaMessage[] = request.messages.map(msg => ({
        role: msg.role,
        content: isAdultMode ? msg.content : this.sanitizeContent(msg.content, false)
      }));

      const requestPayload = {
        model,
        messages,
        stream: false,
        options: {
          temperature,
          ...(request.maxTokens && { num_predict: request.maxTokens })
        },
        ...(request.responseFormat === 'json' && { format: 'json' })
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.customHeaders || {})
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        if (response.status === 404) {
          throw new ProviderError(`Model ${model} not found. Try running: ollama pull ${model}`, 'ollama', 'MODEL_NOT_FOUND', 404);
        }
        
        if (response.status === 503) {
          throw new ProviderError('Ollama service unavailable. Make sure Ollama is running.', 'ollama', 'SERVICE_UNAVAILABLE', 503);
        }

        throw new ProviderError(
          `HTTP ${response.status}: ${errorData}`,
          'ollama',
          'API_ERROR',
          response.status
        );
      }

      const data: OllamaResponse = await response.json();

      if (!data.message?.content) {
        throw new ProviderError('No content in response', 'ollama', 'NO_RESPONSE');
      }

      // Estimate token usage since Ollama doesn't provide exact counts
      const estimatedPromptTokens = Math.floor(JSON.stringify(messages).length / 4);
      const estimatedCompletionTokens = Math.floor(data.message.content.length / 4);

      return {
        content: data.message.content,
        usage: {
          promptTokens: data.prompt_eval_count || estimatedPromptTokens,
          completionTokens: data.eval_count || estimatedCompletionTokens,
          totalTokens: (data.prompt_eval_count || estimatedPromptTokens) + (data.eval_count || estimatedCompletionTokens)
        },
        model: data.model,
        provider: 'ollama'
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      // Handle connection errors
      if (error.code === 'ECONNREFUSED') {
        throw new ProviderError('Cannot connect to Ollama. Make sure Ollama is running on ' + this.baseUrl, 'ollama', 'CONNECTION_REFUSED');
      }
      
      throw this.formatError(error);
    }
  }

  async checkHealth(): Promise<AIProviderStatus> {
    try {
      const startTime = Date.now();
      
      // Check if Ollama is running
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        return {
          isHealthy: false,
          lastChecked: new Date(),
          errorMessage: `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      
      // Get available models
      const availableModels = data.models?.map((model: any) => model.name) || [];

      return {
        isHealthy: true,
        lastChecked: new Date(),
        latency,
        availableModels
      };
    } catch (error: any) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        errorMessage: error.code === 'ECONNREFUSED' 
          ? 'Ollama service not running' 
          : (error.message || 'Health check failed')
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const status = await this.checkHealth();
      return status.isHealthy;
    } catch {
      return false;
    }
  }

  // Ollama-specific methods
  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new ProviderError('Failed to fetch models', 'ollama');
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.warn('Failed to fetch Ollama models:', error);
      return this.info.availableModels;
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to pull model ${modelName}`, 'ollama');
      }

      // Note: This is a streaming response, but we're not handling the stream here
      console.log(`Started pulling model: ${modelName}`);
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to delete model ${modelName}`, 'ollama');
      }
    } catch (error) {
      throw this.formatError(error);
    }
  }
}