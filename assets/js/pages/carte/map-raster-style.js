import {
  MAP_RASTER_TILES,
  MAP_RASTER_TILES_LABELED,
} from '../../lib/map-bootstrap.js';

function createRasterMapStyle({ tiles, name }) {
  return {
    version: 8,
    name,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        maxzoom: 20,
      },
    },
    layers: [
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
      },
    ],
  };
}

/** Aperçus (accueil, onglet carte liste) — tuiles raster, ~4–8 requêtes. */
export const OUR_SPACE_MAP_RASTER_STYLE = createRasterMapStyle({
  tiles: MAP_RASTER_TILES,
  name: 'Our Space — Carte aperçu',
});

/** Carte interactive — labels inclus dans le raster, zéro glyphe .pbf. */
export const OUR_SPACE_MAP_RASTER_LABELED_STYLE = createRasterMapStyle({
  tiles: MAP_RASTER_TILES_LABELED,
  name: 'Our Space — Carte',
});
