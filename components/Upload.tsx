import { CheckCircle2, ImageIcon, UploadIcon } from 'lucide-react';
import React, { useState } from 'react'
import { useOutletContext } from 'react-router';

const Upload = () => {

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const { isSignedIn, userName, signIn, signOut, refreshAuth } = useOutletContext<AuthContext>()

  return (
    <div className='upload'>
      {!file ? (
        <div className={`dropzone ${isDragging ? 'is-dragging' : ''}`}>
          <input
            type="file"
            className='drop-input'
            accept=".jpg,.jpeg,.png"
            disabled={!isSignedIn}
          />

          <div className='drop-content'>
            <div className='drop-icon'>
              <UploadIcon size={20} />
            </div>

            <p>
              {isSignedIn ? (
                "Click to upload or just drag and drop"
              ) : (
                "Sign in or sign with Puter to upload"
              )}
            </p>

            <p className='help'>
              Maximum file size is 50 MB
            </p>
          </div>
        </div>
      ) : (
        <div className='upload-status'>
          <div className='status-content'>
            {progress === 100 ? (
              <CheckCircle2 className="check" />
            ) : (
              <ImageIcon className="upload-icon" />
            )}
          </div>

          <h3>{file.name}</h3>

          <div className='progress'>
            <div className='bar' style={{ width: `${progress}%` }} />

            <p className='status-text'>
              {progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Upload