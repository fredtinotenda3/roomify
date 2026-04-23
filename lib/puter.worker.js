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

// Generate share token
function generateShareToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

function getBaseUrl() {
    return process.env.BASE_URL || 'https://roomify.app';
}

// USAGE LIMITS (Server-side enforcement)
const USAGE_LIMITS = {
    FREE_RENDERS: 3,
    FREE_EXPORTS: 5,
    FREE_PDF_EXPORTS: 2,
    PREMIUM_STYLES: ['industrial', 'scandinavian'],
    PREMIUM_PRESETS: ['luxury', 'traditional']
};

// Helper to get user usage stats
const getUserUsageStats = async (userPuter, userId) => {
    const key = `roomify_usage_${userId}`;
    let stats = await userPuter.kv.get(key);
    
    if (!stats) {
        stats = {
            renderCount: 0,
            exportCount: 0,
            pdfExportCount: 0,
            lastResetDate: new Date().toISOString(),
            isPremium: false
        };
        await userPuter.kv.set(key, stats);
    }
    
    // Check for monthly reset
    const lastReset = new Date(stats.lastResetDate);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
    
    if (monthsDiff >= 1 && !stats.isPremium) {
        stats.renderCount = 0;
        stats.exportCount = 0;
        stats.pdfExportCount = 0;
        stats.lastResetDate = now.toISOString();
        await userPuter.kv.set(key, stats);
    }
    
    return stats;
};

// Server-side validation functions
const validateRenderLimit = async (userPuter, userId, stats) => {
    if (stats.isPremium) return { allowed: true };
    
    if (stats.renderCount >= USAGE_LIMITS.FREE_RENDERS) {
        return { 
            allowed: false, 
            error: `RENDER_LIMIT_EXCEEDED: You've used all ${USAGE_LIMITS.FREE_RENDERS} free renders. Upgrade to Pro.`
        };
    }
    
    return { allowed: true };
};

const validateExportLimit = async (userPuter, userId, stats) => {
    if (stats.isPremium) return { allowed: true };
    
    if (stats.exportCount >= USAGE_LIMITS.FREE_EXPORTS) {
        return { 
            allowed: false, 
            error: `EXPORT_LIMIT_EXCEEDED: You've used all ${USAGE_LIMITS.FREE_EXPORTS} free exports. Upgrade to Pro.`
        };
    }
    
    return { allowed: true };
};

const validatePDFExportLimit = async (userPuter, userId, stats) => {
    if (stats.isPremium) return { allowed: true };
    
    if (stats.pdfExportCount >= USAGE_LIMITS.FREE_PDF_EXPORTS) {
        return { 
            allowed: false, 
            error: `PDF_LIMIT_EXCEEDED: You've used all ${USAGE_LIMITS.FREE_PDF_EXPORTS} free PDF exports. Upgrade to Pro.`
        };
    }
    
    return { allowed: true };
};

// Save Project with validation
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

        // Get user usage stats for validation
        const stats = await getUserUsageStats(userPuter, userId);
        
        // Validate render limit if this is a new render
        if (project.renderedImage && !project.renderedImage.includes('watermark')) {
            const renderValidation = await validateRenderLimit(userPuter, userId, stats);
            if (!renderValidation.allowed) {
                return jsonError(403, renderValidation.error);
            }
        }

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

