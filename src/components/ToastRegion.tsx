import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

interface ToastContextValue {
  notify(message: string): void;
}

const ToastContext = createContext<ToastContextValue>({
  notify: () => undefined,
});

export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<number | null>(null);

  const notify = useCallback((nextMessage: string) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setMessage(nextMessage);
    timeoutRef.current = window.setTimeout(() => {
      setMessage("");
      timeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-atomic="true"
        aria-live="polite"
        className="toast-region"
        role="status"
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
