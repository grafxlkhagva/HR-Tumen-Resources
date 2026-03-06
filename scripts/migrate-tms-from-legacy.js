/**
 * TMS migration: tumen-tech-tms-20 төслөөс customers, customer_employees, warehouses-ийг
 * одоогийн төслийн tms_customers, tms_customers/{id}/employees, tms_warehouses руу хуулна.
 *
 * Хэрэглээ:
 *   node scripts/migrate-tms-from-legacy.js <SOURCE_KEY.json> [TARGET_KEY.json] [--warehouses-only|--drivers-only]
 *
 * --warehouses-only — зөвхөн агуулах хуулна.
 * --drivers-only    — зөвхөн тээвэрчин + Storage хуулна.
 * --vehicles-only   — зөвхөн тээврийн хэрэгсэл хуулна: Vehicles → tms_vehicles.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SOURCE_COLLECTION_CUSTOMERS = 'customers';
const SOURCE_COLLECTION_EMPLOYEES = 'customer_employees';
const SOURCE_COLLECTION_WAREHOUSES = 'warehouses';
const SOURCE_COLLECTION_DRIVERS = 'Drivers';
const SOURCE_COLLECTION_STORAGE = 'Storage';
const SOURCE_COLLECTION_VEHICLES = 'Vehicles';
const TARGET_COLLECTION_CUSTOMERS = 'tms_customers';
const TARGET_SUBCOLLECTION_EMPLOYEES = 'employees';
const TARGET_COLLECTION_WAREHOUSES = 'tms_warehouses';
const TARGET_COLLECTION_DRIVERS = 'tms_drivers';
const TARGET_DRIVER_STORAGE_SUBCOLLECTION = 'storage';
const TARGET_COLLECTION_VEHICLES = 'tms_vehicles';
const BATCH_SIZE = 500;

const VEHICLE_STATUS_MAP = { Available: 'Available', Maintenance: 'Maintenance', Ready: 'Ready', 'In Use': 'In Use' };
const VEHICLE_FUEL_MAP = { Diesel: 'Diesel', Gasoline: 'Gasoline', Electric: 'Electric', Hybrid: 'Hybrid' };

const WAREHOUSE_STATUS_MAP = { active: 'active', inactive: 'inactive', full: 'full', maintenance: 'maintenance' };
const WAREHOUSE_TYPE_MAP = { General: 'General', 'Cold Storage': 'Cold Storage', Hazardous: 'Hazardous', Bonded: 'Bonded' };
const CAPACITY_UNIT_MAP = { sqm: 'sqm', pallets: 'pallets', tons: 'tons' };

function loadKey(keyPath) {
  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Key file not found: ${resolved}`);
  }
  return require(resolved);
}

/** Firestore does not accept undefined; remove keys with undefined value. */
function stripUndefined(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj && typeof obj.toDate === 'function') return obj; // Timestamp
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined) continue;
    out[k] = v !== null && typeof v === 'object' && typeof v.toDate !== 'function' ? stripUndefined(v) : v;
  }
  return out;
}

function toTimestamp(val) {
  if (!val) return null;
  if (val && typeof val.toDate === 'function') return val; // Firestore Timestamp
  if (val._seconds !== undefined) return admin.firestore.Timestamp.fromMillis((val._seconds || 0) * 1000);
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : admin.firestore.Timestamp.fromDate(d);
  }
  return null;
}

function mapCustomer(doc) {
  const d = doc.data();
  const createdAt = toTimestamp(d.createdAt) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt) || createdAt;
  return {
    name: d.name ?? d.companyName ?? d.displayName ?? '',
    phone: d.phone ?? d.phoneNumber ?? null,
    email: d.email ?? null,
    note: d.note ?? d.notes ?? null,
    createdAt,
    updatedAt,
  };
}

function mapEmployee(doc, customerId, targetDb) {
  const d = doc.data();
  const createdAt = toTimestamp(d.createdAt) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt) || createdAt;
  const customerRef = targetDb.doc(`${TARGET_COLLECTION_CUSTOMERS}/${customerId}`);
  return {
    lastName: d.lastName ?? d.last_name ?? '',
    firstName: d.firstName ?? d.first_name ?? '',
    position: d.position ?? d.jobTitle ?? '',
    phone: d.phone ?? d.phoneNumber ?? '',
    email: d.email ?? '',
    note: d.note ?? d.notes ?? null,
    customerId,
    customerRef,
    createdAt,
    updatedAt,
  };
}

