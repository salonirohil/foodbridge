import { Router } from 'express';
import { approveClaim, cancelClaim, claimFood, myClaims, rejectClaim } from '../controllers/claimController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

export const claimRoutes = Router();

claimRoutes.post('/', requireAuth, allowRoles('ngo'), claimFood);
claimRoutes.get('/mine', requireAuth, allowRoles('ngo'), myClaims);
claimRoutes.patch('/:id/cancel', requireAuth, allowRoles('ngo'), cancelClaim);
claimRoutes.patch('/:id/approve', requireAuth, allowRoles('restaurant'), approveClaim);
claimRoutes.patch('/:id/reject', requireAuth, allowRoles('restaurant'), rejectClaim);

