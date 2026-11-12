/**
 * High-fidelity in-memory Convex database and storage execution context
 * for unit and integration testing of actual Convex server handlers.
 */

export interface MockConvexDatabase {
  tables: Map<string, Map<string, any>>;
  storage: Map<string, { url: string; data?: ArrayBuffer }>;
  idCounter: number;
}

export function createMockConvexContext() {
  const dbState: MockConvexDatabase = {
    tables: new Map(),
    storage: new Map(),
    idCounter: 1000,
  };

  function getTable(table: string): Map<string, any> {
    if (!dbState.tables.has(table)) {
      dbState.tables.set(table, new Map());
    }
    return dbState.tables.get(table)!;
  }

  const db = {
    async insert(table: string, doc: any) {
      dbState.idCounter++;
      const id = `${table}_id_${dbState.idCounter}` as any;
      const record = {
        _id: id,
        _creationTime: Date.now(),
        ...JSON.parse(JSON.stringify(doc)),
      };
      getTable(table).set(id, record);
      return id;
    },

    async get(id: string) {
      if (!id) return null;
      for (const tableMap of dbState.tables.values()) {
        if (tableMap.has(id)) {
          return JSON.parse(JSON.stringify(tableMap.get(id)));
        }
      }
      return null;
    },

    async patch(id: string, patchDoc: any) {
      for (const tableMap of dbState.tables.values()) {
        if (tableMap.has(id)) {
          const current = tableMap.get(id);
          const updated = {
            ...current,
            ...JSON.parse(JSON.stringify(patchDoc)),
            _id: id,
            _creationTime: current._creationTime,
          };
          tableMap.set(id, updated);
          return;
        }
      }
      throw new Error(`Record with id ${id} not found to patch.`);
    },

    async replace(id: string, newDoc: any) {
      for (const tableMap of dbState.tables.values()) {
        if (tableMap.has(id)) {
          const current = tableMap.get(id);
          const replaced = {
            ...JSON.parse(JSON.stringify(newDoc)),
            _id: id,
            _creationTime: current._creationTime,
          };
          tableMap.set(id, replaced);
          return;
        }
      }
      throw new Error(`Record with id ${id} not found to replace.`);
    },

    async delete(id: string) {
      for (const tableMap of dbState.tables.values()) {
        if (tableMap.has(id)) {
          tableMap.delete(id);
          return;
        }
      }
    },

    query(table: string) {
      const records = Array.from(getTable(table).values()).map((r) =>
        JSON.parse(JSON.stringify(r))
      );

      let filtered = [...records];

      const queryBuilder = {
        withIndex(indexName: string, indexFilterFn?: (q: any) => any) {
          if (indexFilterFn) {
            const criteria: { field: string; value: any }[] = [];
            const indexQ = {
              eq(field: string, value: any) {
                criteria.push({ field, value });
                return indexQ;
              },
            };
            indexFilterFn(indexQ);

            filtered = filtered.filter((doc) => {
              for (const { field, value } of criteria) {
                if (doc[field] !== value) return false;
              }
              return true;
            });
          }
          return queryBuilder;
        },

        filter(predicateFn: (q: any) => any) {
          const filterQ = {
            eq(left: any, right: any) {
              const valLeft = typeof left === 'function' ? left() : left;
              const valRight = typeof right === 'function' ? right() : right;
              return valLeft === valRight;
            },
            field(name: string) {
              return (doc: any) => doc[name];
            },
          };

          filtered = filtered.filter((doc) => {
            const contextQ = {
              eq(left: any, right: any) {
                const getVal = (v: any) => {
                  if (typeof v === 'function') return v(doc);
                  return v;
                };
                return getVal(left) === getVal(right);
              },
              field(name: string) {
                return (targetDoc: any) => targetDoc[name];
              },
            };
            try {
              return Boolean(predicateFn(contextQ));
            } catch {
              return false;
            }
          });
          return queryBuilder;
        },

        order(direction: 'asc' | 'desc') {
          return queryBuilder;
        },

        async first() {
          return filtered[0] || null;
        },

        async collect() {
          return [...filtered];
        },

        async take(n: number) {
          return filtered.slice(0, n);
        },
      };

      return queryBuilder;
    },
  };

  const storage = {
    async getUrl(storageId: string) {
      if (!storageId) return null;
      if (dbState.storage.has(storageId)) {
        return dbState.storage.get(storageId)!.url;
      }
      return `https://files.convex.cloud/${storageId}`;
    },

    async delete(storageId: string) {
      dbState.storage.delete(storageId);
    },

    registerStorage(storageId: string, url?: string) {
      dbState.storage.set(storageId, {
        url: url || `https://files.convex.cloud/${storageId}`,
      });
    },
  };

  return {
    ctx: {
      db: db as any,
      storage: storage as any,
    },
    dbState,
    storageHelper: storage,
  };
}

