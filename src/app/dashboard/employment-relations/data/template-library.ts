export interface TemplatePreset {
    id: string;
    name: string;
    description: string;
    category: 'contract' | 'order' | 'letter' | 'certificate' | 'other';
    content: string;
    customInputs?: {
        key: string;
        label: string;
        description: string;
        required: boolean;
        type: 'text' | 'number' | 'date' | 'boolean';
        order: number;
    }[];
}

export const TEMPLATE_CATEGORIES = [
    { id: 'contract', label: 'Гэрээ', icon: '📄' },
    { id: 'order', label: 'Тушаал', icon: '📋' },
    { id: 'letter', label: 'Албан бичиг', icon: '✉️' },
    { id: 'certificate', label: 'Тодорхойлолт', icon: '📜' },
    { id: 'other', label: 'Бусад', icon: '📁' },
] as const;

export const TEMPLATE_PRESETS: TemplatePreset[] = [
    {
        id: 'employment-contract-basic',
        name: 'Хөдөлмөрийн гэрээ - Үндсэн',
        description: 'Үндсэн хөдөлмөрийн гэрээний загвар',
        category: 'contract',
        content: `<div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">ХӨДӨЛМӨРИЙН ГЭРЭЭ</h1>
        <p style="font-size: 14px; color: #666;">№ {{contract_number}}</p>
    </div>

    <p style="text-align: right; margin-bottom: 20px;">{{date.today}}</p>

    <p style="margin-bottom: 20px;">
        Нэг талаас <strong>{{company.name}}</strong> (цаашид "Ажил олгогч" гэх) -ийг төлөөлж 
        {{company.ceo}}, нөгөө талаас <strong>{{employee.fullName}}</strong> (цаашид "Ажилтан" гэх) 
        нар дараах нөхцөлөөр хөдөлмөрийн гэрээ байгуулав.
    </p>

    <h2 style="font-size: 14px; font-weight: bold; margin: 25px 0 15px;">НЭГ. НИЙТЛЭГ ҮНДЭСЛЭЛ</h2>
    
    <p style="margin-bottom: 10px;">
        1.1. Ажилтан нь <strong>{{position.title}}</strong> албан тушаалд ажиллана.
    </p>
    <p style="margin-bottom: 10px;">
        1.2. Ажлын байрны хаяг: {{company.address}}
    </p>
    <p style="margin-bottom: 10px;">
        1.3. Гэрээний хугацаа: {{contract_duration}}
    </p>

    <h2 style="font-size: 14px; font-weight: bold; margin: 25px 0 15px;">ХОЁР. ЦАЛИН ХӨЛС</h2>
    
    <p style="margin-bottom: 10px;">
        2.1. Ажилтны үндсэн цалин сард <strong>{{salary_amount}}</strong> төгрөг байна.
    </p>
    <p style="margin-bottom: 10px;">
        2.2. Цалинг сар бүрийн {{salary_pay_day}}-ны өдөр олгоно.
    </p>

    <h2 style="font-size: 14px; font-weight: bold; margin: 25px 0 15px;">ГУРАВ. АЖЛЫН ЦАГИЙН ГОРИМ</h2>
    
    <p style="margin-bottom: 10px;">
        3.1. Ажлын цаг: {{work_hours}}
    </p>
    <p style="margin-bottom: 10px;">
        3.2. Амралтын өдөр: {{rest_days}}
    </p>

    <div style="margin-top: 50px;">
        <div style="display: flex; justify-content: space-between;">
            <div style="width: 45%;">
                <p style="font-weight: bold; margin-bottom: 30px;">АЖИЛ ОЛГОГЧ:</p>
                <p>{{company.name}}</p>
                <p>{{company.ceo}}</p>
                <p style="margin-top: 30px;">Гарын үсэг: _________________</p>
            </div>
            <div style="width: 45%;">
                <p style="font-weight: bold; margin-bottom: 30px;">АЖИЛТАН:</p>
                <p>{{employee.fullName}}</p>
                <p>РД: {{employee.registerNo}}</p>
                <p style="margin-top: 30px;">Гарын үсэг: _________________</p>
            </div>
        </div>
    </div>
</div>`,
        customInputs: [
            { key: 'contract_number', label: 'Гэрээний дугаар', description: 'Жишээ: ХГ-2024/001', required: true, type: 'text', order: 0 },
            { key: 'contract_duration', label: 'Гэрээний хугацаа', description: 'Жишээ: 1 жил', required: true, type: 'text', order: 1 },
            { key: 'salary_amount', label: 'Цалингийн хэмжээ', description: 'Төгрөгөөр', required: true, type: 'number', order: 2 },
            { key: 'salary_pay_day', label: 'Цалин олгох өдөр', description: 'Жишээ: 10', required: true, type: 'number', order: 3 },
            { key: 'work_hours', label: 'Ажлын цаг', description: 'Жишээ: 09:00-18:00', required: true, type: 'text', order: 4 },
            { key: 'rest_days', label: 'Амралтын өдөр', description: 'Жишээ: Бямба, Ням', required: true, type: 'text', order: 5 },
        ]
    },
    {
        id: 'hire-order',
        name: 'Ажилд авах тушаал',
        description: 'Шинэ ажилтан ажилд авах тушаалын загвар',
        category: 'order',
        content: `<div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8;">
    <div style="text-align: center; margin-bottom: 10px;">
        <p style="font-size: 14px; font-weight: bold;">{{company.name}}</p>
    </div>

    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">ТУШААЛ</h1>
        <p style="font-size: 13px; color: #666;">№ {{order_number}}</p>
        <p style="font-size: 13px;">{{date.today}}</p>
    </div>

    <p style="margin-bottom: 20px; text-indent: 40px;">
        Монгол Улсын Хөдөлмөрийн тухай хуулийн 21, 23 дугаар зүйлийг үндэслэн 
        <strong>{{employee.fullName}}</strong> /РД: {{employee.registerNo}}/-ийг 
        {{date.today}} өдрөөс эхлэн <strong>{{department.name}}</strong>-ийн 
        <strong>{{position.title}}</strong> албан тушаалд сарын <strong>{{salary_amount}}</strong> 
        төгрөгийн үндсэн цалинтайгаар ажилд авсугай.
    </p>

    <p style="margin-bottom: 30px; text-indent: 40px;">
        Хүний нөөцийн хэлтэст уг тушаалыг хэрэгжүүлж ажиллахыг даалгасугай.
    </p>

    <div style="margin-top: 50px; text-align: right;">
        <p style="font-weight: bold;">ЗАХИРАЛ</p>
        <p style="margin-top: 30px;">{{company.ceo}}</p>
    </div>
</div>`,
        customInputs: [
            { key: 'order_number', label: 'Тушаалын дугаар', description: 'Жишээ: А/24', required: true, type: 'text', order: 0 },
            { key: 'salary_amount', label: 'Цалингийн хэмжээ', description: 'Төгрөгөөр', required: true, type: 'number', order: 1 },
        ]
    },
    {
        id: 'termination-order',
        name: 'Ажлаас чөлөөлөх тушаал',
        description: 'Ажилтныг ажлаас чөлөөлөх тушаалын загвар',
        category: 'order',
        content: `<div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8;">
    <div style="text-align: center; margin-bottom: 10px;">
        <p style="font-size: 14px; font-weight: bold;">{{company.name}}</p>
    </div>

    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">ТУШААЛ</h1>
        <p style="font-size: 13px; color: #666;">№ {{order_number}}</p>
        <p style="font-size: 13px;">{{date.today}}</p>
    </div>

    <p style="margin-bottom: 20px; text-indent: 40px;">
        Монгол Улсын Хөдөлмөрийн тухай хуулийн {{law_article}} дугаар зүйлийг үндэслэн 
        <strong>{{department.name}}</strong>-ийн <strong>{{position.title}}</strong> албан тушаалд 
        ажиллаж байгаа <strong>{{employee.fullName}}</strong> /РД: {{employee.registerNo}}/-ийг 
        {{termination_date}} өдрөөс эхлэн ажлаас чөлөөлсүгэй.
    </p>

    <p style="margin-bottom: 10px; text-indent: 40px;">
        <strong>Шалтгаан:</strong> {{termination_reason}}
    </p>

    <p style="margin-bottom: 30px; text-indent: 40px;">
        Санхүү, хүний нөөцийн хэлтэст тооцоо хийж, холбогдох бичиг баримтыг бүрдүүлэхийг даалгасугай.
    </p>

    <div style="margin-top: 50px; text-align: right;">
        <p style="font-weight: bold;">ЗАХИРАЛ</p>
        <p style="margin-top: 30px;">{{company.ceo}}</p>
    </div>
</div>`,
        customInputs: [
            { key: 'order_number', label: 'Тушаалын дугаар', description: 'Жишээ: А/24', required: true, type: 'text', order: 0 },
            { key: 'law_article', label: 'Хуулийн зүйл', description: 'Жишээ: 37.1.1', required: true, type: 'text', order: 1 },
            { key: 'termination_date', label: 'Чөлөөлөх огноо', description: '', required: true, type: 'date', order: 2 },
            { key: 'termination_reason', label: 'Чөлөөлөх шалтгаан', description: '', required: true, type: 'text', order: 3 },
        ]
    },
    {
        id: 'employment-certificate',
        name: 'Ажил эрхэлж буй тодорхойлолт',
        description: 'Ажилтан тухайн байгууллагад ажиллаж байгааг баталгаажуулах',
        category: 'certificate',
        content: `<div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8;">
    <div style="text-align: center; margin-bottom: 10px;">
        <p style="font-size: 14px; font-weight: bold;">{{company.name}}</p>
        <p style="font-size: 12px; color: #666;">{{company.address}}</p>
        <p style="font-size: 12px; color: #666;">Утас: {{company.phone}}</p>
    </div>

    <div style="text-align: center; margin: 40px 0;">
        <h1 style="font-size: 18px; font-weight: bold;">ТОДОРХОЙЛОЛТ</h1>
    </div>

    <p style="margin-bottom: 20px; text-indent: 40px;">
        <strong>{{employee.fullName}}</strong> /РД: {{employee.registerNo}}/ нь 
        {{company.name}}-д {{employee.hireDate}} өдрөөс эхлэн 
        <strong>{{position.title}}</strong> албан тушаалд ажиллаж байгааг тодорхойлж байна.
    </p>

    <p style="margin-bottom: 20px; text-indent: 40px;">
        Тодорхойлолтыг {{certificate_purpose}} зорилгоор олгов.
    </p>

    <p style="margin-bottom: 40px; text-indent: 40px;">
        Тодорхойлолт олгосон огноо: {{date.today}}
    </p>

    <div style="margin-top: 50px;">
        <div style="display: flex; justify-content: space-between;">
            <div>
                <p>Хүний нөөцийн менежер</p>
                <p style="margin-top: 20px;">_________________</p>
            </div>
            <div style="text-align: right;">
                <p>Тамга</p>
            </div>
        </div>
    </div>
</div>`,
        customInputs: [
            { key: 'certificate_purpose', label: 'Тодорхойлолтын зориулалт', description: 'Жишээ: банкинд гаргуулах', required: true, type: 'text', order: 0 },
        ]
    },
    {
        id: 'salary-certificate',
        name: 'Цалингийн тодорхойлолт',
        description: 'Ажилтны цалингийн мэдээллийг баталгаажуулах',
        category: 'certificate',
        content: `<div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8;">
    <div style="text-align: center; margin-bottom: 10px;">
        <p style="font-size: 14px; font-weight: bold;">{{company.name}}</p>
        <p style="font-size: 12px; color: #666;">РД: {{company.registrationNumber}}</p>
        <p style="font-size: 12px; color: #666;">{{company.address}}</p>
    </div>

    <div style="text-align: center; margin: 40px 0;">
        <h1 style="font-size: 18px; font-weight: bold;">ЦАЛИНГИЙН ТОДОРХОЙЛОЛТ</h1>
    </div>

    <p style="margin-bottom: 20px; text-indent: 40px;">
        <strong>{{employee.fullName}}</strong> /РД: {{employee.registerNo}}/ нь 
        {{company.name}}-д <strong>{{position.title}}</strong> албан тушаалд ажиллаж байгаа бөгөөд 
        сүүлийн {{salary_months}} сарын дундаж цалин нь <strong>{{average_salary}}</strong> төгрөг болохыг 
        тодорхойлж байна.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
        <thead>
            <tr style="background: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Сар</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Цалин (₮)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">{{month_1}}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">{{salary_1}}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">{{month_2}}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">{{salary_2}}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">{{month_3}}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">{{salary_3}}</td>
            </tr>
        </tbody>
    </table>

    <p style="margin-bottom: 40px; text-indent: 40px;">
        Тодорхойлолт олгосон огноо: {{date.today}}
    </p>

    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div>
            <p>Санхүүгийн менежер</p>
            <p style="margin-top: 20px;">_________________</p>
        </div>
        <div>
            <p>Хүний нөөцийн менежер</p>
            <p style="margin-top: 20px;">_________________</p>
        </div>
    </div>
</div>`,
        customInputs: [
            { key: 'salary_months', label: 'Хэдэн сарын', description: 'Жишээ: 3', required: true, type: 'number', order: 0 },
            { key: 'average_salary', label: 'Дундаж цалин', description: 'Төгрөгөөр', required: true, type: 'number', order: 1 },
            { key: 'month_1', label: '1-р сар', description: 'Жишээ: 2024 оны 1-р сар', required: true, type: 'text', order: 2 },
            { key: 'salary_1', label: '1-р сарын цалин', description: '', required: true, type: 'number', order: 3 },
            { key: 'month_2', label: '2-р сар', description: '', required: true, type: 'text', order: 4 },
            { key: 'salary_2', label: '2-р сарын цалин', description: '', required: true, type: 'number', order: 5 },
            { key: 'month_3', label: '3-р сар', description: '', required: true, type: 'text', order: 6 },
            { key: 'salary_3', label: '3-р сарын цалин', description: '', required: true, type: 'number', order: 7 },
        ]
    },
    {
        id: 'official-letter',
        name: 'Албан бичиг - Үндсэн',
        description: 'Гадагш илгээх албан бичгийн загвар',
        category: 'letter',
        content: `<div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
            <p style="font-size: 14px; font-weight: bold;">{{company.name}}</p>
            <p style="font-size: 12px; color: #666;">{{company.address}}</p>
            <p style="font-size: 12px; color: #666;">Утас: {{company.phone}}</p>
            <p style="font-size: 12px; color: #666;">И-мэйл: {{company.email}}</p>
        </div>
        <div style="text-align: right;">
            <p style="font-size: 12px;">№ {{letter_number}}</p>
            <p style="font-size: 12px;">{{date.today}}</p>
        </div>
    </div>

    <div style="margin-bottom: 30px;">
        <p><strong>{{recipient_organization}}</strong></p>
        <p>{{recipient_position}}</p>
        <p>{{recipient_name}}-д</p>
    </div>

    <p style="text-align: center; font-weight: bold; margin-bottom: 20px;">
        {{letter_subject}}
    </p>

    <p style="margin-bottom: 20px; text-indent: 40px;">
        {{letter_body}}
    </p>

    <div style="margin-top: 50px;">
        <p>Хүндэтгэсэн,</p>
        <p style="margin-top: 30px; font-weight: bold;">{{company.ceo}}</p>
        <p>{{sender_position}}</p>
    </div>
</div>`,
        customInputs: [
            { key: 'letter_number', label: 'Албан бичгийн дугаар', description: '', required: true, type: 'text', order: 0 },
            { key: 'recipient_organization', label: 'Хүлээн авагч байгууллага', description: '', required: true, type: 'text', order: 1 },
            { key: 'recipient_position', label: 'Хүлээн авагчийн албан тушаал', description: '', required: true, type: 'text', order: 2 },
            { key: 'recipient_name', label: 'Хүлээн авагчийн нэр', description: '', required: true, type: 'text', order: 3 },
            { key: 'letter_subject', label: 'Гарчиг', description: '', required: true, type: 'text', order: 4 },
            { key: 'letter_body', label: 'Агуулга', description: '', required: true, type: 'text', order: 5 },
            { key: 'sender_position', label: 'Илгээгчийн албан тушаал', description: '', required: true, type: 'text', order: 6 },
        ]
    },
    {
        id: 'vacation-order',
        name: 'Ээлжийн амралт олгох тушаал',
        description: 'Ажилтанд ээлжийн амралт олгох тушаал',
        category: 'order',
        content: `<div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8;">
    <div style="text-align: center; margin-bottom: 10px;">
        <p style="font-size: 14px; font-weight: bold;">{{company.name}}</p>
    </div>

    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">ТУШААЛ</h1>
        <p style="font-size: 13px; color: #666;">№ {{order_number}}</p>
        <p style="font-size: 13px;">{{date.today}}</p>
    </div>

    <p style="margin-bottom: 20px; text-indent: 40px;">
        Монгол Улсын Хөдөлмөрийн тухай хуулийн 79 дүгээр зүйлийг үндэслэн 
        <strong>{{department.name}}</strong>-ийн <strong>{{position.title}}</strong> албан тушаалд 
        ажиллаж байгаа <strong>{{employee.fullName}}</strong>-д {{vacation_year}} оны ээлжийн амралтыг 
        {{vacation_start_date}} өдрөөс {{vacation_end_date}} өдрийг хүртэл нийт {{vacation_days}} 
        хоногоор олгосугай.
    </p>

    <p style="margin-bottom: 30px; text-indent: 40px;">
        Санхүүгийн хэлтэст амралтын мөнгийг тооцож олгохыг даалгасугай.
    </p>

    <div style="margin-top: 50px; text-align: right;">
        <p style="font-weight: bold;">ЗАХИРАЛ</p>
        <p style="margin-top: 30px;">{{company.ceo}}</p>
    </div>
</div>`,
        customInputs: [
            { key: 'order_number', label: 'Тушаалын дугаар', description: '', required: true, type: 'text', order: 0 },
            { key: 'vacation_year', label: 'Амралтын жил', description: 'Жишээ: 2024', required: true, type: 'number', order: 1 },
            { key: 'vacation_start_date', label: 'Эхлэх огноо', description: '', required: true, type: 'date', order: 2 },
            { key: 'vacation_end_date', label: 'Дуусах огноо', description: '', required: true, type: 'date', order: 3 },
            { key: 'vacation_days', label: 'Нийт хоног', description: '', required: true, type: 'number', order: 4 },
        ]
    },
];
