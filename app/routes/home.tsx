// FILE: C:\Users\user\Desktop\roomify\app\routes\home.tsx

import type { Route } from "./+types/home";
import Navbar from "../../components/Navbar";
import {ArrowRight, ArrowUpRight, Clock, Layers, LayoutDashboard, Grid3X3} from "lucide-react";
import Button from "../../components/ui/Button";
import Upload from "../../components/Upload";
import ProjectDashboard from "../../components/ProjectDashboard";
import {useNavigate} from "react-router";
import {useEffect, useRef, useState} from "react";
import {createProject, getProjects} from "../../lib/puter.action";
import { getRemainingUsage } from "../../lib/usage.tracker";
import { useOutletContext } from "react-router";
import type { DesignItem } from "../../lib/types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Roomify - AI Floor Plan to 3D Converter" },
    { name: "description", content: "Convert your floor plans into stunning 3D architectural renders using AI" },
  ];
}

export default function Home() {
    const navigate = useNavigate();
    const { userId } = useOutletContext<AuthContext>();
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const isCreatingProjectRef = useRef(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [usageInfo, setUsageInfo] = useState<{ isPremium: boolean } | null>(null);

    useEffect(() => {
        const loadUsage = async () => {
            if (userId) {
                const usage = await getRemainingUsage(userId);
                setUsageInfo({ isPremium: usage.isPremium });
            }
        };
        loadUsage();
    }, [userId]);

    const handleUploadComplete = async (base64Image: string) => {
        try {
            if(isCreatingProjectRef.current) return false;
            isCreatingProjectRef.current = true;
            const newId = Date.now().toString();
            const name = `Residence ${newId}`;

            const newItem: DesignItem = {
                id: newId, 
                name, 
                sourceImage: base64Image,
                renderedImage: undefined,
                timestamp: Date.now()
            }

            const saved = await createProject({ item: newItem, visibility: 'private' });

            if(!saved) {
                console.error("Failed to create project");
                return false;
            }

            setProjects((prev: DesignItem[]) => [saved as DesignItem, ...prev]);

            navigate(`/visualizer/${newId}`, {
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

    useEffect(() => {
        const fetchProjects = async () => {
            const items = await getProjects();
            setProjects(items as DesignItem[]);
        }

        fetchProjects();
    }, []);

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
                  Roomify is an AI-first design environment that helps you visualize, render, and ship architectural projects faster than ever.
              </p>

              <div className="actions">
                  <a href="#upload" className="cta">
                      Start Building <ArrowRight className="icon" />
                  </a>

                  <Button variant="outline" size="lg" className="demo">
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
                          <p>Supports JPG, PNG, formats up to 10MB</p>
                      </div>

                      <Upload onComplete={handleUploadComplete} />
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
                      <div className="dashboard-toggle">
                          <Button 
                              variant={showDashboard ? 'primary' : 'secondary'} 
                              onClick={() => setShowDashboard(!showDashboard)}
                              size="sm"
                          >
                              {showDashboard ? (
                                  <>
                                      <Grid3X3 size={16} />
                                      Show Projects Grid
                                  </>
                              ) : (
                                  <>
                                      <LayoutDashboard size={16} />
                                      View Dashboard
                                  </>
                              )}
                          </Button>
                      </div>
                  </div>

                  {showDashboard && userId ? (
                      <ProjectDashboard userId={userId} isPremium={usageInfo?.isPremium || false} />
                  ) : (
                      <div className="projects-grid">
                          {projects.map((project: DesignItem) => (
                              <div key={project.id} className="project-card group" onClick={() => navigate(`/visualizer/${project.id}`)}>
                                  <div className="preview">
                                      <img src={project.renderedImage || project.sourceImage} alt="Project" />

                                      <div className="badge">
                                          <span>{project.style || 'Modern'}</span>
                                      </div>
                                  </div>

                                  <div className="card-body">
                                      <div>
                                          <h3>{project.name}</h3>

                                          <div className="meta">
                                              <Clock size={12} />
                                              <span>{new Date(project.timestamp).toLocaleDateString()}</span>
                                              <span>By You</span>
                                          </div>
                                      </div>
                                      <div className="arrow">
                                          <ArrowUpRight size={18} />
                                      </div>
                                  </div>
                              </div>
                          ))}
                          
                          {projects.length === 0 && (
                              <div className="empty">
                                  <p>No projects yet. Upload your first floor plan to get started!</p>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </section>

          <section className="partners">
              <div className="section-inner">
                  <div className="logos">
                      <div className="logo-item">
                          <div>🏢</div>
                          <span>ARCH</span>
                      </div>
                      <div className="logo-item">
                          <div>🏗️</div>
                          <span>BUILD</span>
                      </div>
                      <div className="logo-item">
                          <div>🎨</div>
                          <span>DESIGN</span>
                      </div>
                      <div className="logo-item">
                          <div>🏘️</div>
                          <span>REALTY</span>
                      </div>
                      <div className="logo-item">
                          <div>📐</div>
                          <span>PLAN</span>
                      </div>
                  </div>
              </div>
          </section>
      </div>
  )
}