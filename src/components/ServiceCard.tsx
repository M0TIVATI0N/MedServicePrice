import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MapPin, Clock, Scale } from 'lucide-react';
import { ServiceOffer } from '../lib/api';
import { useCompare } from '../lib/CompareContext';
import { cn } from '../lib/utils';

interface ServiceCardProps {
  offer: ServiceOffer;
  key?: string | number;
}

export function ServiceCard({ offer }: ServiceCardProps) {
  const { compareItems, toggleCompare } = useCompare();
  const parsedDate = new Date(offer.parsed_at);
  const timeAgo = formatDistanceToNow(parsedDate, { addSuffix: true, locale: ru });
  const isSelected = compareItems.some((item) => item.clinic_id === offer.clinic_id && item.service_id === offer.service_id);

  const clinicInitials = offer.clinic_name.substring(0, 4).toUpperCase();

  return (
    <div className={cn("bg-white border rounded-xl p-4 flex flex-col md:flex-row md:justify-between hover:shadow-md transition-all group gap-4 cursor-pointer", isSelected ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200')}>
      <div className="flex gap-4 flex-1">
        <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-slate-400">{clinicInitials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{offer.clinic_name}</h4>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{offer.category}</span>
          </div>
          <p className="text-sm text-slate-600 mb-2">
            {offer.service_name_norm}
            {offer.service_name_raw !== offer.service_name_norm && (
               <span className="text-slate-400 text-xs ml-2 italic">({offer.service_name_raw})</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {offer.city}, {offer.address}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {offer.working_hours}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex md:flex-col justify-between items-end shrink-0 gap-2 md:gap-0 mt-4 md:mt-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
        <div className="flex flex-col items-start md:items-end">
          <span className="text-2xl font-black text-slate-900">{offer.price_kzt.toLocaleString('ru-RU')} ₸</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            Обновлено {timeAgo}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleCompare(offer)}
            className={cn("p-2 border rounded-lg transition-colors flex items-center justify-center", isSelected ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600')}
            title="Сравнить"
          >
            <Scale className="w-4 h-4" />
          </button>
          <a
            href={offer.source_url}
            target="_blank"
            rel="noreferrer"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm shadow-teal-200 hover:bg-teal-700 transition-colors flex items-center justify-center"
          >
            Подробнее
          </a>
        </div>
      </div>
    </div>
  );
}
