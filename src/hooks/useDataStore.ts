import { useState, useEffect, useCallback } from "react";

export interface DataRow {
  id: string;
  timestamp: string;
  [key: string]: string | number;
}

const STORAGE_KEY = "dataentry_rows";
const COLUMNS_KEY = "dataentry_columns";
const DEFAULT_COLUMNS = ["value1", "value2", "value3"];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadFromLocal(): { rows: DataRow[]; columns: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const cols = localStorage.getItem(COLUMNS_KEY);
    return {
      rows: raw ? JSON.parse(raw) : [],
      columns: cols ? JSON.parse(cols) : DEFAULT_COLUMNS,
    };
  } catch {
    return { rows: [], columns: DEFAULT_COLUMNS };
  }
}

function saveToLocal(rows: DataRow[], columns: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
}

export function useDataStore() {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const { rows: savedRows, columns: savedCols } = loadFromLocal();
    setRows(savedRows);
    setColumns(savedCols);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveToLocal(rows, columns);
    }
  }, [rows, columns, isLoaded]);

  const addRow = useCallback((values: Record<string, string | number>) => {
    const newRow: DataRow = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...values,
    };
    setRows((prev) => [...prev, newRow]);
    return newRow;
  }, []);

  const addRows = useCallback(
    (importedRows: Record<string, string | number>[]) => {
      const newRows: DataRow[] = importedRows.map((values) => ({
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...values,
      }));
      // Detect new columns from imported data
      const allKeys = new Set<string>(columns);
      newRows.forEach((r) => {
        Object.keys(r).forEach((k) => {
          if (k !== "id" && k !== "timestamp") allKeys.add(k);
        });
      });
      setColumns(Array.from(allKeys));
      setRows((prev) => [...prev, ...newRows]);
      return newRows;
    },
    [columns]
  );

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRows([]);
    setColumns(DEFAULT_COLUMNS);
  }, []);

  return { rows, columns, isLoaded, addRow, addRows, deleteRow, clearAll };
}
