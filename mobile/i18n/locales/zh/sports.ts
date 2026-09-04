/**
 * 运动项目、位置和水平。
 *
 * 存进数据库的是英文键 —— 一名运动员的项目在任何语言里都是 Football，
 * 否则马德里的教练和迪拜的教练就等于在两份不同的目录里搜索。
 * 这里翻译的只是显示用的标签。
 */
export const sports = {
  football: '足球',
  basketball: '篮球',
  tennis: '网球',
  athletics: '田径',
  swimming: '游泳',
  cricket: '板球',
  volleyball: '排球',
  handball: '手球',
  padel: '帕德尔网球',
  chess: '国际象棋',
  esports: '电子竞技',
  martialArts: '格斗',

  allSports: '全部项目',
  anySport: '不限项目',
  anyPosition: '不限位置',

  position: {
    goalkeeper: '门将',
    centreBack: '中后卫',
    fullBack: '边后卫',
    wingBack: '翼卫',
    defensiveMidfielder: '后腰',
    centralMidfielder: '中前卫',
    attackingMidfielder: '前腰',
    winger: '边锋',
    striker: '前锋',

    pointGuard: '控球后卫',
    shootingGuard: '得分后卫',
    smallForward: '小前锋',
    powerForward: '大前锋',
    centre: '中锋',

    singles: '单打',
    doubles: '双打',

    sprints: '短跑',
    middleDistance: '中长跑',
    longDistance: '长跑',
    jumps: '跳跃',
    throws: '投掷',
    hurdles: '跨栏',

    freestyle: '自由泳',
    backstroke: '仰泳',
    breaststroke: '蛙泳',
    butterfly: '蝶泳',
    individualMedley: '个人混合泳',

    batter: '击球手',
    bowler: '投球手',
    allRounder: '全能球员',
    wicketKeeper: '守门员',

    setter: '二传',
    outsideHitter: '主攻',
    opposite: '接应',
    middleBlocker: '副攻',
    libero: '自由人',

    leftWing: '左边锋',
    leftBack: '左后卫',
    centreBackHandball: '中卫',
    rightBack: '右后卫',
    rightWing: '右边锋',
    pivot: '支点',

    rightSide: '右路',
    leftSide: '左路',

    classical: '慢棋',
    rapid: '快棋',
    blitz: '超快棋',

    entry: '突破手',
    support: '辅助',
    igl: '场上指挥',
    mid: '中路',
    jungle: '打野',
    duelist: '决斗者',

    judo: '柔道',
    karate: '空手道',
    taekwondo: '跆拳道',
    boxing: '拳击',
    wrestling: '摔跤',
    mma: '综合格斗',
  },

  level: {
    grassroots: '基层',
    grassrootsHint: '学校或社区球队',
    academy: '青训',
    academyHint: '俱乐部青训营或梯队',
    amateur: '业余',
    amateurHint: '注册的业余比赛',
    semiPro: '半职业',
    semiProHint: '有报酬的兼职',
    professional: '职业',
    professionalHint: '全职合同',
  },

  side: {
    right: '右',
    left: '左',
    both: '双',
  },

  opportunityType: {
    trial: '试训',
    trialHint: '公开训练课或选拔日',
    scholarship: '奖学金',
    scholarshipHint: '青训或大学名额',
    contract: '合同',
    contractHint: '参赛合同或报价',
    camp: '训练营',
    campHint: '集训营或展示赛',
  },
};
