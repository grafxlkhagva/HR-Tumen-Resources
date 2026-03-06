# TMS өгөгдлийг хуулах (tumen-tech-tms-20 → одоогийн төсөл)

**tumen-tech-tms-20** төслөөс дараах collection-уудыг одоогийн төсөл рүү нэг удаа хуулна:
- `customers` → `tms_customers`
- `customer_employees` → `tms_customers/{id}/employees`
- `warehouses` → `tms_warehouses`
- `Drivers` → `tms_drivers`
- `Storage` (driverId-тай бичлэгүүд) → `tms_drivers/{id}/storage`
- `Vehicles` → `tms_vehicles`

## 1. Service Account key бэлтгэх

- **Эх төсөл (tumen-tech-tms-20):**  
  Firebase Console → [tumen-tech-tms-20] → Project Settings → Service accounts → “Generate new private key” → JSON файлыг хадгална (жишээ нь: `scripts/key/tumen-tech-tms-20-key.json`).

- **Зорилтот төсөл (одоогийн төсөл):**  
  Ижил алхамаар одоогийн төслийн key татаж авна (жишээ нь: `scripts/key/hr-tumenresources-key.json`).  
  Эсвэл зорилтот төсөлд нэвтэрсэн бол key-гүйгээр default credentials ашиглаж болно (доорх команд 2).

## 2. Хуулга ажиллуулах

```bash
# Бүгдийг нь хуулах (customers + employees + warehouses)
node scripts/migrate-tms-from-legacy.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json
```

Customers/employees аль хэдийн хуулсан бол зөвхөн агуулахыг хуулах:

```bash
node scripts/migrate-tms-from-legacy.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json --warehouses-only
```

Тээвэрчин + Storage зөвхөн хуулах:

```bash
node scripts/migrate-tms-from-legacy.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json --drivers-only
```

Тээврийн хэрэгсэл зөвхөн хуулах:

```bash
node scripts/migrate-tms-from-legacy.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json --vehicles-only
```

Эх төсөлд тээврийн хэрэгслийн collection-ийн нэрийг шалгах (0 орж ирсэн бол):

```bash
node scripts/migrate-tms-from-legacy.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json --inspect-vehicles
```

Гаралтаас аль collection-д бичлэг байгааг харж, скрипт дотор `SOURCE_COLLECTION_VEHICLES` эсвэл `possibleVehicleCollections` массивт тухайн нэрийг нэмнэ.

Зорилтот төслийн key өгөхгүй бол (зөвхөн эх төслийн key заавал өгнө):

```bash
node scripts/migrate-tms-from-legacy.js scripts/key/tumen-tech-tms-20-key.json
```

### Storage bucket (зургууд) хуулга

Эх төслийн **Firebase Storage bucket** (`gs://tumen-tech-tms-20.firebasestorage.app`) дээрх folder-уудыг зорилтот төслийн bucket руу ижил бүтэцээр хуулахдаа дараах скрипт ашиглана. Зорилтот төсөл дээр ижил нэртэй bucket (жишээ нь `hr-tumenresources.firebasestorage.app`) автоматаар ашиглагдана.

```bash
# Бүх default folder-ууд: driver_avatars, driver_licenses, contracted_executions, users, vehicle_images
node scripts/migrate-tms-storage-buckets.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json
```

Зөвхөн тодорхой folder-уудыг хуулах:

```bash
node scripts/migrate-tms-storage-buckets.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json driver_avatars driver_licenses
```

## 3. Талбарын mapping

