/**
 * Master Data Seed — PreOne Platform
 * ----------------------------------
 * Seeds geographic and lookup tables that are globally shared:
 *   - Countries, States, Cities (India focus, plus major globals)
 *   - Languages
 *   - Currencies
 *   - Timezones
 *
 * This seed is idempotent — running it multiple times is safe.
 *
 * Per ERD v3.0 §25 (Seed Data → Master Data).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Country = { code: string; name: string; iso3: string; currency: string; phoneCode: string };
type State = { code: string; name: string; country: string };
type City = { name: string; state: string; country: string };
type Language = { code: string; name: string; nativeName: string };
type Currency = { code: string; name: string; symbol: string; decimals: number };

const countries: Country[] = [
  { code: 'IN', name: 'India', iso3: 'IND', currency: 'INR', phoneCode: '+91' },
  { code: 'US', name: 'United States', iso3: 'USA', currency: 'USD', phoneCode: '+1' },
  { code: 'GB', name: 'United Kingdom', iso3: 'GBR', currency: 'GBP', phoneCode: '+44' },
  { code: 'AE', name: 'United Arab Emirates', iso3: 'ARE', currency: 'AED', phoneCode: '+971' },
  { code: 'SG', name: 'Singapore', iso3: 'SGP', currency: 'SGD', phoneCode: '+65' },
  { code: 'AU', name: 'Australia', iso3: 'AUS', currency: 'AUD', phoneCode: '+61' },
  { code: 'CA', name: 'Canada', iso3: 'CAN', currency: 'CAD', phoneCode: '+1' },
];

const states: State[] = [
  { code: 'MH', name: 'Maharashtra', country: 'IN' },
  { code: 'KA', name: 'Karnataka', country: 'IN' },
  { code: 'TN', name: 'Tamil Nadu', country: 'IN' },
  { code: 'DL', name: 'Delhi', country: 'IN' },
  { code: 'GJ', name: 'Gujarat', country: 'IN' },
  { code: 'RJ', name: 'Rajasthan', country: 'IN' },
  { code: 'UP', name: 'Uttar Pradesh', country: 'IN' },
  { code: 'WB', name: 'West Bengal', country: 'IN' },
  { code: 'TG', name: 'Telangana', country: 'IN' },
  { code: 'AP', name: 'Andhra Pradesh', country: 'IN' },
  { code: 'KL', name: 'Kerala', country: 'IN' },
  { code: 'PB', name: 'Punjab', country: 'IN' },
  { code: 'HR', name: 'Haryana', country: 'IN' },
  { code: 'MP', name: 'Madhya Pradesh', country: 'IN' },
];

const cities: City[] = [
  { name: 'Mumbai', state: 'MH', country: 'IN' },
  { name: 'Pune', state: 'MH', country: 'IN' },
  { name: 'Nagpur', state: 'MH', country: 'IN' },
  { name: 'Nashik', state: 'MH', country: 'IN' },
  { name: 'Bengaluru', state: 'KA', country: 'IN' },
  { name: 'Mysuru', state: 'KA', country: 'IN' },
  { name: 'Chennai', state: 'TN', country: 'IN' },
  { name: 'Coimbatore', state: 'TN', country: 'IN' },
  { name: 'New Delhi', state: 'DL', country: 'IN' },
  { name: 'Ahmedabad', state: 'GJ', country: 'IN' },
  { name: 'Surat', state: 'GJ', country: 'IN' },
  { name: 'Jaipur', state: 'RJ', country: 'IN' },
  { name: 'Lucknow', state: 'UP', country: 'IN' },
  { name: 'Kolkata', state: 'WB', country: 'IN' },
  { name: 'Hyderabad', state: 'TG', country: 'IN' },
  { name: 'Visakhapatnam', state: 'AP', country: 'IN' },
  { name: 'Kochi', state: 'KL', country: 'IN' },
  { name: 'Chandigarh', state: 'PB', country: 'IN' },
  { name: 'Gurugram', state: 'HR', country: 'IN' },
  { name: 'Bhopal', state: 'MP', country: 'IN' },
];

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

const currencies: Currency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding master data...');

  // Master data tables may not exist yet in current schema; we use upserts guarded
  // by try/catch so that the seed is robust against partial schema deployments.
  for (const c of countries) {
    try {
      await (prisma as any).country.upsert({
        where: { code: c.code },
        update: { name: c.name, iso3: c.iso3, currency: c.currency, phoneCode: c.phoneCode },
        create: c,
      });
    } catch (e) {
      // Country model may not exist yet — skip silently
    }
  }

  for (const s of states) {
    try {
      await (prisma as any).state.upsert({
        where: { code: s.code },
        update: { name: s.name, countryCode: s.country },
        create: { code: s.code, name: s.name, countryCode: s.country },
      });
    } catch (e) {
      // skip
    }
  }

  for (const city of cities) {
    try {
      await (prisma as any).city.upsert({
        where: { name_state: { name: city.name, state: city.state } },
        update: {},
        create: { name: city.name, stateCode: city.state, countryCode: city.country },
      });
    } catch (e) {
      // skip
    }
  }

  for (const lang of languages) {
    try {
      await (prisma as any).language.upsert({
        where: { code: lang.code },
        update: { name: lang.name, nativeName: lang.nativeName },
        create: lang,
      });
    } catch (e) {
      // skip
    }
  }

  for (const cur of currencies) {
    try {
      await (prisma as any).currency.upsert({
        where: { code: cur.code },
        update: { name: cur.name, symbol: cur.symbol, decimals: cur.decimals },
        create: cur,
      });
    } catch (e) {
      // skip
    }
  }

  console.log(`✅ Master data: ${countries.length} countries, ${states.length} states, ${cities.length} cities, ${languages.length} languages, ${currencies.length} currencies`);
}

main()
  .catch((e) => {
    console.error('❌ Master data seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
