import express  from 'express'
import { checkAndUpdateProjectDeadline } from '../middlewares/projectDeadline.middleware.js';
import { Project } from '../models/project.model.js';
import { User } from '../models/user.model.js';
import { Contribution } from '../models/contribution.model.js';

export const ContributionRouter = express.Router();

ContributionRouter.post('/api/projects/:id/contributions', async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({ error: 'Body data has not been provided' });
  }
  const { userEmail, rewardTitle, amount } = req.body;
  let container: any = {}
  if (!userEmail || !amount) {
    return res.status(400).send({ error: 'Body data is incomplete' });
  }
  if (rewardTitle) container.rewardTitle = rewardTitle;
  container.amount = amount;
  container.projectId = req.params.id;
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });
    if (['funded', 'failed', 'cancelled'].includes(project.status)) {
      return res.status(400).send({ error: 'Contributions are not allowed. This project is already finalized or cancelled' });
    }
    project.currentAmount += amount;

    const user = await User.findOne({email: userEmail});
    if (!user) return res.status(404).send({ error: 'User not found' });
    
    container.userId = user._id;
    container.createdAt = new Date();
    const newContribution = new Contribution(container);
    await newContribution.save();
    await project.save();
    res.status(201).send(newContribution);
  } catch (err) {
    res.status(500).send(err);
  }
});

ContributionRouter.get('/api/users/:id/contributions', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send({ error: 'User not found' });
    
    const contributions = await Contribution.find({userId: req.params.id}).populate('projectId', 'title status goalAmount');
    res.status(200).send(contributions);
  } catch (err) {
    res.status(500).send(err);
  }
});

ContributionRouter.get('/api/projects/:id/contributions', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    const contributions = await Contribution.find({projectId: req.params.id}).populate('userId','name');
    res.status(200).send(contributions);
  } catch (err) {
    res.status(500).send(err);
  }
});

ContributionRouter.delete('/api/contributions/:id', async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      return res.status(404).send({ error: 'Contribution not found' });
    }

    const project = await Project.findById(contribution.projectId);
    if (project) {
      project.currentAmount = Math.max(0, project.currentAmount - contribution.amount);
      await project.save();
    }

    await contribution.deleteOne();

    res.status(200).send({ 
      message: 'Contribution deleted successfully' 
    });

  } catch (err) {
    return res.status(500).send(err);
  }
});

ContributionRouter.patch('/api/contributions/:id', async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({ error: 'Body data has not been provided' });
  }

  //Filtrar los campos permitidos para actualizar en una donación
  const allowedUpdates = ['amount', 'rewardTitle'];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every((update) => allowedUpdates.includes(update));

  if (!isValidUpdate) {
    return res.status(400).send({ error: 'Update is not permitted. Only amount or rewardTitle can be modified' });
  }

  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      return res.status(404).send({ error: 'Contribution not found' });
    }

    if (req.body.amount !== undefined) {
      const newAmount = Number(req.body.amount);

      if (isNaN(newAmount) || newAmount <= 0) {
        return res.status(400).send({ error: 'The new amount must be a number greater than zero' });
      }

      const project = await Project.findById(contribution.projectId);
      if (!project) {
        return res.status(404).send({ error: 'Associated project not found' });
      }

      if (['funded', 'failed', 'cancelled'].includes(project.status)) {
        return res.status(400).send({ error: 'Cannot modify contribution. The project is already finalized or cancelled' });
      }

      const difference = newAmount - contribution.amount;
      project.currentAmount = Math.max(0, project.currentAmount + difference);
      
      await project.save();      
      contribution.amount = newAmount;
    }

    if (req.body.rewardTitle !== undefined) {
      contribution.rewardTitle = req.body.rewardTitle;
    }

    await contribution.save();
    res.status(200).send(contribution);
  } catch (err) {
    return res.status(500).send(err);
  }
});