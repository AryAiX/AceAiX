/**
 * 资料填写向导，注册后只走一次。
 *
 * 三条路径共用它：建立资料的运动员；说明自己想找什么样的人的教练或俱乐部；
 * 以及来照看孩子资料、而不是给自己建资料的家长或监护人。
 *
 * 监护人相关的文案属于合规内容。13至17岁的人在家长或监护人批准之前，
 * 既搜不到也收不到私信 —— 要把这一点说明白，不要弱化。
 */
export const onboarding = {
  // ── 向导框架 ──────────────────────────────────────────────────────────────
  loading: '正在准备你的资料',
  signOut: '退出登录',
  skipForNow: '暂时跳过',
  finish: '开始逛逛',

  // ── 国家选择器，运动员和招募方的地点步骤共用 ──────────────────────────────
  countryLabel: '国家',
  countrySearchPlaceholder: '搜索国家',
  countryNoMatch: '没有匹配的国家。试试少输几个字。',
  countryShowAll: '显示所有国家',

  // ── 运动员：项目、位置、水平 ──────────────────────────────────────────────
  sportTitle: '你练什么？',
  sportSubtitle: '选你参赛最多的那个项目。',

  positionTitle: '你打什么位置？',
  positionSubtitle: '选你最常打的位置。之后可以再加。',
  positionNoneTitle: '这个项目没有固定位置',
  positionNoneBody:
    '这个项目不按位置划分，所以没什么可选的。点{{action}}继续就行。',

  levelTitle: '你现在是什么水平？',
  levelSubtitle: '如实填 —— 教练是按水平搜索的，选对了比说大话管用。',

  // ── 运动员：在哪里练 ──────────────────────────────────────────────────────
  placeTitle: '你现在在哪儿练？',
  placeSubtitle: '你的俱乐部和城市能帮附近的教练找到你。',
  clubLabel: '俱乐部或青训机构',
  clubPlaceholder: 'Al Wasl Academy',
  clubHint: '如果你现在没有俱乐部，留空就行。',
  cityLabel: '城市',
  cityPlaceholder: '迪拜',

  // ── 运动员：身体数据 ──────────────────────────────────────────────────────
  physicalTitle: '几个数字',
  physicalSubtitle:
    '都是选填。球探会看这些，但你可以先跳过，随时再补。',
  heightLabel: '身高',
  heightPlaceholder: '172',
  heightHint: '单位：厘米',
  heightOutOfRange: '请填写{{min}}到{{max}}厘米之间的身高。',
  weightLabel: '体重',
  weightPlaceholder: '64',
  weightHint: '单位：公斤',
  weightOutOfRange: '请填写{{min}}到{{max}}公斤之间的体重。',
  strongSide: '惯用侧',

  // ── 监护人批准，向年轻运动员提出 ──────────────────────────────────────────
  guardianTitle: '请一位大人加入',
  guardianSubtitle:
    '你未满18岁，所以要由家长或监护人批准你的资料，别人才能找到你。',
  guardianApprovalTitle: '他们需要批准的是什么',
  guardianApprovalBody:
    '我们会给他们发一封带链接的邮件。邮件里说明我们是谁，并请他们对两件事分别做出同意或不同意的选择。他们随时可以改主意、把其中任何一项关掉，我们也不会为别的事去打扰他们。',
  guardianSearchTitle: '你会出现在搜索结果里',
  guardianSearchBody:
    '教练和俱乐部搜索球员时，能找到你的资料。',
  guardianMessageTitle: '认证过的教练可以给你发私信',
  guardianMessageBody: '只限我们认证过的成年人。其他任何人都不能主动找你聊天。',
  guardianWhoTitle: '这个人是谁？',
  guardianRelationshipParent: '家长',
  guardianRelationshipGuardian: '其他监护人',
  guardianNameLabel: '他们的姓名',
  guardianNamePlaceholder: 'Leila Karimi',
  guardianNameRequired: '请填写他们的姓名。',
  guardianEmailLabel: '他们的邮箱',
  guardianEmailHint: '一定要填对 —— 批准链接会发到这里。',
  guardianEmailRequired: '请填写他们的邮箱地址。',
  guardianEmailInvalid: '这个邮箱地址看起来不太对。',
  guardianSkip: '以后再说',
  guardianSkipHint: '在大人批准之前，你的资料对教练一直是隐藏的。',
  guardianSkipA11y:
    '以后再说。在家长或监护人批准之前，你的资料一直是隐藏的。',
  guardianSkipSheetTitle: '留到以后再做？',
  guardianSkipSheetMessage:
    '你的资料会一直隐藏。在家长或监护人批准之前，教练在搜索里找不到你，也没有人能给你发私信。你随时可以在设置里发送这封邮件。',
  guardianSkipSheetConfirm: '好，以后再说',
  guardianSkipSheetCancel: '我现在就填',

  // ── 头像 ──────────────────────────────────────────────────────────────────
  photoTitle: '给名字配上一张脸',
  photoSubtitle:
    '一张只有你本人的清晰照片。有照片的资料被点开的次数要多得多。',
  photoSaved: '已保存，看着不错。',
  photoOptional: '想以后再弄就跳过 —— 这里没有任何必填项。',
  photoChoose: '从相册中选择',
  photoChooseAnother: '换一张照片',
  photoTake: '拍一张',
  photoUnreadable: '这张照片读取不了，换一张试试。',
  photoLibraryDenied:
    '{{app}} 需要访问相册的权限。你可以在系统设置里打开。',
  photoLibraryFailed: '打不开你的相册，请重试。',
  photoCameraDenied: '{{app}} 需要使用相机的权限。你可以在系统设置里打开。',
  photoCameraFailed: '打不开相机，请重试。',

  // ── 招募方：项目、身份、地点、目标 ────────────────────────────────────────
  recruiterSportsTitle: '你负责哪些项目？',
  recruiterSportsSubtitle:
    '想选几个就选几个。我们据此为你推荐合适的运动员。',

  recruiterRoleTitle: '说说你的身份',
  recruiterRoleSubtitle: '运动员和他们的家长会看到这一项，写得简单、真实就好。',
  recruiterRoleLabel: '你的身份',
  recruiterRolePlaceholderClub: '青训总监',
  recruiterRolePlaceholderCoach: 'U16 主教练',
  recruiterRoleRequired: '请说明你是做什么的。',
  recruiterClubLabel: '俱乐部或青训机构名称',
  recruiterClubHintClub: '我们会用它来建立你的俱乐部页面。',
  recruiterClubHintCoach: '如果你是自由身，留空就行。',

  recruiterPlaceTitle: '你在哪个地方？',
  recruiterPlaceSubtitle: '我们会把离你近的运动员排在结果最前面。',

  recruiterTargetTitle: '你在找什么样的人？',
  recruiterTargetSubtitle:
    '大致填填就行。这些之后都能在设置里改。',
  recruiterPositionsTitle: '位置',
  recruiterPositionsEmpty: '回上一步选一个项目，就能看到它的位置了。',
  recruiterAgeGroupTitle: '年龄段',
  recruiterMinorsNote:
    '未满18岁的运动员，只有在家长或监护人批准资料之后才会出现。',
  ageBandAny: '不限年龄',
  ageBandUnder14: '14岁以下',
  ageBand14To16: '14至16岁',
  ageBand16To18: '16至18岁',
  ageBand18To21: '18至21岁',
  ageBand21Plus: '21岁及以上',

  // ── 家长或监护人：流程是怎样的 ────────────────────────────────────────────
  guardianIntroTitle: '你这边是怎么用的',
  guardianIntroSubtitle:
    '你来这里是照看孩子的资料，而不是给自己建一份。',
  guardianIntroStepLabel: '{{index}}. {{title}}',
  guardianIntroLinkTitle: '和孩子建立关联',
  guardianIntroLinkBody:
    '打开设置，选择“家长与监护人”。如果他们已经给你发过批准邮件，点开里面的链接就能直接关联。',
  guardianIntroDecideTitle: '决定他们能做什么',
  guardianIntroDecideBody:
    '你要对两件事做出同意或不同意的选择：教练能否在搜索里找到他们，以及认证过的教练能否给他们发私信。',
  guardianIntroChangeTitle: '随时可以改主意',
  guardianIntroChangeBody:
    '你随时可以在设置里关掉其中任何一项，他们的资料会立刻从搜索里消失。',
  guardianIntroFooter:
    '在你批准之前，孩子的资料一直是隐藏的。没有人能搜到他们，也没有成年人能主动和他们对话。',

  // ── 完成：运动员 ──────────────────────────────────────────────────────────
  scoreLoading: '正在计算你的分数',
  scoreErrorNote:
    '不管怎样你的资料都已经保存了 —— 可以先继续，稍后再看分数。',
  athleteDoneTitle: '干得漂亮',
  athleteDoneTitleNamed: '干得漂亮，{{name}}',
  athleteDoneScored: '你的资料已上线。这是你的起点 —— {{tier}}。',
  athleteDoneNoScore:
    '你的资料已上线。再补充一些内容，天赋分就会出现在你的主页上。',
  tipsTitle: '怎么把分数提上去',
  tipPoints: '+{{points}}',
  tipsEmpty:
    '发一段高光短片，补上你的数据，再请俱乐部为你背书。每加一样，分数都会动。',
  guardianRequested:
    '我们已经给{{name}}发了邮件。他们一批准，教练就能找到你。在那之前，你的资料保持私密。',
  guardianPendingTitle: '还差一件事',
  guardianPendingBody:
    '在家长或监护人批准之前，你的资料是隐藏的。你随时可以在设置里给他们发邮件。',

  // ── 完成：招募方、监护人和其他所有人 ──────────────────────────────────────
  finishBullet: '•  {{text}}',
  recruiterDoneTitle: '都设置好了',
  recruiterDoneTitleNamed: '都设置好了，{{name}}',
  recruiterDoneBody:
    '我们这就开始为你匹配符合你要求的运动员。',
  recruiterDonePointSearch: '在“发现”里搜索和筛选运动员',
  recruiterDonePointPost: '发布试训和名额，让运动员来申请',
  recruiterDonePointVerified: '完成认证，就能给未满18岁的运动员发私信',
  doneTitle: '一切就绪',
  guardianDoneBody: '你的账号已经就绪。和孩子建立关联大约只要一分钟。',
  basicDoneBody: '先四处看看，其余的想什么时候设置都行。',
  guardianDoneNote:
    '打开设置，选择“家长与监护人”。如果孩子已经给你发过批准邮件，点开里面的链接就能把两个账号关联起来。',
};
