import '../db/mongoose.js'
import express  from 'express'
import { User } from '../models/user.model.js';
import { updateCreatorProjectsStatus } from '../services/project.service.js';

export const UserRouter = express.Router();

UserRouter.post('/api/users', async (req, res) => {
    if (!req.body) {
        return res.status(400).send({ error: 'Body has not been provided' });
    }

    const user = new User(req.body);
    try {
        await user.save();
        res.status(201).send(user);
    } catch (err) {
        res.status(500).send(err);
    }
});

UserRouter.get('/api/users', async (req, res) => {
    const {name, role} = req.query;
    let filter: any = {}
    if (name) filter.name = name;
    if (role) filter.role = role;

    try {
        const users = await User.find(filter);
        if (users.length !== 0) {
            res.status(200).send(users);
        } else {
            res.status(404).send({ error: 'Users not founded' });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

UserRouter.get('/api/users/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toString() });
        if (!user) return res.status(404).send({ error: 'User not founded' });
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send(err);
    }
});

UserRouter.patch('/api/users/:email', async (req, res) => {
    if (!req.body) {
        return res.status(400).send({ error: 'Body has not been provided' });
    }
    const allowedUpdates = ['name', 'email', 'password', 'role'];
    const actualUpdates = Object.keys(req.body);
    const isValidUpdate = actualUpdates.every((update) => allowedUpdates.includes(update));

    if (!isValidUpdate) {
      return res.status(400).send({
        error: 'Update is not permitted',
      });
    }
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).send({ error: 'User not founded' });

        actualUpdates.forEach((update) => {
            (user as any)[update] = req.body[update];
        });
        await user.save(); 

        res.status(200).send(user);
    } catch(err) {
        res.status(500).send(err);    
    }

});

UserRouter.delete('/api/users/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).send({ error: 'User not found' });

        if (user.role === 'creator') {
            const updateResult = await updateCreatorProjectsStatus(user._id.toString(), 'cancelled');
            await user.deleteOne();

            return res.status(200).send({
                message: 'User and associated projects updated',
                cancelledProjects: updateResult.count
            });
        } else {
            await user.deleteOne();
            return res.status(200).send({ message: 'User deleted' });
        }
    } catch (err) {
        return res.status(500).send(err);
    }
});

