import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";

const QueryContext = createContext(undefined);

export function QueryProvider({ children }) {
  const [queries, setQueries] = useState([]);
  const { isAuthenticated } = useAuth();

  const fetchQueries = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/queries', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Maps Mongoose queryId (or _id fallback) to id for the frontend
        setQueries(data.map(q => ({...q, id: q.queryId || q._id})));
      }
    } catch (err) {
      console.error('Failed to fetch queries', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const addQuery = useCallback(async (data, attachments) => {
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...data, attachments })
      });
      if (res.ok) {
        await fetchQueries();
        const newQ = await res.json();
        return newQ.queryId || newQ._id;
      }
    } catch (err) {
      console.error(err);
    }
  }, [fetchQueries]);

  const getQuery = useCallback((id) => queries.find((q) => q.id === id), [queries]);

  const addComment = useCallback(async (queryId, user, content) => {
    try {
      const res = await fetch(`/api/queries/${queryId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            newActivity: {
                type: 'comment',
                content
            }
        })
      });
      if (res.ok) {
        await fetchQueries();
      }
    } catch(err) {
      console.error(err);
    }
  }, [fetchQueries]);

  const updateQueryStatus = useCallback(async (id, status) => {
    try {
      const res = await fetch(`/api/queries/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            status,
            newActivity: {
                type: 'status_change',
                content: `Status updated to ${status}`
            }
        })
      });
      if (res.ok) {
        await fetchQueries();
      }
    } catch (err) {
      console.error(err);
    }
  }, [fetchQueries]);

  const deleteQuery = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/queries/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        await fetchQueries();
      }
    } catch (err) {
      console.error(err);
    }
  }, [fetchQueries]);

  return (
    <QueryContext.Provider value={{ queries, addQuery, getQuery, fetchQueries, addComment, updateQueryStatus, deleteQuery }}>
      {children}
    </QueryContext.Provider>
  );
}

export function useQueries() {
  const context = useContext(QueryContext);
  if (!context) throw new Error("useQueries must be used within QueryProvider");
  return context;
}
