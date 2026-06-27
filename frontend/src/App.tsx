import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

interface ServiceOffer {
  clinic_id: string;
  clinic_name: string;
  city: string;
  address: string;
  phone: string;
  working_hours: string;
  source_url: string;
  service_id: string;
  service_name_raw: string;
  service_name_norm: string;
  category: string;
  price_kzt: number;
  parsed_at: string;
  location?: { lat: number; lng: number };
}

interface Clinic {
  clinic_id: string;
  clinic_name: string;
  city: string;
  address: string;
  phone: string;
  working_hours: string;
  source_url: string;
  location?: { lat: number; lng: number };
  services: ServiceOffer[];
}

interface PriceHistoryItem {
  price_kzt: number;
  parsed_at: string;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  shadowUrl: iconShadowUrl,
  iconRetinaUrl: iconUrl
});

function App() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [priceMin, setPriceMin] = useState('0');
  const [priceMax, setPriceMax] = useState('20000');
  const [sort, setSort] = useState('price_asc');
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const [cities, setCities] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);


  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const mapsUrl = import.meta.env.VITE_GOOGLE_MAPS_URL || 'https://www.google.com/maps/dir/?api=1';

    useEffect(() => {
    fetch(`${apiBase}/cities`)
        .then(r => r.json())
        .then(setCities)
        .catch(() => setCities([]));

    fetch(`${apiBase}/categories`)
        .then(r => r.json())
        .then(setCategories)
        .catch(() => setCategories([]));
    }, [apiBase]);
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (sort) params.set('sort', sort);
    return params.toString();
  }, [query, city, category, priceMin, priceMax, sort]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const PAGE_SIZE = 50;

    fetch(
    `${apiBase}/services?${searchParams}&page=1&limit=${PAGE_SIZE}`
    )
      .then((res) => res.json())
      .then((data) => setOffers(data.data ?? []))
      .catch(() => setError('Не удалось загрузить данные.'))
      .finally(() => setLoading(false));
  }, [apiBase, searchParams]);

  useEffect(() => {
    fetch(`${apiBase}/clinics?city=${encodeURIComponent(city)}`)
      .then((res) => res.json())
      .then((data) => setClinics(data))
      .catch(() => setClinics([]));
  }, [apiBase, city]);

  useEffect(() => {
    if (!selectedClinic) {
      setHistory([]);
      return;
    }
    fetch(`${apiBase}/history?clinic_id=${selectedClinic}`)
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch(() => setHistory([]));
  }, [apiBase, selectedClinic]);

  const selectedClinicData = clinics.find((clinic) => clinic.clinic_id === selectedClinic);
  const mapCenter = selectedClinicData?.location ?? clinics[0]?.location ?? { lat: 43.2567, lng: 76.9286 };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MedServicePrice.kz</p>
          <h1>Сравнение цен на медицинские услуги в Казахстане</h1>
          <p className="subtitle">
            Поиск анализов, приёма врачей и диагностики с актуальными прайсами, картой и историей изменений.
          </p>
        </div>
      </header>

      <main className="panel">
        <section className="controls controls-grid">
          <div className="control-group">
            <label>Услуга</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например, ОАК или УЗИ малого таза"
            />
          </div>
          <div className="control-group">
            <label>Город</label>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">Все города</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Категория</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Все категории</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Цена от</label>
            <input type="number" min={0} value={priceMin} onChange={(event) => setPriceMin(event.target.value)} />
          </div>
          <div className="control-group">
            <label>Цена до</label>
            <input type="number" min={0} value={priceMax} onChange={(event) => setPriceMax(event.target.value)} />
          </div>
          <div className="control-group">
            <label>Сортировка</label>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="price_asc">Цена по возрастанию</option>
              <option value="price_desc">Цена по убыванию</option>
            </select>
          </div>
        </section>

        <section className="map-toggle-row">
          <button type="button" className="primary-button" onClick={() => setShowMap((value) => !value)}>
            {showMap ? 'Скрыть карту' : 'Показать карту'}
          </button>
        </section>

        {showMap && (
          <section className="map-panel">
            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={11} scrollWheelZoom={false} className="map-container">
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {clinics.map((clinic) =>
                clinic.location ? (
                  <Marker key={clinic.clinic_id} position={[clinic.location.lat, clinic.location.lng]}>
                    <Popup>
                      <strong>{clinic.clinic_name}</strong>
                      <div>{clinic.address}</div>
                      <button type="button" className="popup-button" onClick={() => setSelectedClinic(clinic.clinic_id)}>
                        Показать клинику
                      </button>
                    </Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>
          </section>
        )}

        <section className="results">
          <div className="results-header">
            <h2>Результаты</h2>
            <span>{offers.length} предложений</span>
          </div>

          {loading && <p className="status">Загрузка...</p>}
          {error && <p className="status status-error">{error}</p>}
          {!loading && !error && offers.length === 0 && <p className="status">Нет предложений по запросу.</p>}

          <div className="grid">
            {offers.map((offer) => (
              <article key={`${offer.clinic_id}-${offer.service_id}`} className="card">
                <div className="card-header">
                  <h3>{offer.clinic_name}</h3>
                  <span className="badge">{offer.category}</span>
                </div>
                <p className="service-name">{offer.service_name_norm}</p>
                <div className="price-row">
                  <strong>{offer.price_kzt.toLocaleString('ru-RU')} ₸</strong>
                  <span>{new Date(offer.parsed_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="clinic-meta">
                  <p>{offer.city}</p>
                  <p>{offer.address}</p>
                  <p>{offer.working_hours}</p>
                </div>
                <div className="clinic-actions">
                  <a href={offer.source_url} target="_blank" rel="noreferrer">
                    Источник
                  </a>
                  <a href={`tel:${offer.phone}`}>{offer.phone}</a>
                </div>
                <div className="clinic-actions">
                  <a
                    href={`${mapsUrl}&destination=${encodeURIComponent(`${offer.address}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Маршрут
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {selectedClinicData && (
          <section className="details-panel">
            <h2>Клиника: {selectedClinicData.clinic_name}</h2>
            <p>{selectedClinicData.address}</p>
            <p>{selectedClinicData.phone}</p>
            <p>{selectedClinicData.working_hours}</p>
            <h3>История цен</h3>
            {history.length === 0 ? (
              <p className="status">История цен не найдена.</p>
            ) : (
              <ul className="history-list">
                {history.map((item, index) => (
                  <li key={index}>
                    {new Date(item.parsed_at).toLocaleDateString('ru-RU')} — {item.price_kzt.toLocaleString('ru-RU')} ₸
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
