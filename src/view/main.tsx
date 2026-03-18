import { createRoot } from 'react-dom/client';
import App from './App';
import type { ScheduleData } from './types';
import './styles.css';

declare global {
  interface Window {
    __SCHEDULE__: ScheduleData;
  }
}

const data = window.__SCHEDULE__;
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App data={data} />);
}
