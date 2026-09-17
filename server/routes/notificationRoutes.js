import { Router } from 'express';
import { deleteNotification, listNotifications, markAllAsRead, markAsRead } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);
notificationRoutes.get('/', listNotifications);
notificationRoutes.post('/read-all', markAllAsRead);
notificationRoutes.patch('/:id/read', markAsRead);
notificationRoutes.delete('/:id', deleteNotification);
