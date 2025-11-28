/**
 * RunPod Provider Implementation
 * 
 * Serverless GPU platform for custom AI model deployments.
 * Highly customizable with user-controlled content policies.
 * Adult-content-friendly with full user control.
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

interface RunPodInput {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  system_prompt?: string;
}

interface RunPodResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: any;
  error?: string;
  executionTime?: number;
}

export class RunPodProvider extends BaseAIProvider {
  private apiKey: string;
  private endpointId: string;
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'runpod',
      name: 'RunPod Serverless',
      description: 'Custom serverless AI deployments with full control',
      type: ProviderType.SELF_HOSTED,
      website: 'https://runpod.io',
      pricing: 'Pay-per-second GPU usage',
      capabilities: {
        supportsJsonMode: true, // Depends on deployed model
        supportsImageGeneration: true, // Depends on deployed model
        supportsStreamingResponse: false,
        maxContextLength: 32768, // Configurable
        supportedModalities: ['text', 'image'] // Depends on deployed model
      },
      compliance: {
        allowsAdultContent: true,
        requiresExplicitConsent: true,
        hasBuiltInFiltering: false,
        termsOfServiceUrl: 'https://runpod.io/terms',
        contentPolicyUrl: 'User-controlled content policy'
      },
      defaultModel: 'custom-deployment',
      availableModels: [
        'custom-deployment',
        'llama-70b-chat',
        'mistral-7b-instruct',
        'stable-diffusion-xl',
        'whisper-large-v3'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 10, // Conservative for serverless
      requestsPerHour: 100,
      requestsPerDay: 500,
      separate: {
        adult: {
          requestsPerMinute: 5,
          requestsPerHour: 50,
        },
        regular: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
        }
      }
    };

    super(config, info, rateLimitConfig);

    if (!config.apiKey) {
      throw new ProviderError('RunPod API key is required', 'runpod', 'MISSING_API_KEY');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.runpod.ai/v2';
    
    // Extract endpoint ID from config or model name
    this.endpointId = this.extractEndpointId(config.model || 'default');
  }

  private extractEndpointId(model: string): string {
    // If model looks like an endpoint ID, use it directly
    if (model.length > 10 && !model.includes('/') && !model.includes(' ')) {
      return model;
    }
    
    // Otherwise, use a default or throw error
    throw new ProviderError('RunPod endpoint ID required in model field', 'runpod', 'MISSING_ENDPOINT');
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    try {
      const temperature = request.temperature ?? this.config.temperature ?? 0.7;
      const maxTokens = request.maxTokens ?? this.config.maxTokens ?? 1000;

      // Build the prompt from messages
      let prompt = '';
      let systemPrompt = '';

      for (const msg of request.messages) {
        if (msg.role === 'system') {
          systemPrompt += msg.content + '\n';
        } else if (msg.role === 'user') {
          prompt += `User: ${isAdultMode ? msg.content : this.sanitizeContent(msg.content, false)}\n`;
        } else if (msg.role === 'assistant') {
          prompt += `Assistant: ${msg.content}\n`;
        }
      }
      prompt += 'Assistant:';

      const input: RunPodInput = {
        prompt,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt && { system_prompt: systemPrompt.trim() })
      };

      // Run the serverless function
      const runResponse = await fetch(`${this.baseUrl}/${this.endpointId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.config.customHeaders || {})
        },
        body: JSON.stringify({ input })
      });

      if (!runResponse.ok) {
        const errorData = await runResponse.text();
        
        if (runResponse.status === 429) {
          throw new ProviderError('Rate limit exceeded', 'runpod', 'RATE_LIMIT', 429);
        }
        
        if (runResponse.status === 401) {
          throw new ProviderError('Invalid API key', 'runpod', 'INVALID_API_KEY', 401);
        }

        if (runResponse.status === 404) {
          throw new ProviderError(`Endpoint ${this.endpointId} not found`, 'runpod', 'ENDPOINT_NOT_FOUND', 404);
        }

        throw new ProviderError(
          `HTTP ${runResponse.status}: ${errorData}`,
          'runpod',
          'API_ERROR',
          runResponse.status
        );
      }

      const runData = await runResponse.json();
      const jobId = runData.id;

      if (!jobId) {
        throw new ProviderError('No job ID returned', 'runpod', 'NO_JOB_ID');
      }

      // Poll for completion
      const result = await this.pollJob(jobId);

      if (result.status === 'FAILED') {
        throw new ProviderError(`Job failed: ${result.error}`, 'runpod', 'JOB_FAILED');
      }

      if (!result.output) {
        throw new ProviderError('No output generated', 'runpod', 'NO_RESPONSE');
      }

      // Handle different output formats
      let content: string;
      if (typeof result.output === 'string') {
        content = result.output;
      } else if (result.output.text) {
        content = result.output.text;
      } else if (result.output.choices && result.output.choices[0]?.message?.content) {
        content = result.output.choices[0].message.content;
      } else {
        content = JSON.stringify(result.output);
      }

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
        model: this.endpointId,
        provider: 'runpod'
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw this.formatError(error);
    }
  }

  private async pollJob(jobId: string, maxAttempts: number = 60): Promise<RunPodResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/${this.endpointId}/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch job status: HTTP ${response.status}`, 'runpod');
      }

      const result: RunPodResponse = await response.json();

      if (result.status === 'COMPLETED' || result.status === 'FAILED') {
        return result;
      }

      // Wait before next poll (exponential backoff)
      const delay = Math.min(1000 * Math.pow(1.5, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new ProviderError('Job timed out', 'runpod', 'TIMEOUT');
  }

  async checkHealth(): Promise<AIProviderStatus> {
    try {
      const startTime = Date.now();
      
      // Check endpoint health
      const response = await fetch(`${this.baseUrl}/${this.endpointId}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const latency = Date.now() - startTime;
      const isHealthy = response.ok;

      if (isHealthy) {
        const data = await response.json();
        
        return {
          isHealthy: true,
          lastChecked: new Date(),
          latency,
          availableModels: [this.endpointId]
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

  // RunPod-specific methods
  async getEndpointInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.endpointId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch endpoint info: HTTP ${response.status}`, 'runpod');
      }

      return await response.json();
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getJobHistory(limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.endpointId}/requests?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch job history: HTTP ${response.status}`, 'runpod');
      }

      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.endpointId}/cancel/${jobId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to cancel job: HTTP ${response.status}`, 'runpod');
      }
    } catch (error) {
      throw this.formatError(error);
    }
  }
}