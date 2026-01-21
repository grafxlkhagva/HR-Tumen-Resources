import { collection, query, where, getDocs, Timestamp, addDoc, doc } from 'firebase/firestore';
import { ERWorkflow, ERDocumentType, ERTemplate } from './types';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

// Using the same firebase instance as the app
import { initializeFirebase } from '@/firebase';

export async function seedDemoData() {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore not initialized");

    console.log("Starting seed...");

    // 1. Create Workflow
    const workflowData = {
        name: 'Хөдөлмөрийн гэрээ батлах',
        description: 'Стандарт хөдөлмөрийн гэрээг батлах урсгал',
        steps: [
            {
                id: crypto.randomUUID(),
                name: 'Хүний нөөц хянах',
                approverRole: 'HR_MANAGER',
                actionType: 'REVIEW',
                order: 0
            },
            {
                id: crypto.randomUUID(),
                name: 'Захирал батлах',
                approverRole: 'DIRECTOR',
                actionType: 'APPROVE',
                order: 1
            },
            {
                id: crypto.randomUUID(),
                name: 'Ажилтан гарын үсэг зурах',
                approverRole: 'EMPLOYEE',
                actionType: 'SIGN',
                order: 2
            }
        ],
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    // Check if exists
    const wfQuery = query(collection(firestore, 'er_workflows'), where('name', '==', workflowData.name));
    const wfSnap = await getDocs(wfQuery);

    let workflowId = '';
    if (!wfSnap.empty) {
        console.log("Workflow already exists");
        workflowId = wfSnap.docs[0].id;
    } else {
        const docRef = await addDoc(collection(firestore, 'er_workflows'), workflowData);
        workflowId = docRef.id;
        console.log("Workflow created", workflowId);
    }

    // 2. Create Document Type
    const typeData = {
        name: 'Хөдөлмөрийн гэрээ',
        code: 'CONTRACT_EMP_FULL',
        description: 'Хугацаагүй хөдөлмөрийн гэрээ',
        workflowId: workflowId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    const typeQuery = query(collection(firestore, 'er_process_document_types'), where('code', '==', typeData.code));
    const typeSnap = await getDocs(typeQuery);

    let typeId = '';
    if (!typeSnap.empty) {
        console.log("Document Type already exists");
        typeId = typeSnap.docs[0].id;
        // Ensure workflow is linked
        if (typeSnap.docs[0].data().workflowId !== workflowId) {
            await updateDocumentNonBlocking(doc(firestore, 'er_process_document_types', typeId), { workflowId });
        }
    } else {
        const docRef = await addDoc(collection(firestore, 'er_process_document_types'), typeData);
        typeId = docRef.id;
        console.log("Document Type created", typeId);
    }

    // 3. Create Template
    const templateData = {
        name: 'Үндсэн гэрээ 2025',
        documentTypeId: typeId,
        version: 1,
        content: `МОНГОЛ УЛСЫН ХӨДӨЛМӨРИЙН ГЭРЭЭ

Нэг талаас "Компани ХХК" (цаашид "Ажил олгогч" гэх),
Нөгөө талаас {{employee.lastName}} овогтой {{employee.firstName}} (цаашид "Ажилтан" гэх) нар харилцан тохиролцож энэхүү гэрээг байгуулав.

1. Нийтлэг үндэслэл
1.1. Ажилтан нь {{position.title}} албан тушаалд ажиллана.
1.2. Хөдөлмөрийн хөлс: {{salary.total}} төгрөг байна.
1.3. Ажил эхлэх огноо: {{date.today}}.

2. Ажилтны эрх үүрэг...
(Энэ бол жишээ гэрээний загвар юм)

Ажил олгогчийг төлөөлж:                  Ажилтан:
Гүйцэтгэх захирал                        ____________________
____________________                     {{employee.firstName}}
(Гарын үсэг)                             (Гарын үсэг)
`,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    const tmplQuery = query(collection(firestore, 'er_templates'), where('name', '==', templateData.name));
    const tmplSnap = await getDocs(tmplQuery);

    if (tmplSnap.empty) {
        await addDoc(collection(firestore, 'er_templates'), templateData);
        console.log("Template created");
    } else {
        console.log("Template already exists");
    }

    return true;
}
