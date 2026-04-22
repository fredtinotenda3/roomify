// FILE: C:\Users\user\Desktop\roomify\components\ProjectDashboard.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
    Search, 
    Star, 
    Trash2, 
    Edit2, 
    Clock, 
    X,
    Check,
    FolderOpen,
    Calendar,
    User
} from 'lucide-react';
import Button from './ui/Button';
import { getProjects, deleteProject, renameProject, toggleFavorite, getFavorites } from '../lib/puter.action';
import UpgradeModal from './UpgradeModal';
import type { DesignItem } from '../lib/types';

interface ProjectDashboardProps {
    userId: string;
    isPremium: boolean;
}

const ProjectDashboard = ({ userId, isPremium }: ProjectDashboardProps) => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<DesignItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'favorites' | 'recent'>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

    const loadProjects = async () => {
        setLoading(true);
        const allProjects = await getProjects();
        const favs = await getFavorites();
        setFavorites(favs);
        
        const sorted = [...allProjects].sort((a, b) => {
            if (sortBy === 'date') {
                return (b.timestamp || 0) - (a.timestamp || 0);
            } else {
                return (a.name || '').localeCompare(b.name || '');
            }
        });
        
        setProjects(sorted);
        filterProjects(sorted, searchTerm, filterType, favs);
        setLoading(false);
    };

    const filterProjects = (projs: DesignItem[], term: string, filter: string, favs: string[]) => {
        let filtered = [...projs];
        
        if (term) {
            filtered = filtered.filter(p => 
                p.name?.toLowerCase().includes(term.toLowerCase()) ||
                p.id.toLowerCase().includes(term.toLowerCase())
            );
        }
        
        if (filter === 'favorites') {
            filtered = filtered.filter(p => favs.includes(p.id));
        } else if (filter === 'recent') {
            filtered = filtered.slice(0, 5);
        }
        
        setFilteredProjects(filtered);
    };

    useEffect(() => {
        if (userId) {
            loadProjects();
        }
    }, [userId, sortBy]);

    useEffect(() => {
        filterProjects(projects, searchTerm, filterType, favorites);
    }, [searchTerm, filterType, projects, favorites]);

    const handleRename = async (id: string, newName: string) => {
        if (!newName.trim()) return;
        const success = await renameProject(id, newName);
        if (success) {
            await loadProjects();
        }
        setEditingId(null);
        setEditName('');
    };

    const handleDelete = async (id: string) => {
        const success = await deleteProject(id);
        if (success) {
            await loadProjects();
        }
        setShowDeleteConfirm(null);
    };

    const handleToggleFavorite = async (id: string) => {
        const isFavorite = favorites.includes(id);
        const success = await toggleFavorite(id, !isFavorite);
        if (success) {
            let newFavorites: string[];
            if (!isFavorite) {
                newFavorites = [...favorites, id];
            } else {
                newFavorites = favorites.filter(f => f !== id);
            }
            setFavorites(newFavorites);
            filterProjects(projects, searchTerm, filterType, newFavorites);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="project-dashboard">
            <div className="dashboard-header">
                <h2>My Projects</h2>
                <p className="subtitle">Manage and organize your architectural visualizations</p>
            </div>

            <div className="dashboard-controls">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="clear-search">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filterType === 'favorites' ? 'active' : ''}`}
                        onClick={() => setFilterType('favorites')}
                    >
                        <Star size={14} />
                        Favorites
                    </button>
                    <button
                        className={`filter-btn ${filterType === 'recent' ? 'active' : ''}`}
                        onClick={() => setFilterType('recent')}
                    >
                        <Clock size={14} />
                        Recent
                    </button>
                </div>

                <div className="sort-buttons">
                    <button
                        className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
                        onClick={() => setSortBy('date')}
                    >
                        Sort by Date
                    </button>
                    <button
                        className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                        onClick={() => setSortBy('name')}
                    >
                        Sort by Name
                    </button>
                </div>
            </div>

            <div className="stats-bar">
                <div className="stat">
                    <FolderOpen size={16} />
                    <span>{projects.length} Total Projects</span>
                </div>
                <div className="stat">
                    <Star size={16} />
                    <span>{favorites.length} Favorites</span>
                </div>
            </div>

            {loading ? (
                <div className="loading-projects">
                    <div className="spinner"></div>
                    <p>Loading your projects...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="empty-state">
                    {searchTerm ? (
                        <>
                            <Search size={48} />
                            <h3>No matching projects</h3>
                            <p>Try a different search term</p>
                        </>
                    ) : (
                        <>
                            <FolderOpen size={48} />
                            <h3>No projects yet</h3>
                            <p>Upload your first floor plan to get started</p>
                            <Button onClick={() => navigate('/#upload')} className="create-btn">
                                Create Project
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="projects-grid">
                    {filteredProjects.map((project) => (
                        <div key={project.id} className="project-card-dashboard">
                            <div 
                                className="project-preview"
                                onClick={() => navigate(`/visualizer/${project.id}`)}
                            >
                                <img 
                                    src={project.renderedImage || project.sourceImage} 
                                    alt={project.name || 'Project'}
                                />
                                {project.renderedImage && (
                                    <div className="preview-badge">AI Generated</div>
                                )}
                            </div>
                            
                            <div className="project-info">
                                {editingId === project.id ? (
                                    <div className="rename-input">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            autoFocus
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleRename(project.id, editName);
                                                }
                                            }}
                                        />
                                        <button onClick={() => handleRename(project.id, editName)}>
                                            <Check size={16} />
                                        </button>
                                        <button onClick={() => setEditingId(null)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="project-name-row">
                                            <h3 onClick={() => navigate(`/visualizer/${project.id}`)}>
                                                {project.name || `Project ${project.id.slice(-6)}`}
                                            </h3>
                                            <div className="project-actions">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(project.id);
                                                        setEditName(project.name || '');
                                                    }}
                                                    className="action-btn"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleFavorite(project.id)}
                                                    className={`action-btn favorite-btn ${favorites.includes(project.id) ? 'active' : ''}`}
                                                    title={favorites.includes(project.id) ? 'Remove from favorites' : 'Add to favorites'}
                                                >
                                                    <Star size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(project.id)}
                                                    className="action-btn delete-btn"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="project-meta">
                                            <span className="meta-item">
                                                <Calendar size={12} />
                                                {formatDate(project.timestamp)}
                                            </span>
                                            <span className="meta-item">
                                                <User size={12} />
                                                {project.isPublic ? 'Public' : 'Private'}
                                            </span>
                                            {project.style && (
                                                <span className="meta-item style-badge">
                                                    {project.style}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {showDeleteConfirm === project.id && (
                                <div className="delete-confirm-overlay">
                                    <div className="delete-confirm">
                                        <h4>Delete Project?</h4>
                                        <p>This action cannot be undone. The project and all its renders will be permanently deleted.</p>
                                        <div className="delete-actions">
                                            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" className="delete-confirm-btn" onClick={() => handleDelete(project.id)}>
                                                Delete Forever
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <UpgradeModal 
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="advanced features"
            />

            <style>{`
                .project-dashboard {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                .dashboard-header {
                    margin-bottom: 2rem;
                }

                .dashboard-header h2 {
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }

                .dashboard-header .subtitle {
                    color: #6b7280;
                    font-size: 0.875rem;
                }

                .dashboard-controls {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    margin-bottom: 1.5rem;
                }

                .search-box {
                    flex: 1;
                    min-width: 200px;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    background: white;
                }

                .search-box input {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 0.875rem;
                }

                .clear-search {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #9ca3af;
                }

                .filter-buttons, .sort-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .filter-btn, .sort-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .filter-btn:hover, .sort-btn:hover {
                    border-color: #f97316;
                    color: #f97316;
                }

                .filter-btn.active, .sort-btn.active {
                    background: #f97316;
                    color: white;
                    border-color: #f97316;
                }

                .stats-bar {
                    display: flex;
                    gap: 1.5rem;
                    padding: 1rem;
                    background: #f9fafb;
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: #4b5563;
                }

                .projects-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .project-card-dashboard {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 1rem;
                    overflow: hidden;
                    transition: all 0.2s;
                    position: relative;
                }

                .project-card-dashboard:hover {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }

                .project-preview {
                    position: relative;
                    aspect-ratio: 16/9;
                    overflow: hidden;
                    cursor: pointer;
                    background: #f3f4f6;
                }

                .project-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s;
                }

                .project-preview:hover img {
                    transform: scale(1.05);
                }

                .preview-badge {
                    position: absolute;
                    bottom: 0.5rem;
                    right: 0.5rem;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.7rem;
                }

                .project-info {
                    padding: 1rem;
                }

                .project-name-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .project-name-row h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 0;
                    color: #1a1a1a;
                }

                .project-name-row h3:hover {
                    color: #f97316;
                }

                .project-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .action-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 0.25rem;
                    color: #9ca3af;
                    transition: all 0.2s;
                }

                .action-btn:hover {
                    background: #f3f4f6;
                    color: #4b5563;
                }

                .favorite-btn.active {
                    color: #fbbf24;
                }

                .delete-btn:hover {
                    color: #ef4444;
                }

                .project-meta {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    font-size: 0.7rem;
                    color: #6b7280;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .style-badge {
                    background: #f3f4f6;
                    padding: 0.125rem 0.375rem;
                    border-radius: 0.25rem;
                    text-transform: capitalize;
                }

                .rename-input {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }

                .rename-input input {
                    flex: 1;
                    padding: 0.25rem 0.5rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.25rem;
                    font-size: 0.875rem;
                }

                .rename-input button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                }

                .delete-confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .delete-confirm {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 1rem;
                    max-width: 400px;
                    width: 90%;
                }

                .delete-confirm h4 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.125rem;
                }

                .delete-confirm p {
                    color: #6b7280;
                    font-size: 0.875rem;
                    margin-bottom: 1.5rem;
                }

                .delete-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }

                .delete-confirm-btn {
                    background: #ef4444;
                    color: white;
                }

                .delete-confirm-btn:hover {
                    background: #dc2626;
                }

                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: #f9fafb;
                    border-radius: 1rem;
                }

                .empty-state svg {
                    color: #9ca3af;
                    margin-bottom: 1rem;
                }

                .empty-state h3 {
                    font-size: 1.125rem;
                    margin-bottom: 0.5rem;
                }

                .empty-state p {
                    color: #6b7280;
                    margin-bottom: 1rem;
                }

                .loading-projects {
                    text-align: center;
                    padding: 4rem;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f3f4f6;
                    border-top-color: #f97316;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    margin: 0 auto 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .project-dashboard {
                        padding: 1rem;
                    }
                    
                    .dashboard-controls {
                        flex-direction: column;
                    }
                    
                    .projects-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default ProjectDashboard;