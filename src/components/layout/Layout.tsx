import { ReactNode } from 'react';
import { Link } from 'react-router';
import { MapPin } from 'lucide-react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
              MedServicePrice<span className="text-teal-600">.kz</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center bg-slate-100 rounded-full px-3 py-1.5 cursor-pointer hover:bg-slate-200 transition-colors">
            <MapPin className="text-teal-600 mr-2 w-3.5 h-3.5" />
            <span className="text-sm font-medium mr-1">Казахстан</span>
          </div>
        </div>
        <nav className="hidden md:flex gap-6 items-center">
          <Link to="/" className="text-sm font-medium hover:text-teal-600">Главная</Link>
          <Link to="/about" className="text-sm font-medium hover:text-teal-600">О проекте</Link>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm">Личный кабинет</button>
        </nav>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
      
      <footer className="bg-slate-900 text-slate-400 px-6 py-2 flex justify-between items-center text-[10px] shrink-0">
        <div>&copy; {new Date().getFullYear()} MedServicePrice.kz &bull; Все права защищены</div>
        <div className="font-medium tracking-widest uppercase hidden md:block">Проект разработан в рамках Hackathon 2025</div>
        <div className="flex gap-4">
          <Link to="/about" className="hover:text-white">Конфиденциальность</Link>
          <a href="#" className="hover:text-white">API для клиник</a>
        </div>
      </footer>
    </div>
  );
}
