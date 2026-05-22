import express from 'express';
export const healthRouter = express.Router();

healthRouter.get('/healthz', (req, res) => res.send('ok'));
healthRouter.get('/readyz', (req, res) => res.send('ready'));
