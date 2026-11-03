const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAdIdPermission(config) {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults.manifest;

        const permissions = androidManifest["uses-permission"] || [];

        const alreadyExists = permissions.some(
            (p) =>
                p.$?.["android:name"] === "com.google.android.gms.permission.AD_ID"
        );

        if (!alreadyExists) {
            permissions.push({
                $: { "android:name": "com.google.android.gms.permission.AD_ID" },
            });
        }

        androidManifest["uses-permission"] = permissions;
        return config;
    });
};