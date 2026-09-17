import { Router } from 'express';
import { listMedia, createMedia, deleteMedia } from '../controllers/mediaController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadCmsMedia } from '../middleware/upload.js';

export const mediaRoutes = Router();

mediaRoutes.get('/', listMedia);
mediaRoutes.post('/', requireAuth, uploadCmsMedia.single('media'), createMedia);
mediaRoutes.delete('/:id', requireAuth, deleteMedia);
