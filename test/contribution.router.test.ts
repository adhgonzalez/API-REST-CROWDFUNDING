// src/routers/contribution.router.test.ts
import { describe, test, beforeAll, beforeEach, expect } from 'vitest';
import "../src/db/mongoose.js"
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Project } from '../src/models/project.model.js';
import { Contribution } from '../src/models/contribution.model.js';
import mongoose from 'mongoose';

const validBacker = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'supersecret123',
    role: 'backer'
};

const validCreator = {
    name: 'Charles Babbage',
    email: 'charles@example.com',
    password: 'anothersecret456',
    role: 'creator'
};

const dummyId = new mongoose.Types.ObjectId().toString();
const invalidId = '12345'; // Forzará el error 500 de CastError en Mongoose

beforeAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Contribution.deleteMany({});
});

beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Contribution.deleteMany({});
});

describe('POST /api/projects/:id/contributions', () => {
    test('crea una aportación completa (con rewardTitle) y devuelve 201', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        
        const project = await new Project({
            title: 'Proyecto 1',
            description: 'Desc',
            goalAmount: 1000,
            currentAmount: 0,
            deadline: new Date('2030-01-01'),
            status: 'active',
            creatorId: creator._id
        }).save();

        const res = await request(app)
            .post(`/api/projects/${project._id}/contributions`)
            .send({
                userEmail: validBacker.email,
                amount: 150,
                rewardTitle: 'Camiseta'
            });

        expect(res.status).toBe(201);
        expect(res.body.amount).toBe(150);
        expect(res.body.rewardTitle).toBe('Camiseta');
    });

    test('crea una aportación SIN rewardTitle (cubre rama falsa) y devuelve 201', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        const project = await new Project({
            title: 'Proyecto Sin Reward',
            description: 'Desc',
            goalAmount: 1000,
            currentAmount: 0,
            deadline: new Date('2030-01-01'),
            status: 'active',
            creatorId: creator._id
        }).save();

        const res = await request(app)
            .post(`/api/projects/${project._id}/contributions`)
            .send({
                userEmail: validBacker.email,
                amount: 100
            });

        expect(res.status).toBe(201);
        expect(res.body.rewardTitle).toBeUndefined();
    });

    test('devuelve 400 si el body está vacío', async () => {
        const res = await request(app).post(`/api/projects/${dummyId}/contributions`).send({});
        expect(res.status).toBe(400);
    });

    test('devuelve 400 si faltan datos requeridos', async () => {
        const res = await request(app)
            .post(`/api/projects/${dummyId}/contributions`)
            .send({ userEmail: validBacker.email });
        expect(res.status).toBe(400);
    });

    test('devuelve 404 si el proyecto no existe', async () => {
        const res = await request(app)
            .post(`/api/projects/${dummyId}/contributions`)
            .send({ userEmail: validBacker.email, amount: 100 });
        expect(res.status).toBe(404);
    });

    test('devuelve 400 si el proyecto está financiado o cancelado', async () => {
        const creator = await new User(validCreator).save();
        const project = await new Project({
            title: 'Proyecto Cerrado',
            description: 'Desc',
            goalAmount: 1000,
            currentAmount: 1000,
            deadline: new Date('2030-01-01'),
            status: 'funded',
            creatorId: creator._id
        }).save();

        const res = await request(app)
            .post(`/api/projects/${project._id}/contributions`)
            .send({ userEmail: validBacker.email, amount: 100 });
        expect(res.status).toBe(400);
    });

    test('devuelve 404 si el usuario no existe', async () => {
        const creator = await new User(validCreator).save();
        const project = await new Project({
            title: 'Proyecto Activo',
            description: 'Desc',
            goalAmount: 1000,
            currentAmount: 0,
            deadline: new Date('2030-01-01'),
            status: 'active',
            creatorId: creator._id
        }).save();

        const res = await request(app)
            .post(`/api/projects/${project._id}/contributions`)
            .send({ userEmail: 'noexiste@example.com', amount: 100 });
        expect(res.status).toBe(404);
    });

    test('devuelve 500 si hay un error de base de datos (ID inválido)', async () => {
        const res = await request(app)
            .post(`/api/projects/${invalidId}/contributions`)
            .send({ userEmail: validBacker.email, amount: 100 });
        expect(res.status).toBe(500);
    });
});

