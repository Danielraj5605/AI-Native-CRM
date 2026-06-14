require('dotenv').config();
const express = require('express');

const customersRouter = require('./routes/customers');
const segmentsRouter = require('./routes/segments');
const campaignsRouter = require('./routes/campaigns');
const receiptsRouter = require('./routes/receipts');
const dashboardRouter = require('./routes/dashboard');
const aiRouter = require('./routes/ai');

const app = express();
app.use(express.json());

// Allow frontend on port 3000 to call backend on 3001
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api/customers', customersRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/ai',        aiRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`ZenX CRM backend running on port ${PORT}`));