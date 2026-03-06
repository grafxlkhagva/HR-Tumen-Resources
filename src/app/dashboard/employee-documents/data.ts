export type Document = {
  id: string;
  title: string;
  description: string;
  url: string;
  uploadDate: string;
  documentType: 'Хөдөлмөрийн гэрээ' | 'Дотоод журам' | 'Ажилтны гарын авлага' | 'Маягт' | 'Бусад';
  metadata?: {
    [key: string]: any;
  };
};

export const documents: Document[] = [];
