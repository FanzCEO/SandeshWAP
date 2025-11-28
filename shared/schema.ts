import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  
  // User role
  role: text("role").notNull().default('fan'), // 'creator' or 'fan'
  
  // Social login
  googleId: text("google_id"),
  appleId: text("apple_id"),
  twitterId: text("twitter_id"),
  
  // Profile fields
  displayName: text("display_name"),
  avatar: text("avatar"),
  banner: text("banner"),
  bio: text("bio"),
  pronouns: text("pronouns"),
  
  // Creator-specific fields
  stageName: text("stage_name"),
  niche: text("niche").array(), // tags/categories
  isVerified: boolean("is_verified").notNull().default(false),
  verificationStatus: text("verification_status").default('pending'), // pending, approved, rejected
  verificationData: jsonb("verification_data"), // ID verification data
  payoutMethod: text("payout_method"), // paypal, bank, crypto
  payoutDetails: jsonb("payout_details"), // encrypted payout info
  earningsTotal: integer("earnings_total").default(0), // in cents
  
  // Fan-specific fields
  interests: text("interests").array(), // selected interests/niches
  preferences: jsonb("preferences"), // personalization data
  
  // Onboarding status
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingStep: integer("onboarding_step").default(0), // current step in onboarding
  
  // Age verification
  birthday: timestamp("birthday"),
  ageVerified: boolean("age_verified").notNull().default(false),
  
  // Account status
  isActive: boolean("is_active").notNull().default(true),
  isPremium: boolean("is_premium").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  path: text("path").notNull().unique(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// AI Provider Settings Table
export const aiProviderSettings = pgTable("ai_provider_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"), // For anonymous users
  providerId: text("provider_id").notNull(), // openai, anthropic, etc.
  isEnabled: boolean("is_enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  model: text("model"), // specific model to use
  temperature: integer("temperature"), // temperature * 100 for precision
  maxTokens: integer("max_tokens"),
  customEndpoint: text("custom_endpoint"), // for self-hosted providers
  encryptedApiKey: text("encrypted_api_key"), // encrypted API key
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Adult Mode Consent Records
export const adultModeConsents = pgTable("adult_mode_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"), // For anonymous users
  consentGiven: boolean("consent_given").notNull().default(false),
  consentVersion: text("consent_version").notNull(),
  userAge: integer("user_age"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  jurisdiction: text("jurisdiction"), // for compliance
  consentTimestamp: timestamp("consent_timestamp").notNull().default(sql`now()`),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at").notNull(), // 24 hour expiry
});

// AI Usage Audit Log
export const aiUsageLog = pgTable("ai_usage_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  providerId: text("provider_id").notNull(),
  model: text("model"),
  isAdultMode: boolean("is_adult_mode").notNull().default(false),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  requestHash: text("request_hash"), // hash of request for privacy
  responseHash: text("response_hash"), // hash of response
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// AI Provider Health Status
export const aiProviderHealth = pgTable("ai_provider_health", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull().unique(),
  isHealthy: boolean("is_healthy").notNull().default(false),
  lastChecked: timestamp("last_checked").notNull().default(sql`now()`),
  latencyMs: integer("latency_ms"),
  errorMessage: text("error_message"),
  availableModels: jsonb("available_models"), // JSON array of available models
  healthMetrics: jsonb("health_metrics"), // Additional metrics
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// User AI Preferences
export const userAiPreferences = pgTable("user_ai_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"), // For anonymous users
  defaultProvider: text("default_provider"), // default provider ID
  fallbackProviders: jsonb("fallback_providers"), // JSON array of fallback provider IDs
  maxTokensDefault: integer("max_tokens_default").default(1000),
  temperatureDefault: integer("temperature_default").default(70), // 0.7 * 100
  enableAdultMode: boolean("enable_adult_mode").notNull().default(false),
  enableAuditLogging: boolean("enable_audit_logging").notNull().default(true),
  contentFilterLevel: text("content_filter_level").notNull().default('strict'), // strict, moderate, minimal
  rateLimitTier: text("rate_limit_tier").default('free'), // free, premium, enterprise
  preferences: jsonb("preferences"), // Additional user preferences
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Sign-up schemas
export const signUpSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8), // Required for security
  role: z.enum(['creator', 'fan']),
  displayName: z.string().min(1).max(100).optional(),
  birthday: z.string().optional(), // ISO date string
  // Note: Social login will be implemented with proper OAuth verification in future
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8), // Match sign-up requirements
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  pronouns: z.string().max(50).optional(),
  stageName: z.string().min(1).max(100).optional(), // for creators
  niche: z.array(z.string()).optional(), // for creators
  interests: z.array(z.string()).optional(), // for fans
});

