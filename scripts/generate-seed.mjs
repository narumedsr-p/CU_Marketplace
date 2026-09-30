#!/usr/bin/env node
// Regenerates scripts/dev-seed.sql with a large, realistic-looking demo dataset:
// ~160 student users, 1000 catalog items across 7 categories (mix of Available/
// Reserved/Sold), and matching Order rows for items that already have a deal
// in progress or completed. Run with: node scripts/generate-seed.mjs
//
// Images are not scraped from a live marketplace: hotlinking third-party CDN
// images (e.g. Shopee) is unreliable (referer-blocked) and copyright-encumbered.
// Instead each item gets 1-3 Picsum placeholder photos, seeded per item so the
// same item always renders the same images.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "dev-seed.sql");
const TOTAL_NEW_ITEMS = 1000; // all generated, all with photos
const TOTAL_NEW_USERS = 150; // + 11 existing = 161

// ---------- seeded RNG so re-running this script produces a stable diff ----------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260930);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pickSome = (arr, n) => {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
};
const int = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const chance = (p) => rng() < p;
const roundPrice = (n) => Math.round(n / 10) * 10;
const sqlEscape = (s) => s.replace(/'/g, "''");
const hex = (n) => n.toString(16).padStart(12, "0");

function itemUuid(n) {
  return `11000000-0000-0000-0000-${hex(n)}`;
}
function userUuid(n) {
  return `00000000-0000-0000-0000-000000000${n.toString().padStart(3, "0")}`;
}
function orderUuid(n) {
  return `20000000-0000-0000-0000-${hex(n)}`;
}

// ---------- categories (fixed UUIDs already used by scripts/dev-seed.sql) ----------
const CATEGORIES = {
  Electronics: "c0000000-0000-0000-0000-000000000001",
  Books: "c0000000-0000-0000-0000-000000000002",
  Apparel: "c0000000-0000-0000-0000-000000000003",
  Home: "c0000000-0000-0000-0000-000000000004",
  Stationery: "c0000000-0000-0000-0000-000000000005",
  Sports: "c0000000-0000-0000-0000-000000000006",
  Other: "c0000000-0000-0000-0000-000000000007",
};

// ---------- users ----------
const FIRST_NAMES = [
  "Poon", "Kannawich", "Sirawit", "Panat", "Ploy", "Tanapat", "Mint", "Beam", "Ice", "Fah",
  "Nattapong", "Chayanit", "Pattarapon", "Warinthorn", "Kittipat", "Natcha", "Pimchanok", "Thanaphon",
  "Suphakit", "Onnicha", "Krittin", "Pichaya", "Nutchanon", "Sasipim", "Teerapat", "Yanisa", "Chonlada",
  "Pawarit", "Kamolwan", "Natthaphong", "Siripat", "Aunchisa", "Peerapat", "Rungtiwa", "Thitiwat",
  "Warisara", "Chananya", "Nont", "Praewa", "Korn", "Suchanya", "Apiwat", "Nanticha", "Jirayu",
  "Kittisak", "Supitcha", "Watcharapol", "Ratchanok", "Danupon", "Thanyarat", "Kasidit", "Phailin",
  "Chaiyapruek", "Napassorn", "Pongsakorn", "Kanyarat", "Sittichai", "Orawan", "Nutthawut", "Saranya",
  "Ekapop", "Chutima", "Phumipat", "Wannisa", "Thossaphon", "Ratree", "Chatchai", "Pimjai", "Anucha",
  "Duangkamol", "Wirote", "Kessuda", "Tossapon", "Napat", "Rinrada", "Athitaya", "Chalermchai",
];
const LAST_NAMES = [
  "Supawasuwat", "Munsak", "Longjun", "Lorchatchawankul", "Wanichkul", "Chaiyo", "Rojanasakul",
  "Suksawat", "Thanawat", "Ratchanon", "Boonmee", "Srisawat", "Techapaiboon", "Kittikachorn",
  "Pattanasiri", "Wongsathit", "Amornrat", "Chaiwong", "Phromma", "Suthiwan", "Kraisorn", "Damrongsak",
  "Vachiravarakarn", "Phetcharat", "Anantasin", "Rungruang", "Thepsuriya", "Kittiwattanakul",
  "Sangthong", "Panyawiwat", "Charoensuk", "Wattanapanit", "Sirisawat", "Pongpanich", "Kaewmanee",
  "Maneerat", "Chotirosniramit", "Thongsuk", "Aksaranan", "Boonyarat",
];
const FACULTIES = [
  "Engineering", "Commerce and Accountancy", "Arts", "Medicine", "Law", "Science", "Architecture",
  "Economics", "Political Science", "Education", "Communication Arts", "Dentistry", "Nursing",
  "Pharmaceutical Sciences", "Allied Health Sciences",
];

function buildUserRows() {
  const rows = [];
  const usedNames = new Set();
  for (let i = 0; i < TOTAL_NEW_USERS; i++) {
    const n = 111 + i; // continues after existing seed-101..110
    let name;
    do {
      name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);
    const email = `seed-${n}@student.chula.ac.th`;
    rows.push({ id: userUuid(n), email, name });
  }
  return rows;
}

// ---------- item catalogs ----------
const ELECTRONICS = [
  { name: "iPhone 11", price: [5500, 8500], variants: ["64GB", "128GB"], colors: ["ดำ", "ขาว", "แดง", "เขียว"] },
  { name: "iPhone 12", price: [8000, 12000], variants: ["64GB", "128GB", "256GB"], colors: ["ดำ", "ขาว", "ฟ้า", "ม่วง"] },
  { name: "iPhone 13", price: [11000, 16000], variants: ["128GB", "256GB"], colors: ["ชมพู", "ฟ้า", "เที่ยงคืน", "สตาร์ไลท์"] },
  { name: "iPhone 13 Pro", price: [16000, 22000], variants: ["128GB", "256GB"], colors: ["เงิน", "ทอง", "กราไฟต์"] },
  { name: "iPhone 14", price: [17000, 23000], variants: ["128GB", "256GB"], colors: ["ม่วง", "ฟ้า", "เหลือง"] },
  { name: "iPhone SE (2022)", price: [6500, 9500], variants: ["64GB", "128GB"], colors: ["ดำ", "ขาว", "แดง"] },
  { name: "Samsung Galaxy S21", price: [7000, 10500], variants: ["128GB", "256GB"], colors: ["ม่วง", "เทา"] },
  { name: "Samsung Galaxy S22", price: [9500, 14000], variants: ["128GB", "256GB"], colors: ["ดำ", "ขาว", "ชมพู"] },
  { name: "Samsung Galaxy A54", price: [6000, 8500], variants: ["128GB", "256GB"], colors: ["ดำ", "ม่วง", "เขียว"] },
  { name: "MacBook Air M1", price: [19000, 26000], variants: ["256GB SSD", "512GB SSD"], colors: ["สีเงิน", "สเปซเกรย์", "สีทอง"] },
  { name: "MacBook Air M2", price: [27000, 35000], variants: ["256GB SSD", "512GB SSD"], colors: ["สีเงิน", "มิดไนท์", "สตาร์ไลท์"] },
  { name: 'MacBook Pro 13" M1', price: [24000, 32000], variants: ["256GB SSD", "512GB SSD"], colors: ["สีเงิน", "สเปซเกรย์"] },
  { name: "iPad 9th Gen", price: [7500, 10000], variants: ["64GB", "256GB"], colors: ["สเปซเกรย์", "สีเงิน"] },
  { name: "iPad Air 5", price: [15000, 20000], variants: ["64GB", "256GB"], colors: ["สีฟ้า", "สีชมพู", "สตาร์ไลท์"] },
  { name: 'iPad Pro 11"', price: [22000, 30000], variants: ["128GB", "256GB"], colors: ["สีเงิน", "สเปซเกรย์"] },
  { name: "Nintendo Switch OLED", price: [8500, 10500], variants: [""], colors: ["สีขาว", "นีออน"] },
  { name: "Nintendo Switch Lite", price: [4500, 6000], variants: [""], colors: ["สีเทา", "เทอร์ควอยซ์", "สีเหลือง"] },
  { name: "AirPods Pro 2", price: [5500, 7500], variants: [""], colors: ["สีขาว"] },
  { name: "AirPods 3", price: [3800, 5200], variants: [""], colors: ["สีขาว"] },
  { name: "Sony WH-1000XM4", price: [6000, 8500], variants: [""], colors: ["สีดำ", "สีเงิน"] },
  { name: "JBL Flip 6", price: [1800, 2800], variants: [""], colors: ["สีดำ", "สีฟ้า", "สีแดง"] },
  { name: "Logitech MX Master 3", price: [1500, 2400], variants: [""], colors: ["สีดำ"] },
  { name: "Anker PowerCore 20000mAh", price: [600, 1100], variants: [""], colors: ["สีดำ"] },
  { name: "Canon EOS M50 Mark II", price: [13000, 18000], variants: [""], colors: ["สีดำ"] },
  { name: "Apple Watch SE", price: [6000, 8500], variants: ["40mm", "44mm"], colors: ["สีเงิน", "สเปซเกรย์"] },
  { name: "Kindle Paperwhite", price: [2500, 3800], variants: ["8GB"], colors: ["สีดำ"] },
  { name: 'Dell 24" IPS Monitor', price: [2500, 4000], variants: [""], colors: [""] },
  { name: "Keychron K2", price: [1800, 2800], variants: [""], colors: ["สีขาว", "สีดำ"] },
  { name: "Wacom Intuos S", price: [1200, 1900], variants: [""], colors: [""] },
  { name: "Xbox Series S", price: [8500, 10500], variants: ["512GB"], colors: ["สีขาว"] },
];

const BOOK_COURSES = [
  "Calculus I", "Calculus II", "Linear Algebra", "General Physics I", "General Physics II",
  "General Chemistry", "Organic Chemistry", "Introductory Biology", "Principles of Economics",
  "Macroeconomics", "Microeconomics", "Financial Accounting", "Business Law", "Introduction to Programming (Python)",
  "Data Structures and Algorithms", "Discrete Mathematics", "Statistics for Engineers", "Thai Civilization",
  "English for Communication", "Anatomy Atlas", "Pharmacology", "Research Methodology",
  "Marketing Management", "Organizational Behavior", "Constitutional Law",
];
const BOOK_EXTRAS = ["", " + เฉลยแบบฝึกหัด", " + สรุปเนื้อหาก่อนสอบ", " (ฉบับพิมพ์ล่าสุด)", " international edition"];

const APPAREL = [
  { name: "เสื้อคณะวิศวะ", price: [200, 450], sizes: ["S", "M", "L", "XL"] },
  { name: "เสื้อคณะพาณิชย์ฯ", price: [200, 450], sizes: ["S", "M", "L", "XL"] },
  { name: "เสื้อคณะอักษรศาสตร์", price: [200, 450], sizes: ["S", "M", "L"] },
  { name: "เสื้อคณะแพทยศาสตร์", price: [250, 500], sizes: ["S", "M", "L", "XL"] },
  { name: "เสื้อกิจกรรมรับน้อง", price: [150, 350], sizes: ["S", "M", "L", "XL"] },
  { name: "เสื้อกันหนาวมหาลัย", price: [350, 650], sizes: ["M", "L", "XL"] },
  { name: "แจ็คเก็ตยีนส์", price: [400, 800], sizes: ["S", "M", "L"] },
  { name: "กางเกงยีนส์ Levi's", price: [500, 1200], sizes: ["28", "30", "32", "34"] },
  { name: "รองเท้าผ้าใบ Nike", price: [1200, 2800], sizes: ["39", "40", "41", "42", "43"] },
  { name: "รองเท้าผ้าใบ Adidas", price: [1100, 2600], sizes: ["38", "39", "40", "41", "42"] },
  { name: "รองเท้าผ้าใบ Converse", price: [800, 1600], sizes: ["37", "38", "39", "40"] },
  { name: "กระเป๋าเป้ Anello", price: [500, 1100], sizes: ["ใบเดียว"] },
  { name: "กระเป๋าเป้ Herschel", price: [900, 1800], sizes: ["ใบเดียว"] },
  { name: "เดรสลำลอง", price: [250, 600], sizes: ["S", "M", "L"] },
  { name: "หมวกแก๊ปมหาลัย", price: [150, 300], sizes: ["ฟรีไซส์"] },
  { name: "เข็มขัดหนัง", price: [200, 450], sizes: ["ฟรีไซส์"] },
];

const HOME = [
  { name: "โคมไฟตั้งโต๊ะ USB-C", price: [150, 350] },
  { name: "พัดลมตั้งพื้น Hatari", price: [350, 750] },
  { name: "พัดลมตั้งโต๊ะ mini", price: [150, 350] },
  { name: "หม้อหุงข้าวไฟฟ้า", price: [300, 700] },
  { name: "กระทะไฟฟ้าอเนกประสงค์", price: [400, 900] },
  { name: "เครื่องฟอกอากาศขนาดเล็ก", price: [800, 2200] },
  { name: "ผ้าห่มขนแกะ", price: [200, 450] },
  { name: "หมอนหนุนเมมโมรี่โฟม", price: [250, 550] },
  { name: "ที่นอนเป่าลม", price: [400, 900] },
  { name: "ชั้นวางหนังสือไม้", price: [350, 800] },
  { name: "โต๊ะพับอเนกประสงค์", price: [400, 900] },
  { name: "เก้าอี้สำนักงานเบาะนุ่ม", price: [900, 2500] },
  { name: "ม่านกันแสงห้องหอ", price: [300, 650] },
  { name: "พรมปูพื้นห้องขนาดเล็ก", price: [200, 500] },
  { name: "ไมโครเวฟขนาดเล็ก", price: [800, 1800] },
  { name: "กาต้มน้ำไฟฟ้า", price: [250, 550] },
  { name: "ตู้เก็บของพลาสติก 3 ชั้น", price: [350, 700] },
  { name: "ราวตากผ้าพับได้", price: [200, 450] },
];

const STATIONERY = [
  { name: "เซ็ตปากกาเจล Muji", price: [80, 200] },
  { name: "สมุดโน้ต Moleskine", price: [250, 550] },
  { name: "เครื่องคิดเลข Casio fx-991", price: [400, 650] },
  { name: "กระดาษกราฟ A4 แพ็ค", price: [50, 120] },
  { name: "ชุดสีไม้ 24 สี", price: [150, 350] },
  { name: "ชุดสีน้ำ 18 สี", price: [200, 450] },
  { name: "แฟ้มเอกสารรวมเล่ม", price: [80, 200] },
  { name: "ที่เย็บกระดาษ + ลวดเย็บ", price: [60, 150] },
  { name: "ไวท์บอร์ดขนาดเล็ก", price: [200, 450] },
  { name: "กระเป๋าดินสอผ้า", price: [80, 200] },
  { name: "เซ็ตเครื่องเขียนเรขาคณิต", price: [100, 250] },
  { name: "สติกเกอร์โน้ต Post-it แพ็คใหญ่", price: [60, 150] },
  { name: "ไม้บรรทัดเหล็ก 30 ซม.", price: [40, 100] },
  { name: "ปากกาไฮไลท์เซ็ต 6 สี", price: [70, 160] },
  { name: "กระดานรองเขียน คลิปบอร์ด", price: [90, 200] },
];

const SPORTS = [
  { name: "จักรยานพับ", price: [2500, 6000] },
  { name: "จักรยานเสือหมอบมือสอง", price: [4500, 12000] },
  { name: "ลูกฟุตบอล Mikasa", price: [400, 900] },
  { name: "ลูกบาสเก็ตบอล Spalding", price: [500, 1100] },
  { name: "รองเท้าวิ่ง Nike", price: [1200, 2600] },
  { name: "รองเท้าวิ่ง Adidas", price: [1100, 2400] },
  { name: "เสื่อโยคะ", price: [200, 500] },
  { name: "ดัมเบลปรับน้ำหนักคู่", price: [700, 1800] },
  { name: "ไม้แบดมินตัน Yonex", price: [900, 2200] },
  { name: "ไม้เทนนิส Wilson", price: [1200, 2800] },
  { name: "สเก็ตบอร์ด", price: [700, 1600] },
  { name: "เชือกกระโดดปรับน้ำหนัก", price: [150, 350] },
  { name: "ถุงมือฟิตเนส", price: [150, 350] },
  { name: "เป้สะพายฟิตเนส", price: [400, 900] },
  { name: "ลูกเทนนิสแพ็ค 3 ลูก", price: [100, 250] },
];

const OTHER = [
  { name: "ตั๋วคอนเสิร์ตศิลปินเกาหลี (โอนสิทธิ์)", price: [1500, 4500] },
  { name: "ฟิกเกอร์การ์ตูนสะสม", price: [500, 1800] },
  { name: "ตุ๊กตาบีนแบก", price: [200, 600] },
  { name: "กล้องฟิล์ม", price: [800, 2500] },
  { name: "กีตาร์โปร่งมือสอง", price: [1800, 4500] },
  { name: "คีย์บอร์ดไฟฟ้า (ดนตรี) 61 คีย์", price: [2500, 6000] },
  { name: "บอร์ดเกม Catan", price: [800, 1600] },
  { name: "การ์ดเกมสะสม", price: [300, 1200] },
  { name: "โมเดลรถของสะสม", price: [400, 1200] },
  { name: "พวงกุญแจของสะสม เซ็ต", price: [150, 400] },
  { name: "สติกเกอร์แพ็คของสะสม", price: [80, 200] },
  { name: "ยูคูเลเล่มือสอง", price: [600, 1500] },
];

const USAGE_PHRASES = [
  "ใช้งานมา 2 เดือน", "ใช้งานมา 6 เดือน", "ใช้งานมาเกือบ 1 ปี", "ใช้งานมา 2 ปี",
  "ของใหม่ยังไม่แกะกล่อง", "ซื้อมาไม่ได้ใช้ ของใหม่ 100%", "มือสองสภาพดี ใช้งานน้อยมาก",
  "ใช้งานเป็นหลักในการเรียน", "ใช้แค่ช่วงสอบเทอมเดียว",
];
const CONDITION_PHRASES = [
  "ไม่มีตำหนิ", "มีรอยใช้งานเล็กน้อยตามอายุ ไม่กระทบการใช้งาน", "สภาพสวย ดูแลอย่างดีมาตลอด",
  "ทำงาน/ใช้งานได้ปกติทุกจุด", "ล้างทำความสะอาดมาให้พร้อมใช้แล้ว", "เก็บในที่แห้ง ไม่มีกลิ่นอับ",
];
const REASON_PHRASES = [
  "ย้ายไปเรียนต่างประเทศเลยต้องปล่อย", "เปลี่ยนไปใช้รุ่นใหม่แล้วของเก่าเลยว่าง",
  "ไม่ได้ใช้แล้วอยากส่งต่อให้คนที่ต้องการ", "ซื้อผิดขนาด/สเปกเลยต้องขายต่อ",
  "เคลียร์ของก่อนย้ายหอ", "จบการศึกษาแล้วไม่ได้ใช้ต่อ", "ได้ของซ้ำมาเลยขายตัวที่ไม่ได้ใช้",
];
const MEETUP_PHRASES = [
  "นัดรับได้ที่ลานหน้าคณะ", "ส่งฟรีในเขตจุฬาฯ", "นัดรับแถว BTS สยาม",
  "ส่งทาง Kerry เก็บเงินปลายทางได้", "นัดเจอในมหาลัยเท่านั้นเพื่อความปลอดภัย", "สะดวกนัดรับตอนเย็นวันธรรมดา",
];

function composeDescription() {
  const parts = [pick(USAGE_PHRASES), pick(CONDITION_PHRASES)];
  if (chance(0.6)) parts.push(pick(REASON_PHRASES));
  parts.push(pick(MEETUP_PHRASES));
  return sqlEscape(parts.join(" "));
}

function pictureUrls(seedKey) {
  const n = int(1, 3);
  const urls = [];
  for (let i = 1; i <= n; i++) {
    urls.push(`https://picsum.photos/seed/cu-${seedKey}-${i}/800/800`);
  }
  return urls;
}

function buildElectronicsItem() {
  const base = pick(ELECTRONICS);
  const variant = pick(base.variants);
  const color = pick(base.colors);
  const title = [base.name, variant, color].filter(Boolean).join(" ") + (chance(0.85) ? " มือสอง" : "");
  const price = roundPrice(int(base.price[0], base.price[1]));
  return { title: sqlEscape(title), price };
}
function buildBookItem() {
  const course = pick(BOOK_COURSES);
  const extra = pick(BOOK_EXTRAS);
  const cond = chance(0.5) ? "สภาพดี ไม่มีรอยขีดเขียน" : "มีเน้นข้อความบางบท";
  const title = `หนังสือ ${course}${extra}`;
  const price = roundPrice(int(150, 900));
  return { title: sqlEscape(title), price, conditionHint: cond };
}
function buildApparelItem() {
  const base = pick(APPAREL);
  const size = pick(base.sizes);
  const title = `${base.name} ไซส์ ${size}`;
  const price = roundPrice(int(base.price[0], base.price[1]));
  return { title: sqlEscape(title), price };
}
function buildSimpleItem(catalog) {
  const base = pick(catalog);
  const price = roundPrice(int(base.price[0], base.price[1]));
  return { title: sqlEscape(base.name), price };
}

const CATEGORY_WEIGHTS = [
  { key: "Electronics", count: 253, build: buildElectronicsItem },
  { key: "Books", count: 203, build: buildBookItem },
  { key: "Apparel", count: 192, build: buildApparelItem },
  { key: "Home", count: 112, build: () => buildSimpleItem(HOME) },
  { key: "Stationery", count: 101, build: () => buildSimpleItem(STATIONERY) },
  { key: "Sports", count: 91, build: () => buildSimpleItem(SPORTS) },
  { key: "Other", count: 48, build: () => buildSimpleItem(OTHER) },
];

// The actual dev's real Chula OAuth login, so browsing the app while logged in
// as this account shows a populated "my listings" / "my orders" history instead
// of an empty state.
const REAL_USER = {
  id: "051eb702-1d79-47a7-ba78-9001ea9b9fd3",
  email: "6731328921@student.chula.ac.th",
  name: "Narumedsr Pitayachamrat",
};
const REAL_USER_SELLER_COUNTS = { Available: 10, Reserved: 4, Sold: 6 };
const REAL_USER_BUYER_ORDER_COUNT = 15;

function attachRealUser(items, orders) {
  const byStatus = { Available: [], Reserved: [], Sold: [] };
  items.forEach((it, idx) => byStatus[it.status].push(idx));
  const orderByItemId = new Map(orders.map((o) => [o.itemId, o]));
  const touchedItemIds = [];
  const touchedOrderIds = [];

  for (const [status, count] of Object.entries(REAL_USER_SELLER_COUNTS)) {
    for (const idx of pickSome(byStatus[status], count)) {
      const it = items[idx];
      it.sellerId = REAL_USER.id;
      touchedItemIds.push(it.id);
      const order = orderByItemId.get(it.id);
      if (order) {
        order.sellerId = REAL_USER.id;
        touchedOrderIds.push(order.id);
      }
    }
  }

  const buyerCandidates = orders.filter((o) => o.sellerId !== REAL_USER.id);
  for (const o of pickSome(buyerCandidates, REAL_USER_BUYER_ORDER_COUNT)) {
    o.buyerId = REAL_USER.id;
    touchedOrderIds.push(o.id);
  }
  return { touchedItemIds, touchedOrderIds: [...new Set(touchedOrderIds)] };
}

function pickStatus() {
  const r = rng();
  if (r < 0.65) return "Available";
  if (r < 0.75) return "Reserved";
  return "Sold";
}

function buildItemsAndOrders(users) {
  const items = [];
  const orders = [];
  let itemCounter = 1;
  let orderCounter = 1;

  for (const cat of CATEGORY_WEIGHTS) {
    for (let i = 0; i < cat.count; i++) {
      const built = cat.build();
      const seller = pick(users);
      const status = pickStatus();
      const daysAgo = int(0, 200);
      const hoursAgo = int(0, 23);
      const id = itemUuid(itemCounter++);
      items.push({
        id,
        sellerId: seller.id,
        categoryId: CATEGORIES[cat.key],
        title: built.title,
        description: composeDescription(),
        price: built.price,
        status,
        images: pictureUrls(id.slice(-8)),
        daysAgo,
        hoursAgo,
      });

      if (status === "Sold" || status === "Reserved") {
        let buyer;
        do {
          buyer = pick(users);
        } while (buyer.id === seller.id);
        const orderDaysAgo = Math.max(0, daysAgo - int(1, Math.max(1, daysAgo)));
        const agreedPrice = chance(0.3) ? roundPrice(built.price * (1 - int(2, 8) / 100)) : built.price;
        orders.push({
          id: orderUuid(orderCounter++),
          buyerId: buyer.id,
          sellerId: seller.id,
          itemId: id,
          agreedPrice,
          status: status === "Sold" ? "Completed" : "Pending",
          qrToken: `qr_${id.slice(-8)}`,
          daysAgo: orderDaysAgo,
          completed: status === "Sold",
        });
      } else if (chance(0.03)) {
        // a deal that fell through, item went back on the market
        let buyer;
        do {
          buyer = pick(users);
        } while (buyer.id === seller.id);
        const orderDaysAgo = Math.max(0, daysAgo - int(1, Math.max(1, daysAgo)));
        orders.push({
          id: orderUuid(orderCounter++),
          buyerId: buyer.id,
          sellerId: seller.id,
          itemId: id,
          agreedPrice: built.price,
          status: "Cancelled",
          qrToken: null,
          daysAgo: orderDaysAgo,
          completed: false,
        });
      }
    }
  }
  return { items, orders };
}

// ---------- SQL rendering ----------
function renderCategorySql() {
  return `\\connect cu_catalog_db

INSERT INTO "Category" (category_id, name, updated_at) VALUES
  ('${CATEGORIES.Electronics}', 'Electronics', now()),
  ('${CATEGORIES.Books}', 'Books', now()),
  ('${CATEGORIES.Apparel}', 'Apparel', now()),
  ('${CATEGORIES.Home}', 'Home', now()),
  ('${CATEGORIES.Stationery}', 'Stationery', now()),
  ('${CATEGORIES.Sports}', 'Sports', now()),
  ('${CATEGORIES.Other}', 'Other', now())
ON CONFLICT (category_id) DO NOTHING;
`;
}

function renderItemsSql(items) {
  const values = items
    .map((it) => {
      const imgArray = `ARRAY[${it.images.map((u) => `'${u}'`).join(", ")}]::text[]`;
      const created = `now() - interval '${it.daysAgo} days' - interval '${it.hoursAgo} hours'`;
      return `  ('${it.id}', '${it.sellerId}', '${it.categoryId}', '${it.title}', '${it.description}', ${it.price.toFixed(2)}, '${it.status}', ${imgArray}, ${created}, now())`;
    })
    .join(",\n");
  return `INSERT INTO "Item" (item_id, seller_id, category_id, title, description, price, status, image_urls, created_at, updated_at) VALUES
${values}
ON CONFLICT (item_id) DO NOTHING;
`;
}

const HANDWRITTEN_USERS_SQL = `\\connect cu_profile_db

INSERT INTO "UserProfile" (user_id, email, display_name, avatar_url, contact_info, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'seed-001@student.chula.ac.th', 'Poonnawit Supawasuwat', '', 'seed-001@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000101', 'seed-101@student.chula.ac.th', 'Kannawich Munsak', '', 'seed-101@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000102', 'seed-102@student.chula.ac.th', 'Sirawit Longjun', '', 'seed-102@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000103', 'seed-103@student.chula.ac.th', 'Narumedsr Pitayachamrat', '', 'seed-103@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000104', 'seed-104@student.chula.ac.th', 'Panat Lorchatchawankul', '', 'seed-104@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000105', 'seed-105@student.chula.ac.th', 'Ploy Wanichkul', '', 'seed-105@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000106', 'seed-106@student.chula.ac.th', 'Tanapat Chaiyo', '', 'seed-106@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000107', 'seed-107@student.chula.ac.th', 'Mint Rojanasakul', '', 'seed-107@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000108', 'seed-108@student.chula.ac.th', 'Beam Suksawat', '', 'seed-108@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000109', 'seed-109@student.chula.ac.th', 'Ice Thanawat', '', 'seed-109@student.chula.ac.th', now()),
  ('00000000-0000-0000-0000-000000000110', 'seed-110@student.chula.ac.th', 'Fah Ratchanon', '', 'seed-110@student.chula.ac.th', now())
ON CONFLICT DO NOTHING;
`;

function renderNewUsersSql(users) {
  const values = users
    .map((u) => `  ('${u.id}', '${u.email}', '${sqlEscape(u.name)}', '', '${u.email}', now())`)
    .join(",\n");
  return `INSERT INTO "UserProfile" (user_id, email, display_name, avatar_url, contact_info, updated_at) VALUES
${values}
ON CONFLICT DO NOTHING;
`;
}

function renderOrdersSql(orders) {
  if (orders.length === 0) return "";
  const values = orders
    .map((o) => {
      const created = `now() - interval '${o.daysAgo} days'`;
      const completedAt = o.completed ? `now() - interval '${o.daysAgo} days' + interval '2 hours'` : "NULL";
      const qr = o.qrToken ? `'${o.qrToken}'` : "NULL";
      return `  ('${o.id}', '${o.buyerId}', '${o.sellerId}', '${o.itemId}', ${o.agreedPrice.toFixed(2)}, '${o.status}', ${qr}, ${created}, now(), ${completedAt})`;
    })
    .join(",\n");
  return `\\connect cu_order_db

INSERT INTO "Order" (order_id, buyer_id, seller_id, item_id, agreed_price, status, qr_token, created_at, updated_at, completed_at) VALUES
${values}
ON CONFLICT (order_id) DO NOTHING;
`;
}

// ---------- main ----------
const newUsers = buildUserRows();
const allUsers = [
  { id: "00000000-0000-0000-0000-000000000001" },
  ...["101", "102", "103", "104", "105", "106", "107", "108", "109", "110"].map((n) => ({
    id: `00000000-0000-0000-0000-000000000${n}`,
  })),
  ...newUsers,
];
const { items, orders } = buildItemsAndOrders(allUsers);
const { touchedItemIds, touchedOrderIds } = attachRealUser(items, orders);

const REAL_USER_SQL = `INSERT INTO "UserProfile" (user_id, email, display_name, avatar_url, contact_info, updated_at) VALUES
  ('${REAL_USER.id}', '${REAL_USER.email}', '${sqlEscape(REAL_USER.name)}', '', '${REAL_USER.email}', now())
ON CONFLICT DO NOTHING;
`;

const sql = [
  "-- Generated by scripts/generate-seed.mjs -- do not hand-edit the generated sections.",
  "-- Re-run: node scripts/generate-seed.mjs",
  "",
  renderCategorySql(),
  renderItemsSql(items),
  HANDWRITTEN_USERS_SQL,
  renderNewUsersSql(newUsers),
  REAL_USER_SQL,
  renderOrdersSql(orders),
].join("\n");

writeFileSync(OUT_PATH, sql);
console.log(`Wrote ${OUT_PATH}`);
console.log(`Users: ${allUsers.length} (11 existing + ${newUsers.length} new)`);
console.log(`Items: ${items.length} (all generated, all with photos)`);
console.log(`Orders: ${orders.length}`);
const statusCounts = items.reduce((acc, it) => ((acc[it.status] = (acc[it.status] || 0) + 1), acc), {});
console.log("Item status breakdown (generated items only):", statusCounts);
console.log(`Real user (${REAL_USER.email}) touched item_ids:`, touchedItemIds.join(","));
console.log(`Real user (${REAL_USER.email}) touched order_ids:`, touchedOrderIds.join(","));
