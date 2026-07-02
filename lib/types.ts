export type FlagView = { id: number; code: string; name: string; content: string };

export type AllianceRefView = {
  id: string;
  name: string;
  label: string;
  deleted: boolean;
};

export type ServerView = {
  id: number;
  online: boolean;
  closed: boolean;
  cold: boolean;
  season: number;
  segment: {
    id: number;
    season: number;
    name: string;
    cluster: { id: number; name: string; description: string } | null;
  } | null;
  openDate: string | null;
  offlineDate: string | null;
  king: number | null;
};

export type CharacterView = {
  id: number;
  nickname: string;
  serverId: number;
  server?: ServerView;
  power: string;
  maxPower: string;
  level: number;
  active: boolean;
  flag: FlagView | null;
  gender: number;
  alliance: AllianceRefView | null;
  lastOnline: string | null;
  deleted: boolean;
  pvpDamage: string;
  pvpRate: number;
  avatar: string | null;
  allianceRank?: number | null;
  allianceRankName?: string | null;
  blacklisted?: boolean;
  blacklistReason?: string | null;
  lastOnlineDays: number;
  refreshedAt?: string | null;
  alias?: string; // matched former nickname (search by old names)
};

export type AllianceView = {
  id: string;
  name: string;
  label: string;
  serverId: number;
  server?: ServerView;
  power: string;
  members: number;
  maxMembers: number;
  description?: string | null;
  logoImage?: string | null;
  techLevel?: number;
  kvkWins?: number;
  hostile?: boolean;
  hostileReason?: string | null;
  hasBlacklisted?: boolean;
  deleted: boolean;
  refreshedAt?: string | null;
};

export type HostileTag = { id: string; label: string; name: string };

export type ClusterView = { id: number; name: string; description: string };
