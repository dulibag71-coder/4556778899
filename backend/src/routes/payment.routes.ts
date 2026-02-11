import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'payment routes - 구현 예정' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'payment created' });
});

export default router;
