# Table Tennis Tournament Manager

Release: Dynamic Group Configuration & Generalized Flow (2025-12-15)

This project implements a flexible Table Tennis tournament manager built with React + Vite and Tailwind CSS. Key updates in this release:

- Generalized tournament flow for any team count (3-6)
- Dynamic group configuration modal shown at start of every round
- Single-group and multi-group formats supported
- Smart qualification logic (top-half by default, auto final when 2 teams remain)
- Modal fixes and UI improvements

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
# open http://localhost:3000 (or the port shown)
```

Usage notes

- On starting a tournament, the app will prompt you to choose a group configuration for that round.
- You can choose single group (everyone plays everyone) or split into groups.
- The system advances rounds until a final match between two teams.
- The app runs fully in-memory; no persistent storage by default (data resets on refresh).

Next suggested steps

- Add optional persistence (localStorage or server backend) if you want to resume tournaments after refresh.
- Add tests and CI pipeline for deployment (Vercel/GitHub Pages).

Repository

https://github.com/rakin5hahriar/table-tennis.git

---

If you want, I can also add a short CHANGELOG entry, tag a release, or open a GitHub Release draft.