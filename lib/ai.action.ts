import puter from "@heyputer/puter.js";
import { ROOMIFY_RENDER_PROMPT } from "./constants";

// Función para convertir una URL de imagen (http) a un Data URL (base64).
export const fetchAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);                                           // Realiza la petición para obtener la imagen.

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();                                          // Convierte la respuesta en un objeto binario (Blob).

  return new Promise((resolve, reject) => {
    const reader = new FileReader();                                           // Utiliza FileReader para leer el contenido del Blob.
    reader.onloadend = () => resolve(reader.result as string);                 // Cuando la lectura termina, resuelve la promesa con el Data URL.
    reader.onerror = reject;                                                   // En caso de error, rechaza la promesa.
    reader.readAsDataURL(blob);                                                // Inicia la lectura del Blob para convertirlo a base64.
  });
};

// Función principal que se comunica con la IA de Puter para generar la vista 3D.
export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
  // 1. Asegurarse de que la imagen de origen esté en formato Data URL (base64).
  // Si ya es un Data URL, la usa directamente. Si no, la descarga y convierte.
  const dataUrl = sourceImage.startsWith('data:')
    ? sourceImage
    : await fetchAsDataUrl(sourceImage);

  // 2. Extraer los datos base64 y el tipo MIME del Data URL para la API de la IA.
  const base64Data = dataUrl.split(',')[1];
  const mimeType = dataUrl.split(';')[0].split(':')[1];

  if (!mimeType || !base64Data) throw new Error('Invalid source image payload');

  // 3. Llamar al modelo de IA de Puter (txt2img con una imagen de entrada).
  const response = await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
    provider: "gemini",                      // Proveedor de IA a utilizar.
    model: "gemini-2.5-flash-image-preview", // Modelo específico para la generación.
    input_image: base64Data,                 // La imagen original en formato base64.
    input_image_mime_type: mimeType,         // El tipo de la imagen de entrada (ej: 'image/png').
    ratio: { w: 1024, h: 1024 },             // Dimensiones de la imagen de salida.
  });

  // 4. La respuesta de la API es un elemento <img>, extraemos su `src`.
  const rawImageUrl = (response as HTMLImageElement).src ?? null;

  if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

  // 5. Asegurarse de que la imagen final devuelta también sea un Data URL para consistencia.
  const renderedImage = rawImageUrl.startsWith('data:')
    ? rawImageUrl : await fetchAsDataUrl(rawImageUrl);

  return { renderedImage, renderedPath: undefined }; // Devuelve la imagen generada.
}

