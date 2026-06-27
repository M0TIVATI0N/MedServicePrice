import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search, MapPin, Activity, Stethoscope, Microscope, Pill } from 'lucide-react';
import { fetchCatalog } from '../lib/api';

const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Караганда'];
const POPULAR_CATEGORIES = [
  { name: 'Общий анализ крови', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
  { name: 'УЗИ брюшной полости', icon: Microscope, color: 'text-teal-500', bg: 'bg-teal-50' },
  { name: 'Консультация терапевта', icon: Stethoscope, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { name: 'ПЦР на коронавирус', icon: Pill, color: 'text-amber-500', bg: 'bg-amber-50' }
];

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState<{service_name_norm: string}[]>([]);
  const [catalog, setCatalog] = useState<{service_name_norm: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchCatalog().then((data) => {
      setCatalog(data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      const filtered = catalog.filter(c => c.service_name_norm.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, catalog]);

  const handleSearch = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && !city) return;
    const params = new URLSearchParams();
    if (query) params.set('query', query.trim());
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  };

  const handleSuggestionClick = (val: string) => {
    setQuery(val);
    setShowSuggestions(false);
    const params = new URLSearchParams();
    params.set('query', val);
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  }

  const handleCategoryClick = (categoryName: string) => {
    const params = new URLSearchParams();
    params.set('query', categoryName);
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  }

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="flex flex-col items-center justify-center space-y-12 py-12 w-full max-w-5xl">
        <div className="text-center space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Сравнение цен на медицинские услуги и анализы в Казахстане
          </h1>
          <p className="text-lg text-slate-600">
            Быстрый поиск, актуальные прайсы и удобное сравнение клиник в одном месте.
          </p>
        </div>

        <div className="w-full max-w-4xl bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-11 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all appearance-none text-slate-700 font-medium text-sm md:text-base"
              >
                <option value="">Все города</option>
                {CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-[2]">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Название услуги или анализа (например, ОАК)"
                className="w-full pl-11 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-900 text-sm md:text-base"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(s.service_name_norm)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 transition-colors border-b border-slate-50 last:border-0"
                    >
                      {s.service_name_norm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="md:w-auto px-8 py-3 md:py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              Найти
            </button>
          </form>
        </div>

        <div className="w-full max-w-5xl space-y-6 pt-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Популярные категории</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="flex items-center space-x-4 p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all group text-left"
                >
                  <div className={`p-3 rounded-xl ${cat.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${cat.color}`} />
                  </div>
                  <span className="font-medium text-slate-700 group-hover:text-slate-900">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
