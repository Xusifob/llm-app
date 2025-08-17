import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import useApiQuery from './useApiQuery';
import useApi from './useApi';

interface Entity {
  id: string | number;
}

interface UseApiCollectionOptions<T extends Entity> {
  path: string;
  getId?: (item: T) => string | number;
  enabled?: boolean;
  transform?: (data: any) => T[];
}

interface UpdateArgs<T> {
  id: string | number;
  data: Partial<T>;
}

const useApiCollection = <T extends Entity>(
    key: QueryKey,
    { path, getId : getIdProps, enabled = true, transform }: UseApiCollectionOptions<T>,
) => {

  const getId = getIdProps ? getIdProps : (item: T) => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return (item as Entity).id;
    }
    throw new Error('Item does not have an id property');
  }

  const apiFetch = useApi();
  const queryClient = useQueryClient();
  const query = useApiQuery<T[]>(key, { path, enabled, transform });

  const updateCollection = (item: T, removeItem ?: boolean) => {
    const id = getId(item);
    queryClient.setQueryData<T[]>(key, (old = []) => {
      const index = old.findIndex((i) => getId(i) === id);

      if(removeItem) {
        if (index === -1) {
          return old;
        } else {
          return old.filter((i) => getId(i) !== id);
        }
      }

      if (index === -1) {
        return [...old, item];
      } else {
        return old.map((i) => (getId(i) === id ? item : i));
      }
    });
  };

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
      updateCollection(newItem);
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
      updateCollection(updatedItem);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiFetch(`${path}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove item');
      return id;
    },
    onSuccess: (id) => {
        updateCollection({id} as T, true); // Pass empty object to trigger removal
        queryClient.invalidateQueries({ queryKey: key }); // Invalidate the query to refetch if needed
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
    updateCollection,
    loading: addMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
};

export default useApiCollection;
