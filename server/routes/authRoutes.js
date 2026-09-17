import { Router } from 'express';
import { forgotPassword, login, register, resetPassword, verifyOtp, updateProfile, changePassword, uploadProfileMedia, updateRestaurantSettings } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadCmsMedia } from '../middleware/upload.js';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/forgot-password', forgotPassword);
authRoutes.post('/verify-otp', verifyOtp);
authRoutes.post('/reset-password', resetPassword);
authRoutes.patch('/profile', requireAuth, updateProfile);
authRoutes.post('/profile/upload', requireAuth, uploadCmsMedia.single('media'), uploadProfileMedia);
authRoutes.patch('/change-password', requireAuth, changePassword);
authRoutes.patch('/restaurant-settings', requireAuth, updateRestaurantSettings);


