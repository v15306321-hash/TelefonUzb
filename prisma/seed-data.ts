/* Initial catalog for TELEFON.UZB. Prices are in UZS and can be edited in the admin panel. */

import type { ColorOption, SpecItem } from "../src/lib/types";

export const categories = [
  { slug: "smartfony", nameRu: "Смартфоны", nameUz: "Smartfonlar", sortOrder: 10 },
  { slug: "planshety", nameRu: "Планшеты", nameUz: "Planshetlar", sortOrder: 20 },
  { slug: "aksessuary", nameRu: "Аксессуары", nameUz: "Aksessuarlar", sortOrder: 30 },
];

export const brands = [
  { slug: "apple", name: "Apple", sortOrder: 10 },
  { slug: "samsung", name: "Samsung", sortOrder: 20 },
  { slug: "xiaomi", name: "Xiaomi", sortOrder: 30 },
  { slug: "google", name: "Google", sortOrder: 40 },
  { slug: "oneplus", name: "OnePlus", sortOrder: 50 },
  { slug: "honor", name: "Honor", sortOrder: 60 },
];

export type UsedSeed = {
  currency: "UZS" | "USD";
  batteryHealth?: number;
  batteryCycles?: number;
  hasBox?: boolean;
  region?: string;
  noteRu?: string;
  noteUz?: string;
  /** installment terms for this unit, as published in the store's channel */
  offers?: { down: number; months: number; monthly: number }[];
};

type Seed = {
  slug: string;
  brand: string;
  category: string;
  nameRu: string;
  nameUz?: string;
  descriptionRu: string;
  descriptionUz: string;
  price: number;
  inStock?: boolean;
  isFeatured?: boolean;
  storage: string[];
  colors: ColorOption[];
  specs: SpecItem[];
  daysAgo: number;
  /**
   * Real product photos from prisma/seed-assets/photos. A plain name at index i belongs to colour i;
   * `{ file, color }` links a photo (e.g. another angle) to a colour index explicitly.
   */
  photos?: (string | { file: string; color: number })[];
  /** Seed photos that were replaced by better ones and should be detached. */
  retiredPhotos?: string[];
  /** Previously seeded colour lists that may be safely upgraded to `colors` (never overwrites admin edits). */
  previousColors?: ColorOption[][];
  /** Products without real photos are created hidden — publish them after uploading photos in the admin. */
  hidden?: boolean;
  /** A used unit on sale (one particular phone). Live photo files start with "live-". */
  used?: UsedSeed;
};

const s = (labelRu: string, labelUz: string, valueRu: string, valueUz = valueRu): SpecItem => ({ labelRu, labelUz, valueRu, valueUz });
const c = (nameRu: string, nameUz: string, hex: string): ColorOption => ({ nameRu, nameUz, hex });

const ios = (v: string) => s("Операционная система", "Operatsion tizim", v);
const android = (v: string) => s("Операционная система", "Operatsion tizim", v);
const sim = (ru: string, uz: string) => s("SIM-карты", "SIM-kartalar", ru, uz);

const iphoneSpecs = (screen: string, chip: string, camRu: string, camUz: string, weight: number) => [
  s("Экран", "Ekran", screen),
  s("Процессор", "Protsessor", chip),
  s("Основная камера", "Asosiy kamera", camRu, camUz),
  s("Фронтальная камера", "Old kamera", "12 Мп", "12 MP"),
  ios("iOS 26"),
  sim("nano-SIM + eSIM", "nano-SIM + eSIM"),
  s("Вес", "Og‘irligi", `${weight} г`, `${weight} g`),
];

/** Additional angles per colour: poses(["green"], "iphone-13", ["side","camera"]) → iphone-13-green-side … */
function poses(colorNames: string[], prefix: string, angles: string[], firstColor = 0) {
  return colorNames.flatMap((name, i) => angles.map((a) => ({ file: `${prefix}-${name}-${a}`, color: firstColor + i })));
}

