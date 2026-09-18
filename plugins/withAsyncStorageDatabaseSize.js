const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withAsyncStorageDatabaseSize(config) {
  return withGradleProperties(config, config => {
    const existing = config.modResults.find(item => item.type === "property" && item.key === "AsyncStorage_db_size_in_MB");
    if (existing) existing.value = "50";
    else config.modResults.push({ type: "property", key: "AsyncStorage_db_size_in_MB", value: "50" });
    return config;
  });
};
