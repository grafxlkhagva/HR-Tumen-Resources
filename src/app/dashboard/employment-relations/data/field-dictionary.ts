export interface FieldDefinition {
    key: string;
    label: string;
    group: 'Company' | 'Employee' | 'Position' | 'Department' | 'System';
    example?: string;
    path: string; // Path to data in the resolver object (e.g. 'company.name')
}

export const ALL_DYNAMIC_FIELDS: FieldDefinition[] = [
    // --- БАЙГУУЛЛАГА ---
    { key: '{{company.name}}', label: 'Байгууллагын нэр', group: 'Company', example: 'Монгол ХХК', path: 'company.name' },
    { key: '{{company.legalName}}', label: 'Хуулийн нэр', group: 'Company', example: 'Монгол ХХК', path: 'company.legalName' },
    { key: '{{company.registrationNumber}}', label: 'Регистрийн дугаар', group: 'Company', example: '1234567', path: 'company.registrationNumber' },
    { key: '{{company.taxId}}', label: 'Татвар төлөгчийн дугаар (ТТД)', group: 'Company', example: '987654321', path: 'company.taxId' },
    { key: '{{company.address}}', label: 'Хаяг', group: 'Company', example: 'УБ хот, СБД, 1-р хороо', path: 'company.address' },
    { key: '{{company.ceo}}', label: 'Захирлын нэр', group: 'Company', example: 'Б. Болд', path: 'company.ceo' },
    { key: '{{company.website}}', label: 'Вэбсайт', group: 'Company', example: 'https://example.mn', path: 'company.website' },
    { key: '{{company.email}}', label: 'Холбоо барих имэйл', group: 'Company', example: 'info@example.mn', path: 'company.contactEmail' },
    { key: '{{company.phone}}', label: 'Утасны дугаар', group: 'Company', example: '+976 99112233', path: 'company.phoneNumber' },
    { key: '{{company.industry}}', label: 'Үйл ажиллагааны чиглэл', group: 'Company', example: 'Мэдээллийн технологи', path: 'company.industry' },
    { key: '{{company.employeeCount}}', label: 'Ажилчдын тоо', group: 'Company', example: '50', path: 'company.employeeCount' },
    { key: '{{company.establishedDate}}', label: 'Байгуулагдсан огноо', group: 'Company', example: '2015-01-01', path: 'company.establishedDate' },
    { key: '{{company.mission}}', label: 'Эрхэм зорилго', group: 'Company', example: 'Хамгийн сайн үйлчилгээг үзүүлэх', path: 'company.mission' },
    { key: '{{company.vision}}', label: 'Алсын хараа', group: 'Company', example: 'Салбартаа тэргүүлэгч байх', path: 'company.vision' },
    { key: '{{company.introduction}}', label: 'Танилцуулга', group: 'Company', example: 'Манай компани 2015 онд байгуулагдсан...', path: 'company.introduction' },
    { key: '{{company.logoUrl}}', label: 'Лого (URL)', group: 'Company', example: 'https://example.mn/logo.png', path: 'company.logoUrl' },

    // --- АЖИЛТАН ---
    { key: '{{employee.lastName}}', label: 'Овог', group: 'Employee', example: 'Батболд', path: 'employee.lastName' },
    { key: '{{employee.firstName}}', label: 'Нэр', group: 'Employee', example: 'Болд', path: 'employee.firstName' },
    { key: '{{employee.fullName}}', label: 'Бүтэн нэр', group: 'Employee', example: 'Батболд Болд', path: 'employee.fullName' }, // Virtual field
    { key: '{{employee.email}}', label: 'Имэйл', group: 'Employee', example: 'bold@example.mn', path: 'employee.email' },
    { key: '{{employee.phone}}', label: 'Утас', group: 'Employee', example: '99112233', path: 'employee.phoneNumber' },
    { key: '{{employee.code}}', label: 'Ажилтны код', group: 'Employee', example: 'EMP001', path: 'employee.employeeCode' },
    { key: '{{employee.jobTitle}}', label: 'Албан тушаал', group: 'Employee', example: 'Ахлах хөгжүүлэгч', path: 'employee.jobTitle' },
    { key: '{{employee.hireDate}}', label: 'Ажилд орсон огноо', group: 'Employee', example: '2023-01-01', path: 'employee.hireDate' },
    { key: '{{employee.registerNo}}', label: 'Регистрийн дугаар', group: 'Employee', example: 'УБ00112233', path: 'questionnaire.registrationNumber' },
    { key: '{{employee.address}}', label: 'Гэрийн хаяг', group: 'Employee', example: 'СБД, 1-р хороо', path: 'questionnaire.homeAddress' },
    { key: '{{employee.birthDate}}', label: 'Төрсөн огноо', group: 'Employee', example: '1990-05-15', path: 'questionnaire.birthDate' },

    // --- АЖЛЫН БАЙР ---
    // Үндсэн мэдээлэл
    { key: '{{position.title}}', label: 'Албан тушаалын нэр', group: 'Position', example: 'Програм хангамжийн инженер', path: 'position.title' },
    { key: '{{position.code}}', label: 'Албан тушаалын код', group: 'Position', example: 'DEV-01', path: 'position.code' },
    { key: '{{position.purpose}}', label: 'Ажлын байрны зорилго', group: 'Position', example: 'Програм хангамж хөгжүүлэх', path: 'position.purpose' },
    { key: '{{position.levelName}}', label: 'Албан тушаалын түвшин', group: 'Position', example: 'Ахлах мэргэжилтэн', path: 'position.levelName' },
    { key: '{{position.employmentTypeName}}', label: 'Хөдөлмөр эрхлэлтийн төрөл', group: 'Position', example: 'Үндсэн ажилтан', path: 'position.employmentTypeName' },
    { key: '{{position.workScheduleName}}', label: 'Ажлын цагийн хуваарь', group: 'Position', example: '9:00-18:00', path: 'position.workScheduleName' },
    { key: '{{position.jobCategoryName}}', label: 'Ажлын ангилал', group: 'Position', example: 'Мэдээллийн технологи', path: 'position.jobCategoryName' },
    { key: '{{position.reportsToName}}', label: 'Шууд удирдлага', group: 'Position', example: 'Технологийн захирал', path: 'position.reportsToName' },
    
    // Цалин урамшуулал
    { key: '{{position.salary.min}}', label: 'Цалингийн доод хэмжээ', group: 'Position', example: '2,000,000', path: 'position.salaryRange.min' },
    { key: '{{position.salary.max}}', label: 'Цалингийн дээд хэмжээ', group: 'Position', example: '3,000,000', path: 'position.salaryRange.max' },
    { key: '{{position.salary.mid}}', label: 'Цалингийн дундаж', group: 'Position', example: '2,500,000', path: 'position.salaryRange.mid' },
    { key: '{{position.salary.currency}}', label: 'Валют', group: 'Position', example: 'MNT', path: 'position.salaryRange.currency' },
    { key: '{{position.salary.period}}', label: 'Цалингийн давтамж', group: 'Position', example: 'Сар бүр', path: 'position.salaryRange.period' },
    { key: '{{position.salaryStepName}}', label: 'Цалингийн шатлал', group: 'Position', example: 'Шат 2', path: 'position.salaryStepName' },
    { key: '{{position.salaryStepValue}}', label: 'Цалингийн шатлалын дүн', group: 'Position', example: '2,200,000', path: 'position.salaryStepValue' },
    
    // Туршлага шаардлага
    { key: '{{position.experience.totalYears}}', label: 'Шаардлагатай туршлага (жил)', group: 'Position', example: '3', path: 'position.experience.totalYears' },
    { key: '{{position.experience.educationLevel}}', label: 'Боловсролын түвшин', group: 'Position', example: 'Бакалавр', path: 'position.experience.educationLevel' },
    { key: '{{position.experience.leadershipYears}}', label: 'Удирдах туршлага (жил)', group: 'Position', example: '2', path: 'position.experience.leadershipYears' },
    
    // Төсөв
    { key: '{{position.budget.yearlyBudget}}', label: 'Жилийн төсөв', group: 'Position', example: '50,000,000', path: 'position.budget.yearlyBudget' },
    { key: '{{position.budget.currency}}', label: 'Төсвийн валют', group: 'Position', example: 'MNT', path: 'position.budget.currency' },
    
    // Тэтгэмж нөхцөл
    { key: '{{position.benefits.vacationDays}}', label: 'Амралтын өдөр (жилд)', group: 'Position', example: '15', path: 'position.benefits.vacationDays' },
    { key: '{{position.benefits.isRemoteAllowed}}', label: 'Зайнаас ажиллах боломж', group: 'Position', example: 'Тийм', path: 'position.benefits.isRemoteAllowed' },
    { key: '{{position.benefits.flexibleHours}}', label: 'Уян хатан цагийн хуваарь', group: 'Position', example: 'Тийм', path: 'position.benefits.flexibleHours' },
    
    // Оноо
    { key: '{{position.yearlyPointBudget}}', label: 'Жилийн оноо', group: 'Position', example: '1000', path: 'position.yearlyPointBudget' },

    // --- АЛБАН НЭГЖ ---
    // Үндсэн мэдээлэл
    { key: '{{department.name}}', label: 'Албан нэгжийн нэр', group: 'Department', example: 'Инженерчлэл', path: 'department.name' },
    { key: '{{department.code}}', label: 'Албан нэгжийн код', group: 'Department', example: 'ENG', path: 'department.code' },
    { key: '{{department.typeName}}', label: 'Албан нэгжийн төрөл', group: 'Department', example: 'Хэлтэс', path: 'department.typeName' },
    { key: '{{department.status}}', label: 'Төлөв', group: 'Department', example: 'Идэвхтэй', path: 'department.status' },
    { key: '{{department.parentName}}', label: 'Харьяалагдах албан нэгж', group: 'Department', example: 'Захиргаа', path: 'department.parentName' },
    { key: '{{department.color}}', label: 'Өнгө', group: 'Department', example: '#3B82F6', path: 'department.color' },
    
    // Зорилго, чиг үүрэг
    { key: '{{department.vision}}', label: 'Зорилго', group: 'Department', example: 'Инновацийг хөгжүүлэх', path: 'department.vision' },
    { key: '{{department.description}}', label: 'Чиг үүрэг', group: 'Department', example: 'Технологийн шийдлүүд хөгжүүлэх', path: 'department.description' },
    
    // Удирдлага
    { key: '{{department.managerName}}', label: 'Удирдлагын нэр', group: 'Department', example: 'Б. Болд', path: 'department.managerName' },
    { key: '{{department.managerPositionName}}', label: 'Удирдлагын албан тушаал', group: 'Department', example: 'Хэлтсийн дарга', path: 'department.managerPositionName' },
    
    // Тоон мэдээлэл
    { key: '{{department.filled}}', label: 'Ажилтны тоо', group: 'Department', example: '15', path: 'department.filled' },
    { key: '{{department.positionCount}}', label: 'Ажлын байрны тоо', group: 'Department', example: '20', path: 'department.positionCount' },
    { key: '{{department.approvedCount}}', label: 'Батлагдсан ажлын байрны тоо', group: 'Department', example: '18', path: 'department.approvedCount' },

    // --- СИСТЕМ ---
    { key: '{{date.today}}', label: 'Өнөөдрийн огноо', group: 'System', example: '2025-10-24', path: 'system.date' },
    { key: '{{date.year}}', label: 'Одоогийн жил', group: 'System', example: '2025', path: 'system.year' },
    { key: '{{date.month}}', label: 'Одоогийн сар', group: 'System', example: '10', path: 'system.month' },
    { key: '{{date.day}}', label: 'Одоогийн өдөр', group: 'System', example: '24', path: 'system.day' },
    { key: '{{user.name}}', label: 'Одоогийн хэрэглэгч', group: 'System', example: 'Админ', path: 'system.user' },
    { key: '{{document.number}}', label: 'Баримтын дугаар', group: 'System', example: 'ГЭР-2026-0001', path: 'system.documentNumber' },
];
