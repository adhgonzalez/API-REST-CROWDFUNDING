import { Document, model, Schema } from "mongoose";
import validator from 'validator'
import bcrypt from 'bcrypt'

type RoleType = 'creator' | 'backer';

interface UserDocumentInterface extends Document {
    name: string,
    email: string,
    password: string,
    role: RoleType
}

const UserSchema = new Schema<UserDocumentInterface>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: (value) => validator.isEmail(value),
            message: 'The email is not valid'
        }
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: ['creator', 'backer']
    },
});


UserSchema.pre('save', async function (this: UserDocumentInterface) {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
})

export const User = model<UserDocumentInterface>('User', UserSchema);