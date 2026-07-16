#!/usr/bin/env python3
"""Resolve worklog.md merge conflict by keeping both sides in chronological order."""
from pathlib import Path

p = Path('/home/z/my-project/worklog.md')
text = p.read_text()

# Find conflict markers
start = text.index('<<<<<<< HEAD\n')
sep = text.index('\n=======\n', start)
end = text.index('\n>>>>>>> origin/main\n', sep)

# HEAD section (Wave 11 entry) and main section (Wave 7+8 entry)
head_section = text[start + len('<<<<<<< HEAD\n'):sep]
main_section = text[sep + len('\n=======\n'):end]
trailing = text[end + len('\n>>>>>>> origin/main\n'):]

# Chronological order: main (Wave 7+8) first, then HEAD (Wave 11)
# Both sections already end with content; ensure proper "---" separator between them
# The main_section starts with "Task ID: 7..." and the trailing starts with whatever followed
resolved = (
    text[:start]
    + main_section.rstrip()
    + "\n\n---\n"
    + head_section.rstrip()
    + "\n"
    + trailing
)

p.write_text(resolved)
print("Conflict resolved. Verifying no markers remain...")
assert '<<<<<<<' not in resolved and '=======' not in resolved and '>>>>>>>' in resolved.replace('>>>>>>>','XXX') is False or '>>>>>>> ' not in resolved
print("OK — no conflict markers remain.")
print(f"File size: {len(resolved)} bytes, {resolved.count(chr(10))} lines")
