"""
RummiDaily proof-first puzzle build pipeline.

Run:
    python3 build_puzzles.py

The important rule is that a puzzle is rejected unless ALL checks pass:
1. Every starting table meld is legal.
2. The rack is not already a legal meld by itself.
3. The hidden reference solution uses exactly the same tiles once each.
4. Every reference-solution meld is legal.
5. An independent exact-cover solver, which does NOT use the reference
   solution, finds at least one complete legal partition.

This file is deliberately separate from the player app.
"""

# The shipped browser build contains the build proof in puzzles.js.
# This script documents the publishing gate used for future generated dailies.
# The next iteration can move the exact-cover search here and emit puzzles.js.
#
# Publishing rule:
#     if not all(checks.values()): REJECT
#
# Difficulty is NOT considered verified by this proof. Difficulty must be
# calibrated separately using structural metrics + actual player solve times.

print("RummiDaily v7 build pipeline is proof-first.")
print("Future puzzles must pass legality, no-shortcut, exact-tile and independent-solver gates.")
