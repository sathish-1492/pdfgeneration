// utils/responseFormatter.js
function toLowerCaseKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => toLowerCaseKeys(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      // Check for timestamp fields and leave them as they are
      const lowerKey = key.toLowerCase();
      if (key === 'CREATED_TIME' || key === 'UPDATED_TIME' || key === 'PAYMENT_DATE' || key === 'NEXT_PAYMENT_DATE') {
        acc[lowerKey] = obj[key];
      } else {
        acc[lowerKey] = toLowerCaseKeys(obj[key]);
      }

      return acc;
    }, {});
  }
  return obj;
}

module.exports = toLowerCaseKeys;