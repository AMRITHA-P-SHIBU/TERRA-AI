import { Router } from 'express';
import {
  getPendingOrganizations,
  getAllOrganizations,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  reactivateOrganization,
  getOrganizationLogs,
  getOrganizationDocument,
  getAllUsers,
  updateUserStatus,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Protect all admin endpoints: Must be authenticated AND have role SUPER_ADMIN
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// Organization Review & Approval Lifecycle
router.get('/organizations/pending', getPendingOrganizations);
router.get('/organizations', getAllOrganizations);
router.patch('/organizations/:id/approve', approveOrganization);
router.patch('/organizations/:id/reject', rejectOrganization);
router.patch('/organizations/:id/suspend', suspendOrganization);
router.patch('/organizations/:id/reactivate', reactivateOrganization);
router.get('/organizations/:id/logs', getOrganizationLogs);
router.get('/organizations/:id/document', getOrganizationDocument);

// User Management
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);

export default router;
