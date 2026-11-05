import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const app = getApps().length === 0 ? initializeApp({ projectId: 'demo-department-agenda' }) : getApps()[0];
const db = getFirestore(app);

async function checkCounts() {
  const collections = ['departments', 'employees', 'locations', 'organizers', 'categories', 'activities', 'publicActivities', 'settings', 'auditLogs'];
  console.log('--- FIRESTORE EMULATOR COLLECTION COUNTS ---');
  const counts = {};
  for (const col of collections) {
    const snap = await db.collection(col).get();
    counts[col] = snap.size;
    console.log(`  ${col.padEnd(20)}: ${snap.size} documents`);
  }
  return counts;
}

checkCounts().catch(console.error);
