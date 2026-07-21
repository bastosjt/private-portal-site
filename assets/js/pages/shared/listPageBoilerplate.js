export function createTodoStatusFilterOptions(todoLabel, doneLabel) {
  return [
    { value: 'all', label: 'Tout' },
    { value: 'todo', label: todoLabel },
    { value: 'done', label: doneLabel },
  ];
}

export function createListFilterSections({
  statusOptions,
  sortOptions,
  fields = [],
}) {
  return ({ getAvailableFilterOptions }) => [
    {
      id: 'status',
      label: 'Statut',
      mode: 'single',
      collapsible: false,
      options: statusOptions,
    },
    {
      id: 'sort',
      label: 'Trier',
      mode: 'single',
      options: sortOptions.map((opt) => ({ value: opt.id, label: opt.label })),
    },
    ...fields.map(({ id, label, mode = 'multi', getOptions }) => ({
      id,
      label,
      mode,
      getOptions: getOptions ?? (() => getAvailableFilterOptions(id)),
    })),
  ];
}

export function createListPageLabels({
  filterToolbarAria,
  countSingular,
  countPlural,
  statusDone,
  statusTodo,
  headerEmpty,
  headerAllDone,
  headerOneTodo,
  headerManyTodo,
  emptyNone,
  emptyFiltered,
  addCta,
  pickEmptyText,
  pickAllDoneText,
  pickIdleText,
  pickQuotaExhaustedText,
  pickEmptyTitle = 'Rien à piocher',
  pickAllDoneTitle = 'Bravo !',
  ...extra
}) {
  return {
    filterToolbarAria,
    countSingular,
    countPlural,
    statusDone,
    statusTodo,
    headerEmpty,
    headerAllDone,
    headerOneTodo,
    headerManyTodo,
    emptyNone,
    emptyFiltered,
    addCta,
    pickEmptyTitle,
    pickEmptyText,
    pickAllDoneTitle,
    pickAllDoneText,
    pickIdleText,
    pickQuotaExhaustedText,
    ...extra,
  };
}

export function createSortOnlyFilterSections(sortOptions, fields = []) {
  return ({ getAvailableFilterOptions }) => [
    {
      id: 'sort',
      label: 'Trier',
      mode: 'single',
      options: sortOptions.map((opt) => ({ value: opt.id, label: opt.label })),
    },
    ...fields.map(({ id, label, mode = 'multi', getOptions }) => ({
      id,
      label,
      mode,
      getOptions: getOptions ?? (() => getAvailableFilterOptions(id)),
    })),
  ];
}

export function createMapFilterSections({
  statusOptions,
  statusLabel = 'Statut',
  categoryOptions,
  getMapFieldOptions,
  typeFields = [],
}) {
  return [
    {
      id: 'status',
      label: statusLabel,
      mode: 'single',
      collapsible: false,
      options: statusOptions,
    },
    {
      id: 'categories',
      label: 'Catégories',
      mode: 'multi',
      collapsible: false,
      options: categoryOptions,
    },
    ...typeFields.map(({ id, label, categoryId, fieldName }) => ({
      id,
      label,
      mode: 'multi',
      getOptions: () => getMapFieldOptions(categoryId, fieldName),
    })),
  ];
}
