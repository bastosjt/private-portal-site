# Our Space

Application web privée partagée à deux. Centralise idées, lieux et envies communes, avec synchronisation temps réel et carte interactive.


|                 |                                                                        |
| --------------- | ---------------------------------------------------------------------- |
| **Produit**     | Our Space - *À nous deux*                                              |
| **Version**     | `2.3.1` (`APP_VERSION` · `[assets/js/config.js](assets/js/config.js)`) |
| **Runtime**     | Single Page App (ESM), sans framework ni bundler                       |
| **Backend**     | Firebase Auth + Cloud Firestore                                        |
| **Hébergement** | GitHub Pages (CI)                                                      |


---

## Fonctionnalités

- **Espace restreint** — authentification Firebase, accès limité aux comptes autorisés
- **Catalogues partagés** — activités, restaurants, films & séries, voyages, wishlist
- **CRUD unifié** — formulaires dynamiques par catégorie, édition / suppression, statut et métadonnées
- **Carte interactive** — MapLibre GL, pins géolocalisés, recherche, filtres, deep-links vers un lieu
- **Mode voyage** — focus carte sur un voyage (pin, zone, lieux liés), choix persisté ; au départ recentrage géoloc ou tous les lieux locaux
- **Accueil** — compteur de jours, suggestions / tirages, aperçu carte, accès rapide
- **Profils & espace** — noms affichés, avatars, tagline, préférences
- **UX mobile / desktop** — sidebar, bottom navigation, transitions, installable (web manifest)

---



## Architecture

```
Splash → Auth → App shell
                  ├─ Router (#hash)
                  ├─ Prefetch / cache Firestore
                  ├─ Sidebar · Bottom nav
                  └─ Pages (template + controller)
```

L’entrée unique est `index.html`. La navigation repose sur le hash (`#accueil`, `#carte`, …). Chaque page vit sous `assets/js/pages/<route>/` ; la config produit (nav, schémas de champs, version) est déclarative dans `config.js`.


| Module                  | Responsabilité                                        |
| ----------------------- | ----------------------------------------------------- |
| `assets/js/app.js`      | Bootstrap, session, montage des vues, transitions     |
| `assets/js/config.js`   | Identité produit, navigation, schémas de formulaires  |
| `assets/js/auth/`       | Login, session, allowlist                             |
| `assets/js/firebase/`   | Client Firebase, CRUD, profils, settings, daily picks |
| `assets/js/data/`       | Cache applicatif et synchronisation UI                |
| `assets/js/navigation/` | Routing hash et deep-links carte                      |
| `assets/js/pages/`      | Vues métier                                           |
| `assets/js/ui/`         | Modales, détails d’items, splash, chrome              |
| `assets/js/lib/`        | Adresses, géo, profils, utilitaires                   |
| `assets/js/vendor/`     | Dépendances embarquées (MapLibre, Lucide, …)          |
| `.github/workflows/`    | Build Pages + injection des secrets Firebase          |


**Données** — collections Firestore `activities`, `restaurants`, `movies`, `travels`, `wishlist`, plus profils / settings / daily picks. Documents typiques : horodatage, auteur, localisation optionnelle, liens inter-catégories (ex. voyage associé).

---



## Stack


| Couche                  | Solution                    | Version                                                   |
| ----------------------- | --------------------------- | --------------------------------------------------------- |
| Front                   | HTML / CSS / JavaScript ESM | —                                                         |
| Auth                    | Firebase Auth               | SDK **12.15.0**                                           |
| Données                 | Cloud Firestore             | SDK **12.15.0**                                           |
| Cartographie            | MapLibre GL JS              | **4.7.1**                                                 |
| Fond de carte           | CARTO Basemaps (vectoriel)  | —                                                         |
| Icônes                  | Lucide                      | **1.23.0**                                                |
| Géocodage FR            | API Adresse (BAN)           | —                                                         |
| Géocodage international | Photon (Komoot)             | —                                                         |
| CI / hébergement        | GitHub Actions → Pages      | checkout@v4, configure-pages@v5, upload-pages-artifact@v3 |
| PWA légère              | `site.webmanifest`          | —                                                         |


