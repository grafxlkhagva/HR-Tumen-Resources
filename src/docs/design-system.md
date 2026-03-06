# HR System Design System

## Overview

This design system provides a consistent, neutral/minimal visual language for the HR application. It's built on:
- **Tailwind CSS** for styling
- **shadcn/ui** for primitive components
- **CVA (class-variance-authority)** for component variants

## Design Tokens

### Colors

The color system is based on a neutral gray scale with semantic colors for status indicators.

```css
/* Gray Scale */
--gray-50 to --gray-950

/* Semantic Colors */
--success: Green for positive states
--warning: Amber for warnings
--error: Red for errors
--info: Blue for informational states
```

### Typography

| Token | Size | Weight | Use Case |
|-------|------|--------|----------|
| `text-display` | 2.25rem | 600 | Page titles, hero text |
| `text-title` | 1.5rem | 600 | Section titles |
| `text-subtitle` | 1.125rem | 500 | Card titles, subsections |
| `text-body` | 0.875rem | 400 | Default body text |
| `text-body-medium` | 0.875rem | 500 | Emphasized body text |
| `text-caption` | 0.75rem | 400 | Secondary text, hints |
| `text-caption-medium` | 0.75rem | 500 | Labels |
| `text-micro` | 0.6875rem | 500 | Badges, tags |

### Spacing

| Token | Value | Use Case |
|-------|-------|----------|
| `p-page` | 1.5rem | Page padding |
| `p-page-lg` | 2rem | Large page padding |
| `gap-section` | 2rem | Section gaps |
| `p-card` | 1.25rem | Card padding |
| `p-card-sm` | 1rem | Compact card padding |
| `gap-inline` | 0.75rem | Inline element spacing |

### Shadows

| Token | Description |
|-------|-------------|
| `shadow-card` | Subtle shadow for cards |
| `shadow-card-hover` | Elevated shadow on hover |
| `shadow-sm` | Small shadow |
| `shadow-md` | Medium shadow |

## Components

### Primitive Components (`/components/ui/`)

These are base-level components from shadcn/ui with custom styling:

- **Button** - Multiple variants: default, outline, ghost, destructive, success, warning
- **Card** - Container with subtle shadow
- **Input** - Form input with focus ring
- **Badge** - Status indicators with semantic colors
- **And more...**

### Pattern Components (`/components/patterns/`)

Composite components built from primitives:

#### StatCard
Display statistics and metrics.

```tsx
import { StatCard, StatGrid } from '@/components/patterns';

<StatGrid columns={4}>
  <StatCard
    title="Total Employees"
    value={125}
    icon={Users}
    description="Active employees"
    href="/dashboard/employees"
  />
</StatGrid>
```

#### PageHeader
Consistent page headers with breadcrumbs.

```tsx
import { PageHeader } from '@/components/patterns';

<PageHeader
  title="Page Title"
  description="Optional description"
  showBackButton
  actions={<Button>Action</Button>}
/>
```

#### PageLayout & PageSection
Page structure components.

```tsx
import { PageLayout, PageSection } from '@/components/patterns';

<PageLayout header={<PageHeader title="..." />}>
  <PageSection title="Section Title">
    Content here
  </PageSection>
</PageLayout>
```

#### FormSection & FormCard
Form grouping components.

```tsx
import { FormCard, FormRow, FormFieldWrapper } from '@/components/patterns';

<FormCard title="User Details">
  <FormRow columns={2}>
    <FormFieldWrapper label="First Name" required>
      <Input />
    </FormFieldWrapper>
    <FormFieldWrapper label="Last Name">
      <Input />
    </FormFieldWrapper>
  </FormRow>
</FormCard>
```

#### DataTable
Table pattern with consistent styling.

```tsx
import {
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/patterns';

<DataTable>
  <DataTableHeader>
    <DataTableRow>
      <DataTableColumn>Name</DataTableColumn>
      <DataTableColumn>Status</DataTableColumn>
    </DataTableRow>
  </DataTableHeader>
  <DataTableBody>
    <DataTableRow onClick={() => {}}>
      <DataTableCell>John Doe</DataTableCell>
      <DataTableCell><Badge variant="success">Active</Badge></DataTableCell>
    </DataTableRow>
  </DataTableBody>
</DataTable>
```

#### EmptyState
Empty state display.

```tsx
import { EmptyState } from '@/components/patterns';

<EmptyState
  icon={Users}
  title="No results found"
  description="Try adjusting your filters"
  action={{ label: "Clear filters", onClick: () => {} }}
/>
```

## Usage Guidelines

### Do's
- Use design tokens (CSS variables / Tailwind classes) for colors and spacing
- Import pattern components for common UI patterns
- Use semantic color variants for badges (success, warning, error, info)
- Use the typography scale classes for consistent text sizing

### Don'ts
- Don't use hardcoded colors like `bg-slate-900` or `text-emerald-500`
- Don't use arbitrary values like `text-[11px]` or `p-[18px]`
- Don't recreate patterns that exist in `/components/patterns/`

## File Structure

```
src/
├── components/
│   ├── ui/                  # Primitive components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── patterns/            # Composite patterns
│       ├── stat-card.tsx
│       ├── page-layout.tsx
│       ├── form-section.tsx
│       ├── data-table.tsx
│       ├── empty-state.tsx
│       └── index.ts
├── app/
│   └── globals.css          # Design tokens
└── tailwind.config.ts       # Tailwind configuration
```

## Migration Guide

When updating existing pages:

1. Replace hardcoded colors with design tokens
2. Replace custom spacing with spacing tokens (`p-page`, `gap-section`, etc.)
3. Replace typography with scale classes (`text-title`, `text-body`, etc.)
4. Use pattern components where applicable

Example before/after:

```tsx
// Before
<div className="p-6 md:p-8 space-y-8">
  <h1 className="text-3xl font-semibold">Title</h1>
  <p className="text-sm text-slate-500">Description</p>
</div>

// After
<div className="p-page space-y-section">
  <PageHeader title="Title" description="Description" />
</div>
```
