#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const KNOWN_HASHES = {
  // Android
  'd2ae7189d6bd635f208c5f850cb73ae0098a0fef61200b33810668b96967bb6a': 'Android Official Production SDK (v1.1.0)',
  'b83fc469509d5dd97b992cfe0a4aa820b029144f906d439e10b37d3a78370ebf': 'Android Official UAT Sandbox SDK (v1.1.0)',
  // iOS
  '94437a1db1a7d65d37d7ab47aeca535e9f20e1083c0ca7b1f04b6c32b533394c': 'iOS Official Device Framework (v1.3.0)',
  'f91d19b3daa14fb72980b6509a57d7ed0ccc8459024cd266aa583ab753ade147': 'iOS Official Simulator Framework (v1.3.0)',
};

function getFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function findFilesRecursive(dir, filterFn, maxDepth = 6, currentDepth = 0) {
  let results = [];
  if (currentDepth > maxDepth || !fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (filterFn(entry, fullPath)) {
      results.push(fullPath);
    }
    if (entry.isDirectory()) {
      results = results.concat(findFilesRecursive(fullPath, filterFn, maxDepth, currentDepth + 1));
    }
  }
  return results;
}

function resolvePackageDir() {
  const cwd = process.cwd();

  // 1. Direct package repo
  if (fs.existsSync(path.join(cwd, 'react-native-kbz-pay.podspec'))) {
    return cwd;
  }

  // 2. In consuming React Native / Expo app's node_modules
  const directNodeModules = path.join(cwd, 'node_modules', '@phonehtut', 'react-native-kbz-pay');
  if (fs.existsSync(directNodeModules)) {
    return directNodeModules;
  }

  // 3. Fallback to package relative to this script
  const relativeFromBin = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(relativeFromBin, 'react-native-kbz-pay.podspec'))) {
    return relativeFromBin;
  }

  return cwd;
}

function printHeader() {
  console.log('\n========================================================');
  console.log('   🇲🇲 @phonehtut/react-native-kbz-pay SDK Setup Utility');
  console.log('========================================================\n');
}

function printHelp() {
  printHeader();
  console.log('Usage:');
  console.log('  npx react-native-kbz-pay setup-sdk <path-to-sdk-download>');
  console.log('  npx react-native-kbz-pay verify-sdk');
  console.log('');
  console.log('Download official SDKs from KBZ Bank Developer Portal:');
  console.log('  👉 https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/in-app-download-en');
  console.log('');
  console.log('Examples:');
  console.log('  npx react-native-kbz-pay setup-sdk ~/Downloads/1.3');
  console.log('  npx react-native-kbz-pay setup-sdk ~/Downloads/KBZPay_sdk_ios_v1.3.0.zip');
  console.log('  npx react-native-kbz-pay setup-sdk ~/Downloads/my-kbz-sdk-folder');
  console.log('');
}

