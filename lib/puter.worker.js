/*
* Este archivo es un Worker que expone un API REST. Su función principal es
* persistir los datos de los proyectos de los usuarios utilizando la base de datos KV de Puter.
*/

/* 
* El frontend usa las funciones definidas en /lib/puter.action.ts como createProjects o getProjects
* Estas funciones hacen peticiones fetch a la url donde este worker esta deplegado PUTER_WORKER_URL
* El worker procesa la petición en la nube de puter y devuelve al respuesta JSON.
*/



const PROJECT_PREFIX = 'roomify_project_'; // Prefijo para las claves de los proyectos en la base de datos KV.

// Función de utilidad para crear respuestas de error en formato JSON.
const jsonError = (status, message, extra = {}) => {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status, // Código de estado HTTP (ej: 400, 401, 500).
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // Permite el acceso desde cualquier origen (CORS).
    }
  })
}

// Obtiene el ID del usuario autenticado a partir de la instancia de Puter.
const getUserId = async (userPuter) => {
  try {
    const user = await userPuter.auth.getUser();                                  // Llama al método de autenticación de Puter para obtener los datos del usuario.
    return user?.uuid || null;                                                    // Devuelve el identificador único (uuid) del usuario o null si no se encuentra.
  } catch {
    return null;                                                                  // Si hay un error durante la obtención del usuario, devuelve null. 
  }
}

// Endpoint para guardar (crear o actualizar) un proyecto.
router.post('/api/projects/save', async ({ request, user }) => {
  try {

    const userPuter = user.puter;                                                 // Obtiene la instancia del SDK de Puter específica del usuario que realiza la petición.

    if (!userPuter) return jsonError(401, 'Authentication failed');               // Si no hay instancia de Puter, el usuario no está autenticado.

    const body = await request.json();                                            // Parsea el cuerpo de la petición, que se espera que sea JSON.
    const project = body?.project;

    if (!project?.id || !project?.sourceImage) return jsonError(
      400, 'Project ID and source image are required'
    );

    const payload = {                                                             // Crea el objeto de datos (payload) que se guardará, añadiendo una marca de tiempo de actualización.  
      ...project,
      updatedAt: new Date().toISOString(),
    }


    const userId = await getUserId(userPuter);                                    // Verifica la identidad del usuario una vez más antes de escribir en la base de datos.
    if (!userId) return jsonError(401, 'Authentication failed');


    const key = `${PROJECT_PREFIX}${project.id}`;                                 // Construye la clave única para la base de datos KV usando el prefijo y el ID del proyecto.

    await userPuter.kv.set(key, payload);                                         // Guarda el payload en la base de datos KV del usuario.


    return { saved: true, id: project.id, project: payload }                      // Devuelve una respuesta de éxito con los datos guardados. 
  } catch (e) {

    return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error' }); // Si ocurre cualquier otro error, devuelve un error 500.
  }
})


// Endpoint para listar todos los proyectos del usuario autenticado.
router.get('/api/projects/list', async ({ user }) => {
  try {

    const userPuter = user.puter;                                                 // Obtiene la instancia del SDK de Puter del usuario.
    if (!userPuter) return jsonError(401, 'Authentication failed');


    const userId = await getUserId(userPuter);                                    // Verifica la identidad del usuario.
    if (!userId) return jsonError(401, 'Authentication failed');

    // Obtiene todas las claves y valores que coinciden con el prefijo de proyecto.
    // El segundo argumento 'true' indica que también se deben devolver los valores.
    const projects = (await userPuter.kv.list(PROJECT_PREFIX, true))
      // Mapea los resultados para devolver solo el valor de cada entrada.
      // NOTA: Aquí se está forzando `isPublic: true`, lo cual podría ser un comportamiento a revisar.
      .map(({ value }) => ({ ...value, isPublic: true }))

    return { projects };
  } catch (e) {
    return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
  }
})

// Endpoint para obtener un proyecto específico por su ID.
router.get('/api/projects/get', async ({ request, user }) => {
  try {

    const userPuter = user.puter;                                                 // Obtiene la instancia del SDK de Puter del usuario.
    if (!userPuter) return jsonError(401, 'Authentication failed');


    const userId = await getUserId(userPuter);                                    // Verifica la identidad del usuario.
    if (!userId) return jsonError(401, 'Authentication failed');


    const url = new URL(request.url);                                             // Parsea la URL de la petición para acceder a los parámetros de búsqueda.    

    const id = url.searchParams.get('id');                                        // Obtiene el 'id' de la query string.


    if (!id) return jsonError(400, 'Project ID is required');                     // Si no se proporciona un ID, devuelve un error 400. 


    const key = `${PROJECT_PREFIX}${id}`;                                         // Construye la clave para buscar en la base de datos KV.

    const project = await userPuter.kv.get(key);                                  // Obtiene el proyecto de la base de datos.


    if (!project) return jsonError(404, 'Project not found');                     // Si el proyecto no se encuentra, devuelve un error 404.

    return { project };                                                           // Devuelve el proyecto encontrado.
  } catch (e) {
    // Si ocurre un error, devuelve un error 500.
    return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
  }
})