// Get Single Project (with premium validation)
router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const token = url.searchParams.get('token');

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');

        const isPublicAccess = token && project.shareToken === token;
        const userId = await getUserId(userPuter);
        const isOwner = userId && project.ownerId === userId;

        if (!isOwner && !project.isPublic && !isPublicAccess) {
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

        // Remove from public index
        const publicIndexKey = 'roomify_public_projects';
        let publicProjects = (await userPuter.kv.get(publicIndexKey)) || [];
        publicProjects = publicProjects.filter(pid => pid !== id);
        await userPuter.kv.set(publicIndexKey, publicProjects);

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

// Share Project (Make Public)
router.post('/api/projects/share', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const { id, isPublic } = body;

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');
        if (project.ownerId !== userId) return jsonError(403, 'Access denied');

        let shareToken = project.shareToken;
        if (isPublic && !shareToken) {
            shareToken = generateShareToken();
        }

        const updatedProject = {
            ...project,
            isPublic: isPublic || false,
            shareToken: isPublic ? shareToken : null,
            sharedAt: isPublic ? new Date().toISOString() : null,
            sharedBy: isPublic ? userId : null
        };

        await userPuter.kv.set(key, updatedProject);

        if (isPublic) {
            const publicIndexKey = 'roomify_public_projects';
            let publicProjects = (await userPuter.kv.get(publicIndexKey)) || [];
            if (!publicProjects.includes(id)) {
                publicProjects.unshift(id);
                if (publicProjects.length > 1000) publicProjects = publicProjects.slice(0, 1000);
                await userPuter.kv.set(publicIndexKey, publicProjects);
            }
        } else {
            const publicIndexKey = 'roomify_public_projects';
            let publicProjects = (await userPuter.kv.get(publicIndexKey)) || [];
            publicProjects = publicProjects.filter(pid => pid !== id);
            await userPuter.kv.set(publicIndexKey, publicProjects);
        }

        const shareUrl = isPublic ? `${getBaseUrl()}/visualizer/${id}?share=${shareToken}` : null;

        return jsonSuccess({ 
            shared: true, 
            id, 
            isPublic: isPublic || false,
            shareUrl,
            shareToken
        });
    } catch (e) {
        console.error('Share project error:', e);
        return jsonError(500, 'Failed to share project', { message: e.message || 'Unknown error' });
    }
});

// Get Public Gallery
router.get('/api/projects/gallery', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const sortBy = url.searchParams.get('sortBy') || 'recent';
        const style = url.searchParams.get('style');
        const preset = url.searchParams.get('preset');
        const search = url.searchParams.get('search');

        const publicIndexKey = 'roomify_public_projects';
        let publicProjectIds = (await userPuter.kv.get(publicIndexKey)) || [];

        let projects = [];
        for (const id of publicProjectIds) {
            const key = `${PROJECT_PREFIX}${id}`;
            const project = await userPuter.kv.get(key);
            if (project && project.isPublic) {
                projects.push(project);
            }
        }

        if (style) {
            projects = projects.filter(p => p.style === style);
        }
        if (preset) {
            projects = projects.filter(p => p.preset === preset);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            projects = projects.filter(p => 
                p.name?.toLowerCase().includes(searchLower) ||
                p.id.toLowerCase().includes(searchLower)
            );
        }

        if (sortBy === 'recent') {
            projects.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } else if (sortBy === 'popular') {
            projects.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        } else if (sortBy === 'mostLiked') {
            projects.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        }

        const total = projects.length;
        const paginated = projects.slice(offset, offset + limit);

        return jsonSuccess({ 
            projects: paginated,
            total,
            limit,
            offset
        });
    } catch (e) {
        console.error('Get gallery error:', e);
        return jsonError(500, 'Failed to get gallery', { message: e.message || 'Unknown error' });
    }
});

// Increment Project View Count
router.post('/api/projects/view', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const body = await request.json();
        const { id } = body;

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');

        project.viewCount = (project.viewCount || 0) + 1;
        await userPuter.kv.set(key, project);

        return jsonSuccess({ viewed: true, viewCount: project.viewCount });
    } catch (e) {
        console.error('View increment error:', e);
        return jsonError(500, 'Failed to increment view', { message: e.message || 'Unknown error' });
    }
});

