'use client';

import { useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [plateText, setPlateText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  useEffect(() => {
    // Ask for camera access
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing camera: ', err);
        setError('Unable to access camera. Please ensure you have granted camera permissions.');
      });
  }, []);

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        recognizeText(canvas);
      }
    }
  };

  // Function to validate if the detected text looks like a number plate
  const isValidPlateNumber = (text: string): boolean => {
    // Remove all non-alphanumeric characters except hyphens
    const cleaned = text.replace(/[^A-Z0-9\-]/gi, '');
    
    // Check if it has a reasonable length (3-10 characters)
    if (cleaned.length < 3 || cleaned.length > 10) {
      return false;
    }
    
    // Check if it contains at least one letter and one number
    const hasLetter = /[A-Z]/i.test(cleaned);
    const hasNumber = /[0-9]/.test(cleaned);
    
    if (!hasLetter || !hasNumber) {
      return false;
    }
    
    // More flexible pattern matching for various plate formats
    // Accept if it has reasonable letter/number combinations
    const letterCount = (cleaned.match(/[A-Z]/gi) || []).length;
    const numberCount = (cleaned.match(/[0-9]/g) || []).length;
    
    // Should have at least 2 letters and 2 numbers, or similar combinations
    return (letterCount >= 2 && numberCount >= 2) || 
           (letterCount >= 3 && numberCount >= 1) || 
           (letterCount >= 1 && numberCount >= 3);
  };

  const recognizeText = async (canvas: HTMLCanvasElement) => {
    setLoading(true);
    setError('');
    setPlateText('');
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setLastCapture(dataUrl);
      
      const { data } = await Tesseract.recognize(dataUrl, 'eng', {
        logger: (m) => console.log(m),
      });

      console.log('Raw OCR result:', data.text);
      console.log('Confidence:', data.confidence);

      // Clean the text to extract only alphanumeric characters and common plate separators
      const cleaned = data.text.replace(/[^A-Z0-9\-]/gi, '').toUpperCase();
      
      // Lowered confidence threshold for better recognition
      if (data.confidence < 15) {
        setError('Low confidence in text recognition. Please ensure the number plate is clear and well-lit.');
        return;
      }

      // If confidence is low but we have some text, try to validate it anyway
      if (data.confidence < 30 && cleaned.length < 4) {
        setError('Unclear image. Please try again with better lighting or move closer to the plate.');
        return;
      }

      if (!isValidPlateNumber(cleaned)) {
        setError('No valid number plate detected. Please ensure you are pointing the camera at a clear number plate.');
        return;
      }

      setPlateText(cleaned);
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to recognize text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Number Plate OCR Scanner
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300"
          />
          
          <canvas 
            ref={canvasRef} 
            style={{ display: 'none' }} 
          />
          
          <div className="text-center mt-4">
            <button 
              onClick={captureImage} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Scanning...' : 'Capture & Read Plate'}
            </button>
          </div>
        </div>

        {lastCapture && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Last Captured Image:</h3>
            <img 
              src={lastCapture} 
              alt="Captured frame" 
              className="w-full max-w-md mx-auto rounded-lg border border-gray-300"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <label htmlFor="plate" className="block text-sm font-medium text-gray-700 mb-2">
            Detected Plate Number:
          </label>
          <input
            id="plate"
            type="text"
            value={plateText}
            readOnly
            className="w-full px-4 py-3 text-lg font-mono border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Plate number will appear here..."
          />
          
          {plateText && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Valid Plate Detected:</strong> {plateText}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="font-semibold mb-2">Tips for best results:</p>
          <ul className="text-left max-w-md mx-auto space-y-1">
            <li>• Point camera directly at the number plate</li>
            <li>• Ensure good lighting and no glare</li>
            <li>• Keep camera steady and close to the plate</li>
            <li>• Avoid shadows or reflections on the plate</li>
          </ul>
          <p className="mt-4">Camera access requires HTTPS or localhost.</p>
        </div>
      </div>
    </main>
  );
}
