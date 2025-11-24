export type Document = {
  id: string;
  name: string;
  category: 'Policy' | 'Contract' | 'Handbook' | 'Form';
  lastModified: string;
  size: string;
};

export const documents: Document[] = [
  {
    id: 'doc-001',
    name: 'Employee Handbook 2024.pdf',
    category: 'Handbook',
    lastModified: '2024-01-10',
    size: '1.2 MB',
  },
  {
    id: 'doc-002',
    name: 'Work From Home Policy.docx',
    category: 'Policy',
    lastModified: '2024-05-20',
    size: '150 KB',
  },
  {
    id: 'doc-003',
    name: 'Alice_Johnson_Contract.pdf',
    category: 'Contract',
    lastModified: '2021-08-15',
    size: '300 KB',
  },
  {
    id: 'doc-004',
    name: 'Expense Reimbursement Form.xlsx',
    category: 'Form',
    lastModified: '2023-11-01',
    size: '75 KB',
  },
  {
    id: 'doc-005',
    name: 'Code of Conduct.pdf',
    category: 'Policy',
    lastModified: '2023-02-15',
    size: '450 KB',
  },
];
