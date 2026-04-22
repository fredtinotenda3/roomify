// FILE: C:\Users\user\Desktop\roomify\lib\puter.action.ts

import puter from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";
import type { DesignItem, CreateProjectParams, PublicProject, GalleryFilter } from "./types";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams): Promise<DesignItem | null | undefined> => {
    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; skip history fetch;');
        return null;
    }
    const projectId = item.id;

    const hosting = await getOrCreateHostingConfig();

    const hostedSource = projectId ?
        await uploadImageToHosting({ hosting, url: item.sourceImage, projectId, label: 'source', }) : null;

    const hostedRender = projectId && item.renderedImage ?
        await uploadImageToHosting({ hosting, url: item.renderedImage, projectId, label: 'rendered', }) : null;

    const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage)
        ? item.sourceImage
        : ''
    );

    if(!resolvedSource) {
        console.warn('Failed to host source image, skipping save.')
        return null;
    }

    const resolvedRender = hostedRender?.url
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

    const payload = {
        ...rest,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
        style: item.style,
        preset: item.preset,
        renderedStyles: item.renderedStyles,
        renderedPresets: item.renderedPresets,
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
            method: 'POST',
            body: JSON.stringify({
                project: payload,
                visibility
            })
        });

        if(!response.ok) {
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

export const getProjects = async () => {
    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; skip history fetch;');
        return []
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

        if(!response.ok) {
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

// PROJECT DASHBOARD FUNCTIONS

export const renameProject = async (id: string, newName: string): Promise<boolean> => {
    if (!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL');
        return false;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/rename`, {
            method: 'POST',
            body: JSON.stringify({ id, name: newName })
        });

        if (!response.ok) {
            console.error('Failed to rename project', await response.text());
            return false;
        }

        return true;
    } catch (e) {
        console.error('Failed to rename project:', e);
        return false;
    }
};

export const deleteProject = async (id: string): Promise<boolean> => {
    if (!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL');
        return false;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/delete`, {
            method: 'POST',
            body: JSON.stringify({ id })
        });

        if (!response.ok) {
            console.error('Failed to delete project', await response.text());
            return false;
        }

        return true;
    } catch (e) {
        console.error('Failed to delete project:', e);
        return false;
    }
};

export const toggleFavorite = async (id: string, isFavorite: boolean): Promise<boolean> => {
    if (!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL');
        return false;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/favorite`, {
            method: 'POST',
            body: JSON.stringify({ id, favorite: isFavorite })
        });

        if (!response.ok) {
            console.error('Failed to toggle favorite', await response.text());
            return false;
        }

        return true;
    } catch (e) {
        console.error('Failed to toggle favorite:', e);
        return false;
    }
};

export const getFavorites = async (): Promise<string[]> => {
    if (!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL');
        return [];
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/favorites`, {
            method: 'GET'
        });

        if (!response.ok) {
            console.error('Failed to get favorites', await response.text());
            return [];
        }

        const data = await response.json();
        return data.favorites || [];
    } catch (e) {
        console.error('Failed to get favorites:', e);
        return [];
    }
};

// SHARE SYSTEM FUNCTIONS

export const shareProject = async (id: string, isPublic: boolean): Promise<{ success: boolean; shareUrl?: string; shareToken?: string }> => {
    if (!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL');
        return { success: false };
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/share`, {
            method: 'POST',
            body: JSON.stringify({ id, isPublic })
        });

        if (!response.ok) {
            console.error('Failed to share project', await response.text());
            return { success: false };
        }

        const data = await response.json();
        return { 
            success: true, 
            shareUrl: data.shareUrl, 
            shareToken: data.shareToken 
        };
    } catch (e) {
        console.error('Failed to share project:', e);
        return { success: false };
    }
};

export const getPublicGallery = async (filter: GalleryFilter): Promise<{ projects: PublicProject[]; total: number }> => {
    if (!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL');
        return { projects: [], total: 0 };
    }

    try {
        const params = new URLSearchParams();
        params.append('limit', '20');
        params.append('offset', '0');
        params.append('sortBy', filter.sortBy);
        if (filter.style) params.append('style', filter.style);
        if (filter.preset) params.append('preset', filter.preset);
        if (filter.search) params.append('search', filter.search);

        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/gallery?${params.toString()}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            console.error('Failed to get gallery', await response.text());
            return { projects: [], total: 0 };
        }

        const data = await response.json();
        return { 
            projects: data.projects || [], 
            total: data.total || 0 
        };
    } catch (e) {
        console.error('Failed to get gallery:', e);
        return { projects: [], total: 0 };
    }
};

export const incrementProjectView = async (id: string): Promise<boolean> => {
    if (!PUTER_WORKER_URL) return false;

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/view`, {
            method: 'POST',
            body: JSON.stringify({ id })
        });

        return response.ok;
    } catch (e) {
        console.error('Failed to increment view:', e);
        return false;
    }
};

export const likeProject = async (id: string, like: boolean): Promise<{ success: boolean; likeCount?: number }> => {
    if (!PUTER_WORKER_URL) return { success: false };

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/like`, {
            method: 'POST',
            body: JSON.stringify({ id, like })
        });

        if (!response.ok) return { success: false };

        const data = await response.json();
        return { success: true, likeCount: data.likeCount };
    } catch (e) {
        console.error('Failed to like project:', e);
        return { success: false };
    }
};

export const getPublicProject = async (id: string, shareToken?: string): Promise<DesignItem | null> => {
    if (!PUTER_WORKER_URL) return null;

    try {
        const url = `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}${shareToken ? `&token=${shareToken}` : ''}`;
        const response = await puter.workers.exec(url, { method: 'GET' });

        if (!response.ok) return null;

        const data = await response.json();
        return data.project || null;
    } catch (e) {
        console.error('Failed to get public project:', e);
        return null;
    }
};