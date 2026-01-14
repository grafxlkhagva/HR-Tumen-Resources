'use client';

import { ProcessManagementProvider } from './context';
import { ProcessManagementContent } from './content';

export default function ProcessManagementPage() {
    return (
        <ProcessManagementProvider>
            <ProcessManagementContent />
        </ProcessManagementProvider>
    );
}
