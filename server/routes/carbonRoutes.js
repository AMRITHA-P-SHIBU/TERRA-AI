import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getEmissionFactors,
  calculatePreview,
  logCalculation,
  getCalculationHistory,
  getCalculationReport,
  claimSustainableAction,
} from '../controllers/carbonController.js';

const router = Router();

// Public: View emission factors with citations
router.get('/emission-factors', getEmissionFactors);

// Real-time calculation preview (can be run with or without authentication)
router.post('/calculate', calculatePreview);

// Protected routes (require authenticated citizen or org user)
router.use('/log', authenticate);
router.post('/log', logCalculation);

router.use('/history', authenticate);
router.get('/history', getCalculationHistory);

router.use('/report', authenticate);
router.get('/report/:id', getCalculationReport);

router.use('/claim-action', authenticate);
router.post('/claim-action', claimSustainableAction);

export default router;

