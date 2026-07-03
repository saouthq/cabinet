# Le Cabinet

PWA de présence en temps réel pour un cabinet partagé (6 praticiennes : Blandine, Clara, Mathilde, Camille, Pauline, Flavie).

Chacune indique son statut — **En consultation** / **Au cabinet** / **Absente** — et voit celui des autres instantanément, pour savoir quand fermer la porte et si une collègue est occupée.

## Accès

- **Production** : https://saouthq.github.io/cabinet/
- **Installation iPhone** : ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil »

## Stack

- Frontend statique sans framework : `index.html` + `styles.css` + `app.js` (supabase-js v2 via esm.sh)
- PWA : `manifest.webmanifest` + `sw.js` (coquille en cache, données jamais mises en cache)
- Backend : Supabase, projet **slate** (`xkbiskddqswpuggxxhan`) — table isolée `public.cabinet_members` préfixée `cabinet_` (l'app est indépendante du SaaS resto hébergé dans le même projet ; migrable en 5 min vers un projet dédié)
- Temps réel : publication `supabase_realtime` sur `cabinet_members` + refetch au retour au premier plan + polling de secours toutes les 45 s
- Déploiement : GitHub Pages, branche `master` du repo `saouthq/cabinet` (`git push` = mise en prod)

## Modèle de données

`cabinet_members` : `id`, `name` (unique), `color` (hex), `status` (`consultation` | `cabinet` | `absente`), `updated_at` (trigger automatique).

Pas de login : petit groupe de confiance, accès anon complet limité à cette table via RLS. Le profil local est mémorisé dans `localStorage` (`cabinet.memberId`).

---
Dernière mise à jour : 2026-07-03 12:46
