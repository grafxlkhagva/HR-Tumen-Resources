export interface FieldDefinition {
    key: string;
    label: string;
    group: 'Company' | 'Employee' | 'Position' | 'Department' | 'System';
    example?: string;
    path: string; // Path to data in the resolver object (e.g. 'company.name')
}

export const ALL_DYNAMIC_FIELDS: FieldDefinition[] = [
    // --- COMPANY ---
    { key: '{{company.name}}', label: 'Company Name', group: 'Company', example: 'Acme Corp', path: 'company.name' },
    { key: '{{company.legalName}}', label: 'Legal Name', group: 'Company', example: 'Acme Corporation LLC', path: 'company.legalName' },
    { key: '{{company.registrationNumber}}', label: 'Registration Number', group: 'Company', example: '1234567', path: 'company.registrationNumber' },
    { key: '{{company.taxId}}', label: 'Tax ID', group: 'Company', example: '987654321', path: 'company.taxId' },
    { key: '{{company.address}}', label: 'Address', group: 'Company', example: '123 Main St, City', path: 'company.address' },
    { key: '{{company.ceo}}', label: 'CEO Name', group: 'Company', example: 'John CEO', path: 'company.ceo' },
    { key: '{{company.website}}', label: 'Website', group: 'Company', example: 'https://acme.com', path: 'company.website' },
    { key: '{{company.email}}', label: 'Contact Email', group: 'Company', example: 'info@acme.com', path: 'company.contactEmail' },
    { key: '{{company.phone}}', label: 'Phone Number', group: 'Company', example: '+976 99112233', path: 'company.phoneNumber' },

    // --- EMPLOYEE ---
    { key: '{{employee.lastName}}', label: 'Last Name', group: 'Employee', example: 'Doe', path: 'employee.lastName' },
    { key: '{{employee.firstName}}', label: 'First Name', group: 'Employee', example: 'Jane', path: 'employee.firstName' },
    { key: '{{employee.fullName}}', label: 'Full Name', group: 'Employee', example: 'Doe Jane', path: 'employee.fullName' }, // Virtual field
    { key: '{{employee.email}}', label: 'Email', group: 'Employee', example: 'jane.doe@acme.com', path: 'employee.email' },
    { key: '{{employee.phone}}', label: 'Phone', group: 'Employee', example: '99112233', path: 'employee.phoneNumber' },
    { key: '{{employee.code}}', label: 'Employee Code', group: 'Employee', example: 'EMP001', path: 'employee.employeeCode' },
    { key: '{{employee.jobTitle}}', label: 'Job Title (Current)', group: 'Employee', example: 'Senior Developer', path: 'employee.jobTitle' },
    { key: '{{employee.hireDate}}', label: 'Hire Date', group: 'Employee', example: '2023-01-01', path: 'employee.hireDate' },
    { key: '{{employee.registerNo}}', label: 'Registration No (Personal)', group: 'Employee', example: 'UB00112233', path: 'questionnaire.registrationNumber' },
    { key: '{{employee.address}}', label: 'Home Address', group: 'Employee', example: 'Apt 4B, 1st District', path: 'questionnaire.homeAddress' },
    { key: '{{employee.birthDate}}', label: 'Birth Date', group: 'Employee', example: '1990-05-15', path: 'questionnaire.birthDate' },

    // --- POSITION ---
    { key: '{{position.title}}', label: 'Position Title', group: 'Position', example: 'Software Engineer', path: 'position.title' },
    { key: '{{position.code}}', label: 'Position Code', group: 'Position', example: 'DEV-01', path: 'position.code' },
    { key: '{{position.salary.min}}', label: 'Salary Range (Min)', group: 'Position', example: '2,000,000', path: 'position.compensation.salaryRange.min' },
    { key: '{{position.salary.max}}', label: 'Salary Range (Max)', group: 'Position', example: '3,000,000', path: 'position.compensation.salaryRange.max' },
    { key: '{{position.salary.currency}}', label: 'Currency', group: 'Position', example: 'MNT', path: 'position.compensation.salaryRange.currency' },

    // --- DEPARTMENT ---
    { key: '{{department.name}}', label: 'Department Name', group: 'Department', example: 'Engineering', path: 'department.name' },
    { key: '{{department.code}}', label: 'Department Code', group: 'Department', example: 'ENG', path: 'department.code' },

    // --- SYSTEM ---
    { key: '{{date.today}}', label: 'Current Date', group: 'System', example: '2025-10-24', path: 'system.date' },
    { key: '{{date.year}}', label: 'Current Year', group: 'System', example: '2025', path: 'system.year' },
    { key: '{{date.month}}', label: 'Current Month', group: 'System', example: '10', path: 'system.month' },
    { key: '{{date.day}}', label: 'Current Day', group: 'System', example: '24', path: 'system.day' },
    { key: '{{user.name}}', label: 'Current User', group: 'System', example: 'Admin User', path: 'system.user' },
];
