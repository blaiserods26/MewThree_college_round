# 04: Reproducible Environment and Demo Reset

**What to build:** A clean-start story for the demo. A new developer (or the team on demo day) can clone, configure and run the whole system from scratch, and reset demo data to the known baseline with one command or a documented procedure. All environment variables are documented, no secrets are hardcoded, and the database schema is reproducible.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] All required environment variables documented (e.g. `.env.example` and README section).
- [x] No hardcoded secrets remain in the repo.
- [x] Database schema/migrations recreate the store from empty.
- [x] One command resets demo data to the baseline storefront state.
- [x] Documented clean-start procedure verified from a fresh clone.
- [x] Server logs show no critical errors on a clean start.
