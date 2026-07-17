#!/usr/bin/env python3
"""Wire Wave 21 gap-fill controllers into each module's *.module.ts file."""
import re
from pathlib import Path

ROOT = Path('/home/z/my-project/preone/apps/api/src/modules')

MODULES = [
    'academics', 'administration', 'admissions', 'attendance',
    'communication', 'crm', 'finance', 'hr', 'identity',
    'inventory', 'platform', 'reports', 'settings', 'student',
]

# Find generated gap-fill controller class names per module by reading the controller file
def find_classes(ctrl_file: Path) -> list[str]:
    if not ctrl_file.exists(): return []
    text = ctrl_file.read_text()
    return re.findall(r'export class (\w+)', text)

for mod in MODULES:
    ctrl_file = ROOT / mod / 'controllers' / f'{mod}-gap-fill.controllers.ts'
    classes = find_classes(ctrl_file)
    if not classes:
        print(f'{mod}: no gap-fill controllers found')
        continue

    module_file = ROOT / mod / f'{mod}.module.ts'
    if not module_file.exists():
        # student module is special: students.module.ts? let's find the right file
        candidates = list(ROOT.glob(f'{mod}/*.module.ts'))
        if not candidates:
            print(f'{mod}: no .module.ts found')
            continue
        module_file = candidates[0]

    text = module_file.read_text()

    # Skip if already wired
    if classes[0] in text:
        print(f'{mod}: already wired, skipping')
        continue

    # 1. Add import statement after the existing controllers import block
    # Find the existing `from './controllers/...'` import and append
    import_pattern = re.compile(
        r"(import \{[^}]+\} from '\./controllers/[^']+';)",
        re.MULTILINE
    )
    matches = list(import_pattern.finditer(text))
    if matches:
        last = matches[-1]
        new_import = (
            f"\nimport {{ {', '.join(classes)} }} from './controllers/{mod}-gap-fill.controllers';"
        )
        text = text[:last.end()] + new_import + text[last.end():]
    else:
        # No existing controller import; add after first import line
        first_import = re.search(r'^import .*?;$', text, re.MULTILINE)
        if first_import:
            new_import = (
                f"\nimport {{ {', '.join(classes)} }} from './controllers/{mod}-gap-fill.controllers';"
            )
            text = text[:first_import.end()] + new_import + text[first_import.end():]

    # 2. Add classes to the `controllers: [...]` array
    # Find the controllers array — look for `controllers: [` then capture until `]`
    ctrl_array_pattern = re.compile(
        r"controllers:\s*\[([^\]]+)\]",
        re.MULTILINE | re.DOTALL
    )
    m = ctrl_array_pattern.search(text)
    if m:
        existing = m.group(1).strip()
        # Append the new classes
        if existing.endswith(','):
            new_block = f"{existing}\n    {', '.join(classes)},\n  "
        else:
            new_block = f"{existing},\n    {', '.join(classes)},\n  "
        text = text[:m.start()] + f"controllers: [{new_block}]" + text[m.end():]
    else:
        print(f'{mod}: WARNING - no controllers array found in {module_file.name}')
        continue

    module_file.write_text(text)
    print(f'{mod}: wired {len(classes)} gap-fill controllers')
