export type PersistedAppCheckToken = {
  token: string;
  expireTimeMillis: number;
  updatedAtMillis: number;
};

export declare function idbGetAppCheckToken(key: string): Promise<PersistedAppCheckToken | undefined>;
export declare function idbSetAppCheckToken(key: string, value: PersistedAppCheckToken): Promise<void>;
export declare function idbRemoveAppCheckToken(key: string): Promise<void>;
