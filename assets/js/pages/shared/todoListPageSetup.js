import {
  createCategoryStatusFilterOptions,
  getCategoryStatusLabels,
} from '../../lib/category-status-labels.js';

export function createTodoListPageStatus(categoryId) {
  return {
    statusLabels: getCategoryStatusLabels(categoryId),
    statusFilterOptions: createCategoryStatusFilterOptions(categoryId),
  };
}
