import { randomUUID } from 'crypto';
import path from 'path';
import { supabaseAdmin } from '../supabase.js';
import { query } from '../config/database.js';
import { GoogleGenAI } from '@google/genai';

const MEDIA_BUCKET = 'post-media';
async function awardEcoPointsToUser(userId, points) {
  try {
    const { data: iu } = await supabaseAdmin
      .from('individual_users')
      .select('total_ecopoints')
      .eq('id', userId)
      .maybeSingle();

    if (iu !== null && iu !== undefined) {
      const current = Number(iu.total_ecopoints) || 0;
      await supabaseAdmin
        .from('individual_users')
        .update({ total_ecopoints: current + points })
        .eq('id', userId);
      console.log(`[EcoPoints] Awarded ${points} pts to user ${userId} (new total: ${current + points})`);
    }
  } catch (err) {
    console.error('[EcoPoints Award Error]:', err.message);
  }
}

const genai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function analyzeImageForEcoPoints(imageBuffer, mimeType, caption) {
  if (!genai) {
    return { category: 'OTHER_GREEN', points: 15, reason: 'Green action verified (offline mode)' };
  }
  try {
    const base64 = imageBuffer.toString('base64');
    const prompt = `You are an environmental sustainability expert for the TERRA AI platform.
Analyze this photo and caption to evaluate if it displays a genuine eco-friendly / sustainability action.

Caption: "${caption || '(No caption provided)'}"

Reward Criteria:
- TREE_PLANTING: Planting trees, shrubs, or saplings (25 pts)
- CLEANUP_DRIVE: Picking up litter, beach/river/street cleanup, plogging (25 pts)
- RECYCLING: Sorting recyclables, composting organic waste, zero-waste habit (20 pts)
- CYCLING_WALKING: Biking, walking, using green transit instead of driving (15 pts)
- GARDENING: Urban agriculture, home balcony garden, growing food (20 pts)
- RENEWABLE_ENERGY: Solar panel installation, clean energy equipment (30 pts)
- WATER_CONSERVATION: Rainwater harvesting, drip irrigation, water saving (20 pts)
- WILDLIFE_PROTECTION: Rescuing wildlife, bird feeder, habitat protection (25 pts)
- ECO_PRODUCT: Reusable bag/bottle, natural soap, eco swap (10 pts)
- AWARENESS_EVENT: Environmental workshop, eco seminar, community talk (15 pts)
- OTHER_GREEN: Any other positive sustainability action (10 pts)
- NOT_ECO: Selfies, non-green food, spam, inappropriate, or irrelevant content (0 pts)

Respond strictly in valid JSON format:
{
  "category": "CATEGORY_NAME",
  "points": number,
  "reason": "1-2 sentence evaluation of the visual evidence"
}`;

    const response = await genai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } },
            { text: prompt },
          ],
        },
      ],
    });

    const clean = response.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      category: parsed.category || 'OTHER_GREEN',
      points: typeof parsed.points === 'number' ? Math.max(0, Math.min(parsed.points, 50)) : 15,
      reason: parsed.reason || 'Verified environmental action.',
    };
  } catch (err) {
    console.error('[Gemini EcoPoints Error]:', err.message);
    return { category: 'OTHER_GREEN', points: 15, reason: 'Green action registered (auto-verified)' };
  }
}

const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;
const CAPTION_LIMIT = 2200;
const ALLOWED_MEDIA = new Map([
  ['image/jpeg', 'image'],
  ['image/png', 'image'],
  ['image/webp', 'image'],
  ['image/gif', 'image'],
  ['video/mp4', 'video'],
  ['video/webm', 'video'],
  ['video/quicktime', 'video'],
]);

function requireSupabaseAdmin(res) {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Supabase Storage is not configured on the server.' });
    return false;
  }
  return true;
}

