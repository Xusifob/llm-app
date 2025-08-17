import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import useApi from './useApi';

interface ApiQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  path: string;
  transform?: (data: any) => T;
  init?: RequestInit;
}

const useApiQuery = <T = unknown>(
  key: QueryKey,
  { path, transform, init, ...options }: ApiQueryOptions<T>,
) => {
  const apiFetch = useApi();

  return useQuery<T>(
    key,
    async () => {
      const res = await apiFetch(path, init);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return transform ? transform(data) : data;
    },
    options,
  );
};

export default useApiQuery;
