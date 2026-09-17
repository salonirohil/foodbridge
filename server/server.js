import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { authRoutes } from './routes/authRoutes.js';
import { foodRoutes } from './routes/foodRoutes.js';
import { claimRoutes } from './routes/claimRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { publicRoutes } from './routes/publicRoutes.js';
import { reviewRoutes } from './routes/reviewRoutes.js';
import { notificationRoutes } from './routes/notificationRoutes.js';
import { mediaRoutes } from './routes/mediaRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true }
});

app.set('io', io);
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/media', mediaRoutes);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`FoodBridge API running on http://localhost:${port}`);
});
