import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';

const DebugPage = () => {
  const [firebaseStatus, setFirebaseStatus] = useState('Checking Firebase...');

  useEffect(() => {
    if (auth && db) {
      setFirebaseStatus('Firebase initialized successfully.');
    } else {
      setFirebaseStatus('Firebase initialization failed.');
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '16px' }}>Syncademy Debug Page</h1>
      <p style={{ marginBottom: '12px' }}>
        <strong>Firebase status:</strong> {firebaseStatus}
      </p>
      <p style={{ marginBottom: '12px' }}>
        <strong>Auth mode:</strong> {auth ? 'Ready' : 'Unavailable'}
      </p>
      <p style={{ marginBottom: '12px' }}>
        <strong>Firestore mode:</strong> {db ? 'Ready' : 'Unavailable'}
      </p>
      <p style={{ marginTop: '24px', maxWidth: '760px', lineHeight: 1.6, color: '#cbd5e1' }}>
        This page confirms the frontend Firebase integration is active and no backend URL is required for the new Syncademy app.
      </p>
    </div>
  );
};

export default DebugPage;
