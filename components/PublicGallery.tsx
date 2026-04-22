// FILE: C:\Users\user\Desktop\roomify\components\PublicGallery.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Heart, Eye, Clock, Filter, X, Grid3X3, List } from 'lucide-react';
import Button from './ui/Button';
import { getPublicGallery, likeProject } from '../lib/puter.action';
import type { PublicProject, GalleryFilter } from '../lib/types';
import { STYLE_OPTIONS } from '../lib/constants';
import { DESIGN_PRESETS } from '../lib/presets';

const PublicGallery = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<PublicProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<GalleryFilter>({ sortBy: 'recent' });
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const loadGallery = async () => {
        setLoading(true);
        const result = await getPublicGallery(filter);
        setProjects(result.projects);
        setLoading(false);
    };

    useEffect(() => {
        loadGallery();
    }, [filter]);

    const handleLike = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await likeProject(id, true);
        if (result.success) {
            setProjects(projects.map(p => 
                p.id === id ? { ...p, likeCount: result.likeCount, isLiked: true } : p
            ));
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
        <div className="public-gallery">
            <div className="gallery-header">
                <h1>Community Gallery</h1>
                <p>Explore stunning architectural designs created by the Roomify community</p>
            </div>

            <div className="gallery-controls">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search designs..."
                        value={filter.search || ''}
                        onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                    />
                    {filter.search && (
                        <button onClick={() => setFilter({ ...filter, search: undefined })}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="view-toggle">
                    <button
                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <Grid3X3 size={18} />
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={18} />
                    </button>
                </div>

                <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={18} />
                    Filters
                </button>
            </div>

            {showFilters && (
                <div className="filters-panel">
                    <div className="filter-group">
                        <label>Sort By</label>
                        <div className="filter-buttons">
                            <button
                                className={filter.sortBy === 'recent' ? 'active' : ''}
                                onClick={() => setFilter({ ...filter, sortBy: 'recent' })}
                            >
                                Most Recent
                            </button>
                            <button
                                className={filter.sortBy === 'popular' ? 'active' : ''}
                                onClick={() => setFilter({ ...filter, sortBy: 'popular' })}
                            >
                                Most Viewed
                            </button>
                            <button
                                className={filter.sortBy === 'mostLiked' ? 'active' : ''}
                                onClick={() => setFilter({ ...filter, sortBy: 'mostLiked' })}
                            >
                                Most Liked
                            </button>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Style</label>
                        <div className="filter-buttons">
                            <button
                                className={!filter.style ? 'active' : ''}
                                onClick={() => setFilter({ ...filter, style: undefined })}
                            >
                                All
                            </button>
                            {STYLE_OPTIONS.map(style => (
                                <button
                                    key={style.id}
                                    className={filter.style === style.id ? 'active' : ''}
                                    onClick={() => setFilter({ ...filter, style: style.id })}
                                >
                                    {style.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Preset</label>
                        <div className="filter-buttons">
                            <button
                                className={!filter.preset ? 'active' : ''}
                                onClick={() => setFilter({ ...filter, preset: undefined })}
                            >
                                All
                            </button>
                            {DESIGN_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    className={filter.preset === preset.id ? 'active' : ''}
                                    onClick={() => setFilter({ ...filter, preset: preset.id })}
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="gallery-loading">
                    <div className="spinner"></div>
                    <p>Loading community designs...</p>
                </div>
            ) : projects.length === 0 ? (
                <div className="gallery-empty">
                    <Search size={48} />
                    <h3>No designs found</h3>
                    <p>Try adjusting your filters or be the first to share a design!</p>
                </div>
            ) : (
                <div className={`gallery-grid ${viewMode}`}>
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="gallery-card"
                            onClick={() => navigate(`/visualizer/${project.id}?share=${project.shareToken}`)}
                        >
                            <div className="card-image">
                                <img src={project.renderedImage || project.sourceImage} alt={project.name || 'Design'} />
                                <div className="card-overlay">
                                    <div className="card-stats">
                                        <span><Eye size={14} /> {project.viewCount || 0}</span>
                                        <span><Heart size={14} /> {project.likeCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="card-info">
                                <h3>{project.name || `Project ${project.id.slice(-6)}`}</h3>
                                <div className="card-meta">
                                    <span className="style-tag">{project.style || 'Modern'}</span>
                                    <span className="preset-tag">{project.preset || 'Budget'}</span>
                                </div>
                                <div className="card-footer">
                                    <span className="date">
                                        <Clock size={12} />
                                        {formatDate(project.timestamp)}
                                    </span>
                                    <button
                                        className={`like-btn ${project.isLiked ? 'liked' : ''}`}
                                        onClick={(e) => handleLike(project.id, e)}
                                    >
                                        <Heart size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .public-gallery {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                .gallery-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .gallery-header h1 {
                    font-size: 2.5rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }

                .gallery-header p {
                    color: #6b7280;
                }

                .gallery-controls {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }

                .search-bar {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    background: white;
                }

                .search-bar input {
                    flex: 1;
                    border: none;
                    outline: none;
                }

                .view-toggle {
                    display: flex;
                    gap: 0.25rem;
                    background: #f3f4f6;
                    padding: 0.25rem;
                    border-radius: 0.5rem;
                }

                .view-btn {
                    padding: 0.5rem;
                    background: none;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                }

                .view-btn.active {
                    background: white;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }

                .filter-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    cursor: pointer;
                }

                .filters-panel {
                    background: #f9fafb;
                    border-radius: 1rem;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .filter-group {
                    margin-bottom: 1rem;
                }

                .filter-group label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    display: block;
                }

                .filter-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .filter-buttons button {
                    padding: 0.25rem 0.75rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .filter-buttons button.active {
                    background: #f97316;
                    color: white;
                    border-color: #f97316;
                }

                .gallery-grid {
                    display: grid;
                    gap: 1.5rem;
                }

                .gallery-grid.grid {
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                }

                .gallery-grid.list {
                    grid-template-columns: 1fr;
                }

                .gallery-card {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 1rem;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .gallery-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                }

                .card-image {
                    position: relative;
                    aspect-ratio: 16/9;
                    overflow: hidden;
                }

                .card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .card-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
                    padding: 1rem;
                }

                .card-stats {
                    display: flex;
                    gap: 1rem;
                    color: white;
                    font-size: 0.75rem;
                }

                .card-stats span {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .card-info {
                    padding: 1rem;
                }

                .card-info h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }

                .card-meta {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .style-tag, .preset-tag {
                    font-size: 0.7rem;
                    padding: 0.125rem 0.375rem;
                    border-radius: 0.25rem;
                    background: #f3f4f6;
                }

                .card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .date {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.7rem;
                    color: #6b7280;
                }

                .like-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #9ca3af;
                    transition: all 0.2s;
                }

                .like-btn.liked {
                    color: #ef4444;
                }

                .like-btn:hover {
                    transform: scale(1.1);
                }

                .gallery-loading, .gallery-empty {
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
                    .public-gallery {
                        padding: 1rem;
                    }
                    
                    .gallery-header h1 {
                        font-size: 1.75rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default PublicGallery;