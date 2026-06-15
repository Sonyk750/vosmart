"use client";
import { useEffect, useRef, useState } from "react";

export type AnafCompanyData = {
  denumire: string;
  adresa: string;
  telefon: string;
  oras: string;
  strada: string;
};

export type CuiLookupStatus = "idle" | "loading" | "found" | "notfound" | "error";

export function useCuiAutofill(cui: string, onFound: (data: AnafCompanyData) => void): CuiLookupStatus {
  const [status, setStatus] = useState<CuiLookupStatus>("idle");
  const onFoundRef = useRef(onFound);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

  useEffect(() => {
    const digits = cui.replace(/\D/g, "");
    if (digits.length < 2 || digits.length > 10) return;

    let active = true;
    const timeout = setTimeout(() => {
      setStatus("loading");
      fetch(`/api/anaf/lookup?cui=${digits}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          if (data.found) {
            setStatus("found");
            onFoundRef.current(data);
          } else {
            setStatus("notfound");
          }
        })
        .catch(() => {
          if (active) setStatus("error");
        });
    }, 600);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [cui]);

  return status;
}
