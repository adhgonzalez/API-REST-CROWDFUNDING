import { connect } from 'mongoose'

try {
    await connect('mongodb://127.0.0.1:27017/crowdfunding-api');
    console.log('Connected to the database');
} catch (err) {
    console.log(err);
}