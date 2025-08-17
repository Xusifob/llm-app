import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import useApiQuery from './useApiQuery';
import useApi from './useApi';

interface UseApiCollectionOptions<T> {
  path: string;
  getId: (item: T) => string | number;
  enabled?: boolean;
  transform?: (data: any) => T[];
}

interface UpdateArgs<T> {
  id: string | number;
  data: Partial<T>;
}

const useApiCollection = <T>(
    key: QueryKey,
    { path, getId, enabled = true, transform }: UseApiCollectionOptions<T>,
) => {
  const apiFetch = useApi();
  const queryClient = useQueryClient();
  const query = useApiQuery<T[]>(key, { path, enabled, transform });

  const addMutation = useMutation({
    mutationFn: async (item: Partial<T>) => {
      const res = await apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error('Failed to add item');
      return res.json();
    },
    onSuccess: (newItem: T) => {
      queryClient.setQueryData<T[]>(key, (old = []) => [...old, newItem]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: UpdateArgs<T>) => {
      const res = await apiFetch(`${path}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update item');
      return res.json();
    },
    onSuccess: (updatedItem: T) => {
      queryClient.setQueryData<T[]>(key, (old = []) =>
          old.map((item) => (getId(item) === getId(updatedItem) ? updatedItem : item)),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiFetch(`${path}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove item');
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<T[]>(key, (old = []) =>
          old.filter((item) => getId(item) !== id),
      );
    },
  });

  return {
    ...query,
    addItem: addMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    removeItem: removeMutation.mutateAsync,
    adding: addMutation.isPending,
    updating: updateMutation.isPending,
    removing: removeMutation.isPending,
  };
};

export default useApiCollection;
