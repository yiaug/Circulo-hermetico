export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType | string, path: string | null = null) {
  const authState = {
    userId: undefined,
    email: undefined,
    emailVerified: undefined,
    isAnonymous: undefined,
    tenantId: undefined,
    providerInfo: []
  };

  const errorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: authState
  };

  if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
    console.error(JSON.stringify(errorInfo));
    throw new Error(JSON.stringify(errorInfo));
  } else {
    console.error(`Firestore ${operationType} Error at ${path}:`, error);
  }
}
