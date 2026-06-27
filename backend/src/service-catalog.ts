import { Category, NormalizedService } from './models';

export const serviceCatalog: NormalizedService[] = [
  // ЛАБОРАТОРИЯ — общие анализы
  { service_id: '00000000-0000-0000-0000-000000000001', service_name_norm: 'Общий анализ крови (ОАК)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000002', service_name_norm: 'Биохимический анализ крови', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000003', service_name_norm: 'Гормональный профиль', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000004', service_name_norm: 'Общий анализ мочи', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000005', service_name_norm: 'Коагулограмма', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000006', service_name_norm: 'ПЦР на коронавирус', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000019', service_name_norm: 'Скрининг беременности', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000020', service_name_norm: 'Глюкоза крови', category: 'лаборатория' },
  // ЛАБОРАТОРИЯ — биохимия
  { service_id: '00000000-0000-0000-0000-000000000026', service_name_norm: 'АЛТ (аланинаминотрансфераза)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000027', service_name_norm: 'АСТ (аспартатаминотрансфераза)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000028', service_name_norm: 'Билирубин общий', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000029', service_name_norm: 'Билирубин прямой', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000030', service_name_norm: 'Общий белок', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000031', service_name_norm: 'Альбумин', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000032', service_name_norm: 'Мочевина', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000033', service_name_norm: 'Креатинин', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000034', service_name_norm: 'Холестерин общий', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000035', service_name_norm: 'Триглицериды', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000036', service_name_norm: 'ЛПВП (холестерин)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000037', service_name_norm: 'ЛПНП (холестерин)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000038', service_name_norm: 'Мочевая кислота', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000039', service_name_norm: 'Амилаза', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000040', service_name_norm: 'Липаза', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000041', service_name_norm: 'Щелочная фосфатаза', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000042', service_name_norm: 'Гамма-ГТ', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000043', service_name_norm: 'С-реактивный белок (СРБ)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000044', service_name_norm: 'Ферритин', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000045', service_name_norm: 'Железо сывороточное', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000046', service_name_norm: 'Трансферрин', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000047', service_name_norm: 'Гликированный гемоглобин (HbA1c)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000048', service_name_norm: 'Инсулин', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000049', service_name_norm: 'Кальций общий', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000050', service_name_norm: 'Калий и натрий', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000051', service_name_norm: 'Магний', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000052', service_name_norm: 'Фосфор', category: 'лаборатория' },
  // ЛАБОРАТОРИЯ — гормоны
  { service_id: '00000000-0000-0000-0000-000000000053', service_name_norm: 'ТТГ (тиреотропный гормон)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000054', service_name_norm: 'Т4 свободный', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000055', service_name_norm: 'Т3 свободный', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000056', service_name_norm: 'АТ к ТПО', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000057', service_name_norm: 'Пролактин', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000058', service_name_norm: 'ФСГ', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000059', service_name_norm: 'ЛГ', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000060', service_name_norm: 'Эстрадиол', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000061', service_name_norm: 'Прогестерон', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000062', service_name_norm: 'Тестостерон общий', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000063', service_name_norm: 'ХГЧ (хорионический гонадотропин)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000064', service_name_norm: 'ДГЭА-С', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000065', service_name_norm: 'Кортизол', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000066', service_name_norm: 'Паратгормон (ПТГ)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000067', service_name_norm: 'Витамин D (25-OH)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000068', service_name_norm: 'Витамин B12', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000069', service_name_norm: 'Фолиевая кислота', category: 'лаборатория' },
  // ЛАБОРАТОРИЯ — инфекции и иммунология
  { service_id: '00000000-0000-0000-0000-000000000070', service_name_norm: 'ВИЧ (антитела)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000071', service_name_norm: 'Гепатит B (HBsAg)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000072', service_name_norm: 'Гепатит C (антитела)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000073', service_name_norm: 'Сифилис (RW)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000074', service_name_norm: 'Токсоплазмоз IgG/IgM', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000075', service_name_norm: 'Краснуха IgG/IgM', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000076', service_name_norm: 'Цитомегаловирус IgG/IgM', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000077', service_name_norm: 'Герпес IgG/IgM', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000078', service_name_norm: 'Хеликобактер пилори (антитела)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000079', service_name_norm: 'Посев на флору', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000080', service_name_norm: 'Антистрептолизин-О (АСЛО)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000081', service_name_norm: 'Ревматоидный фактор', category: 'лаборатория' },
  // ЛАБОРАТОРИЯ — онкомаркеры
  { service_id: '00000000-0000-0000-0000-000000000082', service_name_norm: 'ПСА общий (онкомаркер)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000083', service_name_norm: 'CA-125 (онкомаркер)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000084', service_name_norm: 'CA 15-3 (онкомаркер)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000085', service_name_norm: 'CA 19-9 (онкомаркер)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000086', service_name_norm: 'АФП (альфа-фетопротеин)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000087', service_name_norm: 'РЭА (раково-эмбриональный антиген)', category: 'лаборатория' },
  // ЛАБОРАТОРИЯ — моча и кал
  { service_id: '00000000-0000-0000-0000-000000000088', service_name_norm: 'Анализ мочи по Нечипоренко', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000089', service_name_norm: 'Анализ мочи по Зимницкому', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000090', service_name_norm: 'Копрограмма (анализ кала)', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000091', service_name_norm: 'Кал на скрытую кровь', category: 'лаборатория' },
  { service_id: '00000000-0000-0000-0000-000000000092', service_name_norm: 'Кал на яйца глист', category: 'лаборатория' },
  // ДИАГНОСТИКА
  { service_id: '00000000-0000-0000-0000-000000000007', service_name_norm: 'УЗИ брюшной полости', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000008', service_name_norm: 'МРТ головного мозга', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000009', service_name_norm: 'Рентген грудной клетки', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000010', service_name_norm: 'ЭКГ', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000014', service_name_norm: 'УЗИ сердца (эхокардиография)', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000015', service_name_norm: 'Кольпоскопия', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000016', service_name_norm: 'Флюорография', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000017', service_name_norm: 'Гастроскопия (ФГДС)', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000025', service_name_norm: 'УЗИ молочных желез', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000093', service_name_norm: 'УЗИ щитовидной железы', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000094', service_name_norm: 'УЗИ органов малого таза', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000095', service_name_norm: 'УЗИ почек', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000096', service_name_norm: 'УЗИ мочевого пузыря', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000097', service_name_norm: 'УЗИ предстательной железы', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000098', service_name_norm: 'Маммография', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000099', service_name_norm: 'КТ грудной клетки', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000100', service_name_norm: 'МРТ позвоночника', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000101', service_name_norm: 'МРТ суставов', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000102', service_name_norm: 'Колоноскопия', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000103', service_name_norm: 'Цистоскопия', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000104', service_name_norm: 'Суточный мониторинг АД (СМАД)', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000105', service_name_norm: 'Холтер ЭКГ', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000106', service_name_norm: 'Спирометрия', category: 'диагностика' },
  { service_id: '00000000-0000-0000-0000-000000000107', service_name_norm: 'Денситометрия (костная)', category: 'диагностика' },
  // ПРИЁМ ВРАЧА
  { service_id: '00000000-0000-0000-0000-000000000011', service_name_norm: 'Консультация терапевта', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000012', service_name_norm: 'Консультация педиатра', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000013', service_name_norm: 'Консультация гинеколога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000018', service_name_norm: 'Консультация дерматолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000022', service_name_norm: 'Консультация стоматолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000024', service_name_norm: 'Консультация офтальмолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000108', service_name_norm: 'Консультация кардиолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000109', service_name_norm: 'Консультация невролога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000110', service_name_norm: 'Консультация хирурга', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000111', service_name_norm: 'Консультация ортопеда', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000112', service_name_norm: 'Консультация уролога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000113', service_name_norm: 'Консультация эндокринолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000114', service_name_norm: 'Консультация психиатра', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000115', service_name_norm: 'Консультация психолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000116', service_name_norm: 'Консультация онколога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000117', service_name_norm: 'Консультация пульмонолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000118', service_name_norm: 'Консультация гастроэнтеролога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000119', service_name_norm: 'Консультация ревматолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000120', service_name_norm: 'Консультация нефролога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000121', service_name_norm: 'Консультация аллерголога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000122', service_name_norm: 'Консультация ЛОР-врача', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000123', service_name_norm: 'Консультация инфекциониста', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000124', service_name_norm: 'Консультация акушера', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000125', service_name_norm: 'Консультация маммолога', category: 'приём врача' },
  { service_id: '00000000-0000-0000-0000-000000000126', service_name_norm: 'Консультация гематолога', category: 'приём врача' },
  // ПРОЦЕДУРЫ
  { service_id: '00000000-0000-0000-0000-000000000021', service_name_norm: 'Вакцинация', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000023', service_name_norm: 'Физиотерапия', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000127', service_name_norm: 'Массаж лечебный', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000128', service_name_norm: 'Капельница (инфузионная терапия)', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000129', service_name_norm: 'Инъекция внутримышечная', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000130', service_name_norm: 'Перевязка', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000131', service_name_norm: 'Удаление новообразования', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000132', service_name_norm: 'Чистка зубов (профессиональная)', category: 'процедура' },
  { service_id: '00000000-0000-0000-0000-000000000133', service_name_norm: 'ЛФК (лечебная физкультура)', category: 'процедура' },
];

export const serviceSynonyms: Record<string, string[]> = {
  'Общий анализ крови (ОАК)': [
    'ОАК', 'Общий анализ крови', 'Клинический анализ крови', 'CBC',
    'Общий анализ крови (ОАК)', 'Анализ крови общий', 'Клинический анализ крови (ОАК)',
    'Гематологический анализ крови', 'Развернутый анализ крови',
    'blood test', 'complete blood count', 'cbc test', 'общий кровь анализ',
    'анализ крови', 'общий анализ крови с лейкоформулой'
  ],

  'Биохимический анализ крови': [
    'Биохимический анализ крови', 'БХ', 'Биохимия крови', 'Биохимия',
    'Биохимический анализ', 'Комплексная биохимия',
    'blood biochemistry', 'biochemistry panel', 'бх анализ'
  ],

  'Гормональный профиль': [
    'Гормональный профиль', 'Анализ гормонов', 'Гормоны женские',
    'Гормоны мужские', 'Половые гормоны',
    'hormone panel', 'гормоны анализ', 'эндокринный профиль'
  ],

  'Общий анализ мочи': [
    'ОАМ', 'Общий анализ мочи', 'Анализ мочи', 'Анализ мочи общий',
    'Общеклинический анализ мочи',
    'urine test', 'urinalysis', 'моча общий анализ', 'анализ мочи оам'
  ],

  'Коагулограмма': [
    'Коагулограмма', 'Свертываемость крови', 'Гемостазиограмма',
    'Коагулограмма (свертываемость)', 'Система гемостаза',
    'coagulation test', 'clotting test', 'гемостаз'
  ],

  'ПЦР на коронавирус': [
    'ПЦР COVID', 'ПЦР на коронавирус', 'PCR коронавирус', 'PCR COVID',
    'COVID-19 ПЦР', 'Тест на COVID-19', 'SARS-CoV-2 ПЦР',
    'covid pcr', 'pcr test covid', 'коронавирус тест'
  ],

  'Глюкоза крови': [
    'Анализ на сахар', 'Глюкоза', 'Сахар крови', 'Глюкоза крови',
    'Глюкоза (сахар) крови', 'Анализ на сахар (глюкоза)',
    'blood sugar', 'glucose test', 'сахар анализ'
  ],

  'АЛТ (аланинаминотрансфераза)': [
    'АЛТ', 'Аланинаминотрансфераза', 'АЛАТ', 'ALT', 'АЛТ (АЛАТ)',
    'alanine aminotransferase'
  ],

  'АСТ (аспартатаминотрансфераза)': [
    'АСТ', 'Аспартатаминотрансфераза', 'АСАТ', 'AST', 'АСТ (АСАТ)',
    'aspartate aminotransferase'
  ],

  'Билирубин общий': [
    'Билирубин общий', 'Билирубин', 'Общий билирубин', 'Bilirubin total',
    'total bilirubin'
  ],

  'Билирубин прямой': [
    'Билирубин прямой', 'Прямой билирубин', 'Билирубин конъюгированный',
    'direct bilirubin'
  ],

  'Общий белок': [
    'Общий белок', 'Белок общий', 'Total protein', 'Протеин общий',
    'protein total'
  ],

  'Альбумин': ['Альбумин', 'Albumin'],

  'Мочевина': ['Мочевина', 'Urea', 'Карбамид', 'blood urea'],

  'Креатинин': ['Креатинин', 'Creatinine'],

  'Холестерин общий': [
    'Холестерин общий', 'Холестерин', 'Общий холестерин',
    'Cholesterol total', 'Холестерол',
    'total cholesterol'
  ],

  'Триглицериды': ['Триглицериды', 'Triglycerides', 'ТГ'],

  'ЛПВП (холестерин)': [
    'ЛПВП', 'Холестерин ЛПВП', 'HDL',
    'Липопротеины высокой плотности', 'hdl cholesterol'
  ],

  'ЛПНП (холестерин)': [
    'ЛПНП', 'Холестерин ЛПНП', 'LDL',
    'Липопротеины низкой плотности', 'ldl cholesterol'
  ],

  'Мочевая кислота': ['Мочевая кислота', 'Uric acid'],

  'Амилаза': ['Амилаза', 'Amylase'],

  'Липаза': ['Липаза', 'Lipase'],

  'Щелочная фосфатаза': [
    'Щелочная фосфатаза', 'ЩФ', 'ALP',
    'Alkaline phosphatase', 'alk phos'
  ],

  'Гамма-ГТ': [
    'Гамма-ГТ', 'ГГТ', 'GGT',
    'Gamma GT', 'gamma glutamyl transferase'
  ],

  'С-реактивный белок (СРБ)': [
    'СРБ', 'С-реактивный белок', 'CRP',
    'C-реактивный белок', 'C-reactive protein'
  ],

  'Ферритин': ['Ферритин', 'Ferritin'],

  'Железо сывороточное': [
    'Железо', 'Железо сывороточное', 'Сывороточное железо', 'Iron', 'serum iron'
  ],

  'Трансферрин': ['Трансферрин', 'Transferrin'],

  'Гликированный гемоглобин (HbA1c)': [
    'HbA1c', 'Гликированный гемоглобин',
    'glycated hemoglobin', 'гликозилированный гемоглобин'
  ],

  'Инсулин': ['Инсулин', 'Insulin'],

  'Кальций общий': ['Кальций', 'Ca', 'Calcium', 'Кальций общий'],

  'Калий и натрий': ['Калий', 'Натрий', 'K/Na', 'Электролиты'],

  'Магний': ['Магний', 'Mg', 'Magnesium'],

  'Фосфор': ['Фосфор', 'P', 'Phosphorus'],

  'ТТГ (тиреотропный гормон)': ['ТТГ', 'TSH', 'Thyroid stimulating hormone'],

  'Т4 свободный': ['Т4', 'FT4', 'Free T4'],

  'Т3 свободный': ['Т3', 'FT3', 'Free T3'],

  'АТ к ТПО': ['АТ к ТПО', 'Anti-TPO', 'antibodies to TPO'],

  'Пролактин': ['Пролактин', 'PRL'],

  'ФСГ': ['ФСГ', 'FSH'],

  'ЛГ': ['ЛГ', 'LH'],

  'Эстрадиол': ['Эстрадиол', 'E2'],

  'Прогестерон': ['Прогестерон'],

  'Тестостерон общий': ['Тестостерон', 'Testosterone'],

  'ХГЧ (хорионический гонадотропин)': [
    'ХГЧ', 'HCG', 'beta hcg', 'β-ХГЧ'
  ],

  'ДГЭА-С': ['ДГЭА-С', 'DHEA-S'],

  'Кортизол': ['Кортизол', 'Cortisol'],

  'Паратгормон (ПТГ)': ['ПТГ', 'PTH'],

  'Витамин D (25-OH)': [
    'Vitamin D', '25-OH D', '25(OH)D', 'Витамин D'
  ],

  'Витамин B12': ['B12', 'Vitamin B12'],

  'Фолиевая кислота': ['B9', 'Folate', 'Фолиевая кислота'],

  'ВИЧ (антитела)': ['HIV', 'ВИЧ', 'HIV test'],

  'Гепатит B (HBsAg)': ['HBsAg', 'Hepatitis B'],

  'Гепатит C (антитела)': ['Anti-HCV', 'Hepatitis C'],

  'Сифилис (RW)': ['RW', 'RPR', 'Syphilis'],

  'Токсоплазмоз IgG/IgM': ['Toxoplasma', 'Токсоплазмоз'],

  'Краснуха IgG/IgM': ['Rubella'],

  'Цитомегаловирус IgG/IgM': ['CMV'],

  'Герпес IgG/IgM': ['HSV', 'Herpes'],

  'Хеликобактер пилори (антитела)': ['H. pylori', 'Helicobacter pylori'],

  'Посев на флору': ['Culture test', 'бакпосев'],

  'Антистрептолизин-О (АСЛО)': ['ASO', 'АСЛО'],

  'Ревматоидный фактор': ['RF', 'РФ'],

  'ПСА общий (онкомаркер)': ['PSA'],

  'CA-125 (онкомаркер)': ['CA125'],

  'CA 15-3 (онкомаркер)': ['CA15-3'],

  'CA 19-9 (онкомаркер)': ['CA19-9'],

  'АФП (альфа-фетопротеин)': ['AFP'],

  'РЭА (раково-эмбриональный антиген)': ['CEA'],

  'Анализ мочи по Нечипоренко': ['Nechiporenko'],

  'Анализ мочи по Зимницкому': ['Zimnitsky'],

  'Копрограмма (анализ кала)': ['stool test', 'coprogram'],

  'Кал на скрытую кровь': ['FOBT'],

  'Кал на яйца глист': ['ova parasite', 'helminths'],

  'УЗИ брюшной полости': ['abdominal ultrasound'],

  'МРТ головного мозга': ['brain MRI'],

  'Рентген грудной клетки': ['chest X-ray'],

  'ЭКГ': ['ECG', 'EKG'],

  'УЗИ сердца (эхокардиография)': ['echo', 'echocardiography'],

  'Кольпоскопия': [],

  'Флюорография': [],

  'Гастроскопия (ФГДС)': ['EGD', 'gastroscopy'],

  'УЗИ молочных желез': [],

  'УЗИ щитовидной железы': [],

  'УЗИ органов малого таза': [],

  'УЗИ почек': [],

  'УЗИ мочевого пузыря': [],

  'УЗИ предстательной железы': [],

  'Маммография': [],

  'КТ грудной клетки': ['CT chest'],

  'МРТ позвоночника': ['spine MRI'],

  'МРТ суставов': ['joint MRI'],

  'Колоноскопия': ['colonoscopy'],

  'Цистоскопия': ['cystoscopy'],

  'Суточный мониторинг АД (СМАД)': ['ABPM'],

  'Холтер ЭКГ': ['Holter'],

  'Спирометрия': ['spirometry'],

  'Денситометрия (костная)': ['DEXA'],

  'Консультация терапевта': ['therapist'],

  'Консультация педиатра': ['pediatrician'],

  'Консультация гинеколога': ['gynecologist'],

  'Консультация дерматолога': ['dermatologist'],

  'Консультация стоматолога': ['dentist'],

  'Консультация офтальмолога': ['ophthalmologist'],

  'Консультация кардиолога': ['cardiologist'],

  'Консультация невролога': ['neurologist'],

  'Консультация хирурга': ['surgeon'],

  'Консультация ортопеда': ['orthopedist'],

  'Консультация уролога': ['urologist'],

  'Консультация эндокринолога': ['endocrinologist'],

  'Консультация психиатра': ['psychiatrist'],

  'Консультация психолога': ['psychologist'],

  'Консультация онколога': ['oncologist'],

  'Консультация пульмонолога': ['pulmonologist'],

  'Консультация гастроэнтеролога': ['gastroenterologist'],

  'Консультация ревматолога': ['rheumatologist'],

  'Консультация нефролога': ['nephrologist'],

  'Консультация аллерголога': ['allergist'],

  'Консультация ЛОР-врача': ['ENT', 'otolaryngologist'],

  'Консультация инфекциониста': ['infectious disease specialist'],

  'Консультация акушера': ['obstetrician'],

  'Консультация маммолога': ['mammologist'],

  'Консультация гематолога': ['hematologist'],

  'Скрининг беременности': ['prenatal screening'],

  'Вакцинация': ['vaccination'],

  'Физиотерапия': ['physiotherapy'],

  'Массаж лечебный': ['massage'],

  'Капельница (инфузионная терапия)': ['IV therapy'],

  'Инъекция внутримышечная': ['injection'],

  'Перевязка': ['dressing'],

  'Удаление новообразования': ['removal lesion'],

  'Чистка зубов (профессиональная)': ['cleaning teeth', 'airflow'],

  'ЛФК (лечебная физкультура)': ['physical therapy exercise'],
};


const normalize = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/* -------------------- O(1) LOOKUP MAPS -------------------- */

// service_id -> service
export const serviceById: Map<string, NormalizedService> = new Map();

// normalized service_name_norm -> service
export const serviceByName: Map<string, NormalizedService> = new Map();

// synonym -> service_id (MAIN FAST INDEX FOR PARSER)
export const synonymIndex: Map<string, string> = new Map();

// synonym -> full service object (optional convenience)
export const synonymToService: Map<string, NormalizedService> = new Map();

/* -------------------- BUILD INDEXES ON LOAD -------------------- */

for (const service of serviceCatalog) {
  serviceById.set(service.service_id, service);
  serviceByName.set(normalize(service.service_name_norm), service);
}

// Build inverted synonym index
for (const [canonicalName, synonyms] of Object.entries(serviceSynonyms)) {
  const service = serviceByName.get(normalize(canonicalName));
  if (!service) continue;

  for (const syn of synonyms) {
    const key = normalize(syn);

    // keep first match (stable + deterministic)
    if (!synonymIndex.has(key)) {
      synonymIndex.set(key, service.service_id);
      synonymToService.set(key, service);
    }
  }
}

/* -------------------- FAST MATCH API (USE IN PARSER) -------------------- */

export function matchService(input: string): NormalizedService | null {
  const key = normalize(input);

  // 1. direct synonym hit (fastest path)
  const bySyn = synonymIndex.get(key);
  if (bySyn) return serviceById.get(bySyn) || null;

  // 2. direct name hit
  const byName = serviceByName.get(key);
  if (byName) return byName;

  return null;
}

/** Resolve user search text to catalog services (synonyms + partial name match) */
export function resolveCatalogQuery(q: string): NormalizedService[] {
  const lower = q.trim().toLowerCase();
  if (!lower) return [];

  const exact = matchService(q);
  if (exact) return [exact];

  return serviceCatalog.filter(s => {
    const name = s.service_name_norm.toLowerCase();
    if (name.includes(lower)) return true;
    const syns = serviceSynonyms[s.service_name_norm] ?? [];
    return syns.some(syn => syn.toLowerCase().includes(lower));
  });
}

/* -------------------- OPTIONAL: EXPORT FLAT MAP FOR EVEN FASTER USAGE -------------------- */

export const FAST_SERVICE_INDEX: Record<string, string> = Object.fromEntries(
  synonymIndex.entries()
);