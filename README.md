# 2026 世界杯预测平台

AI 驱动的世界杯预测系统，融合泊松分布（Poisson）、XGBoost 机器学习和蒙特卡洛模拟三种方法论。支持赛前预测、赛中实时分析、全程赛事模拟，以及完整的球队球员数据浏览。

## 快速启动

```bash
docker-compose -p worldcup up -d --build
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |

## 功能概览

### 赛前预测
- 选择比赛 → 一键预测，Poisson 模型 + XGBoost 自适应混合
- 比分概率矩阵，展示最可能的 5 个比分
- 预期进球（主/客）可视化

### 赛中实时模拟（Live Mode）
- 比分 +/- 按钮 + 分钟滑块（15'/30'/45'/60'/75'/85' 快捷跳转）
- 拖动滑块实时变化胜率，200ms 防抖自动调 API
- 胜率三色卡片（主胜/平/客胜百分比）

### 赛事模拟
- 蒙特卡洛：48 队 → 12 组 → 每组前 2 + 8 最佳第 3 → 32 强淘汰赛
- 每场模拟使用完整泊松模型（ELO + 攻防数据）
- 淘汰赛平局重抽直到分出胜负
- 输出夺冠、进决赛、进四强概率
- **对阵图模拟填充**：一键跑模拟，淘汰赛对阵图填上真实队名

### 小组积分 & 淘汰赛对阵
- 12 组积分榜（场次/进球/净胜球/积分），带国旗
- 完整 2026 世界杯对阵图（R32 → Final）
- 冷门指数（三因子黑马评估模型）

### 球队详情
- 48 队完整数据：国旗、FIFA 排名、ELO 评分、教练
- **23 人完整阵容**（球员姓名、号码、位置、俱乐部）
- **球员状态标识**：健康/受伤（红色）/存疑（黄色）
- 攻防雷达图（Attack/Defense/Midfield）

### 首页仪表盘
- 世界杯开幕倒计时
- 下一场比赛倒计时（精确到秒）
- ELO 前 8 强队（带国旗）
- 焦点战预测（胜率概率条）
- 近期比赛列表

### 实时监控
- WebSocket 推送比分更新
- 比赛时间到自动开赛，智能调度器自适应轮询
- 无比赛时显示下一场倒计时

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 后端 | FastAPI + SQLAlchemy（异步）+ PostgreSQL |
| ML/统计 | scikit-learn + XGBoost + SciPy（泊松分布）|
| 实时 | WebSocket + APScheduler |
| 缓存 | Redis |
| 部署 | Docker Compose |

## 项目结构

```
backend/
├── app/
│   ├── api/                # REST 接口
│   │   ├── predictions.py  # 单场预测 + 赛事模拟 + 赛中实时
│   │   ├── matches.py
│   │   ├── teams.py
│   │   ├── analysis.py     # 积分榜、对阵图、冷门指数、模型评估
│   │   └── ws.py           # WebSocket + 比赛模拟控制
│   ├── services/
│   │   ├── prediction/
│   │   │   ├── poisson.py      # 泊松进球模型 + 赛中预测
│   │   │   ├── engine.py       # 预测编排 + ML 自适应混合
│   │   │   ├── simulator.py    # 蒙特卡洛赛事模拟
│   │   │   └── adjuster.py     # 球队强度修正（伤病/状态/主场）
│   │   ├── analysis/
│   │   │   ├── upset_detector.py  # 冷门指数
│   │   │   └── trend.py
│   │   └── crawler/
│   │       ├── scheduler.py    # 自适应轮询（30s/5min/1h）
│   │       ├── live_updater.py # 比分抓取 + 自动模拟
│   │       └── base.py
│   ├── ml/
│   │   ├── trainer.py     # XGBoost + Platt 校准训练管线
│   │   └── models/        # 序列化模型 + 评估指标
│   ├── models/            # SQLAlchemy 数据模型
│   ├── schemas/           # Pydantic 验证
│   └── core/              # 配置、数据库、Redis
├── data/
│   ├── teams_2026.json    # 48 队 ELO + 攻防数据
│   └── matches_2026.json  # 72 场小组赛
├── seed_all_squads.py     # 48 队 23 人阵容数据种子
└── Dockerfile

frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx      # 首页：倒计时 + 国旗榜 + 焦点预测 + 比赛列表
│   │   ├── Prediction.tsx     # 预测：单场 + Live 赛中模拟 + 赛事模拟
│   │   ├── Schedule.tsx       # 赛程：比赛列表 + 积分榜（带旗）+ 对阵图（可填充）
│   │   ├── LiveMonitor.tsx    # 直播：实时比分 + 下一场倒计时
│   │   ├── TeamAnalysis.tsx   # 球队：国旗 + 阵容（含状态）+ 雷达图 + 教练
│   │   ├── Insights.tsx       # 数据洞察
│   │   └── AILab.tsx          # AI 实验室：模型指标 + 模型对比
│   ├── components/
│   │   ├── MatchCard.tsx       # 比赛卡片（国旗 + 可点击跳转预测）
│   │   ├── ProbabilityBar.tsx  # 胜率进度条
│   │   ├── CountdownTimer.tsx  # 开幕倒计时
│   │   └── Layout.tsx         # 导航布局
│   └── hooks/
│       ├── useMatchData.ts
│       ├── usePrediction.ts
│       └── useWebSocket.ts
└── Dockerfile
```

## API 接口

### 预测
```bash
# 赛前预测
POST /api/predictions/match/{id}/refresh

# 赛中实时预测
POST /api/predictions/match/{id}/live
{"home_score": 1, "away_score": 0, "minute": 65}
```

### 赛事模拟
```bash
POST /api/predictions/simulate
{"total_simulations": 10000}
```

### 数据
```bash
GET /api/teams                    # 48 队（含阵容、教练）
GET /api/teams/{id}               # 单队详情
GET /api/matches                  # 72 场小组赛
GET /api/analysis/standings       # 小组积分榜
GET /api/analysis/bracket         # 淘汰赛对阵结构
GET /api/analysis/upsets          # 冷门指数
GET /api/analysis/model-performance  # 模型指标
GET /api/ws/status                # WebSocket + 调度器状态
```

### 实时控制（测试用）
```bash
POST /api/matches/{id}/start          # 手动开赛
POST /api/matches/{id}/goal?team=home # 进球
POST /api/matches/{id}/finish         # 完赛
```

## 预测方法

### 泊松模型
预期进球 λ = f(ELO 差值, 进攻强度, 防守强度, 主场优势)

- 联赛均值：1.35 球/队（2010–2022 四届世界杯校准）
- ELO 缩放：2^(ΔELO / 1000) — 每 400 分 ELO 差 ≈ 1.5 倍进球差距
- 攻防比限制在 [0.5, 2.0]，预期进球上限 5.5 球
- 主场优势系数：1.15×

### 赛中预测
剩余预期进球 = λ × (90 − 当前分钟) / 90，卷积当前比分 → 实时胜率

### ML 模型
- 120 场真实世界杯比赛（2010–2022）+ 60 条合成数据
- 16 个特征（ELO 差、排名差、攻防比、休息天数、东道主、同洲、赛段）
- XGBoost（200 棵树, max_depth=4）+ Isotonic 概率校准（3 折 CV）
- 准确率 ~65%，与泊松模型自适应加权混合（权重 0.25–0.55）

## 数据说明

`data/teams_2026.json` 中的 ELO 评分和攻防数据为近似值，如需更高准确度可替换为实时数据源。球员阵容数据来自 `seed_all_squads.py`，覆盖全部 48 支球队的 23 人名单（含教练和伤病状态）。
