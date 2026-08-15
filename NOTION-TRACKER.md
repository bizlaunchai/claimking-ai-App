
## Role Permissions UI — role-first redesign (UX)

**Setup**
- [ ] Redeploy frontend (no migration)
- [ ] Go to Team → Roles & Permissions

**Role-first editor**
- [ ] There is a row of role tabs (Admin, Estimator, Field, Office, Client); one is selected
- [ ] Selecting "Admin" shows a "full access — nothing to edit" note, no toggles
- [ ] Selecting any other role shows permission groups, each a card
- [ ] Each permission has ONE on/off switch (no green/red mini-buttons, no 5-column grid)
- [ ] Each group header shows "X of N on" and a master switch that flips the whole group
- [ ] Collapsing/expanding a group works; "Expand all"/"Collapse all" work
- [ ] Search filters permissions and auto-expands matches
- [ ] Toggling any switch shows "Unsaved changes"; Save persists; reloading keeps the change
- [ ] A seeded scope value (e.g. Field "assigned") shows the switch ON with a small scope pill
- [ ] Reset to Defaults restores the seeded matrix
