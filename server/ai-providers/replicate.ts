/**
 * Replicate Provider Implementation
 * 
 * Cloud-hosted AI models with permissive content policies.
 * Supports both text generation and image generation models.
 * Adult-content-friendly within legal bounds.
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

interface ReplicateInput {
  prompt: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: ReplicateInput;
  output?: string | string[];
  error?: string;
  created_at: string;
  completed_at?: string;
  urls?: {
    get: string;
    cancel: string;
  };
}

export class ReplicateProvider extends BaseAIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'replicate',
      name: 'Replicate',
      description: 'Cloud AI platform with diverse models and permissive policies',
      type: ProviderType.ADULT_FRIENDLY,
      website: 'https://replicate.com',
      pricing: 'Pay-per-prediction',
      capabilities: {
        supportsJsonMode: false,
        supportsImageGeneration: true,
        supportsStreamingResponse: false,
        maxContextLength: 32768, // Varies by model
        supportedModalities: ['text', 'image']
      },
      compliance: {
        allowsAdultContent: true,
        requiresExplicitConsent: true,
        hasBuiltInFiltering: false,
        termsOfServiceUrl: 'https://replicate.com/terms',
        contentPolicyUrl: 'https://replicate.com/safety'
      },
      defaultModel: 'meta/llama-2-70b-chat',
      availableModels: [
        'meta/llama-2-70b-chat',
        'meta/llama-2-13b-chat',
        'mistralai/mistral-7b-instruct-v0.1',
        'mistralai/mixtral-8x7b-instruct-v0.1',
        'nateraw/salmonn',
        'stability-ai/sdxl',
        'lucataco/animate-diff',
        'recraft-ai/recraft-v3'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 5, // More conservative for cloud service
      requestsPerHour: 60,
      requestsPerDay: 300,
      separate: {
        adult: {
          requestsPerMinute: 3,
          requestsPerHour: 30,
        },
        regular: {
          requestsPerMinute: 5,
          requestsPerHour: 60,
        }
      }
    };

    super(config, info, rateLimitConfig);

    if (!config.apiKey) {
      throw new ProviderError('Replicate API token is required', 'replicate', 'MISSING_API_KEY');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.replicate.com/v1';
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    try {
      const model = this.config.model || this.info.defaultModel || 'meta/llama-2-70b-chat';
      const temperature = request.temperature ?? this.config.temperature ?? 0.7;
      const maxTokens = request.maxTokens ?? this.config.maxTokens ?? 1000;

      // Build the prompt from messages
      let prompt = '';
      let systemPrompt = '';

      for (const msg of request.messages) {
        if (msg.role === 'system') {
          systemPrompt += msg.content + '\n';
        } else if (msg.role === 'user') {
          prompt += `Human: ${isAdultMode ? msg.content : this.sanitizeContent(msg.content, false)}\n`;
        } else if (msg.role === 'assistant') {
          prompt += `Assistant: ${msg.content}\n`;
        }
      }
      prompt += 'Assistant:';

      const input: ReplicateInput = {
        prompt,
        ...(systemPrompt && { system_prompt: systemPrompt.trim() }),
        max_tokens: maxTokens,
        temperature
      };

      // Create prediction
      const createResponse = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.apiKey}`,
          ...(this.config.customHeaders || {})
        },
        body: JSON.stringify({
          version: this.getModelVersion(model),
          input
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.text();
        
        if (createResponse.status === 429) {
          throw new ProviderError('Rate limit exceeded', 'replicate', 'RATE_LIMIT', 429);
        }
        
        if (createResponse.status === 401) {
          throw new ProviderError('Invalid API token', 'replicate', 'INVALID_API_KEY', 401);
        }

        throw new ProviderError(
          `HTTP ${createResponse.status}: ${errorData}`,
          'replicate',
          'API_ERROR',
          createResponse.status
        );
      }

      const prediction: ReplicatePrediction = await createResponse.json();

      // Poll for completion
      const result = await this.pollPrediction(prediction.id);

      if (result.status === 'failed') {
        throw new ProviderError(`Prediction failed: ${result.error}`, 'replicate', 'PREDICTION_FAILED');
      }

      if (!result.output) {
        throw new ProviderError('No output generated', 'replicate', 'NO_RESPONSE');
      }

      const content = Array.isArray(result.output) ? result.output.join('') : result.output;
      
      // Estimate token usage
      const estimatedPromptTokens = Math.floor(prompt.length / 4);
      const estimatedCompletionTokens = Math.floor(content.length / 4);

      return {
        content,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens
        },
        model,
        provider: 'replicate'
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw this.formatError(error);
    }
  }

  private async pollPrediction(predictionId: string, maxAttempts: number = 30): Promise<ReplicatePrediction> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch prediction: HTTP ${response.status}`, 'replicate');
      }

      const prediction: ReplicatePrediction = await response.json();

      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new ProviderError('Prediction timed out', 'replicate', 'TIMEOUT');
  }

  private getModelVersion(model: string): string {
    // This would typically be fetched from Replicate's API or maintained as a mapping
    // For now, using example versions
    const modelVersions: Record<string, string> = {
      'meta/llama-2-70b-chat': '02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3',
      'meta/llama-2-13b-chat': 'f4e2de70d66816a838a89eeeb621910adffb0dd0baba3976c96980970978018d',
      'mistralai/mistral-7b-instruct-v0.1': '5fe0a3d7ac2852264a25279d1dfb798acbc4d49711d126646594e212cb821749',
      'stability-ai/sdxl': '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
    };

    return modelVersions[model] || modelVersions['meta/llama-2-70b-chat'];
  }

  async checkHealth(): Promise<AIProviderStatus> {
    try {
      const startTime = Date.now();
      
      // Simple health check by listing account info
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`
        }
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

  // Replicate-specific methods
  async generateImage(prompt: string, model: string = 'stability-ai/sdxl'): Promise<string> {
    if (!this.info.capabilities.supportsImageGeneration) {
      throw new ProviderError('Image generation not supported', 'replicate', 'NOT_SUPPORTED');
    }

    try {
      const input = {
        prompt: this.sanitizeContent(prompt, true), // Allow more permissive content for images
        negative_prompt: 'blurry, low quality',
        width: 1024,
        height: 1024,
        num_inference_steps: 20
      };

      const createResponse = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.apiKey}`
        },
        body: JSON.stringify({
          version: this.getModelVersion(model),
          input
        })
      });

      if (!createResponse.ok) {
        throw new ProviderError(`Failed to create image prediction: HTTP ${createResponse.status}`, 'replicate');
      }

      const prediction = await createResponse.json();
      const result = await this.pollPrediction(prediction.id);

      if (result.status === 'failed') {
        throw new ProviderError(`Image generation failed: ${result.error}`, 'replicate');
      }

      if (!result.output || !Array.isArray(result.output) || result.output.length === 0) {
        throw new ProviderError('No image generated', 'replicate');
      }

      return result.output[0]; // Return first image URL
    } catch (error) {
      throw this.formatError(error);
    }
  }
}