import express  from 'express'
import { Project } from '../models/project.model.js';
import { User } from '../models/user.model.js';

export const ProjectRouter = express.Router();

ProjectRouter.post('/api/projects', async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({ error: 'Body data has not been provided' });
  }
  try {
    const { creatorEmail, ...projectData } = req.body;

    const creator = await User.findOne({ email: creatorEmail });
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

