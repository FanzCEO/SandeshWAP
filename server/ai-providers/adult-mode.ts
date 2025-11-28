/**
 * Adult Mode Management System
 * 
 * Comprehensive system for managing adult content AI capabilities with
 * compliance guardrails, user consent, and audit logging.
 */

import { ContentFilter } from './base';

export interface AdultModeConfig {
  enabled: boolean;
  userConsent: boolean;
  consentTimestamp?: Date;
  userAge?: number;
  jurisdictionCompliant?: boolean;
  parentalControls?: boolean;
}

export interface ComplianceCheck {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
  blockedContent?: string[];
}

export interface ConsentRecord {
  userId?: string;
  sessionId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  consentVersion: string;
  acknowledged: boolean;
}

export class AdultModeManager {
  private static instance: AdultModeManager;
  private consentRecords = new Map<string, ConsentRecord>();
  private readonly CONSENT_VERSION = '1.0';
  private readonly MIN_AGE = 18;

  private constructor() {}

  static getInstance(): AdultModeManager {
    if (!AdultModeManager.instance) {
      AdultModeManager.instance = new AdultModeManager();
    }
    return AdultModeManager.instance;
  }

  /**
   * Check if Adult Mode is allowed for a session/user
   */
  isAdultModeAllowed(sessionId: string): boolean {
    const consentRecord = this.consentRecords.get(sessionId);
    
    if (!consentRecord) {
      return false;
    }

    return consentRecord.acknowledged && 
           this.isConsentValid(consentRecord) &&
           this.isJurisdictionCompliant();
  }

  /**
   * Record user consent for Adult Mode
   */
  recordConsent(
    sessionId: string,
    userAge: number,
    ipAddress: string,
    userAgent: string,
    userId?: string
  ): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    // Age verification
    if (userAge < this.MIN_AGE) {
      errors.push('User must be at least 18 years old');
    }

    // Jurisdiction check (basic implementation)
    if (!this.isJurisdictionCompliant()) {
      errors.push('Adult content not permitted in this jurisdiction');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const consentRecord: ConsentRecord = {
      userId,
      sessionId,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      consentVersion: this.CONSENT_VERSION,
      acknowledged: true
    };

    this.consentRecords.set(sessionId, consentRecord);

    console.log(`Adult Mode consent recorded for session ${sessionId}`);
    return { success: true, errors: [] };
  }

  /**
   * Revoke consent for Adult Mode
   */
  revokeConsent(sessionId: string): void {
    this.consentRecords.delete(sessionId);
    console.log(`Adult Mode consent revoked for session ${sessionId}`);
  }

  /**
   * Comprehensive content compliance check
   */
  checkContentCompliance(content: string, isAdultMode: boolean): ComplianceCheck {
    const result: ComplianceCheck = {
      isCompliant: true,
      violations: [],
      warnings: [],
      blockedContent: []
    };

    // Always check for illegal content regardless of mode
    const illegalChecks = this.checkIllegalContent(content);
    if (illegalChecks.violations.length > 0) {
      result.isCompliant = false;
      result.violations.push(...illegalChecks.violations);
      result.blockedContent?.push(...illegalChecks.blockedContent);
    }

    // Additional checks for non-adult mode
    if (!isAdultMode) {
      const adultChecks = this.checkAdultContent(content);
      if (adultChecks.violations.length > 0) {
        result.isCompliant = false;
        result.violations.push(...adultChecks.violations);
        result.blockedContent?.push(...adultChecks.blockedContent);
      }
    } else {
      // Even in adult mode, check for extreme content
      const extremeChecks = this.checkExtremeContent(content);
      result.warnings.push(...extremeChecks.warnings);
    }

    return result;
  }

  /**
   * Check for illegal content (always blocked)
   */
  private checkIllegalContent(content: string): ComplianceCheck {
    const result: ComplianceCheck = {
      isCompliant: true,
      violations: [],
      warnings: [],
      blockedContent: []
    };

    // Define illegal content patterns
    const illegalPatterns = [
      // Child-related content (zero tolerance)
      {
        pattern: /\b(child|minor|underage|kid|baby|toddler|teen|adolescent)\b.*\b(sexual|explicit|nsfw|nude|naked|sex|porn)\b/gi,
        violation: 'Child exploitation content detected'
      },
      {
        pattern: /\b(cp|child\s*porn|kiddie\s*porn|pedo)\b/gi,
        violation: 'Child pornography references detected'
      },
      // Violence against specific groups
      {
        pattern: /\b(kill|murder|torture|harm)\b.*\b(children|kids|babies)\b/gi,
        violation: 'Violence against children detected'
      },
      // Illegal activities
      {
        pattern: /\b(how\s*to\s*make|create|build)\b.*\b(bomb|explosive|weapon|poison|drug)\b/gi,
        violation: 'Illegal activity instructions detected'
      },
      // Human trafficking
      {
        pattern: /\b(human\s*trafficking|sex\s*slave|forced\s*prostitution)\b/gi,
        violation: 'Human trafficking content detected'
      }
    ];

    for (const { pattern, violation } of illegalPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        result.isCompliant = false;
        result.violations.push(violation);
        result.blockedContent?.push(...matches);
      }
    }

