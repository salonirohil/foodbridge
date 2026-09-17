import { Router } from 'express';
import {
  analytics,
  approveUser,
  dashboard,
  deleteFoodPost,
  deleteUser,
  impact,
  listClaims,
  listFoodPosts,
  listNgos,
  listRestaurants,
  listUsers,
  markFoodUnsafe,
  rejectUser,
  removeExpiredFoods,
  reports,
  suspendUser,
  updateClaimStatus,
  listAllReviews,
  deleteReview
} from '../controllers/adminController.js';
import { getCmsSettings, updateCmsSection, uploadCmsMedia } from '../controllers/cmsController.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { uploadCmsMedia as uploadCmsMediaFile } from '../middleware/upload.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth, allowRoles('admin'));

adminRoutes.get('/dashboard', dashboard);
adminRoutes.get('/users', listUsers);
adminRoutes.get('/restaurants', listRestaurants);
adminRoutes.get('/ngos', listNgos);
adminRoutes.patch('/users/:id/approve', approveUser);
adminRoutes.patch('/users/:id/reject', rejectUser);
adminRoutes.patch('/users/:id/suspend', suspendUser);
adminRoutes.delete('/users/:id', deleteUser);

adminRoutes.get('/foods', listFoodPosts);
adminRoutes.delete('/foods/expired/remove', removeExpiredFoods);
adminRoutes.delete('/foods/:id', deleteFoodPost);
adminRoutes.patch('/foods/:id/unsafe', markFoodUnsafe);

adminRoutes.get('/claims', listClaims);
adminRoutes.patch('/claims/:id/status', updateClaimStatus);

adminRoutes.get('/analytics', analytics);
adminRoutes.get('/reports', reports);
adminRoutes.get('/impact', impact);
adminRoutes.get('/reviews', listAllReviews);
adminRoutes.delete('/reviews/:id', deleteReview);
adminRoutes.get('/settings/cms', getCmsSettings);
adminRoutes.put('/settings/cms/:key', updateCmsSection);
adminRoutes.post('/settings/upload', uploadCmsMediaFile.single('media'), uploadCmsMedia);

