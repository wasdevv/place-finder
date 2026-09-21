import mongoose from 'mongoose';
import Place from './place.js';
import { connect } from './db.js';
import { placeInput } from './validation.js';

const places = [
  { name: 'Gulberg Care Pharmacy', alternateName: 'گلبرگ کیئر فارمیسی', address: '12 Main Boulevard', neighborhood: 'Gulberg III', city: 'Lahore', lat: 31.5169, lng: 74.3436, phone: '+92 42 3575 1100', hours: 'Mon–Sat: 8am–11pm\nSun: 10am–8pm', rating: 4.6, tags: ['24/7', 'Parking', 'Delivery'] },
  { name: 'Liberty Health Store', alternateName: 'لبرٹی ہیلتھ اسٹور', address: '44 Liberty Market', neighborhood: 'Gulberg III', city: 'Lahore', lat: 31.5106, lng: 74.3440, phone: '+92 42 3571 2200', hours: 'Daily: 9am–10pm', rating: 4.3, tags: ['AC', 'Card Payment'] },
  { name: 'Hussain Chowk Medicos', alternateName: 'حسین چوک میڈیکوز', address: '7 MM Alam Road', neighborhood: 'Gulberg II', city: 'Lahore', lat: 31.5146, lng: 74.3534, phone: '+92 42 3587 3300', hours: 'Daily: 24 hours', rating: 4.8, tags: ['24/7', 'Delivery'] },
  { name: 'Garden Town Pharmacy', alternateName: 'گارڈن ٹاؤن فارمیسی', address: '3 Barkat Market', neighborhood: 'Garden Town', city: 'Lahore', lat: 31.5035, lng: 74.3263, phone: '+92 42 3584 4400', hours: 'Mon–Sat: 9am–10pm', rating: 4.1, tags: ['Parking', 'AC'] },
  { name: 'Nabipura Family Chemist', alternateName: 'نبی پورہ فیملی کیمسٹ', address: '18 Gurumangat Road', neighborhood: 'Nabipura', city: 'Lahore', lat: 31.5220, lng: 74.3598, phone: '+92 42 3576 5500', hours: 'Daily: 8am–midnight', rating: 3.9, tags: ['Delivery'] },
  { name: 'Kabootarpura Clinic Pharmacy', address: '9 Tipu Road', neighborhood: 'Kabootarpura', city: 'Lahore', lat: 31.5104, lng: 74.3589, phone: '+92 42 3570 6600', hours: 'Mon–Fri: 9am–9pm', rating: 4.4, tags: ['Wheelchair Access', 'AC'] },
  { name: 'Walton Road Drug Mart', alternateName: 'والٹن روڈ ڈرگ مارٹ', address: '61 Walton Road', neighborhood: 'Cantt', city: 'Lahore', lat: 31.4990, lng: 74.3530, phone: '+92 42 3662 7700', hours: 'Daily: 10am–10pm', rating: 4.0, tags: ['Parking'] },
  { name: 'Model Town Wellness', address: '2 Link Road', neighborhood: 'Model Town', city: 'Lahore', lat: 31.4834, lng: 74.3244, phone: '+92 42 3583 8800', hours: 'Daily: 9am–11pm', rating: 4.7, tags: ['24/7', 'Parking', 'Delivery'] },
];

if (!process.argv.includes('--replace')) {
  console.error('This deletes every place first. Run with --replace to confirm: npm run seed -- --replace');
  process.exit(1);
}

try {
  await connect();
  await Place.syncIndexes();
  await Place.deleteMany({});
  const inserted = await Place.insertMany(places.map(placeInput));
  console.log(`Inserted ${inserted.length} places`);
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
