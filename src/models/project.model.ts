import { Document, Schema, Types, model,  } from "mongoose";

type StatusType = 'active' | 'funded' | 'failed' | 'cancelled';

export interface ProjectDocumentInterface extends Document {
    title: string,
    description: string,
    creatorId: Types.ObjectId,
    goalAmount: number,
    currentAmount: number,
    deadline: Date,
    status: StatusType
}

const ProjectSchema = new Schema<ProjectDocumentInterface>({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    creatorId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    goalAmount: {
        type: Number,
        required: true,
        validate: {
            validator: (value) => value >= 0,
            message: 'The goal amount cannot be less than 0'
        }
    },
    currentAmount: {
        type: Number,
        required: true,
        default: 0,
        validate: {
            validator: (value) => value >= 0,
            message: 'The current amount cannot be less than 0'
        }
    },
    deadline: {
        type: Date,
        required: true,        
    },
    status: {
        type: String,
        required: true,
        trim: true,
        enum: ['active', 'funded', 'failed', 'cancelled']
    }
});

export const Project = model<ProjectDocumentInterface>('Project', ProjectSchema);