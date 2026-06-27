import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { fetchJson, asArray } from './api';
import { CollapsiblePanel } from './CollapsiblePanel';
import { publicSourceUrl } from './clinicUrl';
import { formatFreshness, priceDeviation, deviationLabel, sourceLabel } from './utils';

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
  rating?: number;
  online_booking?: boolean;
  distance_km?: number;
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
  rating?: number;
  online_booking?: boolean;
  location?: { lat: number; lng: number };
  service_count?: number;
  min_price?: number;
  services?: ServiceOffer[];
}

interface CatalogItem {
  service_id: string;
  service_name_norm: string;
  category: string;
}

interface PriceHistoryItem {
  price_kzt: number;
  previous_price_kzt?: number;
  parsed_at: string;
}

interface Stats {
  active_offers: number;
  clinics: number;
  sources: number;
  catalog_size: number;
  freshness_days: number;
}

interface PriceStats {
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface SourceStat {
  id: string;
  label: string;
  offers: number;
  clinics: number;
}

const SOURCE_OPTIONS = [
  { id: 'KDL', label: 'KDL' },
  { id: 'DOQ', label: 'DOQ' },
  { id: 'INVITRO', label: 'ИНВИТРО' },
  { id: 'HELIX', label: 'Helix' },
  { id: 'GEMOTEST', label: 'Гемотест' }
] as const;

const PLANNED_SOURCES = ['Olymp', 'МЕДЭЛ', 'МЦК', '2GIS'] as const;

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl, iconRetinaUrl: iconUrl });

const clinicIcon = L.icon({
  iconUrl, shadowUrl: iconShadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

const userIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<div class="user-dot"></div>',
  iconSize: [22, 22], iconAnchor: [11, 11]
});

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

