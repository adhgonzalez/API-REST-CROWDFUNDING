import { Document, Schema, Types, model,  } from "mongoose";

interface ContributionDocumentInterface {
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    amount: number,
    rewardTitle: string,
    createdAt: Date
}

const ContributionSchema = new Schema<ContributionDocumentInterface>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    projectId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Project'
    },
    amount: {
        type: Number,
        required: true,
        validate: {
            validator: (value) => value > 0,
            message: 'The amount cannot be less or equal than 0'
        }
    },
    rewardTitle: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Contribution = model<ContributionDocumentInterface>('Contribution', ContributionSchema);