# Position Page Standardization Walkthrough

The job position detail page (`/dashboard/organization/positions/[positionId]`) has been fully refactored to strictly adhere to the system's core design rules.

## Standardized UI Elements

### 1. Global Styles & Tokens
- **Borders & Radii**: All custom `rounded-2xl` and `rounded-3xl` classes have been replaced with the standardized `rounded-xl`.
- **Colors**:
  - `slate-*` colors replaced with `muted`, `muted-foreground`, and `foreground`.
  - `indigo-*` (brand color) replaced with `primary` and `primary/10`.
  - `bg-white` replaced with `bg-background` for card contents and inputs.
- **Shadows**: Applied `shadow-premium` to main cards and dropdowns/popovers.

### 2. Header & Approval Card
- The main header card now uses a cleaner typography hierarchy with `text-foreground` and `text-muted-foreground`.
- The completion progress bar uses `bg-primary`.
- Action buttons (Approve/Disapprove/Delete) follow the standardized `h-10`, `rounded-xl`, and `font-bold uppercase tracking-widest` styles.

### 3. Tabs Component
- The tabs list has been transformed into a premium "pill-shaped" design with `bg-muted/50` and `rounded-xl`.
- Active triggers use `bg-background` and `text-primary`.

### 4. Component Refactoring
- **PositionOverview**: Standardized all identification, organization, and classification sections.
- **PositionCompetency**:
  - Renamed "Experience & Education" to "Requirements".
  - Implemented a tag-based input for the "Profession" field.
  - Standardized all requirement cards and skill level bars.
- **PositionCompensation**:
  - Full migration to a multi-step salary system with custom naming for each step.
  - Standardized salary range bars and active step highlighting.
- **PositionBenefits**:
  - Standardized allowance cards with `shadow-premium` and `rounded-xl`.
  - Use `text-primary` for icons and status elements.

### 5. Dialogs & Modals
- `AlertDialog` components for delete, approve, and disapprove actions have been standardized with `rounded-xl` and cohesive typography.
- Input fields within dialogs (Date pickers, Textareas) now use `bg-muted/30` and `border-border`.

## Technical Improvements
- **Semantic Colors**: Retained semantic colors (rose/destructive, emerald/success, amber/warning) for functional clarity while standardizing their intensity and associated shadows.
- **Component Reusability**: Refactored custom JSX elements into standardized utility patterns.
