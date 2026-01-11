# Position Details System Documentation

This documentation provides a comprehensive overview of the **Position Details** page and its underlying architecture. This page is responsible for managing individual job positions, their classifications, competencies, compensation, and the employees assigned to them.

## 📍 File Locations
- **Main Page**: `src/app/dashboard/organization/positions/[positionId]/page.tsx`
- **Sub-components**: `src/app/dashboard/organization/positions/[positionId]/components/`
- **Types**: `src/app/dashboard/organization/types.ts`

---

## 🏗 Architecture & Data Flow

### 1. Real-time Data Synchronization
The page utilizes custom Firebase hooks for real-time data fetching:
- `useDoc<Position>`: Fetches the primary position data.
- `useCollection<Employee>`: Monitors employees assigned to this specific position.
- **Lookups**: Multiple `useCollection` hooks fetch supporting data like `PositionLevels`, `JobCategories`, `EmploymentTypes`, and `WorkSchedules` for dropdowns and display labels.

### 2. State Management
- **Local Form State (`formData`)**: When in edit mode, a clone of the position data is stored here. This allows for "discard changes" functionality.
- **Dirty Checking**: The system compares `formData` with the live `position` data using `useMemo` to determine if there are unsaved changes.
- **UI States**: Manages multiple dialogs (`isDeleteConfirmOpen`, `isApproveConfirmOpen`, `isAssignDialogOpen`) and loading states.

---

### 🧩 Core Components

| Component | Responsibility |
| :--- | :--- |
| **Action Card** | Dedicated card for approval, disapproval, and deletion. Integrated with the validation checklist. |
| `PositionBasicInfo` | Core details: Title, Department, Reports To, and Code. |
| `PositionClassification` | HR classification: Level, Category, and Employment Type. |
| `PositionCompetency` | Requirements: Education, Experience, and Skills. |
| `PositionCompensation` | Financials: Salary range and payment frequency. |
| `PositionBenefits` | Perks and additional benefits associated with the role. |
| `PositionEmployees` | Manages the relationship between the position and employees. |

### 📊 Completion Scoring & Validation Logic
The approval process is gated by a mandatory validation checklist:
- **Title & Code**: Basic identifiers must be present.
- **Hierarchy**: Department assignment is required.
- **Classification**: Level, Job Category, Employment Type, and Work Schedule must be selected.
- **Content**: General purpose and at least one responsibility.
- **Compensation**: Mid-salary must be greater than 0.

*Approval is only enabled when all checklist items (10/10) are completed. The UI provides real-time feedback and tooltips for missing data.*

---

## ⚡ Key Logic & Workflows

### 1. Approval Workflow
- **State**: Controlled by `isApproved` boolean.
- **Approve**: Sets `isApproved: true`, records timestamp, and user ID in `approvalHistory`.
- **Disapprove**: Resets `isApproved: false` and logs the action.
- **Locking**: Certain fields or actions may be restricted when a position is in "Approved" status.

### 2. Employee Assignment (`Assign/Release`)
- **Assign**: Link an employee record to the `positionId` and increment the `filled` count.
- **Release**: Uses a `writeBatch` to:
    1. Reset the employee's `positionId`.
    2. Decrement the position's `filled` counter.
    3. (Optional) Log the release in the history.

### 3. Edit & Discard
- The page supports a "Global Edit" mode.
- Users enter edit mode -> Modify data in sub-components -> Save or Discard.
- Uses `updateDocumentNonBlocking` for performance.

---

## 🎨 UI/UX Patterns
- **Responsive Layout**: Uses a grid system that adapts from 1 column on mobile to a multi-column layout on large screens.
- **Status Indicators**:
    - <Badge className="bg-emerald-500">Батлагдсан</Badge> (Approved)
    - <Badge variant="outline">Төсөл</Badge> (Draft/Pending)
- **Interactive Feedback**: 
    - `lucide-react` icons for visual cues.
    - `framer-motion` for smooth tab transitions.
    - `shadcn/ui` components for consistency (Cards, Tabs, Dialogs).

---

## 📝 Data Schema Reference (`Position`)
The position object contains keys for:
- `title`, `code`, `departmentId`
- `levelId`, `categoryId`, `typeId`
- `minSalary`, `maxSalary`, `currency`
- `requirements`, `competencies` (Arrays/Objects)
- `filled`, `capacity` (Integer management)
- `isApproved`, `approvalHistory` (Workflow tracking)

---

> [!NOTE]  
> This documentation is intended for maintainers and developers. For user-specific guides, please refer to the HR User Manual.
