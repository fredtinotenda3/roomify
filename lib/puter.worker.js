// FILE: C:\Users\user\Desktop\roomify\lib\puter.worker.js

const PROJECT_PREFIX = 'roomify_project_';
const FAVORITES_PREFIX = 'roomify_favorites_';

const EMAIL_PREFIX = 'roomify_email_';
const EMAIL_CAMPAIGN_PREFIX = 'roomify_email_campaign_';
const EMAIL_EVENT_PREFIX = 'roomify_email_event_';

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
// STRIPE PAYMENT ENDPOINTS - REAL IMPLEMENTATION
// ============================================

// ============================================
// STRIPE PAYMENT ENDPOINTS - WORKING VERSION
// ============================================

router.post('/api/create-checkout-session', async (context) => {
    try {
        console.log('=== CREATE CHECKOUT SESSION STARTED ===');
        
        // Get authenticated user
        let userPuter = null;
        let userId = null;
        
        if (context.user && context.user.puter) {
            userPuter = context.user.puter;
            const user = await userPuter.auth.getUser().catch(() => null);
            userId = user?.uuid || null;
            console.log('Got user from context.user:', userId);
        } else if (context.puter) {
            userPuter = context.puter;
            const user = await userPuter.auth.getUser().catch(() => null);
            userId = user?.uuid || null;
            console.log('Got user from context.puter:', userId);
        }
        
        const body = await context.request.json();
        console.log('Request body:', { ...body, email: body.email });
        
        const providedUserId = body.userId;
        const finalUserId = userId || providedUserId;
        
        if (!finalUserId) {
            console.error('No user ID found');
            return jsonError(401, 'Authentication failed - no user ID found');
        }

        const { priceId, email, planType, successUrl, cancelUrl } = body;

        if (!priceId || !finalUserId || !email) {
            console.error('Missing required params:', { priceId: !!priceId, userId: !!finalUserId, email: !!email });
            return jsonError(400, 'Missing required parameters');
        }

        // HARDCODED STRIPE SECRET KEY FOR TESTING
        // IMPORTANT: Replace with your actual test key if different
        const STRIPE_SECRET_KEY ="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";
        
        console.log('Using Stripe secret key (first 10 chars):', STRIPE_SECRET_KEY.substring(0, 10) + '...');
        console.log('Creating checkout session for:', { priceId, email, planType });

        // Create checkout session using direct Stripe API call
        const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'payment_method_types[]': 'card',
                'line_items[0][price]': priceId,
                'line_items[0][quantity]': '1',
                'mode': 'subscription',
                'success_url': successUrl,
                'cancel_url': cancelUrl,
                'client_reference_id': finalUserId,
                'customer_email': email,
                'metadata[userId]': finalUserId,
                'metadata[planType]': planType,
                'allow_promotion_codes': 'true',
            }).toString()
        });

        const stripeData = await stripeResponse.json();

        if (!stripeResponse.ok) {
            console.error('Stripe API error:', stripeData);
            return jsonError(500, `Stripe error: ${stripeData.error?.message || 'Unknown error'}`);
        }

        console.log('Stripe session created successfully:', stripeData.id);
        console.log('Checkout URL:', stripeData.url);

        // Store session info in KV for verification
        if (userPuter) {
            try {
                const sessionKey = `stripe_session_${stripeData.id}`;
                await userPuter.kv.set(sessionKey, {
                    sessionId: stripeData.id,
                    userId: finalUserId,
                    priceId,
                    planType,
                    email,
                    createdAt: new Date().toISOString(),
                    status: 'pending'
                });
                console.log('Session stored in KV');
            } catch (kvError) {
                console.error('Failed to store session in KV:', kvError);
            }
        }

        console.log('=== CHECKOUT SESSION CREATED SUCCESSFULLY ===');
        
        return jsonSuccess({ 
            sessionId: stripeData.id,
            checkoutUrl: stripeData.url
        });
        
    } catch (e) {
        console.error('Create checkout error:', e);
        console.error('Error stack:', e.stack);
        return jsonError(500, 'Failed to create checkout session', { 
            message: e.message || 'Unknown error',
            stack: e.stack 
        });
    }
});

