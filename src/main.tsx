import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { detectV1Data, migrateV1Data, initializeDatabaseWithSampleData } from './lib/migrate/v1Migrator';

async function bootstrap() {
  try {
    const hasV1 = await detectV1Data();
    if (hasV1) {
      console.log('Detected legacy resolve-one-prototype-v1 data. Running migration...');
      const report = await migrateV1Data();
      console.log('Migration report:', report);
    } else {
      await initializeDatabaseWithSampleData();
    }
  } catch (err) {
    console.error('Initialization error:', err);
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
