import { describe, test, expect, beforeEach, beforeAll } from 'vitest';
import '../src/db/mongoose.js';
import request from 'supertest';
import { app } from '../src/app.js';
import { Project } from '../src/models/project.model.js';
import { User } from '../src/models/user.model.js';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

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

const validProject = {
  title: 'Project1',
  description: 'Test Project',
  goalAmount: 10000,
  currentAmount: 0,
  deadLine: '3030-12-31',
  status: 'active',
  creatorId: 'charles@example.com'
}

const unvalidProject = {
  title: 'Project2',
  description: 'Test Project2',
  goalAmount: 10000,
  currentAmount: 0,
  deadLine: new Date(Date.now() * 1000),
  status: 'active',
  creatorId: 'ada@example.com'
}


beforeEach(async () => {
  await User.deleteMany({});
  await Project.deleteMany({});
  await new User(validCreator).save();
});


describe('POST /api/projects', () => {
  test('Devuelve 201 y crea el proyecto cuando el creador es válido', async () => {
    const res = await request(app)
          .post('/api/projects')
          .send(validProject)
          .expect(201)
    
    expect(res.body.title).toBe('Project1');
    expect(res.body.description).toBe('Test Project');
    expect(res.body.goalAmount).toBe(10000);
  });

  test('devuelve 400 si no se envía body', async () => {
    const res = await request(app)
                .post('/api/projects')
                .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Body data has not been provided' });
  });

  test('devuelve 400 si el usuario existe pero es backer', async () => {
    await new User(validUser).save();
    const res = await request(app)
                .post('/api/projects')
                .send(unvalidProject);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'The user is not a creator' });
  });

  test('devuelve 404 si el creador no existe', async () => {
    const res = await request(app)
                .post('/api/projects')
                .send({
                  title: 'Project2',
                  description: 'Test Project2',
                  goalAmount: 10000,
                  currentAmount: 0,
                  deadLine: new Date(Date.now() * 1000),
                  status: 'active',
                  creatorId: 'holaaaa@example.com'
                });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Creator not found' });
  });

  test('devuelve 500 si ocurre un error inesperado en la búsqueda del creador', async () => {
    await mongoose.disconnect();
    const res = await request(app)
                      .post('/api/projects')
                      .send(validCreator);
    
    expect(res.status).toBe(500);

    await mongoose.connect(process.env.MONGODB_URL!)
  });
});

describe('GET /api/projects', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = new User({
      name: 'Charles Babbage',
      email: 'charles123@example.com',
      password: 'anothersecret456',
      role: 'creator'
    });
    await testUser.save();

    await Project.create([
      { title: 'Project Alpha', description: 'Desc 1', goalAmount: 5000, currentAmount: 100, deadline: new Date('2030-01-01'), status: 'active', creatorId: testUser._id },
      { title: 'Project Beta', description: 'Desc 2', goalAmount: 10000, currentAmount: 500, deadline: new Date('2030-06-01'), status: 'active', creatorId: testUser._id },
      { title: 'Project Gamma', description: 'Desc 3', goalAmount: 15000, currentAmount: 1000, deadline: new Date('2030-12-01'), status: 'funded', creatorId: testUser._id }
    ]);
  });

  test('debe filtrar proyectos con goalAmount mayor o igual al solicitado', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ goalAmount: '10000' }); // Debería traer Beta (10000) y Gamma (15000)

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body.some((p: any) => p.title === 'Project Alpha')).toBe(false);
  });

  test('debe filtrar proyectos con currentAmount mayor o igual al solicitado', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ currentAmount: '500' }); 

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('debe filtrar proyectos cuya fecha límite sea menor o igual a la solicitada', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ deadline: '2030-07-01' }); // Debería traer Alpha (enero) y Beta (junio), pero no Gamma (diciembre)

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body.some((p: any) => p.title === 'Project Gamma')).toBe(false);
  });

  test('debe filtrar de forma exacta por el estado del proyecto', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ status: 'funded' }); // Solo Gamma está funded

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Project Gamma');
  });

  test('debe filtrar por creador buscando internamente por su email', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ creatorId: 'charles123@example.com' }); // Pasamos el correo

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3); // Los 3 pertenecen a este creador
  });

  test('debe devolver un array vacío si el email del creador no existe en la base de datos', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ creatorId: 'noexiste@correo.com' });

    expect(res.status).toBe(200); // Tu endpoint responde 200 en este escenario
    expect(res.body).toEqual([]);  // Comprobamos que devuelve la caja vacía limpia
  });

  test('debe aplicar múltiples filtros simultáneamente', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ 
        status: 'active', 
        goalAmount: '6000',
        creatorId: 'charles123@example.com'
      }); // Solo 'Project Beta' cumple las 3 condiciones a la vez

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Project Beta');
  });
});

