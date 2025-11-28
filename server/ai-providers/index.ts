/**
 * AI Provider System Index
 * 
 * Central registration and management of all AI providers.
 * Automatically registers mainstream and adult-friendly providers.
 */

import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { PerplexityProvider } from './perplexity';
import { OllamaProvider } from './ollama';
import { ReplicateProvider } from './replicate';
import { TogetherProvider } from './together';
import { RunPodProvider } from './runpod';
import { aiProviderRegistry } from './registry';
import { AdultModeManager } from './adult-mode';
import { ProviderType, AIProviderConfig } from './base';

interface ProviderCredentials {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  perplexity?: string;
  ollama?: string;
  replicate?: string;
  together?: string;
  runpod?: string;
}

class AIProviderSystem {
  private initialized = false;
  private credentials: ProviderCredentials = {};
  private adultModeManager: AdultModeManager;

  constructor() {
    this.adultModeManager = AdultModeManager.getInstance();
    this.loadCredentials();
  }

  /**
   * Load API credentials from environment variables
   */
  private loadCredentials(): void {
    this.credentials = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      perplexity: process.env.PERPLEXITY_API_KEY,
      ollama: process.env.OLLAMA_BASE_URL, // URL instead of API key
      replicate: process.env.REPLICATE_API_TOKEN,
      together: process.env.TOGETHER_API_KEY,
      runpod: process.env.RUNPOD_API_KEY
    };
  }

  /**
   * Initialize and register all available providers
   */
  initialize(): void {
    if (this.initialized) {
      console.log('AI Provider System already initialized');
      return;
    }

    console.log('Initializing AI Provider System...');

    this.registerMainstreamProviders();
    this.registerAdultFriendlyProviders();

    this.initialized = true;
    
    const providers = aiProviderRegistry.getAllProviders();
    console.log(`AI Provider System initialized with ${providers.length} providers:`);
    
    providers.forEach(provider => {
      console.log(`  - ${provider.name} (${provider.type})`);
    });
  }

  /**
   * Register mainstream AI providers (safe content only)
   */
  private registerMainstreamProviders(): void {
    // OpenAI
    if (this.credentials.openai) {
      try {
        const provider = new OpenAIProvider({
          apiKey: this.credentials.openai
        });
        aiProviderRegistry.registerProvider(provider);
      } catch (error) {
        console.warn('Failed to register OpenAI provider:', error);
      }
    } else {
      console.warn('OpenAI API key not found in environment variables');
    }

    // Anthropic Claude
    if (this.credentials.anthropic) {
      try {
        const provider = new AnthropicProvider({
          apiKey: this.credentials.anthropic
        });
        aiProviderRegistry.registerProvider(provider);
      } catch (error) {
        console.warn('Failed to register Anthropic provider:', error);
      }
    } else {
      console.warn('Anthropic API key not found in environment variables');
    }

    // Google Gemini
    if (this.credentials.gemini) {
      try {
        const provider = new GeminiProvider({
          apiKey: this.credentials.gemini
        });
        aiProviderRegistry.registerProvider(provider);
      } catch (error) {
        console.warn('Failed to register Gemini provider:', error);
      }
    } else {
      console.warn('Gemini API key not found in environment variables');
    }

    // Perplexity
    if (this.credentials.perplexity) {
      try {
        const provider = new PerplexityProvider({
          apiKey: this.credentials.perplexity
        });
        aiProviderRegistry.registerProvider(provider);
      } catch (error) {
        console.warn('Failed to register Perplexity provider:', error);
      }
    } else {
      console.warn('Perplexity API key not found in environment variables');
    }
  }

  /**
   * Register adult-content-friendly providers
   */
  private registerAdultFriendlyProviders(): void {
    // Ollama (self-hosted)
    try {
      const provider = new OllamaProvider({
        baseUrl: this.credentials.ollama || 'http://localhost:11434'
      });
      aiProviderRegistry.registerProvider(provider);
    } catch (error) {
      console.warn('Failed to register Ollama provider:', error);
    }

    // Replicate
    if (this.credentials.replicate) {
      try {
        const provider = new ReplicateProvider({
          apiKey: this.credentials.replicate
        });
        aiProviderRegistry.registerProvider(provider);
      } catch (error) {
        console.warn('Failed to register Replicate provider:', error);
      }
    } else {
      console.warn('Replicate API token not found in environment variables');
    }

    // Together AI
    if (this.credentials.together) {
      try {
        const provider = new TogetherProvider({
          apiKey: this.credentials.together
        });
        aiProviderRegistry.registerProvider(provider);
      } catch (error) {
        console.warn('Failed to register Together AI provider:', error);
      }
    } else {
      console.warn('Together AI API key not found in environment variables');
    }

    // RunPod
    if (this.credentials.runpod) {
      try {
        const provider = new RunPodProvider({
          apiKey: this.credentials.runpod,
          model: process.env.RUNPOD_ENDPOINT_ID || 'default'
        });
        aiProviderRegistry.registerProvider(provider);
      } catch (error) {
        console.warn('Failed to register RunPod provider:', error);
      }
    } else {
      console.warn('RunPod API key not found in environment variables');
    }
  }

  /**
   * Get all available providers by category
   */
  getProvidersByCategory(): {
    mainstream: any[];
    adultFriendly: any[];
    selfHosted: any[];
  } {
    const all = aiProviderRegistry.getAllProviders();
    
    return {
      mainstream: all.filter(p => p.type === ProviderType.MAINSTREAM),
      adultFriendly: all.filter(p => p.type === ProviderType.ADULT_FRIENDLY),
      selfHosted: all.filter(p => p.type === ProviderType.SELF_HOSTED)
    };
  }

  /**
   * Get provider recommendations based on use case
   */
  getRecommendedProviders(useCase: 'general' | 'creative' | 'technical' | 'research'): string[] {
    const recommendations: Record<string, string[]> = {
      general: ['openai', 'anthropic', 'gemini'],
      creative: ['anthropic', 'together', 'replicate'],
      technical: ['openai', 'perplexity', 'gemini'],
      research: ['perplexity', 'anthropic', 'together']
    };

    return recommendations[useCase] || recommendations.general;
  }

  /**
   * Get provider configuration requirements
   */
  getProviderConfigRequirements(): Record<string, {
    apiKey: boolean;
    endpoint?: boolean;
    model?: boolean;
    notes?: string;
  }> {
    return {
      openai: {
        apiKey: true,
        notes: 'Get API key from https://platform.openai.com'
      },
      anthropic: {
        apiKey: true,
        notes: 'Get API key from https://console.anthropic.com'
      },
      gemini: {
        apiKey: true,
        notes: 'Get API key from https://ai.google.dev'
      },
      perplexity: {
        apiKey: true,
        notes: 'Get API key from https://perplexity.ai'
      },
      ollama: {
        apiKey: false,
        endpoint: true,
        notes: 'Requires Ollama running locally or on custom endpoint'
      },
      replicate: {
        apiKey: true,
        notes: 'Get API token from https://replicate.com'
      },
      together: {
        apiKey: true,
        notes: 'Get API key from https://together.ai'
      },
      runpod: {
        apiKey: true,
        endpoint: true,
        model: true,
        notes: 'Requires RunPod serverless endpoint deployment'
      }
    };
  }

  /**
   * Test provider connectivity
   */
  async testProvider(providerId: string): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const status = await aiProviderRegistry.getProviderStatus(providerId);
      
      if (status?.isHealthy) {
        return {
          success: true,
          latency: status.latency
        };
      } else {
        return {
          success: false,
          error: status?.errorMessage || 'Provider not healthy'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    initialized: boolean;
    totalProviders: number;
    healthyProviders: number;
    adultModeEnabled: boolean;
    consentStats: any;
  } {
    const providers = aiProviderRegistry.getAllProviders();
    const consentStats = this.adultModeManager.getConsentStats();
    
    return {
      initialized: this.initialized,
      totalProviders: providers.length,
      healthyProviders: 0, // Would need async call to check all
      adultModeEnabled: providers.some(p => p.compliance.allowsAdultContent),
      consentStats
    };
  }
}

// Global instance
export const aiProviderSystem = new AIProviderSystem();

// Export the registry for direct access
export { aiProviderRegistry } from './registry';
export { AdultModeManager } from './adult-mode';

// Auto-initialize on import
aiProviderSystem.initialize();

export default aiProviderSystem;