// frontend/src/services/AudioCaptureService.ts

export interface AudioCaptureService {
    startListening(): Promise<void>;
    stopListening(): void;
    onAudioDetected: (audioBlob: Blob) => void;
    isListening: boolean;
    onPermissionError: (error: string) => void;
  }
  class AudioCaptureServiceImpl implements AudioCaptureService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private mediaStream: MediaStream | null = null;
    public isListening: boolean = false;
    public onAudioDetected: (audioBlob: Blob) => void = () => {};
    public onPermissionError: (error: string) => void = () => {};
  
    constructor() {
        this.isListening = false;
        this.audioChunks = [];
        this.mediaRecorder = null;
        this.mediaStream = null;
    }

    async startListening(): Promise<void> {
      if (this.isListening) {
        console.log("Already listening");
        return;
      }

      try {
        this.mediaStream=await navigator.mediaDevices.getUserMedia({audio:true});
        if(!this.mediaStream) {
            this.onPermissionError("Microphone access denied");
            return;
        }
        this.mediaRecorder=new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable=(event)=>{
            this.audioChunks.push(event.data);
        }
        this.mediaRecorder.onstop=()=>{
            const audioBlob=new Blob(this.audioChunks,{type:'audio/wav'});
            this.audioChunks=[];
            this.onAudioDetected(audioBlob);
        }
        this.mediaRecorder.start();
        this.isListening=true;
        console.log("Audio capture started");
  
      } catch (error) {
        console.error("Error starting audio capture", error);
        if(error instanceof DOMException) {
            const errorMessage=error.name==="NotAllowedError"?"Microphone access denied. Please enable microphone permissions in your browser settings to use this feature.":
            error.name==="NotFoundError"?"No microphone found. Please ensure a microphone is connected and enabled.":
            "An unexpected error occurred while accessing the microphone: "+error.message;
            this.onPermissionError(errorMessage);
        }
        throw error;

      }
    }
    stopListening(): void {
      if(!this.isListening || !this.mediaRecorder) {
        console.log("Not listening or mediaRecorder not found");
        return;
      }
      this.mediaRecorder.stop();
      this.mediaStream?.getTracks().forEach(track=>track.stop());
      this.isListening=false;
      console.log("Audio capture stopped");  
    }
  }
  export const audioCaptureService = new AudioCaptureServiceImpl();