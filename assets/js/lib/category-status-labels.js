/** Vocabulaire statut par univers — listes, fiches détail, carte. */
export const CATEGORY_STATUS_LABELS = {
  activities: {
    todo: 'À faire',
    done: 'Réalisée',
    todoDetail: 'Activité à faire',
    doneDetail: 'Activité réalisée',
    doneHint: 'C\'est dans la poche',
    todoHint: 'Cocher une fois l\'activité faite',
  },
  restaurants: {
    todo: 'À essayer',
    done: 'Visité',
    todoDetail: 'Adresse à essayer',
    doneDetail: 'Adresse visitée',
    doneHint: 'C\'est dans la poche',
    todoHint: 'Cocher après votre visite',
  },
  travels: {
    todo: 'À vivre',
    done: 'Réalisé',
    todoDetail: 'Voyage à vivre',
    doneDetail: 'Voyage réalisé',
    doneHint: 'C\'est dans la poche',
    todoHint: 'Cocher après le voyage',
  },
  movies: {
    todo: 'À voir',
    done: 'Vu',
    todoDetail: 'Film ou série à voir',
    doneDetail: 'Film ou série vu',
    doneHint: 'C\'est dans la poche',
    todoHint: 'Cocher une fois le visionnage terminé',
  },
  wishlist: {
    todo: 'À obtenir',
    done: 'Obtenu',
    todoDetail: 'Envie à obtenir',
    doneDetail: 'Envie obtenue',
    doneHint: 'C\'est dans la poche',
    todoHint: 'Cocher une fois obtenu',
  },
};

export function getCategoryStatusLabels(categoryId) {
  return CATEGORY_STATUS_LABELS[categoryId] ?? CATEGORY_STATUS_LABELS.activities;
}

/** Labels pour le toggle « fait / pas fait » des fiches détail. */
export function getCategoryDoneToggleLabels(categoryId) {
  const labels = getCategoryStatusLabels(categoryId);
  return {
    done: labels.doneDetail,
    todo: labels.todoDetail,
    doneHint: labels.doneHint,
    todoHint: labels.todoHint,
  };
}

export function createCategoryStatusFilterOptions(categoryId) {
  const { todo, done } = getCategoryStatusLabels(categoryId);
  return [
    { value: 'all', label: 'Tout' },
    { value: 'todo', label: todo },
    { value: 'done', label: done },
  ];
}

/** Filtre statut carte : libellés explicites par univers. */
export function getMapStatusFilterOptions() {
  const activities = CATEGORY_STATUS_LABELS.activities;
  const restaurants = CATEGORY_STATUS_LABELS.restaurants;
  const travels = CATEGORY_STATUS_LABELS.travels;

  return [
    { value: 'all', label: 'Tout' },
    {
      value: 'todo',
      label: `${activities.todo} · ${restaurants.todo} · ${travels.todo}`,
    },
    {
      value: 'done',
      label: `${activities.done} · ${restaurants.done} · ${travels.done}`,
    },
  ];
}
