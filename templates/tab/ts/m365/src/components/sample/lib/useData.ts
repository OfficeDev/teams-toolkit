import { useEffect, useReducer } from "react";

type State<T> = {
  data?: T;
  loading: boolean;
  error?: any;
};

type Action<T> =
  | { type: "loading" }
  | { type: "result"; result: T }
  | { type: "error"; error: any };

const createReducer =
  <T>() =>
  (state: State<T>, action: Action<T>): State<T> => {
    switch (action.type) {
      case "loading":
        return { data: state.data, loading: true };
      case "result":
        return { data: action.result, loading: false };
      case "error":
        return { loading: false, error: action.error };
    }
  };

export function useData<T>(asyncFn: () => Promise<T>, options?: { auto: boolean }) {
  const { auto } = { auto: true, ...options };
  const [{ data, loading, error }, dispatch] = useReducer(createReducer<T>(), {
    loading: !!auto,
  });
  function reload() {
    if (!loading) dispatch({ type: "loading" });
    if (typeof asyncFn != "function") {
      throw new Error("invalid argument to useData, a function is required");
    }
    asyncFn()
      .then((data) => dispatch({ type: "result", result: data }))
      .catch((error) => dispatch({ type: "error", error }));
  }
  useEffect(() => {
    if (auto) reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, error, reload };
}
