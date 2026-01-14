import { RelationType } from "./types";

export const TEMPLATES_MOCK: { id: string; name: string; type: RelationType; icon?: any }[] = [
    { id: '1', name: 'Ажилд авах процесс', type: 'onboarding' },
    { id: '2', name: 'Туршилтын хугацаа дүгнэх', type: 'probation' },
    { id: '3', name: 'Хөдөлмөрийн гэрээ сунгах', type: 'contract-renewal' },
    { id: '4', name: 'Албан тушаал дэвшүүлэх', type: 'promotion' },
    { id: '5', name: 'Шилжүүлэн томилох', type: 'transfer' },
    { id: '6', name: 'Ажлаас чөлөөлөх', type: 'offboarding' },
];
