export interface Team {
  id: string;
  name: string;
  fifa_code: string;
  fifa_rank: number;
  elo_rating: number;
  group: string;
  flag_url?: string;
  coach_name?: string;
  stats_json?: {
    attack: number;
    defense: number;
    midfield: number;
  };
  squad_json?: Player[];
}

export interface Player {
  name: string;
  number: number;
  position: string;
  club: string;
  status: "fit" | "injured" | "doubtful";
}

export interface Match {
  id: string;
  home_team: Team;
  away_team: Team;
  match_date: string;
  venue?: string;
  stage: string;
  group?: string;
  status: "scheduled" | "live" | "finished";
  home_score?: number;
  away_score?: number;
}

export interface Prediction {
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  pred_home_score?: number;
  pred_away_score?: number;
  pred_final_home?: number;
  pred_final_away?: number;
  model_type?: string;
  score_matrix_json?: number[][];
}

export interface SimulationResult {
  total_simulations: number;
  results_json: {
    champions: Record<string, number>;
    finalists: Record<string, number>;
    semifinalists: Record<string, number>;
  };
}

export interface StandingsGroup {
  group: string;
  standings: StandingRow[];
}

export interface StandingRow {
  team_id: string;
  name: string;
  fifa_code: string;
  played: number;
  gd: number;
  pts: number;
}

export interface BracketRound {
  name: string;
  matches: BracketMatch[];
}

export interface BracketMatch {
  id: string;
  home?: string;
  away?: string;
}

export interface UpsetTeam {
  team_id: string;
  name: string;
  fifa_code: string;
  group: string;
  fifa_rank: number;
  upset_index: number;
}

export interface ModelPerformance {
  training_samples: number;
  features: number;
  model_trained: boolean;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    calibration_error: number;
    feature_importance: Record<string, number>;
  };
}

export interface WsMessage {
  type: "score_update" | "goal" | "match_started" | "match_finished";
  match_id: string;
  home_score?: number;
  away_score?: number;
  status?: string;
}
