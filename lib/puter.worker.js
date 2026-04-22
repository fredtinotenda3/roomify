// FILE: C:\Users\user\Desktop\roomify\lib\puter.worker.js

const PROJECT_PREFIX = 'roomify_project_';

const jsonError = (status, message, extra = {}) => {
    return new Response(JSON.stringify({ error: message, ...extra }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

const jsonSuccess = (data, extra = {}) => {
    return new Response(JSON.stringify({ success: true, ...data, ...extra }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
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
    // Approximate size check - base64 strings are about 33% larger than binary
    const approximateSizeBytes = imageData.length * 0.75;
    return approximateSizeBytes > 800000; // 800KB limit to be safe
}

// Helper to truncate image data if needed
const truncateImageData = (imageData) => {
    if (!imageData || !isImageTooLarge(imageData)) return imageData;
    // For base64 images, we can't easily truncate without breaking
    // Return null instead to avoid KV errors
    console.warn('Image data too large for KV storage, skipping save');
    return null;
}

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

        // Check if rendered images are too large for KV
        const renderedImageTooLarge = isImageTooLarge(project.renderedImage);
        const renderedStylesTooLarge = project.renderedStyles && Object.values(project.renderedStyles).some(img => isImageTooLarge(img));

        // Create payload without oversized images
        const payload = {
            id: project.id,
            name: project.name || `Residence ${project.id}`,
            sourceImage: project.sourceImage,
            timestamp: project.timestamp || Date.now(),
            ownerId: project.ownerId || userId,
            isPublic: visibility === 'public',
            style: project.style || 'modern',
            updatedAt: new Date().toISOString(),
        };

        // Only include renderedImage if not too large
        if (project.renderedImage && !renderedImageTooLarge) {
            payload.renderedImage = project.renderedImage;
        }

        // Only include renderedStyles if not too large
        if (project.renderedStyles && !renderedStylesTooLarge) {
            // Limit the number of styles stored to avoid size issues
            const styleKeys = Object.keys(project.renderedStyles);
            if (styleKeys.length <= 3) {
                payload.renderedStyles = project.renderedStyles;
            } else {
                // Store only the most recent 3 styles
                const recentStyles = {};
                const lastThreeKeys = styleKeys.slice(-3);
                lastThreeKeys.forEach(key => {
                    recentStyles[key] = project.renderedStyles[key];
                });
                payload.renderedStyles = recentStyles;
            }
        }

        // Add optional fields if present and not too large
        if (project.name) payload.name = project.name;
        if (project.sharedBy) payload.sharedBy = project.sharedBy;
        if (project.sharedAt) payload.sharedAt = project.sharedAt;

        const key = `${PROJECT_PREFIX}${project.id}`;
        
        // Save to KV
        await userPuter.kv.set(key, payload);

        // Also save to a separate "recent projects" list for quick access
        const recentKey = `${PROJECT_PREFIX}recent_${userId}`;
        const recentProjects = (await userPuter.kv.get(recentKey)) || [];
        
        // Add to recent if not already there
        if (!recentProjects.includes(project.id)) {
            recentProjects.unshift(project.id);
            // Keep only last 20 recent projects
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
        
        // Provide more specific error messages
        let errorMessage = 'Failed to save project';
        if (e.message && e.message.includes('quota')) {
            errorMessage = 'Storage quota exceeded. Please free up space.';
        } else if (e.message && e.message.includes('size')) {
            errorMessage = 'Project data too large. Please reduce image size.';
        }
        
        return jsonError(500, errorMessage, { message: e.message || 'Unknown error' });
    }
});

router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        // Get all projects with the prefix
        const allProjects = await userPuter.kv.list(PROJECT_PREFIX, true);
        
        // Filter projects owned by this user and sort by timestamp
        const projects = allProjects
            .map(({ value }) => value)
            .filter(project => project.ownerId === userId)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // For public projects, we could also include shared projects here
        
        return jsonSuccess({ projects });
    } catch (e) {
        console.error('List projects error:', e);
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
});

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

        // Verify ownership (or shared access)
        if (project.ownerId !== userId && !project.isPublic) {
            return jsonError(403, 'Access denied');
        }

        return jsonSuccess({ project });
    } catch (e) {
        console.error('Get project error:', e);
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
});

router.delete('/api/projects/delete', async ({ request, user }) => {
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
        
        // Verify ownership
        if (project.ownerId !== userId) {
            return jsonError(403, 'Access denied');
        }

        await userPuter.kv.del(key);
        
        // Remove from recent projects
        const recentKey = `${PROJECT_PREFIX}recent_${userId}`;
        const recentProjects = (await userPuter.kv.get(recentKey)) || [];
        const updatedRecent = recentProjects.filter(pid => pid !== id);
        await userPuter.kv.set(recentKey, updatedRecent);

        return jsonSuccess({ deleted: true, id });
    } catch (e) {
        console.error('Delete project error:', e);
        return jsonError(500, 'Failed to delete project', { message: e.message || 'Unknown error' });
    }
});

// Optional: Endpoint to share a project
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
        
        // Verify ownership
        if (project.ownerId !== userId) {
            return jsonError(403, 'Access denied');
        }

        // Update sharing settings
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