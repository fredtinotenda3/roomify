// FILE: C:\Users\user\Desktop\roomify\lib\puter.worker.js

const PROJECT_PREFIX = 'roomify_project_';
const FAVORITES_PREFIX = 'roomify_favorites_';

const jsonError = (status, message, extra = {}) => {
    return new Response(JSON.stringify({ error: message, ...extra }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, puter-auth',
        }
    })
}

const jsonSuccess = (data, extra = {}) => {
    return new Response(JSON.stringify({ success: true, ...data, ...extra }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, puter-auth',
        }
    })
}

const getUserId = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();
        return user?.uuid || null;
    } catch {
        return null;
    }
}

// Helper to check if image data is too large (KV has ~1MB limit)
const isImageTooLarge = (imageData) => {
    if (!imageData) return false;
    const approximateSizeBytes = imageData.length * 0.75;
    return approximateSizeBytes > 800000;
}

// Save Project
router.post('/api/projects/save', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const project = body?.project;
        const visibility = body?.visibility || 'private';

        if (!project?.id || !project?.sourceImage) {
            return jsonError(400, 'Project ID and source image are required');
        }

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const renderedImageTooLarge = isImageTooLarge(project.renderedImage);
        const renderedStylesTooLarge = project.renderedStyles && Object.values(project.renderedStyles).some(img => isImageTooLarge(img));

        const payload = {
            id: project.id,
            name: project.name || `Residence ${project.id}`,
            sourceImage: project.sourceImage,
            timestamp: project.timestamp || Date.now(),
            ownerId: project.ownerId || userId,
            isPublic: visibility === 'public',
            style: project.style || 'modern',
            preset: project.preset || 'budget',
            updatedAt: new Date().toISOString(),
        };

        if (project.renderedImage && !renderedImageTooLarge) {
            payload.renderedImage = project.renderedImage;
        }

        if (project.renderedStyles && !renderedStylesTooLarge) {
            const styleKeys = Object.keys(project.renderedStyles);
            if (styleKeys.length <= 5) {
                payload.renderedStyles = project.renderedStyles;
            } else {
                const recentStyles = {};
                const lastFiveKeys = styleKeys.slice(-5);
                lastFiveKeys.forEach(key => {
                    recentStyles[key] = project.renderedStyles[key];
                });
                payload.renderedStyles = recentStyles;
            }
        }

        if (project.renderedPresets) {
            const presetKeys = Object.keys(project.renderedPresets);
            if (presetKeys.length <= 10) {
                payload.renderedPresets = project.renderedPresets;
            } else {
                const recentPresets = {};
                const lastTenKeys = presetKeys.slice(-10);
                lastTenKeys.forEach(key => {
                    recentPresets[key] = project.renderedPresets[key];
                });
                payload.renderedPresets = recentPresets;
            }
        }

        if (project.name) payload.name = project.name;
        if (project.sharedBy) payload.sharedBy = project.sharedBy;
        if (project.sharedAt) payload.sharedAt = project.sharedAt;

        const key = `${PROJECT_PREFIX}${project.id}`;
        await userPuter.kv.set(key, payload);

        const recentKey = `${PROJECT_PREFIX}recent_${userId}`;
        const recentProjects = (await userPuter.kv.get(recentKey)) || [];
        
        if (!recentProjects.includes(project.id)) {
            recentProjects.unshift(project.id);
            const trimmedRecent = recentProjects.slice(0, 20);
            await userPuter.kv.set(recentKey, trimmedRecent);
        }

        return jsonSuccess({ 
            saved: true, 
            id: project.id, 
            project: payload,
            warnings: {
                renderedImageTruncated: renderedImageTooLarge,
                renderedStylesTruncated: renderedStylesTooLarge
            }
        });
    } catch (e) {
        console.error('Save error:', e);
        let errorMessage = 'Failed to save project';
        if (e.message && e.message.includes('quota')) {
            errorMessage = 'Storage quota exceeded. Please free up space.';
        } else if (e.message && e.message.includes('size')) {
            errorMessage = 'Project data too large. Please reduce image size.';
        }
        return jsonError(500, errorMessage, { message: e.message || 'Unknown error' });
    }
});

