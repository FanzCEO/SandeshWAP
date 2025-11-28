/**
 * Google Gemini Provider Implementation
 * 
 * Google's AI model with strong multimodal capabilities.
 * Supports text and image understanding.
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

interface GeminiContent {
  role: string;
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider extends BaseAIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    const info: ProviderInfo = {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Google\'s multimodal AI with strong reasoning capabilities',
      type: ProviderType.MAINSTREAM,
      website: 'https://ai.google.dev',
      pricing: 'Pay-per-token with free tier',
      capabilities: {
        supportsJsonMode: true,
        supportsImageGeneration: false,
        supportsStreamingResponse: true,
        maxContextLength: 32768, // Gemini Pro
        supportedModalities: ['text', 'image']
      },
      compliance: {
        allowsAdultContent: false,
        requiresExplicitConsent: false,
        hasBuiltInFiltering: true,
        termsOfServiceUrl: 'https://ai.google.dev/terms',
        contentPolicyUrl: 'https://ai.google.dev/docs/safety_guidance'
      },
      defaultModel: 'gemini-1.5-flash',
      availableModels: [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro',
        'gemini-pro-vision'
      ]
    };

    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: 20,
      requestsPerHour: 300,
      requestsPerDay: 1500,
      tokensPerMinute: 100000,
      separate: {
        adult: {
          requestsPerMinute: 0, // No adult content supported
          requestsPerHour: 0,
        },
        regular: {
          requestsPerMinute: 20,
          requestsPerHour: 300,
        }
      }
    };

    super(config, info, rateLimitConfig);

    if (!config.apiKey) {
      throw new ProviderError('Google API key is required', 'gemini', 'MISSING_API_KEY');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  async generateResponse(request: AIRequest, isAdultMode?: boolean): Promise<AIResponse> {
    this.validateRequest(request);

    if (isAdultMode) {
      throw new ProviderError(
        'Google Gemini does not support adult content mode',
        'gemini',
        'ADULT_MODE_NOT_SUPPORTED'
      );
    }

    try {
      const model = this.config.model || this.info.defaultModel || 'gemini-1.5-flash';
      const temperature = request.temperature ?? this.config.temperature ?? 0.3;
      const maxTokens = request.maxTokens ?? this.config.maxTokens ?? 1000;

      // Convert messages to Gemini format
      const contents: GeminiContent[] = [];
      let systemInstruction = '';

      for (const msg of request.messages) {
        if (msg.role === 'system') {
          systemInstruction += msg.content + '\n';
        } else {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: this.sanitizeContent(msg.content, false) }]
          });
        }
      }

      const requestPayload: any = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(request.responseFormat === 'json' && { responseMimeType: 'application/json' })
        }
      };

      if (systemInstruction.trim()) {
        requestPayload.systemInstruction = {
          parts: [{ text: systemInstruction.trim() }]
        };
      }

      const response = await fetch(
        `${this.baseUrl}/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.customHeaders || {})
          },
          body: JSON.stringify(requestPayload)
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        
        if (response.status === 429) {
          throw new ProviderError('Rate limit exceeded', 'gemini', 'RATE_LIMIT', 429);
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError('Invalid API key or permissions', 'gemini', 'INVALID_API_KEY', response.status);
        }

        if (response.status === 400 && errorData.includes('SAFETY')) {
          throw new ProviderError('Content filtered by Gemini safety systems', 'gemini', 'CONTENT_FILTERED', 400);
        }

        throw new ProviderError(
          `HTTP ${response.status}: ${errorData}`,
          'gemini',
          'API_ERROR',
          response.status
        );
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new ProviderError('No response generated', 'gemini', 'NO_RESPONSE');
      }

      const candidate = data.candidates[0];
      
      // Check for safety blocking
      if (candidate.finishReason === 'SAFETY') {
        throw new ProviderError('Response blocked by safety filters', 'gemini', 'CONTENT_FILTERED', 400);
      }

      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new ProviderError('No content in response', 'gemini', 'NO_RESPONSE');
      }

      const textContent = candidate.content.parts
        .map(part => part.text)
        .join('');

      return {
        content: textContent,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount
        } : undefined,
        model,
        provider: 'gemini'
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
        contents: [{
          role: 'user',
          parts: [{ text: 'Hi' }]
        }],
        generationConfig: {
          maxOutputTokens: 5,
          temperature: 0
        }
      };

      const response = await fetch(
        `${this.baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        }
      );

      const latency = Date.now() - startTime;
      const isHealthy = response.ok;

      if (isHealthy) {
        const data = await response.json();
        const hasValidResponse = data.candidates && data.candidates.length > 0;
        
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
}