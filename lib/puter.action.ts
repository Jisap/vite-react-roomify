import puter from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";


export const SignIn = async () => await puter.auth.signIn();
export const SignOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch (error) {
    return null
  }
}

// Recibe la imagen generada o la original y se asegura
//  de que este alojada en una URL pública
export const createProject = async ({
  item,
  visibility = "private"
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {

  if (!PUTER_WORKER_URL) {                                                      // verificación de la URL del worker
    console.warn('Missing VITE_PUTER_WORKER_URL; skip history fetch;');
    return null;
  }

  const projectId = item.id;                                                    // ID del proyecto

  const hosting = await getOrCreateHostingConfig();                             // Obtiene la configuración de hosting

  const hostedSource = projectId                                                // Sube la imagen original ("2D") al hosting de Puter 
    ? await uploadImageToHosting({
      hosting,
      url: item.sourceImage,
      projectId,
      label: 'source',
    })
    : null;

  const hostedRender = projectId && item.renderedImage                          // Sube la imagen renderizada ("3D") al hosting de Puter
    ? await uploadImageToHosting({
      hosting,
      url: item.renderedImage,
      projectId,
      label: 'rendered',
    })
    : null;

  const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage)     // Resuelve la URL final de la imagen (la subida o la original si ya era una URL)
    ? item.sourceImage
    : ''
  );

  if (!resolvedSource) {
    console.warn('Failed to host source image, skipping save.')
    return null;
  }

  const resolvedRender = hostedRender?.url                                      // Si tenemos la imagen renderizada por la ia obtenemos la url final
    ? hostedRender?.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  const payload = {                                                          // Prepara el objeto final para guardar en la base de datos (KV store)
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  }

  try {
    const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {  // Llama al backend (Puter Worker) para guardar los metadatos del proyecto
      method: 'POST',
      body: JSON.stringify({
        project: payload,
        visibility
      })
    });

    if (!response.ok) {
      console.error('failed to save the project', await response.text());
      return null;
    }

    const data = (await response.json()) as { project?: DesignItem | null }

    return data?.project ?? null;
  } catch (e) {
    console.log('Failed to save project', e)
    return null;
  }
}

export const getProjectById = async ({ id }: { id: string }) => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
    return null;
  }

  console.log("Fetching project with ID:", id);

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
      { method: "GET" },
    );

    console.log("Fetch project response:", response);

    if (!response.ok) {
      console.error("Failed to fetch project:", await response.text());
      return null;
    }

    const data = (await response.json()) as {
      project?: DesignItem | null;
    };

    console.log("Fetched project data:", data);

    return data?.project ?? null;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
};

export const getProjects = async () => {
  if (!PUTER_WORKER_URL) {
    console.warn('Missing VITE_PUTER_WORKER_URL; skip history fetch;');
    return []
  }

  try {
    const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

    if (!response.ok) {
      console.error('Failed to fetch history', await response.text());
      return [];
    }

    const data = (await response.json()) as { projects?: DesignItem[] | null };

    return Array.isArray(data?.projects) ? data?.projects : [];
  } catch (e) {
    console.error('Failed to get projects', e);
    return [];
  }
}