// List Projects
router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const allProjects = await userPuter.kv.list(PROJECT_PREFIX, true);
        
        const projects = allProjects
            .map(({ value }) => value)
            .filter(project => project.ownerId === userId)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return jsonSuccess({ projects });
    } catch (e) {
        console.error('List projects error:', e);
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
});

// Get Single Project
router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');

        if (project.ownerId !== userId && !project.isPublic) {
            return jsonError(403, 'Access denied');
        }

        return jsonSuccess({ project });
    } catch (e) {
        console.error('Get project error:', e);
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
});

// Rename Project
router.post('/api/projects/rename', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const { id, name } = body;

        if (!id) return jsonError(400, 'Project ID is required');
        if (!name || !name.trim()) return jsonError(400, 'Project name is required');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');
        if (project.ownerId !== userId) return jsonError(403, 'Access denied');

        project.name = name.trim();
        project.updatedAt = new Date().toISOString();

        await userPuter.kv.set(key, project);

        return jsonSuccess({ renamed: true, project });
    } catch (e) {
        console.error('Rename error:', e);
        return jsonError(500, 'Failed to rename project', { message: e.message || 'Unknown error' });
    }
});

// Delete Project
router.post('/api/projects/delete', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const id = body.id;

        if (!id) return jsonError(400, 'Project ID is required');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');
        if (project.ownerId !== userId) return jsonError(403, 'Access denied');

        await userPuter.kv.del(key);

        // Remove from recent projects
        const recentKey = `${PROJECT_PREFIX}recent_${userId}`;
        const recentProjects = (await userPuter.kv.get(recentKey)) || [];
        const updatedRecent = recentProjects.filter(pid => pid !== id);
        await userPuter.kv.set(recentKey, updatedRecent);

        // Remove from favorites
        const favKey = `${FAVORITES_PREFIX}${userId}`;
        const favorites = (await userPuter.kv.get(favKey)) || [];
        const updatedFavorites = favorites.filter(favId => favId !== id);
        await userPuter.kv.set(favKey, updatedFavorites);

        return jsonSuccess({ deleted: true });
    } catch (e) {
        console.error('Delete error:', e);
        return jsonError(500, 'Failed to delete project', { message: e.message || 'Unknown error' });
    }
});

// Toggle Favorite
router.post('/api/projects/favorite', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const { id, favorite } = body;

        if (!id) return jsonError(400, 'Project ID is required');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        // Verify project exists
        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);
        if (!project) return jsonError(404, 'Project not found');

        const favKey = `${FAVORITES_PREFIX}${userId}`;
        let favorites = (await userPuter.kv.get(favKey)) || [];

        if (favorite) {
            if (!favorites.includes(id)) {
                favorites.push(id);
            }
        } else {
            favorites = favorites.filter(favId => favId !== id);
        }

        await userPuter.kv.set(favKey, favorites);

        return jsonSuccess({ favorited: favorite, favorites });
    } catch (e) {
        console.error('Favorite error:', e);
        return jsonError(500, 'Failed to update favorite', { message: e.message || 'Unknown error' });
    }
});

// Get Favorites
router.get('/api/projects/favorites', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const favKey = `${FAVORITES_PREFIX}${userId}`;
        const favorites = (await userPuter.kv.get(favKey)) || [];

        return jsonSuccess({ favorites });
    } catch (e) {
        console.error('Get favorites error:', e);
        return jsonError(500, 'Failed to get favorites', { message: e.message || 'Unknown error' });
    }
});

// Share Project
router.post('/api/projects/share', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const { id, shareWith, isPublic } = body;

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');
        
        if (project.ownerId !== userId) {
            return jsonError(403, 'Access denied');
        }

        const updatedProject = {
            ...project,
            isPublic: isPublic || false,
            sharedAt: new Date().toISOString(),
            sharedBy: userId
        };

        await userPuter.kv.set(key, updatedProject);

        return jsonSuccess({ shared: true, id, isPublic: isPublic || false });
    } catch (e) {
        console.error('Share project error:', e);
        return jsonError(500, 'Failed to share project', { message: e.message || 'Unknown error' });
    }
});