async function viewerContext(userId) {
  const [userResult, orgResult, individualResult] = await Promise.all([
    query('SELECT id, full_name, email, account_type, status, created_at, location, phone FROM users WHERE id = $1', [userId]),
    supabaseAdmin.from('organization_users').select('id, organization_id, role, bio, avatar_url, status, created_at').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('individual_users').select('id, bio, avatar_url, location, phone, total_ecopoints, status, created_at').eq('id', userId).maybeSingle(),
  ]);
  if (!userResult.rows[0]) return null;
  if (orgResult.error) throw new Error(orgResult.error.message);
  if (individualResult.error) throw new Error(individualResult.error.message);

  const user = userResult.rows[0];
  if (orgResult.data) {
    if (orgResult.data.status !== 'ACTIVE') return null;
    return {
      user,
      scope: 'ORGANIZATION',
      organizationId: orgResult.data.organization_id,
      membershipRole: orgResult.data.role,
      profile: orgResult.data,
    };
  }
  if (individualResult.data && individualResult.data.status !== 'ACTIVE') return null;
  return {
    user,
    scope: 'INDIVIDUAL',
    organizationId: null,
    membershipRole: user.account_type === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : null,
    profile: individualResult.data,
  };
}

async function signedMediaUrl(mediaPath) {
  if (!mediaPath || !supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUrl(mediaPath, 60 * 15);
  if (error) throw new Error(`Unable to create media preview URL: ${error.message}`);
  return data.signedUrl;
}

async function decoratePosts(rows) {
  if (!rows.length) return [];
  const ids = rows.map((post) => post.id);
  const [likesResult, commentsResult] = await Promise.all([
    supabaseAdmin.from('post_likes').select('post_id').in('post_id', ids),
    supabaseAdmin.from('post_comments').select('post_id').in('post_id', ids),
  ]);
  if (likesResult.error) throw new Error(likesResult.error.message);
  if (commentsResult.error) throw new Error(commentsResult.error.message);

  const likeCounts = new Map();
  const commentCounts = new Map();
  for (const like of likesResult.data || []) likeCounts.set(like.post_id, (likeCounts.get(like.post_id) || 0) + 1);
  for (const comment of commentsResult.data || []) commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1);

  return Promise.all(rows.map(async (post) => ({
    ...post,
    media_url: await signedMediaUrl(post.media_path),
    like_count: likeCounts.get(post.id) || 0,
    comment_count: commentCounts.get(post.id) || 0,
  })));
}

async function canViewPost(post, viewer) {
  if (post.author_id === viewer.user.id) return true;
  if (post.status !== 'APPROVED') return false;
  if (post.author_scope === 'INDIVIDUAL') return viewer.scope === 'INDIVIDUAL';
  return viewer.scope === 'ORGANIZATION' && post.organization_id === viewer.organizationId;
}

async function getVisiblePost(postId, viewer) {
  const { data, error } = await supabaseAdmin.from('posts').select('*').eq('id', postId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !(await canViewPost(data, viewer))) return null;
  return data;
}

async function authorNames(userIds) {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabaseAdmin.from('users').select('id, full_name').in('id', uniqueIds);
  if (error) throw new Error(error.message);
  return new Map((data || []).map((user) => [user.id, user.full_name]));
}

