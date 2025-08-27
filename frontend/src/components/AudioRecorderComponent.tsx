import React, { useEffect, useState } from 'react';
import { audioCaptureService } from '../services/AudioCapture';

const AudioRecorderComponent: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAudioBlobUrl, setLastAudioBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    audioCaptureService.onAudioDetected = (audioBlob) => {
      console.log("Audio detected");
      const audioBlobUrl = URL.createObjectURL(audioBlob);
      setLastAudioBlobUrl(audioBlobUrl);
    };
    audioCaptureService.onPermissionError = (message) => {
      setErrorMessage(message);
      setIsRecording(false);
    };
    
    return()=>{
        audioCaptureService.stopListening();
    }
  }, []);

 
  const handleStartRecording = async () => {
    setErrorMessage(null);
    try{
        await audioCaptureService.startListening();
        setIsRecording(true);
    }catch(error){
        setErrorMessage("Error starting recording");
        setIsRecording(false);
    }

  };

  const handleStopRecording = () => {
    try{
        audioCaptureService.stopListening();
        setIsRecording(false);
    }catch(error){
        setErrorMessage("Error stopping recording");
        setIsRecording(true);
    }
  };

  return (
    <div>
      {errorMessage && <p style={{color:"red"}}>{errorMessage}</p>}
      <button onClick={handleStartRecording} disabled={isRecording}>Start Recording</button>
      <button onClick={handleStopRecording} disabled={!isRecording}>Stop Recording</button>
    {lastAudioBlobUrl && <audio src={lastAudioBlobUrl} controls />}
    </div>
  );
};

export default AudioRecorderComponent;