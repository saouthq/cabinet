# Le Cabinet

PWA de présence en temps réel pour un cabinet partagé (6 praticiennes : Blandine, Clara, Mathilde, Camille, Pauline, Flavie).

Chacune crée son profil (prénom, spécialité, couleur, photo) et indique son statut — **En consultation** / **Au cabinet** / **Absente** — visible par les autres instantanément, pour savoir quand fermer la porte et si une collègue est occupée.

## Accès

- **Production** : https://le-cabinet.vercel.app
- **Installation iPhone** : ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil » (une bannière le propose dans l'app). Sur Android, bouton « Installer » natif.

## Stack

- Frontend statique sans framework : `index.html` + `styles.css` + `app.js` (supabase-js v2 via esm.sh)
- PWA complète : `manifest.webmanifest` (icône maskable, portrait), `sw.js` (coquille en cache, données jamais mises en cache), écrans de démarrage iOS dans `splash/`
- Backend : Supabase, projet **slate** (`xkbiskddqswpuggxxhan`) — table isolée `public.cabinet_members` + bucket `cabinet-avatars`, tout préfixé `cabinet` (l'app est indépendante du SaaS resto hébergé dans le même projet ; migrable en 5 min vers un projet dédié)
- Photos : recadrées carré + compressées côté client (canvas, JPEG 512 px) avant upload vers Storage
- Temps réel : publication `supabase_realtime` sur `cabinet_members` + refetch au retour au premier plan + polling de secours toutes les 45 s. Garde-fou `formOpen` : jamais de re-render pendant l'édition du profil.
- Déploiement : **Vercel** (projet `cabinet`, domaine `le-cabinet.vercel.app`) via `vercel deploy --prod --yes` depuis ce dossier. Le repo GitHub `saouthq/cabinet` sert de source (l'intégration git Vercel n'est pas branchée : l'app GitHub Vercel n'a pas accès au repo). GitHub Pages a été désactivé le 03/07 pour n'avoir qu'une seule URL.

## Modèle de données

`cabinet_members` : `id`, `name` (unique), `color` (hex), `specialty`, `avatar_url`, `status` (`consultation` | `cabinet` | `absente`), `updated_at` (trigger automatique).

Pas de login : petit groupe de confiance, accès anon complet limité à cette table et au bucket via RLS. Le profil local est mémorisé dans `localStorage` (`cabinet.memberId`).

---
Dernière mise à jour : 2026-07-03 13:42
