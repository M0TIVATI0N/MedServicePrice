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
  }

  res.json({ count: offers.length, data: offers });
});

router.get('/clinics', async (req: Request, res: Response) => {
  const city = String(req.query.city ?? '').toLowerCase();
  const filters: any = {};
  if (city.length > 0) filters.city = { $regex: `^${city}$`, $options: 'i' };
  const clinics = await fetchClinics(filters);
  res.json(clinics);
});

router.post('/parse', async (_req: Request, res: Response) => {
  const result = await runParser();
  res.json(result);
});

router.get('/raw', async (_req: Request, res: Response) => {
  res.json(await fetchRawData());
});

router.get('/unmatched', async (_req: Request, res: Response) => {
  res.json(await fetchUnmatchedQueue());
});

router.get('/history', async (req: Request, res: Response) => {
  const clinic_id = String(req.query.clinic_id ?? '').trim();
  const service_id = String(req.query.service_id ?? '').trim();
  const filters: any = {};
  if (clinic_id) filters.clinic_id = clinic_id;
  if (service_id) filters.service_id = service_id;
  const history = await fetchPriceHistory(filters, 30);
  res.json(history);
});

export default router;
