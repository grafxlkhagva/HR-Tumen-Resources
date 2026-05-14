/**
 * Company profile → OfficialLetterConfig-ын байгуулагын толгой талбаруудыг
 * холбох helper-үүд. Profile нь Firestore дахь `companies/{id}/company/profile`
 * doc бөгөөд schema-г `src/app/company/schemas.ts`-аас харна уу.
 *
 * Зарчим: Snapshot-at-creation. Бичиг хадгалагдсаны дараа profile өөрчлөгдсөн ч
 * letter config ҮГҮЙ өөрчлөгдөнө. User "Профайлаас нөх" товч дарсан үед л
 * re-sync хийгдэнэ.
 */
import type { OfficialLetterConfig } from '../types';

/** Profile-аас ирдэг 7 толгой талбар (logo + орг мэдээлэл + хаяг-холбоо). */
export const PROFILE_SYNCED_FIELDS = [
    'orgName',
    'orgLogo',
    'orgTagline',
    'address',
    'phone',
    'email',
    'web',
] as const satisfies ReadonlyArray<keyof OfficialLetterConfig>;

export type ProfileSyncedField = (typeof PROFILE_SYNCED_FIELDS)[number];

/** CEO-аас ирдэг гарын үсгийн 2 талбар. */
export const CEO_SYNCED_FIELDS = [
    'signName',
    'signPosition',
] as const satisfies ReadonlyArray<keyof OfficialLetterConfig>;

export type CeoSyncedField = (typeof CEO_SYNCED_FIELDS)[number];

type CompanyProfileShape = Record<string, unknown>;

/**
 * Profile-ийн талбараас хамгийн эхнийх нь non-empty string утгыг буцаана.
 * Хоосон string ("") болон undefined аль алийг "утга байхгүй" гэж үзнэ.
 */
function pickString(profile: CompanyProfileShape, ...keys: string[]): string | undefined {
    for (const k of keys) {
        const v = profile[k];
        if (typeof v === 'string' && v.trim().length > 0) return v;
    }
    return undefined;
}

/**
 * Profile-аас letter config-ын толгой талбарыг гаргана.
 * Profile-д утга байхгүй тохиолдолд undefined буцаана → applyCompanyProfileToConfig
 * нь тэр талбарыг хэвээр орхино.
 *
 * Profile schema: `src/app/company/schemas.ts` (field нэр: contactEmail,
 * website, phoneNumber). Legacy / import-ээр орсон document-ууд нь өөр нэрээр
 * хадгалагдсан байж болзошгүй тул fallback key-ийг хэд хэдэн вариантаар жагсаав.
 */
export function mapProfileToOrgFields(
    profile: CompanyProfileShape | null | undefined,
): Partial<Pick<OfficialLetterConfig, ProfileSyncedField>> {
    if (!profile) return {};
    return {
        orgName: pickString(profile, 'name', 'companyName', 'orgName'),
        orgLogo: pickString(profile, 'logoUrl', 'logo', 'logoURL'),
        orgTagline: pickString(
            profile,
            'tagline',
            'industryName',
            'industry',
            'slogan',
            'orgTagline',
        ),
        address: pickString(profile, 'address', 'companyAddress'),
        phone: pickString(profile, 'phoneNumber', 'phone', 'tel'),
        email: pickString(profile, 'contactEmail', 'email', 'companyEmail', 'mail'),
        web: pickString(profile, 'website', 'web', 'url', 'site'),
    };
}

/**
 * Profile-аас config руу байгуулагын толгой талбаруудыг буулгана.
 * Profile-д нь утга байхгүй бол config-ын одоогийн утга хадгалагдана.
 */
export function applyCompanyProfileToConfig(
    config: OfficialLetterConfig,
    profile: CompanyProfileShape | null | undefined,
): OfficialLetterConfig {
    const mapped = mapProfileToOrgFields(profile);
    const next: OfficialLetterConfig = { ...config };
    for (const key of PROFILE_SYNCED_FIELDS) {
        const v = mapped[key];
        if (v !== undefined && v !== '') {
            (next as unknown as Record<string, unknown>)[key] = v;
        }
    }
    return next;
}

