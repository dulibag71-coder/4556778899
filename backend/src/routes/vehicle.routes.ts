import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'vehicle routes - 구현 예정' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'vehicle created' });
});

export default router;