    return result;
  }

  /**
   * Check for adult content (blocked in non-adult mode)
   */
  private checkAdultContent(content: string): ComplianceCheck {
    const result: ComplianceCheck = {
      isCompliant: true,
      violations: [],
      warnings: [],
      blockedContent: []
    };

    const adultPatterns = [
      {
        pattern: /\b(sex|sexual|porn|pornography|nsfw|explicit|nude|naked|erotic)\b/gi,
        violation: 'Adult content detected - Adult Mode required'
      },
      {
        pattern: /\b(orgasm|masturbat|fellatio|cunnilingus|intercourse)\b/gi,
        violation: 'Explicit sexual content detected - Adult Mode required'
      }
    ];

    for (const { pattern, violation } of adultPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        result.isCompliant = false;
        result.violations.push(violation);
        result.blockedContent?.push(...matches);
      }
    }

    return result;
  }

  /**
   * Check for extreme content (warned even in adult mode)
   */
  private checkExtremeContent(content: string): ComplianceCheck {
    const result: ComplianceCheck = {
      isCompliant: true,
      violations: [],
      warnings: [],
      blockedContent: []
    };

    const extremePatterns = [
      {
        pattern: /\b(rape|non\-?consensual|forced|coerced)\b/gi,
        warning: 'Non-consensual content detected'
      },
      {
        pattern: /\b(snuff|necrophilia|bestiality)\b/gi,
        warning: 'Extreme content detected'
      }
    ];

    for (const { pattern, warning } of extremePatterns) {
      if (pattern.test(content)) {
        result.warnings.push(warning);
      }
    }

    return result;
  }

  /**
   * Check if consent is still valid
   */
  private isConsentValid(consent: ConsentRecord): boolean {
    const MAX_CONSENT_AGE = 24 * 60 * 60 * 1000; // 24 hours
    const age = Date.now() - consent.timestamp.getTime();
    
    return age < MAX_CONSENT_AGE && 
           consent.consentVersion === this.CONSENT_VERSION;
  }

  /**
   * Basic jurisdiction compliance check
   */
  private isJurisdictionCompliant(): boolean {
    // This is a simplified implementation
    // In production, you might check against user IP/location
    // and maintain a list of restricted jurisdictions
    return true;
  }

  /**
   * Get consent status for a session
   */
  getConsentStatus(sessionId: string): {
    hasConsent: boolean;
    consentRecord?: ConsentRecord;
    timeRemaining?: number;
  } {
    const consentRecord = this.consentRecords.get(sessionId);
    
    if (!consentRecord) {
      return { hasConsent: false };
    }

    if (!this.isConsentValid(consentRecord)) {
      this.consentRecords.delete(sessionId);
      return { hasConsent: false };
    }

    const MAX_CONSENT_AGE = 24 * 60 * 60 * 1000; // 24 hours
    const age = Date.now() - consentRecord.timestamp.getTime();
    const timeRemaining = MAX_CONSENT_AGE - age;

    return {
      hasConsent: true,
      consentRecord,
      timeRemaining
    };
  }

  /**
   * Clean up expired consent records
   */
  cleanupExpiredConsents(): void {
    const now = Date.now();
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, consent] of this.consentRecords.entries()) {
      const age = now - consent.timestamp.getTime();
      if (age > MAX_AGE) {
        this.consentRecords.delete(sessionId);
      }
    }
  }

  /**
   * Get consent statistics (for admin/monitoring)
   */
  getConsentStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  } {
    const total = this.consentRecords.size;
    let active = 0;
    let expired = 0;

    for (const consent of this.consentRecords.values()) {
      if (this.isConsentValid(consent)) {
        active++;
      } else {
        expired++;
      }
    }

    return {
      totalSessions: total,
      activeSessions: active,
      expiredSessions: expired
    };
  }
}

// Enhanced content filter with adult mode support
export class AdultModeContentFilter extends ContentFilter {
  private static adultModeManager = AdultModeManager.getInstance();

  static filterContent(content: string, sessionId: string, isAdultMode: boolean): {
    filteredContent: string;
    violations: string[];
    warnings: string[];
    blocked: boolean;
  } {
    // Check if adult mode is properly authorized
    if (isAdultMode && !this.adultModeManager.isAdultModeAllowed(sessionId)) {
      return {
        filteredContent: '[BLOCKED - Adult Mode not authorized]',
        violations: ['Adult Mode access not properly authorized'],
        warnings: [],
        blocked: true
      };
    }

    const complianceCheck = this.adultModeManager.checkContentCompliance(content, isAdultMode);

    if (!complianceCheck.isCompliant) {
      let filteredContent = content;
      
      // Filter out blocked content
      if (complianceCheck.blockedContent) {
        for (const blocked of complianceCheck.blockedContent) {
          filteredContent = filteredContent.replace(blocked, '[BLOCKED]');
        }
      }

      return {
        filteredContent,
        violations: complianceCheck.violations,
        warnings: complianceCheck.warnings,
        blocked: true
      };
    }

    return {
      filteredContent: content,
      violations: [],
      warnings: complianceCheck.warnings,
      blocked: false
    };
  }
}

// Cleanup task - run periodically
setInterval(() => {
  AdultModeManager.getInstance().cleanupExpiredConsents();
}, 60 * 60 * 1000); // Every hour