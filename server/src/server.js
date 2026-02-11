import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT || 80);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
