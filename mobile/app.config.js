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
  };
};
