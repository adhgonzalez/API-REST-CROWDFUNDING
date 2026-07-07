import express from 'express'
import { UserRouter } from './routers/user.router.js';
import { defaultRouter } from './routers/deafult.router.js';

export const app = express();
app.use(express.json());

app.use(UserRouter);
app.use(defaultRouter);