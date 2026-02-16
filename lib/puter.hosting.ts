import puter from "@heyputer/puter.js";
import {
  createHostingSlug,
  fetchBlobFromUrl, getHostedUrl,
  getImageExtension,
  HOSTING_CONFIG_KEY,
  imageUrlToPngBlob,
  isHostedUrl
} from "./utils";

// Función para obtener o crear la configuración de hosting del usuario
export const getOrCreateHostingConfig = async (): Promise<HostingConfig | null> => {

  const existing = (await puter.kv.get(HOSTING_CONFIG_KEY)) as HostingConfig | null;      // 1. Intentamos recuperar la configuración existente de la base de datos KV (Key-Value) de Puter. Esto evita crear un nuevo subdominio cada vez que el usuario entra.

  if (existing?.subdomain) return { subdomain: existing.subdomain };                      // Si ya existe, devolvemos el subdominio guardado.

  const subdomain = createHostingSlug();                                                  // 2. Si no existe, generamos un nombre único (slug) para el subdominio.

  try {
    // 3. Creamos el sitio de hosting en Puter.
    // El segundo argumento '.' indica que servirá 
    // archivos desde el directorio raíz del usuario (o del contexto actual).
    const created = await puter.hosting.create(subdomain, '.');

    const record = { subdomain: created.subdomain };

    await puter.kv.set(HOSTING_CONFIG_KEY, record);                                       // 4. Guardamos esta nueva configuración en KV para el futuro.

    return record;
  } catch (e) {
    console.warn(`Could not find subdomain: ${e}`);
    return null;
  }
}

// Función para subir la imagen al sistema de archivos de Puter
export const uploadImageToHosting = async ({
  hosting,
  url,
  projectId,
  label
}: StoreHostedImageParams): Promise<HostedAsset | null> => {

  if (!hosting || !url) return null;                                                        // Si no hay hosting o URL, devolvemos null.
  if (isHostedUrl(url)) return { url };                                                     // Si la URL ya está en el hosting, la devolvemos.

  try {
    // 1. Convertimos la imagen (que puede ser Base64 o URL) a un objeto Blob binario.
    // Si es la imagen renderizada ('rendered'), forzamos la conversión a PNG.
    const resolved = label === "rendered"
      ? await imageUrlToPngBlob(url)
        .then((blob) => blob ? { blob, contentType: 'image/png' } : null)
      : await fetchBlobFromUrl(url);

    if (!resolved) return null;

    // 2. Determinamos la extensión y la ruta donde se guardará.
    const contentType = resolved.contentType || resolved.blob.type || '';                    // Obtiene el tipo de contenido de la imagen
    const ext = getImageExtension(contentType, url);                                         // Obtiene la extensión de la imagen

    // Estructura de carpetas: projects/123456789/source.jpg
    const dir = `projects/${projectId}`;
    const filePath = `${dir}/${label}.${ext}`;

    // 3. Creamos un objeto File de JavaScript listo para escribir.
    const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
      type: contentType,
    });

    // 4. Operaciones de Sistema de Archivos (FS) en Puter:
    // - mkdir: Crea el directorio si no existe (createMissingParents: true es como 'mkdir -p').
    await puter.fs.mkdir(dir, { createMissingParents: true });
    // - write: Escribe el archivo en el disco virtual del usuario.
    await puter.fs.write(filePath, uploadFile);

    // 5. Construimos la URL pública usando el subdominio que obtuvimos antes.
    // Esto permite que la etiqueta <img src="..."> funcione en el navegador.
    const hostedUrl = getHostedUrl({ subdomain: hosting.subdomain }, filePath);

    return hostedUrl ? { url: hostedUrl } : null;
  } catch (e) {
    console.warn(`Failed to store hosted image: ${e}`);
    return null;
  }
}