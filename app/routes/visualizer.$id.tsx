import { useNavigate, useOutletContext, useParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { generate3DView } from "../../lib/ai.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import Button from "../../components/ui/Button";
import { createProject, getProjectById } from "../../lib/puter.action";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

const VisualizerId = () => {
  const navigate = useNavigate();
  const { id } = useParams();                                                // Obtiene el 'id' del proyecto desde la URL (ej: /visualizer/123).
  const { userId } = useOutletContext<AuthContext>();                        // Obtiene el ID del usuario autenticado desde el contexto.

  const hasInitialGenerated = useRef(false);                                 // Referencia para controlar si la generación inicial ya se ejecutó.

  const [project, setProject] = useState<DesignItem | null>(null);           // Estado para almacenar los datos del proyecto actual.
  const [isProjectLoading, setIsProjectLoading] = useState(true);            // Estado para indicar si el proyecto se está cargando.

  const [isProcessing, setIsProcessing] = useState(false);                   // Estado para indicar si la IA está generando una imagen.
  const [currentImage, setCurrentImage] = useState<string | null>(null);     // Estado para la imagen renderizada por la IA que se muestra.

  const handleBack = () => navigate('/');                                    // Función para navegar de vuelta a la página de inicio.

  const handleExport = () => {                                               // Función para descargar la imagen generada.
    if (!currentImage) return;                                               // No hace nada si no hay imagen para exportar.

    const link = document.createElement('a');                                // Crea un elemento <a> temporal.
    link.href = currentImage;                                                // Asigna la URL de la imagen (puede ser base64 o una URL http).
    link.download = `roomify-${id || 'design'}.png`;                         // Define el nombre del archivo a descargar.
    document.body.appendChild(link);                                         // Añade el enlace al DOM.
    link.click();                                                            // Simula un clic para iniciar la descarga.
    document.body.removeChild(link);                                         // Elimina el enlace del DOM.
  };

  const runGeneration = async (item: DesignItem) => {                        // Función principal que orquesta la generación de la imagen 3D.
    if (!id || !item.sourceImage) return;                                    // Condición de guarda: necesita un ID y una imagen de origen.

    try {
      setIsProcessing(true);                                                 // Activa el estado de "procesando" para mostrar la UI de carga.
      const result = await generate3DView({ sourceImage: item.sourceImage });// Llama a la acción de IA para generar la vista 3D.

      if (result.renderedImage) {                                            // Si la IA devuelve una imagen renderizada.
        setCurrentImage(result.renderedImage);                               // Actualiza la imagen que se muestra en la UI.

        const updatedItem = {                                                // Prepara el objeto del proyecto con la nueva información.
          ...item,
          renderedImage: result.renderedImage,
          renderedPath: result.renderedPath,
          timestamp: Date.now(),
          ownerId: item.ownerId ?? userId ?? null,
          isPublic: item.isPublic ?? false,
        };

        const saved = await createProject({ item: updatedItem, visibility: "private" }); // Guarda el proyecto actualizado en la base de datos.

        if (saved) {                                                        // Si se guardó correctamente.
          setProject(saved);                                                // Actualiza el estado del proyecto con los datos guardados (que pueden incluir URLs alojadas).
          setCurrentImage(saved.renderedImage || result.renderedImage);     // Asegura que la imagen actual sea la correcta (preferiblemente la alojada).
        }
      }
    } catch (error) {
      console.error('Generation failed: ', error);                          // Manejo de errores si la generación falla.
    } finally {
      setIsProcessing(false);                                               // Desactiva el estado de "procesando" al finalizar.
    }
  };

  useEffect(() => {                                                         // Efecto para cargar los datos del proyecto cuando el componente se monta o el 'id' cambia.
    let isMounted = true;                                                   // Flag para evitar actualizaciones de estado en un componente desmontado.

    const loadProject = async () => {
      if (!id) {                                                            // Si no hay ID, no hay nada que cargar.
        setIsProjectLoading(false);
        return;
      }

      setIsProjectLoading(true);                                            // Activa el estado de carga del proyecto.

      const fetchedProject = await getProjectById({ id });                  // Llama a la acción para obtener los datos del proyecto por su ID.

      if (!isMounted) return;                                               // Si el componente se desmontó mientras se cargaba, no actualiza el estado.

      setProject(fetchedProject);                                           // Guarda los datos del proyecto en el estado.
      setCurrentImage(fetchedProject?.renderedImage || null);               // Establece la imagen actual a la renderizada si ya existe.
      setIsProjectLoading(false);                                           // Desactiva el estado de carga del proyecto.
      hasInitialGenerated.current = false;                                  // Resetea la bandera de generación para este proyecto.
    };

    loadProject();                                                          // Ejecuta la carga del proyecto.

    return () => {                                                          // Función de limpieza que se ejecuta al desmontar el componente.
      isMounted = false;                                                    // Marca el componente como desmontado.
    };
  }, [id]);                                                                 // Se ejecuta cada vez que el 'id' de la URL cambia.

  useEffect(() => {                                                         // Efecto para disparar la generación de la imagen 3D.
    if (
      isProjectLoading ||                                                   // No se ejecuta si el proyecto aún está cargando.
      hasInitialGenerated.current ||                                        // No se ejecuta si la generación inicial ya ocurrió para este proyecto.
      !project?.sourceImage                                                 // No se ejecuta si no hay una imagen de origen.
    )
      return;

    if (project.renderedImage) {                                            // Si el proyecto ya tiene una imagen renderizada.
      setCurrentImage(project.renderedImage);                               // La muestra directamente.
      hasInitialGenerated.current = true;                                   // Marca que la generación inicial ya está hecha.
      return;
    }

    hasInitialGenerated.current = true;                                     // Marca que la generación se va a ejecutar para no repetirla.
    void runGeneration(project);                                            // Inicia la generación de la imagen 3D. 'void' se usa para indicar que no se espera el resultado aquí.
  }, [project, isProjectLoading]);                                          // Se ejecuta cuando el estado 'project' o 'isProjectLoading' cambia.

  return (
    <div className="visualizer">
      <nav className="topbar">
        <div className="brand">
          <Box className="logo" />

          <span className="name">Roomify</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
          <X className="icon" /> Exit Editor
        </Button>
      </nav>

      <section className="content">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Project</p>
              <h2>{project?.name || `Residence ${id}`}</h2>
              <p className="note">Created by You</p>
            </div>

            <div className="panel-actions">
              <Button
                size="sm"
                onClick={handleExport}
                className="export"
                disabled={!currentImage}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              <Button size="sm" onClick={() => { }} className="share">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <div className={`render-area ${isProcessing ? 'is-processing' : ''}`}>
            {currentImage ? ( // Si hay una imagen renderizada, la muestra.
              <img src={currentImage} alt="AI Render" className="render-img" />
            ) : ( // Si no, muestra un placeholder.
              <div className="render-placeholder">
                {project?.sourceImage && ( // Dentro del placeholder, si hay imagen original, la usa como fallback.
                  <img src={project?.sourceImage} alt="Original" className="render-fallback" />
                )}
              </div>
            )}

            {isProcessing && ( // Si la IA está procesando, muestra una superposición de carga.
              <div className="render-overlay">
                <div className="rendering-card">
                  <RefreshCcw className="spinner" />
                  <span className="title">Rendering...</span>
                  <span className="subtitle">Generating your 3D visualization</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel compare">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Comparison</p>
              <h3>Before and After</h3>
            </div>
            <div className="hint">Drag to compare</div>
          </div>

          <div className="compare-stage">
            {project?.sourceImage && currentImage ? ( // Si existen tanto la imagen original como la renderizada.
              <ReactCompareSlider // Muestra el componente para comparar imágenes.
                defaultValue={50}
                style={{ width: '100%', height: 'auto' }}
                itemOne={
                  <ReactCompareSliderImage src={project?.sourceImage || undefined} alt="before" className="compare-img" />
                }
                itemTwo={
                  <ReactCompareSliderImage src={currentImage || project?.renderedImage || undefined} alt="after" className="compare-img" />
                }
              />
            ) : ( // Si falta alguna de las dos imágenes.
              <div className="compare-fallback">
                {project?.sourceImage && ( // Muestra solo la imagen original como fallback.
                  <img src={project.sourceImage} alt="Before" className="compare-img" />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
export default VisualizerId;
