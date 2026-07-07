// src/routers/user.router.test.ts
import { describe, test, beforeAll, beforeEach, expect } from 'vitest';
import "../src/db/mongoose.js"
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Project } from '../src/models/project.model.js';

const validUser = {
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

beforeAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
});

beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
});

describe('POST /api/users', () => {
    test('crea un usuario y devuelve 201', async () => {
        const res = await request(app)
                    .post('/api/users')
                    .send(validUser)
                    .expect(201)

        expect(res.body.email).toBe(validUser.email);
        expect(res.body.name).toBe(validUser.name);
    });

    test('hashea el password antes de guardarlo', async () => {
        await request(app).post('/api/users').send(validUser);

        const userInDb = await User.findOne({ email: validUser.email });
        expect(userInDb?.password).not.toBe(validUser.password);
    });

    test('devuelve 500 si el body no cumple el schema (ej: falta password)', async () => {
        const { password, ...incomplete } = validUser;
        const res = await request(app).post('/api/users').send(incomplete);

        expect(res.status).toBe(500);
    });
});

describe('GET /api/users', () => {
    beforeEach(async () => {
        await User.create([validUser, validCreator]);
    });

    test('devuelve todos los usuarios sin filtros', async () => {
        const res = await request(app).get('/api/users');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    test('filtra por role', async () => {
        const res = await request(app).get('/api/users').query({ role: 'creator' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].email).toBe(validCreator.email);
    });

    test('filtra por name', async () => {
        const res = await request(app).get('/api/users').query({ name: validUser.name });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    test('devuelve 404 si el filtro no matchea a nadie', async () => {
        const res = await request(app).get('/api/users').query({ role: 'admin' });

        expect(res.status).toBe(404);
    });
});

describe('GET /api/users/:email', () => {
    test('devuelve el usuario si existe', async () => {
        const user = new User(validUser);
        await user.save();

        const res = await request(app).get(`/api/users/${validUser.email}`);

        expect(res.status).toBe(200);
        expect(res.body.email).toBe(validUser.email);
    });

    test('devuelve 404 si no existe', async () => {
        const res = await request(app).get('/api/users/noexiste@example.com');

        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/users/:email', () => {
    test('actualiza campos permitidos y devuelve 200', async () => {
        const user = new User(validUser);
        await user.save();

        const res = await request(app)
            .patch(`/api/users/${validUser.email}`)
            .send({ name: 'Ada Nueva' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Ada Nueva');
    });

    test('rehashea el password si se actualiza', async () => {
        const user = new User(validUser);
        await user.save();

        await request(app)
            .patch(`/api/users/${validUser.email}`)
            .send({ password: 'nuevopassword789' });

        const updated = await User.findOne({ email: validUser.email });
        expect(updated?.password).not.toBe('nuevopassword789');
    });

    test('devuelve 400 si se intenta actualizar un campo no permitido', async () => {
        const user = new User(validUser);
        await user.save();

        const res = await request(app)
            .patch(`/api/users/${validUser.email}`)
            .send({ _id: 'algo', foo: 'bar' });

        expect(res.status).toBe(400);
    });

    test('devuelve 404 si el usuario no existe', async () => {
        const res = await request(app)
            .patch('/api/users/noexiste@example.com')
            .send({ name: 'Nadie' });

        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/users/:email', () => {
    test('borra un usuario normal (no creator) y devuelve 200', async () => {
        const user = new User(validUser);
        await user.save();

        const res = await request(app).delete(`/api/users/${validUser.email}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('User deleted');

        const stillExists = await User.findOne({ email: validUser.email });
        expect(stillExists).toBeNull();
    });

    test('si el usuario es creator, cancela sus proyectos reales y lo borra', async () => {
        const creator = new User(validCreator);
        await creator.save();

        await Project.create([
            { creatorId: creator._id, status: 'active', description: 'hola', title: 'P1', goalAmount: 3, currentAmount: 1, deadline: '2030-03-20' },
            { creatorId: creator._id, status: 'funded', description: 'hola2', title: 'P2', goalAmount: 3, currentAmount: 1, deadline: '2030-03-20' }
        ]);

        const res = await request(app).delete(`/api/users/${validCreator.email}`);

        expect(res.status).toBe(200);
        expect(res.body.cancelledProjects).toBe(2);

        const projects = await Project.find({ creatorId: creator._id.toString() });
        expect(projects.every(p => p.status === 'cancelled')).toBe(true);

        const stillExists = await User.findOne({ email: validCreator.email });
        expect(stillExists).toBeNull();
    });

    test('devuelve 404 si el usuario no existe', async () => {
        const res = await request(app).delete('/api/users/noexiste@example.com');

        expect(res.status).toBe(404);
    });
});