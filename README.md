# Our Space

Application web privée partagée à deux. Centralise idées, lieux et envies communes, avec synchronisation temps réel et carte interactive.


|                 |                                                                        |
| --------------- | ---------------------------------------------------------------------- |
| **Produit**     | Our Space - *À nous deux*                                              |
| **Version**     | `2.6.0` (`APP_VERSION` · `[assets/js/config.js](assets/js/config.js)`) |
| **Runtime**     | Single Page App (ESM), sans framework ni bundler                       |
| **Backend**     | Firebase Auth + Cloud Firestore                                        |
| **Hébergement** | GitHub Pages (CI)                                                      |


---

## Fonctionnalités

- **Espace restreint** — authentification Firebase, accès limité aux comptes autorisés
- **Catalogues partagés** — activités, restaurants, films & séries, voyages, wishlist
- **CRUD unifié** — formulaires dynamiques par catégorie, édition / suppression, statut et métadonnées
- **Carte interactive** — MapLibre GL, pins géolocalisés, recherche (nom, type, cuisine, tag), filtres, deep-links vers un lieu
- **Mode voyage** — focus carte sur un voyage (zone, lieux liés), choix persisté ; pin voyage masqué en mode focus ; au départ recentrage géoloc ou tous les lieux locaux
- **Accueil** — compteur de jours, suggestions / tirages, aperçu carte, accès rapide
- **Profils & espace** — page Profil (hub) avec section **Notre espace**, avatars, tagline, réglages en sous-écrans
- **Thèmes liquid glass** — DA personnelle par membre (mesh WebGL, chrome glass, modales) ; choix dans Paramètres → **Ton thème** ; écran de connexion toujours navy
- **UX mobile / desktop** — header unifié, sidebar, bottom navigation, transitions premium, modal ajout en sheet plein écran mobile, installable (web manifest)
- **Lieux (Google Places)** — recherche nom + adresse sur activités / restos ; suggestions contrôlées type & cuisine (mapping vers la taxonomie app) ; prix EUR estimé depuis Google

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
| `assets/js/ui/`         | Modales, détails d’items, splash, header chrome, bottom nav |
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
| Lieux (nom / détail)    | Google Places API (New)     | autocomplete + place details                              |
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

### 2.3.2

- Transitions de page (crossfade / slide) + header unifié synchronisé (`page-header.js`)
- Bottom nav animée (icône active, FAB, ouverture modal) + sheet d’ajout (picker ↔ formulaire)
- Splash : anneau de progression + beat de fin ; retap onglet = refresh avec loader sur l’icône
- Correctifs voyages : lieux liés exclus des listes globales ; préremplissage « Voyage associé » à l’ajout

### 2.4.0

- **Page Profil** — hub identité (avatar, pseudo) + section **Notre espace** (jours ensemble, membres) visible dès l’ouverture
- **Réglages en sous-écrans** — Mon profil, Notre couple, Données, Thème, Application ; transitions hub ↔ détail
- Nav / bottom nav / header : libellé **Profil** + icône `user`

### 2.4.1

- Splash mobile : centrage correct du cœur et de l’anneau de progression
- Paramètres : mémorisation de la position de scroll au retour hub depuis un sous-écran
- Desktop (≥901px) : plus de chrome header (sidebar suffit) ; retour inline dans les sous-écrans Profil

### 2.4.2

- Carte : animations fade des pins (activités, restos, voyages) à l’apparition / disparition (filtres, couches, mode voyage)
- Mode voyage : pin bleu du voyage masqué (zone + lieux liés conservés)
- Accueil « Autour de nous » : lieux liés aux voyages inclus ; sous-titre partenaire ; CTA carte clarifié
- Modal filtres : scroll + footer fixe ; accordéons Type / Cuisine animés (dépliage + fondu)
- Types d’activités / icônes (monument, pont, site historique, centre commercial, …) ; palette eau / verts carte revue
- Géoloc : moins de retries inutiles (`kCLErrorLocationUnknown`)

### 2.4.3

- **Tags** activités / restos : champ optionnel (1 tag max), même UI que les selects custom ; badge pin sur la carte (couleur de la catégorie) ; chip dans les fiches détail
- **Carte — recherche** : résultats affichent le type concret (ex. Musée, Brasserie) ; recherche aussi par type, cuisine ou tag
- **Accueil « Autour de nous »** : libellé de type concret sur les lieux proches
- **Formulaires** : « Voyage associé » laissé sur « - » à l’ajout (plus de préremplissage du voyage actif)

### 2.5.0

- **Thèmes liquid glass** — sélection dans Paramètres → Thème : Navy, Red Cherry, Orange, Vert nature, Violet, Minuit
- Fond mesh WebGL par thème (gradient animé + grain), chrome glass (header, bottom nav, cartes, modales) harmonisé à chaque palette
- Splash sans flash navy : hint synchrone (`localStorage`) avant le premier paint ; `theme-color` aligné
- Thème **Pink** conservé en interne (non proposé dans la grille) ; carte MapLibre indépendante du thème app
- Aperçus thème dans les réglages (pastilles 35×35)

CSP stricte côté `index.html` (scripts Firebase, tuiles CARTO, APIs d’adresse, Google Places).

### 2.5.1

- **Thème par utilisateur** — `appTheme` sur le profil Firestore `users/{uid}` (plus sur `space/settings`) ; chaque membre a sa DA indépendante
- Paramètres renommés **Ton thème** — apparence personnelle, non partagée entre les deux comptes
- **Connexion** — écran login / auth toujours en navy (mesh + grain), quel que soit le thème choisi une fois connecté
- **Barre de statut mobile** — `theme-color` et fond `<html>` synchronisés à chaud avec la couleur chrome du thème (`chromeColor`, recréation de la meta, `viewport-fit=cover`, `black-translucent` iOS)
- `localStorage` par utilisateur (`app-theme:{uid}`) pour le splash du dernier compte connu sur l’appareil


---

### 2.6.0

- **Google Places** — autocomplete sur le nom (activités, restaurants) : adresse, coords, lien Maps, fourchette de prix EUR
- **Suggestions type** — mapping contrôlé Google → taxonomie app (type resto, cuisine, catégorie activité) ; chip « Suggéré » avec Appliquer / Ignorer ; enregistrement bloqué tant qu’une suggestion est en attente
- **Brouillon formulaire** — chip discret dans le header du modal ; suggestions Google persistées dans le brouillon
- **Formulaire ajout** — sheet plein écran mobile ; zone scrollable (scrollbar invisible) ; animations fluides (brouillon, suggestions, dates activité)
- **Activités** — types Aquarium, Zoo ; cuisine thaïlandaise (restos) ; icônes associées
- **Dates activité** — champs « À venir » / « Période limitée » avec dépliage animé