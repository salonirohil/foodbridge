import { Router } from 'express';
import { getCmsSection, getCmsSettings } from '../controllers/cmsController.js';
import { getHomepageData, getPublicPartners } from '../controllers/publicController.js';

export const publicRoutes = Router();

publicRoutes.get('/home', getHomepageData);
publicRoutes.get('/partners', getPublicPartners);
publicRoutes.get('/cms', getCmsSettings);
publicRoutes.get('/cms/:key', getCmsSection);
