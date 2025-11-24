export type Document = {
  id: string;
  name: string;
  category: 'Policy' | 'Contract' | 'Handbook' | 'Form';
  lastModified: string;
  size: string;
};

export const documents: Document[] = [];
