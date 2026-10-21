import { RoleId } from "@/data/champions";

export type RiotPlatformId =
  | "VN2"
  | "SG2"
  | "TW2"
  | "KR"
  | "JP1"
  | "NA1"
  | "EUW1";

export interface ParticipantStats {
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: string; // Data Dragon champion key e.g. "LeeSin", "Ahri"
  championName: string;
  champLevel: number;
  teamId: 100 | 200; // 100 = Blue, 200 = Red
  role: RoleId;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  largestKillingSpree?: number;
  largestMultiKill?: number;
  visionWardsBoughtInGame?: number;
  damageDealtToTurrets?: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  cs: number; // totalMinionsKilled + neutralMinionsKilled
  csPerMin: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  items: number[]; // 6 main items + 1 trinket
  summonerSpells: [string, string];
  primaryRune: string;
  killParticipation: number; // percentage 0..100
  damageShare: number; // percentage 0..100
  mvpScore: number;
}

export interface TeamSummary {
  teamId: 100 | 200;
  win: boolean;
  totalKills: number;
  totalGold: number;
  totalDamage: number;
  objectives: {
    baron: number;
    dragon: number;
    horde: number; // Void Grubs (Sâu Hư Không)
    riftHerald: number;
    tower: number;
    inhibitor: number;
  };
  participants: ParticipantStats[];
}

export interface NormalizedMatchData {
  matchId: string;
  platformId: RiotPlatformId;
  gameMode: string;
  queueName: string;
  gameDurationSeconds: number;
  gameStartTimestamp: number;
  gameVersion: string;
  blueTeam: TeamSummary;
  redTeam: TeamSummary;
  source: "RIOT_API" | "SAMPLE_DATA";
}

export interface LaneComparisonItem {
  role: RoleId;
  blueChampion: string;
  redChampion: string;
  winnerTeam: 100 | 200 | "EVEN";
  verdict: string;
}

export interface PlayerReviewItem {
  puuid?: string;
  teamId?: 100 | 200;
  playerName: string;
  championId?: string;
  champion: string;
  role: RoleId;
  win?: boolean;
  kdaText?: string;
  mvpScore?: number;
  grade: string; // S+, S, A, B, C
  summary?: string;
  strengths: string[];
  weaknesses: string[];
  actionableAdvice: string[];
}

export interface AiMatchAnalysisResult {
  overview: string;
  winConditionSummary: string;
  mvpPlayer: {
    name: string;
    champion: string;
    role: RoleId;
    reason: string;
  };
  svpPlayer: {
    name: string;
    champion: string;
    role: RoleId;
    reason: string;
  };
  focusedPlayerReview: PlayerReviewItem;
  allPlayerReviews?: PlayerReviewItem[];
  laneComparisons: LaneComparisonItem[];
  macroInsights: string[];
  rawAiResponse?: string;
  usedEndpoint?: string;
}