// Like/Unlike Project
router.post('/api/projects/like', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const userId = await getUserId(userPuter);
        
        const body = await request.json();
        const { id, like } = body;

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');

        const likesKey = `roomify_likes_${id}`;
        let likes = (await userPuter.kv.get(likesKey)) || [];

        if (like && !likes.includes(userId)) {
            likes.push(userId);
            project.likeCount = (project.likeCount || 0) + 1;
        } else if (!like && likes.includes(userId)) {
            likes = likes.filter(uid => uid !== userId);
            project.likeCount = Math.max(0, (project.likeCount || 0) - 1);
        }

        await userPuter.kv.set(likesKey, likes);
        await userPuter.kv.set(key, project);

        return jsonSuccess({ liked: like, likeCount: project.likeCount });
    } catch (e) {
        console.error('Like error:', e);
        return jsonError(500, 'Failed to update like', { message: e.message || 'Unknown error' });
    }
});

// ============================================
// USAGE VALIDATION ENDPOINTS
// ============================================

// Validate Render Limit Endpoint
router.post('/api/validate/render', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validateRenderLimit(userPuter, userId, stats);

        if (!validation.allowed) {
            return jsonError(403, validation.error);
        }

        return jsonSuccess({ 
            allowed: true, 
            remaining: USAGE_LIMITS.FREE_RENDERS - stats.renderCount,
            isPremium: stats.isPremium
        });
    } catch (e) {
        return jsonError(500, 'Validation failed', { message: e.message || 'Unknown error' });
    }
});

// Increment Render Count Endpoint
router.post('/api/usage/increment/render', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validateRenderLimit(userPuter, userId, stats);

        if (!validation.allowed) {
            return jsonError(403, validation.error);
        }

        if (!stats.isPremium) {
            stats.renderCount++;
            const key = `roomify_usage_${userId}`;
            await userPuter.kv.set(key, stats);
        }

        return jsonSuccess({ 
            success: true, 
            count: stats.renderCount,
            remaining: USAGE_LIMITS.FREE_RENDERS - stats.renderCount,
            isPremium: stats.isPremium
        });
    } catch (e) {
        return jsonError(500, 'Failed to increment render count', { message: e.message || 'Unknown error' });
    }
});

// Increment Export Count Endpoint
router.post('/api/usage/increment/export', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validateExportLimit(userPuter, userId, stats);

        if (!validation.allowed) {
            return jsonError(403, validation.error);
        }

        if (!stats.isPremium) {
            stats.exportCount++;
            const key = `roomify_usage_${userId}`;
            await userPuter.kv.set(key, stats);
        }

        return jsonSuccess({ 
            success: true, 
            count: stats.exportCount,
            remaining: USAGE_LIMITS.FREE_EXPORTS - stats.exportCount,
            isPremium: stats.isPremium
        });
    } catch (e) {
        return jsonError(500, 'Failed to increment export count', { message: e.message || 'Unknown error' });
    }
});

// Increment PDF Export Count Endpoint
router.post('/api/usage/increment/pdf', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validatePDFExportLimit(userPuter, userId, stats);

        if (!validation.allowed) {
            return jsonError(403, validation.error);
        }

        if (!stats.isPremium) {
            stats.pdfExportCount++;
            const key = `roomify_usage_${userId}`;
            await userPuter.kv.set(key, stats);
        }

        return jsonSuccess({ 
            success: true, 
            count: stats.pdfExportCount,
            remaining: USAGE_LIMITS.FREE_PDF_EXPORTS - stats.pdfExportCount,
            isPremium: stats.isPremium
        });
    } catch (e) {
        return jsonError(500, 'Failed to increment PDF export count', { message: e.message || 'Unknown error' });
    }
});

