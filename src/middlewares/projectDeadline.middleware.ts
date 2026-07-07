import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Project } from '../models/project.model.js';

export const checkAndUpdateProjectDeadline = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id.toString())) {
    return res.status(400).send({ error: 'The provided ID has an invalid format' });
  }

  try {
    const project = await Project.findById(id);

    if (!project) {
      return next();
    }

    if (project.status === 'active') {
      const now = new Date();

      if (now >= project.deadline) {
        // Evaluamos si logró la meta financiera o no
        project.status = project.currentAmount >= project.goalAmount ? 'funded' : 'failed';
        await project.save(); 
      }
    }
    next();

  } catch (err: any) {
    return res.status(500).send({ error: err.message || 'Error checking project deadline' });
  }
};