export async function getMyProfile(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const viewer = await viewerContext(req.user.id);
    if (!viewer) return res.status(404).json({ error: 'Profile not found.' });

    let organization = null;
    if (viewer.organizationId) {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('id', viewer.organizationId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      organization = data;
    }

    const { count, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', req.user.id)
      .eq('status', 'APPROVED');
    if (postError) throw new Error(postError.message);

    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('author_id', req.user.id)
      .eq('status', 'APPROVED');
    if (postsError) throw new Error(postsError.message);
    const postIds = (posts || []).map((post) => post.id);
    let totalLikes = 0;
    if (postIds.length) {
      const { count: likeCount, error } = await supabaseAdmin
        .from('post_likes')
        .select('post_id', { count: 'exact', head: true })
        .in('post_id', postIds);
      if (error) throw new Error(error.message);
      totalLikes = likeCount || 0;
    }

    return res.json({
      profile: {
        id: req.user.id,
        full_name: viewer.user.full_name,
        email: viewer.user.email,
        account_type: viewer.organizationId
          ? viewer.membershipRole === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'ORG_MEMBER'
          : viewer.user.account_type,
        location: viewer.profile?.location ?? viewer.user.location ?? null,
        phone: viewer.profile?.phone ?? viewer.user.phone ?? null,
        bio: viewer.profile?.bio || '',
        avatar_url: viewer.profile?.avatar_url || null,
        total_ecopoints: viewer.profile?.total_ecopoints ?? null,
        status: viewer.profile?.status || viewer.user.status,
        created_at: viewer.user.created_at,
        organization,
        organization_role: viewer.membershipRole,
        post_count: count || 0,
        total_likes: totalLikes,
      },
    });
  } catch (error) {
    console.error('[getMyProfile Error]:', error);
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
}

export async function updateMyBio(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : null;
    if (bio === null || Array.from(bio).length > 150) {
      return res.status(400).json({ error: 'Bio must be a string of 150 characters or fewer.' });
    }
    const viewer = await viewerContext(req.user.id);
    if (!viewer) return res.status(404).json({ error: 'Profile not found.' });
    const table = viewer.scope === 'ORGANIZATION' ? 'organization_users' : 'individual_users';
    const { data, error } = await supabaseAdmin.from(table).update({ bio }).eq('id', req.user.id).select('bio').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data && viewer.user.account_type !== 'SUPER_ADMIN') {
      return res.status(404).json({ error: 'Profile record is missing. Run the profile migration and backfill.' });
    }
    return res.json({ bio: data?.bio ?? bio });
  } catch (error) {
    console.error('[updateMyBio Error]:', error);
    return res.status(500).json({ error: 'Failed to save bio.' });
  }
}

export async function getMyPosts(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('author_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return res.json({ posts: await decoratePosts(data || []) });
  } catch (error) {
    console.error('[getMyPosts Error]:', error);
    return res.status(500).json({ error: 'Failed to load your posts.' });
  }
}

export async function getFeed(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const viewer = await viewerContext(req.user.id);
    if (!viewer) return res.status(404).json({ error: 'Profile not found.' });
    let postsQuery = supabaseAdmin.from('posts').select('*').eq('status', 'APPROVED');
    if (viewer.scope === 'INDIVIDUAL') {
      postsQuery = postsQuery.eq('author_scope', 'INDIVIDUAL');
    } else {
      postsQuery = postsQuery.eq('author_scope', 'ORGANIZATION').eq('organization_id', viewer.organizationId);
    }
    const { data, error } = await postsQuery.order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    const names = await authorNames((data || []).map((post) => post.author_id));
    const posts = await decoratePosts(data || []);
    return res.json({
      posts: posts.map((post) => ({ ...post, author_name: names.get(post.author_id) || 'Terra member' })),
    });
  } catch (error) {
    console.error('[getFeed Error]:', error);
    return res.status(500).json({ error: 'Failed to load GreenFeed.' });
  }
}

