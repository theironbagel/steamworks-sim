# server/

Empty for now. This will hold the authoritative multiplayer room (Stage 6+):
runs the same `sim/` logic at 60Hz, broadcasts snapshots to clients, and is
the referee for scoring. Not needed until multiplayer work begins — the
client can simulate a full solo match on its own first.
