import type { Timestamp, DocumentReference } from 'firebase/firestore';

/** TMS харилцагч (байгууллага/компани) */
export interface TmsCustomer {
  id: string;
  name: string;
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
  imageUrls?: string[];
  odometer?: number;
  specs?: TmsVehicleSpecs;
  dates?: TmsVehicleDates;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: TmsVehicleCreatedBy;
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
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const TMS_QUOTATIONS_COLLECTION = 'tms_quotations';