export const updateOnboardingSchema = z.object({
  onboardingStep: z.number().int().min(0),
  onboardingCompleted: z.boolean().optional(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  path: true,
  content: true,
}).required({
  content: true,
});

// AI Provider Settings Schemas
export const insertAiProviderSettingsSchema = createInsertSchema(aiProviderSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdultModeConsentSchema = createInsertSchema(adultModeConsents).omit({
  id: true,
  consentTimestamp: true,
});

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLog).omit({
  id: true,
  createdAt: true,
});

export const insertUserAiPreferencesSchema = createInsertSchema(userAiPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SignUpData = z.infer<typeof signUpSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type UpdateOnboardingData = z.infer<typeof updateOnboardingSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertAiProviderSettings = z.infer<typeof insertAiProviderSettingsSchema>;
export type AiProviderSettings = typeof aiProviderSettings.$inferSelect;

export type InsertAdultModeConsent = z.infer<typeof insertAdultModeConsentSchema>;
export type AdultModeConsent = typeof adultModeConsents.$inferSelect;

export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type AiUsageLog = typeof aiUsageLog.$inferSelect;

export type InsertUserAiPreferences = z.infer<typeof insertUserAiPreferencesSchema>;
export type UserAiPreferences = typeof userAiPreferences.$inferSelect;

// File system types for real file operations
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  filesCount: number;
  size: number;
}

export interface SearchResult {
  path: string;
  line: number;
  content: string;
}

// Template catalog types
export interface TemplateFile {
  path: string;
  content: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'backend' | 'frontend' | 'fullstack' | 'ai' | 'mobile' | 'desktop' | 'devops' | 'bots' | 'database';
  icon: string;
  tags: string[];
  files: TemplateFile[];
  commands?: {
    install?: string;
    dev?: string;
    build?: string;
    start?: string;
  };
}

export interface CreateProjectFromTemplateRequest {
  templateId: string;
  projectName: string;
}

export interface CreateProjectFromTemplateResponse {
  success: boolean;
  projectPath: string;
  projectName: string;
  message?: string;
}

// AI Provider API Types
export interface AIProviderInfo {
  id: string;
  name: string;
  description: string;
  type: 'mainstream' | 'adult_friendly' | 'self_hosted';
  website?: string;
  pricing?: string;
  capabilities: {
    supportsJsonMode: boolean;
    supportsImageGeneration: boolean;
    supportsStreamingResponse: boolean;
    maxContextLength: number;
    supportedModalities: ('text' | 'image' | 'audio' | 'video')[];
  };
  compliance: {
    allowsAdultContent: boolean;
    requiresExplicitConsent: boolean;
    hasBuiltInFiltering: boolean;
    termsOfServiceUrl?: string;
    contentPolicyUrl?: string;
  };
  defaultModel?: string;
  availableModels: string[];
  isHealthy?: boolean;
  latency?: number;
}

export interface AIProviderRequest {
  providerId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  isAdultMode?: boolean;
}

export interface AIProviderResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider: string;
  cached?: boolean;
  warnings?: string[];
}

export interface AdultModeConsentRequest {
  userAge: number;
  acceptTerms: boolean;
  jurisdiction?: string;
}

export interface AdultModeConsentResponse {
  success: boolean;
  consentId?: string;
  expiresAt?: Date;
  errors?: string[];
  warnings?: string[];
}

export interface AIProviderStatusResponse {
  providers: Array<{
    id: string;
    name: string;
    type: string;
    isHealthy: boolean;
    latency?: number;
    errorMessage?: string;
    availableModels?: string[];
    lastChecked: Date;
  }>;
  systemStatus: {
    totalProviders: number;
    healthyProviders: number;
    adultModeEnabled: boolean;
    totalRequests: number;
    errorRate: number;
  };
}
