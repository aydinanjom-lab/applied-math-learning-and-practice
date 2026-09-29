#!/bin/bash
# Double-click this file in Finder to start a session in Terminal.
# First time only: right-click > Open, or run in Terminal:  chmod +x drill.command
cd "$(dirname "$0")"
python3 -m applied_math
echo
read -n 1 -s -r -p "Done. Press any key to close."