function mapWarehouse(doc, targetDb, customerIdSet) {
  const d = doc.data();
  const createdAt = toTimestamp(d.createdAt) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt) || createdAt;
  const lat = typeof d.geolocation?.lat === 'number' ? d.geolocation.lat : (d.lat != null ? Number(d.lat) : 0);
  const lng = typeof d.geolocation?.lng === 'number' ? d.geolocation.lng : (d.lng != null ? Number(d.lng) : 0);
  const status = WAREHOUSE_STATUS_MAP[d.status] ?? 'active';
  const type = WAREHOUSE_TYPE_MAP[d.type] ?? 'General';
  const rawCapacity = d.capacity;
  const capacity = rawCapacity && (rawCapacity.value != null) && rawCapacity.unit
    ? { value: Number(rawCapacity.value), unit: CAPACITY_UNIT_MAP[rawCapacity.unit] ?? 'sqm' }
    : null;
  const customerId = d.customerId ?? d.customer_id ?? (d.customerRef?.id) ?? null;
  const customerRef = customerId && customerIdSet.has(customerId)
    ? targetDb.doc(`${TARGET_COLLECTION_CUSTOMERS}/${customerId}`)
    : null;
  return {
    name: d.name ?? '',
    regionId: d.regionId ?? d.region_id ?? '',
    location: d.location ?? '',
    geolocation: { lat, lng },
    status,
    type,
    conditions: d.conditions ?? '',
    contactInfo: d.contactInfo ?? d.contact_info ?? '',
    contactName: d.contactName ?? d.contact_name ?? null,
    contactPosition: d.contactPosition ?? d.contact_position ?? null,
    customerId: customerId && customerIdSet.has(customerId) ? customerId : null,
    customerName: d.customerName ?? d.customer_name ?? null,
    customerRef,
    capacity,
    note: d.note ?? d.notes ?? null,
    createdAt,
    updatedAt,
  };
}

function mapDriver(doc) {
  const d = doc.data();
  const createdAt = toTimestamp(d.createdAt ?? d.created_time) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.edited_time) || createdAt;
  const statusRaw = (d.status ?? '').toString().toLowerCase();
  const status = statusRaw === 'inactive' ? 'inactive' : 'active';

  let firstName = d.firstName ?? d.first_name ?? '';
  let lastName = d.lastName ?? d.last_name ?? d.surname ?? '';
  const fullName = (d.display_name ?? d.name ?? d.fullName ?? d.displayName ?? d.driverName ?? '').trim();
  if (fullName && !firstName && !lastName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      lastName = parts[0];
      firstName = parts.slice(1).join(' ');
    } else {
      lastName = fullName;
    }
  }

  const phone = (d.phone_number ?? d.phone ?? d.phoneNumber ?? d.mobile ?? d.tel ?? d.contact ?? '').trim() || '';
  const email = (d.email ?? d.emailAddress ?? d.mail ?? '').trim() || null;

  const photoURL = (d.photo_url ?? d.photoURL ?? d.photo ?? '').trim() || null;
  const registerNumber = (d.registerNumber ?? d.register_number ?? '').trim() || null;
  const emergencyContact = d.emergencyContact && (d.emergencyContact.name || d.emergencyContact.phone)
    ? { name: d.emergencyContact.name ?? '', phone: d.emergencyContact.phone ?? '' }
    : null;
  const licenseClasses = Array.isArray(d.licenseClasses) ? d.licenseClasses : null;

  return {
    firstName: firstName || '',
    lastName: lastName || '',
    phone,
    email,
    registerNumber,
    dateOfBirth: d.dateOfBirth ?? d.date_of_birth ?? null,
    photoURL,
    status,
    note: d.note ?? d.notes ?? null,
    emergencyContact,
    isAvailableForContracted: Boolean(d.isAvailableForContracted ?? d.is_available_for_contracted),
    licenseNumber: (d.licenseNumber ?? d.license_number ?? '').trim() || null,
    licenseExpiryDate: d.licenseExpiryDate ?? d.license_expiry_date ?? null,
    licenseClasses,
    licenseImageFrontUrl: (d.licenseImageFrontUrl ?? d.license_image_front_url ?? '').trim() || null,
    licenseImageBackUrl: (d.licenseImageBackUrl ?? d.license_image_back_url ?? '').trim() || null,
    nationalIdFrontUrl: (d.nationalIdFrontUrl ?? d.national_id_front_url ?? '').trim() || null,
    nationalIdBackUrl: (d.nationalIdBackUrl ?? d.national_id_back_url ?? '').trim() || null,
    createdAt,
    updatedAt,
  };
}

