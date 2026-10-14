import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';

export default function usePagination(endpoint, initialFilters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState(initialFilters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // DRF PageNumberPagination is 1-indexed
      params.append('page', page + 1);
      params.append('per_page', rowsPerPage);

      // Append all filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`${endpoint}?${params}`);
      
      if (response.data && response.data.results !== undefined) {
        setData(response.data.results);
        setTotalCount(response.data.count);
      } else if (Array.isArray(response.data)) {
        setData(response.data);
        setTotalCount(response.data.length);
      } else {
        // Fallback for non-paginated endpoints that return an object instead of array
        setData([]);
        setTotalCount(0);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to load ${endpoint}.`));
      console.error(`Failed to fetch ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, rowsPerPage, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const applyFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const applyMultipleFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
  };

  return {
    data,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    filters,
    handlePageChange,
    handleRowsPerPageChange,
    applyFilter,
    applyMultipleFilters,
    refresh: fetchData
  };
}
