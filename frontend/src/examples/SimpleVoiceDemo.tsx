import React, { useState } from 'react';

interface TransactionRecord {
  id: string;
  timestamp: Date;
  transcription: string;
  amount: number | null;
  confidence: number;
}

const SimpleVoiceDemo: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [status, setStatus] = useState('Ready to record');

  const simulateRecording = () => {
    setIsRecording(true);
    setStatus('🎤 Recording... (simulated)');
    
    // Simulate a 3-second recording
    setTimeout(() => {
      const sampleTranscriptions = [
        'You received rupees 25 on PhonePe',
        'Payment of 1500 rupees received via Google Pay',
        'Paytm notification 75 rupees credited',
        'UPI alert amount 200 received',
        'No amount in this message'
      ];
      
      const randomTranscription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];
      
      // Simple amount extraction
      const amountMatch = randomTranscription.match(/(\d+)\s*rupees?/i) || randomTranscription.match(/rupees?\s*(\d+)/i);
      const amount = amountMatch ? parseInt(amountMatch[1]) : null;
      const confidence = amount ? 0.85 : 0.1;
      
      const transaction: TransactionRecord = {
        id: Date.now().toString(),
        timestamp: new Date(),
        transcription: randomTranscription,
        amount,
        confidence
      };
      
      setTransactions(prev => [transaction, ...prev]);
      setIsRecording(false);
      setStatus(amount ? `✅ Found ₹${amount}` : '❌ No amount found');
    }, 3000);
  };

  const clearLog = () => {
    setTransactions([]);
    setStatus('Ready to record');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        🎤 Voice Amount Extraction Demo (Simulated)
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Controls */}
        <div style={{ backgroundColor: '#f0f8ff', padding: '20px', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Recording Controls</h2>
          
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: status.includes('✅') ? 'green' : status.includes('❌') ? 'red' : 'blue',
              marginBottom: '10px'
            }}>
              {status}
            </div>
            
            {isRecording && (
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: 'red', 
                borderRadius: '50%', 
                margin: '0 auto',
                animation: 'pulse 1s infinite'
              }}></div>
            )}
          </div>

          <button
            onClick={simulateRecording}
            disabled={isRecording}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: isRecording ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isRecording ? 'not-allowed' : 'pointer',
              marginBottom: '15px'
            }}
          >
            {isRecording ? '🎤 Recording...' : '🎤 Start Recording (Simulated)'}
          </button>

          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Session Stats</h3>
            <div style={{ fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Total Recordings:</span>
                <span style={{ fontWeight: 'bold' }}>{transactions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Valid Extractions:</span>
                <span style={{ fontWeight: 'bold', color: 'green' }}>
                  {transactions.filter(t => t.amount !== null).length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Success Rate:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {transactions.length > 0 
                    ? `${((transactions.filter(t => t.amount !== null).length / transactions.length) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Log */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>Transaction Log</h2>
            <button
              onClick={clearLog}
              disabled={transactions.length === 0}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: transactions.length === 0 ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: transactions.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Clear Log
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                <p>No recordings yet. Click "Start Recording" to begin!</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${transaction.amount ? 'green' : 'red'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {formatTime(transaction.timestamp)}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      color: transaction.amount ? 'green' : 'red'
                    }}>
                      {transaction.amount ? '✅ Valid' : '❌ Invalid'}
                    </span>
                  </div>

                  <p style={{ 
                    fontSize: '14px', 
                    fontStyle: 'italic', 
                    color: '#555', 
                    marginBottom: '8px' 
                  }}>
                    "{transaction.transcription}"
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>Amount: </span>
                      <span style={{ 
                        color: transaction.amount ? 'green' : '#999',
                        fontWeight: 'bold'
                      }}>
                        {transaction.amount ? `₹${transaction.amount}` : 'Not found'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>Confidence: </span>
                      <span>{(transaction.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        borderRadius: '6px', 
        marginTop: '20px',
        border: '1px solid #ffeaa7'
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>💡 How to Test</h3>
        <div style={{ fontSize: '14px', color: '#856404' }}>
          <p style={{ marginBottom: '5px' }}>
            1. <strong>Click "Start Recording"</strong> to simulate voice input
          </p>
          <p style={{ marginBottom: '5px' }}>
            2. <strong>Watch the transaction log</strong> to see simulated transcriptions and extractions
          </p>
          <p style={{ marginBottom: '5px' }}>
            3. <strong>Check success rates</strong> in the session stats
          </p>
          <p style={{ margin: 0 }}>
            <em>Note: This is a simulation. For real voice testing, we need the Gemini API key configured.</em>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleVoiceDemo;