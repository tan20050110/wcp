import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Lang = "en" | "zh";

const en = {
  dashboard: "Dashboard", schedule: "Schedule", teams: "Teams",
  predictions: "Predictions", live: "Live", insights: "Insights", aiLab: "AI Lab",
  wc2026: "WC 2026",
  heroTitle: "2026 Predictor",
  heroSub: "Canada / Mexico / United States / June 11 - July 19",
  heroTeams: "Teams", heroMatches: "Matches", heroGroups: "Groups",
  topElo: "Top ELO Rankings", featured: "Featured Prediction",
  upcomingMatches: "Upcoming Matches", fullSchedule: "Full Schedule",
  all: "All", nextMatch: "Next",
  matchOf: "Match", todayMatch: "Today's match",
  loadingPrediction: "Loading prediction...", noUpcoming: "No upcoming matches.",
  days: "Days", hours: "Hours", minutes: "Minutes", worldCupHere: "The World Cup is here!",
  liveLabel: "LIVE", vs: "vs",
  allStages: "All Stages", allGroups: "All Groups",
  matchesTab: "Matches", standingsTab: "Standings", bracketTab: "Bracket",
  groupStage: "Group Stage", round32: "Round of 32", round16: "Round of 16",
  quarter: "Quarter-finals", semi: "Semi-finals", third: "3rd Place", final: "Final",
  noMatchesFound: "No matches found.",
  selectTeam: "Select a team...", allTeams: "All Teams",
  fifaRank: "FIFA Ranking", eloRating: "ELO Rating",
  headCoach: "Head Coach", squad: "Squad", players: "players",
  noSquad: "Squad data not yet available for this team.",
  attack: "Attack", defense: "Defense", midfield: "Midfield",
  form: "Form", improving: "improving", declining: "declining", stable: "stable",
  matchPrediction: "Match Prediction", tournamentSim: "Tournament Simulation",
  selectMatch: "Select a match...", predict: "Predict", analyzing: "Analyzing...",
  winProb: "Win Probability", mlEnhanced: "ML Enhanced",
  mostLikelyScores: "Most Likely Scores", expHomeGoals: "Expected Home Goals",
  expAwayGoals: "Expected Away Goals", championOdds: "Champion Odds",
  runs: "Runs",
  monteCarloDesc: "Monte Carlo method: simulates the full tournament N times.",
  selectAndPredict: "Select a match and click Predict to see results.",
  modelInfo: "Model Info", performanceMetrics: "Performance Metrics",
  featureImportance: "Feature Importance",
  modelComparison: "Poisson vs XGBoost Comparison",
  comparisonDesc: "Compare statistical Poisson with ML XGBoost on the same match.",
  selectMatchCompare: "Select a match to compare...", compare: "Compare",
  poissonBaseline: "Poisson Model (Baseline)", xgboostModel: "XGBoost Model",
  algorithm: "Algorithm", trainingSamples: "Training Samples",
  features: "Features", architecture: "Architecture",
  status: "Status", trained: "Trained and Ready", notTrained: "Not Trained",
  accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1Score: "F1 Score",
  calibrationError: "Calibration Error",
  accuracyDesc: "Overall match outcome prediction",
  precisionDesc: "Macro-averaged precision",
  recallDesc: "Macro-averaged recall",
  f1Desc: "Harmonic mean of P and R",
  calibDesc: "lower = better probability estimates",
  dataInsights: "Data Insights",
  highRisk: "High Upset Risk", medRisk: "Medium Risk", lowRisk: "Low Risk",
  upsetTitle: "Upset Index - All 48 Teams",
  upsetDesc: "Based on FIFA rank, ELO rating, and group strength.",
  liveMonitor: "Live Monitor", noMatchesLive: "No matches currently live.",
};