/** Earlier studio shots that turned out to show another model (iPhone 18 Pro Max), replaced by correct 17 Pro Max photos. */
const WRONG_17_PRO_MAX = [
  "iphone-17-pro-blue",
  "iphone-17-pro-blue-side",
  "iphone-17-pro-blue-camera",
  "iphone-17-pro-black-front",
  "iphone-17-pro-black-side",
  "iphone-17-pro-black-side-v2",
  "iphone-17-pro-black-camera",
  "iphone-17-pro-burgundy-front",
  "iphone-17-pro-burgundy-side",
  "iphone-17-pro-burgundy-camera",
  "iphone-17-pro-white-side",
  "iphone-17-pro-white-camera",
];
/** Models with real product photos (shown first in the catalog). */
const photoProducts: Seed[] = [
  {
    slug: "apple-iphone-15",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 15",
    descriptionRu: "Dynamic Island, 48-Мп камера, USB-C и корпус из цветного матового стекла с алюминиевой рамкой.",
    descriptionUz: "Dynamic Island, 48 MP kamera, USB-C va alyuminiy ramkali rangli mat shisha korpus.",
    price: 10_400_000,
    isFeatured: true,
    storage: ["128 GB", "256 GB", "512 GB"],
    colors: [c("Зелёный", "Yashil", "#dfe8d4"), c("Розовый", "Pushti", "#f2d3da"), c("Чёрный", "Qora", "#3b3c3e"), c("Голубой", "Havorang", "#d4e2ea")],
    specs: iphoneSpecs('6,1" Super Retina XDR', "Apple A16 Bionic", "48 + 12 Мп", "48 + 12 MP", 171),
    daysAgo: 1,
    photos: ["iphone-15-green", "iphone-15-pink", "iphone-15-black", "iphone-15-blue"],
  },
  {
    slug: "apple-iphone-13-pro",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 13 Pro",
    descriptionRu: "Дисплей ProMotion 120 Гц, тройная камера с макросъёмкой и режимом «Киноэффект», корпус из нержавеющей стали.",
    descriptionUz: "ProMotion 120 Hz displey, makro va «Kino effekti» rejimli uchtalik kamera, zanglamas po‘lat korpus.",
    price: 9_900_000,
    isFeatured: true,
    storage: ["128 GB", "256 GB", "512 GB", "1 TB"],
    colors: [
      c("Серебристый", "Kumushrang", "#eeeeec"),
      c("Графитовый", "Grafit", "#54524f"),
      c("Золотой", "Oltinrang", "#f1e2c6"),
      c("Альпийский зелёный", "Alp yashil", "#576b55"),
      c("Небесно-голубой", "Osmon ko‘k", "#a7c1d9"),
    ],
    specs: iphoneSpecs('6,1" Super Retina XDR, ProMotion 120 Гц', "Apple A15 Bionic", "12 + 12 + 12 Мп, LiDAR", "12 + 12 + 12 MP, LiDAR", 204),
    daysAgo: 6,
    photos: ["iphone-13-pro-silver", "iphone-13-pro-graphite", "iphone-13-pro-gold", "iphone-13-pro-alpine-green", "iphone-13-pro-sierra-blue"],
  },
  {
    slug: "apple-iphone-14-pro",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 14 Pro",
    descriptionRu: "Dynamic Island, дисплей Always-On, основная камера 48 Мп и чип A16 Bionic в корпусе из нержавеющей стали.",
    descriptionUz: "Dynamic Island, Always-On displey, 48 MP asosiy kamera va zanglamas po‘lat korpusdagi A16 Bionic chipi.",
    price: 11_400_000,
    isFeatured: true,
    storage: ["128 GB", "256 GB", "512 GB", "1 TB"],
    colors: [
      c("Тёмно-фиолетовый", "To‘q binafsha", "#4f4359"),
      c("Серебристый", "Kumushrang", "#e3e3e1"),
      c("Золотой", "Oltinrang", "#e9d9bd"),
      c("Космический чёрный", "Kosmik qora", "#403e3d"),
    ],
    previousColors: [[c("Тёмно-фиолетовый", "To‘q binafsha", "#4f4359"), c("Серебристый", "Kumushrang", "#e3e3e1")]],
    specs: iphoneSpecs('6,1" Super Retina XDR, ProMotion 120 Гц, Always-On', "Apple A16 Bionic", "48 + 12 + 12 Мп, LiDAR", "48 + 12 + 12 MP, LiDAR", 206),
    daysAgo: 7,
    photos: [
      { file: "iphone-14-pro-purple-side", color: 0 },
      { file: "iphone-14-pro-purple-camera", color: 0 },
      { file: "iphone-14-pro-silver-side", color: 1 },
      { file: "iphone-14-pro-silver-camera", color: 1 },
      { file: "iphone-14-pro-gold-camera", color: 2 },
      { file: "iphone-14-pro-black-camera", color: 3 },
    ],
  },
  {
    slug: "apple-iphone-13",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 13",
    descriptionRu: "Яркий OLED-дисплей, чип A15 Bionic, двойная камера с оптической стабилизацией сдвигом матрицы.",
    descriptionUz: "Yorqin OLED displey, A15 Bionic chipi, matritsa siljishi bilan stabilizatsiyalangan ikkilik kamera.",
    price: 7_900_000,
    isFeatured: true,
    storage: ["128 GB", "256 GB", "512 GB"],
    colors: [
      c("Зелёный", "Yashil", "#394c3a"),
      c("Сияющая звезда", "Yulduzli", "#f4efe8"),
      c("Синий", "Ko‘k", "#2c5f80"),
      c("Тёмная ночь", "Qorong‘i tun", "#232a35"),
      c("(PRODUCT)RED", "(PRODUCT)RED", "#b5121f"),
    ],
    specs: iphoneSpecs('6,1" Super Retina XDR', "Apple A15 Bionic", "12 + 12 Мп", "12 + 12 MP", 173),
    daysAgo: 8,
    photos: [
      "iphone-13-green", "iphone-13-starlight", "iphone-13-blue", "iphone-13-midnight", "iphone-13-red",
      ...poses(["green", "starlight", "blue", "midnight", "red"], "iphone-13", ["side", "camera"]),
    ],
  },
  {
    slug: "apple-iphone-11",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 11",
    descriptionRu: "Проверенная классика: двойная камера со сверхширокоугольным объективом, ночной режим и чип A13 Bionic.",
    descriptionUz: "Sinalgan klassika: ultra keng burchakli ikkilik kamera, tungi rejim va A13 Bionic chipi.",
    price: 5_900_000,
    isFeatured: true,
    storage: ["64 GB", "128 GB"],
    colors: [
      c("Белый", "Oq", "#f2f0eb"),
      c("Фиолетовый", "Binafsha", "#d1c9e0"),
      c("Зелёный", "Yashil", "#c3e3d2"),
      c("Чёрный", "Qora", "#2a2a2c"),
      c("(PRODUCT)RED", "(PRODUCT)RED", "#b0182a"),
    ],
    specs: iphoneSpecs('6,1" Liquid Retina HD', "Apple A13 Bionic", "12 + 12 Мп", "12 + 12 MP", 194),
    daysAgo: 12,
    photos: [
      "iphone-11-white", "iphone-11-purple", "iphone-11-green", "iphone-11-black", "iphone-11-red",
      ...poses(["white", "purple", "green", "black", "red"], "iphone-11", ["side"]),
      ...poses(["purple", "green", "black", "red"], "iphone-11", ["camera"], 1),
    ],
  },
];

