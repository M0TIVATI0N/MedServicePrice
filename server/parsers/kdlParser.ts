import * as cheerio from 'cheerio';
import { RawClinicRecord } from '../models';

export async function parseKdlPrices(): Promise<RawClinicRecord[]> {
  const source_url = 'https://www.kdlolymp.kz/pricelist/astana';
  const response = await fetch(source_url);
  const html = await response.text();
  const $ = cheerio.load(html);
    console.log($.html().slice(0,500));
    console.log($("table").length);
  const clinicName = 'KDL';
  const city = 'Алматы';
  const address = 'ул. Достык, 108';
  const phone = '+7 727 123 45 67';
  const working_hours = '08:00-20:00';
  console.log($.html().slice(0,500));
  console.log($("table").length);

  const offers: RawClinicRecord[] = [];

  $('table tr').each((_, row) => {
    const columns = $(row).find('td');
    if (columns.length >= 2) {
      const name = $(columns[0]).text().trim();
      const rawPrice = $(columns[1]).text().trim().replace(/[^\d]/g, "");
      const priceMatch = rawPrice.replace(/\s/g, '').match(/(\d+)/);
      if (name && priceMatch) {
        offers.push({
          clinic_id: 'kdl-almaty',
          clinic_name: clinicName,
          city,
          address,
          phone,
          working_hours,
          source_url,
          service_name_raw: name,
          category: 'лаборатория',
          price_kzt: Number(priceMatch[1]),
          currency: 'KZT',
          duration_days: 1,
          parsed_at: new Date().toISOString(),
          is_active: true
        });
      }
    }
  });

  if (offers.length === 0) {
    // fallback: parse by blocks with titles
    $('.service-item, .price-item').each((_, block) => {
      const name = $(block).find('.service-name, .title').text().trim();
      const rawPrice = $(block).find('.price, .amount').text().trim();
      const priceMatch = rawPrice.replace(/\s/g, '').match(/(\d+)/);
      if (name && priceMatch) {
        offers.push({
          clinic_id: 'kdl-almaty',
          clinic_name: clinicName,
          city,
          address,
          phone,
          working_hours,
          source_url,
          service_name_raw: name,
          category: 'лаборатория',
          price_kzt: Number(priceMatch[1]),
          currency: 'KZT',
          duration_days: 1,
          parsed_at: new Date().toISOString(),
          is_active: true
        });
      }
    });
  }

  return offers;
}
