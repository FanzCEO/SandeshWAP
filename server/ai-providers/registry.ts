/**
 * AI Provider Registry
 * 
 * Central registry for managing AI providers, rate limiting, health monitoring,
 * and Adult Mode compliance.
 */

import { 
  BaseAIProvider, 
  ProviderInfo, 
  ProviderType, 
  AIRequest, 
  AIResponse,
  AIProviderStatus,
  ProviderError,
  RateLimitError,
  ContentFilter
} from './base';

interface RateLimitEntry {
  timestamps: number[];
  adultModeTimestamps: number[];
}

interface ProviderHealthStatus {
  status: AIProviderStatus;
  lastHealthCheck: number;
}

export class AIProviderRegistry {
  private providers = new Map<string, BaseAIProvider>();
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private healthStatus = new Map<string, ProviderHealthStatus>();
  private auditLog: Array<{
    timestamp: Date;
    provider: string;
    isAdultMode: boolean;
    request: string;
    response: string;
    clientIp: string;
  }> = [];

  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

  constructor() {
    // Start background health monitoring
    setInterval(() => this.performHealthChecks(), this.HEALTH_CHECK_INTERVAL);
  }

  registerProvider(provider: BaseAIProvider): void {
    const info = provider.getInfo();
    this.providers.set(info.id, provider);
    
    console.log(`Registered AI provider: ${info.name} (${info.type})`);
  }

  getProvider(providerId: string): BaseAIProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): ProviderInfo[] {
    return Array.from(this.providers.values()).map(provider => provider.getInfo());
  }

  getMainstreamProviders(): ProviderInfo[] {
    return this.getAllProviders().filter(info => info.type === ProviderType.MAINSTREAM);
  }

  getAdultFriendlyProviders(): ProviderInfo[] {
    return this.getAllProviders().filter(info => 
      info.type === ProviderType.ADULT_FRIENDLY || info.type === ProviderType.SELF_HOSTED
    );
  }

  async generateResponse(
    providerId: string,
    request: AIRequest,
    clientIp: string,
    isAdultMode: boolean = false
  ): Promise<AIResponse> {
    const provider = this.getProvider(providerId);
    
    if (!provider) {
      throw new ProviderError(`Provider ${providerId} not found`, providerId);
    }

    // Check if provider supports adult mode when requested
    if (isAdultMode && !provider.supportsAdultContent()) {
      throw new ProviderError(
        `Provider ${providerId} does not support adult content`,
        providerId,
        'ADULT_MODE_NOT_SUPPORTED'
      );
    }

    // Rate limiting check
    await this.checkRateLimit(providerId, clientIp, isAdultMode);

    // Content filtering for illegal content (always applied)
    const filteredMessages = request.messages.map(msg => ({
      ...msg,
      content: ContentFilter.filterIllegalContent(msg.content)
    }));

    const filteredRequest = { ...request, messages: filteredMessages };

    // Check for blocked content
    const hasIllegalContent = request.messages.some(msg => 
      ContentFilter.containsIllegalContent(msg.content)
    );

    if (hasIllegalContent) {
      throw new ProviderError(
        'Request contains illegal content and has been blocked',
        providerId,
        'ILLEGAL_CONTENT'
      );
    }

    try {
      const response = await provider.generateResponse(filteredRequest, isAdultMode);
      
      // Audit logging
      this.logRequest(providerId, filteredRequest, response, clientIp, isAdultMode);
      
      return response;
    } catch (error) {
      console.error(`Provider ${providerId} error:`, error);
      
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw new ProviderError(
        `Provider ${providerId} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        providerId
      );
    }
  }

  private async checkRateLimit(providerId: string, clientIp: string, isAdultMode: boolean): Promise<void> {
    const key = `${providerId}:${clientIp}`;
    const now = Date.now();
    
    let entry = this.rateLimitMap.get(key) || { timestamps: [], adultModeTimestamps: [] };
    
    // Clean old timestamps
    entry.timestamps = entry.timestamps.filter(ts => now - ts < this.RATE_LIMIT_WINDOW);
    entry.adultModeTimestamps = entry.adultModeTimestamps.filter(ts => now - ts < this.RATE_LIMIT_WINDOW);
    
    const provider = this.getProvider(providerId);
    if (!provider) return;
    
    const rateLimitConfig = (provider as any).rateLimitConfig;
    
    if (isAdultMode) {
      if (entry.adultModeTimestamps.length >= rateLimitConfig.separate.adult.requestsPerMinute) {
        throw new RateLimitError(providerId, 60);
      }
      entry.adultModeTimestamps.push(now);
    } else {
      if (entry.timestamps.length >= rateLimitConfig.separate.regular.requestsPerMinute) {
        throw new RateLimitError(providerId, 60);
      }
      entry.timestamps.push(now);
    }
    
    this.rateLimitMap.set(key, entry);
  }

  private logRequest(
    providerId: string,
    request: AIRequest,
    response: AIResponse,
    clientIp: string,
    isAdultMode: boolean
  ): void {
    this.auditLog.push({
      timestamp: new Date(),
      provider: providerId,
      isAdultMode,
      request: JSON.stringify(request).substring(0, 500), // Truncate for storage
      response: JSON.stringify(response).substring(0, 500),
      clientIp
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  async getProviderStatus(providerId: string): Promise<AIProviderStatus | null> {
    const provider = this.getProvider(providerId);
    if (!provider) return null;

    const cached = this.healthStatus.get(providerId);
    const now = Date.now();

    // Return cached status if recent
    if (cached && (now - cached.lastHealthCheck) < this.HEALTH_CHECK_INTERVAL) {
      return cached.status;
    }

    // Perform fresh health check
    try {
      const status = await provider.checkHealth();
      this.healthStatus.set(providerId, {
        status,
        lastHealthCheck: now
      });
      return status;
    } catch (error) {
      const errorStatus: AIProviderStatus = {
        isHealthy: false,
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Health check failed'
      };
      
      this.healthStatus.set(providerId, {
        status: errorStatus,
        lastHealthCheck: now
      });
      
      return errorStatus;
    }
  }

  private async performHealthChecks(): Promise<void> {
    console.log('Performing AI provider health checks...');
    
    const providers = Array.from(this.providers.keys());
    const healthPromises = providers.map(async (providerId) => {
      try {
        await this.getProviderStatus(providerId);
      } catch (error) {
        console.error(`Health check failed for provider ${providerId}:`, error);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  getAuditLog(limit: number = 100): Array<any> {
    return this.auditLog.slice(-limit);
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  // Fallback provider logic
  async generateResponseWithFallback(
    preferredProviderId: string,
    fallbackProviderIds: string[],
    request: AIRequest,
    clientIp: string,
    isAdultMode: boolean = false
  ): Promise<AIResponse> {
    const providers = [preferredProviderId, ...fallbackProviderIds];
    
    for (const providerId of providers) {
      try {
        return await this.generateResponse(providerId, request, clientIp, isAdultMode);
      } catch (error) {
        console.warn(`Provider ${providerId} failed, trying next:`, error instanceof Error ? error.message : error);
        
        // If it's a rate limit error and we have more providers, continue
        if (error instanceof RateLimitError && providerId !== providers[providers.length - 1]) {
          continue;
        }
        
        // If it's the last provider or a non-recoverable error, throw
        if (providerId === providers[providers.length - 1]) {
          throw error;
        }
      }
    }
    
    throw new ProviderError('All providers failed', 'registry', 'ALL_PROVIDERS_FAILED');
  }
}

// Global registry instance
export const aiProviderRegistry = new AIProviderRegistry();