function mapStorageItem(doc, driverId) {
  const d = doc.data();
  const createdAt = toTimestamp(d.createdAt) || admin.firestore.Timestamp.now();
  return {
    driverId,
    name: d.name ?? d.fileName ?? null,
    url: d.url ?? d.downloadURL ?? d.src ?? '',
    path: d.path ?? null,
    contentType: d.contentType ?? d.content_type ?? null,
    createdAt,
  };
}

function mapVehicle(doc) {
  const d = doc.data();
  const createdAt = toTimestamp(d.createdAt) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt) || createdAt;
  const status = VEHICLE_STATUS_MAP[d.status] ?? d.status ?? null;
  const fuelType = VEHICLE_FUEL_MAP[d.fuelType] ?? d.fuel_type ?? null;
  const dates = (d.dates && typeof d.dates === 'object') ? {
    purchase: toTimestamp(d.dates.purchase),
    warrantyExpiry: toTimestamp(d.dates.warrantyExpiry ?? d.dates.warranty_expiry),
    registrationExpiry: toTimestamp(d.dates.registrationExpiry ?? d.dates.registration_expiry),
    insuranceExpiry: toTimestamp(d.dates.insuranceExpiry ?? d.dates.insurance_expiry),
    roadPermitExpiry: toTimestamp(d.dates.roadPermitExpiry ?? d.dates.road_permit_expiry),
    inspectionExpiry: toTimestamp(d.dates.inspectionExpiry ?? d.dates.inspection_expiry),
  } : null;
  const specs = (d.specs && typeof d.specs === 'object') ? {
    tankCapacity: (d.specs.tankCapacity ?? d.specs.tank_capacity) != null ? Number(d.specs.tankCapacity ?? d.specs.tank_capacity) : undefined,
    transmission: d.specs.transmission ?? d.specs.transmission ?? undefined,
    axleConfig: d.specs.axleConfig ?? d.specs.axle_config ?? undefined,
    engineType: d.specs.engineType ?? d.specs.engine_type ?? undefined,
  } : null;
  const createdBy = (d.createdBy && typeof d.createdBy === 'object') ? {
    uid: d.createdBy.uid ?? '',
    name: d.createdBy.name ?? '',
  } : (d.created_by && typeof d.created_by === 'object') ? { uid: d.created_by.uid ?? '', name: d.created_by.name ?? '' } : null;
  return {
    makeId: d.makeId ?? d.make_id ?? null,
    makeName: d.makeName ?? d.make_name ?? null,
    modelId: d.modelId ?? d.model_id ?? null,
    modelName: d.modelName ?? d.model_name ?? null,
    year: d.year != null ? Number(d.year) : null,
    importedYear: d.importedYear ?? d.imported_year != null ? Number(d.importedYear ?? d.imported_year) : null,
    licensePlate: d.licensePlate ?? d.license_plate ?? null,
    licensePlateDigits: d.licensePlateDigits ?? d.license_plate_digits ?? null,
    licensePlateChars: Array.isArray(d.licensePlateChars) ? d.licensePlateChars : (d.license_plate_chars ? (Array.isArray(d.license_plate_chars) ? d.license_plate_chars : null) : null),
    trailerLicensePlate: d.trailerLicensePlate ?? d.trailer_license_plate ?? null,
    trailerLicensePlateDigits: d.trailerLicensePlateDigits ?? d.trailer_license_plate_digits ?? null,
    trailerLicensePlateChars: Array.isArray(d.trailerLicensePlateChars) ? d.trailerLicensePlateChars : (d.trailer_license_plate_chars ? (Array.isArray(d.trailer_license_plate_chars) ? d.trailer_license_plate_chars : null) : null),
    vin: d.vin ?? null,
    vehicleTypeId: d.vehicleTypeId ?? d.vehicle_type_id ?? null,
    trailerTypeId: d.trailerTypeId ?? d.trailer_type_id ?? null,
    capacity: d.capacity ?? null,
    fuelType,
    notes: d.notes ?? null,
    status,
    driverId: d.driverId ?? d.driver_id ?? null,
    driverName: d.driverName ?? d.driver_name ?? null,
    imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls : (Array.isArray(d.image_urls) ? d.image_urls : null),
    odometer: d.odometer != null ? Number(d.odometer) : 0,
    specs,
    dates,
    createdAt,
    updatedAt,
    createdBy,
  };
}

