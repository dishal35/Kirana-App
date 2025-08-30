import { describe, it, expect, beforeEach } from 'vitest';
import { AmountExtractor, AmountExtractionResult } from '../AmountExtractor';

describe('AmountExtractor', () => {
  let extractor: AmountExtractor;

  beforeEach(() => {
    extractor = new AmountExtractor();
  });

  describe('constructor', () => {
    it('should create extractor instance', () => {
      expect(extractor).toBeDefined();
      expect(extractor.getSupportedPlatforms()).toContain('phonepe');
      expect(extractor.getSupportedPlatforms()).toContain('gpay');
      expect(extractor.getSupportedPlatforms()).toContain('paytm');
      expect(extractor.getSupportedLanguages()).toContain('en');
      expect(extractor.getSupportedLanguages()).toContain('hi');
      expect(extractor.getSupportedLanguages()).toContain('kn');
    });
  });

  describe('English PhonePe patterns', () => {
    it('should extract amount from standard PhonePe alert', () => {
      const text = "You have received Rs. 250 on PhonePe";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(250);
      expect(result.platform).toBe('phonepe');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.currency).toBe('INR');
    });

    it('should extract amount with rupee symbol', () => {
      const text = "Payment of ₹1,500 received via PhonePe";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(1500);
      expect(result.platform).toBe('phonepe');
      expect(result.language).toBe('en');
    });

    it('should extract decimal amounts', () => {
      const text = "You got Rs. 99.50 through PhonePe";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(99.50);
      expect(result.platform).toBe('phonepe');
    });

    it('should extract large amounts with commas', () => {
      const text = "Received rupees 25,000 on PhonePe";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(25000);
      expect(result.platform).toBe('phonepe');
    });
  });

  describe('English GPay patterns', () => {
    it('should extract amount from GPay alert', () => {
      const text = "You received Rs. 150 on Google Pay";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(150);
      expect(result.platform).toBe('gpay');
      expect(result.language).toBe('en');
    });

    it('should extract from GPay short form', () => {
      const text = "₹500 credited via GPay";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(500);
      expect(result.platform).toBe('gpay');
    });

    it('should handle Google Pay full name', () => {
      const text = "Payment of Rs. 2,000 received through Google Pay";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(2000);
      expect(result.platform).toBe('gpay');
    });
  });

  describe('English Paytm patterns', () => {
    it('should extract amount from Paytm alert', () => {
      const text = "You have received Rs. 300 on Paytm";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(300);
      expect(result.platform).toBe('paytm');
      expect(result.language).toBe('en');
    });

    it('should extract with rupee symbol', () => {
      const text = "₹750 credited via Paytm";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(750);
      expect(result.platform).toBe('paytm');
    });
  });

  describe('Hindi patterns', () => {
    it('should extract amount from Hindi PhonePe alert', () => {
      const text = "आपको ₹200 फोनपे पर मिला";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(200);
      expect(result.platform).toBe('phonepe');
      expect(result.language).toBe('hi');
    });

    it('should extract from Hindi GPay alert', () => {
      const text = "₹1,000 गूगल पे पर प्राप्त";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(1000);
      expect(result.platform).toBe('gpay');
      expect(result.language).toBe('hi');
    });

    it('should extract from Hindi Paytm alert', () => {
      const text = "पेमेंट रुपये 500 पेटीएम पर आया";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(500);
      expect(result.platform).toBe('paytm');
      expect(result.language).toBe('hi');
    });

    it('should extract from generic Hindi pattern', () => {
      const text = "₹350 मिला";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(350);
      expect(result.platform).toBe('generic');
      expect(result.language).toBe('hi');
    });
  });

  describe('Kannada patterns', () => {
    it('should extract amount from Kannada PhonePe alert', () => {
      const text = "ನಿಮಗೆ ₹180 ಫೋನ್‌ಪೇ ನಲ್ಲಿ ಸಿಕ್ಕಿತು";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(180);
      expect(result.platform).toBe('phonepe');
      expect(result.language).toBe('kn');
    });

    it('should extract from Kannada GPay alert', () => {
      const text = "ರೂಪಾಯಿ 800 ಗೂಗಲ್ ಪೇ ನಲ್ಲಿ ಬಂದಿದೆ";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(800);
      expect(result.platform).toBe('gpay');
      expect(result.language).toBe('kn');
    });

    it('should extract from Kannada Paytm alert', () => {
      const text = "ಪಾವತಿ ₹1,200 ಪೇಟಿಎಂ ನಲ್ಲಿ ಸಿಕ್ಕಿತು";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(1200);
      expect(result.platform).toBe('paytm');
      expect(result.language).toBe('kn');
    });

    it('should extract from generic Kannada pattern', () => {
      const text = "₹450 ಬಂದಿದೆ";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(450);
      expect(result.platform).toBe('generic');
      expect(result.language).toBe('kn');
    });
  });

  describe('Generic and fallback patterns', () => {
    it('should extract from generic English pattern', () => {
      const text = "You received Rs. 100";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(100);
      expect(result.platform).toBe('generic');
      expect(result.language).toBe('en');
    });

    it('should extract from rupee symbol only', () => {
      const text = "₹75 received";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(75);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should extract from pure number as fallback', () => {
      const text = "Transaction 250 completed";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(250);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.platform).toBe('unknown');
    });

    it('should handle mixed language text', () => {
      const text = "You received ₹500 PhonePe पर मिला";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(500);
      expect(result.platform).toBe('phonepe');
    });
  });

  describe('Edge cases and validation', () => {
    it('should return empty result for empty text', () => {
      const result = extractor.extractAmount('');

      expect(result.amount).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.platform).toBe('unknown');
    });

    it('should return empty result for null/undefined text', () => {
      const result1 = extractor.extractAmount(null as any);
      const result2 = extractor.extractAmount(undefined as any);

      expect(result1.amount).toBeNull();
      expect(result2.amount).toBeNull();
    });

    it('should return empty result for text without amounts', () => {
      const text = "Hello world this is a test message";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should reject invalid amounts (too small)', () => {
      const text = "You received Rs. 0";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBeNull();
    });

    it('should reject invalid amounts (too large)', () => {
      const text = "You received Rs. 15000000";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBeNull();
    });

    it('should handle malformed number formats', () => {
      const text = "You received Rs. 1,234";
      const result = extractor.extractAmount(text);

      // Should still extract if parseable
      expect(result.amount).toBe(1234);
    });

    it('should handle multiple amounts and return highest confidence', () => {
      const text = "Transaction of Rs. 100 and ₹200 received on PhonePe";
      const result = extractor.extractAmount(text);

      // Should return the PhonePe specific match with higher confidence
      expect(result.amount).toBe(200);
      expect(result.platform).toBe('phonepe');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Confidence scoring', () => {
    it('should give higher confidence to platform-specific patterns', () => {
      const phonepeResult = extractor.extractAmount("₹100 received on PhonePe");
      const genericResult = extractor.extractAmount("₹100 received");

      expect(phonepeResult.confidence).toBeGreaterThan(genericResult.confidence);
    });

    it('should give higher confidence to complete patterns', () => {
      const completeResult = extractor.extractAmount("You have received Rs. 100 on PhonePe");
      const partialResult = extractor.extractAmount("PhonePe ₹100");

      expect(completeResult.confidence).toBeGreaterThan(partialResult.confidence);
    });

    it('should give lowest confidence to pure numbers', () => {
      const numberResult = extractor.extractAmount("Transaction 100 completed");

      expect(numberResult.confidence).toBeLessThan(0.5);
    });
  });

  describe('Validation methods', () => {
    it('should validate extraction with default threshold', () => {
      const validResult: AmountExtractionResult = {
        amount: 100,
        confidence: 0.8,
        currency: 'INR',
        extractedText: '₹100',
        language: 'en',
        platform: 'phonepe'
      };

      expect(extractor.validateExtraction(validResult)).toBe(true);
    });

    it('should reject extraction below confidence threshold', () => {
      const lowConfidenceResult: AmountExtractionResult = {
        amount: 100,
        confidence: 0.3,
        currency: 'INR',
        extractedText: '100',
        language: 'unknown',
        platform: 'unknown'
      };

      expect(extractor.validateExtraction(lowConfidenceResult)).toBe(false);
    });

    it('should reject extraction with null amount', () => {
      const nullAmountResult: AmountExtractionResult = {
        amount: null,
        confidence: 0.8,
        currency: 'INR',
        extractedText: '',
        language: 'en',
        platform: 'phonepe'
      };

      expect(extractor.validateExtraction(nullAmountResult)).toBe(false);
    });

    it('should use custom confidence threshold', () => {
      const result: AmountExtractionResult = {
        amount: 100,
        confidence: 0.6,
        currency: 'INR',
        extractedText: '₹100',
        language: 'en',
        platform: 'generic'
      };

      expect(extractor.validateExtraction(result, 0.5)).toBe(true);
      expect(extractor.validateExtraction(result, 0.7)).toBe(false);
    });
  });

  describe('Real-world UPI alert formats', () => {
    const realWorldAlerts = [
      {
        text: "PhonePe Alert: You have received ₹250.00 from John Doe on 15 Dec 2023 at 2:30 PM",
        expectedAmount: 250,
        expectedPlatform: 'phonepe'
      },
      {
        text: "Google Pay: ₹1,500 received from Jane Smith. Transaction ID: GP123456789",
        expectedAmount: 1500,
        expectedPlatform: 'gpay'
      },
      {
        text: "Paytm Notification: Rs. 75.50 credited to your account from Bob Wilson",
        expectedAmount: 75.50,
        expectedPlatform: 'paytm'
      },
      {
        text: "UPI Alert: Amount Rs. 2,000 received via PhonePe from Alice Johnson",
        expectedAmount: 2000,
        expectedPlatform: 'phonepe'
      },
      {
        text: "Payment Alert: ₹999 received through Google Pay from Mike Davis",
        expectedAmount: 999,
        expectedPlatform: 'gpay'
      },
      {
        text: "फोनपे अलर्ट: आपको ₹500 मिले हैं राम शर्मा से",
        expectedAmount: 500,
        expectedPlatform: 'phonepe'
      },
      {
        text: "गूगल पे: रुपये 1,200 प्राप्त हुए श्याम वर्मा से",
        expectedAmount: 1200,
        expectedPlatform: 'gpay'
      }
    ];

    realWorldAlerts.forEach((alert, index) => {
      it(`should extract from real-world alert ${index + 1}`, () => {
        const result = extractor.extractAmount(alert.text);

        expect(result.amount).toBe(alert.expectedAmount);
        expect(result.platform).toBe(alert.expectedPlatform);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Performance and normalization', () => {
    it('should handle text with extra whitespace', () => {
      const text = "   You    received    Rs.   100   on   PhonePe   ";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(100);
      expect(result.platform).toBe('phonepe');
    });

    it('should handle mixed case text', () => {
      const text = "YOU RECEIVED RS. 100 ON PHONEPE";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(100);
      expect(result.platform).toBe('phonepe');
    });

    it('should handle text with noise words', () => {
      const text = "UPI transaction alert notification: You received Rs. 100 on PhonePe";
      const result = extractor.extractAmount(text);

      expect(result.amount).toBe(100);
      expect(result.platform).toBe('phonepe');
    });

    it('should process multiple extractions efficiently', () => {
      const texts = [
        "₹100 received on PhonePe",
        "₹200 received on GPay",
        "₹300 received on Paytm",
        "₹400 received",
        "No amount here"
      ];

      const startTime = Date.now();
      const results = texts.map(text => extractor.extractAmount(text));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(results[0].amount).toBe(100);
      expect(results[1].amount).toBe(200);
      expect(results[2].amount).toBe(300);
      expect(results[3].amount).toBe(400);
      expect(results[4].amount).toBeNull();
    });
  });
});