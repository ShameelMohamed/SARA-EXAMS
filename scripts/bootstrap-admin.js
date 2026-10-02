import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBf1avDrA-yiJn9SwzI_fOiSBQHBJyYtDU",
  authDomain: "sara-exams.firebaseapp.com",
  projectId: "sara-exams",
  storageBucket: "sara-exams.firebasestorage.app",
  messagingSenderId: "207063629440",
  appId: "1:207063629440:web:963e9ca48ae80f88ab7065",
  measurementId: "G-9C8K4803X3"
};

const adminEmailArg = process.argv[2];

if (!adminEmailArg) {
  console.error('Error: Please provide an admin email address.');
  console.log('Usage: node scripts/bootstrap-admin.js <admin-email@example.com>');
  process.exit(1);
}

const normalizedEmail = adminEmailArg.trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
  console.error('Error: Invalid email address format:', adminEmailArg);
  process.exit(1);
}

console.log('Initializing Firebase app for project:', firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function bootstrapAdmin() {
  try {
    console.log('Granting ADMIN role to document: authorized_roles/' + normalizedEmail);
    const docRef = doc(db, 'authorized_roles', normalizedEmail);
    await setDoc(docRef, {
      email: normalizedEmail,
      role: 'ADMIN',
      active: true,
      assignedBy: 'DEVELOPMENT_BOOTSTRAP',
      assignedAt: new Date().toISOString()
    }, { merge: true });

    console.log('Successfully authorized ' + normalizedEmail + ' as ADMIN in Firestore.');
    console.log('You can now sign in with Google using ' + normalizedEmail + ' to access the Admin Dashboard.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to bootstrap admin role in Firestore:');
    console.error(err);
    process.exit(1);
  }
}

bootstrapAdmin();
