function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    },
    plugins: [
      ...(config.plugins || []),
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.4",
          },
        },
      ],
      "@react-native-community/datetimepicker",
      "expo-sharing",
      "expo-status-bar",
    ],
  };
};