export const products: Seed[] = [
  ...photoProducts,
  {
    slug: "apple-iphone-17-pro-max",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 17 Pro Max",
    descriptionRu:
      "Самый мощный iPhone: алюминиевый корпус с системой охлаждения паровой камерой, чип A19 Pro и система из трёх 48-Мп камер с 8-кратным оптическим зумом. Самая долгая автономность среди iPhone.",
    descriptionUz:
      "Eng kuchli iPhone: bug‘ kamerali sovutish tizimiga ega alyuminiy korpus, A19 Pro chipi va 8x optik zumli uchta 48 MP kamera. iPhone’lar orasida eng uzoq avtonom ishlash.",
    price: 19_400_000,
    isFeatured: true,
    storage: ["256 GB", "512 GB", "1 TB", "2 TB"],
    colors: [c("Серебристый", "Kumushrang", "#dcdcdf"), c("Глубокий синий", "To‘q ko‘k", "#2d3a56"), c("Космический оранжевый", "Kosmik to‘q sariq", "#d9733b")],
    previousColors: [
      [c("Небесно-голубой", "Osmon ko‘k", "#a9bfd8"), c("Чёрный", "Qora", "#2b2b2d"), c("Бордовый", "Bordo", "#6b2a35"), c("Белый", "Oq", "#e9e9eb")],
      [c("Космический оранжевый", "Kosmik to‘q sariq", "#d9733b"), c("Глубокий синий", "To‘q ko‘k", "#2d3a56"), c("Серебристый", "Kumushrang", "#dcdcdf")],
    ],
    specs: [
      s("Экран", "Ekran", '6,9" Super Retina XDR, ProMotion 120 Гц', '6,9" Super Retina XDR, ProMotion 120 Hz'),
      s("Процессор", "Protsessor", "Apple A19 Pro"),
      s("Основная камера", "Asosiy kamera", "48 + 48 + 48 Мп, оптический зум 8×", "48 + 48 + 48 MP, 8x optik zum"),
      s("Фронтальная камера", "Old kamera", "18 Мп Center Stage", "18 MP Center Stage"),
      s("Аккумулятор", "Batareya", "До 37 часов видео", "37 soatgacha video"),
      ios("iOS 26"),
      sim("nano-SIM + eSIM", "nano-SIM + eSIM"),
      s("Вес", "Og‘irligi", "231 г", "231 g"),
    ],
    daysAgo: 2,
    photos: [
      ...poses(["silver"], "iphone-17-pro-max", ["front", "back", "camera"], 0),
      ...poses(["deep-blue"], "iphone-17-pro-max", ["front", "back", "camera"], 1),
      ...poses(["orange"], "iphone-17-pro-max", ["front", "back", "camera"], 2),
    ],
    retiredPhotos: WRONG_17_PRO_MAX,
  },
  {
    slug: "apple-iphone-17-pro",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 17 Pro",
    descriptionRu: "Профессиональные возможности в компактном корпусе: A19 Pro, ProMotion 120 Гц, тройная 48-Мп камера и быстрая зарядка до 50% за 20 минут.",
    descriptionUz: "Ixcham korpusdagi professional imkoniyatlar: A19 Pro, ProMotion 120 Hz, uchta 48 MP kamera va 20 daqiqada 50% gacha tez quvvatlash.",
    price: 16_900_000,
    isFeatured: true,
    storage: ["256 GB", "512 GB", "1 TB"],
    colors: [c("Глубокий синий", "To‘q ko‘k", "#2d3a56"), c("Космический оранжевый", "Kosmik to‘q sariq", "#d9733b"), c("Серебристый", "Kumushrang", "#dcdcdf")],
    specs: [
      s("Экран", "Ekran", '6,3" Super Retina XDR, ProMotion 120 Гц', '6,3" Super Retina XDR, ProMotion 120 Hz'),
      s("Процессор", "Protsessor", "Apple A19 Pro"),
      s("Основная камера", "Asosiy kamera", "48 + 48 + 48 Мп", "48 + 48 + 48 MP"),
      s("Фронтальная камера", "Old kamera", "18 Мп Center Stage", "18 MP Center Stage"),
      s("Аккумулятор", "Batareya", "До 31 часа видео", "31 soatgacha video"),
      ios("iOS 26"),
      sim("nano-SIM + eSIM", "nano-SIM + eSIM"),
      s("Вес", "Og‘irligi", "204 г", "204 g"),
    ],
    daysAgo: 3,
    hidden: true,
  },
  {
    slug: "apple-iphone-air",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone Air",
    descriptionRu: "Самый тонкий iPhone — 5,6 мм. Титановая рама, керамическое стекло Ceramic Shield 2 с двух сторон и мощный чип A19 Pro.",
    descriptionUz: "Eng yupqa iPhone — 5,6 mm. Titan ramka, ikki tomondan Ceramic Shield 2 shishasi va kuchli A19 Pro chipi.",
    price: 14_600_000,
    storage: ["256 GB", "512 GB", "1 TB"],
    colors: [c("Небесно-голубой", "Osmon ko‘k", "#c4d6e6"), c("Светлое золото", "Och oltin", "#e7d9bf"), c("Облачно-белый", "Bulutli oq", "#f0efeb"), c("Чёрный космос", "Kosmik qora", "#1d1d1f")],
    specs: [
      s("Экран", "Ekran", '6,5" Super Retina XDR, ProMotion 120 Гц', '6,5" Super Retina XDR, ProMotion 120 Hz'),
      s("Процессор", "Protsessor", "Apple A19 Pro"),
      s("Основная камера", "Asosiy kamera", "48 Мп Fusion", "48 MP Fusion"),
      s("Толщина", "Qalinligi", "5,6 мм", "5,6 mm"),
      ios("iOS 26"),
      sim("Только eSIM", "Faqat eSIM"),
      s("Вес", "Og‘irligi", "165 г", "165 g"),
    ],
    daysAgo: 4,
    photos: poses(["black"], "iphone-air", ["front", "back", "camera"], 3),
    hidden: true,
  },
  {
    slug: "apple-iphone-17",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 17",
    descriptionRu: "Теперь с ProMotion 120 Гц и Always-On, чипом A19 и 48-Мп двойной камерой. Фронтальная камера Center Stage для идеальных селфи.",
    descriptionUz: "Endi ProMotion 120 Hz va Always-On, A19 chipi va 48 MP ikkilik kamera bilan. Mukammal selfi uchun Center Stage old kamerasi.",
    price: 12_300_000,
    isFeatured: true,
    storage: ["256 GB", "512 GB"],
    colors: [c("Лавандовый", "Lavanda", "#c9c0e2"), c("Шалфей", "Shalfey", "#b6c3a9"), c("Туманно-синий", "Tumanli ko‘k", "#a8bcd0"), c("Белый", "Oq", "#f2f2f2"), c("Чёрный", "Qora", "#1f1f21")],
    specs: [
      s("Экран", "Ekran", '6,3" Super Retina XDR, ProMotion 120 Гц', '6,3" Super Retina XDR, ProMotion 120 Hz'),
      s("Процессор", "Protsessor", "Apple A19"),
      s("Основная камера", "Asosiy kamera", "48 + 48 Мп", "48 + 48 MP"),
      s("Фронтальная камера", "Old kamera", "18 Мп Center Stage", "18 MP Center Stage"),
      ios("iOS 26"),
      sim("nano-SIM + eSIM", "nano-SIM + eSIM"),
      s("Вес", "Og‘irligi", "177 г", "177 g"),
    ],
    daysAgo: 5,
    hidden: true,
  },
  {
    slug: "apple-iphone-16",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 16",
    descriptionRu: "Кнопка «Управление камерой», чип A18 и Apple Intelligence. Отличный выбор по выгодной цене.",
    descriptionUz: "«Kamera boshqaruvi» tugmasi, A18 chipi va Apple Intelligence. Qulay narxdagi ajoyib tanlov.",
    price: 9_900_000,
    storage: ["128 GB", "256 GB"],
    colors: [c("Ультрамарин", "Ultramarin", "#5f72c8"), c("Бирюзовый", "Firuza", "#8ccbc4"), c("Розовый", "Pushti", "#f2b8c9"), c("Чёрный", "Qora", "#232325")],
    specs: [
      s("Экран", "Ekran", '6,1" Super Retina XDR'),
      s("Процессор", "Protsessor", "Apple A18"),
      s("Основная камера", "Asosiy kamera", "48 + 12 Мп", "48 + 12 MP"),
      ios("iOS 26"),
      sim("nano-SIM + eSIM", "nano-SIM + eSIM"),
      s("Вес", "Og‘irligi", "170 г", "170 g"),
    ],
    daysAgo: 60,
    photos: [{ file: "iphone-16-black-back", color: 3 }],
    hidden: true,
  },
  {
    slug: "samsung-galaxy-s25-ultra",
    brand: "samsung",
    category: "smartfony",
    nameRu: "Samsung Galaxy S25 Ultra",
    descriptionRu: "Титановый флагман со встроенным S Pen, 200-Мп камерой и процессором Snapdragon 8 Elite for Galaxy. Galaxy AI для перевода звонков, фото и заметок.",
    descriptionUz: "S Pen o‘rnatilgan titan flagman, 200 MP kamera va Snapdragon 8 Elite for Galaxy protsessori. Qo‘ng‘iroqlar, rasmlar va eslatmalar uchun Galaxy AI.",
    price: 16_200_000,
    isFeatured: true,
    storage: ["256 GB", "512 GB", "1 TB"],
    colors: [c("Titanium Silverblue", "Titanium Silverblue", "#6e7c8c"), c("Titanium Black", "Titanium Black", "#2a2a2c"), c("Titanium Gray", "Titanium Gray", "#8b8884"), c("Titanium Whitesilver", "Titanium Whitesilver", "#dededd")],
    specs: [
      s("Экран", "Ekran", '6,9" Dynamic AMOLED 2X, 120 Гц', '6,9" Dynamic AMOLED 2X, 120 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 8 Elite for Galaxy"),
      s("Основная камера", "Asosiy kamera", "200 + 50 + 50 + 10 Мп", "200 + 50 + 50 + 10 MP"),
      s("Фронтальная камера", "Old kamera", "12 Мп", "12 MP"),
      s("Аккумулятор", "Batareya", "5000 мА·ч, 45 Вт", "5000 mAh, 45 W"),
      android("Android 15, One UI 7"),
      sim("2 × nano-SIM + eSIM", "2 × nano-SIM + eSIM"),
      s("Вес", "Og‘irligi", "218 г", "218 g"),
    ],
    daysAgo: 30,
    hidden: true,
  },
  {
    slug: "samsung-galaxy-s25",
    brand: "samsung",
    category: "smartfony",
    nameRu: "Samsung Galaxy S25",
    descriptionRu: "Компактный флагман с Galaxy AI, ярким 120-Гц экраном и тройной камерой с 3-кратным оптическим зумом.",
    descriptionUz: "Galaxy AI, yorqin 120 Hz ekran va 3x optik zumli uchtalik kamerali ixcham flagman.",
    price: 10_400_000,
    storage: ["128 GB", "256 GB", "512 GB"],
    colors: [c("Icyblue", "Icyblue", "#b8cbe0"), c("Navy", "Navy", "#2c3447"), c("Mint", "Mint", "#c3dbca"), c("Silver Shadow", "Silver Shadow", "#bdbdbf")],
    specs: [
      s("Экран", "Ekran", '6,2" Dynamic AMOLED 2X, 120 Гц', '6,2" Dynamic AMOLED 2X, 120 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 8 Elite for Galaxy"),
      s("Основная камера", "Asosiy kamera", "50 + 12 + 10 Мп", "50 + 12 + 10 MP"),
      s("Аккумулятор", "Batareya", "4000 мА·ч", "4000 mAh"),
      android("Android 15, One UI 7"),
      sim("2 × nano-SIM + eSIM", "2 × nano-SIM + eSIM"),
    ],
    daysAgo: 28,
    hidden: true,
  },
  {
    slug: "samsung-galaxy-a56",
    brand: "samsung",
    category: "smartfony",
    nameRu: "Samsung Galaxy A56 5G",
    descriptionRu: "Надёжный смартфон среднего класса: металлическая рамка, защита IP67, 6 лет обновлений Android.",
    descriptionUz: "Ishonchli o‘rta sinf smartfoni: metall ramka, IP67 himoya, 6 yil Android yangilanishlari.",
    price: 5_100_000,
    storage: ["128 GB", "256 GB"],
    colors: [c("Графитовый", "Grafit", "#3a3b3e"), c("Светло-серый", "Och kulrang", "#cfcfd1"), c("Оливковый", "Zaytun", "#9aa58a")],
    specs: [
      s("Экран", "Ekran", '6,7" Super AMOLED, 120 Гц', '6,7" Super AMOLED, 120 Hz'),
      s("Процессор", "Protsessor", "Exynos 1580"),
      s("Основная камера", "Asosiy kamera", "50 + 12 + 5 Мп", "50 + 12 + 5 MP"),
      s("Аккумулятор", "Batareya", "5000 мА·ч, 45 Вт", "5000 mAh, 45 W"),
      android("Android 15, One UI 7"),
    ],
    daysAgo: 45,
    hidden: true,
  },
  {
    slug: "google-pixel-10-pro",
    brand: "google",
    category: "smartfony",
    nameRu: "Google Pixel 10 Pro",
    descriptionRu: "Лучшая камера Google с ИИ-обработкой, чип Tensor G5 и 7 лет обновлений. Чистый Android и функции Gemini.",
    descriptionUz: "Sun’iy intellekt ishlovli eng yaxshi Google kamerasi, Tensor G5 chipi va 7 yil yangilanishlar. Toza Android va Gemini funksiyalari.",
    price: 13_800_000,
    inStock: false,
    storage: ["256 GB", "512 GB"],
    colors: [c("Obsidian", "Obsidian", "#222224"), c("Porcelain", "Porcelain", "#e6e1d8"), c("Moonstone", "Moonstone", "#7d8996")],
    specs: [
      s("Экран", "Ekran", '6,3" Super Actua LTPO, 120 Гц', '6,3" Super Actua LTPO, 120 Hz'),
      s("Процессор", "Protsessor", "Google Tensor G5"),
      s("Основная камера", "Asosiy kamera", "50 + 48 + 48 Мп", "50 + 48 + 48 MP"),
      s("Аккумулятор", "Batareya", "4870 мА·ч", "4870 mAh"),
      android("Android 16"),
    ],
    daysAgo: 20,
    hidden: true,
  },
  {
    slug: "google-pixel-10",
    brand: "google",
    category: "smartfony",
    nameRu: "Google Pixel 10",
    descriptionRu: "Pixel с телеобъективом 5× впервые в базовой модели, Tensor G5 и яркий дисплей Actua.",
    descriptionUz: "Bazaviy modelda ilk bor 5x teleob’ektivli Pixel, Tensor G5 va yorqin Actua displeyi.",
    price: 9_600_000,
    storage: ["128 GB", "256 GB"],
    colors: [c("Indigo", "Indigo", "#3a3e70"), c("Frost", "Frost", "#cddfe8"), c("Lemongrass", "Lemongrass", "#d5dd86"), c("Obsidian", "Obsidian", "#222224")],
    specs: [
      s("Экран", "Ekran", '6,3" Actua OLED, 120 Гц', '6,3" Actua OLED, 120 Hz'),
      s("Процессор", "Protsessor", "Google Tensor G5"),
      s("Основная камера", "Asosiy kamera", "48 + 13 + 10,8 Мп", "48 + 13 + 10,8 MP"),
      android("Android 16"),
    ],
    daysAgo: 21,
    hidden: true,
  },
  {
    slug: "xiaomi-15-ultra",
    brand: "xiaomi",
    category: "smartfony",
    nameRu: "Xiaomi 15 Ultra",
    descriptionRu: "Камерофон с оптикой Leica: 1-дюймовый сенсор, перископ 200 Мп и профессиональные режимы съёмки.",
    descriptionUz: "Leica optikali kamerafon: 1 dyuymli sensor, 200 MP periskop va professional suratga olish rejimlari.",
    price: 15_600_000,
    isFeatured: true,
    storage: ["512 GB", "1 TB"],
    colors: [c("Чёрный", "Qora", "#1c1c1d"), c("Белый", "Oq", "#eeeeec"), c("Silver Chrome", "Silver Chrome", "#b7b7ba")],
    specs: [
      s("Экран", "Ekran", '6,73" LTPO AMOLED, 120 Гц', '6,73" LTPO AMOLED, 120 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 8 Elite"),
      s("Основная камера", "Asosiy kamera", "50 (1″) + 50 + 50 + 200 Мп, Leica", "50 (1″) + 50 + 50 + 200 MP, Leica"),
      s("Аккумулятор", "Batareya", "5410 мА·ч, 90 Вт", "5410 mAh, 90 W"),
      android("Android 15, HyperOS 2"),
    ],
    daysAgo: 35,
    hidden: true,
  },
  {
    slug: "xiaomi-15",
    brand: "xiaomi",
    category: "smartfony",
    nameRu: "Xiaomi 15",
    descriptionRu: "Компактный флагман с камерами Leica и Snapdragon 8 Elite.",
    descriptionUz: "Leica kameralari va Snapdragon 8 Elite bilan ixcham flagman.",
    price: 10_200_000,
    storage: ["256 GB", "512 GB"],
    colors: [c("Зелёный", "Yashil", "#59795f"), c("Белый", "Oq", "#efefed"), c("Чёрный", "Qora", "#1f1f20")],
    specs: [
      s("Экран", "Ekran", '6,36" AMOLED, 120 Гц', '6,36" AMOLED, 120 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 8 Elite"),
      s("Основная камера", "Asosiy kamera", "50 + 50 + 60 Мп, Leica", "50 + 50 + 60 MP, Leica"),
      android("Android 15, HyperOS 2"),
    ],
    daysAgo: 40,
    hidden: true,
  },
  {
    slug: "redmi-note-14-pro-plus",
    brand: "xiaomi",
    category: "smartfony",
    nameRu: "Redmi Note 14 Pro+ 5G",
    descriptionRu: "200-Мп камера, зарядка 120 Вт и защита IP68 по доступной цене.",
    descriptionUz: "200 MP kamera, 120 W quvvatlash va IP68 himoya — hamyonbop narxda.",
    price: 4_700_000,
    storage: ["256 GB", "512 GB"],
    colors: [c("Aurora Purple", "Aurora Purple", "#8b7ab7"), c("Midnight Black", "Midnight Black", "#1e1e20"), c("Frost Blue", "Frost Blue", "#a8c3db")],
    specs: [
      s("Экран", "Ekran", '6,67" AMOLED, 120 Гц', '6,67" AMOLED, 120 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 7s Gen 3"),
      s("Основная камера", "Asosiy kamera", "200 + 8 + 2 Мп", "200 + 8 + 2 MP"),
      s("Аккумулятор", "Batareya", "5110 мА·ч, 120 Вт", "5110 mAh, 120 W"),
      android("Android 14, HyperOS"),
    ],
    daysAgo: 70,
    hidden: true,
  },
  {
    slug: "oneplus-13",
    brand: "oneplus",
    category: "smartfony",
    nameRu: "OnePlus 13",
    descriptionRu: "Флагман с камерами Hasselblad, аккумулятором 6000 мА·ч и быстрой зарядкой 100 Вт.",
    descriptionUz: "Hasselblad kameralari, 6000 mAh batareya va 100 W tez quvvatlashli flagman.",
    price: 10_900_000,
    storage: ["256 GB", "512 GB"],
    colors: [c("Midnight Ocean", "Midnight Ocean", "#1f2c43"), c("Black Eclipse", "Black Eclipse", "#1a1a1b"), c("Arctic Dawn", "Arctic Dawn", "#e8e6e0")],
    specs: [
      s("Экран", "Ekran", '6,82" LTPO AMOLED, 120 Гц', '6,82" LTPO AMOLED, 120 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 8 Elite"),
      s("Основная камера", "Asosiy kamera", "50 + 50 + 50 Мп, Hasselblad", "50 + 50 + 50 MP, Hasselblad"),
      s("Аккумулятор", "Batareya", "6000 мА·ч, 100 Вт", "6000 mAh, 100 W"),
      android("Android 15, OxygenOS 15"),
    ],
    daysAgo: 50,
    hidden: true,
  },
  {
    slug: "honor-magic7-pro",
    brand: "honor",
    category: "smartfony",
    nameRu: "Honor Magic7 Pro",
    descriptionRu: "Перископ 200 Мп, кремний-углеродный аккумулятор и ИИ-функции MagicOS.",
    descriptionUz: "200 MP periskop, kremniy-uglerodli batareya va MagicOS sun’iy intellekt funksiyalari.",
    price: 11_500_000,
    inStock: false,
    storage: ["512 GB"],
    colors: [c("Чёрный", "Qora", "#202022"), c("Лунная тень", "Oy soyasi", "#8f9398")],
    specs: [
      s("Экран", "Ekran", '6,8" LTPO OLED, 120 Гц', '6,8" LTPO OLED, 120 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 8 Elite"),
      s("Основная камера", "Asosiy kamera", "50 + 50 + 200 Мп", "50 + 50 + 200 MP"),
      s("Аккумулятор", "Batareya", "5270 мА·ч, 100 Вт", "5270 mAh, 100 W"),
      android("Android 15, MagicOS 9"),
    ],
    daysAgo: 55,
    hidden: true,
  },
  {
    slug: "apple-ipad-pro-11-m5",
    brand: "apple",
    category: "planshety",
    nameRu: 'Apple iPad Pro 11" (M5)',
    descriptionRu: "Невероятно тонкий iPad Pro с дисплеем Ultra Retina XDR (Tandem OLED) и чипом M5.",
    descriptionUz: "Ultra Retina XDR (Tandem OLED) displeyi va M5 chipiga ega nihoyatda yupqa iPad Pro.",
    price: 16_400_000,
    isFeatured: true,
    storage: ["256 GB", "512 GB", "1 TB"],
    colors: [c("Чёрный космос", "Kosmik qora", "#2b2b2d"), c("Серебристый", "Kumushrang", "#e2e3e5")],
    specs: [
      s("Экран", "Ekran", '11" Ultra Retina XDR, ProMotion 120 Гц', '11" Ultra Retina XDR, ProMotion 120 Hz'),
      s("Процессор", "Protsessor", "Apple M5"),
      s("Камера", "Kamera", "12 Мп, LiDAR", "12 MP, LiDAR"),
      ios("iPadOS 26"),
      s("Вес", "Og‘irligi", "444 г", "444 g"),
    ],
    daysAgo: 10,
    hidden: true,
  },
  {
    slug: "apple-ipad-air-13-m3",
    brand: "apple",
    category: "planshety",
    nameRu: 'Apple iPad Air 13" (M3)',
    descriptionRu: "Большой экран Liquid Retina и производительность чипа M3 для учёбы, работы и творчества.",
    descriptionUz: "O‘qish, ish va ijod uchun katta Liquid Retina ekrani va M3 chipi unumdorligi.",
    price: 12_100_000,
    storage: ["128 GB", "256 GB", "512 GB"],
    colors: [c("Синий", "Ko‘k", "#a5bbd2"), c("Фиолетовый", "Binafsha", "#c7bfdc"), c("Сияющая звезда", "Yulduzli", "#ebe3d5"), c("Серый космос", "Kosmik kulrang", "#5c5d61")],
    specs: [
      s("Экран", "Ekran", '13" Liquid Retina'),
      s("Процессор", "Protsessor", "Apple M3"),
      s("Камера", "Kamera", "12 Мп", "12 MP"),
      ios("iPadOS 26"),
    ],
    daysAgo: 25,
    hidden: true,
  },
  {
    slug: "samsung-galaxy-tab-s10-fe",
    brand: "samsung",
    category: "planshety",
    nameRu: "Samsung Galaxy Tab S10 FE",
    descriptionRu: "Планшет с S Pen в комплекте, защитой IP68 и экраном 10,9 дюйма.",
    descriptionUz: "To‘plamda S Pen, IP68 himoya va 10,9 dyuymli ekranli planshet.",
    price: 6_300_000,
    storage: ["128 GB", "256 GB"],
    colors: [c("Серый", "Kulrang", "#55575c"), c("Серебристый", "Kumushrang", "#cfd0d3"), c("Голубой", "Havorang", "#a9c0d8")],
    specs: [
      s("Экран", "Ekran", '10,9" LCD, 90 Гц', '10,9" LCD, 90 Hz'),
      s("Процессор", "Protsessor", "Exynos 1580"),
      s("Аккумулятор", "Batareya", "8000 мА·ч", "8000 mAh"),
      android("Android 15, One UI 7"),
    ],
    daysAgo: 65,
    hidden: true,
  },
  {
    slug: "xiaomi-pad-7",
    brand: "xiaomi",
    category: "planshety",
    nameRu: "Xiaomi Pad 7",
    descriptionRu: "Экран 3,2K 144 Гц, Snapdragon 7+ Gen 3 и металлический корпус.",
    descriptionUz: "3,2K 144 Hz ekran, Snapdragon 7+ Gen 3 va metall korpus.",
    price: 4_500_000,
    storage: ["128 GB", "256 GB"],
    colors: [c("Графитовый", "Grafit", "#3b3c40"), c("Голубой", "Havorang", "#b3c8dc"), c("Зелёный", "Yashil", "#a9bfa8")],
    specs: [
      s("Экран", "Ekran", '11,2" 3,2K LCD, 144 Гц', '11,2" 3,2K LCD, 144 Hz'),
      s("Процессор", "Protsessor", "Snapdragon 7+ Gen 3"),
      s("Аккумулятор", "Batareya", "8850 мА·ч", "8850 mAh"),
      android("Android 15, HyperOS 2"),
    ],
    daysAgo: 80,
    hidden: true,
  },
];


/* ------------------------------------------------------------------------------------------ */
/* Used phones currently on sale (from the store's Telegram channel). Prices in USD unless noted. */

const SPEC_17_PRO_MAX = [
  s("Экран", "Ekran", '6,9" Super Retina XDR, ProMotion 120 Гц', '6,9" Super Retina XDR, ProMotion 120 Hz'),
  s("Процессор", "Protsessor", "Apple A19 Pro"),
  s("Основная камера", "Asosiy kamera", "48 + 48 + 48 Мп, оптический зум 8×", "48 + 48 + 48 MP, 8x optik zum"),
  s("Фронтальная камера", "Old kamera", "18 Мп Center Stage", "18 MP Center Stage"),
];
const SPEC_16_PRO_MAX = [
  s("Экран", "Ekran", '6,9" Super Retina XDR, ProMotion 120 Гц', '6,9" Super Retina XDR, ProMotion 120 Hz'),
  s("Процессор", "Protsessor", "Apple A18 Pro"),
  s("Основная камера", "Asosiy kamera", "48 + 48 + 12 Мп, оптический зум 5×", "48 + 48 + 12 MP, 5x optik zum"),
];
const SPEC_16_PRO = [
  s("Экран", "Ekran", '6,3" Super Retina XDR, ProMotion 120 Гц', '6,3" Super Retina XDR, ProMotion 120 Hz'),
  s("Процессор", "Protsessor", "Apple A18 Pro"),
  s("Основная камера", "Asosiy kamera", "48 + 48 + 12 Мп, оптический зум 5×", "48 + 48 + 12 MP, 5x optik zum"),
];
const SPEC_16 = [
  s("Экран", "Ekran", '6,1" Super Retina XDR'),
  s("Процессор", "Protsessor", "Apple A18"),
  s("Основная камера", "Asosiy kamera", "48 + 12 Мп", "48 + 12 MP"),
];
const SPEC_14_PRO_MAX = [
  s("Экран", "Ekran", '6,7" Super Retina XDR, ProMotion 120 Гц', '6,7" Super Retina XDR, ProMotion 120 Hz'),
  s("Процессор", "Protsessor", "Apple A16 Bionic"),
  s("Основная камера", "Asosiy kamera", "48 + 12 + 12 Мп, оптический зум 3×", "48 + 12 + 12 MP, 3x optik zum"),
];
const SPEC_12_PRO = [
  s("Экран", "Ekran", '6,1" Super Retina XDR'),
  s("Процессор", "Protsessor", "Apple A14 Bionic"),
  s("Основная камера", "Asosiy kamera", "12 + 12 + 12 Мп, LiDAR", "12 + 12 + 12 MP, LiDAR"),
];
const SPEC_A17 = [
  s("Экран", "Ekran", '6,7" Super AMOLED, 90 Гц', '6,7" Super AMOLED, 90 Hz'),
  s("Основная камера", "Asosiy kamera", "50 Мп", "50 MP"),
  s("Аккумулятор", "Batareya", "5000 мА·ч", "5000 mA·soat"),
];

const DEEP_BLUE = c("Глубокий синий", "To‘q ko‘k", "#2d3a56");
const SILVER = c("Серебристый", "Kumushrang", "#dcdcdf");

const used = (
  slug: string,
  brand: string,
  nameRu: string,
  storage: string,
  color: ColorOption,
  price: number,
  specs: SpecItem[],
  u: UsedSeed,
  photos: string[],
  daysAgo: number,
  inStock = true,
  retiredPhotos: string[] = [],
): Seed => ({
  slug,
  brand,
  category: "smartfony",
  nameRu,
  descriptionRu: "",
  descriptionUz: "",
  price,
  inStock,
  isFeatured: inStock,
  storage: [storage],
  colors: [color],
  specs,
  daysAgo,
  photos: photos.map((file) => ({ file, color: 0 })),
  retiredPhotos,
  used: u,
});

const studio17 = (color: string) => ["front", "back", "camera"].map((a) => `iphone-17-pro-max-${color}-${a}`);

export const listings: Seed[] = [
  used(
    "iphone-16-pro-max-256-desert-940",
    "apple",
    "Apple iPhone 16 Pro Max 256 GB",
    "256 GB",
    c("Пустынный титан", "Sahro titani", "#c8b09a"),
    940,
    SPEC_16_PRO_MAX,
    { currency: "USD", batteryHealth: 93, hasBox: true, region: "X/A", offers: [{ down: 400, months: 3, monthly: 219 }, { down: 400, months: 6, monthly: 129 }] },
    ["live-iphone-16-pro-max-desert-940", "iphone-16-pro-desert-front", "iphone-16-pro-desert-back"],
    0,
  ),
  used(
    "iphone-17-pro-max-256-deep-blue-1190",
    "apple",
    "Apple iPhone 17 Pro Max 256 GB",
    "256 GB",
    DEEP_BLUE,
    1190,
    SPEC_17_PRO_MAX,
    { currency: "USD", batteryHealth: 97, hasBox: true, region: "AF/A (SIM + eSIM)", offers: [{ down: 600, months: 3, monthly: 236 }, { down: 600, months: 6, monthly: 138 }] },
    ["live-iphone-17-pro-max-deep-blue-1190", ...studio17("deep-blue")],
    0,
  ),
  used(
    "iphone-17-pro-max-256-silver-1330",
    "apple",
    "Apple iPhone 17 Pro Max 256 GB",
    "256 GB",
    SILVER,
    1330,
    SPEC_17_PRO_MAX,
    { currency: "USD", batteryHealth: 99, batteryCycles: 125, hasBox: true, region: "AF/A", offers: [{ down: 600, months: 3, monthly: 295 }, { down: 600, months: 6, monthly: 175 }] },
    ["live-iphone-17-pro-max-silver-1330", ...studio17("silver")],
    1,
    true,
    WRONG_17_PRO_MAX,
  ),
  used(
    "iphone-17-pro-max-256-silver-1290",
    "apple",
    "Apple iPhone 17 Pro Max 256 GB",
    "256 GB",
    SILVER,
    1290,
    SPEC_17_PRO_MAX,
    { currency: "USD", batteryHealth: 96, hasBox: true, region: "ZA/A", offers: [{ down: 550, months: 3, monthly: 299 }, { down: 250, months: 6, monthly: 175 }] },
    ["live-iphone-17-pro-max-silver-1290", ...studio17("silver")],
    2,
    true,
    WRONG_17_PRO_MAX,
  ),
  used(
    "iphone-16-pro-max-256-black-890",
    "apple",
    "Apple iPhone 16 Pro Max 256 GB",
    "256 GB",
    c("Чёрный титан", "Qora titan", "#3c3c3e"),
    890,
    SPEC_16_PRO_MAX,
    { currency: "USD", batteryHealth: 89, hasBox: true, region: "VC/A", offers: [{ down: 400, months: 3, monthly: 199 }, { down: 400, months: 6, monthly: 115 }] },
    ["live-iphone-16-pro-max-black-890", "iphone-16-pro-max-black-front", "iphone-16-pro-max-black-back"],
    3,
  ),
  used(
    "iphone-16-pro-128-desert-780",
    "apple",
    "Apple iPhone 16 Pro 128 GB",
    "128 GB",
    c("Пустынный титан", "Sahro titani", "#c8b09a"),
    780,
    SPEC_16_PRO,
    { currency: "USD", batteryHealth: 89, hasBox: true, region: "X/A", offers: [{ down: 350, months: 3, monthly: 175 }, { down: 350, months: 6, monthly: 101 }] },
    ["live-iphone-16-pro-desert-780", "iphone-16-pro-desert-front", "iphone-16-pro-desert-back"],
    4,
  ),
  used(
    "iphone-16-128-black-680",
    "apple",
    "Apple iPhone 16 128 GB",
    "128 GB",
    c("Чёрный", "Qora", "#232325"),
    680,
    SPEC_16,
    { currency: "USD", batteryHealth: 92, hasBox: true, region: "ZD/A", offers: [{ down: 300, months: 3, monthly: 155 }, { down: 300, months: 6, monthly: 89 }] },
    ["live-iphone-16-black-680", "iphone-16-black-back"],
    5,
  ),
  used(
    "iphone-14-pro-max-128-purple-530",
    "apple",
    "Apple iPhone 14 Pro Max 128 GB",
    "128 GB",
    c("Тёмно-фиолетовый", "To‘q binafsha", "#4b3f5c"),
    530,
    SPEC_14_PRO_MAX,
    { currency: "USD", batteryHealth: 77, hasBox: true, region: "ZP/A", offers: [{ down: 250, months: 3, monthly: 115 }, { down: 250, months: 6, monthly: 66 }] },
    ["live-iphone-14-pro-max-purple-530", "iphone-14-pro-max-purple-front", "iphone-14-pro-purple-side", "iphone-14-pro-purple-camera"],
    6,
  ),
  used(
    "iphone-12-pro-128-pacific-blue-330",
    "apple",
    "Apple iPhone 12 Pro 128 GB",
    "128 GB",
    c("Тихоокеанский синий", "Tinch okeani ko‘k", "#2f4f64"),
    330,
    SPEC_12_PRO,
    {
      currency: "USD",
      batteryHealth: 75,
      hasBox: true,
      region: "LL/A",
      noteRu: "Почти идеальное",
      noteUz: "Deyarli ideal",
      offers: [{ down: 200, months: 3, monthly: 55 }],
    },
    ["live-iphone-12-pro-pacific-blue-330"],
    7,
  ),
  used(
    "samsung-galaxy-a17-128-black",
    "samsung",
    "Samsung Galaxy A17 6/128 GB",
    "6/128 GB",
    c("Чёрный", "Qora", "#1f1f21"),
    1_950_000,
    SPEC_A17,
    { currency: "UZS", hasBox: true, region: "Вьетнам", noteRu: "Хорошее", noteUz: "Yaxshi" },
    ["live-galaxy-a17-black", "galaxy-a17-black-front", "galaxy-a17-black-back", "galaxy-a17-black-side"],
    8,
    false, // sold
  ),
];

/* ------------------------------------------------------------------------------------------ */
/*
 * Photo templates: hidden models that keep white-background photos of models not on sale right now.
 * In the admin, "Из библиотеки" picks these photos for a new used unit of the same model and colour.
 * Price 0 = not for sale; set a price before publishing.
 */
export const photoTemplates: Seed[] = [
  {
    slug: "apple-iphone-14",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 14",
    descriptionRu: "",
    descriptionUz: "",
    price: 0,
    storage: ["128 GB", "256 GB", "512 GB"],
    colors: [c("Жёлтый", "Sariq", "#f9e479"), c("Фиолетовый", "Binafsha", "#e5ddea"), c("Тёмная ночь", "Tun", "#2e3642"), c("Сияющая звезда", "Yulduz nuri", "#f0ebe3")],
    specs: [
      s("Экран", "Ekran", '6,1" Super Retina XDR'),
      s("Процессор", "Protsessor", "Apple A15 Bionic"),
      s("Основная камера", "Asosiy kamera", "12 + 12 Мп", "12 + 12 MP"),
    ],
    daysAgo: 400,
    photos: [
      { file: "iphone-14-yellow-front", color: 0 },
      { file: "iphone-14-purple-front", color: 1 },
      { file: "iphone-14-midnight-front", color: 2 },
      { file: "iphone-14-starlight-front", color: 3 },
    ],
    hidden: true,
  },
  {
    slug: "apple-iphone-15-pro",
    brand: "apple",
    category: "smartfony",
    nameRu: "Apple iPhone 15 Pro",
    descriptionRu: "",
    descriptionUz: "",
    price: 0,
    storage: ["128 GB", "256 GB", "512 GB", "1 TB"],
    colors: [c("Белый титан", "Oq titan", "#f2f1ed"), c("Чёрный титан", "Qora titan", "#3b3b3d"), c("Натуральный титан", "Tabiiy titan", "#bab4a9"), c("Синий титан", "Ko‘k titan", "#3f4a5a")],
    specs: [
      s("Экран", "Ekran", '6,1" Super Retina XDR, ProMotion 120 Гц', '6,1" Super Retina XDR, ProMotion 120 Hz'),
      s("Процессор", "Protsessor", "Apple A17 Pro"),
      s("Основная камера", "Asosiy kamera", "48 + 12 + 12 Мп, оптический зум 3×", "48 + 12 + 12 MP, 3x optik zum"),
    ],
    daysAgo: 300,
    photos: [
      ...poses(["white"], "iphone-15-pro", ["front", "back"], 0),
      ...poses(["black"], "iphone-15-pro", ["front", "back"], 1),
      ...poses(["natural"], "iphone-15-pro", ["front", "back"], 2),
      ...poses(["blue"], "iphone-15-pro", ["front", "back"], 3),
    ],
    hidden: true,
  },
];
