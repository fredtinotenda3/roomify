// FILE: C:\Users\user\Desktop\roomify\lib\puter.worker.js

// Environment Variables — hardcoded for Puter edge runtime (no process.env)
const STRIPE_SECRET_KEY = globalThis.STRIPE_SECRET_KEY || '';
const BASE_URL = globalThis.BASE_URL || 'https://roomify.app';
const FREE_RENDERS_LIMIT = parseInt(globalThis.FREE_RENDERS_LIMIT || '3');
const FREE_EXPORTS_LIMIT = parseInt(globalThis.FREE_EXPORTS_LIMIT || '5');
const FREE_PDF_EXPORTS_LIMIT = parseInt(globalThis.FREE_PDF_EXPORTS_LIMIT || '2');
const PREMIUM_STYLES = (globalThis.PREMIUM_STYLES || 'industrial,scandinavian').split(',');
const PREMIUM_PRESETS = (globalThis.PREMIUM_PRESETS || 'luxury,traditional').split(',');
const ADMIN_USER_IDS = (globalThis.ADMIN_USER_IDS || 'd3f0e995-9422-43cc-8fd8-8ad83cc463c3').split(',');

// Validate critical environment variables
if (!STRIPE_SECRET_KEY) {
    console.error('⚠️  CRITICAL: STRIPE_SECRET_KEY is not set!');
    console.error('Payment functionality will not work until this is configured.');
}

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
    return BASE_URL;
}

