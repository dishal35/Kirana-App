# Requirements Document

## Introduction

This document outlines the requirements for a hackathon MVP application designed for small shopkeepers in India. The app helps track sales, manage inventory, and provide insights from UPI transactions using Google's Gemini API for audio transcription and intelligent responses. The solution addresses the need for simple, voice-enabled transaction tracking that integrates with existing UPI soundbox infrastructure while providing intelligent product suggestions and multilingual chat support.

## Requirements

### Requirement 1

**User Story:** As a shopkeeper, I want to set up my shop profile and product catalog during onboarding, so that I can start tracking my business operations immediately.

#### Acceptance Criteria

1. WHEN a shopkeeper first opens the app THEN the system SHALL display an onboarding flow
2. WHEN the shopkeeper enters shop details THEN the system SHALL capture and store shop name and shop type
3. WHEN adding products to catalog THEN the system SHALL allow entry of product name, price, and initial stock quantity
4. WHEN adding a product THEN the system SHALL provide an option to upload a product photo
5. WHEN the onboarding is complete THEN the system SHALL store all data locally or in a mock database

### Requirement 2

**User Story:** As a shopkeeper, I want the app to automatically capture and process UPI transaction alerts from my soundbox, so that I can quickly log sales without manual data entry.

#### Acceptance Criteria

1. WHEN a UPI soundbox plays a transaction alert THEN the system SHALL record the audio through the phone microphone
2. WHEN audio is captured THEN the system SHALL use Gemini API to transcribe the audio into text
3. WHEN transcription is complete THEN the system SHALL extract the transaction amount from the transcribed text
4. WHEN amount is extracted THEN the system SHALL display a pop-up with title showing the received amount
5. WHEN the pop-up appears THEN the system SHALL display the product catalog with pictures
6. WHEN displaying products THEN the system SHALL auto-suggest products based on past transaction patterns or Gemini-based amount-to-product mapping
7. WHEN the shopkeeper reviews suggestions THEN the system SHALL allow confirmation or correction of product and quantity with one tap
8. WHEN the sale is confirmed THEN the system SHALL log the transaction
9. WHEN logging transactions THEN the system SHALL support mapping individual transactions to multiple products or quantities
10. WHEN needed THEN the system SHALL provide an option to log cash transactions manually

### Requirement 3

**User Story:** As a shopkeeper, I want automatic inventory management that updates stock levels and alerts me about low inventory, so that I can maintain adequate stock without manual tracking.

#### Acceptance Criteria

1. WHEN a sale is confirmed THEN the system SHALL automatically reduce the stock count for the sold product(s)
2. WHEN stock levels fall below a reorder threshold THEN the system SHALL display a low stock alert
3. WHEN inventory discrepancies occur THEN the system SHALL allow manual stock adjustments for spoilage or errors
4. WHEN managing perishable items THEN the system SHALL allow entry of expiry dates through simple text or date input

### Requirement 4

**User Story:** As a shopkeeper, I want a simple visual dashboard that shows key business metrics, so that I can quickly understand my daily performance and inventory status.

#### Acceptance Criteria

1. WHEN accessing the dashboard THEN the system SHALL display total sales for the current day in rupees
2. WHEN viewing daily metrics THEN the system SHALL show the top-selling product
3. WHEN there are inventory issues THEN the system SHALL display low stock alerts prominently
4. WHEN viewing trends THEN the system SHALL show a basic revenue trend chart with daily totals
5. WHEN designing the interface THEN the system SHALL use icon-driven design that is language-friendly

### Requirement 5

**User Story:** As a shopkeeper, I want to interact with an AI chat assistant in my preferred language, so that I can get business insights and answers to my questions naturally.

#### Acceptance Criteria

1. WHEN accessing the chat feature THEN the system SHALL provide a simple chat interface
2. WHEN communicating THEN the system SHALL support both text and voice input
3. WHEN processing queries THEN the system SHALL use Gemini API with sales and inventory context
4. WHEN responding THEN the system SHALL provide answers in plain, conversational language
5. WHEN language support is needed THEN the system SHALL support English, Hindi, Kannada, and other regional Indian languages
6. WHEN asked about sales THEN the system SHALL provide accurate information like daily earnings and top products
7. WHEN asked about inventory THEN the system SHALL provide current stock levels and relevant details

### Requirement 6

**User Story:** As a developer, I want the application to meet specific technical constraints for the hackathon environment, so that it can run reliably on target hardware and integrate with required APIs.

#### Acceptance Criteria

1. WHEN processing audio THEN the system SHALL use Gemini API for transcription
2. WHEN providing product suggestions THEN the system SHALL use Gemini API for amount-to-product mapping
3. WHEN providing chat insights THEN the system SHALL use Gemini API with business context
4. WHEN storing data THEN the system SHALL use local storage or mock database without complex backend requirements
5. WHEN running the application THEN the system SHALL operate on laptops with 8GB RAM without external GPU
6. WHEN designing the interface THEN the system SHALL be clean, visual, and optimized for low-tech users

### Requirement 7

**User Story:** As a hackathon demonstrator, I want to showcase a complete end-to-end workflow, so that judges can see the full value proposition of the solution.

#### Acceptance Criteria

1. WHEN demonstrating onboarding THEN the system SHALL allow setup of a shopkeeper profile with 2-3 sample products
2. WHEN simulating transaction capture THEN the system SHALL process a mock soundbox alert (e.g., "₹20 received on PhonePe")
3. WHEN processing the simulation THEN the system SHALL transcribe audio, extract amount, and display appropriate pop-up
4. WHEN suggesting products THEN the system SHALL auto-suggest relevant items based on the extracted amount
5. WHEN confirming the sale THEN the system SHALL update inventory levels automatically
6. WHEN viewing results THEN the system SHALL show updated dashboard metrics
7. WHEN testing chat functionality THEN the system SHALL respond to queries like "Aaj kitna becha?" with accurate Gemini-generated insights