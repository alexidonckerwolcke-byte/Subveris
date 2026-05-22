import client from 'prom-client';
import express from 'express';

client.collectDefaultMetrics();

export const metricsRouter = express.Router();

metricsRouter.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
