import { Router, Request, Response } from 'express';
import { fetchClinics, fetchNormalizedOffers, fetchPriceHistory, fetchRawData, fetchUnmatchedQueue, runParser } from './parser';
import { serviceCatalog } from './service-catalog';
import { OfferRecord } from "./db";


const router = Router();
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/catalog', (_req: Request, res: Response) => {
  res.json(serviceCatalog);
});
router.get("/cities", async (_req: Request, res: Response) => {
    const offers = await OfferRecord.find({}, { city: 1, _id: 0 }).lean();

    const cities = [
        ...new Set(
            offers
                .map((o) => o.city)
                .filter((c): c is string => Boolean(c))
        )
    ].sort((a, b) => a.localeCompare(b, "ru"));

    res.json(cities);
});

router.get("/categories", async (_req: Request, res: Response) => {
    const offers = await OfferRecord.find({}, { category: 1, _id: 0 }).lean();

    const categories = [
        ...new Set(
            offers
                .map((o) => o.category)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, "ru"));

    res.json(categories);
});
router.get('/services', async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
  const query = String(req.query.query ?? '').trim();
  const city = String(req.query.city ?? '').trim();
  const category = String(req.query.category ?? '').trim();

  const priceMin = Number(req.query.priceMin ?? 0);
  const priceMax = Number(req.query.priceMax ?? Number.MAX_SAFE_INTEGER);
  const sort = String(req.query.sort ?? 'price_asc');

  const filters: any = {
    price_kzt: {
      $gte: priceMin,
      $lte: priceMax
    }
  };

if (query) {
    filters.$or = [
        { service_name_norm: { $regex: query, $options: 'i' } },
        { service_name_raw: { $regex: query, $options: 'i' } },
        { clinic_name: { $regex: query, $options: 'i' } },
        { city: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
    ];
}

  if (city) {
    filters.city = {
      $regex: city,
      $options: 'i'
    };
  }

  if (category) {
    filters.category = {
      $regex: category,
      $options: 'i'
    };
  }

const mongoSort =
    sort === "price_desc"
        ? { price_kzt: -1 as const }
        : { price_kzt: 1 as const };

const offers = await fetchNormalizedOffers(
    filters,
    mongoSort,
    page,
    limit
);


  res.json({
    count: offers.length,
    data: offers
  });
});

router.get('/clinics', async (req: Request, res: Response) => {
  const city = String(req.query.city ?? '').trim();

  const filters: Record<string, any> = {};

  if (city) {
    filters.city = {
      $regex: city,
      $options: 'i'
    };
  }

  const clinics = await fetchClinics(filters);

  res.json(clinics);
});

router.post('/parse', async (_req: Request, res: Response) => {
    res.json({ status: "parser started in background" });

    runParser()
        .then((result) => console.log("Parser finished:", result))
        .catch((err) => console.error("Parser error:", err));
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
