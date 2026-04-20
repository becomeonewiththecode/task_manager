import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { config } from '../config';
import { saveSubscription, removeSubscription } from '../services/pushSubscriptions.service';

const router = Router();

router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: config.VAPID_PUBLIC_KEY ?? null });
});

router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Invalid subscription object' });
      return;
    }
    await saveSubscription(req.userId!, { endpoint, keys });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/subscribe', authenticate, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ error: 'endpoint required' });
      return;
    }
    await removeSubscription(req.userId!, endpoint);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