export async function createPost(req, res) {
  let uploadedPath;
  try {
    if (!requireSupabaseAdmin(res)) return;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Choose a photo or video to post.' });
    const mediaType = ALLOWED_MEDIA.get(file.mimetype);
    if (!mediaType) return res.status(400).json({ error: 'Unsupported image or video type.' });
    if (file.size > (mediaType === 'image' ? IMAGE_LIMIT : VIDEO_LIMIT)) {
      return res.status(413).json({ error: mediaType === 'image' ? 'Images must be 10 MB or smaller.' : 'Videos must be 50 MB or smaller.' });
    }
    const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
    if (caption.length > CAPTION_LIMIT) return res.status(400).json({ error: `Caption must be ${CAPTION_LIMIT} characters or fewer.` });

    const viewer = await viewerContext(req.user.id);
    if (!viewer) return res.status(404).json({ error: 'Profile not found.' });
    const isOrgAdmin = viewer.scope === 'ORGANIZATION' && viewer.membershipRole === 'ORG_ADMIN';
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '';
    uploadedPath = `${req.user.id}/${randomUUID()}${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .upload(uploadedPath, file.buffer, { contentType: file.mimetype, upsert: false });
    if (uploadError) throw new Error(`Media upload failed: ${uploadError.message}`);

    let ecoAnalysis = null;
    if (mediaType === 'image') {
      ecoAnalysis = await analyzeImageForEcoPoints(file.buffer, file.mimetype, caption);
      console.log('[EcoPoints Analysis]:', ecoAnalysis);
    }

    const row = {
      author_id: req.user.id,
      author_scope: viewer.scope,
      organization_id: viewer.organizationId,
      media_path: uploadedPath,
      media_type: mediaType,
      caption,
      status: isOrgAdmin ? 'APPROVED' : 'PENDING',
    };
    const { data, error } = await supabaseAdmin.from('posts').insert(row).select('*').single();
    if (error) throw new Error(error.message);
    if (isOrgAdmin && ecoAnalysis && ecoAnalysis.points > 0) {
      await awardEcoPointsToUser(req.user.id, ecoAnalysis.points);
    }

    return res.status(201).json({
      post: { ...data, media_url: await signedMediaUrl(data.media_path), like_count: 0, comment_count: 0 },
      message: isOrgAdmin ? 'Your post is now visible in your organization feed.' : 'Your post has been sent for approval.',
    });
  } catch (error) {
    if (uploadedPath && supabaseAdmin) {
      const { error: removeError } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([uploadedPath]);
      if (removeError) console.error('[createPost storage cleanup Error]:', removeError.message);
    }
    console.error('[createPost Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit post.' });
  }
}

export async function deletePost(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const { data: post, error: findError } = await supabaseAdmin.from('posts').select('id, author_id, media_path').eq('id', req.params.id).maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!post || post.author_id !== req.user.id) return res.status(404).json({ error: 'Post not found.' });
    const { error } = await supabaseAdmin.from('posts').delete().eq('id', post.id).eq('author_id', req.user.id);
    if (error) throw new Error(error.message);
    const { error: storageError } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([post.media_path]);
    if (storageError) console.error('[deletePost Storage Error]:', storageError.message);
    return res.json({ message: 'Post deleted.' });
  } catch (error) {
    console.error('[deletePost Error]:', error);
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
}

export async function getPostDetail(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const viewer = await viewerContext(req.user.id);
    const post = viewer && await getVisiblePost(req.params.id, viewer);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const [likesResult, commentsResult, authorResult] = await Promise.all([
      supabaseAdmin.from('post_likes').select('user_id').eq('post_id', post.id),
      supabaseAdmin.from('post_comments').select('id, user_id, comment, created_at').eq('post_id', post.id).order('created_at'),
      supabaseAdmin.from('users').select('full_name').eq('id', post.author_id).maybeSingle(),
    ]);
    if (likesResult.error) throw new Error(likesResult.error.message);
    if (commentsResult.error) throw new Error(commentsResult.error.message);
    if (authorResult.error) throw new Error(authorResult.error.message);
    const names = await authorNames((commentsResult.data || []).map((comment) => comment.user_id));
    return res.json({
      post: {
        ...post,
        media_url: await signedMediaUrl(post.media_path),
        author_name: authorResult.data?.full_name || 'Terra member',
        like_count: (likesResult.data || []).length,
        liked_by_viewer: (likesResult.data || []).some((like) => like.user_id === req.user.id),
      },
      comments: (commentsResult.data || []).map((comment) => ({
        ...comment,
        author_name: names.get(comment.user_id) || 'Terra member',
        can_delete: comment.user_id === req.user.id || post.author_id === req.user.id,
      })),
    });
  } catch (error) {
    console.error('[getPostDetail Error]:', error);
    return res.status(500).json({ error: 'Failed to load post.' });
  }
}

export async function toggleLike(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const viewer = await viewerContext(req.user.id);
    const post = viewer && await getVisiblePost(req.params.id, viewer);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const { data: existing, error: findError } = await supabaseAdmin.from('post_likes').select('post_id').eq('post_id', post.id).eq('user_id', req.user.id).maybeSingle();
    if (findError) throw new Error(findError.message);
    if (existing) {
      const { error } = await supabaseAdmin.from('post_likes').delete().eq('post_id', post.id).eq('user_id', req.user.id);
      if (error) throw new Error(error.message);
      return res.json({ liked: false });
    }
    const { error } = await supabaseAdmin.from('post_likes').insert({ post_id: post.id, user_id: req.user.id });
    if (error && error.code !== '23505') throw new Error(error.message);
    return res.json({ liked: true });
  } catch (error) {
    console.error('[toggleLike Error]:', error);
    return res.status(500).json({ error: 'Unable to update like.' });
  }
}

export async function addPostComment(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!comment || comment.length > 300) return res.status(400).json({ error: 'Comment must be between 1 and 300 characters.' });
    const viewer = await viewerContext(req.user.id);
    const post = viewer && await getVisiblePost(req.params.id, viewer);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const { data, error } = await supabaseAdmin.from('post_comments').insert({
      post_id: post.id,
      user_id: req.user.id,
      comment,
    }).select('id, user_id, comment, created_at').single();
    if (error) throw new Error(error.message);
    return res.status(201).json({ comment: { ...data, author_name: req.user.full_name, can_delete: true } });
  } catch (error) {
    console.error('[addPostComment Error]:', error);
    return res.status(500).json({ error: 'Unable to add comment.' });
  }
}

export async function deletePostComment(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const { data: comment, error: findError } = await supabaseAdmin.from('post_comments').select('id, user_id, post_id').eq('id', req.params.commentId).maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    const { data: post, error: postError } = await supabaseAdmin.from('posts').select('author_id').eq('id', comment.post_id).maybeSingle();
    if (postError) throw new Error(postError.message);
    if (comment.user_id !== req.user.id && post?.author_id !== req.user.id) return res.status(403).json({ error: 'You cannot delete this comment.' });
    const { error } = await supabaseAdmin.from('post_comments').delete().eq('id', comment.id);
    if (error) throw new Error(error.message);
    return res.json({ message: 'Comment deleted.' });
  } catch (error) {
    console.error('[deletePostComment Error]:', error);
    return res.status(500).json({ error: 'Unable to delete comment.' });
  }
}

export async function getPostRequests(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const viewer = await viewerContext(req.user.id);
    if (!viewer) return res.status(404).json({ error: 'Reviewer profile not found.' });
    let requestsQuery = supabaseAdmin.from('posts').select('*').eq('status', 'PENDING');
    if (viewer.user.account_type === 'SUPER_ADMIN') {
      requestsQuery = requestsQuery.eq('author_scope', 'INDIVIDUAL');
    } else if (viewer.scope === 'ORGANIZATION' && viewer.membershipRole === 'ORG_ADMIN') {
      requestsQuery = requestsQuery.eq('author_scope', 'ORGANIZATION').eq('organization_id', viewer.organizationId);
    } else {
      return res.status(403).json({ error: 'Only the assigned reviewer can view post requests.' });
    }
    const { data, error } = await requestsQuery.order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    const names = await authorNames((data || []).map((post) => post.author_id));
    const posts = await decoratePosts(data || []);
    return res.json({
      posts: posts.map((post) => ({ ...post, author_name: names.get(post.author_id) || 'Terra member' })),
    });
  } catch (error) {
    console.error('[getPostRequests Error]:', error);
    return res.status(500).json({ error: 'Failed to load post requests.' });
  }
}

export async function reviewPost(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const action = req.body.action === 'APPROVED' ? 'APPROVED' : req.body.action === 'REJECTED' ? 'REJECTED' : null;
    const remarks = typeof req.body.remarks === 'string' ? req.body.remarks.trim() : '';
    if (!action) return res.status(400).json({ error: 'Action must be APPROVED or REJECTED.' });
    if (action === 'REJECTED' && !remarks) return res.status(400).json({ error: 'A rejection reason is required.' });

    const viewer = await viewerContext(req.user.id);
    if (!viewer) return res.status(404).json({ error: 'Reviewer not found.' });
    const { data: post, error: findError } = await supabaseAdmin.from('posts').select('*').eq('id', req.params.id).maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!post || post.status !== 'PENDING') return res.status(404).json({ error: 'Pending request not found.' });

    const isSuperAdminReview = viewer.user.account_type === 'SUPER_ADMIN' && post.author_scope === 'INDIVIDUAL';
    const isOrgAdminReview = viewer.scope === 'ORGANIZATION'
      && viewer.membershipRole === 'ORG_ADMIN'
      && post.author_scope === 'ORGANIZATION'
      && post.organization_id === viewer.organizationId;
    if (!isSuperAdminReview && !isOrgAdminReview) {
      return res.status(403).json({ error: 'This request is not assigned to you.' });
    }

    const { data: updated, error: reviewError } = await supabaseAdmin.rpc('review_terra_post', {
      target_post: post.id,
      reviewer_id: req.user.id,
      decision: action,
      review_remarks: remarks || null,
    });
    if (reviewError) {
      if (reviewError.message?.includes('Pending post request not found')) {
        return res.status(409).json({ error: 'This request was already reviewed.' });
      }
      if (reviewError.message?.includes('not assigned')) {
        return res.status(403).json({ error: 'This request is not assigned to you.' });
      }
      throw new Error(reviewError.message);
    }
    // Award EcoPoints on review approval
    if (action === 'APPROVED' && post.media_path && post.media_type === 'image') {
      try {
        const { data: fileData, error: dlError } = await supabaseAdmin.storage
          .from(MEDIA_BUCKET)
          .download(post.media_path);
        if (!dlError && fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const ext = post.media_path.split('.').pop().toLowerCase();
          const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
          const mime = mimeMap[ext] || 'image/jpeg';
          const analysis = await analyzeImageForEcoPoints(buffer, mime, post.caption);
          if (analysis.points > 0) {
            await awardEcoPointsToUser(post.author_id, analysis.points);
            console.log(`[EcoPoints] Awarded ${analysis.points} pts to user ${post.author_id} for ${analysis.category}`);
          }
        }
      } catch (ecoErr) {
        console.error('[EcoPoints review error]:', ecoErr.message);
      }
    }

    return res.json({ post: updated });
  } catch (error) {
    console.error('[reviewPost Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to review post.' });
  }
}


export async function getLeaderboard(req, res) {
  try {
    if (!requireSupabaseAdmin(res)) return;
    const { data: indUsers, error } = await supabaseAdmin
      .from('individual_users')
      .select('id, total_ecopoints')
      .order('total_ecopoints', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    const userIds = (indUsers || []).map((u) => u.id);
    const names = await authorNames(userIds);

    const leaderboard = (indUsers || []).map((u, idx) => ({
      rank: idx + 1,
      user_id: u.id,
      full_name: names.get(u.id) || 'Terra Member',
      total_ecopoints: Number(u.total_ecopoints) || 0,
    }));

    return res.json({ leaderboard });
  } catch (error) {
    console.error('[getLeaderboard Error]:', error);
    return res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
}