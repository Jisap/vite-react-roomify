import Navbar from "components/Navbar";
import type { Route } from "./+types/home";
import { ArrowRight, ArrowUpRight, Clock, Layers } from "lucide-react";
import Button from "components/ui/Button";
import Upload from "components/Upload";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { createProject } from "lib/puter.action";


export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}



export default function Home() {

  const navigate = useNavigate();
  const [projects, setProjects] = useState<DesignItem[]>([]);
  const isCreatingProjectRef = useRef(false);

  // Cuando el componente upload termina de procesar una imagen (100% barra de progreso)
  // se llama a esta función
  const handleUploadComplete = async (base64Image: string) => {
    try {

      if (isCreatingProjectRef.current) return false;                     // Evita ejecuciones múltiples simultáneas
      isCreatingProjectRef.current = true;

      const newId = Date.now().toString();                                // Genera un ID único y un nombre temporal para el proyecto
      const name = `Residence ${newId}`;

      const newItem = {                                                   // Crea un objeto con los datos iniciales del proyecto
        id: newId, name, sourceImage: base64Image,
        renderedImage: undefined,
        timestamp: Date.now()
      }

      const saved = await createProject({                                 // Llama a la acción para crear el proyecto
        item: newItem,
        visibility: 'private'
      });

      if (!saved) {
        console.error("Failed to create project");
        return false;
      }

      setProjects((prev) => [saved, ...prev]);                            // Actualiza el estado local de proyectos


      navigate(`/visualizer/${newId}`, {                                  // Redirige al usuario a la página del visualizador con el nuevo proyecto
        state: {
          initialImage: saved.sourceImage,
          initialRendered: saved.renderedImage || null,
          name
        }
      });

      return true;
    } finally {
      isCreatingProjectRef.current = false;
    }
  }

  return (
    <div className="home">
      <Navbar />

      <section className="hero">
        <div className="announce">
          <div className="dot">
            <div className="pulse"></div>
          </div>

          <p>Introducing Roomify 2.0</p>
        </div>

        <h1>Build beautiful spaces at the speed of thought with Roomify</h1>

        <p className="subtitle">
          Roomify is an AI-first design enviroment that helps you visualize, render, and ship architectural projects faster than ever.
        </p>

        <div className="actions">
          <a href="#upload" className="cta">
            Start Building <ArrowRight className="icon" />
          </a>

          <Button variant="outline" size="lg">
            Watch Demo
          </Button>
        </div>

        <div id="upload" className="upload-shell">
          <div className="grid-overlay" />

          <div className="upload-card">
            <div className="upload-head">
              <div className="upload-icon">
                <Layers className="icon" />
              </div>

              <h3>Upload your floor plan</h3>
              <p>Support JPG, PNG, formats up to 10MB</p>
            </div>

            <Upload
              onComplete={handleUploadComplete}
            />
          </div>
        </div>
      </section>

      <section className="projects">
        <div className="section-inner">
          <div className="section-head">
            <div className="copy">
              <h2>Projects</h2>
              <p>Your latest work and shared community projects, all in one place.</p>
            </div>
          </div>

          <div className="projects-grid">
            <div className="project-card group">
              <div className="preview">
                <img src="https://roomify-mlhuk267-dfwu1i.puter.site/projects/1770803585402/rendered.png" alt="project" />

                <div className="badge">
                  <span>Community</span>
                </div>
              </div>

              <div className="card-body">
                <div>
                  <h3>Project Manhattan</h3>

                  <div className="meta">
                    <Clock size={12} />
                    <span>{new Date("01.01.2026").toLocaleDateString()}</span>
                    <span>By Jisap</span>
                  </div>
                </div>

                <div className="arrow">
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
