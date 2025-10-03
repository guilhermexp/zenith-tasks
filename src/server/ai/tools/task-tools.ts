import { appTools } from './app-tools';

export const taskTools = {
  createTask: appTools.createItem,
  updateTask: appTools.updateItem,
  deleteTask: appTools.deleteItem,
  searchTasks: appTools.searchItems,
  toggleTaskComplete: appTools.markAsDone,
  setDueDate: appTools.setDueDate,
  generateSubtasks: appTools.generateSubtasks
} as const;