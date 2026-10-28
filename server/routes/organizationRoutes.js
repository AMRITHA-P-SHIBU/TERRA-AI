import { Router } from 'express';
import {
  getMyOrganization,
  getMyMembers,
  inviteMember,
} from '../controllers/organizationController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireApprovedOrganization } from '../middleware/requireApprovedOrganization.js';

const router = Router();

// All organization-scoped routes require valid authentication AND an approved organization
router.use(authenticate);
router.use(requireApprovedOrganization);

// Organization data endpoints
router.get('/my', getMyOrganization);
router.get('/my/members', getMyMembers);
router.post('/my/invitations', inviteMember);

export default router;