// Get Usage Stats Endpoint
router.get('/api/usage/stats', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);

        return jsonSuccess({
            rendersUsed: stats.renderCount,
            rendersRemaining: stats.isPremium ? Infinity : Math.max(0, USAGE_LIMITS.FREE_RENDERS - stats.renderCount),
            exportsUsed: stats.exportCount,
            exportsRemaining: stats.isPremium ? Infinity : Math.max(0, USAGE_LIMITS.FREE_EXPORTS - stats.exportCount),
            pdfsUsed: stats.pdfExportCount,
            pdfsRemaining: stats.isPremium ? Infinity : Math.max(0, USAGE_LIMITS.FREE_PDF_EXPORTS - stats.pdfExportCount),
            isPremium: stats.isPremium,
            subscriptionType: stats.subscriptionType,
            subscriptionEndDate: stats.subscriptionEndDate
        });
    } catch (e) {
        return jsonError(500, 'Failed to get usage stats', { message: e.message || 'Unknown error' });
    }
});

// ============================================
// STRIPE PAYMENT ENDPOINTS
// ============================================

// Create checkout session
router.post('/api/create-checkout-session', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const { priceId, userId, email, successUrl, cancelUrl } = body;

        if (!priceId || !userId || !email) {
            return jsonError(400, 'Missing required parameters');
        }

        const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        const pendingKey = `pending_subscription_${sessionId}`;
        await userPuter.kv.set(pendingKey, {
            userId,
            priceId,
            email,
            createdAt: new Date().toISOString(),
            status: 'pending'
        });

        return jsonSuccess({ 
            sessionId,
            checkoutUrl: `${successUrl}?session_id=${sessionId}`
        });
    } catch (e) {
        console.error('Create checkout error:', e);
        return jsonError(500, 'Failed to create checkout session');
    }
});

// Verify payment
router.get('/api/verify-payment', async ({ request, user }) => {
    try {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('session_id');

        if (!sessionId) {
            return jsonError(400, 'Session ID required');
        }

        const pendingKey = `pending_subscription_${sessionId}`;
        const pending = await userPuter.kv.get(pendingKey);

        if (!pending) {
            return jsonError(404, 'Session not found');
        }

        const isVerified = true;

        if (isVerified) {
            const statsKey = `roomify_usage_${pending.userId}`;
            let stats = await userPuter.kv.get(statsKey);
            
            if (stats) {
                stats.isPremium = true;
                stats.subscriptionType = pending.priceId?.includes('yearly') ? 'yearly' : 'monthly';
                stats.subscriptionEndDate = new Date();
                if (stats.subscriptionType === 'yearly') {
                    stats.subscriptionEndDate.setDate(stats.subscriptionEndDate.getDate() + 365);
                } else {
                    stats.subscriptionEndDate.setDate(stats.subscriptionEndDate.getDate() + 30);
                }
                stats.subscriptionEndDate = stats.subscriptionEndDate.toISOString();
                await userPuter.kv.set(statsKey, stats);
            }

            await userPuter.kv.del(pendingKey);

            return jsonSuccess({ verified: true });
        }

        return jsonSuccess({ verified: false });
    } catch (e) {
        console.error('Verify payment error:', e);
        return jsonError(500, 'Failed to verify payment');
    }
});

// Stripe webhook endpoint
router.post('/api/stripe/webhook', async ({ request, user }) => {
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        const event = JSON.parse(body);
        
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const priceId = session.line_items?.data[0]?.price?.id;
            
            const statsKey = `roomify_usage_${userId}`;
            let stats = await userPuter.kv.get(statsKey);
            
            if (stats) {
                stats.isPremium = true;
                stats.subscriptionType = priceId?.includes('yearly') ? 'yearly' : 'monthly';
                stats.subscriptionEndDate = new Date();
                if (stats.subscriptionType === 'yearly') {
                    stats.subscriptionEndDate.setDate(stats.subscriptionEndDate.getDate() + 365);
                } else {
                    stats.subscriptionEndDate.setDate(stats.subscriptionEndDate.getDate() + 30);
                }
                stats.subscriptionEndDate = stats.subscriptionEndDate.toISOString();
                await userPuter.kv.set(statsKey, stats);
            }
        }

        return jsonSuccess({ received: true });
    } catch (e) {
        console.error('Webhook error:', e);
        return jsonError(500, 'Webhook processing failed');
    }
});