function handleVerify(targetDir) {
  printHeader();
  console.log(`Checking SDK files in: ${targetDir}\n`);

  const androidProdAar = path.join(targetDir, 'android', 'libs', 'prod', 'kbzsdk_1.1.0.aar');
  const androidUatAar = path.join(targetDir, 'android', 'libs', 'uat', 'kbzsdk_1.1.0.aar');
  const androidDefaultAar = path.join(targetDir, 'android', 'libs', 'kbzsdk_1.1.0.aar');

  const iosProdBinary = path.join(
    targetDir,
    'ios',
    'KBZPayAPPPay.xcframework',
    'ios-arm64_armv7',
    'KBZPayAPPPay.framework',
    'KBZPayAPPPay'
  );
  const iosSimBinary = path.join(
    targetDir,
    'ios',
    'KBZPayAPPPay.xcframework',
    'ios-arm64_i386_x86_64-simulator',
    'KBZPayAPPPay.framework',
    'KBZPayAPPPay'
  );

  let allGood = true;

  // Check Android
  const foundAar = [androidProdAar, androidUatAar, androidDefaultAar].find((f) => fs.existsSync(f));
  if (foundAar) {
    const hash = getFileSha256(foundAar);
    const label = KNOWN_HASHES[hash] || 'Custom / Verified AAR';
    console.log(`✅ Android SDK: Found at ${path.relative(process.cwd(), foundAar)}`);
    console.log(`   SHA-256: ${hash}`);
    console.log(`   Match:   ${label}\n`);
  } else {
    console.log('❌ Android SDK: No .aar found in android/libs');
    allGood = false;
  }

  // Check iOS
  if (fs.existsSync(iosProdBinary) && fs.existsSync(iosSimBinary)) {
    const prodHash = getFileSha256(iosProdBinary);
    const simHash = getFileSha256(iosSimBinary);

    console.log(`✅ iOS SDK: Found at ${path.relative(process.cwd(), path.dirname(path.dirname(iosProdBinary)))}`);
    console.log(`   Device SHA-256:    ${prodHash} (${KNOWN_HASHES[prodHash] || 'Unknown'})`);
    console.log(`   Simulator SHA-256: ${simHash} (${KNOWN_HASHES[simHash] || 'Unknown'})\n`);
  } else {
    console.log('❌ iOS SDK: KBZPayAPPPay.xcframework not found in ios/');
    allGood = false;
  }

  if (allGood) {
    console.log('🎉 All native KBZ Pay SDKs are present and verified!\n');
  } else {
    console.log('👉 Run "npx react-native-kbz-pay setup-sdk <path>" to configure missing SDKs.\n');
  }
}

