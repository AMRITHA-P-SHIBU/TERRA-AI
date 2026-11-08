import { Router } from 'express';
import multer from 'multer';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate.js';
import {
  createConversation,
  createListing,
  createMessage,
  createOfferConversation,
  createOffer,
  deleteListing,
  getListing,
  getRealtimeToken,
  getUnreadCount,
  listConversations,
  listListings,
  listMyOffers,
  listOffers,
  markNotificationsRead,
  reportConversation,
  shareExactLocation,
  blockConversationUser,
  unblockConversationUser,
  updateListing,
  updateOffer,
} from '../controllers/ecoExchangeController.js';

const router = Router();
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const images = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (imageTypes.has(file.mimetype)) callback(null, true);
    else callback(new Error('Photos must be JPEG, PNG, or WebP.'));
  },
});
const listingLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: { error: 'Listing limit reached. Please try again later.' },
});
const messageLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: { error: 'Message limit reached. Please wait before sending more.' },
});
const offerLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: { error: 'Offer limit reached. Please try again later.' },
});

router.use(authenticate);
router.get('/listings', listListings);
router.get('/listings/:id', getListing);
router.post('/listings', listingLimit, images.array('photos', 5), createListing);
router.patch('/listings/:id', images.array('photos', 5), updateListing);
router.delete('/listings/:id', deleteListing);
router.post('/listings/:id/conversations', createConversation);
router.get('/conversations', listConversations);
router.post('/conversations/:id/messages', messageLimit, createMessage);
router.post('/conversations/:id/share-location', messageLimit, shareExactLocation);
router.post('/conversations/:id/report', reportConversation);
router.post('/conversations/:id/block', blockConversationUser);
router.delete('/conversations/:id/block', unblockConversationUser);
router.post('/listings/:id/offers', offerLimit, images.array('photos', 5), createOffer);
router.get('/listings/:id/offers', listOffers);
router.get('/offers/mine', listMyOffers);
router.patch('/offers/:offerId', updateOffer);
router.post('/offers/:offerId/conversation', createOfferConversation);
router.get('/realtime-token', getRealtimeToken);
router.get('/notifications/unread-count', getUnreadCount);
router.post('/notifications/read', markNotificationsRead);

router.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    ? 'Each photo must be no larger than 5 MB.'
    : error.message || 'The uploaded photos could not be processed.';
  return res.status(status).json({ error: message });
});

export default router;
