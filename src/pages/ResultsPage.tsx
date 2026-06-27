import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Filter, SlidersHorizontal, Loader2, ArrowLeft, Scale, X, Search } from 'lucide-react';
import { Link } from 'react-router';
import { fetchServices, ServiceOffer } from '../lib/api';
import { ServiceCard } from '../components/ServiceCard';
import { useCompare } from '../lib/CompareContext';

const CATEGORIES = ['Все', 'лаборатория', 'приём врача', 'диагностика', 'процедура', 'прочее'];

export function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { compareItems, clearCompare } = useCompare();
  
  const query = searchParams.get('query') || '';
  const city = searchParams.get('city') || '';
  const categoryParam = searchParams.get('category') || 'Все';
  const priceMin = searchParams.get('priceMin') || '';
  const priceMax = searchParams.get('priceMax') || '';
  const sort = searchParams.get('sort') || 'price_asc';

  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: any = {};
    if (query) params.query = query;
    if (city) params.city = city;
    if (categoryParam && categoryParam !== 'Все') params.category = categoryParam;
    if (priceMin) params.priceMin = priceMin;
    if (priceMax) params.priceMax = priceMax;
    if (sort) params.sort = sort;

    fetchServices(params)
      .then((data) => setOffers(data.data || []))
      .catch((err) => setError('Не удалось загрузить данные. ' + err.message))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <>
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden bg-slate-50">
      {/* Mobile Filters Toggle */}
      <div className="lg:hidden flex items-center justify-between bg-white p-4 border-b border-slate-200 shrink-0">
         <Link to="/" className="text-slate-500 hover:text-slate-900 flex items-center text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
         </Link>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-slate-700 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Фильтры</span>
        </button>
      </div>

      {/* Sidebar Filters */}
      <aside className={`w-full lg:w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 ${showFilters ? 'flex' : 'hidden'} lg:flex`}>
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Сортировка</h3>
          <div className="flex flex-col gap-2">
            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${sort === 'price_asc' ? 'bg-teal-50 border-teal-100' : 'hover:bg-slate-50 border-transparent'}`}>
              <input type="radio" name="sort" value="price_asc" checked={sort === 'price_asc'} onChange={(e) => updateParam('sort', e.target.value)} className="accent-teal-600" />
              <span className={`text-sm font-medium ${sort === 'price_asc' ? 'text-teal-900' : 'text-slate-700'}`}>Сначала дешевые</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${sort === 'price_desc' ? 'bg-teal-50 border-teal-100' : 'hover:bg-slate-50 border-transparent'}`}>
              <input type="radio" name="sort" value="price_desc" checked={sort === 'price_desc'} onChange={(e) => updateParam('sort', e.target.value)} className="accent-teal-600" />
              <span className={`text-sm font-medium ${sort === 'price_desc' ? 'text-teal-900' : 'text-slate-700'}`}>Сначала дорогие</span>
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Категория</h3>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer p-1">
                <input type="radio" name="category" value={cat} checked={categoryParam === cat} onChange={(e) => updateParam('category', e.target.value === 'Все' ? '' : e.target.value)} className="accent-teal-600" />
                <span className="capitalize text-slate-700 font-medium">{cat}</span>
              </label>
            ))}
          </div>
        </section>
        
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Цена (₸)</h3>
          <div className="flex gap-2">
            <input type="number" placeholder="От" value={priceMin} onChange={(e) => updateParam('priceMin', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
            <input type="number" placeholder="До" value={priceMax} onChange={(e) => updateParam('priceMax', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
          </div>
        </section>

        <button onClick={() => setSearchParams(new URLSearchParams())} className="mt-auto w-full border border-slate-200 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-600">Сбросить всё</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">
            {query ? `Найдено ${offers.length} предложений по "${query}"` : `Найдено ${offers.length} предложений`}
            {city && ` в ${city}`}
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-teal-500" />
            <p>Загрузка предложений...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 text-rose-600 p-6 rounded-xl text-center border border-rose-100">
            {error}
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm h-full flex flex-col items-center justify-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Ничего не найдено</h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm">
              Попробуйте изменить параметры поиска, убрать фильтры или поискать в другом городе.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 pb-24">
            {offers.map(offer => (
              <ServiceCard key={`${offer.clinic_id}-${offer.service_id}`} offer={offer} />
            ))}
          </div>
        )}
      </main>
    </div>
    
    {compareItems.length > 0 && (
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center pointer-events-none">
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between max-w-lg w-full pointer-events-auto">
          <div className="flex items-center space-x-3">
            <div className="bg-teal-600 p-2 rounded-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">К сравнению: {compareItems.length}</p>
              <p className="text-xs text-slate-400">Выберите до 3-х услуг</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={clearCompare}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={compareItems.length < 2}
            >
              Сравнить
            </button>
          </div>
        </div>
      </div>
    )}

    {showCompareModal && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-900">Сравнение услуг</h2>
            <button onClick={() => setShowCompareModal(false)} className="p-2 bg-white rounded-full text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-x-auto flex-1">
             <div className="grid grid-cols-4 gap-6 min-w-[800px]">
                <div className="col-span-1 border-r border-slate-100 pr-6 space-y-6 text-slate-500 font-medium pt-14">
                  <div className="h-12 flex items-center text-sm">Услуга</div>
                  <div className="h-12 flex items-center text-sm">Цена</div>
                  <div className="h-12 flex items-center text-sm">Клиника</div>
                  <div className="h-12 flex items-center text-sm">Город</div>
                  <div className="h-12 flex items-center text-sm">Адрес</div>
                  <div className="h-12 flex items-center text-sm">График работы</div>
                </div>
                <div className="col-span-3 grid grid-cols-3 gap-6">
                  {compareItems.map(item => (
                    <div key={`${item.clinic_id}-${item.service_id}`} className="space-y-6">
                      <div className="h-12">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 mb-2">
                           {item.category}
                         </span>
                      </div>
                      <div className="h-12 flex items-center font-bold text-slate-900 text-base leading-tight line-clamp-2">{item.service_name_norm}</div>
                      <div className="h-12 flex items-center text-2xl font-black text-slate-900">{item.price_kzt.toLocaleString('ru-RU')} ₸</div>
                      <div className="h-12 flex items-center font-medium text-slate-900 text-sm">{item.clinic_name}</div>
                      <div className="h-12 flex items-center text-slate-600 text-sm">{item.city}</div>
                      <div className="h-12 flex items-center text-slate-600 text-sm line-clamp-2">{item.address}</div>
                      <div className="h-12 flex items-center text-slate-600 text-sm">{item.working_hours}</div>
                      <div className="pt-4">
                         <a href={item.source_url} target="_blank" rel="noreferrer" className="block w-full py-2 bg-teal-600 text-white text-center rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-sm shadow-teal-200 text-sm">
                           Записаться
                         </a>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