// ============================================
// ANALYTICS STORAGE ENDPOINTS
// ============================================

const ANALYTICS_PREFIX = 'roomify_analytics_';
const ANALYTICS_SESSION_PREFIX = 'roomify_analytics_session_';
const ANALYTICS_USER_PREFIX = 'roomify_analytics_user_';

// Track single event
router.post('/api/analytics/track', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const body = await request.json();
        const event = body;
        
        if (!event || !event.id || !event.name) {
            return jsonError(400, 'Invalid event data');
        }
        
        const userId = event.userId || await getUserId(userPuter);
        
        // Store event in KV
        const eventKey = `${ANALYTICS_PREFIX}${event.id}`;
        await userPuter.kv.set(eventKey, event);
        
        // Add to user's event list
        if (userId) {
            const userEventsKey = `${ANALYTICS_USER_PREFIX}${userId}`;
            let userEvents = (await userPuter.kv.get(userEventsKey)) || [];
            if (!userEvents.includes(event.id)) {
                userEvents.push(event.id);
                if (userEvents.length > 1000) {
                    userEvents = userEvents.slice(-1000);
                }
                await userPuter.kv.set(userEventsKey, userEvents);
            }
        }
        
        // Add to session's event list
        if (event.sessionId) {
            const sessionEventsKey = `${ANALYTICS_SESSION_PREFIX}${event.sessionId}`;
            let sessionEvents = (await userPuter.kv.get(sessionEventsKey)) || [];
            if (!sessionEvents.includes(event.id)) {
                sessionEvents.push(event.id);
                await userPuter.kv.set(sessionEventsKey, sessionEvents);
            }
        }
        
        return jsonSuccess({ tracked: true, id: event.id });
    } catch (e) {
        console.error('Analytics track error:', e);
        return jsonError(500, 'Failed to track event', { message: e.message || 'Unknown error' });
    }
});

// Batch track events
router.post('/api/analytics/batch', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const body = await request.json();
        const { events } = body;
        
        if (!events || !Array.isArray(events) || events.length === 0) {
            return jsonError(400, 'Invalid batch events data');
        }
        
        const userId = await getUserId(userPuter);
        const trackedIds = [];
        
        for (const event of events) {
            const eventKey = `${ANALYTICS_PREFIX}${event.id}`;
            await userPuter.kv.set(eventKey, event);
            trackedIds.push(event.id);
            
            // Add to user's event list
            if (userId) {
                const userEventsKey = `${ANALYTICS_USER_PREFIX}${userId}`;
                let userEvents = (await userPuter.kv.get(userEventsKey)) || [];
                if (!userEvents.includes(event.id)) {
                    userEvents.push(event.id);
                    if (userEvents.length > 1000) {
                        userEvents = userEvents.slice(-1000);
                    }
                    await userPuter.kv.set(userEventsKey, userEvents);
                }
            }
            
            // Add to session's event list
            if (event.sessionId) {
                const sessionEventsKey = `${ANALYTICS_SESSION_PREFIX}${event.sessionId}`;
                let sessionEvents = (await userPuter.kv.get(sessionEventsKey)) || [];
                if (!sessionEvents.includes(event.id)) {
                    sessionEvents.push(event.id);
                    await userPuter.kv.set(sessionEventsKey, sessionEvents);
                }
            }
        }
        
        return jsonSuccess({ tracked: true, count: trackedIds.length });
    } catch (e) {
        console.error('Analytics batch error:', e);
        return jsonError(500, 'Failed to track batch events', { message: e.message || 'Unknown error' });
    }
});