const zh: typeof en = {
  dashboard: "仪表盘", schedule: "赛程", teams: "球队",
  predictions: "预测", live: "直播", insights: "洞察", aiLab: "AI 实验室",
  wc2026: "2026 世界杯",
  heroTitle: "2026 预测系统",
  heroSub: "加拿大 / 墨西哥 / 美国 / 6月11日 - 7月19日",
  heroTeams: "参赛队", heroMatches: "比赛", heroGroups: "小组",
  topElo: "ELO 排行榜", featured: "精选预测",
  upcomingMatches: "即将开始", fullSchedule: "完整赛程",
  all: "全部", nextMatch: "下一场",
  matchOf: "第", todayMatch: "今日比赛",
  loadingPrediction: "加载预测中...", noUpcoming: "暂无即将开始的比赛。",
  days: "天", hours: "时", minutes: "分", worldCupHere: "世界杯来了!",
  liveLabel: "直播中", vs: "对阵",
  allStages: "全部阶段", allGroups: "全部小组",
  matchesTab: "比赛", standingsTab: "积分榜", bracketTab: "对阵图",
  groupStage: "小组赛", round32: "32强", round16: "16强",
  quarter: "四分之一决赛", semi: "半决赛", third: "三四名决赛", final: "决赛",
  noMatchesFound: "没有找到比赛。",
  selectTeam: "选择球队...", allTeams: "全部球队",
  fifaRank: "FIFA 排名", eloRating: "ELO 评分",
  headCoach: "主教练", squad: "阵容", players: "名球员",
  noSquad: "该球队暂无阵容数据。",
  attack: "进攻", defense: "防守", midfield: "中场",
  form: "状态", improving: "上升", declining: "下滑", stable: "平稳",
  matchPrediction: "单场预测", tournamentSim: "赛事模拟",
  selectMatch: "选择比赛...", predict: "预测", analyzing: "分析中...",
  winProb: "胜率", mlEnhanced: "ML 增强",
  mostLikelyScores: "最可能比分", expHomeGoals: "主队预期进球",
  expAwayGoals: "客队预期进球", championOdds: "夺冠概率",
  runs: "次",
  monteCarloDesc: "蒙特卡洛方法: 模拟完整赛事 N 次。",
  selectAndPredict: "选择比赛并点击预测即可查看结果。",
  modelInfo: "模型信息", performanceMetrics: "性能指标",
  featureImportance: "特征重要性",
  modelComparison: "泊松 vs XGBoost 对比",
  comparisonDesc: "在同一场比赛上对比泊松统计模型和 XGBoost 机器学习模型。",
  selectMatchCompare: "选择比赛进行对比...", compare: "对比",
  poissonBaseline: "泊松模型 (基线)", xgboostModel: "XGBoost 模型",
  algorithm: "算法", trainingSamples: "训练样本",
  features: "特征数", architecture: "架构",
  status: "状态", trained: "已训练就绪", notTrained: "未训练",
  accuracy: "准确率", precision: "精确率", recall: "召回率", f1Score: "F1 分数",
  calibrationError: "校准误差",
  accuracyDesc: "总体比赛结果预测准确率",
  precisionDesc: "宏平均精确率",
  recallDesc: "宏平均召回率",
  f1Desc: "精确率与召回率的调和平均",
  calibDesc: "越低 = 概率估计越准确",
  dataInsights: "数据洞察",
  highRisk: "高冷门风险", medRisk: "中冷门风险", lowRisk: "低冷门风险",
  upsetTitle: "冷门指数 - 全部 48 队",
  upsetDesc: "基于 FIFA 排名、ELO 评分和小组实力。",
  liveMonitor: "实时监控", noMatchesLive: "暂无比赛进行中。",
};

const translations = { en, zh } as const;

type I18nContextType = { lang: Lang; t: (key: string) => string; toggleLang: () => void };
const I18nContext = createContext<I18nContextType>({
  lang: "en", t: (k) => k, toggleLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("lang") as Lang) || "en"
  );
  const t = useCallback(
    (key: string) => (translations[lang] as Record<string, string>)[key] || key,
    [lang]
  );
  const toggleLang = useCallback(() => {
    setLang((prev) => { const n = prev === "en" ? "zh" : "en"; localStorage.setItem("lang", n); return n; });
  }, []);
  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() { return useContext(I18nContext); }