CSP stricte côté `index.html` (scripts Firebase, tuiles CARTO, APIs d’adresse uniquement).

---



## Releases

Historique aligné sur les bumps de `APP_VERSION`. Le numérotage n’a pas toujours suivi un semver linéaire.

###  1.0.0 — Fondations

- Auth Firebase (email / mot de passe) avec allowlist des comptes autorisés
- Single Page App sur `index.html` : layout dark, sidebar, design system de base
- Accueil : compteur de jours ensemble + suggestions / tirages
- CRUD Firestore + pages listes unifiées (tri, filtres, détail)
- Catégories : activités, restaurants, films & séries, voyages, wishlist
- Formulaires dynamiques par catégorie + premières animations UI
- Déploiement GitHub Pages (secrets Firebase injectés en CI) + cache-busting assets



### 1.0.0

- Introduction de `APP_VERSION` et badge version dans l’UI
- Champ genre sur Films & Séries + options de champs associées



### 1.6.3

- Splash screen au démarrage + prefetch data / perf web
- Page Paramètres : profils (prénom, avatar animal, surnom), tagline de l’espace
- Affichage de l’auteur sur les items + landing revue
- Première carte interactive MapLibre : pins géolocalisés, deep-links `#carte?place=…`, géoloc utilisateur



### 1.7.0

- Wishlist revue : contrôles dédiés, filtres, détail et rendu liste
- Carte : barre de recherche lieux + filtres par catégorie / type



### 1.9.0

- Refactor complet des pages listes : boilerplate / templates / controllers partagés, utils géo & localisation factorisés
- Aperçu carte sur l’accueil + onglet carte dans les catégories (activités, restos, voyages)
- Refactor des interactions carte (position utilisateur, sections map partagées)



### 2.0.0

- Passage officiel sur la ligne v2
- Moins de requêtes réseau : cache / prefetch Firestore, chargement MapLibre différé, daily picks & settings allégés



### 2.0.1

- Correctifs carte post-v2 : styles vectoriels / raster, bootstrap MapLibre, preview accueil et onglets catégorie
- Stabilisation du cache data et du boot app autour de la carte



### 2.0.9

- Fermeture des modales par drag (gesture)
- Marqueurs carte enrichis (images / styles / zones voyages) + warmup carte
- Accueil : story « jours ensemble » + animations love hearts
- Labels de statut par catégorie, polish formulaires / home / splash
- Ajustements cache data et listes partagées



### 2.1.2

- Bottom navigation mobile (barre + FAB) en remplacement de la nav home précédente
- Nouvelle page Explorer (hub d’accès aux catégories)
- Voyages : regroupement en listes / groupes
- Controllers de listes partagés alignés avec la nouvelle nav



### 2.1.3

- Bottom nav remontée au-dessus de l’indicateur home iOS (`--bottom-nav-bottom-gap`)
- Masquage du contenu sous la barre + offset page mobile recalculé



### 2.2.0

- Refonte icônes (favicon, types d’activité, bottom nav) + UI accueil
- Animations cœurs (spam / ripples) sur splash et accueil
- Types custom avec icônes dédiées
- Déplacement manuel des pins sur la carte (mode move + persist Firestore)
- Brouillons de formulaires, deep-links `move`, raffinements fiches détail (activité / resto / voyage)



### 2.3.0

- **Mode voyage** sur la carte : focus un voyage (pin, zone bleue, lieux liés), choix persisté (`activeTravelId`)
- Dock valise : clic = activer / quitter ; appui long = changer de voyage
- Entrée → cadrage sur la zone du voyage ; sortie → géoloc locale, sinon fit de tous les lieux visibles
- Compteurs Explorer / Accès rapide alignés sur les listes (lieux liés à un voyage exclus)
- Restaurants : cuisine optionnelle ; nouveaux types (boulangerie, glacier, pâtisserie, cookie)
- Raffinements UI voyages (couleurs liées, CTA, padding ombres)

### 2.3.1

- Prefetch : voyages + `activeTravelId` chargés en parallèle avec le reste des données
- Activation mode voyage instantanée (persistance Firestore en arrière-plan)