describe('PATCH /api/projects/:id', () => {
  let testUser: any;
  let activeProject: any;
  let closedProject: any;

  beforeEach(async () => {
    testUser = new User({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'supersecret123',
      role: 'creator'
    });
    await testUser.save();

    activeProject = new Project({
      title: 'Original Title',
      description: 'Original Description',
      goalAmount: 5000,
      currentAmount: 0,
      deadline: new Date('2030-01-01'),
      status: 'active',
      creatorId: testUser._id
    });
    await activeProject.save();

    closedProject = new Project({
      title: 'Closed Project',
      description: 'No edits allowed',
      goalAmount: 2000,
      currentAmount: 2000,
      deadline: new Date('2025-01-01'),
      status: 'funded', // Estado bloqueante
      creatorId: testUser._id
    });
    await closedProject.save();
  });

  test('debe actualizar correctamente los campos permitidos y parsear los tipos de datos', async () => {
    const res = await request(app)
      .patch(`/api/projects/${activeProject._id}`)
      .send({
        title: 'Updated Title',
        goalAmount: '7500',          // Lo enviamos como string para verificar el parseo a Number
        deadline: '2031-05-20'       // Lo enviamos como string para verificar el parseo a Date
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.goalAmount).toBe(7500); // Comprobamos que ahora es un número real

    const updatedInDb = await Project.findById(activeProject._id);
    expect(updatedInDb?.title).toBe('Updated Title');
    expect(updatedInDb?.deadline.toISOString()).toContain('2031-05-20');
  });

  test('debe devolver 400 Bad Request si el cuerpo de la petición está vacío', async () => {
    const res = await request(app)
      .patch(`/api/projects/${activeProject._id}`)
      .send({}); // Body vacío

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Body data has not been provided');
  });

  test('debe devolver 404 Not Found si el ID tiene buen formato pero el proyecto no existe', async () => {
    const fakeId = new Types.ObjectId(); // Generamos un ID válido pero aleatorio
    const res = await request(app)
      .patch(`/api/projects/${fakeId}`)
      .send({ title: 'New Title' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Project not found');
  });

  test('debe devolver 400 si se intenta actualizar un proyecto que ya está finalizado', async () => {
    const res = await request(app)
      .patch(`/api/projects/${closedProject._id}`)
      .send({ title: 'Attempt to Change Title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('This project cannot be updated');
  });

  test('debe devolver 400 si se intenta modificar un campo no permitido (ej: currentAmount)', async () => {
    const res = await request(app)
      .patch(`/api/projects/${activeProject._id}`)
      .send({
        title: 'Hack Title',
        currentAmount: 999999 
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Update is not permitted');

    const projectInDb = await Project.findById(activeProject._id);
    expect(projectInDb?.currentAmount).toBe(0);
  });
});

describe('DELETE /api/projects/:id - Borrado / Cancelación de Proyectos', () => {
  let testUser: any;
  let emptyProject: any;
  let fundedProject: any;

  beforeEach(async () => {
    testUser = new User({
      name: 'Steve Wozniak',
      email: 'woz@example.com',
      password: 'secretpassword789',
      role: 'creator'
    });
    await testUser.save();

    emptyProject = new Project({
      title: 'Empty Idea',
      description: 'Nobody backet this yet',
      goalAmount: 5000,
      currentAmount: 0, 
      deadline: new Date('2030-01-01'),
      status: 'active',
      creatorId: testUser._id
    });
    await emptyProject.save();

    fundedProject = new Project({
      title: 'Successful Idea',
      description: 'People love this',
      goalAmount: 5000,
      currentAmount: 1500,
      deadline: new Date('2030-01-01'),
      status: 'active',
      creatorId: testUser._id
    });
    await fundedProject.save();
  });

  test('debe eliminar físicamente el proyecto de la BD si no ha recibido aportaciones', async () => {
    const res = await request(app)
      .delete(`/api/projects/${emptyProject._id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Project deleted');

    // Buscamos en la BD y debe ser null (ya no existe)
    const deletedInDb = await Project.findById(emptyProject._id);
    expect(deletedInDb).toBeNull();
  });

  test('no debe eliminar el proyecto de la BD si tiene aportaciones, sino pasar su estado a "cancelled"', async () => {
    const res = await request(app)
      .delete(`/api/projects/${fundedProject._id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Project cancelled');

    const projectInDb = await Project.findById(fundedProject._id);
    expect(projectInDb).not.toBeNull();
    expect(projectInDb?.status).toBe('cancelled');
  });

  test('debe devolver 404 Not Found si se intenta borrar un proyecto inexistente', async () => {
    const fakeId = new Types.ObjectId(); // ID estructuralmente válido pero aleatorio
    const res = await request(app)
      .delete(`/api/projects/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Project not found');
  });

  test('devuelve 500 si el ID tiene formato inválido', async () => {
    const res = await request(app).delete('/api/projects/id-invalido-500');
    expect(res.status).toBe(500);
  });
});