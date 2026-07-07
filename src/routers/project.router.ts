import express  from 'express'
import { checkAndUpdateProjectDeadline } from '../middlewares/projectDeadline.middleware.js';
import { Project } from '../models/project.model.js';
import { User } from '../models/user.model.js';

export const ProjectRouter = express.Router();

ProjectRouter.post('/api/projects', async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({ error: 'Body data has not been provided' });
  }
  try {
    const { creatorId, ...projectData } = req.body;

    const creator = await User.findOne({ email: creatorId });
    if (!creator) {
      return res.status(404).send({ error: 'Creator not found' });
    }

    if (creator.role == 'backer') {
      return res.status(400).send({ error: 'The user is not a creator' });
    }
 
    req.body.creatorId = creator._id;
    const newProject = new Project({
      ...projectData,
      creatorId: creator._id
    });

    res.status(201).send(newProject);
  } catch (err) {
    res.status(500).send(err);
  }
});

ProjectRouter.get('/api/projects', async (req, res) => {
  const {title, goalAmount, currentAmount, deadline, status, creatorId} = req.query;
  const filter: any = {};
  if (title) filter.title = title;
  if (goalAmount) filter.goalAmount = { $gte: Number(goalAmount) };
  if (currentAmount) filter.currentAmount = { $gte: Number(currentAmount) };
  if (deadline) filter.deadline = { $lte: new Date(deadline as string) };
  if (status) filter.status = status;
  if (creatorId) {
    const creator = await User.findOne({ email: creatorId as string });
    if (!creator) {
      // Si el usuario con ese email ni siquiera existe, devolvemos array vacío 
      return res.status(200).send([]);
    }
    filter.creatorId = creator._id; 
  }
  
  try {
    const projects = await Project.find(filter);
    res.status(200).send(projects);
  } catch (err) {
    res.status(500).send(err);
  }
});

ProjectRouter.get('/api/projects/:id', checkAndUpdateProjectDeadline, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).send({ error: 'Project not found' });
    }
    res.status(200).send(project);
  } catch (err) {
    res.status(500).send(err);
  }
});

ProjectRouter.patch('/api/projects/:id', checkAndUpdateProjectDeadline, async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({ error: 'Body data has not been provided' });
  }
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });
    if (project.status === 'funded' || project.status === 'failed' || project.status === 'cancelled') {
      return res.status(400).send({ error: 'This project cannot be updated' });
    }
    const allowedUpdates = ['title', 'description', 'goalAmount', 'deadline', 'status'];
    const actualUpdates = Object.keys(req.body);
    const isValidUpdate = actualUpdates.every((update) => allowedUpdates.includes(update));

    if (!isValidUpdate) {
      return res.status(400).send({
        error: 'Update is not permitted',
      });
    }

    actualUpdates.forEach((update) => {
      if (update === 'deadline') {
        project.deadline = new Date(req.body.deadline); // Parseo explícito a Date real
      } else if (update === 'goalAmount') {
        project.goalAmount = Number(req.body.goalAmount); // Aseguramos tipo numérico
      } else {
        (project as any)[update] = req.body[update];
      }
    });
    await project.save(); 

    res.status(200).send(project);
  } catch(err) {
    res.status(500).send(err);    
  }
});

ProjectRouter.delete('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).send({ error: 'Project not found' });
    }
    if (project.currentAmount === 0) {
      await project.deleteOne();
      return res.status(200).send({ message: 'Project deleted' });
    }
    project.status = 'cancelled';
    await project.save();
    res.status(200).send({ message: 'Project cancelled' });
  } catch (err) {
    res.status(500).send(err);
  }
});