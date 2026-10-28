import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT) || 3000;

app.listen(port, '127.0.0.1', () => {
  console.log(`🌍 Terra AI Backend Server listening on http://127.0.0.1:${port}`);
  console.log(`🔐 RBAC & Auth endpoints ready at http://127.0.0.1:${port}/api/auth`);
});
