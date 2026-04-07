import { createRoot } from 'react-dom/client';
import { ServeApp } from './ServeApp';
import './styles.css';

const dateMatch = window.location.pathname.match(/(\d{4}-\d{2}-\d{2})/);
const date = dateMatch ? dateMatch[1]! : new Date().toISOString().slice(0, 10);

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<ServeApp date={date} />);
}
