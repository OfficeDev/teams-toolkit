import { useEffect, useReducer } from "react";

export function useData(asyncFn, options) {
  const { auto } = { auto: true, ...options };
  const [{ data, loading, error }, dispatch] = useReducer(
    ({ data: oldData }, { type, data, error }) => {
      switch (type) {
        case "loading":
          return { data: oldData, loading: true, error: null };
        case "result":
          return { data, loading: false, error: null };
        case "error":
          return { data: null, loading: false, error };
        default:
          return {};
      }
    },
    { data: null, loading: !!auto, error: null }
  );
  function reload() {
    if (!loading) dispatch({ type: "loading" });
    if (typeof asyncFn != "function") {
      throw new Error("invalid argument to useData, a function is required");
    }
    asyncFn()
      .then((data) => dispatch({ type: "result", data }))
      .catch((error) => dispatch({ type: "error", error }));
  }
  useEffect(() => {
    if (auto) reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, error, reload };
}