router.get('/api/verify-payment', async (context) => {
    try {
        console.log('=== VERIFY PAYMENT STARTED ===');
        
        let userPuter = null;
        
        if (context.user && context.user.puter) {
            userPuter = context.user.puter;
        } else if (context.puter) {
            userPuter = context.puter;
        }
        
        const url = new URL(context.request.url);
        const sessionId = url.searchParams.get('session_id');

        console.log('Verifying payment for session:', sessionId);

        if (!sessionId) {
            return jsonError(400, 'Session ID required');
        }

        // Check if it's a mock session (for development)
        if (sessionId.startsWith('mock_cs_')) {
            console.log('Mock session detected, using mock verification');
            
            if (!userPuter) {
                return jsonSuccess({ verified: true });
            }
            
            try {
                const pendingKey = `pending_subscription_${sessionId}`;
                const pending = await userPuter.kv.get(pendingKey);
                
                if (pending) {
                    const statsKey = `roomify_usage_${pending.userId}`;
                    let stats = await userPuter.kv.get(statsKey);
                    
                    if (stats) {
                        stats.isPremium = true;
                        stats.subscriptionType = pending.planType || 'monthly';
                        const endDate = new Date();
                        if (stats.subscriptionType === 'yearly') {
                            endDate.setDate(endDate.getDate() + 365);
                        } else {
                            endDate.setDate(endDate.getDate() + 30);
                        }
                        stats.subscriptionEndDate = endDate.toISOString();
                        await userPuter.kv.set(statsKey, stats);
                        console.log('Premium activated for user via mock:', pending.userId);
                    }
                    await userPuter.kv.del(pendingKey);
                }
            } catch (kvError) {
                console.error('KV error during mock verification:', kvError);
            }
            
            return jsonSuccess({ verified: true });
        }

        // HARDCODED STRIPE SECRET KEY FOR TESTING
        const STRIPE_SECRET_KEY ="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";
        
        if (!STRIPE_SECRET_KEY) {
            console.error('STRIPE_SECRET_KEY not configured');
            return jsonError(500, 'Payment verification not configured');
        }

        // Retrieve session from Stripe API
        const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            }
        });

        const session = await stripeResponse.json();

        if (!stripeResponse.ok) {
            console.error('Stripe API error:', session);
            return jsonError(500, `Stripe error: ${session.error?.message || 'Unknown error'}`);
        }
        
        console.log('Session status:', session.payment_status, session.status);
        
        const isVerified = session.payment_status === 'paid';
        
        if (isVerified && session.client_reference_id && userPuter) {
            // Activate premium for the user
            const userId = session.client_reference_id;
            console.log('Activating premium for user:', userId);
            
            const statsKey = `roomify_usage_${userId}`;
            let stats = await userPuter.kv.get(statsKey);
            
            const planType = session.metadata?.planType || 'monthly';
            
            if (stats) {
                stats.isPremium = true;
                stats.subscriptionType = planType;
                const endDate = new Date();
                if (planType === 'yearly') {
                    endDate.setDate(endDate.getDate() + 365);
                } else {
                    endDate.setDate(endDate.getDate() + 30);
                }
                stats.subscriptionEndDate = endDate.toISOString();
                stats.stripeCustomerId = session.customer;
                stats.stripeSubscriptionId = session.subscription;
                await userPuter.kv.set(statsKey, stats);
                console.log('Premium activated for existing user:', userId);
            } else {
                const newStats = {
                    renderCount: 0,
                    exportCount: 0,
                    pdfExportCount: 0,
                    lastResetDate: new Date().toISOString(),
                    isPremium: true,
                    subscriptionType: planType,
                    subscriptionEndDate: new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription
                };
                await userPuter.kv.set(statsKey, newStats);
                console.log('Created new premium stats for user:', userId);
            }

            // Clean up session record
            const sessionKey = `stripe_session_${sessionId}`;
            await userPuter.kv.del(sessionKey).catch(() => {});
        }

        console.log('=== VERIFY PAYMENT COMPLETED ===');
        
        return jsonSuccess({ verified: isVerified });
        
    } catch (e) {
        console.error('Verify payment error:', e);
        console.error('Error stack:', e.stack);
        return jsonError(500, 'Failed to verify payment', { 
            message: e.message || 'Unknown error' 
        });
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


// Subscribe email
router.post('/api/email/subscribe', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const body = await request.json();
        const { email, source, name, metadata } = body;

        if (!email || !email.includes('@')) {
            return jsonError(400, 'Invalid email address');
        }

        const userId = await getUserId(userPuter);
        const emailKey = `${EMAIL_PREFIX}${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Check if already subscribed
        let subscriber = await userPuter.kv.get(emailKey);
        
        if (subscriber && subscriber.status === 'active') {
            return jsonSuccess({ alreadySubscribed: true, email });
        }

        const newSubscriber = {
            email,
            userId: userId || undefined,
            name: name || null,
            source: source || 'unknown',
            status: 'active',
            subscribedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            metadata: metadata || {}
        };

        await userPuter.kv.set(emailKey, newSubscriber);
        
        // Also add to master list
        const masterKey = 'roomify_email_master_list';
        let masterList = (await userPuter.kv.get(masterKey)) || [];
        if (!masterList.includes(email)) {
            masterList.push(email);
            await userPuter.kv.set(masterKey, masterList);
        }

        return jsonSuccess({ subscribed: true, email });
    } catch (e) {
        console.error('Subscribe error:', e);
        return jsonError(500, 'Failed to subscribe email', { message: e.message || 'Unknown error' });
    }
});

// Unsubscribe email
router.post('/api/email/unsubscribe', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return jsonError(400, 'Email required');
        }

        const emailKey = `${EMAIL_PREFIX}${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let subscriber = await userPuter.kv.get(emailKey);
        
        if (subscriber) {
            subscriber.status = 'unsubscribed';
            subscriber.unsubscribedAt = new Date().toISOString();
            await userPuter.kv.set(emailKey, subscriber);
        }

        return jsonSuccess({ unsubscribed: true });
    } catch (e) {
        console.error('Unsubscribe error:', e);
        return jsonError(500, 'Failed to unsubscribe', { message: e.message || 'Unknown error' });
    }
});