function ClinicPopupContent({ clinic, onSelect }: { clinic: Clinic; onSelect: (c: Clinic) => void }) {
  const map = useMap();
  return (
    <div className="map-popup">
      <strong>{clinic.clinic_name}</strong>
      {clinic.address && <div className="map-popup-address">{clinic.address}</div>}
      <button type="button" className="popup-button"
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
        onClick={e => { e.preventDefault(); e.stopPropagation(); map.closePopup(); onSelect(clinic); }}>
        Услуги клиники
      </button>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 50;
const DEFAULT_CENTER = { lat: 43.2567, lng: 76.9286 };
const POPULAR_SEARCHES = ['ОАК', 'УЗИ брюшной полости', 'Биохимический анализ крови', 'Консультация терапевта', 'ЭКГ'] as const;
const DATA_SOURCES = ['KDL', 'DOQ', 'ИНВИТРО', 'Helix', 'Гемотест'];

function offerKey(o: ServiceOffer) {
  return `${o.clinic_id}-${o.service_id}`;
}

export default function App() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const mapsUrl = import.meta.env.VITE_GOOGLE_MAPS_URL || 'https://www.google.com/maps/dir/?api=1';

  const [city, setCity] = useState('');
  const [compareCities, setCompareCities] = useState<string[]>([]);
  const [compareCitiesOpen, setCompareCitiesOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [category, setCategory] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('0');
  const [priceMax, setPriceMax] = useState('100000');
  const [ratingMin, setRatingMin] = useState('0');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sort, setSort] = useState('price_asc');
  const [page, setPage] = useState(1);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [priceStats, setPriceStats] = useState<PriceStats | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicPanelOpen, setClinicPanelOpen] = useState(true);
  const [clinicServiceSearch, setClinicServiceSearch] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catalogHints, setCatalogHints] = useState<CatalogItem[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);

  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [comparePanelOpen, setComparePanelOpen] = useState(true);
  const [compareData, setCompareData] = useState<ServiceOffer[]>([]);

  const [historyOffer, setHistoryOffer] = useState<ServiceOffer | null>(null);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(true);
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);

  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(false);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const clinicPanelRef = useRef<HTMLElement>(null);
  const clinicCacheRef = useRef<Map<string, Clinic>>(new Map());
  const debouncedQuery = useDebounce(query, 400);
  const debouncedClinicSearch = useDebounce(clinicServiceSearch, 300);

  useEffect(() => {
    fetchJson<string[]>(`${apiBase}/cities`).then(d => setCities(asArray(d))).catch(() => {});
    fetchJson<Stats>(`${apiBase}/stats`).then(d => { if (d) setStats(d); }).catch(() => {});
  }, [apiBase]);

  useEffect(() => {
    if (!city) {
      setCategories([]);
      setOffers([]);
      setTotalCount(0);
      setPriceStats(null);
      setClinics([]);
      setSelectedClinic(null);
      setCompareIds(new Set());
      setCompareCities([]);
      setSourceStats([]);
      return;
    }
    setCompareCities(prev => prev.filter(c => c !== city));
    fetchJson<string[]>(`${apiBase}/categories?city=${encodeURIComponent(city)}`)
      .then(d => setCategories(asArray(d)))
      .catch(() => setCategories([]));
    fetchJson<SourceStat[]>(`${apiBase}/sources/stats?city=${encodeURIComponent(city)}`)
      .then(d => setSourceStats(asArray(d)))
      .catch(() => setSourceStats([]));
  }, [apiBase, city]);

  useEffect(() => {
    if (!debouncedQuery.trim() || !city) { setCatalogHints([]); return; }
    fetchJson<CatalogItem[]>(`${apiBase}/catalog/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`)
      .then(d => setCatalogHints(asArray(d)))
      .catch(() => setCatalogHints([]));
  }, [apiBase, debouncedQuery, city]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowHints(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setPage(1); }, [debouncedQuery, selectedServiceId, city, compareCities, category, selectedSources, priceMin, priceMax, ratingMin, onlineOnly, sort, nearMeActive, userLocation]);

  const searchCities = useMemo(
    () => (city ? [city, ...compareCities.filter(c => c !== city)] : []),
    [city, compareCities]
  );

  const baseFilterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedServiceId) p.set('service_id', selectedServiceId);
    else if (debouncedQuery.trim()) p.set('query', debouncedQuery.trim());
    if (category) p.set('category', category);
    if (selectedSources.length) p.set('sources', selectedSources.join(','));
    if (Number(priceMin) > 0) p.set('priceMin', priceMin);
    if (Number(priceMax) < 100000) p.set('priceMax', priceMax);
    if (Number(ratingMin) > 0) p.set('ratingMin', ratingMin);
    if (onlineOnly) p.set('online_booking', 'true');
    return p;
  }, [debouncedQuery, selectedServiceId, category, selectedSources, priceMin, priceMax, ratingMin, onlineOnly]);

  const searchParams = useMemo(() => {
    if (!searchCities.length) return '';
    const p = new URLSearchParams(baseFilterParams);
    if (searchCities.length > 1) p.set('cities', searchCities.join(','));
    p.set('city', city);
    if (nearMeActive && userLocation && sort === 'distance') {
      p.set('lat', String(userLocation.lat));
      p.set('lng', String(userLocation.lng));
    }
    p.set('sort', sort);
    p.set('page', String(page));
    p.set('limit', String(PAGE_SIZE));
    return p.toString();
  }, [baseFilterParams, searchCities, city, sort, page, nearMeActive, userLocation]);

  const mapClinicParams = useMemo(() => {
    if (!searchCities.length) return '';
    const p = new URLSearchParams();
    if (searchCities.length > 1) p.set('cities', searchCities.join(','));
    p.set('city', city);
    p.set('map', 'true');
    if (selectedSources.length) p.set('sources', selectedSources.join(','));
    return p.toString();
  }, [searchCities, city, selectedSources]);

  useEffect(() => {
    if (!searchCities.length || !searchParams) {
      setOffers([]);
      setTotalCount(0);
      setPriceStats(null);
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetchJson<{ data?: ServiceOffer[]; count?: number; price_stats?: PriceStats | null }>(
      `${apiBase}/services?${searchParams}`, controller.signal
    )
      .then(data => {
        if (!data) {
          setError('Не удалось загрузить данные.');
          return;
        }
        setOffers(asArray(data.data));
        setTotalCount(data.count ?? 0);
        setPriceStats(data.price_stats ?? null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError('Не удалось загрузить данные.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [apiBase, searchParams, searchCities]);

  useEffect(() => {
    if (!searchCities.length || !mapClinicParams) { setClinics([]); return; }
    fetchJson<Clinic[]>(`${apiBase}/clinics?${mapClinicParams}`)
      .then(d => setClinics(asArray(d)))
      .catch(() => setClinics([]));
  }, [apiBase, mapClinicParams, searchCities]);

  useEffect(() => {
    if (!selectedClinic) return;
    const cacheKey = `${selectedClinic.clinic_id}|${debouncedClinicSearch}`;
    const cached = clinicCacheRef.current.get(cacheKey);
    if (cached) {
      setSelectedClinic(cached);
      setClinicLoading(false);
      return;
    }
    setClinicLoading(true);
    const q = debouncedClinicSearch.trim();
    const url = q
      ? `${apiBase}/clinics/${selectedClinic.clinic_id}?search=${encodeURIComponent(q)}&limit=500`
      : `${apiBase}/clinics/${selectedClinic.clinic_id}?limit=500`;
    fetchJson<Clinic>(url)
      .then(full => {
        if (full) {
          clinicCacheRef.current.set(cacheKey, full);
          setSelectedClinic(full);
        }
      })
      .finally(() => setClinicLoading(false));
  }, [apiBase, selectedClinic?.clinic_id, debouncedClinicSearch]);

  useEffect(() => {
    if (!historyOffer) { setHistory([]); return; }
    fetchJson<PriceHistoryItem[]>(
      `${apiBase}/history?clinic_id=${historyOffer.clinic_id}&service_id=${historyOffer.service_id}`
    ).then(d => setHistory(asArray(d))).catch(() => setHistory([]));
  }, [apiBase, historyOffer]);

  const mapCenter = selectedClinic?.location ?? clinics.find(c => c.location)?.location ?? userLocation ?? DEFAULT_CENTER;

  const handleSelectClinic = useCallback((clinic: Clinic) => {
    setSelectedClinic({ ...clinic, services: [] });
    setClinicServiceSearch('');
    setClinicPanelOpen(true);
    setTimeout(() => clinicPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }, []);

  const toggleCompare = useCallback((offer: ServiceOffer) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      const key = offerKey(offer);
      if (next.has(key)) next.delete(key);
      else if (next.size < 4) next.add(key);
      return next;
    });
  }, []);

  const runCompare = useCallback(() => {
    const selected = offers.filter(o => compareIds.has(offerKey(o)));
    if (selected.length < 2) return;
    if (new Set(selected.map(o => o.service_id)).size !== 1) {
      setError('Для сравнения выберите одну услугу в разных клиниках.');
      return;
    }
    setCompareData(selected.sort((a, b) => a.price_kzt - b.price_kzt));
    setShowCompare(true);
    setComparePanelOpen(true);
  }, [compareIds, offers]);

  const openHistory = useCallback((offer: ServiceOffer) => {
    setHistoryOffer(offer);
    setHistoryPanelOpen(true);
    setTimeout(() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }, []);

  const toggleNearMe = useCallback(() => {
    if (nearMeActive) {
      setNearMeActive(false);
      setUserLocation(null);
      if (sort === 'distance') setSort('price_asc');
      return;
    }
    if (!navigator.geolocation) {
      setError('Геолокация недоступна в браузере.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMeActive(true);
        setSort('distance');
      },
      () => setError('Не удалось определить геолокацию.')
    );
  }, [nearMeActive, sort]);

  const triggerParse = useCallback(() => {
    setParsing(true);
    setParseMessage('Парсинг запущен, подождите...');
    fetch(`${apiBase}/parse`, { method: 'POST' })
      .then(() => {
        let attempts = 0;
        const poll = () => {
          fetch(`${apiBase}/parse/status`)
            .then(r => r.json())
            .then(data => {
              setStats(prev => ({
                active_offers: data.active_offers,
                clinics: data.clinics,
                sources: prev?.sources ?? 0,
                catalog_size: prev?.catalog_size ?? 133,
                freshness_days: data.freshness_days ?? 30
              }));
              attempts++;
              if (data.active_offers > 0 || attempts >= 90) {
                setParsing(false);
                setParseMessage(
                  data.active_offers > 0
                    ? `Обновлено: ${data.active_offers.toLocaleString('ru-RU')} предложений, ${data.clinics} клиник`
                    : 'Парсинг завершён. Нажмите «Обновить прайсы» ещё раз, если данных нет.'
                );
                fetchJson<string[]>(`${apiBase}/cities`).then(d => setCities(asArray(d)));
                if (city) {
                  fetchJson<string[]>(`${apiBase}/categories?city=${encodeURIComponent(city)}`).then(d => setCategories(asArray(d)));
                  fetchJson<SourceStat[]>(`${apiBase}/sources/stats?city=${encodeURIComponent(city)}`).then(d => setSourceStats(asArray(d)));
                }
                return;
              }
              setTimeout(poll, 2000);
            })
            .catch(() => { setParsing(false); setParseMessage(null); });
        };
        setTimeout(poll, 2000);
      })
      .catch(() => { setParsing(false); setParseMessage(null); });
  }, [apiBase, city]);

  const selectCatalogItem = (item: CatalogItem) => {
    setQuery(item.service_name_norm);
    setSelectedServiceId(item.service_id);
    setShowHints(false);
  };

  const quickSearch = (term: string) => { setQuery(term); setSelectedServiceId(''); setShowHints(false); };

  const clearFilters = () => {
    setQuery('');
    setSelectedServiceId('');
    setCategory('');
    setSelectedSources([]);
    setPriceMin('0');
    setPriceMax('100000');
    setRatingMin('0');
    setOnlineOnly(false);
    setSort('price_asc');
  };

  const toggleCompareCity = (c: string) => {
    setCompareCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const toggleSource = (id: string) => {
    setSelectedSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const goToPage = (next: number) => {
    setPage(next);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const sourceStatMap = useMemo(
    () => Object.fromEntries(sourceStats.map(s => [s.id, s])),
    [sourceStats]
  );

  const showCategoryFilter = categories.length > 1;
  const compareCityOptions = cities.filter(c => c !== city);
  const hasActiveFilters = !!(query || selectedServiceId || category || selectedSources.length || Number(priceMin) > 0 || Number(priceMax) < 100000 || Number(ratingMin) > 0 || onlineOnly);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const clinicsWithLocation = clinics.filter(c => c.location);
  const lowestPrice = offers.length > 0 ? Math.min(...offers.map(o => o.price_kzt)) : null;

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-content">
          <p className="eyebrow">MedServicePrice.kz · Хакатон 2025</p>
          <h1>Сравнение цен на медицинские услуги в Казахстане</h1>
          <p className="subtitle">Как Aviasales, но для медицины — сначала выберите город, затем сравнивайте цены клиник.</p>
          <div className="source-badges">
            {DATA_SOURCES.map(s => <span key={s} className="source-badge">{s}</span>)}
            {PLANNED_SOURCES.map(s => <span key={s} className="source-badge source-badge-planned">{s} · скоро</span>)}
          </div>
          {stats && (
            <p className="stats-bar">
              {stats.active_offers.toLocaleString('ru-RU')} предложений · {stats.clinics} клиник · {stats.catalog_size} услуг · актуальность {stats.freshness_days} дн.
            </p>
          )}
          {parseMessage && <p className="parse-message">{parseMessage}</p>}
        </div>
        <div className="hero-actions">
          <button type="button" className="secondary-button" onClick={triggerParse} disabled={parsing}>
            {parsing ? 'Обновление...' : 'Обновить прайсы'}
          </button>
        </div>
      </header>

      <main className="panel">
        <section className="city-gate">
          <div className="control-group city-gate-select">
            <label>1. Выберите город ({cities.length || '…'} с данными)</label>
            <select value={city} onChange={e => setCity(e.target.value)} className="city-select-large">
              <option value="">— Выберите город —</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {!city && (
            <p className="city-gate-hint">Показаны только города, где есть актуальные предложения. После выбора загрузятся клиники и цены.</p>
          )}
        </section>

        {city && compareCityOptions.length > 0 && (
          <section className="compare-cities-panel">
            <button
              type="button"
              className="compare-cities-toggle"
              onClick={() => setCompareCitiesOpen(v => !v)}
            >
              <span className={`chevron ${compareCitiesOpen ? 'open' : ''}`} aria-hidden>›</span>
              Сравнить с другими городами (необязательно)
              {compareCities.length > 0 && <span className="compare-count">{compareCities.length}</span>}
            </button>
            {compareCitiesOpen && (
              <div className="compare-cities-chips">
                {compareCityOptions.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${compareCities.includes(c) ? 'chip-active' : ''}`}
                    onClick={() => toggleCompareCity(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {city && (
          <>
            <section className="controls controls-grid">
              <div className="control-group search-group search-group-wide" ref={searchRef}>
                <label>2. Услуга</label>
                <input value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedServiceId(''); setShowHints(true); }}
                  onFocus={() => setShowHints(true)}
                  placeholder="Например, ОАК, УЗИ или консультация терапевта" autoComplete="off" />
                {showHints && catalogHints.length > 0 && (
                  <ul className="autocomplete-list">
                    {catalogHints.map(h => (
                      <li key={h.service_id}>
                        <button type="button" onClick={() => selectCatalogItem(h)}>
                          <span>{h.service_name_norm}</span>
                          <span className="hint-category">{h.category}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="popular-chips">
                  <span className="chips-label">Популярное:</span>
                  {POPULAR_SEARCHES.map(term => (
                    <button key={term} type="button" className="chip" onClick={() => quickSearch(term)}>{term}</button>
                  ))}
                </div>
              </div>

              {showCategoryFilter && (
              <div className="control-group">
                <label>Категория</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Все категории</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              )}
              <div className="control-group sources-group">
                <label>Источники данных (по ТЗ)</label>
                <div className="source-chips">
                  {SOURCE_OPTIONS.map(s => {
                    const stat = sourceStatMap[s.id];
                    const hasData = !stat || stat.offers > 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`chip ${selectedSources.includes(s.id) ? 'chip-active' : ''} ${!hasData ? 'chip-no-data' : ''}`}
                        onClick={() => toggleSource(s.id)}
                        title={stat ? `${stat.offers} предложений · ${stat.clinics} клиник` : undefined}
                      >
                        {s.label}
                        {stat && <span className="chip-stat">{stat.clinics || '—'}</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedSources.length === 0 ? (
                  <span className="sources-hint">Не выбрано — показываются все источники с данными в городе</span>
                ) : selectedSources.every(id => sourceStatMap[id]?.offers === 0) ? (
                  <span className="sources-hint sources-hint-warn">Выбранные источники не содержат данных в этом городе. Нажмите «Обновить прайсы».</span>
                ) : (
                  <span className="sources-hint">Цифра на кнопке — число клиник источника в городе</span>
                )}
              </div>
              <div className="control-group">
                <label>Цена от (тг)</label>
                <input type="number" min={0} value={priceMin} onChange={e => setPriceMin(e.target.value)} />
              </div>
              <div className="control-group">
                <label>Цена до (тг)</label>
                <input type="number" min={0} value={priceMax} onChange={e => setPriceMax(e.target.value)} />
              </div>
              <div className="control-group">
                <label>Рейтинг от</label>
                <select value={ratingMin} onChange={e => setRatingMin(e.target.value)}>
                  <option value="0">Любой</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </div>
              <div className="control-group checkbox-group">
                <label>
                  <input type="checkbox" checked={onlineOnly} onChange={e => setOnlineOnly(e.target.checked)} />
                  Только с онлайн-записью
                </label>
              </div>
              <div className="control-group">
                <label>Сортировка</label>
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="price_asc">Цена ↑</option>
                  <option value="price_desc">Цена ↓</option>
                  <option value="date_desc">Свежее</option>
                  <option value="rating_desc">Рейтинг</option>
                  <option value="distance">По расстоянию</option>
                </select>
              </div>
            </section>

            {hasActiveFilters && (
              <section className="active-filters">
                <span className="active-filters-label">Фильтры ({city}):</span>
                <button type="button" className="link-button" onClick={clearFilters}>Сбросить фильтры</button>
              </section>
            )}

            <section className="toolbar">
              <span className="city-badge">{searchCities.join(' · ')}</span>
              <button
                type="button"
                className={`secondary-button ${nearMeActive ? 'button-active' : ''}`}
                onClick={toggleNearMe}
              >
                {nearMeActive ? '✓ Рядом со мной' : 'Рядом со мной'}
              </button>
              <button type="button" className="secondary-button" onClick={() => setShowMap(v => !v)}>
                {showMap ? 'Скрыть карту' : 'Показать карту'}
              </button>
              {compareIds.size >= 2 && (
                <button type="button" className="primary-button" onClick={runCompare}>Сравнить ({compareIds.size})</button>
              )}
              {clinicsWithLocation.length > 0 && (
                <span className="map-hint">{clinics.length} клиник · {clinicsWithLocation.length} на карте</span>
              )}
            </section>

            {selectedClinic && (
              <CollapsiblePanel
                title={`${selectedClinic.clinic_name} — услуги (${selectedClinic.service_count ?? selectedClinic.services?.length ?? '…'})`}
                open={clinicPanelOpen}
                onToggle={() => setClinicPanelOpen(v => !v)}
                onClose={() => setSelectedClinic(null)}
                panelRef={clinicPanelRef}
              >
                {selectedClinic.rating && <p>Рейтинг: {selectedClinic.rating.toFixed(1)} ★</p>}
                {selectedClinic.address && <p>{selectedClinic.address}</p>}
                {selectedClinic.phone && <p><a href={`tel:${selectedClinic.phone}`}>{selectedClinic.phone}</a></p>}
                {selectedClinic.working_hours && <p>{selectedClinic.working_hours}</p>}
                {publicSourceUrl(selectedClinic.clinic_id, selectedClinic.source_url) && (
                  <p><a href={publicSourceUrl(selectedClinic.clinic_id, selectedClinic.source_url)} target="_blank" rel="noreferrer">Сайт клиники</a></p>
                )}
                {clinicLoading ? (
                  <p className="status"><span className="spinner" /> Загрузка услуг...</p>
                ) : (
                  <>
                    <input
                      className="clinic-search-input"
                      placeholder="Поиск по услугам клиники..."
                      value={clinicServiceSearch}
                      onChange={e => setClinicServiceSearch(e.target.value)}
                    />
                    <ul className="history-list services-scroll">
                      {(selectedClinic.services ?? []).map((s, i) => (
                        <li key={`${s.service_id}-${i}`}>
                          <span>{s.service_name_norm || s.service_name_raw}</span>
                          <strong>{s.price_kzt.toLocaleString('ru-RU')} тг</strong>
                        </li>
                      ))}
                    </ul>
                    {selectedClinic.service_count != null &&
                      (selectedClinic.services?.length ?? 0) < selectedClinic.service_count && (
                      <p className="muted services-more-hint">
                        Показано {(selectedClinic.services?.length ?? 0).toLocaleString('ru-RU')} из {selectedClinic.service_count.toLocaleString('ru-RU')}. Уточните поиск.
                      </p>
                    )}
                  </>
                )}
              </CollapsiblePanel>
            )}

            {historyOffer && (
              <CollapsiblePanel
                title={`История цен: ${historyOffer.service_name_norm || historyOffer.service_name_raw}`}
                open={historyPanelOpen}
                onToggle={() => setHistoryPanelOpen(v => !v)}
                onClose={() => setHistoryOffer(null)}
                panelRef={historyRef}
              >
                <p className="muted">{historyOffer.clinic_name}, {historyOffer.city}</p>
                <ul className="history-list">
                  {(history.length === 0 ? [{ price_kzt: historyOffer.price_kzt, parsed_at: historyOffer.parsed_at }] : history).map((h, i) => (
                    <li key={i}>
                      <span>{new Date(h.parsed_at).toLocaleString('ru-RU')}</span>
                      <strong>
                        {'previous_price_kzt' in h && h.previous_price_kzt !== undefined && (
                          <span className="price-old">{h.previous_price_kzt.toLocaleString('ru-RU')} → </span>
                        )}
                        {h.price_kzt.toLocaleString('ru-RU')} тг
                      </strong>
                    </li>
                  ))}
                </ul>
              </CollapsiblePanel>
            )}

            {showCompare && compareData.length > 0 && (
              <CollapsiblePanel
                title="Сравнение клиник"
                open={comparePanelOpen}
                onToggle={() => setComparePanelOpen(v => !v)}
                onClose={() => setShowCompare(false)}
              >
                <table className="compare-table">
                  <thead>
                    <tr><th>Клиника</th><th>Город</th><th>Цена</th><th>Рейтинг</th><th>Обновлено</th></tr>
                  </thead>
                  <tbody>
                    {compareData.map(o => (
                      <tr key={offerKey(o)}>
                        <td>{o.clinic_name}</td>
                        <td>{o.city}</td>
                        <td><strong>{o.price_kzt.toLocaleString('ru-RU')} тг</strong></td>
                        <td>{o.rating ? `${o.rating.toFixed(1)} ★` : '—'}</td>
                        <td>{new Date(o.parsed_at).toLocaleDateString('ru-RU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CollapsiblePanel>
            )}

            {showMap && (
              <section className="map-panel">
                <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={11} scrollWheelZoom={false} className="map-container">
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapRecenter lat={mapCenter.lat} lng={mapCenter.lng} />
                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                      <Popup>Вы здесь</Popup>
                    </Marker>
                  )}
                  {clinics.map(clinic => clinic.location ? (
                    <Marker key={clinic.clinic_id} position={[clinic.location.lat, clinic.location.lng]} icon={clinicIcon}>
                      <Popup><ClinicPopupContent clinic={clinic} onSelect={handleSelectClinic} /></Popup>
                    </Marker>
                  ) : null)}
                </MapContainer>
              </section>
            )}

            <section className="results" ref={resultsRef}>
              <div className="results-header">
                <h2>Результаты — {searchCities.join(', ')}</h2>
                <span>{loading ? '...' : `${totalCount} предложений · ${clinics.length} клиник`}</span>
              </div>

              {priceStats && priceStats.count > 0 && (
                <div className="price-stats-bar">
                  <span>Средняя: <strong>{priceStats.avg.toLocaleString('ru-RU')} тг</strong></span>
                  <span>Медиана: <strong>{priceStats.median.toLocaleString('ru-RU')} тг</strong></span>
                  <span>Диапазон: {priceStats.min.toLocaleString('ru-RU')}–{priceStats.max.toLocaleString('ru-RU')} тг</span>
                </div>
              )}

              {loading && <p className="status"><span className="spinner" /> Загрузка...</p>}
              {error && <p className="status status-error">{error}</p>}
              {!loading && !error && offers.length === 0 && (
                <div className="empty-state">
                  <p className="empty-title">В городе {city} предложений не найдено</p>
                  <p className="empty-hint">
                    {selectedSources.length > 0
                      ? 'Выбранные источники не содержат данных по этому запросу. Снимите фильтр источников или нажмите «Обновить прайсы».'
                      : 'Попробуйте другую услугу или нажмите «Обновить прайсы» для загрузки данных по этому городу.'}
                  </p>
                </div>
              )}

              <div className="grid" key={`page-${page}`}>
                {offers.map(offer => {
                  const key = offerKey(offer);
                  const isCompared = compareIds.has(key);
                  const isBestPrice = lowestPrice !== null && offer.price_kzt === lowestPrice && offers.length > 1;
                  const clinicSummary = clinics.find(c => c.clinic_id === offer.clinic_id);
                  const siteUrl = publicSourceUrl(offer.clinic_id, offer.source_url);
                  const src = sourceLabel(offer.clinic_id);
                  const devPct = priceStats ? priceDeviation(offer.price_kzt, priceStats.median) : 0;
                  return (
                    <article key={`${key}-${offer.city}`} className={`card ${isCompared ? 'card-selected' : ''}`}>
                      <div className="card-header">
                        <h3>
                          <button type="button" className="clinic-link" onClick={() => handleSelectClinic(clinicSummary ?? {
                            clinic_id: offer.clinic_id, clinic_name: offer.clinic_name, city: offer.city,
                            address: offer.address, phone: offer.phone, working_hours: offer.working_hours,
                            source_url: offer.source_url, rating: offer.rating, online_booking: offer.online_booking,
                            location: offer.location, service_count: 0
                          })}>{offer.clinic_name}</button>
                        </h3>
                        <div className="card-badges">
                          {isBestPrice && <span className="badge badge-best">Лучшая цена</span>}
                          {src && <span className="badge badge-source">{src}</span>}
                          {showCategoryFilter && <span className="badge">{offer.category}</span>}
                          {offer.online_booking && <span className="badge badge-green">Онлайн</span>}
                        </div>
                      </div>
                      <p className="service-name">{offer.service_name_norm || offer.service_name_raw}</p>
                      {searchCities.length > 1 && (
                        <span className="badge badge-city">{offer.city}</span>
                      )}
                      <div className="price-row">
                        <strong>{offer.price_kzt.toLocaleString('ru-RU')} тг</strong>
                        <span className="freshness-badge" title="Дата обновления">{formatFreshness(offer.parsed_at)}</span>
                      </div>
                      {priceStats && (
                        <p className={`deviation ${devPct < 0 ? 'deviation-good' : devPct > 10 ? 'deviation-bad' : ''}`}>
                          {deviationLabel(devPct)} (медиана {priceStats.median.toLocaleString('ru-RU')} тг)
                        </p>
                      )}
                      <div className="clinic-meta">
                        {offer.rating && <p>Рейтинг: {offer.rating.toFixed(1)} ★</p>}
                        {offer.distance_km !== undefined && offer.distance_km < 1e6 && <p>{offer.distance_km.toFixed(1)} км от вас</p>}
                        {offer.address && <p>{offer.address}</p>}
                        {offer.working_hours && <p>{offer.working_hours}</p>}
                      </div>
                      <div className="card-actions-row">
                        <label className="compare-check">
                          <input type="checkbox" checked={isCompared} onChange={() => toggleCompare(offer)} />
                          Сравнить
                        </label>
                        <button type="button" className="link-button" onClick={() => openHistory(offer)}>История</button>
                      </div>
                      <div className="clinic-actions">
                        {siteUrl && <a href={siteUrl} target="_blank" rel="noreferrer">Сайт</a>}
                        {offer.phone && <a href={`tel:${offer.phone}`}>{offer.phone}</a>}
                        {offer.address && (
                          <a href={`${mapsUrl}&destination=${encodeURIComponent(offer.address + ' ' + offer.city)}`} target="_blank" rel="noreferrer">Маршрут</a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button type="button" disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>Назад</button>
                  <span>Страница {page} из {totalPages}</span>
                  <button type="button" disabled={page >= totalPages || loading} onClick={() => goToPage(page + 1)}>Вперёд</button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
