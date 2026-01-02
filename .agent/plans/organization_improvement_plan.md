# Organization Page Improvement Plan

## 1. Current State Analysis
- **Code Structure:** The file `src/app/dashboard/organization/page.tsx` is overly large (~1000 lines), containing multiple distinct features (Structure, Positions, Headcount) mixed together.
- **UI/UX:** 
    - The layout uses legacy spacing (`space-y-8`) inconsistent with the new "Full Height" design system.
    - Navigation relies on internal Tabs but lacks a unified Page Header.
    - The Organization Chart is built with basic HTML/CSS custom lists, which lacks interactivity (Zoom/Pan) and scales poorly with large organizations.
    - Position management is functional but visually basic.

## 2. Improvement Strategy

### Phase 1: Standardization & Refactoring (Immediate)
**Goal:** Align the page with the rest of the Admin Dashboard and improve code maintainability.
1.  **Break Down Components:** Extract `StructureTab`, `PositionsTab`, and `HeadcountTab` into separate files within `src/app/dashboard/organization/components/`.
2.  **Apply Standard Layout:** 
    - Implement the `flex flex-col h-full overflow-hidden` pattern.
    - Integrate `PageHeader` for consistent navigation and title.
    - Ensure scroll behavior is handled correctly.

### Phase 2: React Flow Integration (High Impact)
**Goal:** Create a professional, interactive Organization Chart.
1.  **Replace CSS Chart:** Remove the `<ul>/<li>` based chart.
2.  **Implement React Flow:** 
    - Use `reactflow` (already installed) to render departments as nodes.
    - Auto-layout the graph content using `dagre` or `elkjs` for hierarchical tree structure.
    - **Features:** Zoom in/out, Pan, Mini-map.
    - **Custom Nodes:** Design beautiful cards for departments showing Head Count, Manager (if any), and status.

### Phase 3: Enhanced Management (Future)
1.  **Drag-and-Drop Restructuring:** Allow moving departments by dragging nodes in the chart.
2.  **Visual Headcount:** Show "Filled vs Open" positions visually on the chart nodes (e.g., progress bar).

## 3. Execution Steps
1.  Create `components` folder structure.
2.  Move `AddTypeDialog`, `AddDepartmentDialog` etc., to `components/dialogs`.
3.  Extract main tabs to `components/tabs`.
4.  Update `page.tsx` to use the new layout and imported components.
5.  *Optional:* Begin React Flow integration for the Structure tab.
