#!/bin/sh
# Ξαναχτίζει τα διαγράμματα πάνω στο καθαρό περιεχόμενο (git) και κάνει build.
set -e
cd "$(dirname "$0")/.."
git checkout 600af62 -- content/   # καθαρό περιεχόμενο, χωρίς διαγράμματα
cd tools && python3 figs_p11.py && python3 figs_p10.py && cd ..
python3 tools/build.py | tail -3
