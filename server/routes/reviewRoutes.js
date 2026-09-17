import { Router } from 'express';
import { createReview, getReviewsByMe, getReviewsForUser } from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/auth.js';

export const reviewRoutes = Router();

reviewRoutes.use(requireAuth);
reviewRoutes.post('/', createReview);
reviewRoutes.get('/received', getReviewsForUser);
reviewRoutes.get('/submitted', getReviewsByMe);
