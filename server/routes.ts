import { Router, Request, Response } from 'express';
import { fetchClinics, fetchNormalizedOffers, fetchPriceHistory, fetchRawData, fetchUnmatchedQueue, runParser } from './parser';
import { serviceCatalog } from './service-catalog';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/catalog', (_req: Request, res: Response) => {
  res.json(serviceCatalog);
});

router.get('/services', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.query ?? '').toLowerCase();
    const city = String(req.query.city ?? '').toLowerCase();
    const category = String(req.query.category ?? '').toLowerCase();
    const priceMin = Number(req.query.priceMin ?? 0);
    const priceMax = Number(req.query.priceMax ?? Number.MAX_SAFE_INTEGER);
    const sort = String(req.query.sort ?? 'price_asc');

    const filters: any = {};
    if (query.length > 0) filters.service_name_norm = { $regex: query, $options: 'i' };
    if (city.length > 0) filters.city = { $regex: `^${city}$`, $options: 'i' };
    if (category.length > 0) filters.category = { $regex: `^${category}$`, $options: 'i' };
    filters.price_kzt = { $gte: priceMin, $lte: priceMax };

    const offers = await fetchNormalizedOffers(filters);

    if (sort === 'price_desc') {
      offers.sort((a, b) => b.price_kzt - a.price_kzt);
    } else {
       offers.sort((a, b) => a.price_kzt - b.price_kzt);
    }

    res.json({ count: offers.length, data: offers });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/clinics', async (req: Request, res: Response) => {
  try {
    const city = String(req.query.city ?? '').toLowerCase();
    const filters: any = {};
    if (city.length > 0) filters.city = { $regex: `^${city}$`, $options: 'i' };
    const clinics = await fetchClinics(filters);
    res.json(clinics);
  } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/parse', async (_req: Request, res: Response) => {
  try {
    const result = await runParser();
    res.json(result);
  } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/raw', async (_req: Request, res: Response) => {
  try {
    res.json(await fetchRawData());
  } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/unmatched', async (_req: Request, res: Response) => {
  try {
    res.json(await fetchUnmatchedQueue());
  } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const clinic_id = String(req.query.clinic_id ?? '').trim();
    const service_id = String(req.query.service_id ?? '').trim();
    const filters: any = {};
    if (clinic_id) filters.clinic_id = clinic_id;
    if (service_id) filters.service_id = service_id;
    const history = await fetchPriceHistory(filters, 30);
    res.json(history);
  } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
