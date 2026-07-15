#!/usr/bin/env python3
"""
Fix Prisma schema: add schoolId to tenant-scoped Academics models that are missing it.
Also add School back-relations and indexes.
"""
import re
from pathlib import Path

SCHEMA = Path('/home/z/my-project/preone/packages/database/prisma/schema.prisma')
content = SCHEMA.read_text()

# Models that need schoolId added
MODELS_TO_FIX = {
    'Curriculum': {
        'after_id': '  sessionId   String @map("session_id") @db.Uuid',
        'school_line': '  schoolId    String @map("school_id") @db.Uuid',
        'relation': '  school            School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)\n',
        'index_line': '  @@index([schoolId])',
    },
    'Section': {
        'after_id': '  sessionId  String @map("session_id") @db.Uuid',
        'school_line': '  schoolId   String @map("school_id") @db.Uuid',
        'relation': '  school            School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)\n',
        'index_line': '  @@index([schoolId])',
    },
    'Enrollment': {
        'after_id': '  studentId  String @map("student_id") @db.Uuid',
        'school_line': '  schoolId   String @map("school_id") @db.Uuid',
        'relation': '  school            School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)\n',
        'index_line': '  @@index([schoolId])',
    },
    'Observation': {
        'after_id': '  enrollmentId String @map("enrollment_id") @db.Uuid',
        'school_line': '  schoolId     String @map("school_id") @db.Uuid',
        'relation': '  school            School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)\n',
        'index_line': '  @@index([schoolId])',
    },
    'Assessment': {
        'after_id': '  sectionId  String @map("section_id") @db.Uuid',
        'school_line': '  schoolId   String @map("school_id") @db.Uuid',
        'relation': '  school            School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)\n',
        'index_line': '  @@index([schoolId])',
    },
    'ReportCard': {
        'after_id': '  enrollmentId String @map("enrollment_id") @db.Uuid',
        'school_line': '  schoolId     String @map("school_id") @db.Uuid',
        'relation': '  school            School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)\n',
        'index_line': '  @@index([schoolId])',
    },
    'Portfolio': {
        'after_id': '  enrollmentId String @unique @map("enrollment_id") @db.Uuid',
        'school_line': '  schoolId     String @map("school_id") @db.Uuid',
        'relation': '  school            School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)\n',
        'index_line': '  @@index([schoolId])',
    },
}

for model_name, fix in MODELS_TO_FIX.items():
    # Find the model block
    pattern = f'model {model_name} {{'
    idx = content.find(pattern)
    if idx == -1:
        print(f'WARNING: model {model_name} not found')
        continue

    # Find the line after which to insert schoolId
    after_idx = content.find(fix['after_id'], idx)
    if after_idx == -1:
        print(f'WARNING: could not find anchor for {model_name}: {fix["after_id"]}')
        continue

    # Check if schoolId already exists
    model_end = content.find('}', after_idx)
    model_block = content[idx:model_end]
    if 'schoolId' in model_block:
        print(f'SKIP: {model_name} already has schoolId')
        continue

    # Insert schoolId line after the anchor line
    line_end = content.find('\n', after_idx)
    insertion_point = line_end + 1
    content = content[:insertion_point] + fix['school_line'] + '\n' + content[insertion_point:]
    print(f'ADDED schoolId to {model_name}')

# Now add School back-relations. Find the School model and add the new relations.
school_model_start = content.find('model School {')
school_model_end = content.find('\n}', school_model_start)
school_block = content[school_model_start:school_model_end]

# Add back-relations if they don't exist
new_relations = [
    '  curricula           Curriculum[]',
    '  academicSections    Section[]',
    '  enrollments         Enrollment[]',
    '  observations        Observation[]',
    '  assessments         Assessment[]',
    '  reportCards         ReportCard[]',
    '  portfolios          Portfolio[]',
]

# Find the Wave 3 back-relations marker
wave3_marker = '// ─── Wave 3 back-relations ───'
wave3_idx = content.find(wave3_marker, school_model_start)
if wave3_idx != -1:
    # Find the end of the back-relations block (next blank line or @@index)
    block_end = content.find('\n\n', wave3_idx)
    existing_block = content[wave3_idx:block_end]
    
    new_lines = []
    for rel in new_relations:
        field_name = rel.strip().split()[0]
        if field_name not in existing_block:
            new_lines.append(rel)
    
    if new_lines:
        # Insert before the blank line
        insertion = '\n'.join(new_lines) + '\n'
        content = content[:block_end] + insertion + content[block_end:]
        print(f'ADDED {len(new_lines)} back-relations to School model')

# Also add deletedAt to Portfolio if missing
portfolio_model_start = content.find('model Portfolio {')
portfolio_model_end = content.find('\n}', portfolio_model_start)
portfolio_block = content[portfolio_model_start:portfolio_model_end]
if 'deletedAt' not in portfolio_block:
    # Add deletedAt before the relations section
    updated_at_line = '  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz'
    updated_at_idx = content.find(updated_at_line, portfolio_model_start)
    if updated_at_idx != -1 and updated_at_idx < portfolio_model_end:
        line_end = content.find('\n', updated_at_idx)
        content = content[:line_end+1] + '  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz\n' + content[line_end+1:]
        print('ADDED deletedAt to Portfolio')

SCHEMA.write_text(content)
print('Done!')
