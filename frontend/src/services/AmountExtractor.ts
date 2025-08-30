/**
 * AmountExtractor Service
 * 
 * Extracts transaction amounts from UPI alert transcriptions in multiple languages
 * and formats (PhonePe, GPay, Paytm, etc.)
 */

export interface AmountExtractionResult {
  amount: number | null;
  confidence: number;
  currency: string;
  extractedText: string;
  language: 'en' | 'hi' | 'kn' | 'unknown';
  platform: 'phonepe' | 'gpay' | 'paytm' | 'generic' | 'unknown';
}

export interface AmountPattern {
  regex: RegExp;
  confidence: number;
  platform: string;
  language: string;
}

export class AmountExtractor {
  private patterns: AmountPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Extract amount from transcribed text
   */
  public extractAmount(text: string): AmountExtractionResult {
    if (!text || text.trim().length === 0) {
      return this.createEmptyResult();
    }

    const normalizedText = this.normalizeText(text);
    const results: AmountExtractionResult[] = [];

    // Try all patterns and collect results
    for (const pattern of this.patterns) {
      const match = normalizedText.match(pattern.regex);
      if (match) {
        const amount = this.parseAmount(match);
        if (amount !== null) {
          results.push({
            amount,
            confidence: pattern.confidence,
            currency: 'INR',
            extractedText: match[0],
            language: pattern.language as 'en' | 'hi' | 'kn' | 'unknown',
            platform: pattern.platform as any
          });
        }
      }
    }

    // Return the result with highest confidence
    if (results.length > 0) {
      return results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
    }

    return this.createEmptyResult();
  }

  /**
   * Initialize all regex patterns for different platforms and languages
   */
  private initializePatterns(): void {
    // English patterns
    this.addEnglishPatterns();
    
    // Hindi patterns
    this.addHindiPatterns();
    
    // Kannada patterns
    this.addKannadaPatterns();
    
    // Generic patterns (fallback)
    this.addGenericPatterns();
  }

  private addEnglishPatterns(): void {
    // PhonePe English patterns - more flexible ordering
    this.patterns.push({
      regex: /(?:received|credited|got|payment of)\s*(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:on phonepe|via phonepe|through phonepe)/i,
      confidence: 0.95,
      platform: 'phonepe',
      language: 'en'
    });

    this.patterns.push({
      regex: /(?:payment of|received)\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:on phonepe|via phonepe|from.*phonepe)/i,
      confidence: 0.90,
      platform: 'phonepe',
      language: 'en'
    });

    this.patterns.push({
      regex: /phonepe.*?(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.85,
      platform: 'phonepe',
      language: 'en'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:received|credited).*?phonepe/i,
      confidence: 0.80,
      platform: 'phonepe',
      language: 'en'
    });

    this.patterns.push({
      regex: /(?:amount|rs\.?|rupees?)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*received via phonepe/i,
      confidence: 0.85,
      platform: 'phonepe',
      language: 'en'
    });

