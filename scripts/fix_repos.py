#!/usr/bin/env python3
"""
Add findByIds and exists methods to all Prisma repository classes
that are missing them.
"""
import re
from pathlib import Path

REPO_FILE = Path('/home/z/my-project/preone/apps/api/src/modules/academics/infrastructure/repositories/prisma-academics.repository.ts')
content = REPO_FILE.read_text()

# Pattern: find each class's findById method and add findByIds + exists after it
# We'll insert after the closing brace of findById method

# For academics repos, the prisma model names are:
# AcademicSession -> academicSession
# Curriculum -> curriculum
# Section -> section
# Enrollment -> enrollment
# Observation -> observation
# Assessment -> assessment
# ReportCard -> reportCard
# Portfolio -> portfolio

REPO_FIXES = [
    ('PrismaAcademicSessionRepository', 'academicSession'),
    ('PrismaCurriculumRepository', 'curriculum'),
    ('PrismaSectionRepository', 'section'),
    ('PrismaEnrollmentRepository', 'enrollment'),
    ('PrismaObservationRepository', 'observation'),
    ('PrismaAssessmentRepository', 'assessment'),
    ('PrismaReportCardRepository', 'reportCard'),
    ('PrismaPortfolioRepository', 'portfolio'),
]

for class_name, model in REPO_FIXES:
    # Check if findByIds already exists in this class
    class_start = content.find(f'class {class_name}')
    if class_start == -1:
        print(f'WARNING: {class_name} not found')
        continue
    # Find the next class start or end of file
    next_class = content.find('\n@', class_start + 1)
    if next_class == -1:
        next_class = len(content)
    class_block = content[class_start:next_class]
    
    if 'findByIds' in class_block:
        print(f'SKIP: {class_name} already has findByIds')
        continue
    
    # Find the save method and insert before it
    save_pattern = f'  async save('
    save_idx = content.find(save_pattern, class_start)
    if save_idx == -1 or save_idx > next_class:
        print(f'WARNING: save method not found in {class_name}')
        continue
    
    methods = f'''  async findByIds(ids: readonly string[]): Promise<{class_name.replace('Prisma', '').replace('Repository', '')}Aggregate[]> {{
    const rows = await this.prisma.{model}.findMany({{ where: {{ id: {{ in: [...ids] }} }} }});
    return rows.map((r) => this.toDomain(r as any));
  }}

  async exists(id: string): Promise<boolean> {{
    const c = await this.prisma.{model}.count({{ where: {{ id }} }});
    return c > 0;
  }}

'''
    content = content[:save_idx] + methods + content[save_idx:]
    print(f'ADDED findByIds + exists to {class_name}')

REPO_FILE.write_text(content)
print('Done!')
