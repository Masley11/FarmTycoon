# FarmTycoon — Product Requirements Document (PRD)

## Original Problem Statement
Refonte de FarmTycoon en une plateforme moderne, semi-réaliste, professionnelle de gestion agricole (ERP/SaaS look). Suppression du style cartoon/emoji/illustrations enfantines. Dashboard ERP-like avec KPIs, charts, météo, carte interactive, alertes, vraies images agricoles, branding premium "FarmTycoon — Agricultural Management Platform". Modules MVP: Dashboard, Terrains, Cultures+ressources (eau, engrais, herbicides, carburant, électricité), Marché+contrats. Premium tier (architecture-ready, API Maketou plus tard). Mode démo single-player.

## User Personas
- **Exploitant simulé** — Joue à FarmTycoon comme une vraie simulation économique/ERP agricole, gère trésorerie, cultures, ressources, marché.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async). Single global save (`game_state.id="global"`). Auto-tick: 1 jour = 10s. Collections: `game_state`, `parcels`, `activity_log`.
- **Frontend**: React 19 + React Router 7 + Shadcn UI + Recharts + Lucide + Sonner. Fonts: Outfit (display) + IBM Plex Sans (body).
- **Design system**: Emerald-800 primary, stone-50 background, stone-900 text. Glassmorphism léger sur header/sidebar. Real Unsplash photos.
- **Routes**: `/`, `/lands`, `/crops`, `/market`, `/resources`, `/premium`.

## Core Requirements (Static)
1. **Dashboard**: hero branding + KPIs (cash, surface, cultures actives, stock) + revenue chart + weather widget + farm map + alerts + activity feed.
2. **Terrains**: liste des parcelles (détenues + marché foncier), achat de parcelles, fertilité/climat/eau/prix.
3. **Cultures**: plantation (blé/maïs/soja/orge/tournesol), irrigation, fertilisation (chimique/bio/premium), herbicide, récolte. Suivi croissance/humidité sol/mauvaises herbes.
4. **Marché**: prix spot fluctuants, vente d'inventaire, contrats à prime garantie avec deadlines.
5. **Ressources**: achat d'eau, carburant, électricité, 3 types d'engrais, herbicide, par packs avec prix dynamiques (sécheresse → eau plus chère).
6. **Premium**: page FarmTycoon+ avec tarifs (mensuel/annuel), features. Endpoint backend `pending_integration` (Maketou à brancher plus tard).

## What's Been Implemented (v1.1 — 2026-02-13)
- [x] **Daily Missions system** — 3 missions/jour seedées par day (pool de 9), récompenses XP/cash/crédits/cosmétiques
- [x] **Progression niveau** (XP → level avec barre de progression)
- [x] **Cosmétiques débloquables** à L3/5/8/12/18 (themes + bannière)
- [x] **Topbar level badge** (niveau + XP + crédits)
- [x] **Page /missions** + panel compact sur Dashboard
- [x] **day_stats** trackés (harvests, sells_qty, fertilizations, irrigations, plantings, contracts_fulfilled, water_purchased)
- [x] Endpoints `GET /api/missions` et `POST /api/missions/{id}/claim`
- [x] Pas de paywall — toutes les missions sont gratuites

## What's Been Implemented (v1.0 — 2026-02-13)
- [x] Backend complet (15 endpoints REST) avec auto-tick basé sur temps réel
- [x] Système économique: trésorerie, fluctuation marché (random walk + mean-reversion), météo Markov (5 conditions), index sécheresse → impact prix eau
- [x] 5 cultures avec coûts/rendements/durées différenciés
- [x] 7 ressources (eau, carburant, électricité, 3 engrais, herbicide) avec prix dynamiques
- [x] 8 parcelles seed (2 détenues + 6 sur marché foncier)
- [x] Système de contrats (4 contrats générés/jour avec primes 5-35%)
- [x] Alertes intelligentes (ressources faibles, météo, mauvaises herbes, récolte prête)
- [x] Journal d'activité persistant en MongoDB
- [x] Frontend complet 6 routes + sidebar desktop + bottom nav mobile + topbar glass
- [x] Dashboard ERP avec hero photo réelle, 4 KPIs + 4 KPIs ressources, Area chart Recharts, météo, carte, alertes, activité
- [x] Vraies photos Unsplash (tracteur, blé, silos, etc.)
- [x] Toaster (Sonner) pour feedback actions
- [x] data-testid sur tous les éléments interactifs

## Backlog / Next Tasks
### P1 — Court terme
- Animations Motion sur entrée des KPI cards (stagger reveal)
- Module Élevage (animaux, alimentation, vétérinaire, génétique)
- Module Véhicules/Garage (tracteurs, station carburant, atelier)
- Module Employés (recrutement, salaires, productivité)

### P2 — Moyen terme
- Intégration API Maketou réelle pour paiements premium
- Crédits premium & cosmétiques
- Système d'achievements/missions
- Carte interactive (canvas/SVG) avec positions géographiques des parcelles
- Mode multijoueur coopératif (coopérative agricole partagée)

### P3 — Long terme
- Authentification (passage du mode démo global → comptes utilisateur)
- Sauvegarde par utilisateur + leaderboard
- App mobile native (PWA installable d'abord)
- Thèmes premium déblocables
- Rapports analytics avancés (export PDF)

## Important Setup Notes
- Backend démarre via supervisor sur port 8001
- Frontend démarre via supervisor sur port 3000
- MongoDB local via `MONGO_URL`
- Aucune clé API requise pour le MVP
