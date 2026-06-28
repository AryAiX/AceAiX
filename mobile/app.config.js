const appJson = require('./app.json');

function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

module.exports = () => {
  const expo = appJson.expo;

  return {
    expo: {
      ...expo,
      extra: {
        ...expo.extra,
        supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
        supabaseAnonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
      },
    },
  };
};
