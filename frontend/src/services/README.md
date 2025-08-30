# Gemini Transcription Service

This service provides audio transcription capabilities using Google's Gemini API, specifically designed for processing UPI payment alerts from Indian payment apps.

## Features

- **Audio Transcription**: Convert audio blobs to text using Gemini 1.5 Flash model
- **Error Handling**: Comprehensive error categorization and retry mechanisms
- **Confidence Scoring**: Intelligent confidence calculation based on UPI-related content
- **Retry Logic**: Exponential backoff for retryable errors
- **Validation**: Audio format and size validation
- **Performance**: Optimized for real-time processing

## Usage

### Basic Usage

```typescript
import { geminiTranscriptionService } from './services/GeminiTranscription';

// Transcribe an audio blob
const audioBlob = new Blob([audioData], { type: 'audio/wav' });
try {
  const result = await geminiTranscriptionService.transcribeAudio(audioBlob);
  console.log('Transcription:', result.text);
  console.log('Confidence:', result.confidence);
  console.log('Processing time:', result.processingTime, 'ms');
} catch (error) {
  console.error('Transcription failed:', error);
}
```

### Test Connection

```typescript
// Test if the Gemini API is accessible
const isConnected = await geminiTranscriptionService.testConnection();
if (isConnected) {
  console.log('Gemini API is accessible');
} else {
  console.log('Gemini API connection failed');
}
```

## Configuration

### Environment Variables

Create a `.env.local` file with your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

### Supported Audio Formats

- `audio/wav`
- `audio/mp3`
- `audio/mpeg`
- `audio/webm`
- `audio/ogg`

### File Size Limits

- Maximum file size: 10MB
- Recommended duration: 5-30 seconds for optimal results

## API Reference

### `transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult>`

Transcribes an audio blob to text.

**Parameters:**
- `audioBlob`: Audio data as a Blob object

**Returns:**
- `TranscriptionResult`: Object containing transcription text, confidence score, and processing time

**Throws:**
- `TranscriptionError`: Categorized error with retry information

### `testConnection(): Promise<boolean>`

Tests the connection to Gemini API.

**Returns:**
- `boolean`: True if connection is successful, false otherwise

## Error Handling

The service categorizes errors into different types:

### Error Types

- `AUTH_ERROR`: Invalid or missing API key (not retryable)
- `RATE_LIMIT`: API rate limit exceeded (retryable)
- `NETWORK_ERROR`: Network connectivity issues (retryable)
- `INVALID_AUDIO`: Invalid audio format or corrupted file (not retryable)
- `API_ERROR`: General API errors (may be retryable)

### Retry Mechanism

The service automatically retries failed requests with exponential backoff:

- Maximum retries: 3
- Base delay: 1 second
- Exponential backoff with jitter
- Only retries for retryable errors

## Confidence Scoring

The service calculates confidence scores based on:

1. **UPI Keywords**: Presence of payment-related terms (phonepe, gpay, paytm, upi, received, rupees)
2. **Amount Patterns**: Detection of currency amounts (₹50, 100 rupees)
3. **Text Length**: Penalizes very short or very long transcriptions
4. **Base Confidence**: Starts with 50% base confidence

### Confidence Ranges

- **High (0.7-1.0)**: Clear UPI payment alerts with amount and app name
- **Medium (0.4-0.7)**: Partial UPI content or unclear audio
- **Low (0.0-0.4)**: Non-payment content or poor audio quality

## Performance Considerations

### Optimization Tips

1. **Audio Quality**: Use clear, noise-free audio for better results
2. **File Size**: Keep files under 5MB for faster processing
3. **Concurrent Requests**: Service supports concurrent transcription requests
4. **Caching**: Consider caching results for identical audio files

### Memory Usage

The service is optimized for 8GB RAM systems:

- Efficient audio blob handling
- Automatic cleanup of processed audio data
- Memory-conscious base64 conversion

## Testing

### Unit Tests

```bash
npm run test:run -- src/services/__tests__/GeminiTranscription.test.ts
```

### Integration Tests

```bash
npm run test:run -- src/services/__tests__/GeminiTranscription.integration.test.ts
```

### Example Component

See `src/examples/GeminiTranscriptionExample.tsx` for a complete demo implementation.

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   - Ensure `VITE_GEMINI_API_KEY` is set in your environment
   - Verify the API key is valid and has proper permissions

2. **Audio Format Not Supported**
   - Check that your audio format is in the supported list
   - Convert unsupported formats to WAV or MP3

3. **Rate Limiting**
   - The service automatically handles rate limits with retries
   - Consider implementing request queuing for high-volume usage

4. **Network Issues**
   - Check internet connectivity
   - Verify firewall settings allow HTTPS requests to Google APIs

### Debug Mode

Enable debug logging by setting:

```env
VITE_DEV_MODE=true
```

This will log detailed information about API requests and responses.

## Security

### API Key Security

- Never commit API keys to version control
- Use environment variables for API key storage
- Rotate API keys regularly
- Monitor API usage for unusual activity

### Data Privacy

- Audio data is only sent to Google's Gemini API for transcription
- No audio data is stored permanently by the service
- Transcription results are returned immediately and not cached by default

## License

This service is part of the Shopkeeper UPI Tracker application and follows the same license terms.