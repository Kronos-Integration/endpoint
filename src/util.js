export function definePropertiesFromOptions(object, options, keys) {
  Object.defineProperties(
    object,
    keys.reduce((a, key) => {
      if (options[key] !== undefined) {
        a[key] = { value: options[key] };
      }
      return a;
    }, {})
  );
}
