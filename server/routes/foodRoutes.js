import { Router } from 'express';
import { createFood, deleteFood, listFoods, restaurantDashboard, updateFood, updateFoodStatus } from '../controllers/foodController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { uploadFoodImage } from '../middleware/upload.js';

export const foodRoutes = Router();

foodRoutes.get('/', requireAuth, listFoods);
foodRoutes.post('/', requireAuth, allowRoles('restaurant'), uploadFoodImage.single('image'), createFood);
foodRoutes.put('/:id', requireAuth, allowRoles('restaurant'), uploadFoodImage.single('image'), updateFood);
foodRoutes.delete('/:id', requireAuth, allowRoles('restaurant'), deleteFood);
foodRoutes.patch('/:id/status', requireAuth, allowRoles('restaurant'), updateFoodStatus);
foodRoutes.get('/restaurant/dashboard', requireAuth, allowRoles('restaurant'), restaurantDashboard);