// Get user analytics
router.get('/api/analytics/user', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const url = new URL(request.url);
        const targetUserId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        
        if (!targetUserId) {
            return jsonError(400, 'User ID required');
        }
        
        const currentUserId = await getUserId(userPuter);
        
        // Only allow users to see their own analytics (or admin)
        if (currentUserId !== targetUserId) {
            return jsonError(403, 'Access denied');
        }
        
        const userEventsKey = `${ANALYTICS_USER_PREFIX}${targetUserId}`;
        const eventIds = (await userPuter.kv.get(userEventsKey)) || [];
        const limitedIds = eventIds.slice(-limit);
        
        const events = [];
        for (const id of limitedIds) {
            const eventKey = `${ANALYTICS_PREFIX}${id}`;
            const event = await userPuter.kv.get(eventKey);
            if (event) {
                events.push(event);
            }
        }
        
        return jsonSuccess({ events });
    } catch (e) {
        console.error('Get user analytics error:', e);
        return jsonError(500, 'Failed to get user analytics', { message: e.message || 'Unknown error' });
    }
});

// Get session analytics
router.get('/api/analytics/session', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('sessionId');
        
        if (!sessionId) {
            return jsonError(400, 'Session ID required');
        }
        
        const sessionEventsKey = `${ANALYTICS_SESSION_PREFIX}${sessionId}`;
        const eventIds = (await userPuter.kv.get(sessionEventsKey)) || [];
        
        const events = [];
        for (const id of eventIds) {
            const eventKey = `${ANALYTICS_PREFIX}${id}`;
            const event = await userPuter.kv.get(eventKey);
            if (event) {
                events.push(event);
            }
        }
        
        return jsonSuccess({ events, sessionId });
    } catch (e) {
        console.error('Get session analytics error:', e);
        return jsonError(500, 'Failed to get session analytics', { message: e.message || 'Unknown error' });
    }
});

// Get analytics statistics (admin only)
router.get('/api/analytics/stats', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        
        // Get user to check if admin
        const currentUser = await userPuter.auth.getUser();
        
        // Admin users - add your user ID here
        const adminUserIds = [
            'd3f0e995-9422-43cc-8fd8-8ad83cc463c3',  // Your user ID from logs
            // Add more admin user IDs as needed
        ];
        
        const isAdmin = currentUser?.username === 'admin' || adminUserIds.includes(currentUserId);
        
        if (!isAdmin) {
            return jsonError(403, 'Admin access required');
        }
        
        // Get all analytics keys
        const allKeys = await userPuter.kv.list(ANALYTICS_PREFIX, true);
        
        let totalEvents = 0;
        const eventsByType = {};
        const users = new Set();
        const sessions = new Set();
        const features = {};
        const conversions = {};
        
        for (const { value: event } of allKeys) {
            if (!event || !event.name) continue;
            
            totalEvents++;
            
            if (event.name) {
                eventsByType[event.name] = (eventsByType[event.name] || 0) + 1;
            }
            
            if (event.userId) users.add(event.userId);
            if (event.sessionId) sessions.add(event.sessionId);
            
            if (event.name === 'feature_used' && event.properties?.feature) {
                const feature = event.properties.feature;
                features[feature] = (features[feature] || 0) + 1;
            }
            
            if (event.name === 'conversion' && event.properties?.step) {
                const step = event.properties.step;
                conversions[step] = (conversions[step] || 0) + 1;
            }
        }
        
        // Get user plan distribution
        const usersByPlan = { free: 0, pro: 0 };
        for (const userId of users) {
            const usageKey = `roomify_usage_${userId}`;
            const usage = await userPuter.kv.get(usageKey);
            if (usage && usage.isPremium) {
                usersByPlan.pro++;
            } else {
                usersByPlan.free++;
            }
        }
        
        // Get top features
        const topFeatures = Object.entries(features)
            .map(([feature, count]) => ({ feature, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        return jsonSuccess({
            totalEvents,
            totalUsers: users.size,
            totalSessions: sessions.size,
            eventsByType,
            usersByPlan,
            topFeatures,
            conversionRates: conversions
        });
    } catch (e) {
        console.error('Get analytics stats error:', e);
        return jsonError(500, 'Failed to get analytics stats', { message: e.message || 'Unknown error' });
    }
});