describe('GET /api/users/:id/contributions', () => {
    test('devuelve las contribuciones de un usuario', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        const project = await new Project({
            title: 'P1', description: 'D1', goalAmount: 100, currentAmount: 0, deadline: new Date('2030-01-01'), status: 'active', creatorId: creator._id
        }).save();
        await new Contribution({ userId: backer._id, projectId: project._id, amount: 100 }).save();

        const res = await request(app).get(`/api/users/${backer._id}/contributions`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    test('devuelve 404 si el usuario no existe', async () => {
        const res = await request(app).get(`/api/users/${dummyId}/contributions`);
        expect(res.status).toBe(404);
    });

    test('devuelve 500 si el ID tiene un formato inválido', async () => {
        const res = await request(app).get(`/api/users/${invalidId}/contributions`);
        expect(res.status).toBe(500);
    });
});

describe('GET /api/projects/:id/contributions', () => {
    test('devuelve las contribuciones de un proyecto', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        const project = await new Project({
            title: 'P2', description: 'D2', goalAmount: 100, currentAmount: 0, deadline: new Date('2030-01-01'), status: 'active', creatorId: creator._id
        }).save();
        await new Contribution({ userId: backer._id, projectId: project._id, amount: 100 }).save();

        const res = await request(app).get(`/api/projects/${project._id}/contributions`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    test('devuelve 404 si el proyecto no existe', async () => {
        const res = await request(app).get(`/api/projects/${dummyId}/contributions`);
        expect(res.status).toBe(404);
    });

    test('devuelve 500 si el ID tiene un formato inválido', async () => {
        const res = await request(app).get(`/api/projects/${invalidId}/contributions`);
        expect(res.status).toBe(500);
    });
});

describe('DELETE /api/contributions/:id', () => {
    test('borra la contribución y resta el dinero del proyecto (cubre if project true)', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        const project = await new Project({
            title: 'P3', description: 'D3', goalAmount: 1000, currentAmount: 500, deadline: new Date('2030-01-01'), status: 'active', creatorId: creator._id
        }).save();
        const contribution = await new Contribution({ userId: backer._id, projectId: project._id, amount: 100 }).save();

        const res = await request(app).delete(`/api/contributions/${contribution._id}`);
        expect(res.status).toBe(200);
    });

    test('borra la contribución aunque el proyecto ya no exista (cubre if project false)', async () => {
        const backer = await new User(validBacker).save();
        const contribution = await new Contribution({ userId: backer._id, projectId: dummyId, amount: 100 }).save();

        const res = await request(app).delete(`/api/contributions/${contribution._id}`);
        expect(res.status).toBe(200);
        const deletedContribution = await Contribution.findById(contribution._id);
        expect(deletedContribution).toBeNull();
    });

    test('devuelve 404 si la contribución no existe', async () => {
        const res = await request(app).delete(`/api/contributions/${dummyId}`);
        expect(res.status).toBe(404);
    });

    test('devuelve 500 si el ID tiene un formato inválido', async () => {
        const res = await request(app).delete(`/api/contributions/${invalidId}`);
        expect(res.status).toBe(500);
    });
});

describe('PATCH /api/contributions/:id', () => {
    test('actualiza amount y rewardTitle al mismo tiempo', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        const project = await new Project({
            title: 'P4', description: 'D4', goalAmount: 1000, currentAmount: 200, deadline: new Date('2030-01-01'), status: 'active', creatorId: creator._id
        }).save();
        const contribution = await new Contribution({ userId: backer._id, projectId: project._id, amount: 200 }).save();

        const res = await request(app).patch(`/api/contributions/${contribution._id}`).send({ amount: 500, rewardTitle: 'VIP' });
        expect(res.status).toBe(200);
        expect(res.body.amount).toBe(500);
    });

    test('actualiza SOLO el rewardTitle (cubre if body.amount false)', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        const project = await new Project({
            title: 'P4', description: 'D4', goalAmount: 1000, currentAmount: 200, deadline: new Date('2030-01-01'), status: 'active', creatorId: creator._id
        }).save();
        const contribution = await new Contribution({ userId: backer._id, projectId: project._id, amount: 200 }).save();

        const res = await request(app).patch(`/api/contributions/${contribution._id}`).send({ rewardTitle: 'Nuevo Titulo' });
        expect(res.status).toBe(200);
        expect(res.body.rewardTitle).toBe('Nuevo Titulo');
    });

    test('devuelve 400 si se intenta actualizar amount con <= 0', async () => {
        const backer = await new User(validBacker).save();
        const contribution = await new Contribution({ userId: backer._id, projectId: dummyId, amount: 200 }).save();

        const res = await request(app).patch(`/api/contributions/${contribution._id}`).send({ amount: -50 });
        expect(res.status).toBe(400);
    });

    test('devuelve 404 si se actualiza amount pero el proyecto asociado fue borrado', async () => {
        const backer = await new User(validBacker).save();
        // Aportación huérfana de proyecto (dummyId)
        const contribution = await new Contribution({ userId: backer._id, projectId: dummyId, amount: 200 }).save();

        const res = await request(app).patch(`/api/contributions/${contribution._id}`).send({ amount: 300 });
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Associated project not found');
    });

    test('devuelve 400 si el proyecto asociado está cancelado', async () => {
        const creator = await new User(validCreator).save();
        const backer = await new User(validBacker).save();
        const project = await new Project({
            title: 'P5', description: 'D5', goalAmount: 1000, currentAmount: 200, deadline: new Date('2030-01-01'), status: 'cancelled', creatorId: creator._id
        }).save();
        const contribution = await new Contribution({ userId: backer._id, projectId: project._id, amount: 200 }).save();

        const res = await request(app).patch(`/api/contributions/${contribution._id}`).send({ amount: 300 });
        expect(res.status).toBe(400);
    });

    test('devuelve 400 si el body está vacío', async () => {
        const res = await request(app).patch(`/api/contributions/${dummyId}`).send({});
        expect(res.status).toBe(400);
    });

    test('devuelve 400 si la update no está permitida', async () => {
        const res = await request(app).patch(`/api/contributions/${dummyId}`).send({ userId: dummyId });
        expect(res.status).toBe(400);
    });

    test('devuelve 404 si la contribución no existe', async () => {
        const res = await request(app).patch(`/api/contributions/${dummyId}`).send({ amount: 100 });
        expect(res.status).toBe(404);
    });

    test('devuelve 500 si el ID tiene un formato inválido', async () => {
        const res = await request(app).patch(`/api/contributions/${invalidId}`).send({ amount: 100 });
        expect(res.status).toBe(500);
    });
});