/** Config-ын толгой талбар profile-тай ялгаатай байгаа field-ийн нэрсийг буцаана. */
export function diffFromProfile(
    config: OfficialLetterConfig,
    profile: CompanyProfileShape | null | undefined,
): ProfileSyncedField[] {
    if (!profile) return [];
    const mapped = mapProfileToOrgFields(profile);
    const diff: ProfileSyncedField[] = [];
    for (const key of PROFILE_SYNCED_FIELDS) {
        const expected = mapped[key];
        // Profile-д утга огт тодорхойлогдоогүй бол "override" гэж тооцохгүй
        if (expected === undefined || expected === '') continue;
        const current = config[key] || '';
        if ((current as string) !== expected) diff.push(key);
    }
    return diff;
}

// ─── CEO → Signature holboy-lolt ──────────────────────────────────────────────

/** Employee-шиг shape. Templates хуудасны `Employee` type import хийхгүй байх тул loose. */
type CeoShape = {
    role?: string;
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
} & Record<string, unknown>;

/**
 * Монгол албан бичгийн конвенц ёсоор гарын үсгийн нэрийг `{lastName[0]}.{firstName}`
 * хэлбэрээр буулгана. Жишээ: Отгонбаяр Лхагвасүрэн → "О.Лхагвасүрэн".
 */
function formatSignatureName(firstName?: string, lastName?: string): string | undefined {
    const fn = (firstName ?? '').trim();
    const ln = (lastName ?? '').trim();
    if (!fn && !ln) return undefined;
    if (!ln) return fn;
    if (!fn) return ln;
    return `${ln.charAt(0)}.${fn}`;
}

/**
 * Employee жагсаалтаас CEO-г олж гарын үсгийн 2 талбарыг буцаана.
 * Жагсаалтад (ихэвчлэн companyProfile.ceoEmployeeId-ээр resolve-лсон) нэг ажилтан
 * л ирнэ гэж үзэж эхнийхийг авна. Хоосон жагсаалт бол юу ч буцаахгүй.
 */
export function mapCeoToSignFields(
    employees: CeoShape[] | null | undefined,
): Partial<Pick<OfficialLetterConfig, CeoSyncedField>> {
    if (!employees || employees.length === 0) return {};
    const ceo = employees[0];
    if (!ceo) return {};
    return {
        signName: formatSignatureName(ceo.firstName, ceo.lastName),
        signPosition:
            (typeof ceo.jobTitle === 'string' && ceo.jobTitle.trim().length > 0
                ? ceo.jobTitle.trim()
                : 'Гүйцэтгэх захирал'),
    };
}

/** Config-т CEO-ий гарын үсгийн талбарыг буулгана (хоосон утгыг даргаахгүй). */
export function applyCeoToConfig(
    config: OfficialLetterConfig,
    employees: CeoShape[] | null | undefined,
): OfficialLetterConfig {
    const mapped = mapCeoToSignFields(employees);
    const next: OfficialLetterConfig = { ...config };
    for (const key of CEO_SYNCED_FIELDS) {
        const v = mapped[key];
        if (typeof v === 'string' && v.trim().length > 0) {
            (next as unknown as Record<string, unknown>)[key] = v;
        }
    }
    return next;
}

/** Config-ын гарын үсгийн талбар CEO-тай ялгаатай байгаа field-ийн нэрсийг буцаана. */
export function diffFromCeo(
    config: OfficialLetterConfig,
    employees: CeoShape[] | null | undefined,
): CeoSyncedField[] {
    const mapped = mapCeoToSignFields(employees);
    const diff: CeoSyncedField[] = [];
    for (const key of CEO_SYNCED_FIELDS) {
        const expected = mapped[key];
        if (expected === undefined || expected === '') continue;
        const current = (config[key] as string) || '';
        if (current !== expected) diff.push(key);
    }
    return diff;
}
