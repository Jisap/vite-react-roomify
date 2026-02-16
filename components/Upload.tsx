import { PROGRESS_INCREMENT, PROGRESS_INTERVAL_MS, REDIRECT_DELAY_MS } from 'lib/constants';
import { CheckCircle2, ImageIcon, UploadIcon } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react'
import { useOutletContext } from 'react-router';

interface UploadProps {
  onComplete?: (base64Data: string) => void;
}


const Upload = ({ onComplete }: UploadProps) => {

  // Estado para almacenar el archivo seleccionado, si se está arrastrando sobre la zona, y el progreso numérico (0-100)
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  // Referencias para manejar los temporizadores de la animación de progreso y limpieza
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Obtiene el estado de autenticación desde el contexto global (definido en root.tsx)
  const { isSignedIn } = useOutletContext<AuthContext>();

  // Lógica principal para procesar el archivo una vez seleccionado o soltado
  const processFile = useCallback((file: File) => {
    if (!isSignedIn) return;

    setFile(file);
    setProgress(0);

    // Usamos FileReader para leer el contenido del archivo localmente
    const reader = new FileReader();
    reader.onerror = () => {
      setFile(null);
      setProgress(0);
    };

    // Cuando la lectura del archivo termina (se ha cargado en memoria)
    reader.onloadend = () => {
      const base64Data = reader.result as string;

      // Inicia una simulación de progreso visual
      // intervalRef almacena valores que necesitan sobrevivir entre 
      // renderizados sin provocar que el componente se vuelva a renderizar
      // su único proposito es guardar el id del temporizador setInterval
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + PROGRESS_INCREMENT;
          // Si la simulación llega al 100%
          if (next >= 100) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Espera un momento (REDIRECT_DELAY_MS) antes de ejecutar la acción final (onComplete)
            timeoutRef.current = setTimeout(() => {
              onComplete?.(base64Data);
              timeoutRef.current = null;
            }, REDIRECT_DELAY_MS);
            return 100;
          }
          return next;
        });
      }, PROGRESS_INTERVAL_MS);
    };
    // Inicia la lectura del archivo como una URL de datos (Base64)
    reader.readAsDataURL(file);
  }, [isSignedIn, onComplete]);

  // Manejadores de eventos para Drag & Drop (Arrastrar y Soltar)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isSignedIn) return;

    const droppedFile = e.dataTransfer.files[0];
    // Validación simple del tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (droppedFile && allowedTypes.includes(droppedFile.type)) {
      processFile(droppedFile);
    }
  };

  // Manejador para cuando se selecciona un archivo mediante el diálogo del sistema (clic en el input)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSignedIn) return;

    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };


  return (
    <div className='upload'>
      {/* Renderizado condicional: Si no hay archivo, muestra la zona de carga */}
      {!file ? (
        <div
          className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Input invisible que cubre la zona para capturar clics */}
          <input
            type="file"
            className='drop-input'
            accept=".jpg,.jpeg,.png"
            disabled={!isSignedIn}
            onChange={handleChange}
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
        // Si hay archivo, muestra la tarjeta de estado con la barra de progreso
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