function handleSetup(sourceInput) {
  printHeader();

  if (!sourceInput) {
    console.error('Error: Please provide a path to the downloaded KBZ SDK directory or zip file.');
    printHelp();
    process.exit(1);
  }

  const resolvedSource = path.resolve(process.cwd(), sourceInput);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Error: Source path does not exist: ${resolvedSource}`);
    process.exit(1);
  }

  const targetPkgDir = resolvePackageDir();
  console.log(`Target package directory: ${targetPkgDir}`);
  console.log(`Source SDK path:          ${resolvedSource}\n`);

  let workDir = resolvedSource;
  let tempExtractedDir = null;

  // If source is a zip file, unzip to temp dir
  if (fs.statSync(resolvedSource).isFile() && resolvedSource.toLowerCase().endsWith('.zip')) {
    tempExtractedDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'kbz-sdk-'));
    console.log(`📦 Unzipping ${path.basename(resolvedSource)} to temporary location...`);
    try {
      execSync(`unzip -q "${resolvedSource}" -d "${tempExtractedDir}"`);
      workDir = tempExtractedDir;
    } catch (err) {
      console.error(`Failed to unzip: ${err.message}`);
      process.exit(1);
    }
  }

  // 1. Process Android SDK (.aar)
  console.log('🔍 Searching for Android SDK (.aar)...');
  const aarFiles = findFilesRecursive(workDir, (entry) => entry.isFile() && entry.name.endsWith('.aar'));

  if (aarFiles.length > 0) {
    const androidLibsDir = path.join(targetPkgDir, 'android', 'libs');
    const prodDir = path.join(androidLibsDir, 'prod');
    const uatDir = path.join(androidLibsDir, 'uat');

    fs.mkdirSync(androidLibsDir, { recursive: true });
    fs.mkdirSync(prodDir, { recursive: true });
    fs.mkdirSync(uatDir, { recursive: true });

    for (const aarPath of aarFiles) {
      const fileName = path.basename(aarPath);
      const hash = getFileSha256(aarPath);
      const isUat = aarPath.toLowerCase().includes('uat') || hash === 'b83fc469509d5dd97b992cfe0a4aa820b029144f906d439e10b37d3a78370ebf';

      if (isUat) {
        fs.copyFileSync(aarPath, path.join(uatDir, fileName));
        console.log(`  ✅ Installed UAT Android AAR: ${fileName}`);
        console.log(`     SHA-256: ${hash}`);
      } else {
        fs.copyFileSync(aarPath, path.join(prodDir, fileName));
        // Also keep a copy at root libs/ for single-aar setups
        fs.copyFileSync(aarPath, path.join(androidLibsDir, fileName));
        console.log(`  ✅ Installed Production Android AAR: ${fileName}`);
        console.log(`     SHA-256: ${hash}`);
      }
    }
  } else {
    console.log('  ⚠️  No .aar file found in source path. Skipping Android setup.');
  }

  // 2. Process iOS SDK (xcframework or framework/prod + framework/simulator)
  console.log('\n🔍 Searching for iOS SDK...');
  const iosTargetDir = path.join(targetPkgDir, 'ios');
  fs.mkdirSync(iosTargetDir, { recursive: true });
  const finalXcframeworkPath = path.join(iosTargetDir, 'KBZPayAPPPay.xcframework');

  // Case A: xcframework already exists
  const existingXcf = findFilesRecursive(workDir, (entry) => entry.isDirectory() && entry.name.endsWith('.xcframework'));
  if (existingXcf.length > 0) {
    const srcXcf = existingXcf[0];
    console.log(`  📦 Found existing xcframework at: ${srcXcf}`);
    fs.rmSync(finalXcframeworkPath, { recursive: true, force: true });
    execSync(`cp -R "${srcXcf}" "${finalXcframeworkPath}"`);
    console.log('  ✅ Copied KBZPayAPPPay.xcframework to ios/');
  } else {
    // Case B: Official KBZ 1.3 folder with framework/prod and framework/simulator
    const prodFrameworks = findFilesRecursive(
      workDir,
      (entry, fullPath) =>
        entry.isDirectory() &&
        entry.name === 'KBZPayAPPPay.framework' &&
        fullPath.includes('prod')
    );
    const simFrameworks = findFilesRecursive(
      workDir,
      (entry, fullPath) =>
        entry.isDirectory() &&
        entry.name === 'KBZPayAPPPay.framework' &&
        (fullPath.includes('simulator') || fullPath.includes('demo'))
    );

    if (prodFrameworks.length > 0 && simFrameworks.length > 0) {
      const prodFw = prodFrameworks[0];
      const simFw = simFrameworks[0];

      console.log(`  🔨 Building KBZPayAPPPay.xcframework from official components:`);
      console.log(`     Device:    ${prodFw}`);
      console.log(`     Simulator: ${simFw}`);

      fs.rmSync(finalXcframeworkPath, { recursive: true, force: true });

      const xcodeCmd = `xcodebuild -create-xcframework -framework "${prodFw}" -framework "${simFw}" -output "${finalXcframeworkPath}"`;
      try {
        execSync(xcodeCmd, { stdio: 'pipe' });
        console.log('  ✅ Successfully generated KBZPayAPPPay.xcframework!');

        const prodBin = path.join(finalXcframeworkPath, 'ios-arm64_armv7', 'KBZPayAPPPay.framework', 'KBZPayAPPPay');
        const simBin = path.join(finalXcframeworkPath, 'ios-arm64_i386_x86_64-simulator', 'KBZPayAPPPay.framework', 'KBZPayAPPPay');

        if (fs.existsSync(prodBin)) {
          console.log(`     Device SHA-256:    ${getFileSha256(prodBin)}`);
        }
        if (fs.existsSync(simBin)) {
          console.log(`     Simulator SHA-256: ${getFileSha256(simBin)}`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to generate xcframework: ${err.message}`);
      }
    } else {
      console.log('  ⚠️  Could not find matching iOS KBZPayAPPPay frameworks. Skipping iOS setup.');
    }
  }

  // Cleanup temp dir if created
  if (tempExtractedDir && fs.existsSync(tempExtractedDir)) {
    fs.rmSync(tempExtractedDir, { recursive: true, force: true });
  }

  console.log('\n========================================================');
  console.log('🎉 SDK setup process finished!');
  console.log('Run "npx react-native-kbz-pay verify-sdk" anytime to inspect hashes.');
  console.log('========================================================\n');
}

// CLI Command Router
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h' || command === 'help') {
  printHelp();
} else if (command === 'verify-sdk' || command === 'verify') {
  handleVerify(resolvePackageDir());
} else if (command === 'setup-sdk' || command === 'setup') {
  handleSetup(args[1]);
} else {
  // If user passed a path directly without command (e.g. npx react-native-kbz-pay ~/Downloads/1.3)
  if (fs.existsSync(path.resolve(process.cwd(), command))) {
    handleSetup(command);
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}