// USAGE LIMITS (Server-side enforcement)
const USAGE_LIMITS = {
    FREE_RENDERS: FREE_RENDERS_LIMIT,
    FREE_EXPORTS: FREE_EXPORTS_LIMIT,
    FREE_PDF_EXPORTS: FREE_PDF_EXPORTS_LIMIT,
    PREMIUM_STYLES: PREMIUM_STYLES,
    PREMIUM_PRESETS: PREMIUM_PRESETS
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

        const stats = await getUserUsageStats(userPuter, userId);
        
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
                styleKeys.slice(-5).forEach(key => {
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
                presetKeys.slice(-10).forEach(key => {
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
            await userPuter.kv.set(recentKey, recentProjects.slice(0, 20));
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

        const recentKey = `${PROJECT_PREFIX}recent_${userId}`;
        const recentProjects = (await userPuter.kv.get(recentKey)) || [];
        await userPuter.kv.set(recentKey, recentProjects.filter(pid => pid !== id));

        const favKey = `${FAVORITES_PREFIX}${userId}`;
        const favorites = (await userPuter.kv.get(favKey)) || [];
        await userPuter.kv.set(favKey, favorites.filter(favId => favId !== id));

        const publicIndexKey = 'roomify_public_projects';
        let publicProjects = (await userPuter.kv.get(publicIndexKey)) || [];
        await userPuter.kv.set(publicIndexKey, publicProjects.filter(pid => pid !== id));

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
            if (!favorites.includes(id)) favorites.push(id);
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

        const publicIndexKey = 'roomify_public_projects';
        let publicProjects = (await userPuter.kv.get(publicIndexKey)) || [];

        if (isPublic) {
            if (!publicProjects.includes(id)) {
                publicProjects.unshift(id);
                if (publicProjects.length > 1000) publicProjects = publicProjects.slice(0, 1000);
                await userPuter.kv.set(publicIndexKey, publicProjects);
            }
        } else {
            await userPuter.kv.set(publicIndexKey, publicProjects.filter(pid => pid !== id));
        }

        const shareUrl = isPublic ? `${getBaseUrl()}/visualizer/${id}?share=${shareToken}` : null;

        return jsonSuccess({ shared: true, id, isPublic: isPublic || false, shareUrl, shareToken });
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
        const publicProjectIds = (await userPuter.kv.get(publicIndexKey)) || [];

        let projects = [];
        for (const id of publicProjectIds) {
            const project = await userPuter.kv.get(`${PROJECT_PREFIX}${id}`);
            if (project && project.isPublic) projects.push(project);
        }

        if (style) projects = projects.filter(p => p.style === style);
        if (preset) projects = projects.filter(p => p.preset === preset);
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

        return jsonSuccess({ 
            projects: projects.slice(offset, offset + limit),
            total: projects.length,
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
        const { id } = await request.json();

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
        const { id, like } = await request.json();

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

router.post('/api/validate/render', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validateRenderLimit(userPuter, userId, stats);

        if (!validation.allowed) return jsonError(403, validation.error);

        return jsonSuccess({ 
            allowed: true, 
            remaining: USAGE_LIMITS.FREE_RENDERS - stats.renderCount,
            isPremium: stats.isPremium
        });
    } catch (e) {
        return jsonError(500, 'Validation failed', { message: e.message || 'Unknown error' });
    }
});

router.post('/api/usage/increment/render', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validateRenderLimit(userPuter, userId, stats);
        if (!validation.allowed) return jsonError(403, validation.error);

        if (!stats.isPremium) {
            stats.renderCount++;
            await userPuter.kv.set(`roomify_usage_${userId}`, stats);
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

router.post('/api/usage/increment/export', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validateExportLimit(userPuter, userId, stats);
        if (!validation.allowed) return jsonError(403, validation.error);

        if (!stats.isPremium) {
            stats.exportCount++;
            await userPuter.kv.set(`roomify_usage_${userId}`, stats);
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

router.post('/api/usage/increment/pdf', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const stats = await getUserUsageStats(userPuter, userId);
        const validation = await validatePDFExportLimit(userPuter, userId, stats);
        if (!validation.allowed) return jsonError(403, validation.error);

        if (!stats.isPremium) {
            stats.pdfExportCount++;
            await userPuter.kv.set(`roomify_usage_${userId}`, stats);
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

router.post('/api/create-checkout-session', async (context) => {
    try {
        if (!STRIPE_SECRET_KEY) {
            console.error('STRIPE_SECRET_KEY not configured');
            return jsonError(500, 'Payment system not configured');
        }

        console.log('=== CREATE CHECKOUT SESSION STARTED ===');
        
        let userPuter = null;
        let userId = null;
        
        if (context.user && context.user.puter) {
            userPuter = context.user.puter;
            const user = await userPuter.auth.getUser().catch(() => null);
            userId = user?.uuid || null;
        } else if (context.puter) {
            userPuter = context.puter;
            const user = await userPuter.auth.getUser().catch(() => null);
            userId = user?.uuid || null;
        }
        
        const body = await context.request.json();
        const providedUserId = body.userId;
        const finalUserId = userId || providedUserId;
        
        if (!finalUserId) {
            return jsonError(401, 'Authentication failed - no user ID found');
        }

        const { priceId, email, planType, successUrl, cancelUrl } = body;

        if (!priceId || !finalUserId || !email) {
            return jsonError(400, 'Missing required parameters');
        }

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

        if (userPuter) {
            try {
                await userPuter.kv.set(`stripe_session_${stripeData.id}`, {
                    sessionId: stripeData.id,
                    userId: finalUserId,
                    priceId,
                    planType,
                    email,
                    createdAt: new Date().toISOString(),
                    status: 'pending'
                });
            } catch (kvError) {
                console.error('Failed to store session in KV:', kvError);
            }
        }

        console.log('=== CHECKOUT SESSION CREATED SUCCESSFULLY ===');
        return jsonSuccess({ sessionId: stripeData.id, checkoutUrl: stripeData.url });
        
    } catch (e) {
        console.error('Create checkout error:', e);
        return jsonError(500, 'Failed to create checkout session', { message: e.message || 'Unknown error' });
    }
});

router.get('/api/verify-payment', async (context) => {
    try {
        if (!STRIPE_SECRET_KEY) {
            return jsonError(500, 'Payment verification not configured');
        }

        let userPuter = null;
        if (context.user && context.user.puter) {
            userPuter = context.user.puter;
        } else if (context.puter) {
            userPuter = context.puter;
        }
        
        const url = new URL(context.request.url);
        const sessionId = url.searchParams.get('session_id');

        if (!sessionId) return jsonError(400, 'Session ID required');

        // Mock session handling (dev)
        if (sessionId.startsWith('mock_cs_')) {
            if (userPuter) {
                try {
                    const pending = await userPuter.kv.get(`pending_subscription_${sessionId}`);
                    if (pending) {
                        const statsKey = `roomify_usage_${pending.userId}`;
                        let stats = await userPuter.kv.get(statsKey);
                        if (stats) {
                            stats.isPremium = true;
                            stats.subscriptionType = pending.planType || 'monthly';
                            const endDate = new Date();
                            endDate.setDate(endDate.getDate() + (stats.subscriptionType === 'yearly' ? 365 : 30));
                            stats.subscriptionEndDate = endDate.toISOString();
                            await userPuter.kv.set(statsKey, stats);
                        }
                        await userPuter.kv.del(`pending_subscription_${sessionId}`);
                    }
                } catch (kvError) {
                    console.error('KV error during mock verification:', kvError);
                }
            }
            return jsonSuccess({ verified: true });
        }

        const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
        });

        const session = await stripeResponse.json();

        if (!stripeResponse.ok) {
            return jsonError(500, `Stripe error: ${session.error?.message || 'Unknown error'}`);
        }
        
        const isVerified = session.payment_status === 'paid';
        
        if (isVerified && session.client_reference_id && userPuter) {
            const userId = session.client_reference_id;
            const statsKey = `roomify_usage_${userId}`;
            const planType = session.metadata?.planType || 'monthly';
            let stats = await userPuter.kv.get(statsKey);
            
            const endDate = new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

            if (stats) {
                stats.isPremium = true;
                stats.subscriptionType = planType;
                stats.subscriptionEndDate = endDate.toISOString();
                stats.stripeCustomerId = session.customer;
                stats.stripeSubscriptionId = session.subscription;
            } else {
                stats = {
                    renderCount: 0,
                    exportCount: 0,
                    pdfExportCount: 0,
                    lastResetDate: new Date().toISOString(),
                    isPremium: true,
                    subscriptionType: planType,
                    subscriptionEndDate: endDate.toISOString(),
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription
                };
            }
            await userPuter.kv.set(statsKey, stats);
            await userPuter.kv.del(`stripe_session_${sessionId}`).catch(() => {});
        }

        return jsonSuccess({ verified: isVerified });
        
    } catch (e) {
        console.error('Verify payment error:', e);
        return jsonError(500, 'Failed to verify payment', { message: e.message || 'Unknown error' });
    }
});

// Stripe webhook endpoint
router.post('/api/stripe/webhook', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.text();
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
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + (stats.subscriptionType === 'yearly' ? 365 : 30));
                stats.subscriptionEndDate = endDate.toISOString();
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

router.post('/api/analytics/track', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const event = await request.json();
        
        if (!event || !event.id || !event.name) {
            return jsonError(400, 'Invalid event data');
        }
        
        const userId = event.userId || await getUserId(userPuter);
        
        await userPuter.kv.set(`${ANALYTICS_PREFIX}${event.id}`, event);
        
        if (userId) {
            const userEventsKey = `${ANALYTICS_USER_PREFIX}${userId}`;
            let userEvents = (await userPuter.kv.get(userEventsKey)) || [];
            if (!userEvents.includes(event.id)) {
                userEvents.push(event.id);
                if (userEvents.length > 1000) userEvents = userEvents.slice(-1000);
                await userPuter.kv.set(userEventsKey, userEvents);
            }
        }
        
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

router.post('/api/analytics/batch', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const { events } = await request.json();
        
        if (!events || !Array.isArray(events) || events.length === 0) {
            return jsonError(400, 'Invalid batch events data');
        }
        
        const userId = await getUserId(userPuter);
        const trackedIds = [];
        
        for (const event of events) {
            await userPuter.kv.set(`${ANALYTICS_PREFIX}${event.id}`, event);
            trackedIds.push(event.id);
            
            if (userId) {
                const userEventsKey = `${ANALYTICS_USER_PREFIX}${userId}`;
                let userEvents = (await userPuter.kv.get(userEventsKey)) || [];
                if (!userEvents.includes(event.id)) {
                    userEvents.push(event.id);
                    if (userEvents.length > 1000) userEvents = userEvents.slice(-1000);
                    await userPuter.kv.set(userEventsKey, userEvents);
                }
            }
            
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

router.get('/api/analytics/user', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const url = new URL(request.url);
        const targetUserId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        
        if (!targetUserId) return jsonError(400, 'User ID required');
        
        const currentUserId = await getUserId(userPuter);
        if (currentUserId !== targetUserId) return jsonError(403, 'Access denied');
        
        const eventIds = ((await userPuter.kv.get(`${ANALYTICS_USER_PREFIX}${targetUserId}`)) || []).slice(-limit);
        
        const events = [];
        for (const id of eventIds) {
            const event = await userPuter.kv.get(`${ANALYTICS_PREFIX}${id}`);
            if (event) events.push(event);
        }
        
        return jsonSuccess({ events });
    } catch (e) {
        console.error('Get user analytics error:', e);
        return jsonError(500, 'Failed to get user analytics', { message: e.message || 'Unknown error' });
    }
});

router.get('/api/analytics/session', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('sessionId');
        
        if (!sessionId) return jsonError(400, 'Session ID required');
        
        const eventIds = (await userPuter.kv.get(`${ANALYTICS_SESSION_PREFIX}${sessionId}`)) || [];
        
        const events = [];
        for (const id of eventIds) {
            const event = await userPuter.kv.get(`${ANALYTICS_PREFIX}${id}`);
            if (event) events.push(event);
        }
        
        return jsonSuccess({ events, sessionId });
    } catch (e) {
        console.error('Get session analytics error:', e);
        return jsonError(500, 'Failed to get session analytics', { message: e.message || 'Unknown error' });
    }
});

router.get('/api/analytics/stats', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const isAdmin = currentUser?.username === 'admin' || ADMIN_USER_IDS.includes(currentUserId);
        if (!isAdmin) return jsonError(403, 'Admin access required');
        
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
            eventsByType[event.name] = (eventsByType[event.name] || 0) + 1;
            if (event.userId) users.add(event.userId);
            if (event.sessionId) sessions.add(event.sessionId);
            if (event.name === 'feature_used' && event.properties?.feature) {
                features[event.properties.feature] = (features[event.properties.feature] || 0) + 1;
            }
            if (event.name === 'conversion' && event.properties?.step) {
                conversions[event.properties.step] = (conversions[event.properties.step] || 0) + 1;
            }
        }
        
        const usersByPlan = { free: 0, pro: 0 };
        for (const uid of users) {
            const usage = await userPuter.kv.get(`roomify_usage_${uid}`);
            if (usage?.isPremium) usersByPlan.pro++; else usersByPlan.free++;
        }
        
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

// ============================================
// EMAIL ENDPOINTS
// ============================================

router.post('/api/email/subscribe', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const { email, source, name, metadata } = await request.json();

        if (!email || !email.includes('@')) return jsonError(400, 'Invalid email address');

        const userId = await getUserId(userPuter);
        const emailKey = `${EMAIL_PREFIX}${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        const subscriber = await userPuter.kv.get(emailKey);
        if (subscriber && subscriber.status === 'active') {
            return jsonSuccess({ alreadySubscribed: true, email });
        }

        await userPuter.kv.set(emailKey, {
            email,
            userId: userId || undefined,
            name: name || null,
            source: source || 'unknown',
            status: 'active',
            subscribedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            metadata: metadata || {}
        });
        
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

router.post('/api/email/unsubscribe', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const { email } = await request.json();

        if (!email) return jsonError(400, 'Email required');

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

router.get('/api/email/subscribers', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const isAdmin = currentUser?.username === 'admin' || ADMIN_USER_IDS.includes(currentUserId);
        if (!isAdmin) return jsonError(403, 'Admin access required');

        const masterList = (await userPuter.kv.get('roomify_email_master_list')) || [];
        
        const subscribers = [];
        for (const email of masterList) {
            const subscriber = await userPuter.kv.get(`${EMAIL_PREFIX}${email.replace(/[^a-zA-Z0-9]/g, '_')}`);
            if (subscriber) subscribers.push(subscriber);
        }

        return jsonSuccess({ subscribers });
    } catch (e) {
        console.error('Get subscribers error:', e);
        return jsonError(500, 'Failed to get subscribers', { message: e.message || 'Unknown error' });
    }
});

router.post('/api/email/campaigns/create', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const isAdmin = currentUser?.username === 'admin' || ADMIN_USER_IDS.includes(currentUserId);
        if (!isAdmin) return jsonError(403, 'Admin access required');

        const { name, subject, content, status, scheduledFor } = await request.json();

        if (!name || !subject || !content) return jsonError(400, 'Name, subject, and content required');

        const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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

        await userPuter.kv.set(`${EMAIL_CAMPAIGN_PREFIX}${campaignId}`, campaign);
        return jsonSuccess({ campaign });
    } catch (e) {
        console.error('Create campaign error:', e);
        return jsonError(500, 'Failed to create campaign', { message: e.message || 'Unknown error' });
    }
});

router.get('/api/email/campaigns', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const isAdmin = currentUser?.username === 'admin' || ADMIN_USER_IDS.includes(currentUserId);
        if (!isAdmin) return jsonError(403, 'Admin access required');

        const allCampaigns = await userPuter.kv.list(EMAIL_CAMPAIGN_PREFIX, true);
        const campaigns = allCampaigns
            .map(({ value }) => value)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return jsonSuccess({ campaigns });
    } catch (e) {
        console.error('Get campaigns error:', e);
        return jsonError(500, 'Failed to get campaigns', { message: e.message || 'Unknown error' });
    }
});

router.post('/api/email/campaigns/send', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const currentUserId = await getUserId(userPuter);
        const currentUser = await userPuter.auth.getUser();
        
        const isAdmin = currentUser?.username === 'admin' || ADMIN_USER_IDS.includes(currentUserId);
        if (!isAdmin) return jsonError(403, 'Admin access required');

        const { campaignId } = await request.json();
        if (!campaignId) return jsonError(400, 'Campaign ID required');

        const campaignKey = `${EMAIL_CAMPAIGN_PREFIX}${campaignId}`;
        const campaign = await userPuter.kv.get(campaignKey);
        if (!campaign) return jsonError(404, 'Campaign not found');

        const masterList = (await userPuter.kv.get('roomify_email_master_list')) || [];
        
        const recipients = [];
        for (const email of masterList) {
            const subscriber = await userPuter.kv.get(`${EMAIL_PREFIX}${email.replace(/[^a-zA-Z0-9]/g, '_')}`);
            if (subscriber && subscriber.status === 'active') recipients.push(subscriber);
        }

        campaign.status = 'sent';
        campaign.sentAt = new Date().toISOString();
        campaign.recipientCount = recipients.length;
        await userPuter.kv.set(campaignKey, campaign);

        console.log(`Campaign "${campaign.name}" would be sent to ${recipients.length} recipients`);
        
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

router.post('/api/email/track', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        const { campaignId, email, eventType, metadata } = await request.json();

        if (!campaignId || !email || !eventType) {
            return jsonError(400, 'Campaign ID, email, and eventType required');
        }

        const eventKey = `${EMAIL_EVENT_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await userPuter.kv.set(eventKey, {
            id: eventKey,
            campaignId,
            email,
            eventType,
            timestamp: new Date().toISOString(),
            metadata: metadata || {}
        });

        const campaignKey = `${EMAIL_CAMPAIGN_PREFIX}${campaignId}`;
        const campaign = await userPuter.kv.get(campaignKey);
        
        if (campaign) {
            if (eventType === 'opened') campaign.openCount = (campaign.openCount || 0) + 1;
            else if (eventType === 'clicked') campaign.clickCount = (campaign.clickCount || 0) + 1;
            await userPuter.kv.set(campaignKey, campaign);
        }

        return jsonSuccess({ tracked: true });
    } catch (e) {
        console.error('Track email event error:', e);
        return jsonError(500, 'Failed to track event', { message: e.message || 'Unknown error' });
    }
});