async function run() {
  const args = process.argv.slice(2);
  const sourceKeyPath = args[0];
  const targetKeyPath = args[1];
  const warehousesOnly = args.includes('--warehouses-only');
  const driversOnly = args.includes('--drivers-only');
  const vehiclesOnly = args.includes('--vehicles-only');
  const inspectDrivers = args.includes('--inspect-drivers');
  const inspectVehicles = args.includes('--inspect-vehicles');

  if (!sourceKeyPath) {
    console.error('Usage: node scripts/migrate-tms-from-legacy.js <SOURCE_KEY.json> [TARGET_KEY.json] [--warehouses-only|--drivers-only|--vehicles-only]');
    process.exit(1);
  }

  const sourceKey = loadKey(sourceKeyPath);
  const sourceProjectId = sourceKey.project_id || 'tumen-tech-tms-20';

  let targetApp;
  if (targetKeyPath) {
    const targetKey = loadKey(targetKeyPath);
    targetApp = admin.initializeApp(
      { credential: admin.credential.cert(targetKey) },
      'target'
    );
  } else {
    try {
      targetApp = admin.initializeApp(
        {
          projectId: 'hr-tumenresources',
          credential: admin.credential.applicationDefault(),
        },
        'target'
      );
    } catch (e) {
      console.error('Target: pass TARGET_KEY.json or set GOOGLE_APPLICATION_CREDENTIALS. Error:', e.message);
      process.exit(1);
    }
  }

  const sourceApp = admin.initializeApp(
    { credential: admin.credential.cert(sourceKey), projectId: sourceProjectId },
    'source'
  );

  const sourceDb = sourceApp.firestore();
  const targetDb = targetApp.firestore();

  if (inspectDrivers) {
    const snap = await sourceDb.collection(SOURCE_COLLECTION_DRIVERS).limit(3).get();
    console.log('Sample Drivers collection fields (first %s doc(s)):\n', snap.size);
    snap.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log('--- Doc %s (id: %s) ---', i + 1, doc.id);
      console.log(JSON.stringify(Object.keys(data).reduce((acc, k) => {
        const v = data[k];
        acc[k] = v && typeof v === 'object' && v.constructor?.name === 'Timestamp' ? v.toDate?.()?.toISOString?.() ?? '[Timestamp]' : v;
        return acc;
      }, {}), null, 2));
    });
    console.log('\nInspect done. Adjust mapDriver() if field names differ.');
    process.exit(0);
  }

  if (inspectVehicles) {
    const possibleNames = ['Vehicles', 'vehicles', 'Vehicle', 'vehicle', 'Transport', 'Fleet', 'transport', 'fleet'];
    console.log('Checking source collections for vehicles:\n');
    for (const name of possibleNames) {
      const snap = await sourceDb.collection(name).limit(1).get();
      console.log(`  "${name}": ${snap.size ? snap.size + ' doc(s)' : 'empty or missing'}`);
    }
    const snap = await sourceDb.collection(SOURCE_COLLECTION_VEHICLES).limit(3).get();
    console.log(`\nSample "${SOURCE_COLLECTION_VEHICLES}" (first ${snap.size} doc(s)):\n`);
    snap.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log('--- Doc %s (id: %s) ---', i + 1, doc.id);
      console.log(JSON.stringify(Object.keys(data).reduce((acc, k) => {
        const v = data[k];
        acc[k] = v && typeof v === 'object' && v.constructor?.name === 'Timestamp' ? v.toDate?.()?.toISOString?.() ?? '[Timestamp]' : v;
        return acc;
      }, {}), null, 2));
    });
    console.log('\nIf "Vehicles" is 0, set SOURCE_COLLECTION_VEHICLES to the collection name that has data (e.g. "vehicles").');
    process.exit(0);
  }

  let customerIdMap = new Map();
  let customerIdSet = new Set();

  if (driversOnly) {
    console.log('Drivers-only mode: migrating Drivers + Storage.');
    const driversSnap = await sourceDb.collection(SOURCE_COLLECTION_DRIVERS).get();
    const drivers = driversSnap.docs;
    console.log(`Found ${drivers.length} drivers.`);
    const storageSnap = await sourceDb.collection(SOURCE_COLLECTION_STORAGE).get();
    const storageDocs = storageSnap.docs;
    console.log(`Found ${storageDocs.length} Storage documents.`);

    const storageByDriver = new Map();
    for (const doc of storageDocs) {
      const d = doc.data();
      const driverId = d.driverId ?? d.driver_id ?? d.driverRef?.id ?? null;
      if (!driverId) continue;
      if (!storageByDriver.has(driverId)) storageByDriver.set(driverId, []);
      storageByDriver.get(driverId).push(doc);
    }

    let batch = targetDb.batch();
    let opCount = 0;
    let writtenDrivers = 0;
    for (const doc of drivers) {
      const data = mapDriver(doc);
      const ref = targetDb.collection(TARGET_COLLECTION_DRIVERS).doc(doc.id);
      batch.set(ref, data);
      opCount++;
      writtenDrivers++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  Committed ${writtenDrivers} drivers.`);
        batch = targetDb.batch();
        opCount = 0;
      }
    }
    if (opCount > 0) await batch.commit();
    console.log(`Written ${writtenDrivers} drivers to ${TARGET_COLLECTION_DRIVERS}.`);

    batch = targetDb.batch();
    opCount = 0;
    let writtenStorage = 0;
    for (const doc of drivers) {
      const items = storageByDriver.get(doc.id) || [];
      for (const itemDoc of items) {
        const data = mapStorageItem(itemDoc, doc.id);
        const ref = targetDb.collection(TARGET_COLLECTION_DRIVERS).doc(doc.id).collection(TARGET_DRIVER_STORAGE_SUBCOLLECTION).doc(itemDoc.id);
        batch.set(ref, data);
        opCount++;
        writtenStorage++;
        if (opCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`  Committed storage (${writtenStorage} items so far).`);
          batch = targetDb.batch();
          opCount = 0;
        }
      }
    }
    if (opCount > 0) await batch.commit();
    console.log(`Written ${writtenStorage} storage items to ${TARGET_COLLECTION_DRIVERS}/{id}/${TARGET_DRIVER_STORAGE_SUBCOLLECTION}.`);
    console.log('Done.');
    return;
  }

  if (vehiclesOnly) {
    console.log('Vehicles-only mode: migrating Vehicles.');
    const possibleVehicleCollections = [SOURCE_COLLECTION_VEHICLES, 'vehicles', 'Vehicle', 'vehicle', 'Transport', 'Fleet', 'transport', 'fleet'];
    let vehicles = [];
    let usedCollectionName = SOURCE_COLLECTION_VEHICLES;
    for (const collName of possibleVehicleCollections) {
      const snap = await sourceDb.collection(collName).get();
      if (snap.docs.length > 0) {
        vehicles = snap.docs;
        usedCollectionName = collName;
        console.log(`Using collection "${collName}" (${vehicles.length} docs).`);
        break;
      }
    }
    if (vehicles.length === 0) {
      console.log(`Found 0 vehicles. Tried: ${possibleVehicleCollections.join(', ')}. Use --inspect-vehicles to list source collections.`);
    }
    let batch = targetDb.batch();
    let opCount = 0;
    let writtenVehicles = 0;
    for (const doc of vehicles) {
      const data = stripUndefined(mapVehicle(doc));
      const ref = targetDb.collection(TARGET_COLLECTION_VEHICLES).doc(doc.id);
      batch.set(ref, data);
      opCount++;
      writtenVehicles++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  Committed ${writtenVehicles} vehicles.`);
        batch = targetDb.batch();
        opCount = 0;
      }
    }
    if (opCount > 0) await batch.commit();
    console.log(`Written ${writtenVehicles} vehicles to ${TARGET_COLLECTION_VEHICLES}.`);
    console.log('Done.');
    return;
  }

  if (warehousesOnly) {
    console.log('Warehouses-only mode: skipping customers/employees.');
    console.log('Loading existing customer IDs from target tms_customers (for warehouse customerRef)...');
    const existingCustomers = await targetDb.collection(TARGET_COLLECTION_CUSTOMERS).get();
    existingCustomers.docs.forEach((d) => {
      customerIdMap.set(d.id, d.id);
      customerIdSet.add(d.id);
    });
    console.log(`Found ${customerIdSet.size} customers in target.`);
  } else {
    console.log('Reading source: customers...');
    const customersSnap = await sourceDb.collection(SOURCE_COLLECTION_CUSTOMERS).get();
    const customers = customersSnap.docs;
    console.log(`Found ${customers.length} customers.`);

    console.log('Reading source: customer_employees...');
    const employeesSnap = await sourceDb.collection(SOURCE_COLLECTION_EMPLOYEES).get();
    const employees = employeesSnap.docs;
    console.log(`Found ${employees.length} customer_employees.`);

    for (const doc of customers) {
      customerIdMap.set(doc.id, doc.id);
      customerIdSet.add(doc.id);
    }

    let writtenCustomers = 0;
    let batch = targetDb.batch();
    let opCount = 0;

    for (const doc of customers) {
      const data = mapCustomer(doc);
      const ref = targetDb.collection(TARGET_COLLECTION_CUSTOMERS).doc(doc.id);
      batch.set(ref, data);
      opCount++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        writtenCustomers += opCount;
        console.log(`  Committed ${writtenCustomers} customers.`);
        batch = targetDb.batch();
        opCount = 0;
      }
    }
    if (opCount > 0) {
      await batch.commit();
      writtenCustomers += opCount;
    }
    console.log(`Written ${writtenCustomers} customers to ${TARGET_COLLECTION_CUSTOMERS}.`);

    batch = targetDb.batch();
    opCount = 0;

    const employeesByCustomer = new Map();
    for (const doc of employees) {
    const d = doc.data();
      const cid = d.customerId ?? d.customer_id ?? d.customerRef?.id;
      if (!cid) {
        console.warn(`  Skip employee ${doc.id}: no customerId.`);
        continue;
      }
      if (!customerIdMap.has(cid)) {
        console.warn(`  Skip employee ${doc.id}: unknown customerId ${cid}.`);
        continue;
      }
      if (!employeesByCustomer.has(cid)) employeesByCustomer.set(cid, []);
      employeesByCustomer.get(cid).push(doc);
    }

    let writtenEmployees = 0;
    for (const [customerId, docs] of employeesByCustomer) {
      for (const doc of docs) {
        const data = mapEmployee(doc, customerId, targetDb);
        const ref = targetDb
          .collection(TARGET_COLLECTION_CUSTOMERS)
          .doc(customerId)
          .collection(TARGET_SUBCOLLECTION_EMPLOYEES)
          .doc(doc.id);
        batch.set(ref, data);
        opCount++;
        writtenEmployees++;
        if (opCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`  Committed batch (${writtenEmployees} employees so far).`);
          batch = targetDb.batch();
          opCount = 0;
        }
      }
    }
    if (opCount > 0) await batch.commit();
    console.log(`Written ${writtenEmployees} employees to ${TARGET_COLLECTION_CUSTOMERS}/{id}/${TARGET_SUBCOLLECTION_EMPLOYEES}.`);
  }

  console.log('Reading source: warehouses...');
  const warehousesSnap = await sourceDb.collection(SOURCE_COLLECTION_WAREHOUSES).get();
  const warehouses = warehousesSnap.docs;
  console.log(`Found ${warehouses.length} warehouses.`);

  const warehouseCustomerIdSet = new Set(customerIdMap.keys());
  let batch = targetDb.batch();
  let opCount = 0;
  let writtenWarehouses = 0;

  for (const doc of warehouses) {
    const data = mapWarehouse(doc, targetDb, warehouseCustomerIdSet);
    const ref = targetDb.collection(TARGET_COLLECTION_WAREHOUSES).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    writtenWarehouses++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch (${writtenWarehouses} warehouses so far).`);
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${writtenWarehouses} warehouses to ${TARGET_COLLECTION_WAREHOUSES}.`);

  console.log('Reading source: Drivers...');
  const driversSnap = await sourceDb.collection(SOURCE_COLLECTION_DRIVERS).get();
  const drivers = driversSnap.docs;
  console.log(`Found ${drivers.length} drivers.`);
  const storageSnap = await sourceDb.collection(SOURCE_COLLECTION_STORAGE).get();
  const storageDocs = storageSnap.docs;
  console.log(`Found ${storageDocs.length} Storage documents.`);

  const storageByDriver = new Map();
  for (const d of storageDocs) {
    const data = d.data();
    const driverId = data.driverId ?? data.driver_id ?? data.driverRef?.id ?? null;
    if (!driverId) continue;
    if (!storageByDriver.has(driverId)) storageByDriver.set(driverId, []);
    storageByDriver.get(driverId).push(d);
  }

  batch = targetDb.batch();
  opCount = 0;
  let writtenDrivers = 0;
  for (const doc of drivers) {
    const data = mapDriver(doc);
    const ref = targetDb.collection(TARGET_COLLECTION_DRIVERS).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    writtenDrivers++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed ${writtenDrivers} drivers.`);
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${writtenDrivers} drivers to ${TARGET_COLLECTION_DRIVERS}.`);

  batch = targetDb.batch();
  opCount = 0;
  let writtenStorage = 0;
  for (const doc of drivers) {
    const items = storageByDriver.get(doc.id) || [];
    for (const itemDoc of items) {
      const data = mapStorageItem(itemDoc, doc.id);
      const ref = targetDb.collection(TARGET_COLLECTION_DRIVERS).doc(doc.id).collection(TARGET_DRIVER_STORAGE_SUBCOLLECTION).doc(itemDoc.id);
      batch.set(ref, data);
      opCount++;
      writtenStorage++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  Committed storage (${writtenStorage} items).`);
        batch = targetDb.batch();
        opCount = 0;
      }
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${writtenStorage} storage items to ${TARGET_COLLECTION_DRIVERS}/{id}/${TARGET_DRIVER_STORAGE_SUBCOLLECTION}.`);

  console.log('Reading source: Vehicles...');
  const possibleVehicleCollections = [SOURCE_COLLECTION_VEHICLES, 'vehicles', 'Vehicle', 'vehicle', 'Transport', 'Fleet', 'transport', 'fleet'];
  let vehicles = [];
  for (const collName of possibleVehicleCollections) {
    const snap = await sourceDb.collection(collName).get();
    if (snap.docs.length > 0) {
      vehicles = snap.docs;
      console.log(`Using collection "${collName}" (${vehicles.length} docs).`);
      break;
    }
  }
  if (vehicles.length === 0) {
    console.log(`Found 0 vehicles. Tried: ${possibleVehicleCollections.join(', ')}.`);
  }
  batch = targetDb.batch();
  opCount = 0;
  let writtenVehicles = 0;
  for (const doc of vehicles) {
    const data = stripUndefined(mapVehicle(doc));
    const ref = targetDb.collection(TARGET_COLLECTION_VEHICLES).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    writtenVehicles++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed ${writtenVehicles} vehicles.`);
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${writtenVehicles} vehicles to ${TARGET_COLLECTION_VEHICLES}.`);

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
