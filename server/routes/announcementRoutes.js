import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Retrieve announcements (optionally authenticated, tailored by user scope)
router.get('/', authenticate, getAnnouncements);

// Publish announcement (restricted to Super Admin or Org Admin)
router.post('/', authenticate, createAnnouncement);

// Delete announcement (restricted to authoring admin or Super Admin)
router.delete('/:id', authenticate, deleteAnnouncement);

export default router;