    // GPay English patterns
    this.patterns.push({
      regex: /(?:received|credited|got|payment of)\s*(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:on google pay|via gpay|through google pay)/i,
      confidence: 0.95,
      platform: 'gpay',
      language: 'en'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:received|credited).*?(?:google pay|gpay)/i,
      confidence: 0.85,
      platform: 'gpay',
      language: 'en'
    });

    this.patterns.push({
      regex: /(?:google pay|gpay).*?(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.80,
      platform: 'gpay',
      language: 'en'
    });

    this.patterns.push({
      regex: /(?:payment.*?through|received.*?via)\s*(?:google pay|gpay).*?₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.85,
      platform: 'gpay',
      language: 'en'
    });

    this.patterns.push({
      regex: /(?:payment of|received)\s*(?:rs\.?|rupees?)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:received through|via|on)\s*google pay/i,
      confidence: 0.90,
      platform: 'gpay',
      language: 'en'
    });

    // Paytm English patterns
    this.patterns.push({
      regex: /(?:received|credited|got|payment of)\s*(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:on paytm|via paytm|through paytm)/i,
      confidence: 0.95,
      platform: 'paytm',
      language: 'en'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:received|credited).*?paytm/i,
      confidence: 0.85,
      platform: 'paytm',
      language: 'en'
    });

    this.patterns.push({
      regex: /paytm.*?(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.80,
      platform: 'paytm',
      language: 'en'
    });

    // Generic English UPI patterns
    this.patterns.push({
      regex: /(?:received|credited|got|payment of)\s*(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.75,
      platform: 'generic',
      language: 'en'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:received|credited|paid)/i,
      confidence: 0.70,
      platform: 'generic',
      language: 'en'
    });
  }

  private addHindiPatterns(): void {
    // PhonePe Hindi patterns
    this.patterns.push({
      regex: /(?:मिला|प्राप्त|आया|पेमेंट)\s*(?:रुपये|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:फोनपे|phonepe)/i,
      confidence: 0.90,
      platform: 'phonepe',
      language: 'hi'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:फोनपे|phonepe).*?(?:मिला|प्राप्त|आया)/i,
      confidence: 0.85,
      platform: 'phonepe',
      language: 'hi'
    });

    this.patterns.push({
      regex: /(?:फोनपे|phonepe).*?₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:मिले हैं|मिला|प्राप्त)/i,
      confidence: 0.85,
      platform: 'phonepe',
      language: 'hi'
    });

    // GPay Hindi patterns  
    this.patterns.push({
      regex: /(?:मिला|प्राप्त|आया|पेमेंट)\s*(?:रुपये|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:गूगल पे|google pay|gpay)/i,
      confidence: 0.90,
      platform: 'gpay',
      language: 'hi'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:गूगल पे|google pay|gpay).*?(?:मिला|प्राप्त|आया)/i,
      confidence: 0.85,
      platform: 'gpay',
      language: 'hi'
    });

    this.patterns.push({
      regex: /(?:गूगल पे|google pay|gpay).*?रुपये\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:प्राप्त हुए|मिला|प्राप्त)/i,
      confidence: 0.85,
      platform: 'gpay',
      language: 'hi'
    });

    // Paytm Hindi patterns
    this.patterns.push({
      regex: /(?:मिला|प्राप्त|आया|पेमेंट)\s*(?:रुपये|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:पेटीएम|paytm)/i,
      confidence: 0.90,
      platform: 'paytm',
      language: 'hi'
    });

    // Generic Hindi patterns
    this.patterns.push({
      regex: /(?:मिला|प्राप्त|आया)\s*(?:रुपये|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.75,
      platform: 'generic',
      language: 'hi'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:मिला|प्राप्त|आया)/i,
      confidence: 0.70,
      platform: 'generic',
      language: 'hi'
    });
  }

  private addKannadaPatterns(): void {
    // PhonePe Kannada patterns
    this.patterns.push({
      regex: /(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ|ಪಾವತಿ)\s*(?:ರೂಪಾಯಿ|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ಫೋನ್‌ಪೇ|phonepe)/i,
      confidence: 0.90,
      platform: 'phonepe',
      language: 'kn'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ಫೋನ್‌ಪೇ|phonepe).*?(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ)/i,
      confidence: 0.85,
      platform: 'phonepe',
      language: 'kn'
    });

    // GPay Kannada patterns
    this.patterns.push({
      regex: /(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ|ಪಾವತಿ)\s*(?:ರೂಪಾಯಿ|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ಗೂಗಲ್ ಪೇ|google pay|gpay)/i,
      confidence: 0.90,
      platform: 'gpay',
      language: 'kn'
    });

    this.patterns.push({
      regex: /ರೂಪಾಯಿ\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ಗೂಗಲ್ ಪೇ|google pay|gpay).*?(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ)/i,
      confidence: 0.85,
      platform: 'gpay',
      language: 'kn'
    });

    // Paytm Kannada patterns
    this.patterns.push({
      regex: /(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ|ಪಾವತಿ)\s*(?:ರೂಪಾಯಿ|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ಪೇಟಿಎಂ|paytm)/i,
      confidence: 0.90,
      platform: 'paytm',
      language: 'kn'
    });

    this.patterns.push({
      regex: /ಪಾವತಿ\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ಪೇಟಿಎಂ|paytm).*?(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ)/i,
      confidence: 0.85,
      platform: 'paytm',
      language: 'kn'
    });

    // Generic Kannada patterns
    this.patterns.push({
      regex: /(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ)\s*(?:ರೂಪಾಯಿ|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.75,
      platform: 'generic',
      language: 'kn'
    });

    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ಸಿಕ್ಕಿತು|ಬಂದಿದೆ)/i,
      confidence: 0.70,
      platform: 'generic',
      language: 'kn'
    });
  }

  private addGenericPatterns(): void {
    // Fallback patterns for any currency amount
    this.patterns.push({
      regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,
      confidence: 0.60,
      platform: 'unknown',
      language: 'unknown'
    });

    this.patterns.push({
      regex: /(?:rs\.?|rupees?)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      confidence: 0.55,
      platform: 'unknown',
      language: 'unknown'
    });

    // Pure number patterns (lowest confidence) - more restrictive
    this.patterns.push({
      regex: /\b(\d{2,6}(?:\.\d{2})?)\b/,
      confidence: 0.30,
      platform: 'unknown',
      language: 'unknown'
    });
  }

  /**
   * Normalize text for better pattern matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // Normalize whitespace first
      .replace(/\s+/g, ' ')
      // Don't replace rs/rupees with ₹ as it interferes with pattern matching
      // Keep original text structure for better regex matching
      .replace(/\b(?:upi|transaction|alert|notification)\b/g, '');
  }

  /**
   * Parse amount from regex match
   */
  private parseAmount(match: RegExpMatchArray): number | null {
    if (!match || match.length < 2) {
      return null;
    }

    const amountStr = match[1];
    if (!amountStr) {
      return null;
    }

    // Remove commas and parse as float
    const cleanAmount = amountStr.replace(/,/g, '');
    const amount = parseFloat(cleanAmount);

    // Validate amount is reasonable (between 1 rupee and 1 crore)
    if (isNaN(amount) || amount < 1 || amount > 10000000) {
      return null;
    }

    return amount;
  }

  /**
   * Create empty result for failed extractions
   */
  private createEmptyResult(): AmountExtractionResult {
    return {
      amount: null,
      confidence: 0,
      currency: 'INR',
      extractedText: '',
      language: 'unknown',
      platform: 'unknown'
    };
  }

  /**
   * Validate extraction result based on confidence thresholds
   */
  public validateExtraction(result: AmountExtractionResult, minConfidence: number = 0.5): boolean {
    return result.amount !== null && 
           result.confidence >= minConfidence &&
           result.amount > 0;
  }

  /**
   * Get all supported platforms
   */
  public getSupportedPlatforms(): string[] {
    return ['phonepe', 'gpay', 'paytm', 'generic'];
  }

  /**
   * Get all supported languages
   */
  public getSupportedLanguages(): string[] {
    return ['en', 'hi', 'kn'];
  }
}