- **customers → tms_customers:** `name` (эсвэл companyName, displayName), `phone`, `email`, `note`, `createdAt`, `updatedAt`.
- **customer_employees → employees:** `lastName`/last_name, `firstName`/first_name, `position`/jobTitle, `phone`, `email`, `note`, `customerId`/customer_id, `createdAt`, `updatedAt`. Харилцагчийн id хадгалагдсан тул `customerId` таарна.
- **warehouses → tms_warehouses:** `name`, `regionId`/region_id, `location`, `geolocation` (эсвэл lat/lng), `status`, `type`, `conditions`, `contactInfo`, `contactName`, `contactPosition`, `customerId`, `customerName`, `capacity`, `note`, `createdAt`, `updatedAt`. Харилцагч зөвхөн миграци хийгдсэн customer id-тай бол холбогдоно.
- **Drivers → tms_drivers:** `firstName`/first_name, `lastName`/last_name, `phone`, `email`, `licenseNumber`/license_number, `photoURL`/photo_url, `status`, `note`, `createdAt`, `updatedAt`.
- **Storage → tms_drivers/{id}/storage:** Эх төслийн `Storage` Firestore collection-д `driverId` эсвэл `driver_id` талбартай бичлэг бүрийг тухайн тээвэрчний `tms_drivers/{driverId}/storage` дээр хуулна. Талбарууд: `url`/downloadURL/src, `name`/fileName, `path`, `contentType`, `createdAt`.
- **Storage bucket (зургууд):** Эх төслийн bucket дээрх `driver_avatars/`, `driver_licenses/`, `contracted_executions/`, `users/`, `vehicle_images/` гэх мэт folder-уудыг `migrate-tms-storage-buckets.js` скриптээр зорилтот төслийн bucket руу ижил path-аар хуулна. Ингэснээр hr-tumenresources төсөл дээр ижил бүтэцтэй folder-ууд үүсч, зураг файлууд шилжинэ. Firestore дээрх URL-уудыг зорилтот төслийн bucket руу заах бол апп дээрээ URL-ийг одоогийн төслийн storage-аас үүсгэх эсвэл миграцийн дараа Firestore дахь `url` талбаруудыг шинэчилж болно.

Эхний төсөлд collection эсвэл талбарын нэр өөр байвал скрипт доторх `SOURCE_COLLECTION_*` эсвэл `map*` функцууд дээр fallback нэмж болно.

---

## 4. Лавлах сан: машины үйлдвэрлэгч, загвар

`vehicle_makes` болон `vehicle_models` collection-уудыг tumen-tech-tms-20 төслөөс одоогийн төсөл рүү хуулах:

```bash
node scripts/migrate-tms-vehicle-refs.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json
```

- Эх төсөл: `vehicle_makes`, `vehicle_models`, `vehicle_types`, `trailer_types`, `regions`, `industries`, `packaging_types`
- Зорилтот төсөл: `tms_vehicle_makes`, `tms_vehicle_models`, `tms_vehicle_types`, `tms_trailer_types`, `tms_regions`, `tms_industries`, `tms_packaging_types`
- Зорилтот төсөлд нэвтэрсэн бол зорилтот key-гүйгээр ажиллуулж болно: `node scripts/migrate-tms-vehicle-refs.js scripts/key/tumen-tech-tms-20-key.json`

Хуулга хийсний дараа TMS → Тохиргоо хуудсаас лавлах сангуудыг (үйлдвэрлэгч, загвар, машины төрөл, тэвшний төрөл, бүс нутаг, үйл ажиллагааны чиглэл, **багцлалтын төрөл**) засварлах, нэмэх, устгах боломжтой.

---

## 5. Агуулахыг бүс нутаг лавлахтай холбох (нэг удаа)

Манай төслийн `tms_warehouses` бүртгэлд одоогоор `regionId` текст (нэр) эсвэл хуучин region id байж болно. Бүс нутаг лавлах (`tms_regions`)-тай зөв холбоход:

```bash
node scripts/link-warehouses-to-regions.js scripts/key/hr-tumenresources-key.json
```

- Зорилтот төсөлийн key өгөхгүй бол: `node scripts/link-warehouses-to-regions.js`
- Скрипт: `tms_regions` болон `tms_warehouses`-ийг уншина. Агуулах бүрийн `regionId`-г лавлах дахь **id** эсвэл **нэр**-ээр тааруулж, `regionId` болон `regionRef` тохируулна.
- tumen-tech-tms-20-аас агуулах хуулсан бол region id ижил тул лавлахтай шууд таарна; нэрээр бүртгэгдсэн бол нэрээр тааруулна.
