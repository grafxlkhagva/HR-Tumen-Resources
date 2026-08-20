import type { Timestamp, DocumentReference } from 'firebase/firestore';

/** TMS харилцагч (байгууллага/компани) */
export interface TmsCustomer {
  id: string;
  name: string;
  logoUrl?: string;
  registerNumber?: string;
  industryId?: string;
  address?: string;
  phone?: string;
  email?: string;
  responsibleEmployeeId?: string;
  note?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Харилцагчийн ажилтан (холбоо барих хүн) */
export interface TmsCustomerEmployee {
  id: string;
  lastName: string;
  firstName: string;
  position: string;
  phone: string;
  email: string;
  note?: string;
  customerId: string;
  customerRef?: DocumentReference;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_CUSTOMERS_COLLECTION = 'tms_customers';
export const TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION = 'employees';

/** Агуулахын төлөв */
export type TmsWarehouseStatus = 'active' | 'inactive' | 'full' | 'maintenance';
/** Агуулахын төрөл */
export type TmsWarehouseType = 'General' | 'Cold Storage' | 'Hazardous' | 'Bonded';
/** Багтаамжийн нэгж */
export type TmsCapacityUnit = 'sqm' | 'pallets' | 'tons';

/** TMS агуулах */
export interface TmsWarehouse {
  id: string;
  name: string;
  regionId: string;
  regionRef?: DocumentReference;
  location: string;
  geolocation: { lat: number; lng: number };
  status: TmsWarehouseStatus;
  type: TmsWarehouseType;
  conditions: string;
  contactInfo: string;
  contactName?: string;
  contactPosition?: string;
  customerId?: string | null;
  customerName?: string;
  customerRef?: DocumentReference;
  capacity?: { value: number; unit: TmsCapacityUnit } | null;
  note?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_WAREHOUSES_COLLECTION = 'tms_warehouses';

/** Яаралтай холбоо барих */
export interface TmsDriverEmergencyContact {
  name: string;
  phone: string;
}

/** TMS тээвэрчин */
export interface TmsDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  registerNumber?: string;
  dateOfBirth?: string;
  photoURL?: string;
  status?: 'active' | 'inactive';
  note?: string;
  emergencyContact?: TmsDriverEmergencyContact;
  isAvailableForContracted?: boolean;
  /** Байгууллагын ажилтан — КАМ / тээврийн менежер (employees collection) */
  transportManagerEmployeeId?: string | null;
  transportManagerEmployeeName?: string | null;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  licenseClasses?: string[];
  licenseImageFrontUrl?: string;
  licenseImageBackUrl?: string;
  nationalIdFrontUrl?: string;
  nationalIdBackUrl?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Монгол жолооны үнэмлэхний ангилал (нүүрэн/ар талын 9-р талбар) */
export const TMS_LICENSE_CLASSES = ['A', 'B', 'BE', 'BC', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'E', 'M'] as const;

/** Тээвэрчтэй холбоотой файл/зураг (Storage бүртгэл) */
export interface TmsDriverStorageItem {
  id: string;
  driverId: string;
  name?: string;
  url: string;
  path?: string;
  contentType?: string;
  createdAt: Timestamp;
}

export const TMS_DRIVERS_COLLECTION = 'tms_drivers';
export const TMS_DRIVER_STORAGE_SUBCOLLECTION = 'storage';

/** Тээврийн хэрэгслийн үйлдвэрлэгч (лавлах) */
export interface TmsVehicleMake {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Тээврийн хэрэгслийн загвар (лавлах, үйлдвэрлэгчтэй холбоотой) */
export interface TmsVehicleModel {
  id: string;
  name: string;
  makeId: string;
  makeRef?: DocumentReference;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Тээврийн хэрэгслийн төрөл (лавлах, жишээ: Хүнд даацын) */
export interface TmsVehicleType {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Тэвшний төрөл (лавлах, жишээ: Хагас чиргүүл) */
export interface TmsTrailerType {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Бүс нутаг (лавлах, жишээ: Улаанбаатар) */
export interface TmsRegion {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_VEHICLE_MAKES_COLLECTION = 'tms_vehicle_makes';
export const TMS_VEHICLE_MODELS_COLLECTION = 'tms_vehicle_models';
export const TMS_VEHICLE_TYPES_COLLECTION = 'tms_vehicle_types';
export type TmsControlTaskType = 'checklist' | 'image' | 'date' | 'text' | 'number';

export interface TmsDispatchControlTask {
  id: string;
  name: string;
  type: TmsControlTaskType;
  isRequired: boolean;
  options?: string[]; // for checklist multiple options if needed in future
}

export interface TmsServiceType {
  id: string;
  name: string;
  dispatchSteps?: {
    id: string;
    name: string;
    order: number;
    isRequired: boolean;
    controlTasks?: TmsDispatchControlTask[];
  }[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
export const TMS_SERVICE_TYPES_COLLECTION = 'tms_service_types';
/** Үйл ажиллагааны чиглэл (лавлах, жишээ: Худалдаа) */
export interface TmsIndustry {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_TRAILER_TYPES_COLLECTION = 'tms_trailer_types';
/** Багцлалтын төрөл (лавлах, жишээ: Хайрцаг) */
export interface TmsPackagingType {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_REGIONS_COLLECTION = 'tms_regions';
export const TMS_INDUSTRIES_COLLECTION = 'tms_industries';
export const TMS_PACKAGING_TYPES_COLLECTION = 'tms_packaging_types';

export interface TmsSettings {
  id?: string;
  transportCodePrefix?: string;
  transportCodePadding?: number;
  transportCodeCurrentNumber?: number;
  quotationCodePrefix?: string;
  quotationCodePadding?: number;
  quotationCodeCurrentNumber?: number;
  contractCodePrefix?: string;
  contractCodePadding?: number;
  contractCodeCurrentNumber?: number;
  oneTimeCodePrefix?: string;
  oneTimeCodePadding?: number;
  oneTimeCodeCurrentNumber?: number;
  quoteCodePrefix?: string;
  quoteCodePadding?: number;
  quoteCodeCurrentNumber?: number;
  recurringCodePrefix?: string;
  recurringCodePadding?: number;
  recurringCodeCurrentNumber?: number;
  updatedAt?: Timestamp;
}
export const TMS_SETTINGS_COLLECTION = 'tms_settings';
export const TMS_GLOBAL_SETTINGS_ID = 'global';

/** Тээврийн хэрэгслийн төлөв */
export type TmsVehicleStatus = 'Available' | 'Maintenance' | 'Ready' | 'In Use';
/** Шатахууны төрөл */
export type TmsVehicleFuelType = 'Diesel' | 'Gasoline' | 'Electric' | 'Hybrid';
/** Дамжуулалт */
export type TmsVehicleTransmission = 'Manual' | 'Automatic' | 'CVT' | 'DCT';

export interface TmsVehicleSpecs {
  tankCapacity?: number;
  transmission?: TmsVehicleTransmission;
  axleConfig?: string;
  engineType?: string;
}

export interface TmsVehicleDates {
  purchase?: Timestamp;
  warrantyExpiry?: Timestamp;
  registrationExpiry?: Timestamp;
  insuranceExpiry?: Timestamp;
  roadPermitExpiry?: Timestamp;
  inspectionExpiry?: Timestamp;
}

export interface TmsVehicleCreatedBy {
  uid: string;
  name: string;
}

/** TMS тээврийн хэрэгсэл */
export interface TmsVehicle {
  id: string;
  makeId?: string;
  makeName?: string;
  modelId?: string;
  modelName?: string;
  year?: number;
  importedYear?: number;
  licensePlate?: string;
  licensePlateDigits?: string;
  licensePlateChars?: string[];
  trailerLicensePlate?: string;
  trailerLicensePlateDigits?: string;
  trailerLicensePlateChars?: string[];
  vin?: string;
  vehicleTypeId?: string;
  trailerTypeId?: string;
  capacity?: string;
  fuelType?: TmsVehicleFuelType;
  notes?: string;
  status?: TmsVehicleStatus;
  driverId?: string | null;
  driverName?: string | null;
  driverIds?: string[];
  driverNames?: string[];
  /** Байгууллагын ажилтан — КАМ / тээврийн менежер (employees collection) */
  transportManagerEmployeeId?: string | null;
  transportManagerEmployeeName?: string | null;
  imageUrls?: string[];
  odometer?: number;
  specs?: TmsVehicleSpecs;
  dates?: TmsVehicleDates;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: TmsVehicleCreatedBy;
  gpsDeviceId?: string;
}

export const TMS_VEHICLES_COLLECTION = 'tms_vehicles';

/** Үнийн саналын төлөв */
export type TmsQuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

/** Тээврийн нөхцөл — ачилт/буулгалтын хариуцагч */
export type TmsLoadingResponsibility = 'customer' | 'carrier';
/** Тээврийн нөхцөл — тээврийн хэрэгслийн бэлэн байдал */
export type TmsVehicleAvailability = '8h' | '12h' | '24h' | '48h' | '7d' | '14d';
/** Тээврийн нөхцөл — төлбөрийн нөхцөл */
export type TmsPaymentTerms = 'advance_30' | 'advance_40' | 'advance_50' | 'upon_completion' | 'by_contract';

/** TMS үнийн санал */
export interface TmsQuotation {
  id: string;
  code?: string;
  /** Харилцагч байгууллага */
  customerId: string;
  customerRef?: DocumentReference;
  customerName?: string;
  /** Тухайн байгуулагын хариуцсан ажилтан (холбоо барих хүн) */
  customerResponsibleEmployeeId?: string | null;
  customerResponsibleEmployeeName?: string | null;
  /** Манай байгуулагын хариуцсан ажилтан / Тээврийн менежер (employees collection) */
  ourResponsibleEmployeeId?: string | null;
  ourResponsibleEmployeeName?: string | null;
  status?: TmsQuotationStatus;
  note?: string | null;
  /** Тээврийн нөхцөл */
  loadingResponsibility?: TmsLoadingResponsibility | string | null;
  unloadingResponsibility?: TmsLoadingResponsibility | string | null;
  roadPermitObtain?: boolean;
  roadFeePay?: boolean;
  vehicleAvailability?: TmsVehicleAvailability | string | null;
  paymentTerms?: TmsPaymentTerms | string | null;
  insurance?: string | null;
  additionalConditions?: string | null;
  transportations?: TmsQuotationTransportation[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_QUOTATIONS_COLLECTION = 'tms_quotations';

export interface TmsQuotationCargo {
  id: string;
  name: string;
  quantity: number;
  unit: 'kg' | 'tons' | 'pcs' | 'liters' | 'm3';
  packagingTypeId?: string;
  note?: string;
}

export interface TmsDriverOffer {
  id: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  offerAmount: number;
  note?: string;
  isAccepted?: boolean;
  createdAt?: string;
}

export interface TmsQuotationTransportation {
  id: string;
  serviceTypeId?: string;
  frequency?: number;

  loadingRegionId?: string;
  loadingWarehouseId?: string;
  unloadingRegionId?: string;
  unloadingWarehouseId?: string;
  totalDistanceKm?: number;
  loadingDate?: string | null;
  unloadingDate?: string | null;

  vehicleTypeId?: string;
  trailerTypeId?: string;

  profitMarginPercent?: number;
  hasVat?: boolean;

  cargos?: TmsQuotationCargo[];
  driverOffers?: TmsDriverOffer[];
}

export type TmsTransportManagementStatus = 'draft' | 'planning' | 'active' | 'completed' | 'cancelled';

export interface TmsDispatchStep {
  id: string;       // service type-с хуулж авсан step id эсвэл шинээр үүсгэсэн id
  name: string;
  order: number;
  isRequired: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Timestamp | null;
  completedBy?: string | null; // ажилтны id
  note?: string | null;
  controlTasks?: TmsDispatchControlTask[]; // Service type-аас хуулж авна
  taskResults?: Record<string, any>; // controlTask.id -> value (зурагны url, текст, тоо г.м)
}

export interface TmsTransportSubUnit {
  id: string;
  subCode: string;
  vehicleId?: string | null;
  driverId?: string | null;
  /** Дэд тээвэр тусгай чиглэл (заагаагүй бол эцэг transport-н чиглэл ашиглана) */
  loadingRegionId?: string | null;
  loadingWarehouseId?: string | null;
  unloadingRegionId?: string | null;
  unloadingWarehouseId?: string | null;
  totalDistanceKm?: number | null;
  loadingDate?: string | null;
  unloadingDate?: string | null;
  dispatchSteps?: TmsDispatchStep[];

  /**
   * Олон гэрээний үйлчилгээ нэг TM дор удирдах сценари:
   * subUnit тус бүр өөрийн харьяалах гэрээний үйлчилгээ, үнэ, төрөл, тээврийн
   * хэрэгслийн тохиргоог хадгалж чадна. Эдгээр нь optional — хоосон байвал
   * эцэг баримтын утга руу fallback хийнэ (хуучин single-service нийцтэй).
   */
  contractServiceId?: string | null;
  contractServiceName?: string | null;
  serviceTypeId?: string | null;
  vehicleTypeId?: string | null;
  trailerTypeId?: string | null;
  customerPrice?: number | null;
  driverPrice?: number | null;
  contractPriceType?: TmsContractPriceType | null;
}

export interface TmsTransportManagement {
  id: string;
  code?: string; // Automatically generated code
  serviceTypeId: string;
  isContracted: boolean;
  contractId?: string | null;
  contractCode?: string | null;
  /** Үндсэн/primary гэрээний үйлчилгээ (хуучин single-service нийцтэй байхад). */
  contractServiceId?: string | null;
  contractServiceName?: string | null;
  /** Нэг TM дотор хэд хэдэн гэрээний үйлчилгээ зэрэг удирдаж байгаа бол бүх id. */
  contractServiceIds?: string[];
  customerId: string;
  customerRef?: DocumentReference;
  status: TmsTransportManagementStatus;

  // Тээвэрлэлтийн мэдээлэл
  loadingRegionId?: string;
  loadingWarehouseId?: string;
  unloadingRegionId?: string;
  unloadingWarehouseId?: string;
  totalDistanceKm?: number;
  loadingDate?: string | null;
  unloadingDate?: string | null;

  frequency?: number;
  vehicleTypeId?: string;
  trailerTypeId?: string;
  vehicleId?: string;
  driverId?: string;

  driverPrice?: number;
  /** Харилцагчид өгч буй үнэ (НӨАТ-гүй). Гараар оруулдаг, маржин %-г автоматаар тооцоолно. */
  customerPrice?: number;
  /** Гэрээний мөрөөс шилжсэн үнийн нэгж (тонн, өдөр гэх мэт) */
  contractPriceType?: TmsContractPriceType;
  /** Ашгийн хувь — `customerPrice` ба `driverPrice`-ын зөрүүнээс автоматаар шинэчлэгдэнэ. */
  profitMarginPercent?: number;
  hasVat?: boolean;

  cargos?: TmsQuotationCargo[];
  dispatchSteps?: TmsDispatchStep[];
  financeTransactions?: TmsFinanceTransaction[];
  /** Нэг тээврийн удирдлагын доторх дэд тээврийн табууд */
  subTransports?: TmsTransportSubUnit[];

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_TRANSPORT_MANAGEMENT_COLLECTION = 'tms_transport_management';

/** Гэрээний төлөв */
export type TmsContractStatus = 'draft' | 'active' | 'expired' | 'terminated';

/** Гэрээний үйлчилгээний төрөл (үнэ/хэлцлийн загвар) */
export type TmsContractLineType = 'master' | 'fixed' | 'one_time' | 'bundle_transport';

export const TMS_CONTRACT_LINE_TYPE_LABELS: Record<TmsContractLineType, string> = {
  master: 'Мастер',
  fixed: 'Тогтмол',
  one_time: 'Нэг удаагийн',
  bundle_transport: 'Багц тээвэр',
};

/** Гэрээний мөр дэх үнийг ямар нэгжээр ойлгож байгаа эсэх */
export type TmsContractPriceType =
  | 'per_ton'
  | 'lump_sum'
  | 'per_day'
  | 'per_month'
  | 'rental'
  | 'per_ton_km';

export const TMS_CONTRACT_PRICE_TYPE_LABELS: Record<TmsContractPriceType, string> = {
  per_ton: 'Жин / тонноор',
  lump_sum: 'Нэг удаагийн',
  per_day: 'Өдөрөөр',
  per_month: 'Сараар',
  rental: 'Түрээсээр',
  per_ton_km: 'Тонн-км (⚖ жингээр)',
};

/** Гэрээнд тусгагдсан тээврийн үйлчилгээ */
export interface TmsContractService {
  id: string;
  /** Гэрээний мөрийн төрөл: мастер, тогтмол гэх мэт */
  contractLineType?: TmsContractLineType;
  serviceTypeId?: string;
  serviceTypeName?: string;
  name?: string;
  loadingRegionId?: string;
  loadingRegionName?: string;
  loadingWarehouseId?: string;
  loadingWarehouseName?: string;
  unloadingRegionId?: string;
  unloadingRegionName?: string;
  unloadingWarehouseId?: string;
  unloadingWarehouseName?: string;
  vehicleTypeId?: string;
  vehicleTypeName?: string;
  trailerTypeId?: string;
  trailerTypeName?: string;
  /** Харилцагчийн (тохиролцсон) үнэ */
  customerPrice?: number;
  /** Жолоочийн үнэ */
  driverPrice?: number;
  /** @deprecated — хуучин price талбарыг дэмждэг (customerPrice руу шилжинэ) */
  price?: number;
  /** Үнэ тооцох нэгж (тонн, өдөр гэх мэт) */
  priceType?: TmsContractPriceType;
  /** Чиглэлийн зай (км) — per_ton_km үнэлгээнд ЗААВАЛ (тонн × км × үнэ томьёонд) */
  distanceKm?: number | null;
  /** @deprecated — ашгийн хувь (customerPrice - driverPrice зөрүүгээр тодорхойлогдоно) */
  profitMarginPercent?: number;
  currency?: string;
  conditions?: string;
  /** Гэрээний мөрийн дотоод/үйл ажиллагааны нарийн тэмдэглэл (харилцагчид харагдахгүй байж болно) */
  internalNote?: string | null;
  /** Энэ үйлчилгээнд явах боломжтой гэж тохируулсан тээврийн хэрэгслийн id жагсаалт */
  allowedVehicleIds?: string[];
}

/** TMS Гэрээ */
export interface TmsContract {
  id: string;
  code?: string;
  customerId: string;
  customerRef?: DocumentReference;
  customerName?: string;
  startDate: string | null;
  endDate: string | null;
  status: TmsContractStatus;
  note?: string;
  services: TmsContractService[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_CONTRACTS_COLLECTION = 'tms_contracts';

/** Санхүүгийн гүйлгээний төрөл */
export type TmsFinanceType = 'receivable' | 'payable';
/** Санхүүгийн гүйлгээний төлөв */
export type TmsFinanceStatus = 'pending' | 'partial' | 'paid';

/** TMS Санхүүгийн гүйлгээ (Нэхэмжлэх/Төлбөр) */
export interface TmsFinanceTransaction {
  id: string;
  type: TmsFinanceType;          // receivable (авлага) | payable (өглөг)
  category: string;              // e.g. 'advance', 'remainder', 'driver_payment', 'fuel', 'other'
  description: string;
  amount: number;
  paidAmount: number;
  status: TmsFinanceStatus;
  dueDate?: string | null;
  paidDate?: string | null;
  note?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ==================================================================
// 1 УДААГИЙН ТЭЭВЭР (One-time transports)
// Prototype (tumentech-tms) shipments/cat/one_time модулиас порт хийсэн.
// ==================================================================

/** 1 удаагийн тээврийн төрөл: Орон нутаг / Хот доторх / Автокран */
export type TmsOneTimeTransportType = 'orn_nutag' | 'dotor' | 'avtokran';

/**
 * 1 удаагийн тээврийн төлөв.
 * planned → in_progress → completed → invoiced → paid; cancelled хаанаас ч.
 */
export type TmsOneTimeTransportStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'paid'
  | 'cancelled';

/** Захиалагчийн төлбөрийн төлөв */
export type TmsOneTimePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

/** Тээвэрчинд төлөх төлбөрийн мөрийн төлөв (КАМ → Санхүү → Төлсөн) */
export type TmsCarrierPaymentStatus = 'scheduled' | 'approved' | 'paid';

/** Хот доторх — яаралтай зэрэглэл (null = Стандарт) */
export type TmsOneTimeUrgency = 'urgent' | 'express';

/** Автокран — үнэлгээний нэгж */
export type TmsCraneRateUnit =
  | 'per_hour'
  | 'per_lift'
  | 'per_unload'
  | 'per_load_unload'
  | 'per_day'
  | 'per_month';

/** Хяналтын цэгийн түлхүүр — validation-д хэрэглэгддэг тул ТОГТСОН */
export type TmsOneTimeCheckpointKey = 'readiness' | 'loading' | 'transit' | 'unloading';

/** Хяналтын цэгийн бүртгэл — зураг нь Firebase Storage URL (base64 БИШ) */
export interface TmsTransportCheckpoint {
  /** ISO datetime — баталгаажуулсан хугацаа */
  completedAt: string;
  byEmployeeId?: string | null;
  byEmployeeName?: string | null;
  /** Firebase Storage download URL-ууд */
  photoUrls: string[];
  /** checklist индекс -> шалгасан эсэх */
  checklist?: Record<string, boolean>;
  notes?: string | null;
  /** Зөвхөн transit — зарцуулсан км */
  km?: number | null;
  /** Зөвхөн transit — шатахууны зардал (₮) */
  fuelAmount?: number | null;
}

/** Тээвэрчинд төлөх төлбөрийн мөр (урьдчилгаа / үлдэгдэл / нэмэлт) */
export interface TmsCarrierPayment {
  id: string;
  /** 1 = Урьдчилгаа, 2 = Үлдэгдэл, 3+ = Нэмэлт */
  sequence: number;
  category: 'advance' | 'final' | 'fuel' | 'extra';
  status: TmsCarrierPaymentStatus;
  /** Math.round хийсэн ₮ */
  amount: number;
  dueDate?: string | null;
  paymentDate?: string | null;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  /** ISO datetime — массив дотор serverTimestamp() болохгүй */
  createdAt: string;
  updatedAt?: string;
}

/** Нэхэмжлэхийн нэмэлт мөр (төлөвлөгөөнөөс гадуурх нэмэлт төлбөр) */
export interface TmsExtraInvoiceLine {
  id: string;
  date?: string | null;
  /** НӨАТ-гүй дүн */
  amount: number;
  notes?: string | null;
  createdAt: string;
}

/** Төрөл тус бүрийн нэмэлт талбарууд (бүгд optional — нэг нэгдсэн interface) */
export interface TmsOneTimeTransportDetails {
  // orn_nutag + dotor
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  // orn_nutag
  preferredPickupDate?: string | null;
  deliveryDeadline?: string | null;
  // dotor
  urgency?: TmsOneTimeUrgency | null;
  // avtokran
  serviceAddress?: string | null;
  craneCapacityTons?: number | null;
  craneServiceType?: string | null;
  rateUnit?: TmsCraneRateUnit | null;
  /** Нэгж үнэ (₮) — цаг/өргөлт/хоног гэх мэт нэгжид */
  unitRate?: number | null;
  /** Тоо хэмжээ — rateUnit-аас хамаарч цаг/өргөлт/хоног г.м */
  quantity?: number | null;
  liftCount?: number | null;
  setupTimeMin?: number | null;
  operatorName?: string | null;
  // бүх төрөлд
  hasLoader?: boolean | null;
}

/** 1 удаагийн тээвэр (Орон нутаг / Хот доторх / Автокран) */
export interface TmsOneTimeTransport {
  id: string;
  /** Автомат дугаар — OT-0001 */
  code?: string;
  /** Үнийн санал REV#1-ээс хөрвүүлсэн бол эх саналын холбоос */
  quoteId?: string | null;
  quoteCode?: string | null;
  type: TmsOneTimeTransportType;
  status: TmsOneTimeTransportStatus;
  paymentStatus?: TmsOneTimePaymentStatus;

  // Захиалагч
  customerId: string;
  customerRef?: DocumentReference;
  customerName?: string;
  /** Менежер — tms_customers/{id}/employees subcollection-ийн ажилтан */
  customerEmployeeId?: string | null;
  customerEmployeeName?: string | null;
  /** KAM — байгууллагын employees коллекцийн ажилтан */
  kamEmployeeId?: string | null;
  kamEmployeeName?: string | null;

  // Томилолт
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  vehicleMakeId?: string | null;
  vehicleMakeName?: string | null;
  vehicleTypeId?: string | null;
  trailerTypeId?: string | null;
  /** Тэвш / бүхээгийн төрөл — чөлөөт текст */
  bodyType?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  /** Тээвэрчин компани — чөлөөт текст (ирээдүйд tms_carriers reference болно) */
  carrierName?: string | null;
  carrierId?: string | null;

  // Чиглэл
  origin?: string | null;
  destination?: string | null;
  totalDistanceKm?: number | null;

  // Ачаа
  cargoDescription?: string | null;
  cargoType?: string | null;
  packagingTypeId?: string | null;
  weightKg?: number | null;
  volumeM3?: number | null;

  // Хугацаа
  /**
   * Эхлэх огноо — ISO string (datetime-local).
   * АНХААР: orderBy('scheduledDate')-д талбар дутуу баримт алга болдог тул
   * үүсгэхдээ ҮРГЭЛЖ бичнэ (дор хаяж null).
   */
  scheduledDate?: string | null;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;

  // Мөнгө — бүгд Math.round хийсэн бүхэл ₮
  /** Захиалагчийн үнэ, НӨАТ-гүй */
  basePrice?: number;
  /** ҮРГЭЛЖ round(basePrice / 10) */
  vatAmount?: number;
  /** basePrice + vatAmount */
  totalPrice?: number;
  /** Тээвэрчинд төлөх нийт өртөг */
  costPrice?: number;
  /** Урьдчилгааны хувь — default 50, dotor = 100 */
  carrierAdvancePct?: number;
  /** Урьдчилгааны яг дүн (₮) — өгвөл хувиас давуу */
  carrierAdvanceAmount?: number | null;

  /** Нэхэмжлэхийн дугаар — чөлөөт текст (TMS-д invoice модуль гараагүй) */
  invoiceNumber?: string | null;
  notes?: string | null;
  cancelReason?: string | null;

  details?: TmsOneTimeTransportDetails;
  checkpoints?: Partial<Record<TmsOneTimeCheckpointKey, TmsTransportCheckpoint>>;
  carrierPayments?: TmsCarrierPayment[];
  extraInvoiceLines?: TmsExtraInvoiceLine[];

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_ONE_TIME_TRANSPORTS_COLLECTION = 'tms_one_time_transports';

// ==================================================================
// ҮНИЙН САНАЛ REV#1 (quotes)
// Prototype (tumentech-tms) quotes модулиас порт хийсэн.
// Одоогийн tms_quotations-тай зэрэгцэн ажиллана — өөр коллекц, өөр төрлүүд.
// ==================================================================

/**
 * Үнийн саналын төлөв.
 * draft → sent → accepted → converted; sent-ээс rejected/expired; буцаалтууд бий.
 */
export type TmsQuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired';

/** Формын төрөл: Богино (~8 талбар) / Дэлгэрэнгүй (бүрэн) */
export type TmsQuoteFormType = 'short' | 'long';

/** Саналын хүрээ — international нь одоогоор stub ("тун удахгүй") */
export type TmsQuoteScope = 'domestic' | 'international';

/** "Үнэд хамаарах зүйлс" checklist-ийн түлхүүрүүд */
export type TmsQuotePriceScopeKey =
  | 'fuel'
  | 'tolls'
  | 'loading'
  | 'insurance'
  | 'customs'
  | 'driver_food'
  | 'vat'
  | 'parking';

/** Үнэд орсон / ороогүй */
export type TmsQuotePriceScopeValue = 'in' | 'out';

/** Төлбөрийн төрөл */
export type TmsQuotePaymentTerms = 'cash' | 'prepayment' | 'credit' | 'contract';

/** Дэлгэрэнгүй формын нэмэлт талбарууд (үүрлэсэн) */
export interface TmsQuoteDetails {
  scope?: TmsQuoteScope | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  preferredPickupDate?: string | null;
  deliveryDeadline?: string | null;
  /** Үнэ хүчинтэй хоног — default 30, ⏰ хугацаа хэтрэлтийн тооцоонд */
  validDays?: number | null;
  prepaymentPct?: number | null;
  paymentDueDays?: number | null;
  additionalServices?: string | null;
  priceScope?: Partial<Record<TmsQuotePriceScopeKey, TmsQuotePriceScopeValue>>;
  paymentTerms?: TmsQuotePaymentTerms | null;
}

/** Үнийн санал REV#1 */
export interface TmsQuote {
  id: string;
  /** Автомат дугаар — QT-0001 */
  code?: string;
  formType: TmsQuoteFormType;
  status: TmsQuoteStatus;
  /** 'YYYY-MM-DD' — orderBy талбар тул ҮРГЭЛЖ бичигдэнэ (формд заавал) */
  requestDate: string;
  sentDate?: string | null;
  acceptedDate?: string | null;

  customerId: string;
  customerRef?: DocumentReference;
  customerName?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  /** Борлуулалтын менежер — засварт ХАДГАЛАГДАНА (шинэ хэрэглэгчээр дарж бичихгүй) */
  kamEmployeeId?: string | null;
  kamEmployeeName?: string | null;

  fromLocation?: string | null;
  toLocation?: string | null;
  vehicleMakeId?: string | null;
  vehicleMakeName?: string | null;
  /** Тэвш / Бүхээг */
  bodyType?: string | null;
  cargoType?: string | null;
  cargoDescription?: string | null;
  weightKg?: number | null;
  volumeM3?: number | null;
  packagingTypeId?: string | null;
  transportCount?: number | null;
  currency?: string;

  // Мөнгө — бүгд Math.round хийсэн бүхэл ₮
  /** 🔒 ДОТООД — тээвэрчинд төлөх, НӨАТ-гүй (захиалагчид хэзээ ч харагдахгүй) */
  agentPrice?: number;
  /** 📄 Захиалагчид нэхэмжлэх, НӨАТ-гүй */
  transportPrice?: number;
  /** round(transportPrice / 10) */
  vatAmount?: number;
  /** transportPrice + vatAmount — захиалагчид харагдах цор ганц дүн */
  totalPrice?: number;
  /** KAM шимтгэл — зөвхөн дэлгэрэнгүй формд */
  commission?: number | null;

  rejectReason?: string | null;
  notes?: string | null;
  /** Хөлдөөлт — статусаас хараат бус, засварыг хаана */
  isLocked?: boolean;
  lockedAt?: Timestamp | null;
  /** Хөрвүүлсэн 1 удаагийн тээврийн холбоос */
  convertedTransportId?: string | null;
  convertedTransportCode?: string | null;

  details?: TmsQuoteDetails;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_QUOTES_COLLECTION = 'tms_quotes';

// ==================================================================
// ДАВТАМЖИТ ТЭЭВЭР (recurring transports)
// Prototype-ийн shipments/cat/recurring (tugeelt/project) порт —
// одоогийн tms_contracts гэрээнээс wizard-аар багцаар үүсдэг.
// ==================================================================

/** Давтамжит тээврийн төрөл: 🚚 Түгээлт / 🏗 Төсөл (тонн-км) */
export type TmsRecurringTransportType = 'tugeelt' | 'project';

/** Давтамжит тээврийн төлөв — 1 удаагийн тээвэртэй ижил урсгал */
export type TmsRecurringTransportStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'paid'
  | 'cancelled';

/** Түгээлтийн зогсоол (хүлээн авагч) */
export interface TmsRecurringStop {
  id: string;
  sequence: number;
  address: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  status: 'pending' | 'delivered';
  deliveredAt?: string | null;
  notes?: string | null;
}

/** Пүүний жингийн бүртгэл (per_ton_km үнэлгээнд) */
export interface TmsRecurringWeighing {
  emptyWeightKg: number;
  loadedWeightKg: number;
  cargoWeightKg: number;
  cargoWeightTon: number;
  weighedAt: string;
  byEmployeeId?: string | null;
  byEmployeeName?: string | null;
}

/** Давтамжит тээвэр — гэрээний үйлчилгээнээс үүссэн нэг рейс/өдрийн тээвэр */
export interface TmsRecurringTransport {
  id: string;
  /** Автомат дугаар — RT-0001 */
  code?: string;
  type: TmsRecurringTransportType;
  status: TmsRecurringTransportStatus;
  paymentStatus?: TmsOneTimePaymentStatus;

  // Гэрээний холбоос + snapshot (үйлчилгээг ID-гаар — prototype-ийн индексийн bug засав)
  contractId: string;
  contractCode?: string | null;
  contractServiceId: string;
  contractServiceName?: string | null;
  /** Үнэлгээний нэгжийн snapshot (гэрээ өөрчлөгдөхөд тээвэр хэвээр) */
  contractPriceType?: TmsContractPriceType | null;
  /** per_ton_km-д: гэрээний зай (км) — тонн-км томьёоны км */
  contractDistanceKm?: number | null;
  /** per_ton_km-д ₮/т·км, бусад нэгжид нэгжийн ₮ — тээвэрчинд */
  contractCarrierRate?: number | null;
  /** мөн адил — захиалагчид */
  contractCustomerRate?: number | null;

  // Захиалагч (гэрээнээс)
  customerId: string;
  customerRef?: DocumentReference;
  customerName?: string | null;
  kamEmployeeId?: string | null;
  kamEmployeeName?: string | null;

  // Томилолт
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  /** Тээвэрчин компани — чөлөөт текст (OT-тэй ижил загвар) */
  carrierName?: string | null;

  // Чиглэл
  origin?: string | null;
  destination?: string | null;
  totalDistanceKm?: number | null;
  /** Түгээлтийн бүс (tugeelt) */
  distributionZone?: string | null;
  /** Зогсоол тутмын үнэ (tugeelt) */
  perStopRate?: number | null;
  /** Түгээлтийн зогсоолууд (tugeelt) */
  stops?: TmsRecurringStop[];

  // Хугацаа
  /** 'YYYY-MM-DD' — orderBy талбар тул ҮРГЭЛЖ бичигдэнэ */
  scheduledDate: string;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;

  // Мөнгө (бүхэл ₮; per_ton_km-д жин бүртгэх хүртэл 0)
  basePrice?: number;
  vatAmount?: number;
  totalPrice?: number;
  costPrice?: number;

  /** Пүүний жин — per_ton_km-д Дуусгахын өмнө заавал */
  weighing?: TmsRecurringWeighing | null;

  invoiceNumber?: string | null;
  notes?: string | null;
  cancelReason?: string | null;

  /** Нэгтгэн тооцоонд (settlement) багтсан огноо — ирээдүйн модулийн талбар */
  settledAt?: string | null;

  /** 3 шатны checkpoint (loading шат хэрэглэгдэхгүй — Бэлэн байдалд нэгтгэгдсэн) */
  checkpoints?: Partial<Record<TmsOneTimeCheckpointKey, TmsTransportCheckpoint>>;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_RECURRING_TRANSPORTS_COLLECTION = 'tms_recurring_transports';
