/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prepares the freshly generated Capacitor Android project for a signed
 * release build. Run AFTER `cap add android` + `cap sync android`:
 *
 *   node scripts/prepare-android.mjs
 *
 * Steps:
 *   1. Generates launcher icons for all densities (legacy + adaptive layers)
 *      from the vector sources in assets/ (via sharp).
 *   2. Sets versionCode (from env VERSION_CODE) and versionName (package.json).
 *   3. Injects a release signing config into android/app/build.gradle:
 *        - keystore from secrets (KEYSTORE_BASE64/…) when provided,
 *        - otherwise generates a temporary key for this build.
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const androidDir = join(root, 'android');
const resDir = join(androidDir, 'app', 'src', 'main', 'res');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const versionName = pkg.version || '1.0.0';
const versionCode = process.env.VERSION_CODE || '1';

// ---------------------------------------------------------------------------
// 1) Launcher icons (legacy square/round + adaptive background/foreground)
// ---------------------------------------------------------------------------
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const iconSvg = readFileSync(join(root, 'assets', 'icon.svg'));
const iconBgSvg = readFileSync(join(root, 'assets', 'icon-bg.svg'));
const iconFgSvg = readFileSync(join(root, 'assets', 'icon-fg.svg'));

for (const [density, scale] of Object.entries(densities)) {
  const dir = join(resDir, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  const launcher = Math.round(48 * scale);   // legacy launcher icons (48dp base)
  const adaptive = Math.round(108 * scale);  // adaptive icon layers (108dp base)
  await sharp(iconSvg).resize(launcher, launcher).png().toFile(join(dir, 'ic_launcher.png'));
  await sharp(iconSvg).resize(launcher, launcher).png().toFile(join(dir, 'ic_launcher_round.png'));
  await sharp(iconBgSvg).resize(adaptive, adaptive).png().toFile(join(dir, 'ic_launcher_background.png'));
  await sharp(iconFgSvg).resize(adaptive, adaptive).png().toFile(join(dir, 'ic_launcher_foreground.png'));
}
console.log(`[android] launcher icons generated (5 densities, adaptive + legacy)`);

// ---------------------------------------------------------------------------
// 2) Keystore: use repository secrets when available, else generate one
// ---------------------------------------------------------------------------
const keystorePath = join(androidDir, 'release.keystore');
let storePassword = process.env.KEYSTORE_PASSWORD || '';
let keyAlias = process.env.KEY_ALIAS || 'axiomjury';
let keyPassword = process.env.KEY_PASSWORD || storePassword;
let usingSecrets = false;

if (process.env.KEYSTORE_BASE64 && process.env.KEYSTORE_BASE64.trim()) {
  writeFileSync(keystorePath, Buffer.from(process.env.KEYSTORE_BASE64.replace(/\s+/g, ''), 'base64'));
  usingSecrets = true;
  console.log('[android] signing with keystore from repository secrets');
} else {
  if (!storePassword) storePassword = 'AxiomJury-' + Math.random().toString(36).slice(2, 12);
  keyPassword = keyPassword || storePassword;
  execFileSync('keytool', [
    '-genkeypair', '-v',
    '-keystore', keystorePath,
    '-storepass', storePassword,
    '-keypass', keyPassword,
    '-alias', keyAlias,
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-dname', 'CN=Axiom Jury, OU=Axiom Jury, O=SaliScience, C=IR',
  ], { stdio: 'pipe' });
  console.log('[android] no signing secrets found - generated a TEMPORARY keystore for this build');
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(summary, [
      '## 🔐 امضای پایدار اندروید (Stable Android Signing)',
      '',
      'برای این بیلد یک کلید امضای **موقتی** ساخته شد؛ نصب نسخه بعدی مستلزم حذف این نسخه است.',
      'برای امضای پایدار، یک keystore بسازید و به‌عنوان Secret ذخیره کنید:',
      '',
      '```bash',
      'keytool -genkeypair -v -keystore axiomjury.keystore -alias axiomjury \\',
      '  -keyalg RSA -keysize 2048 -validity 10000',
      'base64 -w0 axiomjury.keystore   # خروجی را کپی کنید',
      '```',
      '',
      'سپس در Settings → Secrets and variables → Actions این چهار Secret را اضافه کنید:',
      '',
      '| Secret | مقدار |',
      '|---|---|',
      '| `ANDROID_KEYSTORE_BASE64` | خروجی base64 بالا |',
      '| `ANDROID_KEYSTORE_PASSWORD` | رمز keystore |',
      '| `ANDROID_KEY_ALIAS` | axiomjury |',
      '| `ANDROID_KEY_PASSWORD` | رمز کلید |',
      '',
    ].join('\n'));
  }
}

writeFileSync(join(androidDir, 'keystore.properties'), [
  `storeFile=${'release.keystore'}`,
  `storePassword=${storePassword}`,
  `keyAlias=${keyAlias}`,
  `keyPassword=${keyPassword}`,
  '',
].join('\n'));

// ---------------------------------------------------------------------------
// 3) Patch android/app/build.gradle: version + release signing config
// ---------------------------------------------------------------------------
const gradlePath = join(androidDir, 'app', 'build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');

const versionCodeRe = /versionCode(\s*=\s*|\s+)\d+/;
if (!versionCodeRe.test(gradle)) throw new Error('prepare-android: versionCode not found in app/build.gradle');
gradle = gradle.replace(versionCodeRe, (m, gap) => `versionCode${gap}${versionCode}`);

const versionNameRe = /versionName(\s*=\s*|\s+)["'][^"']*["']/;
if (!versionNameRe.test(gradle)) throw new Error('prepare-android: versionName not found in app/build.gradle');
gradle = gradle.replace(versionNameRe, (m, gap) => `versionName${gap}"${versionName}"`);

const buildTypesRe = /buildTypes\s*{\s*\n\s*release\s*{/;
if (!buildTypesRe.test(gradle)) throw new Error('prepare-android: release buildType not found in app/build.gradle');
gradle = gradle.replace(buildTypesRe, () => [
  'signingConfigs {',
  '        release {',
  '            if (keystorePropertiesFile.exists()) {',
  "                storeFile rootProject.file(keystoreProperties['storeFile'])",
  "                storePassword keystoreProperties['storePassword']",
  "                keyAlias keystoreProperties['keyAlias']",
  "                keyPassword keystoreProperties['keyPassword']",
  '            }',
  '        }',
  '    }',
  '    buildTypes {',
  '        release {',
  '            signingConfig signingConfigs.release',
].join('\n'));

const propertiesPrelude = [
  'def keystoreProperties = new Properties()',
  'def keystorePropertiesFile = rootProject.file("keystore.properties")',
  'if (keystorePropertiesFile.exists()) {',
  '    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }',
  '}',
  '',
  '',
].join('\n');
gradle = propertiesPrelude + gradle;

writeFileSync(gradlePath, gradle);
console.log(`[android] build.gradle patched (versionCode=${versionCode}, versionName=${versionName}, signing=${usingSecrets ? 'secrets' : 'temporary key'})`);
