import { resolveAppGenresFromTmdb } from './tmdb-genre-mapping.js';
import { getFieldOptionLabel, getCategoryFieldOptions } from './custom-types.js';
import { setSelectFieldValue } from '../ui/select-custom.js';
import { updateMovieTitleFieldIcon } from './form-name-field.js';

function shouldWriteField(el, onlyEmptyFields) {
  if (!el) return false;
  return !onlyEmptyFields || !el.value?.trim();
}

function setHiddenField(form, name, value, { onlyEmptyFields = false } = {}) {
  const el = form.elements[name];
  if (!el || value == null || value === '') return;
  if (!shouldWriteField(el, onlyEmptyFields)) return;
  el.value = String(value);
}

export function applyMovieToForm(form, category, media, { onlyEmptyFields = false } = {}) {
  if (!form || !category || !media?.title) return null;

  const titreField = form.elements.titre;
  if (titreField && shouldWriteField(titreField, onlyEmptyFields)) {
    titreField.value = media.title;
  }

  const typeValue = media.mediaType === 'tv' ? 'serie' : 'film';
  const typeField = category.fields.find((field) => field.name === 'type');
  if (typeField && shouldWriteField(form.elements.type, onlyEmptyFields)) {
    setSelectFieldValue(
      form,
      typeField,
      typeValue,
      getFieldOptionLabel(category.id, 'type', typeValue),
      category.id,
    );
  }

  const allowedGenres = new Set(
    getCategoryFieldOptions(category.id, 'genre').map((option) => option.value),
  );
  const [genreValue, genre2Value] = resolveAppGenresFromTmdb(media.genreIds, allowedGenres, 2);
  const genreField = category.fields.find((field) => field.name === 'genre');

  if (genreValue && genreField && shouldWriteField(form.elements.genre, onlyEmptyFields)) {
    setSelectFieldValue(
      form,
      genreField,
      genreValue,
      getFieldOptionLabel(category.id, 'genre', genreValue),
      category.id,
    );
  }

  if (genre2Value) {
    const genre2Field = category.fields.find((field) => field.name === 'genre2');
    if (genre2Field && shouldWriteField(form.elements.genre2, onlyEmptyFields)) {
      setSelectFieldValue(
        form,
        genre2Field,
        genre2Value,
        getFieldOptionLabel(category.id, 'genre', genre2Value),
        category.id,
      );
    }
  }

  setHiddenField(form, 'posterPath', media.posterPath, { onlyEmptyFields });

  const anneeField = form.elements.annee;
  if (media.year && anneeField && shouldWriteField(anneeField, onlyEmptyFields)) {
    anneeField.value = String(media.year);
  }

  updateMovieTitleFieldIcon(form, typeValue);
  form.dispatchEvent(new Event('input', { bubbles: true }));

  return {
    ...media,
    type: typeValue,
    genre: genreValue,
    genre2: genre2Value,
  };
}