// Get all subscribers (admin only)
router.get('/api/email/subscribers', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        // Admin check
        const adminUserIds = [
            'd3f0e995-9422-43cc-8fd8-8ad83cc463c3',
        ];
        const isAdmin = currentUser?.username === 'admin' || adminUserIds.includes(currentUserId);
        
        if (!isAdmin) {
            return jsonError(403, 'Admin access required');
        }

        const masterKey = 'roomify_email_master_list';
        const masterList = (await userPuter.kv.get(masterKey)) || [];
        
        const subscribers = [];
        for (const email of masterList) {
            const emailKey = `${EMAIL_PREFIX}${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const subscriber = await userPuter.kv.get(emailKey);
            if (subscriber) {
                subscribers.push(subscriber);
            }
        }

        return jsonSuccess({ subscribers });
    } catch (e) {
        console.error('Get subscribers error:', e);
        return jsonError(500, 'Failed to get subscribers', { message: e.message || 'Unknown error' });
    }
});

// Create email campaign (admin only)
router.post('/api/email/campaigns/create', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const adminUserIds = [
            'd3f0e995-9422-43cc-8fd8-8ad83cc463c3',
        ];
        const isAdmin = currentUser?.username === 'admin' || adminUserIds.includes(currentUserId);
        
        if (!isAdmin) {
            return jsonError(403, 'Admin access required');
        }

        const body = await request.json();
        const { name, subject, content, status, scheduledFor } = body;

        if (!name || !subject || !content) {
            return jsonError(400, 'Name, subject, and content required');
        }

        const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const campaignKey = `${EMAIL_CAMPAIGN_PREFIX}${campaignId}`;
        
        const campaign = {
            id: campaignId,
            name,
            subject,
            content,
            status: status || 'draft',
            scheduledFor: scheduledFor || null,
            createdAt: new Date().toISOString(),
            recipientCount: 0,
            openCount: 0,
            clickCount: 0
        };

        await userPuter.kv.set(campaignKey, campaign);

        return jsonSuccess({ campaign });
    } catch (e) {
        console.error('Create campaign error:', e);
        return jsonError(500, 'Failed to create campaign', { message: e.message || 'Unknown error' });
    }
});

// Get all campaigns (admin only)
router.get('/api/email/campaigns', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const adminUserIds = [
            'd3f0e995-9422-43cc-8fd8-8ad83cc463c3',
        ];
        const isAdmin = currentUser?.username === 'admin' || adminUserIds.includes(currentUserId);
        
        if (!isAdmin) {
            return jsonError(403, 'Admin access required');
        }

        const allCampaigns = await userPuter.kv.list(EMAIL_CAMPAIGN_PREFIX, true);
        const campaigns = allCampaigns.map(({ value }) => value).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return jsonSuccess({ campaigns });
    } catch (e) {
        console.error('Get campaigns error:', e);
        return jsonError(500, 'Failed to get campaigns', { message: e.message || 'Unknown error' });
    }
});

// Send campaign (admin only)
router.post('/api/email/campaigns/send', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const adminUserIds = [
            'd3f0e995-9422-43cc-8fd8-8ad83cc463c3',
        ];
        const isAdmin = currentUser?.username === 'admin' || adminUserIds.includes(currentUserId);
        
        if (!isAdmin) {
            return jsonError(403, 'Admin access required');
        }

        const body = await request.json();
        const { campaignId } = body;

        if (!campaignId) {
            return jsonError(400, 'Campaign ID required');
        }

        const campaignKey = `${EMAIL_CAMPAIGN_PREFIX}${campaignId}`;
        const campaign = await userPuter.kv.get(campaignKey);
        
        if (!campaign) {
            return jsonError(404, 'Campaign not found');
        }

        // Get all active subscribers
        const masterKey = 'roomify_email_master_list';
        const masterList = (await userPuter.kv.get(masterKey)) || [];
        
        const recipients = [];
        for (const email of masterList) {
            const emailKey = `${EMAIL_PREFIX}${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const subscriber = await userPuter.kv.get(emailKey);
            if (subscriber && subscriber.status === 'active') {
                recipients.push(subscriber);
            }
        }

        campaign.status = 'sent';
        campaign.sentAt = new Date().toISOString();
        campaign.recipientCount = recipients.length;
        await userPuter.kv.set(campaignKey, campaign);

        // In production, you would integrate with an email service like SendGrid, Resend, etc.
        // For now, just log the emails that would be sent
        console.log(`Campaign "${campaign.name}" would be sent to ${recipients.length} recipients`);
        
        // Track send events
        for (const recipient of recipients) {
            const eventKey = `${EMAIL_EVENT_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            await userPuter.kv.set(eventKey, {
                id: eventKey,
                campaignId,
                email: recipient.email,
                eventType: 'sent',
                timestamp: new Date().toISOString()
            });
        }

        return jsonSuccess({ 
            sent: true, 
            recipientCount: recipients.length,
            message: `Campaign would be sent to ${recipients.length} recipients. Integrate with SendGrid/Resend for actual sending.`
        });
    } catch (e) {
        console.error('Send campaign error:', e);
        return jsonError(500, 'Failed to send campaign', { message: e.message || 'Unknown error' });
    }
});

// Track email event (for email service webhooks)
router.post('/api/email/track', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const body = await request.json();
        const { campaignId, email, eventType, metadata } = body;

        if (!campaignId || !email || !eventType) {
            return jsonError(400, 'Campaign ID, email, and eventType required');
        }

        const eventKey = `${EMAIL_EVENT_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const event = {
            id: eventKey,
            campaignId,
            email,
            eventType,
            timestamp: new Date().toISOString(),
            metadata: metadata || {}
        };

        await userPuter.kv.set(eventKey, event);

        // Update campaign stats
        const campaignKey = `${EMAIL_CAMPAIGN_PREFIX}${campaignId}`;
        const campaign = await userPuter.kv.get(campaignKey);
        
        if (campaign) {
            if (eventType === 'opened') {
                campaign.openCount = (campaign.openCount || 0) + 1;
            } else if (eventType === 'clicked') {
                campaign.clickCount = (campaign.clickCount || 0) + 1;
            }
            await userPuter.kv.set(campaignKey, campaign);
        }

        return jsonSuccess({ tracked: true });
    } catch (e) {
        console.error('Track email event error:', e);
        return jsonError(500, 'Failed to track event', { message: e.message || 'Unknown error' });
    }
});

;