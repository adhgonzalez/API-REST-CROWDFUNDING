import { Project } from "../models/project.model.js";
import { ProjectDocumentInterface } from "../models/project.model.js";

export async function updateCreatorProjectsStatus(id: string, newStatus: 'active' | 'funded' | 'failed' | 'cancelled') {
  try {
    const projects = await Project.find({ creatorId: id });

    if (projects.length === 0) {
      return { count: 0 };
    }

    const updatePromises = projects.map(project => {
      project.status = newStatus;
      return project.save();
    });

    const updatedProjects = await Promise.all(updatePromises);

    return {
      success: true,
      count: updatedProjects.length,
      projects: updatedProjects
    };

  } catch (error: any) {
    throw new Error(`Failed to update projects: ${error.message}`);
  }
}