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

## 🧩 Core Components

| Component | Responsibility |
| :--- | :--- |
| `PositionBasicInfo` | Core details: Title, Department, Reports To, and Code. |
| `PositionClassification` | HR classification: Level, Category, and Employment Type. |
| `PositionCompetency` | Requirements: Education, Experience, and Skills. |
| `PositionCompensation` | Financials: Salary range and payment frequency. |
| `PositionBenefits` | Perks and additional benefits associated with the role. |
| `PositionEmployees` | Manages the relationship between the position and employees. |
| `CompletionBar` | Visual indicator and validation gate for approval based on data completeness. |

### 📊 Completion Scoring Logic
The `CompletionBar` uses a weighted system to calculate the readiness of a position:
- **Core Info (20%)**: Title and Department assignment.
- **Classification (40%)**: Level, Job Category, Employment Type, and Work Schedule (10% each).
- **Competency (30%)**: Purpose/Description and Responsibilities (15% each).
- **Compensation (10%)**: Salary minimum/mid-point configuration.

*Approval is only enabled when the score reaches **100%**.*

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
