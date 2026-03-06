/**
 * TMS Storage bucket хуулга: tumen-tech-tms-20 төслийн Storage bucket дээрх
 * folder-уудыг (driver_avatars/, driver_licenses/, г.м) hr-tumenresources төслийн
 * bucket руу ижил бүтэцээр хуулна.
 *
 * Хэрэглээ:
 *   node scripts/migrate-tms-storage-buckets.js <SOURCE_KEY.json> <TARGET_KEY.json> [prefix1 prefix2 ...]
 *
 * Жишээ (бүх тээвэрчин холбоотой folder):
 *   node scripts/migrate-tms-storage-buckets.js scripts/key/tumen-tech-tms-20-key.json scripts/key/hr-tumenresources-key.json
 *
 * Зөвхөн тодорхой prefix-үүд:
 *   node scripts/migrate-tms-storage-buckets.js ... driver_avatars driver_licenses
 *
 * Default prefix-үүд: driver_avatars, driver_licenses, contracted_executions, users, vehicle_images
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const DEFAULT_PREFIXES = [
  'driver_avatars/',
  'driver_licenses/',
  'contracted_executions/',
  'users/',
  'vehicle_images/',
];

function loadKey(keyPath) {
  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Key file not found: ${resolved}`);
  }
  return require(resolved);
}

// Зарим төсөлд bucket нэр: projectId.appspot.com. Default: projectId.firebasestorage.app
const BUCKET_SUFFIX = process.env.STORAGE_BUCKET_SUFFIX || 'firebasestorage.app';

function getBucketName(projectId) {
  return `${projectId}.${BUCKET_SUFFIX}`;
}

async function listAllFiles(bucket, prefix) {
  const [files] = await bucket.getFiles({ prefix });
  return (files || []).filter((f) => !f.name.endsWith('/'));
}

async function copyFile(sourceFile, targetBucket) {
  const [metadata] = await sourceFile.getMetadata().catch(() => [{}]);
  const contentType = (metadata && metadata.contentType) || 'application/octet-stream';
  const [contents] = await sourceFile.download();
  const targetFile = targetBucket.file(sourceFile.name);
  await targetFile.save(contents, {
    metadata: { contentType },
  });
}

async function run() {
  const args = process.argv.slice(2);
  const sourceKeyPath = args[0];
  const targetKeyPath = args[1];
  const customPrefixes = args.slice(2).filter(Boolean).map((p) => (p.endsWith('/') ? p : p + '/'));

  if (!sourceKeyPath || !targetKeyPath) {
    console.error('Usage: node scripts/migrate-tms-storage-buckets.js <SOURCE_KEY.json> <TARGET_KEY.json> [prefix1 prefix2 ...]');
    process.exit(1);
  }

  const sourceKey = loadKey(sourceKeyPath);
  const targetKey = loadKey(targetKeyPath);
  const sourceProjectId = sourceKey.project_id;
  const targetProjectId = targetKey.project_id;

  const sourceBucketName = getBucketName(sourceProjectId);
  const targetBucketName = getBucketName(targetProjectId);

  if (!admin.apps.some((a) => a.name === 'source')) {
    admin.initializeApp({ credential: admin.credential.cert(sourceKey) }, 'source');
  }
  if (!admin.apps.some((a) => a.name === 'target')) {
    admin.initializeApp({ credential: admin.credential.cert(targetKey) }, 'target');
  }

  const sourceBucket = admin.app('source').storage().bucket(sourceBucketName);
  const targetBucket = admin.app('target').storage().bucket(targetBucketName);

  const prefixes = customPrefixes.length > 0 ? customPrefixes : DEFAULT_PREFIXES;
  console.log('Source bucket:', sourceBucketName);
  console.log('Target bucket:', targetBucketName);
  console.log('Prefixes:', prefixes.join(', '));

  let total = 0;
  for (const prefix of prefixes) {
    console.log(`\nListing ${prefix}...`);
    let files;
    try {
      files = await listAllFiles(sourceBucket, prefix);
    } catch (err) {
      console.error(`  Error listing ${prefix}:`, err.message);
      continue;
    }
    console.log(`  Found ${files.length} files.`);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        await copyFile(f, targetBucket);
        total++;
        if ((total % 50) === 0) console.log(`  Copied ${total} files so far...`);
      } catch (err) {
        console.error(`  Failed ${f.name}:`, err.message);
      }
    }
  }

  console.log(`\nDone. Total files copied: ${total}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
