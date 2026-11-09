import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import {
  addPostComment,
  createPost,
  deletePost,
  deletePostComment,
  getFeed,
  getMyPosts,
  getMyProfile,
  getPostDetail,
  getPostRequests,
  getLeaderboard,
  getDashboardStats,
  getAchievementBadges,
  reviewPost,
  toggleLike,
  updateMyBio,
} from '../controllers/socialController.js';

const router = Router();
const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (allowedTypes.has(file.mimetype)) callback(null, true);
    else callback(new Error('Invalid file type. Choose a supported image or video.'));
  },
});

router.use('/profile', authenticate);
router.use('/posts', authenticate);
router.get('/profile', getMyProfile);
router.patch('/profile/bio', updateMyBio);

router.get('/posts', getFeed);
router.get('/posts/feed', getFeed);
router.get('/posts/mine', getMyPosts);
router.get('/posts/requests', getPostRequests);
router.get('/posts/:id', getPostDetail);
router.post('/posts', mediaUpload.single('media'), createPost);
router.delete('/posts/:id', deletePost);
router.post('/posts/:id/like', toggleLike);
router.post('/posts/:id/comments', addPostComment);
router.delete('/posts/:id/comments/:commentId', deletePostComment);
router.patch('/posts/:id/review', reviewPost);

router.get('/leaderboard', authenticate, getLeaderboard);
router.get('/dashboard-stats', authenticate, getDashboardStats);
router.get('/badges', authenticate, getAchievementBadges);

export default router;
