import { connect } from 'mongoose'

try {
    await connect(process.env.MONGODB_URL!);
    console.log('Connected to the database');
} catch (err) {
    console.log(err);
}