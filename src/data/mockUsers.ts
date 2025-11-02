export type PainPoint = {
  id: string;
  type: "rage-click" | "error" | "long dwell" | string;
  timestamp: string; // ISO string
  page: string;
  component: string;
};

export type UserContract = {
  version: string;
  rules: Array<{ key: string; value: unknown }>;
  thresholds: { [k: string]: number };
};

export type User = {
  id: string;
  name: string;
  email?: string;
  lastActive: string; // ISO string
  contractVersion: string;
  contract: UserContract;
  painPoints: PainPoint[];
};

export const mockUsers: User[] = [
  {
    id: "user1",
    name: "Alice Johnson",
    email: "alice.johnson@example.com",
    lastActive: "2025-10-25T15:30:00Z",
    contractVersion: "v1.2.3",
    contract: {
      version: "v1.2.3",
      rules: [
        { key: "featureA", value: true },
        { key: "maxRetries", value: 3 },
      ],
      thresholds: { rage_clicks: 5, long_dwell_ms: 15000 },
    },
    painPoints: [
      {
        id: "p1",
        type: "rage-click",
        timestamp: "2025-10-25T15:01:00Z",
        page: "Home",
        component: "ButtonA",
      },
      {
        id: "p2",
        type: "long dwell",
        timestamp: "2025-10-24T13:42:00Z",
        page: "Settings",
        component: "InputB",
      },
    ],
  },
  {
    id: "user2",
    name: "Bob Smith",
    email: "bob.smith@example.com",
    lastActive: "2025-10-26T09:15:00Z",
    contractVersion: "v1.3.0",
    contract: {
      version: "v1.3.0",
      rules: [{ key: "featureA", value: false }],
      thresholds: { rage_clicks: 3, long_dwell_ms: 12000 },
    },
    painPoints: [],
  },
  {
    id: "user3",
    name: "Charlie Rose",
    lastActive: "2025-10-23T18:22:00Z",
    contractVersion: "v1.1.0",
    contract: {
      version: "v1.1.0",
      rules: [{ key: "betaFlag", value: true }],
      thresholds: { rage_clicks: 4, long_dwell_ms: 10000 },
    },
    painPoints: [
      {
        id: "p3",
        type: "error",
        timestamp: "2025-10-23T12:10:00Z",
        page: "Users",
        component: "TableRow",
      },
    ],
  },
];

export function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}