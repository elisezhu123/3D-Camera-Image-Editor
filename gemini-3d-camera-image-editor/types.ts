
export interface CameraSettings {
  azimuth: number;    // 0-360 degrees
  elevation: number;  // -30 to 60 degrees
  distance: number;   // 0.6 to 1.4
  shotType: 'long' | 'medium' | 'close' | 'extreme'; // 景别：远、中、近、特写
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  // Fix: changed from outputImageUrl: string | null to support batch results as used in App.tsx
  outputImageUrls: string[]; 
}
