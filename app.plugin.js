const {
  withInfoPlist,
  withAndroidManifest,
  withGradleProperties,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const pkg = require('./package.json');

/**
 * Configure iOS Info.plist for KBZ Pay:
 * - Adds 'kbzpay' to LSApplicationQueriesSchemes so canOpenURL works
 * - Optionally registers custom urlScheme if passed in plugin options
 */
function withKbzPayIos(config, props = {}) {
  return withInfoPlist(config, (configWithMod) => {
    if (!configWithMod.modResults.LSApplicationQueriesSchemes) {
      configWithMod.modResults.LSApplicationQueriesSchemes = [];
    }
    const schemes = configWithMod.modResults.LSApplicationQueriesSchemes;
    if (!schemes.includes('kbzpay')) {
      schemes.push('kbzpay');
    }

    if (props.urlScheme) {
      if (!configWithMod.modResults.CFBundleURLTypes) {
        configWithMod.modResults.CFBundleURLTypes = [];
      }
      const existing = configWithMod.modResults.CFBundleURLTypes.some((type) =>
        type.CFBundleURLSchemes?.includes(props.urlScheme)
      );
      if (!existing) {
        configWithMod.modResults.CFBundleURLTypes.push({
          CFBundleURLSchemes: [props.urlScheme],
        });
      }
    }

    return configWithMod;
  });
}

/**
 * Configure Android AndroidManifest.xml for KBZ Pay:
 * - Adds package visibility queries for Android 11+ (API 30+)
 *   including both Production (com.kbzbank.kpaycustomer)
 *   and UAT (com.kbzbank.kpaycustomer.uat).
 */
function withKbzPayAndroid(config) {
  return withAndroidManifest(config, (configWithMod) => {
    const manifest = configWithMod.modResults.manifest;
    if (!manifest.queries) {
      manifest.queries = [];
    }

    const packages = [
      'com.kbzbank.kpaycustomer',
      'com.kbzbank.kpaycustomer.uat',
    ];

    packages.forEach((pkgName) => {
      const exists = manifest.queries.some(
        (q) => q.package && q.package.some((p) => p.$?.['android:name'] === pkgName)
      );
      if (!exists) {
        manifest.queries.push({
          package: [{ $: { 'android:name': pkgName } }],
        });
      }
    });

    return configWithMod;
  });
}

/**
 * Configure Android Gradle Properties:
 * Sets kbzpay_environment=uat or kbzpay_environment=prod
 * so Gradle automatically resolves the corresponding SDK AAR file.
 */
function withKbzPayGradleProps(config, props = {}) {
  const env = props.environment === 'uat' ? 'uat' : 'prod';
  return withGradleProperties(config, (configWithMod) => {
    configWithMod.modResults = configWithMod.modResults.filter(
      (item) => item.key !== 'kbzpay_environment'
    );
    configWithMod.modResults.push({
      type: 'property',
      key: 'kbzpay_environment',
      value: env,
    });
    return configWithMod;
  });
}

function withKbzPay(config, props = {}) {
  config = withKbzPayIos(config, props);
  config = withKbzPayAndroid(config);
  config = withKbzPayGradleProps(config, props);
  return config;
}

module.exports = createRunOncePlugin(withKbzPay, pkg.name, pkg.version);
