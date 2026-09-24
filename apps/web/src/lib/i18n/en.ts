/**
 * Le dictionnaire anglais.
 *
 * Typé par le français : toute clé ajoutée là-bas et manquante ici casse la
 * compilation. C'est le seul mécanisme qui empêche une traduction de dériver
 * en silence.
 *
 * **Il n'est pas chargé à la demande, et c'est mesuré.** L'idée était de le
 * sortir du paquet initial par un `import()`. Il pèse **quatre kilo-octets
 * gzippés** : le charger après coup ferait afficher le français une fraction
 * de seconde à quelqu'un qui a choisi l'anglais, pour quatre kilo-octets. Le
 * jour où il y aura un routage par langue — donc où le serveur saura quelle
 * langue servir —, la question se posera autrement.
 */

import type { Dictionary } from './fr.ts'

export const en: Dictionary = {
  app: {
    name: 'Le Coup Parfait',
    tagline: 'Find it. Every time.',
    description:
      'The free and open chess platform: voice-guided lessons, move-by-move explained analysis, games against the computer or friends. Free, ad-free, no account required.',
  },

  nav: {
    restOfSection: 'The rest of the {rubrique} section',
    home: 'Home',
    play: 'Play',
    career: 'Career',
    careerHint: 'Twelve chapters, from first move to first clean win',
    learn: 'Learn',
    puzzles: 'Puzzles',
    openings: 'Openings',
    endgames: 'Endgames',
    analysis: 'Analyse',
    vision: 'Vision',
    glossary: 'Glossary',
    glossaryIntro:
      '{n} terms defined in plain language — the rules, the material, the phases of the game, and the patterns the coach can recognise and name in your games. {illustres} of them show themselves on a board: their name carries a dot. The loudspeaker, to the right of each word, reads the definition aloud.',
    famRegles: 'Rules',
    famPieces: 'Pieces and material',
    famPhases: 'Phases of the game',
    famEvaluation: 'Evaluation and play',
    famMotifs: 'Tactical patterns',
    leaderboard: 'Leaderboard',
    friends: 'Friends',
    editor: 'Editor',
    studies: 'Studies',
    profile: 'Profile',
    settings: 'Settings',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    menu: 'Menu',
    search: 'Search',

    train: 'Train',
    community: 'Community',
    tools: 'Tools',
    more: 'More',
    moreHint: 'Community, tools, account and settings',
    account: 'Account',
    about: 'About',
    credits: 'Credits & licences',
    admin: 'Administration',

    vsComputer: 'Against the computer',
    vsFriend: 'Against someone',
    localGame: 'Two on this screen',
    correspondence: 'My correspondence games',
    tournaments: 'Tournaments',
    watch: 'Watch a game',
    lessons: 'Guided lessons',
    palier: 'Your level',
    principes: 'Principles & checklist',
    seance: 'Teaching game',
    puzzleRush: 'Puzzle rush',
    dailyChallenge: 'Daily challenge',
    analyseGame: 'Analyse a game',
    stats: 'Statistics',
    myProfile: 'My profile',
    clock: 'Chess clock',
    eloCalculator: 'Elo calculator',
    draw: 'Random draw',
    arbiter: 'Arbiter’s cheat sheet',

    vsComputerHint: '18 levels, 7 personalities',
    vsFriendHint: 'a link, or days per move',
    localGameHint: 'two players, one device',
    clockHint: 'time your game on a real board',
    eloCalculatorHint: 'what a tournament gains or costs you',
    drawHint: 'colours, pairings, playing order',
    arbiterHint: 'the rules people argue about, on one page',
    correspondenceHint: 'games waiting on you',
    tournamentsHint: 'an arena: join and leave whenever you like',
    leaderboardHint: 'who plays here, and how well',
    friendsHint: 'your contacts, and the challenges you received',
    statsHint: 'what your games say about you',
    watchHint: 'games in progress',
    lessonsHint: '{n} lessons, from zero to a repertoire',
    palierHint: 'what costs you points at your level',
    principesHint: 'the before-every-move checklist, and the principles',
    seanceHint: 'an announced theme, an opponent at your level',
    openingsHint: '3,810 named openings',
    endgamesHint: '3,568 sorted positions',
    visionHint: 'name squares at a glance',
    glossaryHint: 'the vocabulary, explained',
    puzzlesHint: 'tactics at your level',
    puzzleRushHint: 'as many as you can, against the clock',
    dailyChallengeHint: 'the same position for everyone',
    analyseGameHint: 'move by move, with reasons',
    studiesHint: 'your annotated positions',
    editorHint: 'compose a position',
    levelTest: 'Level test',
    levelTestHint: 'six minutes to find out where you stand',

    progress: 'Improve',
    listen: 'Listen to the curriculum',
    listenHint: 'the lessons read aloud',
  },

  home: {
    statsLevels: 'opponent levels, from {min} to {max} Elo',
    statsTablebase: 'pieces: endgames solved perfectly',
    heroTitle: 'Chess, finally explained.',
    heroSubtitle:
      'An engine that does not just tell you the move, but **why**. A voice that guides you. And zero euros, forever.',
    ctaPlay: 'Play now',
    ctaLearn: 'Start learning',
    ctaGuest: 'No sign-up needed',
    features: {
      coachTitle: 'A coach that speaks',
      coachBody:
        'Every move is narrated aloud. Pins, forks, back-rank mates — you hear them named the moment they appear on your board.',
      analysisTitle: 'Explained analysis',
      analysisBody:
        'Stockfish 19 runs server-side at full strength. Every error is classified, the best move is shown, and the reason is spelled out.',
      levelsTitle: '18 levels, 7 personalities',
      levelsBody:
        'From 100 to 3200 Elo. Opponents with a style — one charges, one squeezes, one sacrifices everything. Pick your sparring partner.',
      dataTitle: 'Millions of positions',
      dataBody:
        '3,810 named openings, six million rated and tagged puzzles, perfect endgames up to seven pieces. All public domain.',
      friendsTitle: 'Your friends, one link away',
      friendsBody:
        'Create a game, share the address, play. No sign-up for guests, no ads, no limits.',
      freeTitle: '100% free, 100% open',
      freeBody:
        'No paid tier, no trackers, no data resold. The code is AGPL-licensed: host it yourself if you like.',
    },
    badge: '100% free · open source · no ads',
    heroTitleTop: 'Chess,',
    heroTitleBottom: 'finally explained.',
    noSignup: 'No sign-up needed to play or learn.',
    accountBefore: 'An account —',
    accountLink: 'free, a username and a password',
    accountAfter:
      '— adds the daily challenge, your streak, your rating per time control and the history of your games.',
    demoCaption: 'The coach comments · Anderssen – Kieseritzky, London 1851',
    goFurther: 'Go further',

    statsGames: 'games played',
    statsPuzzles: 'puzzles available',
    statsOpenings: 'openings catalogued',
    startTitle: 'Where to start?',
    discoverTitle: 'I’m new to chess',
    discoverHint: 'First lesson · {lecon} · {minutes} min',
    knowTitle: 'I already know how to play',
    knowHint: 'Level test · {n} positions',
    playNowLink: 'Or play the computer right away',
    demoTitle: 'A coach who comments on every move',
    dailyNeedsAccount: 'Needs a free account — it keeps your day streak',
  },

  opponent: {
    levelBadge: '≈ {elo} · no. {niveau}',
    notFound: 'Opponent not found',
    metaTitle: '{nom} — artificial opponent',
    all: 'All the opponents',
    galleryIntro:
      'Seven characters, spread over the {total} levels. Their style is not decoration: each evaluates moves with a preference of its own, and its page shows the numbers that produce it — along with what to do to beat it.',
    whereYouMeet: 'Where you meet them',
    atLevel: 'At level {numeros} of the {total}, that is {min} Elo.',
    atLevels: 'At levels {numeros} of the {total}, that is from {min} to {max} Elo.',
    playAgainst: 'Play against {nom}',
    character: 'Their character',
    characterHint:
      'What their evaluation adds to — or takes from — a move, in hundredths of a pawn. This is not a label: it is the number that makes them play the way they do.',
    noBias:
      'No bias, on any axis. The only one of the set in that case, and that is what makes them so unpleasant.',
    howToBeat: 'How to beat them',
  },

  credits: {
    title: 'Credits & licences',
    intro:
      'Le Coup Parfait could not have existed without other people’s free work. Everything that follows is reused in accordance with its licence — and this page is part of that: several of these licences explicitly require attribution.',
    licenceTitle: 'The licence of Le Coup Parfait',
    licenceBefore: 'Le Coup Parfait is published under the',
    licenceStrong: 'GNU Affero General Public License v3 or later',
    licenceAfter:
      '. That choice is not arbitrary: Stockfish is under the GPL, and any work that embeds it must adopt a compatible licence. The AGPL adds a decisive clause for an online service — whoever hosts a modified version must publish its source code.',
    licenceConcretely:
      'In practice: you can use it, change it, host it for your friends, redistribute it. The only obligation is to let the next people do the same.',
    nonCommercialBefore: 'Piece sets published under the',
    nonCommercialAfter:
      'licence (non-commercial use) were deliberately left out of the project, however beautiful they are: their clause would make free redistribution impossible.',
    moreAboutProject: 'More about the project',
    by: 'by {auteur}',
    librariesCount: 'The {n} libraries embedded in the app.',
  },

  play: {
    title: 'Play',
    career: 'Career mode',
    careerBlurb: 'Twelve chapters, from first move to first clean win.',
    seance: 'Teaching game',
    seanceBlurb:
      'A theme announced before you start, an opponent at your level, and a report saying where that theme showed up.',
    vsComputer: 'Against the computer',
    vsComputerBlurb: 'Calibrated opponents, from the very first move to grandmaster.',
    vsFriend: 'Against someone',
    vsFriendBlurb: 'Create a link, send it, the game begins.',
    localGame: 'Same screen',
    localBlurb: 'Two players, one device.',
    watchGame: 'Watch a game',
    watchBlurb: 'Follow games in progress, move by move.',
    correspondence: 'Correspondence',
    correspondenceBlurb: 'One move whenever you can, over days.',
    arena: 'Arena',
    arenaBlurb: 'A tournament you can join and leave at will.',
    lobbyIntro:
      'Against the machine to train at your own pace, against a friend for the fun of it, or two of you on one screen.',
    vsComputerDetail: '18 levels · 7 personalities · from 100 to 3200 Elo',
    seanceDetail: '10 themes · opponent matched to your tier · commentary mode',
    vsFriendDetail: 'From 15 seconds to 14 days per move · a link, or a friend',
    correspondenceDetail: 'A move whenever you can · 1 to 14 days per move',
    localDetail: 'The board flips after every move if you want it to',
    arenaDetail: 'Arrive whenever you like, leave whenever you like',
    watchDetail: 'Games in progress, followed move by move',
    careerDetail: '12 chapters · one lesson, some puzzles and a duel per chapter',
    opponentsTitle: 'Your artificial opponents',
    opponentsHint:
      'Each one really does play differently: the way they pick a move is biased towards what they like.',
    allPortraits: 'All the portraits',

    quickPairing: 'Quick game',
    level: 'Level',
    difficulty: 'Difficulty',
    playAs: 'Play as',
    white: 'White',
    black: 'Black',
    random: 'random',
    timeControl: 'Time control',
    rated: 'Rated game',
    casual: 'Casual game',
    start: 'Start the game',
    createLink: 'Create game link',
    linkCopied: 'Link copied',
    waitingOpponent: 'Waiting for your opponent…',
    shareThisLink: 'Send this link to your friend:',
  },

  computer: {
    back: 'Back to the mode picker',
    intro: '{n} levels, {p} personalities. Pick an opponent a little above you.',
    badFen: 'That position cannot be played.',
    badFenHint: 'A king may be missing, or one side is already in check. The game starts normally.',
    resume: 'You have a game in progress',
    resumeDetail:
      'Against {moteur}, level {niveau} · with {couleur} · {coups} half-moves, {depuis}.',
    forget: 'Forget it',
    step1: 'Who are you facing?',
    opponentGroup: 'Opponent',
    noneBeaten: 'No level beaten yet. Start with the first — it learns at the same time as you do.',
    bestBeaten: 'Highest level beaten:',
    winsOf: '{victoires} wins out of {parties} games.',
    oneWinOf: '{victoires} win out of {parties} games.',
    nextToBeat: 'Face level {niveau}, the next one to beat',
    playStyle: 'Playing style',
    styleHuman: 'Human (Maia)',
    styleHumanHint: 'A network trained on millions of real games',
    styleEngine: 'Engine (Stockfish)',
    styleEngineHint: 'The strongest in the world, held back to the level you picked',
    styleHumanNote: 'Maia goes wrong the way people really do go wrong at that level.',
    styleEngineNote: 'Stockfish plays accurately, then drops a weak move out of nowhere.',
    styleOutOfRange:
      'Maia learned from human games between {min} and {max} Elo and can play nothing outside that: at level {niveau}, Stockfish plays. To face Maia, pick a level between {premier} and {dernier}.',
    step2: 'Your colour and the time control',
    yourColour: 'Your colour',
    colour: 'Colour',
    whiteStarts: 'White moves first. To learn, alternate.',
    randomColour: 'Random colour',
    step3: 'During the game',
    ratedNeedsAccount: 'Requires an account: that is what carries the rating.',
    ratedHint:
      'The result updates your rating in this time control. In exchange: no takebacks, no hints, no commentary.',
    commentaryEach: 'Comment on every move',
    commentaryRated: 'Not available in a rated game: the commentary shows the best move.',
    commentaryHint:
      'What your move was worth, the best options and the reason for each, read out loud. Recommended when starting out.',
    commentaryOpponent: 'Comment on the opponent too',
    commentaryOpponentHint:
      'Twice as much commentary. For taking a game apart rather than playing it.',
    summaryRated: 'rated game',
    summaryCoach: 'coach on',
    summaryPlain: 'no commentary',
    summaryLine: '{adversaire} · ≈ {elo} Elo · {couleur} · {cadence} · {mode}',
    engineLoading: 'Loading the engine…',
    thinking: 'thinking…',
    engineLevel: '{moteur} · level {niveau}',
    backToGame: 'Back to the game',
    continuePlays: 'Continue — {adversaire} plays',
    reviewingGame: 'You are reviewing the game. Nothing is erased.',
    reviewingMove: 'You are reviewing the game — move {coup}. Nothing is erased.',
    shouldHavePlayed:
      'You should have played {conseille} instead of {joue} — the blue arrow shows that move in the position before, not a move to play now.',
    gameOptions: 'Game options',
    yourMove: 'Your move',
    advisedMove: 'Suggested move (no.{rang})',
    evaluation: 'Evaluation: {score}.',
    expectedLine: 'Expected continuation: {coups}.',
    engineTop: 'The engine puts it first at this depth.',
    hintFailed: 'Could not work out a hint right now.',
    hintTitle: 'Ask the engine for the best move',
    undoTitle: 'Takes back your last move and the computer’s reply',
    undoAria: 'Take back your last move',
    backToChapter: 'Back to chapter {n}',
    backToTournament: 'Back to the tournament',
    otherSession: 'Another session',
    usedHint:
      'you asked the engine for a hint. No rating, no career, no daily quest — and nothing is taken from anyone either.',
    usedTakeback:
      'you took a move back. No rating, no career, no daily quest — and nothing is taken from anyone either.',

    // ── Why a game announced as rated is not ─────────────────────────────
    ratedAnnounceFailed: 'this game will not be rated',
    ratedAnnounceFailedHint:
      'The server could not record the announcement. Go back and start the game again for it to count.',
    unratedNoOpponent: 'the opponent has no announced rating.',
    unratedUnverifiable:
      'a win on time or by the computer resigning cannot be read on the board: nothing can verify it.',
    unratedSetupPosition: 'the game did not start from the initial position.',
    unratedNotAnnounced:
      'it had not been announced before starting. Start it again from the setup screen.',
    unratedMismatch:
      'it does not match what was announced — level, time control or colour changed along the way.',
    unratedTooFast: 'it went by too fast to have been played.',
    unratedTooShort: 'it is under ten half-moves.',
    unratedTooSoon: 'only one rated game per minute.',
    unratedUnavailable:
      'the rating service was unavailable. The game is archived, it does not count.',
    unratedUnknown: 'the server did not count it.',

    tcMinutes: '{m} min',
    tcIncrement: '{m} + {s}',
    tcUnlimited: 'No limit',
    tcHelp3: 'Three minutes each, no increment. For reflexes.',
    tcHelp5: 'Five minutes each, no increment.',
    tcHelp5i3: 'Five minutes to start, three seconds gained on every move.',
    tcHelp10: 'Ten minutes each: the right pace for learning.',
    tcHelp10i5: 'Ten minutes to start, five seconds gained on every move.',
    tcHelp15i10: 'Fifteen minutes, ten seconds per move: time to calculate.',
    tcHelp30: 'Thirty minutes each, for a proper long game.',
    tcHelpNone: 'No clock. Take all the time you need.',

    opponentStrength: '≈ {elo} Elo · level {n} of {total}',
    ladderLabel: 'Choose the opponent’s level, from 1 to {n}',
    ladderCard: 'Level {n}, {nom}, about {elo} Elo',
    ladderTier: 'Tier “{palier}”. Not sure of your level?',
    ladderTest: 'The level test will tell you',
  },

  live: {
    errors: {
      tooFast: 'Too many actions at once. Wait a moment.',
      missingSlug: 'Missing game identifier.',
      linkUsed: 'This link was already used for a finished game. Create a new game.',
      serverFull: 'The server is already hosting as many games as it can. Try again in a moment.',
      tooManyRooms: 'You already have too many open games. Finish one before creating another.',
      notAPlayer: 'You are not a player in this game.',
      notPlaying: 'The game is not in progress.',
      notYourTurn: 'It is not your turn.',
      flagged: 'Time is up.',
      illegal: 'Illegal move.',
      unknown: 'The server refused the request.',
    },
    connecting: 'Connecting to the game…',
    gameLabel: 'Game {slug}',
    serverDown: 'Game server unreachable',
    serverDownHint:
      'The realtime service is not answering. Check that it is running, or play the computer meanwhile — that works entirely inside your browser.',
    reconnecting:
      'Connection lost — reconnecting. Your seat is kept: you only lose the game if your opponent is waiting, and not before half the time control has gone.',
    waitingPlayer: 'Waiting…',
    disconnected: 'disconnected',
    reviewOver: 'You are looking back at an earlier move. The game is over, there is no rush.',
    reviewLive: 'You are looking back at an earlier move. The clock, however, keeps running.',
    backToLive: 'Back to live',
    hintFailed: 'Could not work out a hint right now.',
    hintAlreadyTold: 'Your opponent has already been told. Ask for another hint.',
    hintWillTell: 'Ask the engine for the best move. Your opponent will be told.',
    hintAria: 'Ask for a hint',
    resignConfirm: 'Resign the game?',
    resignAria: 'Resign the game',
    drawOffered: 'Your opponent offers a draw.',
    drawOfferedHint: 'Accept or decline below.',
    chat: 'Chat',
    chatDialog: 'Game chat',
    chatClose: 'Close the chat',
    chatEmpty: 'Say hello to your opponent.',
    chatPlaceholder: 'Message…',
    chatAria: 'Chat message',
    chatSend: 'Send',
    waitingOpponent: 'Waiting for your opponent…',
    waitingOpponentHint: 'Share the address of this page. The game starts as soon as they arrive.',
    copyLink: 'Copy the link',
    coachPanel: 'The coach',
    aboutMove: 'About {coup} ·',
  },

  friendGame: {
    title: 'Play someone',
    spectating: 'You are watching this game. You can write in the chat, but not play.',
    spectatingWithOthers:
      'You are watching this game, along with {n} people in all. You can write in the chat, but not play.',
    introLive: 'Pick a time control, then send a link or challenge someone from your book.',
    introDays:
      'One move every {jours} days. Both sides need an account — the game has to be able to wait for you.',
    introOneDay:
      'One move a day. Both sides need an account — the game has to be able to wait for you.',
    timeControl: 'Time control',
    timeControlHint:
      '“3 | 2” reads: 3 minutes to start with, and 2 seconds added to your clock on every move you play.',
    orOverDays: 'Or over several days',
    daysShort: 'corr.',
    dayUnit: '{n} d',
    sendLink: 'Send a game link',
    sendLinkDetail:
      'A game with anyone at all. Your opponent needs no account: they click, they play.',
    sendLinkImpossible: 'Over several days, you have to name someone from your book.',
    inviteSomeone: 'Invite someone to join you',
    inviteSomeoneDetail:
      'Send your referral link: they sign up, and you are friends with nothing more to do.',
    signInToChallenge: 'Sign in to challenge a friend',
    signInToChallengeDetail:
      'Without an account the link game works perfectly well — but there is no book to keep anyone in.',
    yourFriends: 'Your friends',
    nobodyYet: 'nobody yet',
    manageBook: 'Manage the book',
    emptyBookBefore: 'Your book is empty. Send the invitation link above, or',
    emptyBookLink: 'look someone up by username',
    emptyBookAfter: 'if they have already signed up.',
    online: 'online',
    offline: 'offline',
    challenge: 'Challenge',
    yourColour: 'Your colour',
    colourRandom: 'Random',
    colourWhite: 'White',
    colourBlack: 'Black',
    colourNote: 'Your opponent takes the other colour. Once the game is open, it is fixed.',
    guestName: 'Your name (optional)',
    guestNameHint: 'Only used so your opponent knows who they are facing.',
    ratedLabel: 'Rated game',
    ratedHint: 'Both players’ ratings will be updated. Requires an account on both sides.',
    noAccountBefore:
      'You are playing without an account: the game will work, but it will be neither rated nor findable afterwards.',
    noAccountLink: 'Sign in or create an account',
    noAccountAfter: '— a username, a password, that is all.',
    categoryNote:
      'The category follows from how long a forty-move game would last: under three minutes is bullet, under eight is blitz, under twenty-five is rapid, beyond that classical. Each keeps its own rating: you can see clearly in rapid and fall apart in blitz.',
    ready: 'The game is ready',
    readyHint: 'Send this link to your opponent. The game starts as soon as they open it.',
    enterGame: 'Enter the game',
    rated: 'Rated',
    casual: 'Casual',
    shareTitle: 'A chess game on Le Coup Parfait',
    shareText: 'Come and play a game!',
    inviteTitle: 'Join me on Le Coup Parfait',
    inviteText: 'Come and play chess with me.',
    linkCopied: 'Link copied',
    linkCopiedHint: 'Send it to your opponent.',
    inviteCopied: 'Invitation link copied',
    copyFailed: 'Could not copy',
    copyFailedHint: 'Select the link and copy it by hand.',
    challengeFailed: 'Challenge failed.',
    challengeSent: 'Challenge sent to {pseudo}.',
    challengeSentHint: 'Waiting for their answer.',
    createFailed: 'Could not create the game.',
    started: 'Game started.',
    startedHint: 'Colours were drawn at random.',
    serverUnreachable: 'The server is unreachable.',
  },

  board3d: {
    noWebgl:
      'This browser does not offer the graphics acceleration it needs. The 2D view plays exactly the same game.',
    switchTo2d: 'Switch to 2D',
    contextLost: 'Your device reclaimed the graphics memory. The game carries on: nothing is lost.',
    backTo2d: 'Back to 2D',
  },

  vision: {
    mistakes: '{n} mistakes',
    mistakesOne: '{n} mistake',
    intro:
      'A square is announced, you click it. Thirty seconds. As long as you have to think to find “f6”, that time is taken from calculating — it is the most profitable reflex to build when starting out.',
    foundAndAccuracy: 'squares found · {taux}% accuracy',
    over: 'Run finished.',
    ready: 'Ready? The first square will appear here.',
    time: 'Time',
    found: 'Found',
    record: 'Record',
    fromBlack: 'See it from Black',
    fromBlackHint:
      'A different exercise, and the one most often missing: you know your own side by heart, never the other.',
    noPenalty:
      'A mistake costs no time: the aim is to build a reflex, not to put yourself under pressure. Aim for thirty squares in thirty seconds — at that pace you no longer search, you see.',
  },

  next: {
    dailyWorth:
      'The same for everyone at your level, and it is worth {xp} of the day’s {total} points. ',
    careerChapter: 'Career · chapter {n}',
    someoneWaits: 'Someone is waiting for you',
    yourTurnAgainst: 'It is your move against {adversaire}',
    opponentOnline: 'They are online, at the board.',
    opponentOffline: 'They have disconnected, but the game still stands.',
    playMyMove: 'Play my move',
    gamesWaiting: '{n} games are waiting for your move',
    oneGameWaiting: 'A game is waiting for your move',
    correspondenceDetail: 'In correspondence you play when you like — but you do play.',
    goThere: 'Go there',
    gameInProgress: 'Game in progress',
    gameContinues: 'Your game against {adversaire} carries on',
    gameWaitsOpponent: 'Your game is waiting for an opponent',
    thinking: 'They are thinking. Your seat is kept.',
    nobodyOpened: 'Nobody has opened your link yet.',
    backToBoard: 'Back to the board',
    gameLeftOpen: 'Game left hanging',
    computerLeftOpen: 'Your game against the computer was left open',
    halfMovesPlayed: '{n} half-moves played. It is waiting for you as it was.',
    oneHalfMovePlayed: '{n} half-move played. It is waiting for you as it was.',
    resume: 'Resume',
    dailyChallenge: 'The daily challenge',
    onePositionOnly: 'One position, and one only, until midnight',
    otherQuestsWait: '{n} other quests are waiting below.',
    oneOtherQuestWaits: '{n} other quest is waiting below.',
    lastQuest: 'It is your last quest of the day.',
    findTheMove: 'Find the move',
    aDailyQuest: 'A daily quest',
    pointsOfDay: '{xp} / {total} points for today.',
    questsLeft: ' {n} more quests before midnight.',
    lastQuestBefore: ' Last quest before midnight.',
    careerResumes: 'Your path picks up where you left it.',
    nothingUrgent: 'Nothing urgent',
    allUpToDate: 'Everything is up to date',
    allUpToDateDetail:
      'The challenge is solved, no game is waiting. What is left is the pleasure of playing.',
    playAGame: 'Play a game',
  },

  local: {
    flipBoard: 'Flip the board',
    undoLast: 'Undo the last move',
    gameOver: 'Game over',
    boardTurning: 'Move played — the board is turning…',
    turnTo: '{couleur} to move',
    toMove: 'To move',
    autoFlip: 'Automatic rotation',
    autoFlipHint:
      'The board turns after every move, so each player sees it from their own side. It pauses for a second before turning, long enough to see the move just played. Handy on a phone lying between you.',
  },

  today: {
    title: 'Today',
    done: 'Day done',
    yourQuests: 'Your quests for today',
    pointsAria: 'Points for today',
  },

  myGames: {
    yourUsernameOn: 'your {service} username',
    usernameOn: '{service} username',
    vsComputer: 'Against the computer',
    local: 'Two of you on one screen',
    vsSomeone: 'Against someone',
    won: 'Won',
    lost: 'Lost',
    title: 'Your games',
    hint: 'The ones you played here. One click loads it; all that is left is to start the analysis.',
    collapse: 'Collapse the list',
    versus: 'against {nom}',
    someOpponent: 'an opponent',
    level: '· level {n}',
    showOthers: 'Show the {n} other games',
  },

  moveReport: {
    analysingProgress: 'analysis {n}/{total}',
    centipawnsLost: '{n} centipawns lost',
    title: 'Move quality',
    acplTitle: 'Average loss per move, in centipawns: a pawn is worth a hundred.',
    hideDetail: 'Hide the detail',
    showDetail: 'Show the move-by-move detail',
  },

  guided2: {
    foundIt: 'Found it — that was the move.',
    startPosition: 'The starting position. Press “Next” to begin.',
    otherSide: 'See the board from the other side',
    seeAnswer: 'See the answer',
    endOfGame: 'End of the game',
    skip: 'Skip',
    next: 'Next',
  },

  next2: {
    title: 'What now?',
    andMistakes: ' and {n} serious mistakes.',
    andOneMistake: ' and {n} serious mistake.',
    noSeriousMistake: ' with no serious mistake but no accuracy either.',
    phaseLine: '{phase} — {taux}% accuracy over {coups} moves,{suite}',
    costliestPhase: 'That is the phase that cost you the most.',
    whereItRecurs: 'The positions where this pattern comes back',
    whatProgresses: 'What makes you progress at your level',
  },

  guided: {
    lostGround: 'Here you lost ground. Your turn to find better.',
    tryFirst: 'Play the move you should have played, straight on the board.',
    trySecond: 'Not that one. Look at what your opponent threatens, and what is hanging.',
    tryMore: 'Still not — {n} tries. The answer is waiting if you would rather see it.',
  },

  career2: {
    pointsSuffix: 'career pts',
    pointsAria: 'Career points: {n}',
    pointsBefore: '{n} pts to {rang}',
    rankProgress: 'Progress within the rank',
    lastRank: 'Last rank: there is nothing above it.',
    oldScale:
      'Points recorded under an earlier scale, which the breakdown above cannot reconstruct.',
    dayPointsNote:
      'The “points for today” on the Today card are a different counter: they count your quests for the day, out of {total}, and reset to zero at midnight.',
    seeCareerMap: 'See the career map',
    scale:
      'A lesson is worth {lecon}, a career puzzle {puzzle}, a duel win {victoire}. A finished chapter brings {chapitre}, plus {etoile} per star — and stars are earned by succeeding {sansAide}.',
    noHelp: 'without help',
    xpLines: {
      lecon: 'lessons followed',
      leconOne: 'lesson followed',
      puzzle: 'puzzles solved',
      puzzleOne: 'puzzle solved',
      victoire: 'duel wins',
      victoireOne: 'duel win',
      chapitre: 'chapters finished',
      chapitreOne: 'chapter finished',
      etoile: 'stars earned',
      etoileOne: 'star earned',
    },
    steps: {
      lecon: 'The lesson',
      leconDetail: 'Two to five minutes, on the board',
      puzzles: 'The training',
      puzzlesDetail: '{n} puzzles on the theme',
      puzzlesDetailOne: '{n} puzzle on the theme',
      duel: 'The duel',
      duelDetail: '{n} wins to earn',
      duelDetailOne: '{n} win to earn',
      bilan: 'The review',
    },
    nextLesson: 'Start the lesson',
    nextPuzzles: 'On to the puzzles',
    morePuzzles: '{n} more puzzles',
    morePuzzlesOne: '{n} more puzzle',
    nextDuel: 'Face the opponent',
    moreDuel: 'One more win',
    pointsTowards: '{acquis} / {requis} points to {rang}',
    maxRank: 'Highest rank reached',
    pointsWord: 'points',
    newRank: 'New rank: {rang}',
    starsOutOf3: '{n} stars out of 3',
    starsOutOf3One: '{n} star out of 3',
  },

  moves: {
    start: 'Start',
    previous: 'Previous move',
    stopPlayback: 'Stop playback',
    playThrough: 'Play through the game',
    playThroughLong: 'Play through the game move by move',
    list: 'Move list',
    empty: 'The moves played will appear here.',
    reviewGroup: 'Review the moves',
    firstMove: 'First move (Home)',
    previousArrow: 'Previous move (left arrow)',
    nextArrow: 'Next move (right arrow)',
    lastMove: 'Last move (End)',
  },

  gate: {
    stillFree:
      'Playing, learning, solving puzzles and analysing your games all stay entirely free, without creating anything. The account is free: a username, a password, and the address is optional.',
    lookAnyway: 'Look anyway',
  },

  install: {
    alreadyDone: 'Already done: you are reading this from the installed app.',
    ios: 'On iPhone and iPad, installing goes through the browser: touch the share button, then “Add to Home Screen”. That is also what unlocks notifications.',
    blurb:
      'An icon on your home screen, full screen, without an address bar — and nothing to download from an app store: it is the same site.',
    manual:
      'This browser does not offer installing from the page. Look for “Install” or “Add to Home Screen” in its menu — or the install icon at the right of the address bar.',
  },

  leaderboard: {
    unavailable: 'Leaderboard unavailable',
    unavailableHint: 'The database is unreachable. The rest of the platform works normally.',
    empty: 'Nobody on the leaderboard yet',
    intro: 'Glicko-2 rating, as on the big platforms. You need at least {n} games to appear on it.',
    gamesAndWinRate: '{n} games · {taux}% wins',
    emptyHint:
      'Play {n} rated games in this time control to appear here. It takes two registered accounts for a game to count.',
    conservativeBefore: 'The order is not by raw rating but by a',
    conservativeStrong: 'conservative',
    conservativeAfter:
      ' rating: two standard deviations are subtracted. In practice, a player who has just won three games has enormous uncertainty about their true level, and so does not take first place for it. You have to play regularly for the uncertainty to come down — and therefore to climb.',
    provisionalNote:
      'The question mark next to a rating means it is still provisional: the uncertainty is still wide, and the estimate moves a lot. It takes about ten games to narrow it — more when opponents are far from your level, since a foregone result teaches nothing.',
  },

  verify: {
    alreadyDoneText: '{pseudo}’s address was already confirmed. Nothing more to do.',
    thanksText:
      'Thank you {pseudo}. Your address can be used to recover your password if you lose it — and for nothing else.',
    incompleteLink: 'This link is incomplete.',
    serverUnreachable: 'The server is unreachable.',
    alreadyDone: 'It was already done',
    confirmed: 'Address confirmed',
    accountWorks: 'Your account works: only the address remains to be confirmed.',
  },

  stakesList: {
    pageIntro:
      '{n} openings explained by what they are after, not by their variations: the idea, the pawn structure, each side’s plan, and the trap in the first ten moves.',
    afterE4: 'After 1.e4',
    afterE4Sub: 'The centre taken at once, and the six ways of answering it.',
    afterD4: 'After 1.d4',
    afterD4Sub: 'Slower, more closed, and plans that last thirty moves.',
    noCentrePawn: 'No pawn in the centre',
    noCentrePawnSub: 'The English and the Réti: you control the centre from afar, with pieces.',
    title: 'What is at stake in the openings',
    intro:
      'No variation to memorise. Knowing ten moves of theory is no use if you do not know what you are after on the eleventh — and your opponent leaves the book on the fourth, almost every time. What is left is the plan: it fits in three sentences per opening, and it holds for the whole game.',
    searchPlaceholder: 'Search an opening, an ECO code, a trap…',
    searchAria: 'Search the opening pages',
    noMatch:
      'No page matches “{recherche}”. The explorer, for its part, knows all 3,810 named openings.',
    explorerNote:
      'Your opening is not here? The explorer knows 3,810 of them, recognises them by transposition, and gives statistics by rating band.',
  },

  game: {
    timeLeftOf: 'Time left for {nom}',
    writesToYou: '{nom} writes to you',
    unreadMessages: '{n} unread messages',
    unreadMessagesOne: '{n} unread message',
    yourTurn: 'Your turn',
    opponentTurn: 'Opponent is thinking…',
    thinking: 'Thinking…',
    check: 'Check!',
    checkmate: 'Checkmate',
    stalemate: 'Stalemate — draw',
    draw: 'Draw',
    resign: 'Resign',
    offerDraw: 'Offer draw',
    drawOffered: 'Draw offered',
    acceptDraw: 'Accept draw',
    declineDraw: 'Decline',
    takeback: 'Take back',
    takebackRequested: 'Takeback requested',
    rematch: 'Rematch',
    newGame: 'New game',
    flipBoard: 'Flip board',
    analyse: 'Analyse game',
    moves: 'Moves',
    captured: 'Captured',
    hint: 'Hint',
    showThreats: 'Show threats',
    youWon: 'You won!',
    youLost: 'You lost',
    itsADraw: 'Draw',
    byCheckmate: 'by checkmate',
    byResignation: 'by resignation',
    byTimeout: 'on time',
    byStalemate: 'by stalemate',
    byRepetition: 'by repetition',
    byFiftyMoves: 'by the fifty-move rule',
    byInsufficientMaterial: 'insufficient material',
    ratingChange: 'Rating',
    over: {
      whiteWins: 'White wins',
      blackWins: 'Black wins',
      win: 'You won!',
      loss: 'Defeat',
      draw: 'Draw',
      close: 'Close',
      halfMoves: '{n} half-moves played',
      notRated: 'Unrated game:',
      timeoutNoMate: 'time ran out, but your opponent could no longer mate',
      pgnEvent: 'Le Coup Parfait game',
      seanceTheme: 'Theme of the session',
      seanceNever:
        'The theme did not come up once in this game. It happens — a closed opening produces no open file. The same session on another game will give you something else.',
      seanceFor: 'for you',
      seanceAgainst: 'against you',
      seanceMovesBefore: 'Appeared on your moves',
      seanceMovesAfter: '— find them in the move list, or in the analysis.',
      questTitle: 'Daily quest',
      questDone: '— done',
      questAllDone: 'Every daily quest is done.',
      questRemaining: 'You have {n} quest left today.',
      questRemainingPlural: 'You have {n} quests left today.',
      questTodo: 'Not yet: it takes a win. One more game and it is done.',
      backToQuests: 'Back to the daily quests',
      playAgain: 'Play another game',
      backToMenu: 'Back to the menu',
    },
    reasons: {
      checkmate: 'by checkmate',
      stalemate: 'by stalemate — the king is not in check but no move is possible',
      resign: 'by resignation',
      timeout: 'on time',
      draw: 'by agreement',
      insufficientMaterial: 'insufficient material to mate',
      threefold: 'by threefold repetition',
      fiftyMoves: 'by the fifty-move rule',
      aborted: 'game aborted',
      abandoned: 'game abandoned',
    },

    view2D: '2D view',
    view3D: '3D view',
    switchView: 'Switch view',
  },

  analysis: {
    pgnPlaceholder: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6…\n\nor a full PGN, or a FEN position.',
    doneServer: 'Analysis finished (server engine).',
    doneBrowser: 'Analysis finished (browser engine).',
    engineServer: 'Stockfish on the server',
    engineBrowser: 'Stockfish in the browser',
    hideWhy: 'Hide',
    why: 'Why?',
    winLossPoints: '−{n} pts',
    title: 'Analysis',
    pageTitle: 'Analysis, explained',
    tagShort: 'Move by move, what turned and the best move, explained.',
    moveLine: 'Move {n} · {camp} · {avant} → {apres}',
    winLoss: ' · −{n} win points',
    tagLong:
      'Paste a game and find out, move by move, what turned — with the best move shown on the board and the reason written out in full.',
    noMove: 'No move recognised.',
    noMoveHint: 'Paste a PGN, a FEN or a list of moves.',
    failed: 'The analysis failed.',
    tryAgainSoon: 'Try again in a moment.',
    notFound: 'Analysis not found.',
    notFoundHint: 'It may have been deleted.',
    reopenFailed: 'Could not reopen that analysis.',
    handedOverEmpty: 'The game handed over contained no moves.',
    handedOverEmptyHint: 'Paste the PGN by hand, or play a game again.',
    clipboardUnavailable: 'The clipboard is unavailable.',
    clipboardUnavailableHint: 'Paste the text by hand.',
    onlineGames: 'Your online games',
    onlineGamesHint:
      'Chess.com or Lichess, from the username alone. No account is needed here, and nothing is stored.',
    gameToAnalyse: 'Game to analyse',
    halfMoves: '{n} half-moves',
    pastePlaceholder: 'Paste a PGN, a list of moves or a FEN',
    whichSide: 'Which side are you?',
    neitherSide: 'Neither',
    sideHint: 'The explanations will address this player, including on their opponent’s moves.',
    depthLabel: 'Analysis depth',
    depthHint:
      'Deeper = more reliable, but slower. 18 is enough to catch every mistake a club player makes; 24 to separate two good moves.',
    handedOverReady:
      'Your game is ready, with your side already set. Adjust the depth if you like, then start the analysis.',
    sharedServer:
      'The engine analyses every position at the requested depth, on a shared server — allow about thirty seconds for a full game. That is the price of a free service: no limit on the number, no paid tier, but a single machine.',
    phasePositionsServer: 'Evaluating positions (server engine)',
    phasePositionsBrowser: 'Evaluating positions (browser engine)',
    phaseWriting: 'Writing the explanations',
    abort: 'Abandon the analysis',
    engineNote:
      'The analysis runs first on the server’s native Stockfish. If that is unavailable, it carries on in your browser, a little less deeply.',
    pgnEvent: 'Le Coup Parfait analysis',
    pgnCopied: 'PGN copied',
    pgnCopiedHint: 'Paste it wherever you like: it carries the annotations.',
    copyRefused: 'Copy refused by the browser',
    copyRefusedHint: 'Use “PGN” for the file instead.',
    imageFailed: 'Image not possible',
    imageFailedHint: 'The browser refused to draw the position.',
    imageSaved: 'Image saved',
    imageSavedHint: 'The position, with the last move underlined.',
    gameResult: 'Result of the game',
    backToDashboard: 'Back to the dashboard: curve, alternatives, key moments',
    stepByStepTitle: 'Replay step by step: a board, a sentence, a button',
    stepByStep: 'Step by step',
    voiceOn: 'Voice on',
    voiceOff: 'Voice off',
    copyPgnTitle: 'Copy the annotated PGN, to analyse it elsewhere',
    downloadPgnTitle: 'Download the annotated game as PGN',
    saveImageTitle: 'Save the displayed position as a PNG image',
    analyseAGame: 'Analyse a game',
    otherGame: 'Another game',
    recommendedLine: 'Recommended line',
    notReplayable:
      'That move cannot be replayed on this position: explaining it would risk making things up.',
    whatYouCouldPlay: 'What you could have played',
    rankTitle: 'Move ranked {rang} of {total} by the engine',
    moveNotationTitle: 'The move, in chess notation',
    scoreTitle: 'Evaluation of the position after this move, in pawns. Positive: White is better.',
    engineLineTitle: 'Line expected by the engine: {coups}',
    playedTitle: 'The move you played in the game',
    played: 'played',
    bestTitle: 'The engine’s first choice in this position — the one to play',
    best: 'best',
    summary: 'Game summary',
    accuracy: 'accuracy',
    noTurningPoint: 'No move turned the game: the advantage never changed sides abruptly.',
    keyMoments: 'Key moments',
    winner: 'Winner of the game',
    averageLossOf: 'average loss {acpl} centipawns ·',
    performanceOf: 'performance in this game ≈ {elo} Elo',
    performanceTitle:
      'What the moves played in this game are worth, not your rating. A single blunder is enough to lose an otherwise well-played game, and a weak opponent flatters the measure.',

    import: 'Import a game',
    importPlaceholder: 'Paste a PGN, a FEN, or a list of moves…',
    analyse: 'Run analysis',
    analysing: 'Analysing…',
    depth: 'Depth',
    bestMove: 'Best move',
    yourMove: 'Your move',
    evaluation: 'Evaluation',
    evalBar: 'Evaluation bar',
    whyBetter: 'Why it is better',
    engineLines: 'Engine lines',
    openingPlayed: 'Opening played',
    estimatedLevel: 'Estimated level',
    averageLoss: 'Average loss',
    exportPgn: 'Export PGN',
    speak: 'Read aloud',
    stopSpeaking: 'Stop reading',
  },

  ia: {
    title: 'AI assistant',
    optional: 'Optional. Everything else in the app works without it.',
    blurbBefore:
      'The explanation of every move is written by the app, offline and without any key. By plugging in your own account you add one more thing:',
    blurbStrong: 'being able to ask a follow-up question',
    blurbAfter: '— “what if I had played something else?”, “why is that square weak?”.',
    enable: 'Turn the assistant on',
    enableHint: 'You use your own account with the provider of your choice.',
    provider: 'Provider',
    onYourMachine: 'on your machine',
    keyRequired: 'key required',
    keyOptional: 'key optional',
    apiKey: 'API key',
    pasteKey: 'Paste your key here',
    keyOptionalPlaceholder: 'Leave empty if the service does not ask for one',
    keyStorage: 'Saved in this browser only — never on our servers, never tied to your account.',
    model: 'Model',
    refreshList: 'Refresh the list',
    pickModel: '— pick a model —',
    savedModel: '{modele} (saved)',
    noModelLocal: 'No model detected. Start the service, download a model, then refresh.',
    noModelRemote:
      'Enter your key to see the list, or type the model identifier used by your provider.',
    retiredModel:
      'This model belongs to a retired generation. It will fail on the first call — pick a newer one.',
    seeModels: 'See the models offered by {fournisseur} ↗',
    answerLength: 'Answer length',
    lengthShort: 'very brief',
    lengthMedium: 'measured',
    lengthLong: 'expansive',
    testConnection: 'Test the connection',
    testOk: 'it answers',
    testKo: 'failed',
    answers: 'The assistant answers.',
    noAnswer: 'The assistant does not answer.',
    remoteKeyBefore: 'Your key is saved in this browser, and it is only sent to',
    remoteKeyMiddle: '. Since browsers forbid calling these services directly, the request',
    remoteKeyStrong: 'passes through this server',
    remoteKeyAfter:
      ', which copies it across without keeping anything. On an instance you do not host yourself, that means trusting the host — a local service does not have that drawback.',
    localKeyBefore: 'This service runs on your machine: your browser talks to it directly, and',
    localKeyStrong: 'nothing passes through our servers',
    localKeyAfter:
      '. If the call fails, it is usually because it has to be allowed to answer web pages (the',
    localKeyEnd: 'variable for Ollama).',
    keysCleared: 'Keys erased from this browser.',
    clearKeys: 'Erase all my keys from this browser',
    otherService: 'Another service',
    removeProvider: 'Remove {nom}',
    customName: 'Name',
    customUrl: 'API address',
    customUrlHint: 'The OpenAI-compatible root, without “/chat/completions”.',
    customAdd: 'Add',
    addOpenAiService: 'Add an OpenAI-compatible service',
    badAddress: 'Invalid address.',
    badAddressHint: 'For example: https://api.groq.com/openai/v1',
    defaultCustomName: 'OpenAI-compatible service',
  },

  commentary: {
    winChancesLost: ' · −{n} pts of winning chances',
    best: 'best',
    listenWhy: 'Listen to why {coup}',
    listenExplanationOf: 'Listen to the explanation of {coup}',
    playInstead: '{coup} — play this instead',
    notReplayable: 'That move cannot be replayed on this position.',
    notReplayableHint: 'Explaining it would risk making things up.',
    placeholder:
      'Commentary mode is on. After every move you will see what you could have played, with the three best options and the reason for each.',
    staleBefore: 'About your move',
    staleAfter: '— the position has changed since.',
    check: 'Check',
    mate: 'Mate',
    review: 'Look again',
    analysing: 'Analysing the move…',
    muteVoice: 'Mute the voice',
    unmuteVoice: 'Turn the voice on',
    replayFull: 'Hear the full explanation again',
    replay: 'Hear the explanation again',
    hideBestMove: 'Hide the suggested move on the board',
    showBestMove: 'Show the suggested move on the board',
    bestMoveAria: 'Show the suggested move',
    resume: 'Resume the game',
    pauseToRead: 'Pause to read',
    resumeShort: 'Resume',
    pauseShort: 'Pause',
    whatYouCouldPlay: 'What you could have played',
    played: 'played',
    yourMoveBest: 'Your move — the best one',
    nothingBetter: 'The engine had nothing better.',
    disable: 'Turn commentary mode off',
    toggleTitle: 'Comment on every move, live',
    mode: 'Commentary mode',
  },

  quality: {
    brilliant: 'Brilliant',
    great: 'Great move',
    best: 'Best move',
    excellent: 'Excellent',
    good: 'Good',
    book: 'Book',
    forced: 'Forced',
    inaccuracy: 'Inaccuracy',
    mistake: 'Mistake',
    blunder: 'Blunder',
    miss: 'Missed win',
  },

  legend: {
    aria: 'What the arrows mean',
    safeWins: 'You win material',
    safeWinsTitle: 'This move gains more than it risks.',
    safeSquare: 'Safe square',
    safeSquareTitle: 'The piece is not attacked there, or it is defended.',
    evenTrade: 'Even trade',
    evenTradeTitle: 'You lose as much as you take.',
    losesPiece: 'You lose the piece',
    losesPieceTitle: 'The piece would be taken there without enough compensation.',
    played: 'Your move',
    playedTitle: 'The move you have just played.',
    playedBad: 'Your move (mistake)',
    playedBadTitle: 'The move played: the engine rates it clearly worse.',
    best: 'Play this instead',
    bestTitle: 'What you should have played instead of your move, in the previous position.',
    hint: 'Hint',
    hintTitle: 'The move suggested by the hint.',
    look: 'Worth looking at',
    lookTitle: 'What the coach is showing you.',
    danger: 'Threat',
    dangerTitle: 'An opponent move to watch out for.',
    solution: 'The solution',
    solutionTitle: 'The expected move.',
    yourMoveNamed: '{coup} — your move',
    insteadNamed: '{coup} — instead of your move',
    playedNamed: '{coup} — the move played',
    mistakeNamed: '{coup} — mistake',
  },

  learn: {
    title: 'Learn',
    subtitle: 'Guided lessons, at your pace, with a board and a voice.',
    pageTitle: 'Learn chess',
    intro:
      '{lecons} guided lessons, {etapes} steps, a voice that explains every move. You can start knowing nothing — the first lesson begins with an empty board.',
    yourProgress: 'Your progress',
    lessonsOf: '{faites} / {total} lessons',
    resumeWhere: 'Pick up where you left off',
    whereToStart: 'Where to start',
    chapterN: 'chapter {n}',
    stepOf: 'step {n} of {total}',
    stepsCount: '{n} steps',
    chaptersCount: '{n} chapters',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    chapterHeading: 'Chapter {n}',
    doneOf: '{faites} / {total} done',
    resumable: 'can be resumed',
    totalHours:
      'About {n} hours of content in all. No lesson is locked: go wherever you like, in whatever order you like.',
    palierTitle: 'Your tier',
    palierBlurb:
      'The curriculum ordered by what costs you the most points at your level, and the patterns you really do miss.',
    palierDetail: 'From your rating, or a twelve-position test',
    principesTitle: 'Principles and checklist',
    principesBlurb:
      'Four questions to ask before every move, and the principles of the three phases — each with its exception.',
    principesDetail: 'The checklist also shows during your games',
    ecouteTitle: 'Listen to the curriculum',
    ecouteBlurb:
      'The lessons read out loud, with nothing to touch. For revising while doing something else.',
    ecouteDetail: '{etapes} steps, played one after another',
    seanceTitle: 'Coaching session',
    seanceBlurb:
      'A game with a theme announced before you start, and a debrief telling you where that theme showed up.',
    seanceDetail: 'Opponent matched to your tier',

    chapters: 'Chapters',
    lessons: 'lessons',
    minutes: 'min',
    start: 'Start',
    resume: 'Resume',
    completed: 'Completed',
    locked: 'Locked',
    nextLesson: 'Next lesson',
    previousLesson: 'Previous lesson',
    yourTurnToPlay: 'Your turn: play the move shown.',
    correct: 'Correct!',
    tryAgain: 'Not quite — try again.',
    showMe: 'Show me',
    replay: 'Replay',
    progress: 'Progress',
    levels: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    },
  },

  train: {
    title: 'Train',
    intro:
      'The same positions, four ways of using them: finding the right move, recognising it fast, solving one a day — or using them to measure your level.',
    puzzles: 'Puzzles',
    puzzlesBlurb:
      'One position, one move to find. The difficulty follows yours, and a mistake does not close the exercise.',
    puzzlesDetail: '6 million positions · 12 themes · personal rating',
    rush: 'Puzzle rush',
    rushBlurb:
      'As many positions as you can before time runs out. You stop calculating and start recognising.',
    rushDetail: '3 minutes, 5 minutes or survival · three mistakes and the run ends',
    daily: 'Daily challenge',
    dailyBlurb:
      'A single position, the same one for everybody at your level. The next one arrives at midnight.',
    dailyDetail: 'Counts towards your streak and the daily quests',
    dailyDone: 'done',
    levelTest: 'Level test',
    levelTestBlurb:
      'Twelve positions, harder or easier depending on your answers. At the end, an estimated level and what to work on.',
    levelTestDetail: 'Six minutes · touches neither your Elo nor your puzzle rating',
  },

  progress: {
    title: 'Improve',
    intro:
      'Start by finding out where you stand: your tier shows what is costing you points, and everything else lines up behind it.',
    metaDesc:
      'Your tier, the level test, guided lessons, the career and puzzles, all in one place.',
    palier: 'Your tier',
    palierBlurb: 'What costs the most points at your level, and the patterns you actually miss.',
    palierDetail: 'Based on your rating, or on the level test',
    levelTest: 'Level test',
    levelTestBlurb:
      'Positions that get harder or easier depending on your answers. At the end, a tier and what to work on.',
    levelTestDetail: 'Touches neither your Elo nor your puzzle rating',
    lessons: 'Guided lessons',
    lessonsBlurb: 'A board, a voice that explains every move, and nothing locked.',
    lessonsDetail: '{n} lessons, from the rules to an opening repertoire',
    career: 'Career',
    careerBlurb: 'Chapters to get through, each with a lesson, puzzles and a duel.',
    careerDetail: 'Needs an account, to keep your progress',
    puzzles: 'Puzzles',
    puzzlesBlurb: 'A position, one move to find. The level follows yours.',
    puzzlesDetail: 'A mistake does not end the exercise',
    daily: 'Daily challenge',
    dailyBlurb: 'The same position for everyone at your level. The next one arrives at midnight.',
    dailyDetail: 'Counts towards your streak',
    dailyDone: 'done',
    moreTitle: 'Going further',
  },

  level: {
    title: 'Level test',
    intro:
      'Twelve positions, harder or easier depending on your answers. At the end, an estimated level and the list of what earns you points right now.',
    howItWorks: 'How it works',
    how1: 'One position, one move to find, and on to the next. If you find it, the next is harder; if not, easier. There is no hint and no second try — that is what makes the measurement usable.',
    how2: 'The positions come from the Lichess catalogue, and each carries its own rating, established over millions of attempts. So this is not an opinion about your play, it is a measurement.',
    how3: 'Nothing is sent to any rating: this test touches neither your puzzle rating nor your Elo. Allow six minutes.',
    lastTest: 'Last test: {elo} on {date}. Taking it again will replace that result.',
    start: 'Start the test',
    seeMyTier: 'See my tier',
    loadFailed: 'Could not load a position.',
    serviceDown: 'The puzzle service is unreachable.',
    needsCatalogue:
      'The test needs the puzzle catalogue. If it has not been imported yet, the command is in the README.',
    levelSetFailed: 'Your level is measured, but the starting opponent could not be set.',
    positionOf: 'Position {n} of {total}',
    positionRating: 'rating {cote}',
    whiteToPlay: 'White to play — find the best move.',
    blackToPlay: 'Black to play — find the best move.',
    found: 'Found',
    missed: 'Missed',
    theMoveWas: 'The move was',
    nothingToFix:
      'Nothing to fix right now: the test measures, it does not teach. You will meet this pattern again in the list at the end.',
    nextPosition: 'Next position',
    seeMyLevel: 'See my level',
    whereWeAre: 'How the measurement stands',
    nextAround: 'Next position aimed at around',
    narrowing: 'The estimate narrows with every answer.',
    yourLevel: 'Your estimated level',
    foundOf: '{reussies} / {total} found',
    inGame: 'in games, roughly — the scale of the app’s rating',
    range: 'between {bas} and {haut}',
    pickedUp: 'Your level test has been picked up',
    pickedUpHint:
      'Your starting rating is {elo} instead of starting from scratch. Your first games will adjust it.',
    unknownPosition: 'One of the positions in the run cannot be found.',
    incoherentRun: 'This run does not look like a test played through.',
    onPuzzleScale: 'on the puzzle scale',
    twoNumbers:
      'The two numbers differ, and that is normal: a puzzle announces there is something to find, a game never does. Keep the first to pick opponents; the second to pick exercises.',
    yourTier: 'Your tier',
    firstOpponentBefore: 'First opponent offered against the computer:',
    firstOpponentAfter:
      'All {paliers} steps stay reachable with the slider, in both directions, and your rating only moves by playing.',
    whatProgresses: 'What makes me progress now',
    playAtThisLevel: 'Play at this level',
    retake: 'Take the test again',
  },

  tier: {
    title: 'Your tier',
    intro:
      'The curriculum ordered not by chapters but by what costs you the most points at your level. Nothing new to learn here — only the order in which to do it.',
    yourLevel: 'Your level',
    nextTierFrom: 'Next tier from {min}: {nom}.',
    takeTest: 'Take the level test',
    retake: 'Take the test again',
    fromDeclaration:
      'This number comes from your answer at sign-up, not from a measurement. Twelve positions are enough to check it.',
    stale:
      'Your measurement is {jours} days old. If you have worked since, this programme is no longer yours.',
    testNeutral:
      'Twelve positions, six minutes. The test touches neither your rating nor your puzzle rating.',
    unknown:
      'We do not know where you are yet — no rated game, no puzzle. Twelve positions are enough to find out, and the test touches no rating.',
    showAnyway: 'I am a beginner, show me anyway',
    weaknesses: 'What you really do miss',
    weaknessesCount: '{n} patterns measured',
    weaknessesHint:
      'Worked out from your puzzles, pattern by pattern. Patterns seen fewer than five times are not counted: two failures out of two mean nothing.',
    weaknessFound: '{n} found out of {total}',
    bestReturn: 'What pays off most, right now',
    tierNamed: 'Tier',
    eloAndAbove: '{min} Elo and above',
    eloRange: '{min} – {max} Elo',
    leversCount: '{n} levers, in order of return',
    practise: 'Putting it into practice',
    practiseHint:
      'A coaching game at your tier: a matched opponent, a theme announced before you start, commentary mode on, and a debrief telling you where the theme showed up.',
    session: 'Coaching session',
    sixTiers: 'The six tiers',
    backToMine: 'Back to my tier',
    alreadySeen: 'already seen',
    lessonNamed: 'Lesson · {titre}',
    guidedLesson: 'Guided lesson',
    puzzlesOnTheme: 'Puzzles on this theme',
    inGameSpeed: 'in {cadence}, over {parties} games',
    inGameSpeedOne: 'in {cadence}, over {parties} game',
    provisional: '— still provisional',
    provisionalLeft: '— still provisional: at least {n} games to settle it',
    testedOn: ' of {date}',
  },

  principles: {
    title: 'Principles and checklist',
    intro:
      'Four questions to ask before you play, and {n} guiding principles — each with the case where it does not apply.',
    theMemo: 'the checklist',
    beforeEveryMove: 'Before every move.',
    memoHint:
      'Ten seconds, in this order. The first question is the most important and the most neglected: at every weak level, the commonest fault is playing your own plan without having looked at the move opposite.',
    showInGame: 'Show the checklist during my games',
    showInGameHint:
      'A collapsible panel under the board, against the computer. Turn it off as soon as the habit is there — that is the point of every aid.',
    listTitle: 'The principles, and their exceptions',
    shownCount: '{n} shown',
    opening: 'Opening',
    endgame: 'Endgame',
    positional: 'Positional play',
    phase: 'Phase of the game',
    allPhases: 'All',
    middlegameShort: 'Middlegame',
    spokenPrinciple: '{regle} {pourquoi} Except: {sauf}',
    spokenMemo: '{rang}. {question} {comment}',
    practise: 'Putting them into practice',
    practiseHint:
      'A principle you read changes nothing; a principle you have had to apply twenty times in a row changes everything. Coaching sessions announce a theme before you start, precisely for that.',
    readAloud: 'Every principle can be read out loud — the speaker, on the right.',
  },

  elo: {
    title: 'Elo calculator',
    intro:
      'Your rating, your K factor, your games: what the tournament earns or costs you, game by game, and your performance. The formula is FIDE’s.',
    yourRating: 'Your rating',
    ratingRange: 'Between 1000 and 3500.',
    coefficient: 'K factor',
    k40: 'fewer than 30 rated games, or under 18 and below 2300',
    k20: 'the general case, below 2400',
    k10: 'once 2400 has been reached, even after dropping back',
    win: 'Win',
    drawResult: 'Draw',
    loss: 'Loss',
    gamesHint: 'opponent’s rating, then the result',
    yourGames: 'Your games',
    opponentRating: 'Rating of opponent {n}',
    gameResult: 'Result of game {n}',
    removeGame: 'Remove game {n}',
    addGame: 'Add a game',
    summary: 'Summary',
    change: 'Change',
    newRating: 'new rating',
    score: 'Score',
    expected: 'expected',
    performance: 'Performance',
    opponentsAt: 'opponents at',
    onAverage: 'on average',
    formulaNote:
      'Expected score from the logistic formula, with the gap capped at 400 points as FIDE does; performance read from its conversion table, bounded to ±800. The French federation applies the same formula to its national rating.',
  },

  listen: {
    stepHeader: 'step {n} / {total}',
    playing: 'playing',
    paused: 'paused',
    stepOf: 'step {n} / {total}',
    title: 'Listen to the curriculum',
    intro:
      'The curriculum read out loud, with nothing to touch: the coach speaks, the board follows, the next step comes when the sentence ends. For revising while doing something else.',
    revisionBefore:
      'The steps that normally ask you to play a move are played for you: you listen to the solution instead of looking for it. So this is',
    revisionStrong: 'revision',
    revisionMiddle: ', not learning — come back to',
    revisionLink: 'the guided lessons',
    revisionAfter: 'for the first time through, and listen to them afterwards.',
    wholeCurriculum: 'The whole curriculum',
    wouldAskYou:
      'In a lesson, this is where you would be asked: {consigne}. The move is played for you.',
    previousStep: 'Previous step',
    nextStep: 'Next step',
    pause: 'Pause',
    listen: 'Listen',
    previousLesson: 'Previous lesson',
    nextLesson: 'Next lesson',
    doItForReal:
      'Interested in this lesson? Do it for real — {lecon}. What sticks is what you played, not what you heard.',
  },

  puzzles: {
    solutionSpoken: 'The solution is {coup}',
    title: 'Puzzles',
    streakChip: 'streak of {n}',
    subtitle: 'Six million tactical positions, sorted by theme and rating.',
    yourRating: 'Your puzzle rating',
    findTheMove: 'Find the best move',
    whiteToPlay: 'White to play',
    blackToPlay: 'Black to play',
    correct: 'Well spotted!',
    incorrect: 'That is not it.',
    solved: 'Solved',
    next: 'Next puzzle',
    retry: 'Try again',
    showSolution: 'Show solution',
    themes: 'Themes',
    allThemes: 'All themes',
    streak: 'Streak',
    loadFailed: 'Could not load a puzzle.',
    unusable: 'This puzzle is unusable',
    unusableHint:
      'The position of this puzzle does not match its solution — it is unusable. The next one will be fine.',
    noneAvailable: 'No puzzle available',
    emptyBase:
      'The puzzle database is empty. Run the import on the server to fetch the six million Lichess positions.',
    serviceDown: 'The puzzle service is unreachable.',
    spokenWhite: 'White to play. Find the best move.',
    spokenBlack: 'Black to play. Find the best move.',
    onlyOne: 'Find the best move. There is only one.',
    findBest: '— find the best move',
    notIt: 'That is not it. One more try.',
    solutionIs: 'Solution:',
    dailyDone: 'Daily challenge done!',
    dailyAlreadyDone: 'already done today',
    dailyOnlyOne: 'a single position',
    timedRun: 'Timed run',
    solvedTitle: 'Solved!',
    solvedDaily:
      'That was today’s position, the same one for everybody at your level. The next arrives at midnight.',
    solvedFirstTry: 'Found first time. That is exactly what there was to see.',
    solvedAfterTries: 'Well played. Do another on the same theme to anchor the pattern.',
    failedTitle: 'Missed',
    shouldHavePlayed: 'The move was',
    replayRevealed:
      'Play the position again: it is by making the move yourself that you end up recognising the pattern on sight.',
    replayOrReveal:
      'Play the position again, or ask for the solution if you are stuck: it is by making the move yourself that you end up recognising the pattern on sight.',
    whatToSee: 'What there was to see',
    puzzleRating: 'Puzzle rating: {cote}',
    skip: 'Skip',
    restart: 'Start over',
    myQuests: 'My quests',
    leaveDaily: 'Other puzzles',
    seeCategory: 'Show the category',
    accountHint:
      'Create an account to follow your puzzle rating and avoid seeing the same positions again.',
    themeNames: {
      all: 'All',
      fork: 'Fork',
      pin: 'Pin',
      skewer: 'Skewer',
      discoveredAttack: 'Discovered attack',
      hangingPiece: 'Hanging piece',
      mateIn1: 'Mate in 1',
      mateIn2: 'Mate in 2',
      backRankMate: 'Back-rank mate',
      sacrifice: 'Sacrifice',
      promotion: 'Promotion',
      zugzwang: 'Zugzwang',
      trappedPiece: 'Trapped piece',
      quietMove: 'Quiet move',
    },

    dailyPuzzle: 'Daily puzzle',
  },

  session: {
    opponentLevel: '{elo} Elo · level {niveau}',
    atThisTier: '{n} at this tier',
    title: 'Coaching session',
    countOne: '{n} session',
    countMany: '{n} sessions',
    intro:
      'A game against the computer, with an opponent matched to your level, a theme announced before you start, and a debrief telling you where that theme showed up in your game.',
    whichLevel: 'At what level',
    opponentBefore: 'Your opponent will be',
    opponentAfter:
      ', announced at {elo} Elo — that is, roughly your level. A session is not a test of strength: if the opponent is too strong, the theme never gets a chance to appear.',
    whichTheme: 'On what theme',
    pickForMe: 'Pick one for me',
    beforeStarting: 'Before you start',
    commentEachMove: 'Comment on every move',
    commentEachMoveHint:
      'After each of your moves, the three best options with the reason for each, and the suggested move arrowed. That is what turns a game into a session — but it plays fine without.',
    whatYouWatch: 'What you are watching for',
    atTheEnd: 'At the end',
    debriefPromise:
      'The debrief will count the positions where “{theme}” appeared in your game — for you and against you — and say on which moves.',
    start: 'Start the session',
    pickTheme: 'Pick a theme',
  },

  rush: {
    errorsOf: '{n} mistakes out of {max}',
    errorsOfOne: '{n} mistake out of {max}',
    title: 'Timed run',
    whiteToPlay: 'White to play — find the move, fast.',
    blackToPlay: 'Black to play — find the move, fast.',
    hint: 'One puzzle after another, harder and harder. Three mistakes and the run ends.',
    threeMinutes: '3 minutes',
    threeMinutesHint: 'The tensest. You stop calculating and start recognising.',
    fiveMinutes: '5 minutes',
    fiveMinutesHint: 'Enough to find your rhythm before it bites.',
    survival: 'Survival',
    survivalHint: 'No clock. Three mistakes, and it is over.',
    preparing: 'Getting ready…',
    start: 'Start',
    footer:
      'Ordinary puzzles teach you to find; this one teaches you to recognise. That is what is missing most in fast games.',
    backToPuzzles: 'Back to the puzzles',
    solvedCount: 'puzzles solved',
    solvedOne: 'puzzle solved',
    recordIs: 'Your record:',
    puzzlesWord: 'puzzles.',
    solvedWord: 'solved',
    newRecord: 'New record',
    recordStays: 'Your record stays at {n}.',
    playAgain: 'Play again',
    changeMode: 'Change mode',
    stopRun: 'Stop the run',
  },

  correspondence: {
    daysLeft: '{n} days left',
    dayLeftOne: '{n} day left',
    title: 'Correspondence',
    hint: 'A move whenever you can. Nobody waits in front of a screen.',
    needsAccount: 'Correspondence requires an account',
    needsAccountHint: 'A game that lasts weeks has to find you again from one session to the next.',
    moveRefused: 'Move refused.',
    noGame: 'No game. Start one with someone from your book.',
    newGame: 'New game',
    newGameHint: 'It starts from the play screen, by picking a time control in days.',
    playSomeone: 'Play someone',
    yourTurnIn: 'Your turn — {temps}',
    waiting: 'Waiting',
    finished: 'finished · {resultat}',
    yourTurnShort: 'your turn · {temps}',
    waitingShort: 'waiting',
    overdue: 'past the deadline',
    hoursLeft: '{n} h left',
    resignConfirm: 'Resign this game?',
    pickAGame: 'Pick a game on the left, or start one with someone from your book.',
    versus: 'against {nom}',
    youPlayDay: '· you play {couleur} · {n} day per move',
    youPlayDays: '· you play {couleur} · {n} days per move',
    gameOver: 'Game over — {resultat}.',
  },

  endgames: {
    configurations: '{n} configurations',
    solvedOf: '{n} / {total} solved',
    drawHeld: 'Draw held!',
    missingBase: 'Endgame database missing',
    source: 'Positions taken from {depot}, under the GPL-3.0 licence.',
    missingBaseHint: 'The position file was not found. Run the build from the repository.',
    title: 'Endgame training',
    intro:
      '{n} classified positions. You are given an objective — win or hold the draw — and the computer defends as well as it can. You have to play it out: there is no solution to recite.',
    yourObjective: 'Your objective',
    piecesCount: '{n} pieces',
    solved: 'solved endgame',
    difficultyOf: 'difficulty {n}/5',
    spokenDraw: 'You play {couleur}. Hold the draw.',
    spokenMate: ' There is mate in {n} moves at best.',
    playAndWin: 'You play {couleur}. Win this position.{mat}',
    allFamilies: 'All the families',
    win: 'Win',
    holdDraw: 'Hold the draw',
    mateIn: ' · mate in {n}',
    winWithMate: 'Win — mate in {n} moves at best',
    wonMessage: 'Won. The technique is yours.',
    drawnMessage: 'Draw held. Exactly what was needed.',
    thisExercise: 'this exercise',
    listenInstruction: 'Listen to the instruction',
    youPlay:
      'You play {couleur}. The computer defends to the best of its ability — it will give you nothing.',
    won: 'Won!',
    drawn: 'Draw held',
    missed: 'Objective missed',
    lost: 'Position lost',
    retryWin:
      'The position was winning. Take it again: in an endgame, a single inaccuracy is enough to throw it away.',
    retryDraw: 'You had to hold. Try again, looking for the exact square your king belongs on.',
    acquired: 'Technique acquired. Move on to the next position, a notch harder.',
    fiftyMoves:
      'The fifty-move rule applies: if you make no progress, the game is declared drawn — which is a loss when the objective is to win.',
  },

  clock: {
    sideTime: '{camp} — {temps}',
    noMove: 'No move recorded.',
    noMoveHint: 'Connect an electronic board so the game writes itself.',
    intro:
      'Put the device between the two players. Each taps their own side after playing — as on a mechanical clock. With an electronic board connected you have nothing to touch: the board sees the move, the clock switches, and the game writes itself.',
    start: 'Start — White to play',
    startHint: 'The first tap starts White’s clock without taking anything off it.',
    analyse: 'Analyse the game',
    asSeenByBoard: 'The game, as the board saw it',
  },

  savedAnalyses: {
    sourceLocal: 'Game played here',
    sourceChesscom: 'Imported from Chess.com',
    sourceLichess: 'Imported from Lichess',
    sourcePgn: 'Pasted PGN',
    depth: 'depth {n}',
    accuracy: '{n}% accuracy',
    unshareAria: 'Stop sharing the analysis {blancs} – {noirs}',
    shareAria: 'Share the analysis {blancs} – {noirs}',
    title: 'Your analyses',
    unshare: 'Withdraw sharing: the link will stop working',
    share: 'Share by a link, no account required',
    forget: 'Forget this analysis',
    forgetNamed: 'Forget the analysis {blancs} – {noirs}',
    removeFailed: 'Could not withdraw it.',
    linkRemoved: 'Link withdrawn',
    linkRemovedHint: 'The analysis is no longer reachable through that link.',
    shareFailed: 'Could not share it.',
    linkCopied: 'Link copied',
    shareLink: 'Share link',
    deleteFailed: 'Could not delete it.',
    hint: 'Already computed: reopening them is instant, the engine does not work again.',
  },

  streak: {
    days: '{n} days',
    dayOne: '{n} day',
    daysShort: '{n} d',
    record: 'best: {n}',
    inARow: '{n} days in a row',
    inARowOne: '{n} day in a row',
    goToDaily: 'days in a row — go to the daily challenge',
    seeStreak: 'days in a row — see your streak',
    streakOf: 'Streak of {n}',
    lastSevenDays: 'the last seven days · today on the right',
    resetsToZero: 'One day with nothing, and the flame starts again from zero.',
    todayBefore: 'Today:',
    questsOf: 'quests of {total}.',
    questOf: 'quest of {total}.',
    atStake: ' Your streak is at stake.',
    dailyAlreadyDone: 'Daily challenge already done',
    takeDaily: 'Take the daily challenge',
    ofOneDay: '{n}-day streak',
    ofDays: '{n}-day streak',
    dayCounts:
      'A day counts as soon as any one of the {n} quests is done — and the daily challenge is one of them.',
    otherQuests: 'See the {n} other quests',
  },

  stakes: {
    listenStakes: 'Listen to what is at stake in the {nom}',
    spoken:
      '{nom}. {idee} The structure: {structure} White’s plan: {planBlancs} Black’s plan: {planNoirs} The trap: {piege}',
    forWhite: 'for White',
    forBlack: 'for Black',
    whitePlan: 'White’s plan',
    blackPlan: 'Black’s plan',
    structure: 'The structure',
    trap: 'The trap',
    guidedLesson: 'The guided lesson',
    seeOnBoard: 'See it on the board',
  },

  errors: {
    somethingWrong: 'Something went wrong',
    somethingWrongHint:
      'The screen could not be displayed. It is not your fault, and it is probably not permanent: trying again is usually enough.',
    notFound: 'This page does not exist',
    notFoundHint:
      'The address may be old, or the game, profile or study you are looking for has been deleted.',
    incidentRef: 'Incident reference:',
    backHome: 'Back to the home page',
    playAGame: 'Play a game',
  },

  arenas: {
    running: 'Running',
    scheduled: 'Upcoming',
    finished: 'Finished',
    createFailed: 'Could not create it.',
    created: 'Arena created.',
    createdHint: 'It starts in five minutes.',
    soloBlurb:
      'You are the only human. Three to seven opponents, of chosen or varied strength, and standings by points.',
    title: 'Arenas',
    hint: 'Arrive when you like, leave when you like. As soon as a game ends, you are paired again.',
    namePlaceholder: 'Name of the arena — “Thursday blitz”',
    nameAria: 'Name of the new arena',
    create: 'Create',
    createHint: '3 minutes per game, 45 minutes of arena, starting in 5 minutes.',
    none: 'No arena',
    noneSignedIn:
      'Create one: it will start in five minutes, time enough for the others to arrive.',
    noneSignedOut: 'Sign in to create one.',
    footer:
      'An arena is only worth it with a crowd: with three players it is a waiting room in disguise. Tell your friends before starting one.',
  },

  openings: {
    englishName: 'English name: {nom}',
    movesCount: '{n} moves',
    movesCountOne: '{n} move',
    gamesCount: '{n} games',
    moveGames: '{coup} — {n} games',
    title: 'Openings',
    subtitle: '3,810 openings catalogued, explained and playable.',
    explorer: 'Explorer',
    searchPlaceholder: 'Search an opening, an ECO code…',
    variations: 'variations',
    playThis: 'Play this line',
    mainLine: 'Main line',
    popularity: 'Popularity',
    whiteWins: 'White',
    draws: 'Draws',
    blackWins: 'Black',
    catalogued: '{n} openings catalogued.',
    bothColours: 'You play both colours',
    bothColoursAfter:
      '— nobody answers for you: this is a study board, not a game. Go move by move, on the board or by clicking in the lists, and see where each branch leads.',
    stakesLink: 'What is at stake in the 25 openings played at club level →',
    exactlyListed: 'Position listed exactly.',
    lastKnown: 'Last known position at move {n}. You have left the theory.',
    startHint:
      'Play a first move on the board, or pick an opening from the list. Each branch carries its name and its code: you will see the opening sharpen as you go.',
    unlisted:
      'This position is not catalogued. Play a known move, or pick an opening from the list.',
    continuations: 'Theoretical continuations',
    searchOpening: 'Search an opening or an ECO code…',
    searchAria: 'Search an opening',
    searchTitle: 'Look up an opening',
    searchHint: 'Type a name — Sicilian, French, Queen’s Gambit — or pick an ECO volume above.',
    datasetNote: 'Dataset {source}, public domain (CC0).',
    dataset: 'Dataset',
    bandBeginner: 'Beginner',
    bandClub: 'Club',
    bandStrong: 'Strong',
    whatIsPlayed: 'What is played here',
    coverageBefore: 'The statistics cover the first',
    coverageStrong: '{n} moves',
    coverageAfter:
      '. Beyond that, each position becomes too rare for a percentage to mean anything.',
    tooRare:
      'Fewer than forty games at this level from this position: too few to say anything honest. You are already off the beaten track.',
    footer:
      '{parties} games · move {coup} of {total} covered · the second percentage is the score of the side to move, a draw counting as half a point.',

    masterGames: 'Master games',
  },

  career: {
    tag: 'Career mode',
    title: 'Twelve chapters, one path',
    intro:
      'From “knowing how the pieces move” to “a whole game without a safety net”. Each chapter has a lesson, five puzzles and an opponent chosen for what they force you to work on.',
    needsAccount: 'The career keeps your place.',
    needsAccountHint:
      'It requires an account, for a simple reason: progress across twelve chapters makes no sense if it vanishes when you close the tab. The account is free — a username, a password, and nothing else.',
    restartConfirm: 'Restart the career from the first chapter?',
    restarted: 'Career reset.',
    restartFailed: 'Could not restart.',
    finished: 'Career finished.',
    finishedHint:
      'The twelve chapters are behind you. What comes next is played against humans — that is where the real surprises start.',
    challengeSomeone: 'Challenge someone',
    doItAllAgain: 'Do it all again',
    restart: 'Restart',
    starsTitle: 'Stars earned across all chapters',
    badgesTitle: 'Achievements unlocked',
    losingStreak: '{n} losses in a row — it happens.',
    easedBefore: 'The opponent drops to',
    easedAfter:
      'for this attempt, long enough to find your feet. Going back over the lesson often helps more than one more game: that is where what costs you points is explained.',
    easedNone:
      'Your opponent is already the weakest on the ladder: there is no gentler one. Going back over the lesson often helps more than one more game: that is where what costs you points is explained.',
    reviewLesson: 'Go back over the lesson',
    playAnyway: 'Play anyway',
    comingUp: 'coming up',
    starsOf3: '{n} stars out of 3',
    chapterOf: 'Chapter {n} of {total}',
    allDone: 'Everything is done — the next chapter opens.',
    streakNote: '{n} loss — it does not count against you, only wins move you forward.',
    streakNotePlural: '{n} losses — they do not count against you, only wins move you forward.',
    badges: 'Achievements · {obtenus} / {total}',
  },

  friends: {
    declineRequestOf: 'Decline {pseudo}’s request',
    nowFriends: '{pseudo} had asked you too — you are now friends.',
    requestSent: 'Request sent to {pseudo}.',
    watchGameOf: 'Watch {pseudo}’s game against {adversaire}',
    seeProfileOf: 'See {pseudo}’s profile',
    title: 'My friends',
    hint: 'Add the people you play with, and start a game in one click.',
    needsAccount: 'The book requires an account',
    needsAccountHint:
      'Friends are found by their username: so you need one. Creating it takes ten seconds and asks for no email address.',
    challengeSent: 'Challenge sent to {pseudo}.',
    challengeSentHint: 'Waiting for their answer.',
    copyRefused: 'Copy refused by the browser.',
    copyRefusedHint: 'Select the link by hand.',
    inviteTitle: 'Invite someone who is not here yet',
    inviteHint:
      'Send this link. They create their account and you are friends straight away, with no request to accept.',
    oneRequest: 'One friend request',
    manyRequests: '{n} friend requests',
    accept: 'Accept',
    decline: 'Decline',
    addExisting: 'Add someone already signed up',
    searchPlaceholder: 'Username…',
    searchAria: 'Search for a player',
    nobodyNamed: 'Nobody by that name. Send the invitation link above instead.',
    add: 'Add',
    myBook: 'My book',
    timeControl: 'Time control',
    emptyBook:
      'Nobody yet. Send the invitation link to someone, or look up their username if they have already signed up.',
    cancelChallenge: 'Withdraw this challenge',
    challengeSomeone: 'Challenge {pseudo}',
    play: 'Play',
    removeFromBook: 'Remove {pseudo} from the book',
    remove: 'Remove {pseudo}',
    pendingRequests: 'Friend requests pending:',
    pendingGames: 'Games waiting',
    linkGame: 'Game by link',
    ratedSuffix: ' · rated',
    join: 'Join',
    deleteGame: 'Delete this game',
    expired: 'expired',
    expiresIn: 'expires in {temps}',
    online: 'Online',
    offline: 'Offline',
  },

  password: {
    title: 'Forgotten password',
    disabled: 'Recovery by email is not enabled on this server.',
    intro: 'Enter your account’s address: we will send you a link to choose a new one.',
    notPossible: 'Not possible here yet',
    notPossibleHint:
      'This server does not send email at the moment: so there is no way to send you a reset link.',
    askTheHost:
      'Write to whoever hosts this instance — they can give you back access to your account directly. Your password itself has not changed.',
    backToSignIn: 'Back to sign-in',
    sent: 'It has been sent',
    sentBefore: 'If an account uses this address',
    sentStrong: 'and it has been confirmed',
    sentAfter: ', a link has just gone out. It is valid for one hour.',
    nothingReceived:
      'Nothing received? The address may not be the account’s, or may never have been confirmed — in which case it cannot be used to get back in.',
    emailLabel: 'Email address',
    emailHint: 'The one you gave when you signed up.',
    sending: 'Sending…',
    sendLink: 'Send the link',
    requestFailed: 'Request failed.',
    serverUnreachable: 'The server is unreachable.',
    noEmailNote:
      'No address on your account? An account without a confirmed address cannot be recovered — that is the price of asking for nothing at sign-up.',
  },

  profile: {
    unavailable: 'Profile unavailable',
    addressConfirmed: 'Address confirmed: {adresse}',
    title: 'Profile',
    rating: 'Rating',
    eloAndPeak: 'Elo {elo} · peak {record}',
    winsShort: '{n} W',
    drawsShort: '{n} D',
    lossesShort: '{n} L',
    provisional: 'provisional',
    gamesPlayed: 'games',
    winRate: 'Win rate',
    bestWin: 'Best win',
    statistics: 'Statistics',
    ratingHistory: 'Rating history',
    strengths: 'Strengths',
    weaknesses: 'To work on',
    memberSinceDate: 'Member since {date}',
    sinceGames: 'since {date}, over {parties} rated games.',
    seeYouSoon: 'See you soon!',
    deleteFailed: 'Could not delete it.',
    gameNotFound: 'Game not found.',
    gameNotFoundHint: 'It may have been deleted.',
    analysisFailed: 'Analysis not possible.',
    noSuchAccount: 'No account with the username “{pseudo}”.',
    serviceDown: 'The profile service is not answering. Try again in a moment.',
    seeLeaderboard: 'See the leaderboard',
    yourRatings: 'Your ratings',
    theirRatings: 'Their ratings',
    detailedStats: 'Detailed statistics',
    noRatedGame: 'No rated game',
    noRatedGameHint: 'Ratings will appear after the first rated game against another account.',
    challengeFriend: 'Challenge a friend',
    ratingHistoryTitle: 'Rating over time',
    recentGames: 'Recent games',
    noGameSaved: 'No game saved',
    unlistedOpening: 'unlisted opening',
    halfMoves: '{n} half-moves',
    accuracySuffix: ' · {n}% accuracy',
    analyseThisGame: 'Analyse this game',
    analyseAgainst: 'Analyse the game against {adversaire}',
    forgetThisGame: 'Delete this game from your history',
    forgetAgainst: 'Delete the game against {adversaire}',
    collapseList: 'Collapse the list',
    showOthers: 'Show the other {n} games',
    yourAccount: 'Your account',
    signOut: 'Sign out',
    highestLowest: 'Highest: {max} · lowest: {min}',
    today: 'today',
    yesterday: 'yesterday',
    daysAgo: '{n} d ago',
    weeksAgo: '{n} w ago',
    emailToConfirm: 'Address to confirm',
    emailNoMail:
      ' This server does not send email yet: confirmation is not possible for now, so the address is of no use. Nothing is lost, it stays saved.',
    emailUntilThen: ' Until that is done, it cannot be used to recover your password.',
    linkResent: 'Link resent.',
    linkResentHint: 'Check your inbox.',
    emailSent: 'Sent',
    emailUnavailable: 'Unavailable',
    emailConfirm: 'Confirm',

    memberSince: 'Member since',
  },

  stats: {
    whatMeans: 'What {mot} means',
    colourSplit: '{blancs} with White, {noirs} with Black',
    title: 'My statistics',
    hint: 'Over your {n} finished games.',
    needsAccount: 'Statistics require an account',
    needsAccountHint:
      'They are worked out from your saved games: so we need to know which ones are yours.',
    noGame: 'No rated game yet',
    noGameHint:
      'Play a few games against a friend: your statistics will appear here, opening by opening.',
    days30: '30 days',
    year1: '1 year',
    all: 'All',
    allGames: 'All games',
    asWhite: 'With White',
    asBlack: 'With Black',
    gamesCount: '{n} games',
    weakSpot: 'Your weak spot:',
    thisOpening: 'this opening',
    unlistedOpening: 'Unlisted opening',
    weakSpotAfter:
      '— you score {taux}% there over {parties} games. That is the line most worth working on.',
    byOpening: 'By opening',
    noOpening: 'No opening played at least three times: too early to draw anything from it.',
    bySpeed: 'By time control',
    howGamesEnd: 'How your games end',
    wonCount: '{n} won',
    wonOne: '{n} won',
    scoreBefore: 'You score',
    scoreAround: 'around {heure}:00, against',
    scoreAgainst: 'around {heure}:00.',
    serverHour:
      'Server time, not yours: players’ time zones are not stored. The gap still means something, the exact hour less so.',
    clickToExplain:
      'The name of an opening, a time control or an ending opens up: you will find what it means there.',
    endings: {
      checkmate: 'Checkmate',
      resigned: 'Resignation',
      timeout: 'Time out',
      draw: 'Draw',
      stalemate: 'Stalemate',
      abandoned: 'Opponent left',
      aborted: 'Aborted',
    },
  },

  notifications: {
    title: 'Notifications',
    thisDeviceOnly: 'On this device only.',
    iosNeedsInstall:
      'On iPhone and iPad, notifications only work once the app is installed. Touch the share button, then “Add to Home Screen”, and come back here from the icon.',
    unsupported: 'This browser cannot receive notifications.',
    needsAccount: 'An account is needed: an invitation is addressed to someone.',
    refused:
      'Notifications have been refused for this site. The browser will not ask again — you have to allow them in its settings, next to the site address.',
    active: 'This device will be notified.',
    whenWaiting: 'When someone is waiting for you',
    whenWaitingHint:
      'A game offered, a friend request, a move played against you by correspondence.',
    dailyChallenge: 'Daily challenge',
    dailyChallengeHint: 'A reminder at the end of the day, if you have not touched it yet.',
    sendTest: 'Send a test',
    stop: 'Stop receiving them',
    blurb:
      'Be told when a friend invites you to play, and reminded of the daily challenge. Nothing else: no news, no nagging.',
    enable: 'Turn on notifications',
  },

  settings: {
    title: 'Settings',
    subtitle: 'Everything applies right away and stays saved in your browser.',
    tabsLabel: 'Groups of settings',
    tabs: {
      apparence: 'Appearance',
      echiquier: 'Board',
      son: 'Sound and voice',
      ia: 'AI assistant',
      notifications: 'Notifications',
    },

    appearance: 'Appearance',
    theme: 'Theme',
    themeHint: 'Changes the mood of the whole app.',
    themes: {
      aurora: 'Dark',
      clair: 'Light',
    },

    board: 'Board',
    boardTexture: 'Squares',
    pieceSet: 'Piece set',
    pieceSetHint: 'All free-licensed — see the Credits page.',
    display: 'Display',
    defaultView: 'Default view',
    pieceMaterial: 'Piece material',
    material: 'Material',
    pieceColours: 'Piece colours',
    whitePiecesColour: 'Colour of the white pieces',
    blackPiecesColour: 'Colour of the black pieces',
    white: 'White',
    black: 'Black',
    colours3dOnly:
      'Applies to the 3D view only: the 2D pieces are vector drawings with fixed colours.',

    coordinates: 'Coordinates',
    coordinatesHint: 'Letters and numbers along the edges of the board.',
    legalMoveHints: 'Legal moves',
    legalMoveHintsHint: 'Shows the squares the selected piece can go to.',
    safetyHints: 'Colour moves by danger',
    safetyHintsHint:
      'Green: the piece is safe there. Red: it would be lost. Gold: the move wins material. A learning crutch — turn it off as soon as you see these things on your own.',
    memo: 'Checklist before every move',
    memoHint:
      'Four questions under the board: what their move changed, what it attacks, what your move leaves hanging, what their nastiest reply holds. No answers given — it is a discipline, not an assistance, and it stays available in rated games.',
    openingName: 'Opening name during the game',
    openingNameHint:
      'Shows the name of the opening being played, updated on every move. It is the most efficient way to learn the names: you see them on your own games.',
    announceOpening: 'Say the opening out loud',
    announceOpeningHint: 'The coach says the name whenever it changes.',
    commentary: 'Commentary mode',
    commentaryHint:
      'After every move, the engine shows what you could have played, with the three best options and the reason for each. Not available against a friend.',
    commentaryPause: 'Wait until you have read it',
    commentaryPauseHint:
      'In commentary mode, your opponent waits after each move until you say “Continue”. Without that pause they reply in a second, and the commentary describes a position that has already moved on.',
    lastMoveHighlight: 'Highlight the last move',
    notation: 'Move notation',
    notationLetters: 'Letters — Nf3, Qxd5+',
    notationFigurine: 'Figurine — ♘f3, ♕xd5+',
    notationHint:
      'Figurine notation is the one used by books and magazines: it does not depend on any language, and you pick up symbols you will find everywhere.',
    whiteAlwaysBottom: 'White always at the bottom',
    whiteAlwaysBottomHint:
      'Freezes the orientation of the board instead of flipping it to your colour. Diagrams in books and lessons are nearly always seen from White.',
    highlightCheck: 'Signal check',
    highlightCheckHint: 'Red halo around the attacked king.',
    premove: 'Premoves',
    premoveHint: 'Play during your opponent’s turn; the move fires as soon as they have played.',
    evalBarInGame: 'Evaluation bar during the game',
    evalBarInGameHint:
      'Not recommended: seeing the evaluation while you play stops you from learning to evaluate yourself.',
    animationSpeed: 'Animation speed',
    animationInstant: 'instant',

    effects: 'Visual effects',
    effectsHint: 'Reduce the effects if the interface stutters.',
    effectsHigh: 'Spectacular',
    effectsLow: 'Performance',
    effectsDetail:
      'In spectacular mode: frosted glass, drop shadows, glows, reflections and contact shadows in 3D. In performance mode all of that is off — the app is identical, simply plainer and much lighter.',

    sound: 'Sound and voice',
    soundEffects: 'Sound effects',
    soundEffectsHint: 'A different sound for a move, a capture and a check.',
    voiceEnabled: 'Spoken commentary',
    voiceEnabledHint: 'The coach reads its explanations out loud during lessons and analysis.',
    volume: 'Volume',
    speechEngine: 'Speech engine',
    engineNeural: 'Neural voice (recommended)',
    engineSystem: 'Browser voice',
    engineHint:
      'The neural voice is computed by your own server, offline and without any third-party service. It is markedly more natural, but starts a fraction of a second later.',
    neuralVoice: 'Neural voice',
    neuralVoiceFirst: 'First available voice',
    browserVoiceFallback: 'Browser voice (fallback)',
    voiceSelect: 'Voice',
    systemDefaultVoice: 'System default voice',
    voiceOnline: '(online)',
    noVoices:
      'No voice detected for this language. Install a speech pack from your system settings.',
    voiceRate: 'Rate',
    voicePitch: 'Pitch',
    announceMoves: 'Say every move',
    announceMovesHint:
      'Reads the move out loud — “knight f3”, “takes on e5”, “check”. Useful for playing without staring at the screen.',
    testVoice: 'Test the voice',
    testVoiceNeural: 'Neural voice',
    testVoiceBrowser: 'Browser voice',
    neuralUnavailable: 'Neural voice unavailable: the server offers no installed voice. Run',
    neuralUnavailableAfter: 'then restart the server.',

    language: 'Language',
    languageHint:
      'The interface. Lessons, move explanations and the glossary stay in French or English — those are written texts, not labels.',
    languageGroupLabel: 'Interface language',
    languageCoverage:
      'French and English are complete. The other languages are under way: whatever is not translated yet shows in English, sentence by sentence.',

    account: 'Account',
    reset: 'Restore the default settings',
    resetConfirm: 'Restore every setting to its default?',
    preview: 'Live preview',
    previewHint:
      'Squares “{damier}”, pieces “{pieces}”. Click a piece to see the legal-move hints.',
  },

  editor: {
    pieces: {
      wp: 'White pawn',
      wn: 'White knight',
      wb: 'White bishop',
      wr: 'White rook',
      wq: 'White queen',
      wk: 'White king',
      bp: 'Black pawn',
      bn: 'Black knight',
      bb: 'Black bishop',
      br: 'Black rook',
      bq: 'Black queen',
      bk: 'Black king',
    },
    legalMoves: '{n} legal moves.',
    legalMovesOne: '{n} legal move.',
    title: 'Position editor',
    hint: 'Reproduce a position you saw elsewhere, then analyse it or play it.',
    needAKing: 'There must be a king of each colour.',
    oneKingEach: 'There can only be one king per colour.',
    pawnOnEdge: 'A pawn cannot be on the first or the last rank.',
    impossible: 'Impossible position: a king may already be capturable.',
    incomplete: 'Position incomplete.',
    startingPosition: 'Starting position',
    analyseThis: 'Analyse this position',
    playVsComputer: 'Play it against the computer',
    pieceToPlace: 'Piece to place',
    fenAria: 'Position in FEN format',
  },

  board: {
    arrowExplanation: 'Explanation of the move {coup}',
    title: 'Electronic board',
    hint: 'Play on your own board, the game follows.',
    connect: 'Connect an electronic board',
    promotionOn: 'Promotion on {case} — which piece?',
    pieceQueen: 'Queen',
    pieceRook: 'Rook',
    pieceBishop: 'Bishop',
    pieceKnight: 'Knight',
    disconnect: 'Disconnect',
    upsideDown: 'Board set up the other way round — that is taken into account, nothing to change.',
    noLeds:
      'This board has no LEDs: the squares to fix are listed here rather than shown on the board.',
    toFix: 'To fix',
    pieceInHand: 'Piece in hand',
    ready: 'Ready',
  },

  explain: {
    seeOnBoard: 'See “{terme}” on the board',
    noExplanation: 'No explanation for “{cle}” — a case the app cannot name yet.',
    yourGamesBefore: 'Your games:',
    yourGamesAfter: ', for',
    pointsScored: '% of points scored.',
    endedThusBefore: 'Your games that ended this way:',
    endedThusMiddle: ', of which',
    wonSuffix: 'won.',
    wonSuffixOne: 'won.',
    definingMoves: 'The moves that define it',
    youPlayedItBefore: 'You played it',
    youPlayedItAfter: 'times — of which',
    inGlossary: 'See “{terme}” in the glossary',
    readingBook: 'Reading the opening book…',
    notInBook: 'This opening is not in the book: it comes from the name saved with the game.',
    withWhite: '{n} with White — for',
    exploreOpening: 'Explore this opening',
  },

  homeIn: {
    chapterOf: 'chapter {n} / {total}',
    seeAll: 'see all',
    anOpponent: 'an opponent',
    whiteVsBlack: '{blancs} — {noirs}',
    won: 'Won',
    lost: 'Lost',
    seeTheMap: 'See the map',
    hello: 'Hello {pseudo}',
    dayPoints: '{xp} / {total} points today',
    streakTitle: 'Days in a row with at least one quest done',
    yourPath: 'Your path',
    careerDone: 'Career finished 👑',
    startCareer: 'Start your career',
    careerBlurb: 'Twelve chapters, from the first move to the first clean win.',
    reviewPath: 'Look back over the path',
    start: 'Start',
    lastGames: 'Your last games',
    noGameSaved: 'No game saved.',
    playAGame: 'Play a game',
    unlistedOpening: 'unlisted opening',
    halfMoves: '{n} half-moves',
    yourAnalyses: 'Your analyses',
    noOpeningListed: 'no opening listed',
    getAnalysed: 'Have a game analysed',
    getAnalysedHint:
      'Move by move, what turned and why — with the best move shown on the board. Your analyses stay here.',
    analyseAGame: 'Analyse a game',
  },

  chemin: {
    rankPoints: '{rang} · {xp} pts',
    nextRankAt: '{rang} at {seuil}',
    topRank: 'the highest rank',
    rankAria: 'Career rank: {rang}, {xp} points. See your career',
    tierOf: 'Your tier · {n} of {total}',
    tierUnknown: 'Your tier',
    tierBounds: '{min} – {max}',
    tierBoundsTop: '{min} and up',
    estimatedAt: 'estimated at {elo}',
    tierAria: 'Tier {n} of {total}, {pct}% of the way to the next one',
    whatCostsPoints: 'What costs you points',
    noLevelTitle: 'Where do you stand?',
    noLevelText:
      '{n} positions are enough to place you on one of the {total} tiers, and to know what to work on.',
    takeTest: 'Take the level test',
    nextStep: 'Next step · chapter {n} of {total}',
    chaptersAria: 'Chapter {n} of {total}',
    stepDone: 'done',
    duelAgainst: 'Duel against {adversaire}',
    aboutElo: '≈ {elo}',
    continue: 'Continue',
    careerDone: 'Career complete',
    careerBlurb: '{n} chapters, from your first move to your first clean win.',
    daily: 'Daily challenge',
    dailyTodo: 'To do',
    dailyDone: 'Solved',
    dailyTodoHint: 'One position · play',
    dailyDoneHint: '{xp} / {total} points today',
    streak: 'Streak',
    days: '{n} days',
    daysOne: '{n} day',
    alsoForYou: 'Also for you',
    reviewLastGame: 'Review your last game',
    reviewLastGameAgainst: 'Review your game against {adversaire}',
  },

  daily: {
    pointsOf: '{n} / {total} points',
    title: 'Today',
    questsDone:
      '{faites} quests of {total} · {xp} / {max} points · the next position arrives at midnight',
    oneQuestDone:
      '{faites} quest of {total} · {xp} / {max} points · the next position arrives at midnight',
    drawing: 'Drawing today’s position…',
    unavailable:
      'The daily challenge is unavailable — the puzzle database may not have been imported yet.',
    hint: 'One shared challenge at your level, three quests, all expiring at midnight.',
    doneToday: 'Daily challenge done',
    harder: 'Harder:',
    otherQuests: 'The other daily quests',
    pointsAria: 'Points for today',
    collapse: 'Collapse the daily challenge',
    done: 'Challenge done',
    findTheMove: 'Find the winning move',
    tierLevel: '{tranche} · level {cote}',
    levelOnly: 'Level {cote}',
    comeBackTomorrow: ' · come back tomorrow',
    onePosition: ' · a single position',
    needsAccount: 'The daily challenge requires an account — free, and without advertising.',
    needsAccountHint:
      'It is the same for everybody and counts towards your streak: without an account there would be no way to attribute it, or to find it again tomorrow. Playing, learning and analysing all stay available without creating anything.',
  },

  auth: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    username: 'Username',
    email: 'Email address',
    password: 'Password',
    passwordConfirm: 'Confirm password',
    submitSignIn: 'Sign in',
    submitSignUp: 'Create my account',
    noAccount: 'No account yet?',
    hasAccount: 'Already registered?',
    orGuest: 'or continue without an account',
    emailOptional: 'optional — only used to reset your password',
    usernameHint: '3 to 20 characters: letters, digits, dash and underscore.',
    passwordHint: '8 characters minimum.',
    signInTitle: 'Good to see you again',
    signUpTitle: 'Join **Le Coup Parfait**',
    signInBlurb: 'Pick up your rating, your games and your progress.',
    signUpBlurb: 'A username, a password. That is all, and it is free forever.',
    usernameHintLong: '3 to 20 characters: letters, digits, hyphen, underscore.',
    passwordHintLong: '8 characters minimum. Length counts for more than symbols.',
    forgotPassword: 'Forgotten your password?',
    emailHint:
      'Optional. Only to recover your password if you forget it — you will confirm it from your profile, whenever you like. Never passed on to anyone.',
    emailHintNoMail:
      'Optional — and for now unused: this server does not send email yet, so a lost password cannot be recovered. Pick one you will remember.',
    trySuggestion: 'Try “{pseudo}”',
    continueWithout: 'or carry on without an account →',
    whatAccountAdds:
      'Playing, learning, solving puzzles and analysing your games all work entirely without signing up. The account adds career mode, your saved analyses, the daily challenge, your streak, your rating per time control and the history of your games.',
    invitesYou: '{pseudo} invites you to play',
    pickNameAndPlay: 'Pick a name and step into the game. No account needed.',
    yourName: 'Your name',
    play: 'Play',
    orSignUpBelow:
      'Or create an account below: {pseudo} joins your book, and you keep your rating from one game to the next.',
    gameFailed: 'Could not start the game.',
    serverUnreachable: 'The server is unreachable.',
    accountsUnreachable:
      'The accounts service is unreachable. You can carry on playing without one.',
    welcome: 'Welcome, {pseudo}.',
    welcomeBack: 'Good to see you again, {pseudo}.',
    language: 'Language',
    languageHint:
      'Your account’s language: you will find it again on any device you sign in from. You can change it at any time in your settings.',
    welcomeHint: 'Your account is created. A few settings, and you play.',
    skipAll: 'Skip, I will set this up later',
    nothingFinal: 'Everything lives in your settings and on your profile. Nothing is final.',
    avatarTitle: 'Here is your avatar',
    avatarHint:
      'Drawn at random, so your line stands out in a friends list from day one. Touch another if this one does not suit you.',
    avatarYours: 'Your avatar',
    avatarPick: 'Choose this avatar',
    avatarFailed: 'Could not change it.',
    levelTitle: 'Roughly where are you?',
    levelHint:
      'This sets the first opponent we offer you. Without an answer we start from the weakest — which is of no interest if you already play. Your rating, meanwhile, is earned by playing.',
    levelBeginner: 'I am starting out',
    levelBeginnerHint: 'I am discovering the game, or I just know the rules.',
    levelCasual: 'I play now and then',
    levelCasualHint: 'With family, with friends, without studying.',
    levelRegular: 'I play regularly',
    levelRegularHint: 'Online, I win about one game in two.',
    levelClub: 'I play at a club',
    levelClubHint: 'I have openings, I see the common tactics.',
    levelStrong: 'I am a strong player',
    levelStrongHint: 'Rated, or the online equivalent.',
    eloTitle: 'What is your rating?',
    eloHint:
      'Your Elo, if you know it — your federation’s, or another site’s. It sets the first opponent we offer you, and nothing else: your rating here will be earned by playing.',
    eloField: 'My rating',
    orPlaceYourself: 'Or place yourself roughly',
    orYourRating: 'Or your rating:',
    yourEloAria: 'Your Elo rating',
    dontKnow: 'I do not know — measure it',
    dontKnowHint:
      'Twelve positions, six minutes. No answers to find about yourself, and nothing is sent to your rating.',
    firstOpponentBefore: 'First opponent offered:',
    firstOpponentLevel: 'level {niveau}',
    firstOpponentElo: 'about {elo} Elo',
    firstOpponentAfter: 'All {paliers} steps stay reachable with the slider, in both directions.',
    themeTitle: 'Choose your mood',
    themeHint:
      'The change is immediate, you see what you pick. “Contrast” is there for screens in full sunlight and for tired eyes.',
    coachTitle: 'Should the coach come along?',
    coachHint:
      'This is what sets this app apart from a plain chessboard: after every move, what it was worth, what you could have played, and why.',
    coachCommentaryHint:
      'Recommended when starting out. It switches off mid-game, with one click on the panel.',
    coachVoice: 'Read the explanations out loud',
    coachVoiceHint:
      'Handy for keeping your eyes on the board. No effect if your device is on silent.',
    notificationsTitle: 'Be told when a friend invites you',
    notificationsHint:
      'An invitation expires in five minutes: without a notification it dies in a phone left in a pocket. Nothing else will be sent to you — no news, no reminders.',
    notificationsOn: 'It is on for this device.',
    notificationsEnable: 'Turn on notifications',
    notificationsRefused:
      'Your browser has refused them for this site and will not ask again. You can allow them again next to the site address.',
    installManualTitle: 'Put it on your home screen',
    installManualHint:
      'Touch your browser’s share button, then “Add to Home Screen”. On iPhone and iPad that is also what unlocks notifications — without it you will not know a friend has invited you.',
    installNoStore:
      'Nothing to download from a store: it is the same site, sitting next to your other apps.',
    installTitle: 'Install the app',
    installHint:
      'An icon on your home screen, full screen, without an address bar. Nothing to download from a store: it is the same site.',
    install: 'Install',
    installDone: 'It is done, or your browser handles it from its own menu.',

    errors: {
      usernameTaken: 'That username is taken.',
      invalidCredentials: 'Wrong username or password.',
      weakPassword: 'Password too short (8 characters minimum).',
      invalidUsername: 'Invalid username: 3 to 20 alphanumeric characters.',
      usernameTooShort: 'Username too short: three characters minimum.',
      usernameTooLong: 'Username too long: twenty characters maximum.',
      usernameCharacters:
        'A username takes no space and no accent: it doubles as your profile’s address. Letters, digits, hyphen and underscore only.',
      linkExpired: 'That link has expired, or matches nothing. Ask for a new one.',
      emailTaken: 'That address is already in use.',
      generic: 'Something went wrong. Please try again.',
    },
  },

  about: {
    licence: 'Free software · AGPL-3.0',
    title: 'About Le Coup Parfait',
    whatBefore: 'Le Coup Parfait is a chess platform built to',
    whatStrong: 'learn',
    whatAfter:
      ', not just to play. The difference comes down to one thing: when you make a mistake, the tool does not merely show a number — it tells you what you missed, in the words chess players use with each other.',
    freeTitle: 'Why it is free',
    free1:
      'Because nothing here is expensive. The engine — Stockfish — is free and open source. The opening and puzzle datasets are public domain, given by Lichess. The pieces and the sounds are free-licensed. The speech synthesis is your operating system’s, and goes through no paid service.',
    free2:
      'That leaves only hosting, and this app is built to run on a modest machine. So there is no paid feature, no subscription, no daily limit — and none of that is planned for later either.',
    dataTitle: 'What happens to your data',
    data1:
      'No tracker, no advertising, no audience analytics. No request is sent to a third-party domain: even the fonts are served from this server, precisely so that your IP address does not go elsewhere.',
    data2:
      'Your settings live in your browser. If you create an account, we store a username, a password hash, your ratings and your games — nothing else. The email address is optional and only serves to recover a forgotten password.',
    howTitle: 'How it works',
    how1: 'Two engines work together. In your browser, a WebAssembly build of Stockfish gives an instant opinion after every move, without sending anything anywhere. On the server, a native build runs at full strength for complete game analyses.',
    how2Before: 'The explanations, though, do not come from a language model but from a',
    how2Strong: 'geometric analyser',
    how2After:
      'written for this project: it recognises forks, pins, skewers, passed pawns and outposts on the board — some forty patterns — and writes from that. A direct consequence: what it states is always checkable on the board, and the same position always produces the same explanation.',
    selfHostTitle: 'Host it yourself',
    selfHostBefore:
      'The code is under the AGPL. You can download it, change it and run it at home — a',
    selfHostAfter:
      'is enough. That is even the intended use: one instance for you and your friends, depending on nobody.',
    numbersTitle: 'In a few numbers',
    openings: 'named openings',
    puzzles: 'tactical puzzles',
    lessons: 'guided lessons',
    levels: 'opponent levels',
    personalities: 'personalities, each with its style',
    chapters: 'career chapters',
    words: 'words defined in plain language',
    tablebases: 'pieces: endgames played perfectly',
    credits: 'Credits & licences of the resources used',
  },

  lesson: {
    stepOf: 'Step {n} / {total}',
    wrongMove: 'That is not the expected move. Try again.',
    cannotShow: 'The move cannot be shown here.',
    notFound: 'Lesson not found',
    notFoundHint: 'This lesson does not exist, or it has been renamed.',
    backToCurriculum: 'Back to the curriculum',
    yourTurn: 'Your turn.',
    coach: 'The coach',
    muteCoach: 'Mute the coach',
    unmuteCoach: 'Turn the coach’s voice on',
    replay: 'Hear it again',
    previous: 'Previous',
    nextLesson: 'Next lesson',
    replayStep: 'Replay this step',

    trapBrief: 'Before you start',
    trapOpening: 'Opening',
    trapSide: 'You play',
    trapSideWhite: 'You play White',
    trapSideBlack: 'You play Black',
    trapRisk: 'If they do not bite',
    trapTheme: 'Pattern',
    trapLength: '{minutes} min · {steps} steps',
    trapDuration: 'Length',
    trapDiscover: 'Learn it',
    trapDiscoverHint: 'the coach explains every move',
    trapResume: 'Resume',
    trapResumeHint: 'you are on step {n}',
    trapRevise: 'Revise',
    trapReviseHint: 'replay the line with no help',
    trapVerified: 'Line verified move by move',
    trapBackToBrief: 'Back to the brief',
    revisionBadge: 'Revision',
    revisionSilent: 'The coach stays quiet. Play the line from memory.',
    revisionWatch: 'Watch — this move plays itself.',
  },

  lessonExtra: {
    theMoveWas: 'The move was {coup}. Play it to carry on.',
    showMe: 'Show me',
    finish: 'Finish',
    carryOn: 'Continue',
  },

  draw: {
    namesPlaceholder: 'Alice\nBob\nCarol\nDavid',
    title: 'Random draw',
    intro:
      'The colours of a game, the pairings of a round, the running order. A draw everyone can see, and nobody disputes.',
    what: 'What to draw',
    colours: 'Colours',
    pairs: 'Pairings',
    firstPlayer: 'First player',
    secondPlayer: 'Second player',
    player1: 'Player 1',
    player2: 'Player 2',
    drawAgain: 'Draw again',
    white: 'White',
    black: 'Black',
    hasColour: 'has {couleur}',
    playersCount: '{n} players',
    onePlayer: '{n} player',
    table: 'Board {n}',
    sitsOut: 'sits out this round.',
    drawOrder: 'Draw the order',

    order: 'Running order',
    drawColours: 'Draw the colours',
    result: 'Result of the draw',
    playersOnePerLine: 'The players, one per line',
    noName: 'No name yet.',
    oddNumber: '— odd number, someone will get a bye.',
    redoPairs: 'Redo the pairings',
    makePairs: 'Make the pairings',
    tables: 'The boards',
    reshuffle: 'Shuffle again',
  },

  arena: {
    soloTitle: 'Tournament against the computer',
    howMany: 'How many opponents',
    opponentsCount: '{n} opponents',
    gamesToPlay: '{n} games to play',
    theirStrength: 'Their strength',
    level: 'Level',
    randomRange: 'Opponents will be drawn between about {min} and {max} Elo.',
    sameStrength: 'Every opponent will be worth about {elo} Elo.',
    opponentMissing: 'Opponent not found.',
    roundOf: 'Round {n} of {total}',
    rankOf: '{rang}th of {total}, with {points} points.',
    rankOfOne: '{rang}th of {total}, with {points} point.',
    newTournament: 'New tournament',
    standings: 'Standings',
    eloGamesPlayed: '{elo} Elo · {n} games',
    eloOneGamePlayed: '{elo} Elo · {n} game',
    yourRound: 'Round {n} · your game',
    youPlay: '{elo} Elo · you play {couleur}',
    round: 'Round {n}',

    back: '← Back to tournaments',
    onlyHuman:
      'You are the only human. You face each opponent once, and the standings go by points — as in a real round robin.',
    levelHint: 'The level is a reference point: in random mode, each opponent is drawn around it.',
    variedStrengths: 'Varied strengths',
    sameLevel: 'All at the same level',
    aroundLevel: 'Around the level',
    composeField: 'Compose the field',
    recompose: 'Compose the field again.',
    yourTournament: 'Your tournament',
    youWin: 'You win the tournament.',
    tryStronger: 'Come back with a stronger field — that is where you learn.',
    fullStandings: 'The full standings are below, game by game.',
    abandon: 'Abandon this tournament',
    playThisGame: 'Play this game',
    results: 'Results',
    simulatedTitle: 'Result drawn from the rating gap; the game was not played.',
    simulated: 'simulated',
  },

  studies: {
    noChapterShort: 'No chapter',
    defaultChapterTitle: 'Chapter {n}',
    title: 'My studies',
    hint: 'Keep annotated positions: your openings, a game to understand, an endgame theme.',
    needsAccount: 'Studies require an account',
    needsAccountHint:
      'A study belongs to you and is found again from one session to the next: so we need to know whose it is.',
    createFailed: 'Could not create it.',
    newTitlePlaceholder: 'Title of the study — “My defence against 1.e4”',
    newTitleAria: 'Title of the new study',
    create: 'Create',
    empty:
      'No study yet. Start with the one that will serve you most: the opening you play and do not understand yet.',
    chapters: '{n} chapters',
    oneChapter: '{n} chapter',
    updatedOn: ' · updated on ',
    shareable: 'Shareable by link',
    private: 'Private',
    shareableShort: 'Shareable',
    linkCopied: 'Link copied.',
    linkCopiedHint: 'The study is now available to whoever opens it.',
    copyRefused: 'Copy refused.',
    copyRefusedHint: 'Select the address by hand.',
    notFound: 'Study not found',
    notFoundHint: 'It does not exist, or its author has not shared it.',
    noMoveYet: 'No move yet.',
    noNoteOnMove: 'No note on this move.',
    copiedShort: 'Link copied',
    share: 'Share',
    playMoves: 'Play the moves on the board: they are added to the chapter.',
    browseMoves: 'Browse the moves of the chapter.',
    addChapter: 'Add a chapter to begin: each chapter is a position and what follows it.',
    noChapter: 'This study contains no chapter yet.',
    commentedMove: 'This move has a note',
    noteOnStart: 'Note on the starting position',
    noteOnMove: 'Note on this move',
    notePlaceholder: 'Why this move? What does it prepare?',
    noteAria: 'Note on the move',
    deleteChapter: 'Delete this chapter',
  },

  reset: {
    incompleteLink: 'Incomplete link',
    incompleteLinkHint: 'Open the link exactly as it appears in the email, without retyping it.',
    askNewLink: 'Ask for a new link',
    title: 'New password',
    rule: 'Eight characters minimum. That is the only rule.',
    newPassword: 'New password',
    repeat: 'Repeat it',
    mismatch: 'The two passwords are not the same.',
    failed: 'Reset failed.',
    changed: 'Password changed.',
    changedHint: 'Sign in with the new one.',
    serverUnreachable: 'The server is unreachable.',
    sessionsClosed:
      'Every open session will be closed, including on other devices. You will have to sign in again everywhere.',
    saving: 'Saving…',
    submit: 'Change my password',
  },

  tournament: {
    streakDoubled: '{n} wins in a row — their points are doubled',
    notFound: 'Arena not found',
    arenaLine: '{cadence} · {duree}-min arena · {debut}',
    notFoundHint: 'It does not exist, or its address is incomplete.',
    allArenas: 'All the arenas',
    nobodyRegistered: 'Nobody registered yet.',
    over: 'Arena finished. The standings below are final.',
    signIn: 'Sign in',
    signInAfter: 'to take part. You can follow the standings without an account.',
    started: 'The arena has started: you can join in progress, you will be paired next round.',
    startsAt: 'Starts at {heure}.',
    gameRunning: 'Your game is in progress — you are taken to it automatically.',
    inQueue: 'In the queue. As soon as an opponent is free, you are paired.',
    registered: 'Registered. The arena will start at the scheduled time.',
    takeABreak: 'Take a break',
    paused: 'Paused. Your points are kept — come back whenever you like.',
    scoring:
      'Two points for a win, one for a draw. From the second win in a row, points double — that is what keeps an arena winnable to the very end.',
  },

  watch: {
    freeSeatName: 'open seat',
    versusWord: 'vs',
    yourFriend: 'your friend',
    join: 'join',
    spectators: '{n} people watching',
    spectatorsOne: '{n} person watching',
    secondsAgo: '{n} s ago',
    minutesAgo: '{n} min ago',
    intro:
      'Games in progress, those looking for an opponent, and what your friends are playing against the computer.',
    backToLiveOne: 'Back to live — {n} move behind',
    backToLiveMany: 'Back to live — {n} moves behind',
    noEval:
      'No evaluation is shown while they play: {raison} The review will come at the end, in its place.',
    noEvalReason: 'it would be a way to whisper the move to them through the chat.',
    serverDown: 'Game server unreachable',
    serverDownHint: 'No way to know who is playing. Check that the realtime server is running.',
    noFriendPlaying: 'None of your friends is playing right now',
    noFriendPlayingHint:
      'As soon as one of them starts a game, it will appear here and you can follow it move by move.',
    seeAllGames: 'See all the games',
    nobodyPlaying: 'Nobody is playing right now',
    nobodyPlayingHint:
      'Games that have started will appear here, and you can follow them move by move.',
    freeSeat: ' · a free seat',
    rated: ' · rated',
    gameGone:
      'The game may be over, or it is more than twenty minutes old. Only your friends’ games, recent ones, are visible here.',
    notPlaying: '{pseudo} is not playing right now',
    youAreWatching: 'You are watching the game of',
    seeWhoPlays: 'See who is playing',
    readOnly: '. Read only: you cannot play in their place.',
  },

  tools: {
    clockBlurb:
      'Two clocks, an increment, each player taps their side after moving. Connected to an electronic board, it writes the game down.',
    eloBlurb:
      'Your rating, your K factor, your games: what the tournament earns or costs you, and your performance. On the FIDE formula.',
    drawTitle: 'Random draw',
    drawBlurb: 'Who has White, who plays whom, in what order. A draw everyone can see.',
    arbiterTitle: 'Arbiter’s cheat sheet',
    arbiterBlurb:
      'Touched piece, illegal move, flag, claimed draw: what the FIDE Laws of Chess say, on one page.',
    intro:
      'What is useful around the board rather than on it: things to go with a game played on a real set, facing someone.',
    seeThePage: 'See the page',
  },

  community: {
    title: 'Community',
    leaderboardBlurb:
      'Who plays here, and at what level. Each time control has its own, and puzzles count separately.',
    friendsBlurb:
      'Your book: who is online, who has challenged you, and the invitation link to send to someone without an account.',
    statsBlurb:
      'What your games say about your play: the opening where you score least, the time control that suits you, the hour when you play badly.',
    intro:
      'The other players, and what you do with them: compare yourself, find each other, and look at what your games say about your play.',
  },

  misc: {
    collapse: 'Collapse',
    readMore: 'Read more',
    searchGlossary: 'Search a word, or an idea in the definitions…',
    searchGlossaryAria: 'Search the glossary',
    alsoIn: 'Also in {rubrique}',
    glossaryNotOurWord:
      'The word “{mot}” is not the one used here. What you are looking for is called {termes}.',
    glossaryNoMatch: 'No term matches “{mot}”.',
    loading3d: 'Loading 3D…',
    exitFullscreen: 'Leave full screen',
    fullscreen: 'Full screen',
    dailyQuest: 'Daily quest',
    allQuestsDone: 'Every daily quest is done. The next arrives at midnight.',
    seeMyDay: 'See my day',
    backToQuests: 'Back to the quests',
    opponentThinking: 'Your opponent is thinking…',
    yourTurn: 'Your turn',
    whiteToMove: 'White to move',
    blackToMove: 'Black to move',
    noRecentGame: 'No recent standard game on this account.',
    fetchFailed: 'Could not fetch them.',
    readingPublic: 'Reading the public games…',
    notSaved: 'These games are not saved: they disappear when you leave the page.',
    wonShort: 'won',
    noResult: 'no result',
    seeAtSource: 'See the game at the source',
    stopReading: 'Stop reading',
    listenDefinitionOf: 'Listen to the definition of “{quoi}”',
    listenDefinition: 'Listen to the definition',
    threeD: {
      unavailable: 'The 3D view is not available here',
      interrupted: 'The 3D view was interrupted',
    },
    yourAccountsElsewhere: 'Your accounts elsewhere',
    accountsElsewhereHint:
      'The analysis finds your Chess.com and Lichess games from the username. Note them here once; you can always look up another one on the spot.',
    chesscomHandle: 'your Chess.com username',
    lichessHandle: 'your Lichess username',
    analyseOneOfThese: 'Analyse one of these games',
    challengeExpired: 'Challenge expired.',
    busyPlaying: 'You are in a game: accepting takes you elsewhere.',
    careerSuffix: 'career',
    nothingYet: 'Nothing yet. The first lesson earns {n}.',
    whereTheyComeFrom: 'Where they come from',
    undetailed: 'not itemised',
    footer:
      'Le Coup Parfait — free software under the AGPL-3.0 licence. No advertising, no tracker, no data sold.',
    wholeSection: 'the whole section, shown large',
  },

  quests: {
    left: 'You have {n} quests left today.',
    leftOne: 'You have {n} quest left today.',
    doneToast: '+{xp} points',
    doneToastStreak: '+{xp} points · {jours} streak',
    daily: 'Solve the daily challenge',
    dailyAction: 'Find the move',
    play: 'Play a game',
    win: 'Win a game',
    threePuzzles: 'Solve 3 puzzles in a row',
    threePuzzlesDetail: 'three solved in the day',
    solvePuzzles: 'Solve puzzles',
  },

  last: {
    inProgress: '{n} in progress',
    hide: 'Collapse',
    lastMoveSecondsAgo: 'last move {n} s ago',
    lastMoveMinutesAgo: 'last move {n} min ago',
    readMore: 'Read more',
    wholeSection: 'the whole section, shown large',
    installTitle: 'Install Le Coup Parfait',
    installIos:
      'Touch the share button, then “Add to Home Screen”. That is also what unlocks notifications on iPhone.',
    installBlurb:
      'An icon on your home screen, full screen, without an address bar. Nothing to download from a store.',
    notifyTitle: 'Be told when a friend invites you',
    notifyBlurb:
      'An invitation expires in five minutes. Nothing else will be sent to you, and it switches off in one click.',
    later: 'Later',
    askWhatToSee: 'What should I have seen?',
    askWhatThreatens: 'What does my opponent threaten now?',
    askThePlan: 'What is the plan from here?',
    askWhatToWatch: 'What should I watch out for?',
    muteCoach: 'Mute the coach',
    unmuteCoach: 'Turn the coach’s voice on',
    seatKept:
      'Your seat is kept as long as your opponent is not waiting at the board. If they are there, the game is lost by abandonment after half the time control.',
    clickOn: 'Click on',
    train: 'train',
    board: 'Board',
    pointsCount: '{n} points',
    careerWord: 'career',
    careerSuffix2: 'career pts',

    deadLink: 'This link leads nowhere',
    deadLinkHint: 'The analysis may have stopped being shared, or the link is incomplete.',
    howRatingWorks: 'How this rating is worked out',
    seeThePage: 'See the page',
    confirming: 'Confirming…',
    andAlso: 'And also',
    beforeYouPlay: 'Before you play',
    tenSeconds: 'Ten seconds, in this order.',
    theirTurn: 'It is their move — take the chance to look around.',
    whatEachLooksAt: 'What each question looks at',
    whyThisMove: 'Why this move?',
    replayMove: 'Replay the move',
    ratedShort: ' · rated',
    nowYourFriend: '{pseudo} is now your friend.',
    friendRequests: '{n} friend requests',
    youCanChallenge: 'You can challenge them.',
    oneFriendRequest: 'One friend request',
    online: 'Online',
    friendsVsComputer: 'Your friends, against the computer',
    followGame: 'follow the game →',
    gameInProgress: 'Game in progress',
    liveGameContinues: 'Your live game carries on',
    gameGone:
      'The game may be over, or it is more than twenty minutes old. Only your friends’ games, recent ones, are visible here.',
    seeWhoPlays: 'See who is playing',
    readOnly: '. Read only: you cannot play in their place.',
  },

  mail: {
    verifySubject: 'Confirm your address, {pseudo}',
    hello: 'Hello {pseudo},',
    verifyCreated: 'Your account is created: you can play and learn right away.',
    verifyOpenLink: 'All that is left is to confirm your address, by opening this link:',
    verifyValidity:
      'The link is valid for twenty-four hours. Without it your account works perfectly well, but your address will not be able to help you recover your password if you lose it.',
    verifyNoTracking: 'No newsletter, no tracker, no data sold on.',
    verifyNotYou: 'If you did not sign up, ignore this message.',
    signature: 'Le Coup Parfait — free software under the AGPL-3.0 licence.',
    resetSubject: 'Reset your password',
    resetAsked:
      'Somebody asked to reset the password of this account. If that was you, open this link to choose a new one:',
    resetValidity: 'The link is valid for one hour, and works only once.',
    resetNotYou:
      'If you asked for nothing, ignore this message: as long as the link is not opened, your password stays unchanged.',
  },
  api: {
    unreadable: 'Unreadable request.',
    unknownAction: 'Unknown action.',
    signInRequired: 'Sign-in required.',
    notFound: 'Not found.',
    unavailable: 'Unavailable.',
    readFailed: 'Cannot read.',
    actionFailed: 'Action impossible.',
    createFailed: 'Cannot create.',
    saveFailed: 'Cannot save.',
    deleteFailed: 'Cannot delete.',
    nothingToDelete: 'Nothing to delete.',
    computeFailed: 'Cannot compute.',
    accountNotFound: 'Account not found.',
    notYourOwnAccount: 'This action does not apply to your own account.',
    passwordTooShort: 'Password too short (8 characters minimum).',
    gameNotFoundOrRated: 'Game not found, or rated — a rated game cannot be erased.',
    unknownPurge: 'Unknown purge.',
    purgeFailed: 'Purge impossible.',
    requestNotFound: 'Request not found.',
    relationNotFound: 'Relationship not found.',
    noMoveToAnalyse: 'No move to analyse.',
    gameTooLongAnalysis: 'Game too long (300 plies maximum).',
    fenRequired: 'The “fen” field is required.',
    textRequired: 'The “text” field is required.',
    tooManyRequests: 'Too many requests. Try again in a few minutes.',
    tooManyResends: 'Too many resends. Try again in a few minutes.',
    tooManyAttempts: 'Too many attempts. Try again in a few minutes.',
    tooManyInvites: 'Too many invitations sent. Try again in a few minutes.',
    noAddressOnFile: 'No address on file.',
    noMailYet: 'This server does not send mail yet.',
    unknownAvatar: 'Unknown avatar.',
    unknownLanguage: 'Unknown language.',
    nameAndPasswordRequired: 'Username and password are required.',
    accountsDown: 'The accounts service is unavailable. You can keep playing without an account.',
    leaderboardDown: 'The leaderboard is momentarily unavailable.',
    gameNotFound: 'Game not found.',
    notYourTurn: 'It is not your turn.',
    illegalMove: 'Illegal move.',
    gameFinished: 'This game is over.',
    gameCorrupt: 'This game can no longer be read: its recorded moves are unreadable.',
    gameChanged: 'The game changed in the meantime. Reload it before playing again.',
    friendUnknownUser: 'Nobody goes by that username here.',
    friendSelf: 'Hard to become your own friend.',
    friendAlready: 'You are already connected.',
    analysisRefused: 'The analysis server refused the request.',
    analysisTimeout: 'The analysis ran out of time.',
    analysisUnreachable:
      'The analysis server cannot be reached. The analysis will continue in your browser, at a more modest depth.',
    verifyLinkExpired: 'This link has expired. Ask for a new one from your profile.',
    verifyLinkUnknown: 'This link matches nothing. It may already have been used.',
    unknownCategory: 'Unknown category. Accepted values: {valeurs}.',
    providerRefused: 'The provider refused the request.',
    notInYourList: 'This person is not in your address book.',
    playerNotFound: 'Player not found.',
    dailyUnavailable: 'The daily challenge is unavailable.',
    noPuzzleNpm: 'No puzzle in the database. Run the import:  npm run data:puzzles',
    noPuzzleNode: 'No puzzle in the database. Run the import:  node scripts/import-puzzles.mjs',
    pickAName: 'Pick a username.',
    inviteMatchesNobody: 'This invitation link matches nobody.',
    gameNotSaved: 'Game not saved.',
    challengeGoneOrExpired: 'Challenge not found or expired.',
    challengeNotFound: 'Challenge not found.',
    chapterNotFound: 'Chapter not found.',
    studyNotFound: 'Study not found.',
    requestTooLarge: 'Request too large.',
    unknownSource: 'Unknown source.',
    invalidName: 'Invalid username: letters, digits, hyphens and underscores only.',
    directoryDown: 'Directory unavailable.',
    positionMissing: 'Position missing.',
    gameServerDown: 'The game server is unreachable.',
    pushFailed: 'Sending failed. Check notifications in your phone’s settings.',
    subscriptionIncomplete: 'Incomplete subscription.',
    subscriptionAddressMissing: 'Subscription address missing.',
    notificationsUnconfigured: 'Notifications are not configured on this server.',
    deviceNotSubscribed: 'This device is not subscribed.',
    diagnosticUnavailable: 'Diagnostic unavailable.',
    noMoveToSave: 'No move to save.',
    gameTooLong: 'Game too long.',
    stateMissing: 'State missing.',
    gameMissing: 'Game missing.',
    gamesServerDown: 'The games server is unreachable.',
    profilesDown: 'The profiles service is unavailable.',
    levelMissing: 'Level missing.',
    puzzlesDown: 'The puzzles service is unavailable.',
    fieldsMissing: 'Fields missing.',
    unknownPuzzle: 'Unknown puzzle.',
    invalidDay: 'Invalid day.',
    statsUnavailable: 'Statistics unavailable.',
    tournamentNotFound: 'Tournament not found.',
    tournamentGoneOrOver: 'Tournament not found or finished.',
    neuralVoiceUnavailable: 'Neural voice unavailable.',
    neuralVoiceDown: 'Neural voice unreachable.',
    purgedSessions: 'expired sessions',
    purgedEvaluations: 'evaluations under 14 plies, too shallow to be reused',
    purgedEmptyAccounts: 'accounts with no game and no analysis, inactive for six months',
  },
  motifs: {
    hangingPiece: {
      name: 'Hanging piece',
      definition:
        'A piece that is attacked and not sufficiently defended: the opponent can take it and win material.',
    },
    fork: {
      name: 'Fork',
      definition:
        'A single piece attacks two or more targets at once. Since only one thing can be saved at a time, the other is won.',
    },
    pin: {
      name: 'Pin',
      definition:
        'A piece cannot move without exposing a more valuable one behind it. If the king is behind, it cannot legally move at all.',
    },
    skewer: {
      name: 'Skewer',
      definition:
        'The reverse of a pin: the valuable piece is in front. It has to flee, and in fleeing it abandons the one behind it.',
    },
    discoveredAttack: {
      name: 'Discovered attack',
      definition:
        'Moving one piece clears the line of another, which suddenly strikes a target. Two threats are born of a single move.',
    },
    doubleCheck: {
      name: 'Double check',
      definition:
        'Two pieces give check at the same time. No block will do: the king is obliged to move.',
    },
    removingTheDefender: {
      name: 'Removing the defender',
      definition:
        'You capture or drive away the piece defending a target, which falls on the next move.',
    },
    overloadedPiece: {
      name: 'Overloaded piece',
      definition:
        'One piece is single-handedly doing two defensive jobs. Distract it on one side and the other collapses.',
    },
    trappedPiece: {
      name: 'Trapped piece',
      definition:
        'An attacked piece with no safe square left: it is lost, even though nobody has taken it yet.',
    },
    backRankMate: {
      name: 'Back-rank mate',
      definition:
        'The castled king is shut in by his own pawns on his back rank. A rook or queen arriving on that rank mates.',
    },
    smotheredMate: {
      name: 'Smothered mate',
      definition:
        'The king is entirely surrounded by his own pieces; only a knight can mate him then, because only a knight jumps over them.',
    },
    mateIn1: {
      name: 'Mate in one',
      definition: 'A single move ends the game.',
    },
    mateIn2: {
      name: 'Mate in two',
      definition: 'A forced mate in two moves, whatever the opponent replies.',
    },
    mateIn3: {
      name: 'Mate in three',
      definition: 'A forced mate in three moves: no defence holds it off.',
    },
    mateThreat: {
      name: 'Mate threat',
      definition: 'Mate arrives next move if nothing is done.',
    },
    sacrifice: {
      name: 'Sacrifice',
      definition:
        'Material is given up deliberately to get something else: an attack, an open line, an exposed king.',
    },
    promotion: {
      name: 'Promotion',
      definition: 'A pawn reaching the last rank turns into something else, almost always a queen.',
    },
    underPromotion: {
      name: 'Underpromotion',
      definition:
        'Promoting to something other than a queen — often a knight to give a decisive check, or a rook to avoid stalemate.',
    },
    enPassant: {
      name: 'En passant',
      definition:
        'A pawn advancing two squares can be captured by an enemy pawn as if it had advanced only one — and only on the very next move.',
    },
    passedPawn: {
      name: 'Passed pawn',
      definition:
        'A pawn no enemy pawn can stop, neither on its file nor on the neighbouring ones. It is worth its weight in gold in the endgame.',
    },
    protectedPassedPawn: {
      name: 'Protected passed pawn',
      definition:
        'A passed pawn supported by another pawn: the opponent cannot even blockade it with their king without losing.',
    },
    isolatedPawn: {
      name: 'Isolated pawn',
      definition:
        'A pawn with no neighbour on the adjacent files: no pawn can defend it, so a piece has to.',
    },
    doubledPawns: {
      name: 'Doubled pawns',
      definition:
        'Two pawns on the same file: they get in each other’s way, advance badly and defend less well.',
    },
    backwardPawn: {
      name: 'Backward pawn',
      definition:
        'A pawn left behind that its neighbours can no longer support, and whose advance square the opponent controls.',
    },
    outpost: {
      name: 'Outpost',
      definition:
        'An advanced square, defended by a pawn, that no enemy pawn can attack. A knight there is all but untouchable.',
    },
    bishopPair: {
      name: 'Bishop pair',
      definition:
        'Having both bishops when the opponent has only one: they cover every square and become formidable in an open position.',
    },
    badBishop: {
      name: 'Bad bishop',
      definition:
        'A bishop blocked in by its own pawns, all of them sitting on squares of its colour.',
    },
    openFile: {
      name: 'Open file',
      definition:
        'A file with no pawn at all on it: the rooks’ motorway, through which they get into the enemy camp.',
    },
    semiOpenFile: {
      name: 'Half-open file',
      definition: 'A file with no pawn of your own but an enemy pawn on it: a target to attack.',
    },
    seventhRank: {
      name: 'Rook on the seventh',
      definition:
        'A rook on the 7th rank (2nd for Black) eats pawns and shuts the king in. Two rooks there often win on their own.',
    },
    exposedKing: {
      name: 'Exposed king',
      definition:
        'A king with no pawn shield, surrounded by squares the opponent controls: the attack is on its way.',
    },
    kingSafety: {
      name: 'King safety',
      definition: 'A castled king, protected by his pawns, far from any open line.',
    },
    development: {
      name: 'Lagging development',
      definition:
        'Pieces still on their starting squares. Every opening move should bring out a new one.',
    },
    centreControl: {
      name: 'Centre control',
      definition:
        'The four central squares: whoever holds them runs the game, because pieces radiate in every direction from there.',
    },
    oppositeCastling: {
      name: 'Opposite castling',
      definition:
        'The kings have castled on opposite sides: each can throw their pawns at the other’s king without exposing their own. The games turn very sharp.',
    },
    fianchetto: {
      name: 'Fianchetto',
      definition:
        'A bishop developed on b2/g2 (or b7/g7), behind an advanced pawn, sweeping the long diagonal.',
    },
    opposition: {
      name: 'Opposition',
      definition:
        'In king and pawn endings, the kings face each other one square apart. Whoever is not on move gains ground — and that often decides the whole game.',
    },
    rookBehindPasser: {
      name: 'Rook behind the passed pawn',
      definition:
        'Tarrasch’s rule: rooks belong behind passed pawns — your own to push them, your opponent’s to hold them back.',
    },
    wrongBishop: {
      name: 'Wrong-coloured bishop',
      definition:
        'With an a- or h-file pawn and a bishop that does not control the promotion square, the endgame is drawn even a pawn up.',
    },
    kingActivity: {
      name: 'Active king',
      definition:
        'In the endgame, the king becomes an attacking piece. Centralising him is often worth more than a pawn.',
    },
    zugzwang: {
      name: 'Zugzwang',
      definition:
        'Being obliged to move when every move makes your position worse. Passing would save you — but that is not allowed.',
    },
    blockade: {
      name: 'Blockade',
      definition:
        'Placing a piece right in front of an enemy passed pawn to immobilise it. The knight is the best blockader.',
    },
    spaceAdvantage: {
      name: 'Space advantage',
      definition:
        'Controlling more squares than your opponent: their pieces tread on each other, yours can manoeuvre.',
    },
    xRayAttack: {
      name: 'X-ray attack',
      definition:
        'A long-range piece acts through another: the threat exists already, before the line has even been cleared.',
    },
  },
  qualites: {
    brilliant: {
      label: 'Brilliant',
      description:
        'A sound sacrifice: material given up, and the position pays it back a hundredfold.',
    },
    great: {
      label: 'Great move',
      description: 'The only move that held — every other option gave up part of the advantage.',
    },
    best: {
      label: 'Best move',
      description: 'The engine’s first choice.',
    },
    excellent: {
      label: 'Excellent',
      description: 'As good as the best, by an imperceptible margin.',
    },
    good: {
      label: 'Good move',
      description: 'A sound move, costing next to nothing.',
    },
    book: {
      label: 'Book move',
      description: 'A move of opening theory, played and replayed for a very long time.',
    },
    forced: {
      label: 'Forced move',
      description: 'The only legal move: there was no choice to make.',
    },
    inaccuracy: {
      label: 'Inaccuracy',
      description: 'Playable, but inferior: part of the advantage goes.',
    },
    mistake: {
      label: 'Mistake',
      description: 'A clear error: the evaluation shifts noticeably.',
    },
    blunder: {
      label: 'Blunder',
      description: 'A blunder: material lost, or the position ruined in one move.',
    },
    miss: {
      label: 'Missed win',
      description: 'A missed opportunity: a win or a mate was within reach.',
    },
  },
  bots: {
    novice: {
      devise: 'Can I take that?',
      contre:
        'Leave him material where you take it back next move: he bites almost every time. And develop your pieces while he collects — that is the one thing he forgets to do.',
      lore1:
        'The first carving of the series, and the only one never reworked. The lime wood still shows the gouge marks, the ears are too big for the neck, and the whole thing leans forward. The sculptor corrected nothing: it is from that imbalance that the look of wanting to press on comes.',
      lore2:
        'On the board, that gives you somebody who sees a piece to take and takes it. Not out of greed — out of trust. He has not yet learned that a piece can be put there on purpose. He is the opponent of your first games, and he will learn at the same time as you.',
      name: 'Pip',
      blurb: 'Learning alongside you. Loves grabbing pieces, even when it should not.',
    },
    prudent: {
      devise: 'After you.',
      contre:
        'Do not give him the exchanges he is waiting for: keep your pieces, take space, and open a second front. His solidity holds as long as he has only one place to defend.',
      lore1:
        'Cut from a block of blue-grey granite that had spent the winter outdoors; the moss caught in the hollows was not removed. The iron plates riveted to the neck have never served any purpose — nothing has ever got that far.',
      lore2:
        'He castles early, trades whenever it is offered, and refuses anything that looks like a risk. You do not lose to Rampart to a combination: you lose from exhaustion, after spending forty moves looking for an opening that was not there.',
      name: 'Rampart',
      blurb: 'Solid and patient. Castles early, trades willingly and takes no risks.',
    },
    fonceur: {
      devise: 'We’ll see afterwards.',
      contre:
        'Do not back away from the advancing pawns: every pawn pushed is a pawn that will not come back to defend. Trade off his attackers, hold the centre, and his assault becomes a row of weaknesses.',
      lore1:
        'Cast too hot, cooled too fast. The bronze cracked as it set and the light still comes out through the fissures. The sculptor kept the failed piece: none of the later ones had that movement — ears back, nostrils flared, already away.',
      lore2:
        'He pushes his pawns at your king without asking what he leaves behind. It often works, because an attack that arrives fast rarely meets a defence that is ready. When it does not work, he has no position left at all.',
      name: 'Blaze',
      blurb: 'Attacks first, thinks afterwards. Pushes pawns at your king without looking back.',
    },
    tacticien: {
      devise: 'Did you see what you just left?',
      contre:
        'One discipline is enough: after each of his moves, look at what is hanging and what is aimed at what. He does not create the cracks, he picks them up.',
      lore1:
        'Frosted crystal, cut in clean facets. A single crack runs right through the neck: it happened at the mould, it was not planned, and it is the first thing you look at.',
      lore2:
        'He does not try to place his pieces better — he waits. An undefended piece, two pieces on the same diagonal, a king that has moved one time too many: he finds it, and he finds it before you do. Against a healthy position he has nothing in particular to say; it is disorder he feeds on.',
      name: 'Flash',
      blurb: 'Sees combinations everywhere. Leave a piece hanging and you will regret it.',
    },
    positionnel: {
      devise: 'No hurry.',
      contre:
        'Do not let him tidy up in peace. Take space early, create an imbalance while he is finishing his development: he plays badly in positions that cannot be put in order.',
      lore1:
        'Patinated brass and dark rosewood, mounted true to a plumb line. A compass rose is engraved on the side of the neck; it points in a direction nothing in the sculpture follows. It is an instrument, not a traveller.',
      lore2:
        'He will not attack you. He will improve one piece, then another, then take a square you did not see the point of. Thirty moves later you will be looking for a move to play and there will not be one.',
      name: 'Compass',
      blurb:
        'Plays slowly, improves its pieces one by one, and smothers you without your noticing.',
    },
    gambiteur: {
      devise: 'Go on, take it.',
      contre:
        'You may accept, on one condition: give the material back as soon as it starts costing you tempi. An extra pawn is worth nothing against three developed pieces and an open file at your king.',
      lore1:
        'Smoked resin, poured twice: the outline doubles, the colour shifts by a hair, and the back of the neck dissolves into the air. Nobody has ever been able to say exactly where the object stops — nor could the automatic cut-out.',
      lore2:
        'He offers a pawn in the opening, sometimes a piece. It is not generosity: what he is buying is open lines and two tempi, and he knows what to do with them. Declining is often the right choice. It is rarely the one people make.',
      name: 'Mirage',
      blurb: 'Offers material in the opening to open lines. Accept at your own risk.',
    },
    machine: {
      devise: 'Nothing to add.',
      contre:
        'There is no stylistic flaw to exploit, and that is the whole point: lower the level if you want to win, keep it at the top if you want to know where you stand. Losing to Oracle says nothing about you.',
      lore1:
        'Polished obsidian, no grain, not a tool mark. It is the only one of the series that looks straight ahead, and the only one strictly symmetrical: there is no angle from which it is more flattering than another.',
      lore2:
        'No bias, no preference, no bad days. It plays the best move the engine finds, no more and no less, and it plays it as well against you as against anybody. The other six were held back to resemble you a little. This one was not.',
      name: 'Oracle',
      blurb: 'No style, no mercy. The best move, every time. Good luck.',
    },
  },
  niveaux: {
    debutant: 'Beginner',
    apprenti: 'Apprentice',
    club: 'Club',
    confirme: 'Advanced',
    fort: 'Strong',
    expert: 'Expert',
  },
  rangs: {
    poulain: 'Foal',
    cavale: 'Steed',
    eclaireur: 'Scout',
    francTireur: 'Maverick',
    stratege: 'Strategist',
    maitre: 'Master of the Steed',
  },
  axes: {
    capture: {
      attire: 'taking material',
      repousse: 'letting a capture go',
    },
    check: {
      attire: 'giving check',
      repousse: 'avoiding checks',
    },
    pawnPush: {
      attire: 'pushing its pawns',
      repousse: 'keeping its pawns in place',
    },
    development: {
      attire: 'bringing its pieces out',
      repousse: 'neglecting its development',
    },
    sacrifice: {
      attire: 'sacrificing material',
      repousse: 'refusing every sacrifice',
    },
    quiet: {
      attire: 'playing quiet moves',
      repousse: 'never staying quiet',
    },
  },
  arbitrage: {
    title: 'Arbitration checklist',
    intro:
      'The situations that come up in tournaments, and what the FIDE Laws of Chess, 2023 edition, say about them. The tournament regulations may refine certain points: they take precedence. When in doubt, stop the clocks and call the arbiter.',
    sections: 'Sections',
    disclaimer:
      'A summary, not the official text: the FIDE Laws of Chess in their current version are authoritative, and each competition’s regulations may add provisions of their own.',
    paceSlow: 'Slow',
    paceRapid: 'Rapid',
    paceBlitz: 'Blitz',
    'touche-joue': {
      titre: 'Touch-move',
      p1: 'A piece touched deliberately must be moved if it is your own, captured if it is your opponent’s — provided a legal move allows it.',
      p2: 'To recentre a piece, you say “j’adoube” before touching it, and only when it is your turn.',
      p3: 'A move is played when the piece is released on its square; it is completed when the clock has been pressed. Between the two, there is no going back.',
      p4: 'To castle, you touch the king first, or the king and the rook together. Rook touched first: you can no longer castle with it this move, you have to move it.',
      p5: 'A move is made with one hand, and it is that hand which presses the clock.',
    },
    'coup-illegal': {
      titre: 'Illegal move',
      p1: 'King left in check, a piece off its line, castling when not allowed, promotion forgotten: you go back to the position before the move, and the touch-move rule applies to what was touched.',
      p2: 'First completed illegal move: two extra minutes to the opponent. Second illegal move by the same player: game lost — drawn if the opponent cannot mate.',
      p3: 'As soon as it is noticed, even several moves later: you go back to the position before it.',
      p4: 'Only if the opponent has not yet played their next move. After that, the illegal move stands and the game goes on.',
      p5: 'The king is never captured: taking the king is an illegal move, not a win.',
      p6: 'Playing with two hands, or pressing the clock without having moved, is penalised as an illegal move.',
    },
    pendule: {
      titre: 'Clock and flag',
      p1: 'Flag fallen, game lost — unless the opponent cannot mate by any sequence of legal moves: drawn.',
      p2: 'The arbiter observes the fall of the flag and announces it.',
      p3: 'Without an arbiter at every board, it is up to the player to claim the fall; the arbiter does not point it out.',
      p4: 'Both flags fallen without knowing which fell first: drawn in the last time period, and always in rapid or blitz.',
      p5: 'You do not press the clock before moving, you do not keep your finger on it, you do not lift it, you do not strike it.',
      p6: 'To call the arbiter, you stop both clocks. No other reason allows them to be stopped.',
    },
    nulle: {
      titre: 'The draw: offering, claiming, observing',
      p1: 'You offer a draw after playing your move and before pressing the clock. The opponent accepts by saying so, declines by moving. Offering repeatedly is a nuisance, and is penalised.',
      p2: 'Threefold repetition: the same position, same side to move, same castling and en passant rights, occurring three times — not necessarily in a row.',
      p3: 'Fifty moves: fifty moves by each side with no capture and no pawn move.',
      p4: 'To claim either one: the player to move writes down the move that produces the position, does not play it, stops the clocks and calls the arbiter. Correct claim: draw. False claim: two minutes to the opponent, and the written move must be played.',
      p5: 'Without a claim, the arbiter declares the draw at the fifth repetition or at the seventy-fifth move with no capture and no pawn move.',
      p6: 'Dead position: no mate is possible any more, for anybody (king alone, king and bishop, king and knight). The game is drawn there and then, even if a flag falls afterwards.',
      p7: 'Here, online: threefold repetition and the fifty-move rule are observed automatically, without a claim, as soon as the position reaches them. A fallen flag does apply the proviso of article 6.9: drawn if the opponent could no longer mate.',
    },
    'coups-speciaux': {
      titre: 'Castling, promotion, en passant',
      p1: 'No castling if the king or the rook has already moved, if the king is in check, or if he crosses or lands on an attacked square. The rook, on the other hand, may be attacked or pass over an attacked square.',
      p2: 'Promotion is compulsory and the piece is your choice — not necessarily a queen. The choice is made as soon as the new piece touches the square.',
      p3: 'An upside-down rook is a rook. If the piece you want is missing, you stop the clocks and ask the arbiter for it.',
      p4: 'En passant is only possible on the move immediately following the pawn’s double advance.',
    },
    notation: {
      titre: 'Recording the game',
      p1: 'You write down move after move, legibly, in algebraic notation, your own move and your opponent’s. Writing your move down before playing it is forbidden — except to claim a draw.',
      p2: 'Under five minutes on the clock and no increment of at least thirty seconds: you may stop recording. You complete your scoresheet once the time control has passed.',
      p3: 'No obligation to record.',
      p4: 'The scoresheet belongs to the organiser. At the end, both players write the result on it and sign it.',
    },
    telephone: {
      titre: 'Phones, leaving, conduct',
      p1: 'Phones and any device that communicates: forbidden in the playing area. The tournament regulations may allow a switched-off device, stowed in a bag, out of reach.',
      p2: 'A phone that rings or is handled: game lost, unless the regulations provide a lesser penalty. The opponent wins — drawn if they cannot mate.',
      p3: 'The player to move does not leave the playing area. Nobody leaves it without the arbiter’s agreement.',
      p4: 'No notes, no analysis in the hall, no advice from a third party, nothing that disturbs the opponent. Refusing to follow the arbiter is an offence in itself.',
    },
    resultat: {
      titre: 'Lateness, resignation, result',
      p1: 'Lateness: the tolerance is the one in the tournament regulations — zero by default at FIDE, often thirty minutes or an hour in French regulations. Beyond that, forfeit, unless the arbiter decides otherwise.',
      p2: 'Mate ends the game at the instant it is played, if the move is legal: a flag falling afterwards changes nothing.',
      p3: 'You resign by saying so. Laying your king down or holding out your hand is not a result: you announce it, then you write it down.',
      p4: 'The penalties available to the arbiter, from lightest to heaviest: warning, time added to the opponent, time deducted, game lost, exclusion from the tournament.',
    },
  },
  glossaire: {
    cadence: {
      name: 'Time control',
      definition:
        'The time each player has. It is written with two numbers: **“3 | 2” means 3 minutes to start with, plus 2 seconds added to your clock for every move played**. A single number — “5 min” — means there is nothing to get back: when the flag falls, the game is lost, even a whole queen up. The time control also decides the category of the game, and each one keeps its own rating: bullet under 3 minutes, blitz up to 10, rapid up to 60, classical beyond. You improve far faster by playing slowly.',
    },
    increment: {
      name: 'Increment',
      definition:
        'The seconds given back on every move, the second number of a time control. They serve one precise purpose: not losing on time in a winning position for want of the few seconds it takes to play the obvious moves at the end. With a 2-second increment, a thirty-move game gives you a minute back along the way.',
    },
    roque: {
      name: 'Castling',
      definition:
        'The only move that shifts two pieces at once: the king takes two steps towards a rook, which jumps over him. Neither may have moved, the squares between them must be empty, and the king must not be in check nor cross an attacked square. Kingside castling on the king’s side, queenside castling on the queen’s.',
    },
    'prise-en-passant': {
      name: 'En passant',
      definition:
        'When a pawn advances two squares and lands beside an enemy pawn, that pawn may take it as if it had advanced only one. The capture has to be made **immediately**, on the very next move, or the right is lost. It is the rule beginners overlook most often.',
    },
    promotion: {
      name: 'Promotion',
      definition:
        'A pawn reaching the last rank turns, compulsorily, into a queen, rook, bishop or knight — your choice, and with no regard to the pieces already captured. Almost everybody takes the queen; the knight is the only other sometimes useful choice, because it alone makes moves a queen cannot.',
    },
    'echec-et-mat': {
      name: 'Checkmate',
      definition:
        'The king is attacked and no legal move can remedy it: he can neither flee, nor capture the attacker, nor interpose. The game stops at once. It is the only aim of the game — everything else is a means.',
    },
    pat: {
      name: 'Stalemate',
      definition:
        'The side to move has **no legal move at all**, but their king is not in check. The game is drawn, whatever the material difference. It is the classic disappointment of the beginner a queen up: stalemate is the lifeline of whoever is losing.',
    },
    'nulle-par-repetition': {
      name: 'Draw by repetition',
      definition:
        'The same position, with the same player to move and the same castling rights, appears three times: the game is drawn. Often reached by perpetual check, when one side gives check endlessly because they would otherwise lose.',
    },
    'regle-des-cinquante': {
      name: 'Fifty-move rule',
      definition:
        'Fifty moves by each side without a capture or a pawn move: the game is drawn. It stops an endgame nobody knows how to win from going on for ever.',
    },
    'valeur-des-pieces': {
      name: 'Piece values',
      definition:
        'The universal yardstick: pawn 1, knight and bishop 3, rook 5, queen 9. The king has no value — he cannot be exchanged. These numbers are a useful approximation, not a truth: a well-placed knight is often worth more than a shut-in rook.',
    },
    'paire-de-fous': {
      name: 'Bishop pair',
      definition:
        'Having both bishops when your opponent has only one. Each bishop sees a single colour of square; together they cover the whole board. The advantage is reckoned at about half a pawn, more in an open position.',
    },
    'mauvais-fou': {
      name: 'Bad bishop',
      definition:
        'A bishop whose own pawns sit on its colour of square. It can neither defend them nor get past them: a piece paid for at three points that is now worth one. In the endgame, a wrong-coloured bishop draws positions that were a pawn up.',
    },
    qualite: {
      name: 'The exchange',
      definition:
        'The gap between a rook and a minor piece, about two pawns. “Winning the exchange” means taking a rook for a bishop or a knight. “Sacrificing the exchange” is done deliberately, in return for a better position.',
    },
    'pion-passe': {
      name: 'Passed pawn',
      definition:
        'A pawn no enemy pawn can stop any more: not on its file, nor on the two beside it. It threatens to queen, which forces your opponent to watch it. In the endgame it is often the one factor that decides.',
    },
    'pions-doubles': {
      name: 'Doubled pawns',
      definition:
        'Two pawns of the same side on the same file, the result of a capture. They cannot defend each other and they advance badly. The flaw is real but rarely decisive — the open file that comes with them often makes up for it.',
    },
    'pion-isole': {
      name: 'Isolated pawn',
      definition:
        'A pawn with no neighbour on the adjacent files: no pawn will ever be able to defend it. A weakness in the endgame, but the space and squares it gives in the middlegame make it a weapon for whoever knows how to attack.',
    },
    ouverture: {
      name: 'Opening',
      definition:
        'The first ten to fifteen moves, where you apply three principles rather than calculate: occupy the centre, bring out your pieces, put your king in safety. Openings have names because they have been studied for centuries.',
    },
    developpement: {
      name: 'Development',
      definition:
        'Bringing your pieces off their starting squares to squares where they do something. A piece left at the back does not count, even though it is on the board. Losing time in the opening means playing three pieces against five.',
    },
    'milieu-de-partie': {
      name: 'Middlegame',
      definition:
        'The phase where theory stops and you have to find plans for yourself. It is where almost every tactic happens, and where a beginner gains most from working on puzzles.',
    },
    finale: {
      name: 'Endgame',
      definition:
        'Few pieces remain, and the king stops being a target and becomes a strong piece you walk towards the centre. The rules of the middlegame invert: precision replaces initiative.',
    },
    transposition: {
      name: 'Transposition',
      definition:
        'Reaching a known position by a different move order from the usual one. That is why an opening is recognised by the position reached, never by the sequence of moves played.',
    },
    evaluation: {
      name: 'Evaluation',
      definition:
        'The mark the engine gives, counted in pawns: +1.0 means “White has the equivalent of an extra pawn”. Positive favours White, negative Black. “M3” announces mate in three. Below half a pawn, the gap means nothing.',
    },
    centipion: {
      name: 'Centipawn',
      definition:
        'A hundredth of a pawn, the internal unit of engines. An “average loss of 40 centipawns” means each move cost on average four tenths of a pawn compared with the best one.',
    },
    precision: {
      name: 'Accuracy',
      definition:
        'A percentage that sums up a game: how close the moves played were to the best ones. It is worked out on winning chances, not on the raw evaluation — losing a pawn in a won position does not count the same as losing one in a level position.',
    },
    elo: {
      name: 'Elo',
      definition:
        'The players’ rating. Beating somebody stronger earns a lot, losing to somebody weaker costs as much. A beginner is around 400 to 800, a club player around 1600, a grandmaster beyond 2500.',
    },
    'glicko-2': {
      name: 'Glicko-2',
      definition:
        'A finer version of Elo, which also tracks the **uncertainty** about your level. After a long absence the rating moves faster: the system knows it knows you less well. It is the one used here.',
    },
    zugzwang: {
      name: 'Zugzwang',
      definition:
        'A situation where you are obliged to move when every move makes your position worse: you would lose less by passing your turn, which the rules forbid. Common in the endgame, it is often the very mechanism of the win.',
    },
    initiative: {
      name: 'Initiative',
      definition:
        'Leading the game: forcing your opponent to answer your threats instead of developing their own. It is not counted in material, but it often turns into material.',
    },
    tempo: {
      name: 'Tempo',
      definition:
        'A move, seen as a unit of time. “Gaining a tempo” means advancing your own game while obliging your opponent to make a move that does not advance theirs — by attacking a piece while developing one of yours, for instance.',
    },
  },
  paliers: {
    regles: {
      nom: 'Getting through a whole game',
      promesse:
        'You know how the pieces move. What loses you games is not strategy yet: it is a forgotten rule, or a won game you do not know how to finish.',
      leviers: {
        'les-trois-regles': {
          titre: 'The three rules everybody forgets',
          pourquoi:
            'Castling, en passant and promotion decide more games at this level than everything else put together. An en passant capture you believe is illegal means a pawn lost and the conviction that your opponent cheated.',
        },
        'mater-avec-roi': {
          titre: 'Mating with king and rook',
          pourquoi:
            'It is the endgame you reach most often without knowing how to win it. A whole queen up and a draw by the fifty-move rule: it happens, and ten minutes prevents it.',
        },
        'mater-avec-la': {
          titre: 'Mating with the queen without stalemating',
          pourquoi:
            'Stalemate is the classic disappointment of somebody a queen up. There is one method that avoids it, always the same one.',
        },
        'combien-vaut-chaque': {
          titre: 'What each piece is worth',
          pourquoi:
            'Trading a rook for a knight because “it is an exchange” costs two pawns. The scale cannot be guessed, it is learned once.',
        },
        'reconnaitre-un-mat': {
          titre: 'Recognising mate in one',
          pourquoi:
            'Before looking for a plan, you have to see the mate when it is there. It is also the quickest thing to train: fifty positions and the eye does it on its own.',
        },
      },
    },
    'pieces-en-prise': {
      nom: 'Not giving pieces away any more',
      promesse:
        'You can get through a game and you can mate. What costs you the most points now is nothing subtle: a piece left on an attacked square, and the game changes hands.',
      leviers: {
        'voir-ce-qui': {
          titre: 'Seeing what is hanging',
          pourquoi:
            'At this tier, most games are decided by a piece left undefended — not by a combination. It is the one reflex worth several hundred rating points.',
        },
        'la-fourchette-de': {
          titre: 'The knight fork',
          pourquoi:
            'The knight is the piece whose moves beginners see least, and the one that punishes most. A fork decides one game in three at this level.',
        },
        'les-quatre-mats': {
          titre: 'The four mates you walk into',
          pourquoi:
            'Scholar’s, Fool’s, Légal’s, the Shilling: you get all of them in your first ten games, and you do not know what happened. Knowing them means parrying them without thinking.',
        },
        'le-mat-du': {
          titre: 'The back-rank mate',
          pourquoi:
            'Three pawns in front of the castled king, and a rook arriving on the last rank. It is the most frequent mating pattern at every level.',
        },
        'les-trois-principes': {
          titre: 'The three opening principles',
          pourquoi:
            'No theory to memorise: a pawn in the centre, the pieces out, the king in safety. Three ideas are enough never to be lost on move ten again.',
        },
      },
    },
    'voir-ladversaire': {
      nom: 'Seeing what your opponent is preparing',
      promesse:
        'You no longer give pieces away for nothing. What holds you back now is that you look at your own moves and not theirs: the tactics that cost you dearly are the ones you did not see coming.',
      leviers: {
        'le-clouage': {
          titre: 'The pin',
          pourquoi:
            'A piece in front of the king cannot move any more, and everybody can attack it. It is the pattern 1,000-rated players suffer most often without naming it.',
        },
        'l-attaque-a': {
          titre: 'The discovered attack',
          pourquoi:
            'A move that opens another piece’s line: two threats for one move. Impossible to parry if you have never seen it.',
        },
        'le-memo-avant': {
          titre: 'The checklist before every move',
          pourquoi:
            'Four questions, ten seconds: what did they just change, what are they attacking, what am I leaving hanging, does my move hold. It is the measurable difference between 1,000 and 1,300.',
        },
        'le-mat-en': {
          titre: 'Mate in two',
          pourquoi:
            'Two moves to see ahead, by force. It is the exercise that teaches you to calculate, and it transfers straight to positions where there is no mate.',
        },
        'les-quatre-erreurs': {
          titre: 'The four classic opening mistakes',
          pourquoi:
            'Bringing the queen out too early, moving the same piece twice, pushing the wing pawns, forgetting to castle. Four habits, and each one costs a tempo a game.',
        },
      },
    },
    'un-plan': {
      nom: 'Playing with a plan',
      promesse:
        'You see the tactics on both sides. The problem is elsewhere: when there is nothing to take, you do not know what to do, and you wait for the other player to go wrong.',
      leviers: {
        'les-colonnes-ouvertes': {
          titre: 'Open files',
          pourquoi:
            'The first question of a quiet middlegame: where do my rooks go? The answer is nearly always the same, and it can be read off the pawn structure.',
        },
        'l-avant-poste': {
          titre: 'The outpost',
          pourquoi:
            'A knight on a square no pawn can attack is worth more than a badly placed rook. It is the first positional idea that really changes games.',
        },
        'les-enjeux-de': {
          titre: 'What your opening is after',
          pourquoi:
            'At this tier, knowing ten moves of theory is no use if you do not know what you are looking for on move eleven. The plan fits in three sentences per opening.',
        },
        'eliminer-le-defenseur': {
          titre: 'Removing the defender',
          pourquoi:
            'The tactic that serves a plan rather than falling out of the sky: you take away the piece holding everything together, and the position collapses on its own.',
        },
        'la-securite-du': {
          titre: 'King safety on both sides',
          pourquoi:
            'Knowing when to attack the enemy king — and when it is your own that is in danger. Premature attacks cost more than missed ones.',
        },
      },
    },
    technique: {
      nom: 'Converting and holding',
      promesse:
        'You play with plans and you do not get caught out any more. What you are missing is technique: the winning positions that end in draws, and the endgames played on instinct.',
      leviers: {
        'l-opposition': {
          titre: 'The opposition',
          pourquoi:
            'The idea without which no pawn endgame is won or held. It is learned in one lesson and serves for a lifetime.',
        },
        'la-regle-du': {
          titre: 'The rule of the square',
          pourquoi:
            'Knowing at a glance whether the king catches the pawn. It replaces a six-move calculation with one look, and it is never wrong.',
        },
        'les-finales-objectif': {
          titre: 'Endgames, with the aim stated',
          pourquoi:
            'Three thousand five hundred and sixty-eight classified positions, with the aim given — win or hold the draw — and a computer defending as well as it can. It is the most profitable training at this tier.',
        },
        'le-sacrifice-qui': {
          titre: 'The sacrifice you can calculate',
          pourquoi:
            'At 1,600, people miss fewer sacrifices than they play bad ones. The exercise teaches you to check before you give.',
        },
        'le-roi-devient': {
          titre: 'The king becomes a piece',
          pourquoi:
            'In the endgame, the king attacks. Players who stall at this tier keep him tucked away out of reflex, and lose a piece’s worth of tempo every move.',
        },
      },
    },
    prophylaxie: {
      nom: 'Preventing before proceeding',
      promesse:
        'You have the technique and the plans. What still separates you from 2,200 is playing against the other player’s ideas rather than only for your own — and never losing a won game again.',
      leviers: {
        'les-enfilades-et': {
          titre: 'Skewers and X-ray attacks',
          pourquoi:
            'The patterns that stay expensive at a high level, because they act through pieces and are badly checked under clock pressure.',
        },
        'le-zugzwang': {
          titre: 'Zugzwang',
          pourquoi:
            'The only winning mechanism in many endgames: your opponent is obliged to move, and every move makes things worse. It is prepared, not found.',
        },
        'relire-ses-propres': {
          titre: 'Rereading your own games',
          pourquoi:
            'At this tier, generic lessons bring little: what is left to correct is personal, and there is only one place to read it — your own games.',
        },
        'les-positions-ou': {
          titre: 'Positions where everything is defended',
          pourquoi:
            'The positional sacrifice and the long-term attack: what is left when there is no tactic at all. That is where the points above 1,900 are won.',
        },
      },
    },
  },
  seances: {
    'rien-en-prise': {
      nom: 'Leaving nothing hanging',
      consigne:
        'Before every move, go round your pieces: which are attacked, and by what. You do not play until you have answered.',
      aRegarder:
        'Every time the commentary mentions a hanging piece — yours or theirs — the theme is showing itself.',
    },
    fourchettes: {
      nom: 'Forks',
      consigne:
        'Look for the squares from which a knight would reach two pieces at once — yours as well as theirs. Queens and pawns fork too.',
      aRegarder: 'Spot pairs of pieces on squares of the same colour, a knight’s move apart.',
    },
    clouages: {
      nom: 'Pins and skewers',
      consigne:
        'Line your heavy pieces up against theirs, and avoid lining yours up in front of your king or queen.',
      aRegarder:
        'The diagonals and files their king and queen stand on: that is where pins are born.',
    },
    couloir: {
      nom: 'The back rank',
      consigne:
        'Watch both back ranks: theirs to get in, yours so as not to be shut in. An escape square for your king, early.',
      aRegarder: 'After every exchange of heavy pieces, ask yourself who controls the eighth rank.',
    },
    developpement: {
      nom: 'Getting every piece out',
      consigne:
        'A pawn in the centre, then a new piece every move until everything is out and the king is safe. No piece played twice.',
      aRegarder:
        'Count your developed pieces on move ten. Eight is a win; four means this is the theme of the next session too.',
    },
    colonnes: {
      nom: 'Open files',
      consigne:
        'Find the file with no pawn on it and put a rook there. Then the second rook behind the first, and get in on the seventh rank.',
      aRegarder:
        'The pawn structure: the open file is already drawn on it, there is nothing to calculate.',
    },
    'avant-poste': {
      nom: 'The outpost',
      consigne:
        'Look for an advanced square none of their pawns can attack, and install a knight there. It will stay until the end.',
      aRegarder:
        'The squares in front of their backward pawns, and the ones their structure has given up for good.',
    },
    'roi-expose': {
      nom: 'Attacking the king',
      consigne:
        'Before launching the attack, count the attackers and the defenders. Three against two is enough; two against three never works.',
      aRegarder:
        'Their pawn shelter: as soon as a square opens in front of their king, the theme is there.',
    },
    'pion-passe': {
      nom: 'The passed pawn',
      consigne:
        'Create a passed pawn on the side where you have the majority, push it, and put your rook behind it. Blockade theirs with a knight.',
      aRegarder:
        'As soon as the queens come off, count the pawns on each wing: the majority says which side to play on.',
    },
    'deux-faiblesses': {
      nom: 'The principle of two weaknesses',
      consigne:
        'Fix a first weakness, then open a second front at the other end. Their defence cannot cover both.',
      aRegarder:
        'The isolated, doubled and backward pawns on both sides: those are the weaknesses you fix.',
    },
  },
  positions: {
    roque: {
      legende:
        'White castling kingside: the king goes from e1 to g1, and the rook on h1 jumps over him to land on f1. One move, two pieces.',
    },
    'prise-en-passant': {
      legende:
        'The black pawn has just advanced two squares to slip past the white pawn. The white pawn takes it anyway — landing on the square it skipped, as if it had only advanced one.',
    },
    promotion: {
      legende:
        'The pawn reaches the last rank and changes. Almost always into a queen — but the choice is free, and the knight is sometimes the only move that wins.',
    },
    'echec-et-mat': {
      legende:
        'The back-rank mate: the black king is shut in by his own pawns, the rook arrives on the eighth rank, and there is no flight, no block and no capture.',
    },
    pat: {
      legende:
        'Black has to move and has no legal move at all — and yet their king is not in check. The game is drawn: it is the white queen who has robbed herself of the win.',
    },
    'pion-passe': {
      legende:
        'No black pawn can stop it any more: not in front of it, not on the neighbouring files. Its road to promotion is clear, and that is what makes it valuable in the endgame.',
    },
    'pions-doubles': {
      legende:
        'Two pawns on the same file: the back one will never protect the front one, and they advance one behind the other. The ordinary price of a capture towards the centre.',
    },
    'pion-isole': {
      legende:
        'No friendly pawn on the neighbouring files: nobody will ever be able to defend it. A piece will have to, and a piece busy defending does nothing else.',
    },
    'mauvais-fou': {
      legende:
        'The bishop plays on the light squares, and its own pawns occupy the light squares in front of it. It looks out through its own bars: half the board is closed to it by its own side.',
    },
    zugzwang: {
      legende:
        'Black is not lost because of the position but because of the obligation to move: any king move lets the white pawn through. Being able to pass would save them.',
    },
    'paire-de-fous': {
      legende:
        'One bishop on the light squares, one on the dark: between them, no square escapes. That is what is worth more than a bishop and a knight in an open position.',
    },
    fork: {
      legende:
        'One piece, two targets at once: the knight gives check to the king and attacks the rook. The king has to answer, and the rook falls next move.',
    },
    pin: {
      legende:
        'The knight cannot move any more: it would expose its own king. It stays put, undefended, and you can take your time attacking it.',
    },
    skewer: {
      legende:
        'The pin in reverse: the valuable piece is in front, it has to step out of check, and what it was shielding behind it gets taken.',
    },
    discoveredAttack: {
      legende:
        'The knight steps aside and unmasks the rook, which gives check. It takes the chance to attack the queen: the check has to be answered, and the queen has nobody to save her.',
    },
    doubleCheck: {
      legende:
        'Two pieces give check at the same time. No capture and no interposition can answer both: the king has to move, whatever it costs.',
    },
    smotheredMate: {
      legende:
        'The king is shut in by his own pieces, and the knight — the only one that jumps — comes to mate him in his corner. Nothing can take the knight.',
    },
    backRankMate: {
      legende:
        'The three pawns have never moved, and the king has no window: the rook arrives on the rank and the game stops. It is the commonest mate between beginners.',
    },
    mateIn1: {
      legende:
        'One move, and it is over. Looking for mates in one is the exercise that teaches you fastest to see the squares the enemy king does not have.',
    },
    removingTheDefender: {
      legende:
        'The black rook was holding the back rank: you trade it off, the knight recaptures away from the square that mattered, and the second rook comes in. You do not go after the target, but after what guards it.',
    },
    hangingPiece: {
      legende:
        'The knight is attacked by the bishop and nobody defends it: it is taken for free. It is the first pattern to look for, every move, on both sides.',
    },
    xRayAttack: {
      legende:
        'The two rooks look at each other down the file: whatever comes between them will be attacked from both sides, and the attack “passes through” the piece.',
    },
    underPromotion: {
      legende:
        'Promoting to a knight rather than a queen: here, only the knight gives check. Rare, but these are exactly the cases the rule leaves the choice for.',
    },
    opposition: {
      legende:
        'The kings face each other, one square apart, and it is Black to move: they have to step aside, and the white king will advance. The opposition belongs to whoever is not on move.',
    },
    fianchetto: {
      legende:
        'The bishop settles on the long diagonal, behind its pawn advanced one square. There it holds the longest line on the board, and keeps the castled king beside it.',
    },
    outpost: {
      legende:
        'A knight placed in the enemy camp, protected by a pawn, and which no pawn can drive away. There it is worth far more than a badly placed rook.',
    },
    openFile: {
      legende:
        'No pawn left on the file: the rook sees from one end to the other. That is where rooks belong, and it is often the way into the enemy camp.',
    },
    seventhRank: {
      legende:
        'The rook settles on the rank of the enemy pawns: it attacks them all at once and shuts the king in on his back rank. A rook on the seventh is often worth a pawn.',
    },
    protectedPassedPawn: {
      legende:
        'A passed pawn defended by another pawn: the enemy king can neither take it nor leave it. It is the most decisive advantage in pawn endgames.',
    },
    rookBehindPasser: {
      legende:
        'The rook pushes its pawn from behind: it gains range as the pawn advances, while the enemy rook loses it. Tarrasch’s rule, and it holds.',
    },
    backwardPawn: {
      legende:
        'The c3 pawn has been left behind its neighbours and cannot advance without being lost: no friendly pawn will ever defend it. The square in front of it is an outpost handed over.',
    },
  },
  explications: {
    checkmate: {
      titre: 'Checkmate',
      texte:
        'The king is attacked and no legal move can remedy it: he can neither flee, nor capture the attacker, nor interpose. The game stops at once.',
      terme: 'Checkmate',
    },
    stalemate: {
      titre: 'Stalemate',
      texte:
        'The side to move has **no legal move at all**, but their king is not in check: the game is drawn, whatever the material difference. In your statistics it is the line to watch — a stalemate is almost always a win let slip at the end of the game, for want of leaving the enemy king a square.',
      terme: 'Stalemate',
    },
    resigned: {
      titre: 'Resignation',
      texte:
        'A player accepted they were lost and stopped the game before mate. It is the commonest ending between experienced players: once the position is hopeless, playing out the remaining twenty moves teaches nobody anything. **Resigning too early, on the other hand, is an expensive habit** — plenty of “lost” positions are still saved against an opponent of your own level.',
    },
    timeout: {
      titre: 'Time out',
      texte:
        'The flag has fallen. The game is lost even a whole queen up — unless your opponent no longer has enough to mate, in which case it is drawn. **A lot of losses on time in the same column means a time control too short for the way you play**, not a lack of speed: you do not gain time by playing faster, you gain it by hesitating less.',
      terme: 'Time control',
    },
    draw: {
      titre: 'Draw',
      texte:
        'Nobody wins: agreement between the players, the same position repeated three times, fifty moves with no capture and no pawn push, or not enough material to mate. Each side leaves with half a point.',
      terme: 'Draw by repetition',
    },
    abandoned: {
      titre: 'Opponent left',
      texte:
        'A player left the game without finishing it, and the waiting time ran out. The result follows the position and the rules of the game: **so it is not always a win**, which is why this line counts its games and its wins separately.',
    },
    aborted: {
      titre: 'Aborted',
      texte:
        'The game stopped before it had really started — too few moves played for it to count. It touches neither the rating nor the score, and is here only for the record.',
    },
    ultraBullet: {
      titre: 'Ultrabullet',
      texte:
        'Under 30 seconds for the whole game. It is a game of dexterity more than a game of chess: you play by recognised pattern and by hand, never by calculation.',
      terme: 'Time control',
    },
    bullet: {
      titre: 'Bullet',
      texte:
        'Under 3 minutes per player. You no longer calculate, you recognise: it is the time control that rewards puzzle training best, and the worst one for learning an opening.',
      terme: 'Time control',
    },
    blitz: {
      titre: 'Blitz',
      texte:
        'From 3 to 10 minutes per player. Enough for a plan, too little to check it. It is the most played time control online, and the one where the gap between what you know and what you play is widest.',
      terme: 'Time control',
    },
    rapid: {
      titre: 'Rapid',
      texte:
        'From 10 to 60 minutes per player. The first time control where you have time to calculate a line to the end. **It is the one where you improve fastest**: one game contains more considered decisions than ten bullet games.',
      terme: 'Time control',
    },
    classical: {
      titre: 'Classical',
      texte:
        'More than an hour per player. The time control of over-the-board tournaments: you play few games, but each one is analysed afterwards line by line.',
      terme: 'Time control',
    },
    correspondence: {
      titre: 'Correspondence',
      texte:
        'From one to fourteen days per move. You play your game between other things, and you are allowed to move the pieces around to look — it is the format that teaches endgames best.',
      terme: 'Time control',
    },
  },
  creditsNotes: {
    stockfish: {
      note: 'The strongest chess engine in the world. It runs natively on the server, and in the browser through WebAssembly.',
    },
    'stockfish-js': {
      note: 'The WebAssembly build of Stockfish, which lets you analyse without sending anything to a server.',
    },
    'chess-js': {
      note: 'The rules of the game: legal move generation, mate detection, PGN parsing.',
    },
    maia: {
      note: 'Nine networks trained on human games: at 1100, the opponent makes the mistakes an 1100 player really makes.',
    },
    'leela-chess-zero': {
      note: 'The engine that runs Maia’s networks — weights on their own do not play.',
    },
    piper: {
      note: 'The coach’s voice, synthesised on the server and offline: nothing that is said leaves the machine.',
    },
    'base-d-ouvertures': {
      note: '3,810 named and classified openings, translated into French for this project.',
    },
    'base-de-puzzles': {
      note: '6,057,356 tactical positions, rated and tagged by theme, taken from real games.',
    },
    'base-de-positions': {
      note: '3,568 endgame positions classified by material, from “mate with a queen” to “hold the draw a rook down”, translated and re-rated for difficulty for this project.',
    },
    'tables-de-finales': {
      note: 'Perfect play in every endgame of seven pieces or fewer. A certainty, not an evaluation.',
    },
    'voix-piper': {
      note: 'The French and English voice models of the coach.',
    },
    'pieces-staunton-cburnett': {
      note: 'The most widely used vector piece set in the free software world.',
    },
    'pieces-merida': {
      note: 'Crisp outlines, excellent legibility at small sizes.',
    },
    'pieces-fantasy-spatial': {
      note: 'Three sets with character, with sculpted volumes.',
    },
    'pieces-chessnut': {
      note: 'Spare and contemporary.',
    },
    'pieces-rhos': {
      note: 'Flat colours, public domain.',
    },
    'pieces-alpha-pixel': {
      note: 'Three minimalist approaches, including a set in letters for maximum legibility.',
    },
    bruitages: {
      note: 'Move, capture, check, end of game.',
    },
    'next-js': {
      note: 'The framework of the web application: routing, server rendering, bundling.',
    },
    react: {
      note: 'The interface library.',
    },
    'react-dom': {
      note: 'React’s rendering in the browser.',
    },
    'server-only': {
      note: 'A guard rail: it fails the build if a server module heads for the browser.',
    },
    'three-js': {
      note: 'The three-dimensional rendering of the board.',
    },
    'react-three-fiber': {
      note: 'The bridge between React and three.js.',
    },
    drei: {
      note: 'The helpers of the 3D scene: camera, lights, model loading.',
    },
    zustand: {
      note: 'The preferences store, shared by the whole interface.',
    },
    lucide: {
      note: 'The icons throughout the interface.',
    },
    clsx: {
      note: 'The assembly of conditional CSS classes.',
    },
    'socket-io': {
      note: 'The real time of live games, on the server side.',
    },
    'socket-io-client': {
      note: 'The same, on the browser side.',
    },
    'drizzle-orm': {
      note: 'The schema and the SQL queries, typed.',
    },
    postgres: {
      note: 'The PostgreSQL driver.',
    },
    nodemailer: {
      note: 'Sending mail — password recovery, and nothing else.',
    },
    'web-push': {
      note: 'Push notifications: a challenge, a friend request, a move played against you.',
    },
  },
  memo: {
    'qu-est-ce-que': {
      question: 'What did their last move change?',
      comment:
        'A square freed, a line opened, a piece now attacking what it was not attacking before. A move always does something — even a bad one.',
    },
    'qu-est-ce-qu': {
      question: 'What are they attacking?',
      comment:
        'Go round your pieces: which are attacked, which are defended, and by what. A piece attacked twice and defended once is lost.',
    },
    'qu-est-ce-que-mon': {
      question: 'What does my move leave hanging?',
      comment:
        'The piece you move no longer defends what it was defending, and the square you put it on may be attacked. It is the mistake that costs the most points below 1,200.',
    },
    's-il-joue-le': {
      question: 'If they play the nastiest move, does it hold?',
      comment:
        'One move to examine: the most aggressive one they have. A check, a capture, a mate threat. If it holds against that one, it holds.',
    },
  },
  principesListe: {
    'occupe-le-centre-avec': {
      regle: 'Occupy the centre with a pawn.',
      pourquoi:
        'A pawn in the centre takes space, opens lines for your pieces and gives them twice as many squares as one at the edge of the board.',
      sauf: 'The openings that control it from a distance — King’s Indian, Sicilian — give it up on purpose in order to strike at it afterwards.',
    },
    'sors-les-cavaliers-avant': {
      regle: 'Bring the knights out before the bishops.',
      pourquoi:
        'A knight has only one good square in most openings, a bishop has three or four. You play what you know first, and keep the choice for later.',
      sauf: 'The systems where the bishop comes out first are built precisely for that — London, fianchetto.',
    },
    'ne-bouge-pas-deux': {
      regle: 'Do not move the same piece twice without a reason.',
      pourquoi:
        'Every move lost is a move given away. Developing eight pieces in eight moves means reaching the middlegame with a whole army.',
      sauf: 'If a move of your opponent’s attacks that piece and retreating it is the lesser evil, retreat it.',
    },
    'roque-tot-et-du': {
      regle: 'Castle early, and on the right side.',
      pourquoi:
        'A king in the centre is the target of every opened line. Castling puts the king in safety and the rook to work in a single move.',
      sauf: 'When your opponent has already castled on the opposite side and the pawn race is on, the king can stay in the centre so as not to offer a target.',
    },
    'ne-sors-pas-la': {
      regle: 'Do not bring the queen out too early.',
      pourquoi:
        'She is worth nine points: anything that attacks her gains a tempo. A queen out on move three spends the next ten running away.',
      sauf: 'A few openings bring her out at once and accept it — the Scandinavian, for instance, where she settles on a5 with a plan.',
    },
    'ne-pousse-pas-les': {
      regle: 'Do not push the wing pawns before you have developed.',
      pourquoi:
        'A pawn that advances does not come back, and it leaves behind it squares nobody will defend again.',
      sauf: 'A clear gain of time or space — h3 to prevent a pin, a4 to block your opponent’s expansion — is worth the move.',
    },
    'connecte-tes-tours': {
      regle: 'Connect your rooks.',
      pourquoi:
        'When there is nothing left between them, development is finished: that is the signal that you can start playing to win.',
      sauf: 'Nothing, or almost. It is the most reliable principle on the list.',
    },
    'ne-cherche-pas-le': {
      regle: 'Do not go looking for mate in four.',
      pourquoi:
        'Scholar’s mate and its cousins lose against anybody who knows them, and you leave three tempi of development behind.',
      sauf: 'You do have to know them in order to parry them: that is what the chapter “The opening mates” is for.',
    },
    'ameliore-ta-pire-piece': {
      regle: 'Improve your worst piece.',
      pourquoi:
        'When no plan suggests itself, the question “which of my pieces is working least?” produces one every time.',
      sauf: 'If a tactic is available, it comes first: a plan does not make up for a won piece left on the table.',
    },
    'les-tours-vont-sur': {
      regle: 'Rooks belong on open files.',
      pourquoi:
        'A rook is only worth its five points if it sees far. On a closed file, it stares at its own pawn.',
      sauf: 'A half-open file where your opponent has a weak pawn is better than an open file leading nowhere.',
    },
    'attaque-du-cote-ou': {
      regle: 'Attack on the side where you have more space.',
      pourquoi:
        'Space is counted in advanced pawns. Attacking where you are cramped means attacking with two pieces against four.',
      sauf: 'An exposed enemy king justifies attacking anywhere, even one against three.',
    },
    'avant-d-attaquer-sur': {
      regle: 'Before attacking on a wing, secure the centre.',
      pourquoi:
        'A wing attack is refuted by a move in the centre: the lines open where your king is, and the attack no longer has time to arrive.',
      sauf: 'With kings castled on opposite sides, the race is on and counting tempi replaces the principle.',
    },
    'n-echange-pas-sans': {
      regle: 'Do not exchange without knowing what the exchange leaves you.',
      pourquoi:
        'Every exchange simplifies, and simplification favours whoever is materially ahead. If that is the other player, it costs you.',
      sauf: 'Exchanging to get rid of the piece attacking your king is almost always good, even when you are worse.',
    },
    'deux-faiblesses-valent-mieux': {
      regle: 'Two weaknesses are better than one.',
      pourquoi:
        'A position almost never falls on a single weak point: you create a second one at the other end, and the defence can no longer cover both.',
      sauf: 'If the first weakness is enough to win material right now, do not go looking for the second.',
    },
    'regarde-le-coup-le': {
      regle: 'Look at the nastiest move before playing your own.',
      pourquoi:
        'It is the short version of the checklist. A single move examined — the most aggressive one they have — rules out almost every blunder.',
      sauf: 'Nothing. That one admits no exception.',
    },
    'quand-tu-as-gagne': {
      regle: 'When you have won material, simplify.',
      pourquoi:
        'An extra piece on an empty board decides the game; the same piece in a complicated position is lost in one move.',
      sauf: 'Do not simplify into an endgame that is drawn by nature — wrong-coloured bishop, isolated a- or h-pawn.',
    },
    'active-ton-roi': {
      regle: 'Activate your king.',
      pourquoi:
        'Without queens, the king becomes a strong piece and a free one. Whoever keeps him at the back is playing a piece down.',
      sauf: 'As long as queens or two rooks each remain, the king is a target.',
    },
    'la-tour-se-place': {
      regle: 'The rook goes behind the passed pawn.',
      pourquoi:
        'Behind it, the rook gains space as the pawn advances — whether the pawn is yours or theirs. In front, it gets pushed.',
      sauf: 'On the seventh rank, a rook eating pawns often does better than the rule.',
    },
    'cree-un-pion-passe': {
      regle: 'Create a passed pawn on the side where you have the majority.',
      pourquoi:
        'Two pawns against one produce a passed pawn by force. It is the most mechanical plan in all of endgame play.',
      sauf: 'If your majority is on the side of the enemy king, it will only produce a passed pawn he stops on the spot.',
    },
    'prends-l-opposition': {
      regle: 'Take the opposition.',
      pourquoi:
        'In king and pawn endings, whoever forces the other to give way wins. The opposition is how you know in advance.',
      sauf: 'Positions with several pawns are decided first by counting tempi; the opposition only settles the simple cases.',
    },
    'compte-avant-de-courir': {
      regle: 'Count before you run.',
      pourquoi:
        'The rule of the square, or two columns of arithmetic: you know in five seconds whether the king catches the pawn. That is more reliable than any intuition.',
      sauf: 'Pawns that get in each other’s way break the square: then you have to calculate for real.',
    },
    'ne-te-precipite-pas': {
      regle: 'Do not rush.',
      pourquoi:
        'A winning endgame is won by improving your position move after move. Haste is the leading cause of draws in won positions.',
      sauf: 'The fifty-move rule exists: if nothing moves, a pawn will have to be pushed eventually.',
    },
    'cherche-le-pat-quand': {
      regle: 'Look for stalemate when you are losing.',
      pourquoi:
        'It is the lifeline of whoever is behind, and it works all the better when the other player thinks they have won.',
      sauf: 'Do not play for stalemate at the cost of a position that is still holdable: you do not trade a likely draw for a miraculous one.',
    },
    'echange-les-pieces-pas': {
      regle: 'Exchange pieces, not pawns.',
      pourquoi:
        'With an extra pawn, every piece exchanged brings you closer to the win; every pawn exchanged takes you further from it.',
      sauf: 'Exactly the reverse when you are a pawn down: exchange pawns and keep the pieces.',
    },
    'un-cavalier-veut-un': {
      regle: 'A knight wants an outpost.',
      pourquoi:
        'An advanced square no pawn can attack, defended by one of yours: the knight that settles there will not leave.',
      sauf: 'An outpost that looks at nothing important is just a pretty square.',
    },
    'un-fou-veut-des': {
      regle: 'A bishop wants open diagonals.',
      pourquoi:
        'It costs nothing to place and everything to unblock: you move the pawns, not the bishop.',
      sauf: 'A bishop can stay behind its pawns to hold them, until the position opens.',
    },
    'la-paire-de-fous': {
      regle: 'The bishop pair likes open positions.',
      pourquoi:
        'Together they cover both colours of square: the advantage is worth about half a pawn, and the more open the position, the more it counts.',
      sauf: 'In a blocked position, a good knight is worth more than two bishops that see nothing.',
    },
    'ne-cree-pas-de': {
      regle: 'Do not create a pawn weakness without compensation.',
      pourquoi:
        'An isolated, doubled or backward pawn is a permanent target: it no longer moves, and it has to be guarded.',
      sauf: 'The isolated pawn gives space and squares in the middlegame. It is an endgame flaw paid for in activity.',
    },
    'les-cases-faibles-se': {
      regle: 'Weak squares are for taking, not for regretting.',
      pourquoi:
        'A square no enemy pawn defends any more is to be occupied with a piece, not contemplated.',
      sauf: 'Occupying a weak square with your only active piece can make that piece passive in turn.',
    },
    'empeche-avant-de-faire': {
      regle: 'Prevent before you proceed.',
      pourquoi:
        'Prophylaxis: seeing what your opponent wants to do and making it impossible. It is the skill that separates 1,900 from 2,200.',
      sauf: 'Prevent too much and you do nothing. You need a plan of your own as well.',
    },
    'le-pion-passe-protege': {
      regle: 'The protected passed pawn is a lasting advantage.',
      pourquoi:
        'It cannot be taken, it has to be watched, and it ties an enemy piece down for the rest of the game.',
      sauf: 'It wins nothing on its own: you need a second weakness elsewhere.',
    },
    'une-colonne-se-prend': {
      regle: 'A file is taken with two rooks.',
      pourquoi:
        'The first rook occupies, the second doubles. That is how an open file is turned into penetration on the seventh.',
      sauf: 'If your opponent controls the entry square, doubling achieves nothing until you have contested it.',
    },
    'les-pions-ne-reviennent': {
      regle: 'Pawns do not come back.',
      pourquoi:
        'Every push is final. That is why a pawn structure tells the rest of the game better than the position of the pieces does.',
      sauf: 'Nothing. It is a rule of the game, not a principle.',
    },
    'bloque-le-pion-passe': {
      regle: 'Blockade your opponent’s passed pawn, preferably with a knight.',
      pourquoi:
        'A blockaded pawn no longer queens, and the knight blockading it keeps all its activity — unlike a rook.',
      sauf: 'If you can win it rather than blockade it, win it.',
    },
    'un-roi-expose-change': {
      regle: 'An exposed king changes every calculation.',
      pourquoi:
        'Against a king with no shelter, material counts for less than the number of pieces looking at him. It is the one situation where sacrificing is done on instinct.',
      sauf: 'An exposed but well-defended king holds up very well: count the attackers and the defenders before giving anything up.',
    },
    'les-roques-opposes-veulent': {
      regle: 'Opposite castling wants pawns, not pieces.',
      pourquoi:
        'When each side attacks on their own wing, the pawns arrive without weakening your own king. The faster one wins.',
      sauf: 'If their attack is faster than yours, you have to defend — and that calculation is made move by move.',
    },
    'echange-le-fou-qui': {
      regle: 'Exchange the bishop that defends the colour of square you are attacking.',
      pourquoi:
        'Removing the defender of the dark squares around the king makes all your dark-squared pieces suddenly useful.',
      sauf: 'Not at the cost of two tempi if the attack is a race.',
    },
    'quand-tu-ne-sais': {
      regle: 'When you do not know what to do, look at the pawns.',
      pourquoi:
        'The structure says where to attack, which side the space is on and what endgame awaits you. It answers when nothing else does.',
      sauf: 'Nothing — it is the fallback principle, and it is there precisely for when the others fall silent.',
    },
  },
  fiches: {
    italienne: {
      nom: 'Italian Game',
      alias: 'italian game, giuoco piano, italian',
      idee: 'The most direct development there is: pawn in the centre, knight, bishop, and the bishop looks at f7 — the weakest square as long as the black king has not castled.',
      structure:
        'Pawns e4 against e5, a symmetrical centre that stays closed until somebody plays d4 or d5. Everything is decided by the moment that centre opens.',
      planBlancs:
        'Castle, then c3 and d4 to build a big pawn centre. Failing that, the slow version: d3, Nbd2, Nf1-g3 and a pawn attack on the kingside.',
      planNoirs:
        'The same thing mirrored — c6, d5 — or else ...Nf6 heading for the Two Knights Defence, which is sharper.',
      piege:
        'Never play Qh5 hoping for Scholar’s mate: Black parries while developing, and you spend three moves bringing your queen home.',
    },
    espagnole: {
      nom: 'Ruy Lopez',
      alias: 'ruy lopez, spanish game, spanish opening',
      idee: 'Attack the defender rather than the pawn: the bishop on b5 does not take e5, it neutralises the knight that guards it.',
      structure:
        'Centre e4 against e5, often closed again by d3 and c3 on the white side. These games go a long time without a single pawn exchange.',
      planBlancs:
        'c3, d3, Nbd2, then the knight manoeuvre towards f1 and g3 or e3. You rearrange slowly and attack on the kingside afterwards.',
      planNoirs:
        'a6 to chase the bishop, then d6, Be7, 0-0, and the ...b5 push that gains space on the queenside.',
      piege:
        'Noah’s Ark: after a6, b5 and c4, the black pawns shut the white bishop in on b3 and win it outright.',
    },
    'deux-cavaliers': {
      nom: 'Two Knights Defence',
      alias: 'two knights defence, two knights, fegatello, fried liver',
      idee: 'Black ignores the threat against f7 and develops. It is a bet on calculation: the position turns sharp immediately.',
      structure:
        'An open centre as soon as d4 or d5 arrives. In the first ten moves, pawns matter less than time.',
      planBlancs:
        'Ng5 to hit f7 at once, or the quiet d4. The first leads to the Fegatello, the second to an ordinary game.',
      planNoirs:
        'After Ng5, the answer is d5 — and above all not taking back on d5 with the knight.',
      piege:
        'The Fegatello: 4.Ng5 d5 5.exd5 Nxd5 loses to 6.Nxf7 Kxf7 7.Qf3+. The right move is 5…Na5, which chases the bishop and keeps everything.',
    },
    ecossaise: {
      nom: 'Scotch Game',
      alias: 'scotch game, scotch',
      idee: 'Open the centre on move three, before Black has finished settling in. Nothing to memorise: the pieces come out on obvious squares.',
      structure:
        'The centre opens straight away. White and black pawns trade on d4, and two camps with free pieces are left.',
      planBlancs:
        'Take back on d4 with the knight, then develop quickly and occupy the open files. The positions are simple and traps are rare.',
      planNoirs: '...Bc5 or ...Nf6 to attack the knight on d4 and get the same free development.',
      piege:
        'After 4…Bc5, do not play Nxc6 automatically: Black takes back with dxc6 and their bishop on c5 becomes very strong on the diagonal.',
    },
    'gambit-roi': {
      nom: 'King’s Gambit',
      alias: 'king’s gambit, kings gambit',
      idee: 'Give a pawn to take the whole centre and open the f-file towards the black king. The most romantic of openings and the riskiest.',
      structure:
        'Open f-file for White, an extra pawn for Black, and the e1-h4 diagonal dangerously bare.',
      planBlancs:
        'Nf3, d4, Bc4 and attack down the f-file before Black consolidates their extra pawn.',
      planNoirs:
        'Give the pawn back at the right moment and aim at the white king — the g3 square and the diagonal towards e1 are the weak points.',
      piege:
        'After 2.f4 exf4, do not play 3.Nf3 g5 4.h4 without knowing where your rook is going: the h-file opens both ways.',
    },
    petroff: {
      nom: 'Petrov’s Defence',
      alias: 'petrov’s defence, petroff, petrov, russian game',
      idee: 'Answer an attack with a symmetrical attack. The most solid opening against 1.e4, and the one that leads to the most draws.',
      structure:
        'Often an exchange of central pawns and an almost symmetrical position, where the slightest advantage is played out on a single file.',
      planBlancs:
        'Nxe5 then d4, or the quiet Nc3. The advantage is minimal and takes a long time to work with.',
      planNoirs:
        'After 3.Nxe5, play d6 to chase the knight before taking on e4. Never 3…Nxe4 straight away.',
      piege:
        '3.Nxe5 Nxe4 loses material to 4.Qe2: the black knight is attacked and the e-file turns against it.',
    },
    philidor: {
      nom: 'Philidor Defence',
      alias: 'philidor, philidor defence',
      idee: 'Hold e5 with a pawn rather than with a piece. Solid, and deliberately passive — an active plan will be needed later.',
      structure:
        'Black pawns on e5 and d6, shutting in the f8 bishop. White has more space for nothing in return.',
      planBlancs:
        'd4 to open, Nc3, Bc4, and profit from the space while Black sorts out their bishop.',
      planNoirs:
        'Nf6, Be7, 0-0, then look for ...c6 and ...d5 to break free. Without that push, the position stays cramped.',
      piege:
        'Légal’s mate: after 3…d6 4.Bc4 Bg4 5.h3 Bh5, taking the knight on f3 offers mate in three. Do not pin a knight you cannot hold.',
    },
    sicilienne: {
      nom: 'Sicilian Defence',
      alias: 'sicilian defence, sicilian',
      idee: 'Refuse symmetry from the very first move. Black trades a wing pawn for a central pawn and gets the c-file.',
      structure:
        'After the exchange on d4, White has an e4 pawn and the d-file; Black an open c-file and a central majority.',
      planBlancs:
        'Attack on the kingside: f4, g4, and often castling long to launch the pawns. The race is the theme of the opening.',
      planNoirs:
        'The c-file towards the white king, the ...b5 push, and a knight on c4 or d4. Count the tempi before defending.',
      piege:
        'Do not take the b2 pawn with the queen without counting: she often gets trapped, and White wins the attack for a pawn.',
    },
    najdorf: {
      nom: 'Sicilian Najdorf',
      alias: 'najdorf',
      idee: 'The move a6 before anything else: it takes the b5 square away from the white pieces and prepares ...b5 and ...e5 without concessions.',
      structure:
        'An open centre, black pawns on d6 and e6 or e5, and a permanent hole on d5 that White aims at.',
      planBlancs:
        'Be3, f3, Qd2, castle long, then g4 and h4. Or the classical Bg5, which attacks at once.',
      planNoirs:
        '...e5 or ...e6, ...b5, and the counter-attack down the c-file. The d5 square is defended with pieces, not with pawns.',
      piege:
        'The English Attack comes fast: if you let g4 and h4 arrive without playing, your castled king falls in ten moves.',
    },
    francaise: {
      nom: 'French Defence',
      alias: 'french defence, french',
      idee: 'Prepare ...d5 to strike at e4 on the next move, accepting a known drawback: the c8 bishop stays shut in for a long time.',
      structure:
        'A pawn chain e6-d5 against e4-d4, often blocked after e5. White has kingside space, Black has the c-file and the d4 base to attack.',
      planBlancs: 'e5 to close, then attack the king: f4, Nf3, and the pieces towards h5 and g5.',
      planNoirs:
        'Strike at the base of the chain with ...c5, and find a square for the c8 bishop — b7 after ...b6, or a6.',
      piege:
        'After 2.d4 d5 3.Nc3 Nf6 4.e5, do not leave your knight on f6 without a square: it ends up on d7 and Black’s game suffocates.',
    },
    'caro-kann': {
      nom: 'Caro-Kann Defence',
      alias: 'caro-kann, caro kann',
      idee: 'The French without its flaw: you prepare ...d5 with the c6 pawn rather than e6, and the c8 bishop keeps its diagonal.',
      structure:
        'Often a black pawn on d5 traded for e4, a healthy structure and no weaknesses. The endgames are good for Black.',
      planBlancs:
        'The Advance means e5 and the c4 push; the Exchange means exd5 and a battle for space. Either way, play fast to stop Black consolidating.',
      planNoirs:
        'Bring the c8 bishop out to f5 or g4 before playing e6, develop cleanly, and aim for the endgame.',
      piege:
        'After 2.d4 d5 3.exd5 cxd5 4.Bd3, do not answer Bg4: the bishop gets chased by f3 and you lose the tempo you had just gained.',
    },
    scandinave: {
      nom: 'Scandinavian Defence',
      alias: 'scandinavian defence, scandinavian, centre counter',
      idee: 'Trade the central pawn immediately, at the cost of an early queen sortie you accept. The simplest defence to learn against 1.e4.',
      structure:
        'A white pawn on d4, no black pawn in the centre, and an active black queen on a5 or d6.',
      planBlancs:
        'Nc3 to gain a tempo on the queen, then d4, Nf3, Bc4 and castling: faster development is the whole advantage.',
      planNoirs:
        'The queen to a5 or d6 — a square where she stops being chased — then Nf6, c6, Bf5, e6 and castling. The plan is the same every game.',
      piege:
        'The queen back to d8 after 3.Nc3 concedes two tempi for nothing. And if the queen goes to a5, watch out for the Bd2 pin followed by Nd5.',
    },
    pirc: {
      nom: 'Pirc Defence',
      alias: 'pirc defence, pirc',
      idee: 'Let White take the whole centre, then strike at it with ...e5 or ...c5 once it is too big to hold.',
      structure:
        'A big white centre on e4-d4, a black bishop on g7 along the long diagonal, and a solid black king.',
      planBlancs:
        'f4 and the Austrian Attack, or the quiet Be2 and 0-0. Holding the centre is the only obligation.',
      planNoirs:
        'Bg7, 0-0, then ...c5 or ...e5 depending on what White has played. The g7 bishop must end up seeing d4.',
      piege:
        'If you forget to strike at the centre, White plays e5 and your g7 bishop stares at its own knight until the end.',
    },
    alekhine: {
      nom: 'Alekhine’s Defence',
      alias: 'alekhine’s defence, alekhine',
      idee: 'Provoke e5 to give the white pawn an advance it will have to defend, then harass it with ...d6.',
      structure:
        'Very advanced white pawns, often e5 and d4 or even c4: plenty of space, and just as many points to hold.',
      planBlancs:
        'The Four Pawns — e5, d4, c4, f4 — if you like risk; otherwise Nf3, Be2 and a quiet space game.',
      planNoirs:
        '...d6 to attack e5, trade, and exploit the squares the white pawns have left behind them.',
      piege:
        'The black knight gets chased three times in a row at the start: count its retreat squares carefully before committing it.',
    },
    'gambit-dame': {
      nom: 'Queen’s Gambit',
      alias: 'queen’s gambit, queens gambit',
      idee: 'It is not a real gambit: if Black takes on c4, White recovers the pawn whenever they like with e3 or Qa4.',
      structure:
        'Tension in the centre between c4 and d5. Everything depends on who takes first, and with what.',
      planBlancs:
        'Nc3, Nf3, Bg5, e3: you develop, you keep the tension, and the minority attack on the queenside comes later.',
      planNoirs:
        'Hold d5 with e6 or c6, or take on c4 and give the centre back in exchange for development.',
      piege:
        'The Elephant trap: after Bg5 Nbd7, taking Nxd5 loses a piece to Nxd5 Bxd8 Bb4+. Do not take a “pinned” pawn that is not pinned.',
    },
    'gambit-dame-accepte': {
      nom: 'Queen’s Gambit Accepted',
      alias: 'queen’s gambit accepted, queens gambit accepted',
      idee: 'Give the centre back at once to gain time and place your pieces. Black will not keep the pawn, and that is not the point.',
      structure:
        'White pawns on e3-d4 against a black pawn somewhere on the c-file; White has a mobile centre, Black the c-file.',
      planBlancs:
        'e3 or e4, take back on c4, and push d4-d5 at the right moment. The isolated pawn that results is a weapon, not a flaw.',
      planNoirs:
        '...e6, ...c5 and ...Nc6 to attack d4. The c8 bishop comes out before it gets shut in.',
      piege:
        'Do not try to keep the c4 pawn with ...b5: White plays a4 and your queenside structure collapses.',
    },
    slave: {
      nom: 'Slav Defence',
      alias: 'slav defence, slav',
      idee: 'Defend d5 with c6 rather than e6: the c8 bishop keeps its way out, and that is the whole difference from the ordinary Queen’s Gambit.',
      structure:
        'Very solid pawns on c6 and d5. Black has no weaknesses, and no play either until ...dxc4 or ...e6 has been played.',
      planBlancs: 'Nf3, Nc3, e3, then Bd3 and 0-0; after that you look for e4 to open the centre.',
      planNoirs:
        '...dxc4 followed by ...Bf5 or ...b5, or the slow plan ...e6, ...Nbd7 and ...dxc4 later.',
      piege:
        'The Exchange trap: after 3…c6 4.cxd5 cxd5 the position is strictly symmetrical and gives White nothing. Only play that exchange if you want the draw.',
    },
    londres: {
      nom: 'London System',
      alias: 'london system, london',
      idee: 'Bring the bishop out before playing e3, so as not to shut it in. A system: the same six moves whatever Black plays.',
      structure:
        'White pawns on d4 and e3, a black pawn on d5, a closed centre. The game is played on the e5 square and on the kingside.',
      planBlancs:
        'e3, Bd3, Nbd2, c3, then Ne5 and a slow attack on the black king. Nothing to memorise, everything to understand.',
      planNoirs:
        'Contest e5 with ...Nbd7 and ...c5, or trade the f4 bishop with ...Bd6. Once that bishop has gone, the system loses its bite.',
      piege:
        'Do not play Bd3 before the c8 bishop has come out: Black answers Bf5 and trades off your best attacker.',
    },
    'nimzo-indienne': {
      nom: 'Nimzo-Indian Defence',
      alias: 'nimzo-indian defence, nimzo-indian, nimzo indian, nimzo',
      idee: 'Pin the knight on c3 to stop e4. Black trades a bishop for a knight and gets control of the light squares.',
      structure:
        'Often doubled white c-pawns after ...Bxc3: a weakness against the bishop pair. The whole game starts from that exchange.',
      planBlancs:
        'a3 to force the exchange, or Qc2 to avoid it. Then e4 at all costs, and the bishop pair in an open position.',
      planNoirs:
        'Stop e4 for as long as possible, fix the doubled c-pawns and play ...c5, ...d6, ...Nc6.',
      piege:
        'Do not give the bishop up on b4 for nothing: if it leaves without having provoked a3 or doubled the pawns, Black has lost the pair for free.',
    },
    'est-indienne': {
      nom: 'King’s Indian Defence',
      alias: 'king’s indian defence, kings indian, king’s indian',
      idee: 'Let White take the entire centre, castle behind the g7 bishop, then blow it all up with ...e5.',
      structure:
        'A big white centre, a pawn chain, and a battle of wings: White on the queenside, Black on the kingside.',
      planBlancs:
        'e4, Be2, 0-0, then d5 and the c5 push on the queenside. Hold the centre and do not worry about Black’s attack too early.',
      planNoirs:
        '...e5, then ...f5, ...g4 and the pawns at the white king. The sharpest opening there is against 1.d4.',
      piege:
        'If the centre closes with d5 and you have not played ...f5, your attack has no ammunition: the race is lost before it starts.',
    },
    grunfeld: {
      nom: 'Grünfeld Defence',
      alias: 'grünfeld defence, grunfeld, gruenfeld',
      idee: 'Strike at the centre before even castling. Black gives up the centre in order to attack it with pieces — the hypermodern opening par excellence.',
      structure:
        'A big white pawn centre on c3-d4-e4 against a g7 bishop and the ...c5 pawns. Everything turns on how solid that centre is.',
      planBlancs:
        'Build e4-d4-c3 and advance: if the centre holds, it crushes. Be3, Nf3, Be2, 0-0.',
      planNoirs:
        '...Bg7, ...c5, ...Nc6 and pressure on d4. The g7 bishop is the piece the whole game is about.',
      piege:
        'Do not take the d4 pawn with the queen too early: White gains two tempi and your king has not castled yet.',
    },
    catalane: {
      nom: 'Catalan Opening',
      alias: 'catalan opening, catalan',
      idee: 'A bishop on g2 looking at d5 right across the board. Slow pressure, risk-free, and very hard to face without a plan.',
      structure:
        'A white pawn on d4, a black pawn on d5 often traded on c4, and an open long white diagonal.',
      planBlancs:
        'Bg2, 0-0, Qc2 or Qa4 to recover c4, then e4 or pressure down the c-file and against d5.',
      planNoirs:
        'Hold c4 with ...b5 and ...Bb7, or give the pawn back and play ...c5 to open your own bishop’s diagonal.',
      piege:
        'Giving the c4 pawn back without getting ...c5 in exchange leaves Black with no play at all for twenty moves.',
    },
    hollandaise: {
      nom: 'Dutch Defence',
      alias: 'dutch defence, dutch',
      idee: 'Play for ...e5 from the very first move and get a kingside attack. The price is known: the e6 square and the diagonal towards the king are weakened.',
      structure:
        'Black pawns on f5 and e6 or g6, a closed centre, and an f-file that serves both sides.',
      planBlancs:
        'g3 and Bg2 to exploit the light squares, or the Staunton Gambit e4 to open at once.',
      planNoirs:
        '...Nf6, ...e6, ...Be7, 0-0, then ...Qe8 and ...e5. The e5 push is the whole point of the opening.',
      piege:
        'Watch out for Qh5+ and the bishop on g5 in the first few moves: the hole on e6 and the h5-e8 diagonal are the flaw in the first move.',
    },
    anglaise: {
      nom: 'English Opening',
      alias: 'english opening, english',
      idee: 'A Sicilian in reverse, with an extra tempo. You bring d5 under control without committing a single central pawn.',
      structure:
        'Highly variable: it transposes into almost everything. That is its strength, and the reason it is played by system rather than by theory.',
      planBlancs:
        'Nc3, g3, Bg2, Nf3, 0-0, then the d4 or b4 push depending on what Black has built.',
      planNoirs:
        '...e5 for symmetry, ...Nf6 and ...e6 to transpose towards the Queen’s Gambit, or ...c5 for a queenside battle.',
      piege:
        'Do not play d4 too early: transposing to the Queen’s Gambit cancels the point of the opening and sends you into the theory the English was avoiding.',
    },
    reti: {
      nom: 'Réti Opening',
      alias: 'réti opening, reti opening, reti, réti',
      idee: 'Attack the d5 pawn from a distance, without putting a single pawn in the centre. The centre is taken with pieces, not with pawns.',
      structure:
        'No white pawn in the centre at the start, a bishop on g2, and lasting pressure on d5 and c6.',
      planBlancs:
        'g3, Bg2, 0-0, b3 and Bb2: two bishops on the long diagonals, then d4 or e4 once the position is ripe.',
      planNoirs:
        'Hold d5 with ...c6 and ...e6, or take on c4 and play ...Bf5 to get the bishop out before closing.',
      piege:
        'Taking on c4 and trying to keep the pawn costs the queenside: White plays a4 and the black structure comes apart.',
    },
  },
  lecons: {
    bases: {
      title: 'The basics',
      description:
        'The board, the six pieces, the three special rules. In an hour you will be able to play a whole game without ever wondering whether a move is allowed.',
      echiquier: {
        title: 'The board and its squares',
        summary: 'Sixty-four squares, and a name for each one. This is the language of the game.',
        e1: {
          say: 'Here is a chessboard. Sixty-four squares, eight files and eight ranks. One rule before anything else: the square in the bottom right must always be a light one.',
        },
        e2: {
          say: 'The files carry letters, from a to h, starting from the left. The ranks carry numbers, from 1 to 8, starting from the bottom.',
        },
        e3: {
          say: 'So every square has a name: the letter of its file, then the number of its rank. Here is e4, in the heart of the board.',
        },
        e4: {
          say: 'These four central squares — d4, d5, e4, e5 — are the most important on the board. A piece placed in the centre controls far more squares than a piece in a corner. Remember it: this is the first rule of strategy.',
        },
        e5: {
          say: 'Here is the starting position. White at the bottom, Black at the top. A little trick so you never get it wrong: the queen goes on a square of her own colour. White queen on a light square, black queen on a dark one.',
        },
      },
      tour: {
        title: 'The rook',
        summary: 'It goes in a straight line, as far as it likes. The simplest, and formidable.',
        e1: {
          say: 'The rook moves in a straight line: along its file, or along its rank. As far as it likes, as long as the road is clear.',
        },
        e2: {
          say: 'Your turn. Move the rook to the top of its file, to d8.',
          instruction: 'Play the rook to d8',
          hint: 'Take the rook and slide it upwards, all the way to d8.',
        },
        e3: {
          say: 'The rook never jumps over a piece. Here, that black pawn on g4 blocks its road: it can go as far as g4 to capture it, but no further.',
        },
        e4: {
          say: 'Capture that pawn. To take a piece, you simply put yours in its place.',
          instruction: 'Capture the pawn on g4',
          hint: 'Slide the rook from d4 to g4, onto the pawn.',
        },
        e5: {
          say: 'There. The rook is worth five pawns: it is a heavy piece, a precious one. It becomes very strong when the files open up, in the endgame.',
        },
      },
      fou: {
        title: 'The bishop',
        summary: 'It runs along the diagonals — and stays on squares of one colour all its life.',
        e1: {
          say: 'The bishop moves along the diagonals, as far as it likes. It too jumps over nothing.',
        },
        e2: {
          say: 'Look carefully: this bishop is on a dark square, and every square it can reach is dark. A bishop never changes square colour. Not once in the whole game.',
        },
        e3: {
          say: 'That is why we speak of the bishop pair: with both of them you cover every square on the board. With only one, half of them escape it for ever.',
        },
        e4: {
          say: 'Your turn. Capture the black pawn on f6.',
          instruction: 'Capture the pawn on f6',
          hint: 'Follow the diagonal up and to the right: d4, e5, f6.',
        },
        e5: {
          say: 'The bishop is worth about three pawns, like the knight. In an open position, with few pawns in the centre, it is often the stronger of the two.',
        },
      },
      dame: {
        title: 'The queen',
        summary:
          'Rook and bishop in one. The most powerful piece — and therefore the most fragile.',
        e1: {
          say: 'The queen combines the rook and the bishop: straight lines and diagonals, as far as she likes. From the centre she controls twenty-seven squares.',
        },
        e2: {
          say: 'She is worth nine pawns. That is enormous, and that is exactly the problem: any enemy piece can take her, and the game is lost on the spot. A queen has to be looked after.',
        },
        e3: {
          say: 'That black rook on d8 is defended by nobody, and it is on your queen’s file. Take it.',
          instruction: 'Capture the rook on d8',
          hint: 'The queen goes straight up the d-file.',
        },
        e4: {
          say: 'A very common beginner’s mistake: bringing the queen out in the first few moves. She then gets chased around by less valuable enemy pieces, and you lose time saving her. Bring her out late.',
        },
      },
      cavalier: {
        title: 'The knight',
        summary: 'The only one that jumps. Baffling at first, formidable once tamed.',
        e1: {
          say: 'The knight moves in an L: two squares in one direction, then one square at right angles. From d4 it can reach eight squares.',
        },
        e2: {
          say: 'The trick so you never get it wrong: the knight always changes square colour. From a dark square it goes to a light one, and the other way round. Always.',
        },
        e3: {
          say: 'And above all: it is the only piece that jumps over the others. Here the knight is completely surrounded, and yet it can get out. Watch.',
        },
        e4: {
          say: 'Your turn. Get it out of that wall: play the knight to c6, over the pawns.',
          instruction: 'Play the knight to c6',
          hint: 'Two squares up, one to the left. The knight goes over everything.',
        },
        e5: {
          say: 'The knight is worth three pawns. It is excellent in closed positions, cluttered with pawns, where bishops and rooks suffocate.',
        },
      },
      pion: {
        title: 'The pawn',
        summary: 'It moves straight ahead but captures on the diagonal. And it never goes back.',
        e1: {
          say: 'The pawn is the strangest piece. It moves one square, straight ahead, and never backwards. A pawn that has advanced does not return.',
        },
        e2: {
          say: 'One exception: from its starting square it may advance two squares at once. Only once, on its first move.',
        },
        e3: {
          say: 'Advance the pawn two squares, to d4.',
          instruction: 'Play the pawn to d4',
          hint: 'Take the pawn and put it two squares higher.',
        },
        e4: {
          say: 'Here is what baffles everybody at first: the pawn moves straight ahead, but it captures **on the diagonal**. These two black pawns are within its reach.',
        },
        e5: {
          say: 'Look: the white pawn on d2 can capture on c3 or on e3, but it cannot capture a piece standing right in front of it on d3. That piece would simply block it.',
        },
        e6: {
          say: 'Capture one of the two pawns.',
          instruction: 'Capture a pawn on the diagonal',
          hint: 'The pawn takes on the diagonal, one square only.',
        },
        e7: {
          say: 'The pawn is worth one. It is the unit of measurement of the whole game. But a pawn that reaches the far end of the board turns into a queen — we come back to that in two lessons.',
        },
      },
      roi: {
        title: 'The king',
        summary: 'He moves one square only — but the whole game revolves around him.',
        e1: {
          say: 'The king moves one square only, but in every direction. Eight possible squares from the centre.',
        },
        e2: {
          say: 'The king is never captured. When he is attacked we say he is in check, and it has to be dealt with. Three ways to do it: move the king, capture the attacker, or put a piece in the way.',
        },
        e3: {
          say: 'If none of those three answers exists, it is checkmate: the game is over. That is the one and only aim of the game.',
        },
        e4: {
          say: 'One last rule: two kings can never touch. They must always keep at least one square between them, otherwise they would put each other in check.',
        },
      },
      roque: {
        title: 'Castling',
        summary: 'Two pieces moving in one move: the only such move in the whole game.',
        e1: {
          say: 'Castling puts the king in safety. It is the only move where two pieces move at the same time: the king and a rook.',
        },
        e2: {
          say: 'Kingside castling: the king takes two steps towards the rook, and the rook jumps over him to land right beside him. Watch.',
        },
        e3: {
          say: 'Castle kingside. Take the king and bring him to g1: the rook will follow on its own.',
          instruction: 'Castle kingside',
          hint: 'Take the king on e1 and put him on g1.',
        },
        e4: {
          say: 'Perfect. Your king is now behind three untouched pawns, and your rook has come out of its corner. Two problems solved in one move.',
        },
        e5: {
          say: 'Four conditions for castling. The king has never moved. The rook in question has never moved. The squares between them are empty. And the king is not in check, does not cross an attacked square, and does not land on an attacked square.',
        },
        e6: {
          say: 'There is also queenside castling: the king goes to c1, the rook from a1 comes to d1. It leaves the king slightly less sheltered, but activates the rook sooner.',
        },
      },
      'regles-speciales': {
        title: 'En passant and promotion',
        summary: 'The two rules nobody works out on their own.',
        e1: {
          say: 'Capturing en passant. The black pawn has just advanced two squares at once, passing beside your pawn. The rule says you may capture it as if it had advanced only one.',
        },
        e2: {
          say: 'So your pawn on e5 captures on d6, and the black pawn disappears from d5. Try it.',
          instruction: 'Capture en passant: play the pawn to d6',
          hint: 'Put your e5 pawn on d6, just behind the black pawn.',
        },
        e3: {
          say: 'Careful: this capture is only possible **immediately**. If you play anything else, the chance is gone for good.',
        },
        e4: {
          say: 'Promotion, now. A pawn that reaches the last rank turns into something else. You choose what you want: queen, rook, bishop or knight.',
        },
        e5: {
          say: 'Advance the pawn to d8 and take a queen — that is the choice in more than ninety-nine per cent of cases.',
          instruction: 'Promote the pawn to a queen',
          hint: 'Advance the pawn one square, then choose the queen from the menu.',
        },
        e6: {
          say: 'A pawn worth one becomes a piece worth nine. That is why every pawn matters enormously in the endgame: it is a queen in waiting.',
        },
      },
      'echec-mat-pat': {
        title: 'Check, mate and stalemate',
        summary: 'How you win, and how you miss the win by a hair.',
        e1: {
          say: 'A rook on the enemy king’s file: that is a check. The black king is attacked, he has to react.',
        },
        e2: {
          say: 'With two rooks you can force mate. Here is the staircase technique: the one on h7 already cuts off the seventh rank, all that is left is to give check on the last one.',
        },
        e3: {
          say: 'Play the rook to a8: it gives check on the last rank, and the other rook stops the king coming down.',
          instruction: 'Play the rook to a8',
          hint: 'The rook on a1 goes to the top of its file.',
        },
        e4: {
          say: 'Checkmate. The black king is attacked, he cannot flee to the seventh rank because the other rook controls it, and he has nothing to capture or interpose with. Game over.',
        },
        e5: {
          say: 'Now the trap that infuriates every beginner: stalemate. Here it is Black to move. Their king is **not** in check. But every square around him is controlled, and he has no other piece.',
        },
        e6: {
          say: 'No legal move, and no check: that is stalemate, and the game is a draw. White was a whole queen up and won nothing. Remember it well: when your opponent has almost nothing left, always leave them a square.',
        },
      },
      valeurs: {
        title: 'What each piece is worth',
        summary:
          'A simple scale that will tell you, at every exchange, whether you come out ahead.',
        e1: {
          say: 'The universal scale. The pawn is worth one. The knight and the bishop are worth three. The rook is worth five. The queen is worth nine. The king has no value: he is above all of it, and is never exchanged.',
        },
        e2: {
          say: 'What is it for? For deciding in a second whether an exchange is good. Giving a knight for a rook is three against five: excellent. That is called winning the exchange.',
        },
        e3: {
          say: 'But these numbers are only a starting point. A well-placed knight in the centre is worth more than a rook stuck in a corner. And if you can give mate, material stops counting altogether.',
        },
        e4: {
          say: 'An example: White has just given up a bishop, three points, for a single pawn. At first sight it is absurd. But the black king is dragged out of his shelter, and the attack that follows is worth far more than three points.',
        },
        e5: {
          say: 'That is the whole beauty of the game: material is a compass, not a law. You will learn when to follow it and when to betray it.',
        },
      },
    },
    mats: {
      title: 'Knowing how to mate',
      description:
        'Winning a queen is no use if you cannot finish. The five techniques that end a game, from the back rank to the two bishops.',
      'mat-couloir': {
        title: 'The back-rank mate',
        summary: 'The most frequent mate of all. And the easiest to walk into.',
        e1: {
          say: 'Look at the black king. He has castled, he is nicely tucked away… except that his own pawns block every way out. He is shut in on his back rank.',
        },
        e2: {
          say: 'A rook arriving on that rank is mate at once. Go on.',
          instruction: 'Find mate in one',
          hint: 'The rook goes to the top of its file.',
        },
        e3: {
          say: 'Checkmate. The king cannot go up — he is already at the top — and he cannot come down, his pawns occupy the squares. That is called a back-rank mate.',
        },
        e4: {
          say: 'The remedy takes one move: push a pawn to make an escape square. Here Black has played h6, and their king can now slip away to h7.',
        },
        e5: {
          say: 'Make it a habit, as soon as your rooks leave the back rank: give your king some air. It will save you games you had already won.',
        },
      },
      'mat-escalier': {
        title: 'The staircase mate',
        summary: 'Two rooks, no calculation: the technique repeats itself until mate.',
        e1: {
          say: 'Two rooks are enough to mate a lone king, without even the help of your own. The principle: one rook pushes the king back, the other stops him coming back.',
        },
        e2: {
          say: 'Start by giving check with the rook on a2, on the seventh rank. The black king will have to go up.',
          instruction: 'Play the rook to a7',
          hint: 'The rook on a2 goes up to a7.',
        },
        e3: {
          say: 'The black king has no choice but to go up to the eighth rank. The rook on a7 now forbids him from coming back down.',
        },
        e4: {
          say: 'Now the other rook comes to give check on the eighth rank. That is mate.',
          instruction: 'Play the rook to b8',
          hint: 'The rook on b1 goes right to the top.',
        },
        e5: {
          say: 'That is the staircase: the rooks climb one step at a time in turn, the king retreats, and he ends up cornered. No calculation, just the method. When the king comes near one rook, you send it to the far end of its rank.',
        },
      },
      'mat-tour-roi': {
        title: 'Mating with king and rook',
        summary: 'The most frequent endgame. A rook never mates alone: it is all about the king.',
        e1: {
          say: 'King and rook against a lone king. A rook never mates on its own: try as long as you like, you will always be one square short. It is your king who does the work, the rook only delivers the final blow.',
        },
        e2: {
          say: 'The method has three stages. The rook cuts off a rank to stop the black king coming back down. Your king walks up to join it. And when the two kings face each other, the rook mates.',
        },
        e3: {
          say: 'Here is the position to recognise, and it is the only one to remember. The two kings face each other, one square apart. Your king alone forbids the three squares in front of him: d7, e7 and f7. The black king is left with only d8 and f8, on his own rank.',
        },
        e4: {
          say: 'And a rook takes a whole rank in one move. Go on.',
          instruction: 'Find mate in one',
          hint: 'The rook goes to the top of its file, as far as possible from the black king.',
        },
        e5: {
          say: 'Checkmate. The rook holds d8, e8 and f8; your king holds d7, e7 and f7. Six squares between the two of them, and not one more is needed.',
        },
        e6: {
          say: 'The first mistake, and by far the most common: giving check too soon. Here the kings are not facing each other, they are offset. The rook on h8 would give check, yes, but the black king would run to c7 and everything would have to be done again.',
        },
        e7: {
          say: 'So do not give that check. Walk your king into place first, then mate. A check that does not mate achieves nothing in this endgame: it only hands the enemy king his freedom back.',
        },
        e8: {
          say: 'The second mistake, and it costs the whole game: putting the rook right next to the king. Look. The black king is not in check, and he has no move. That is stalemate. A draw, a whole rook up.',
        },
        e9: {
          say: 'Hence the rule: the rook mates from the far side of the board, never beside the king. Far away it is untouchable and it holds the whole rank. Close up, it gets eaten or it makes a draw.',
        },
      },
      'mat-dame-roi': {
        title: 'Mating with the queen',
        summary: 'The most frequent endgame after a promotion. One to master completely.',
        e1: {
          say: 'King and queen against a lone king. The method: you shrink the cage around the enemy king with the queen, then bring your own king up to deliver the final blow.',
        },
        e2: {
          say: 'A trick for finding the square, and its name is misleading: **the knight’s jump**. There is no knight here — it is the **shape of the move** we mean, the L. The eight marked squares are a knight’s jump from the black king. A queen placed on one of them takes away almost everything, without ever shutting him in completely: that is what avoids stalemate.',
        },
        e3: {
          say: 'Of those eight squares, your queen on d1 reaches only four: d3, f3, g4 and d7. Take **d3** — two squares straight ahead of her.',
          instruction: 'Play the queen to d3',
          hint: 'The queen goes two squares up her file: from d1 to d3.',
        },
        e4: {
          say: 'Look at the result: the black king had eight squares, he now has only three — e6, f6 and f4. And he is not in check, so no stalemate. You repeat the operation every time he moves, and the cage closes on its own.',
        },
        e5: {
          say: 'Beware the trap: here the queen on f2 is right against the black king, but it is Black to move and they have no move at all. Stalemate. A draw. A whole queen up, and no points.',
        },
        e6: {
          say: 'The golden rule: never put your queen next to the enemy king unless your own king is defending her. Bring him up first, mate afterwards.',
        },
      },
      'mat-deux-fous': {
        title: 'Mating with the two bishops',
        summary:
          'Two bishops side by side make a wall no king gets through. You still have to see it.',
        e1: {
          say: 'Two bishops mate a lone king, and they are the only pair of minor pieces that manage it every time. The principle: each one sees a single colour of square, but together they see everything.',
        },
        e2: {
          say: 'The mate only comes in a corner or right along an edge. Here the black king is already on h8, and your king on g6 forbids him g7 and h7. He is left with one square: g8.',
        },
        e3: {
          say: 'And that square is already watched by your bishop on c4, from the far end of its diagonal. So the black king is shut in without being in check. All that is missing is the check.',
        },
        e4: {
          say: 'Your second bishop, the dark-squared one, only has to land on the long diagonal to touch h8.',
          instruction: 'Play the bishop to c3',
          hint: 'The bishop on d2 steps back one square on the diagonal, to c3.',
        },
        e5: {
          say: 'Checkmate. There is the wall: one bishop gives the check along a diagonal, the other covers the escape square on the neighbouring diagonal, and your king holds the two squares that remain. All three pieces are indispensable.',
        },
        e6: {
          say: 'The technique in one sentence: bring your two bishops side by side, they form a barrier the king cannot cross, then advance the barrier towards an edge with your king behind it. Never separate the bishops — that is the whole secret.',
        },
      },
      'mat-etouffe': {
        title: 'The smothered mate',
        summary:
          'A knight mates a king his own pieces have shut in. The most beautiful in the game.',
        e1: {
          say: 'Look at the black king. He has castled, he is safe, and he is shut in — by his own rook on g8 and his own pawns on g7 and h7. He has not a single free square.',
        },
        e2: {
          say: 'Against a king like that, the knight is the only piece that counts. A rook or a queen can be taken, or blocked by a piece stepping in front. A knight cannot: it jumps, and its check can never be blocked.',
        },
        e3: {
          say: 'The knight jumps to f7. From there it touches h8, and nothing can either take it or step in the way.',
          instruction: 'Play the knight to f7',
          hint: 'The knight on g5 makes an L to f7.',
        },
        e4: {
          say: 'Checkmate with a knight and nothing else. That is what we call a smothered mate: the king dies smothered by his own defenders.',
        },
        e5: {
          say: 'Now the famous version, and one thing is missing from it. The pawns still shut the king in, but the rook is on f8: the g8 square is free. The knight on f7 would only be a check.',
        },
        e6: {
          say: 'So g8 has to be blocked, and the only piece that can go there is your queen. We are going to give her up on it.',
        },
        e7: {
          say: 'The queen goes to g8 and lets herself be taken. She is not lost: your knight on h6 watches g8, so the king cannot eat her. Only the rook can.',
          instruction: 'Play the queen to g8',
          hint: 'The queen on b3 runs down the diagonal to g8.',
        },
        e8: {
          say: 'The rook had to take — it was its only legal move. And in taking, it has just landed on exactly the square through which its king could have escaped.',
        },
        e9: {
          say: 'The cage has been shut, by Black themselves. Finish it.',
          instruction: 'Find the mate',
          hint: 'The knight on h6 jumps to f7.',
        },
        e10: {
          say: 'A queen for a mate. It is called Philidor’s legacy, and it is the oldest recorded combination in the game. The reflex to keep: as soon as an enemy king has castled and has no escape square, look for a knight.',
        },
      },
    },
    'mats-ouverture': {
      title: 'The opening mates',
      description:
        'The mates that land in the first ten moves. Each with its variations: the line that mates, the answers that refute it, and the price you pay when you have tried it for nothing.',
      'mat-imbecile': {
        title: 'Fool’s mate',
        summary:
          'Two moves. The fastest mate there is — and the one you need to know how to avoid.',
        opening: 'Barnes Opening',
        risk: 'Nothing',
        theme: 'The e1-h4 diagonal',
        caution:
          'Nobody will ever hand it to you: it takes two absurd moves in a row. This lesson is about never suffering it, not about trying it.',
        e1: {
          say: 'The fastest mate in the game takes two moves. You will probably never give it — the opponent has to play along — but it teaches you the most dangerous diagonal on the board.',
        },
        e2: {
          say: 'White has pushed the f-pawn. Look at what it has just opened: a diagonal that starts on h4 and runs straight at their king, through g3 and f2.',
        },
        e3: {
          say: 'You have Black. Answer e5, a perfectly normal move — it occupies the centre, and it frees your queen along that same diagonal.',
          instruction: 'Play the pawn to e5',
          hint: 'The e7 pawn advances two squares.',
        },
        e4: {
          say: 'And White pushes the g-pawn. That is the second fatal move: g3 is now defended by nobody, f2 is empty, and the diagonal is wide open from h4 to the white king.',
        },
        e5: {
          say: 'Your turn. Your queen only has to travel down the diagonal.',
          instruction: 'Find the mate',
          hint: 'The queen on d8 runs down the diagonal: e7, f6, g5, h4.',
        },
        e6: {
          say: 'Checkmate in two moves. The white king is attacked and can do nothing: f2 is the only free square around him, and your queen covers it. Nothing can step in on g3 or f2, and nothing reaches your queen.',
        },
        e7: {
          say: 'The variations change nothing. f3 then g4, f4 then g4, or g4 then f3: the mate is the same. What matters is not the order of the moves but the result — both f- and g-pawns gone, and nobody left on the king’s diagonal.',
        },
        e8: {
          say: 'Now turn the board round, because that is where the lesson pays. You have White, and Black has just played f6 then g5. They have made exactly the same mistake, one move later.',
        },
        e9: {
          say: 'Punish them.',
          instruction: 'Find the mate',
          hint: 'The queen on d1 runs down the diagonal to h5.',
        },
        e10: {
          say: 'That is the real lesson, and it fits in one sentence: never push the f- and g-pawns together before you have castled. They are what guards your king, and they guard him as a pair or not at all.',
        },
      },
      'mat-berger': {
        title: 'Scholar’s mate',
        summary:
          'Four moves and the game is over. Knowing it is mostly about never walking into it.',
        opening: 'Parham Attack',
        risk: 'Your queen comes out too early',
        theme: 'Mate on f7',
        caution:
          'Bringing the queen out on move two is a mistake of principle. Against anyone who knows the defence you lose tempo chasing her back and play a worse position.',
        e1: {
          say: 'At the very start of the game, one square is weaker than all the others: f7. Look at who defends it. Nobody, except the king himself.',
        },
        e2: {
          say: 'The bishop comes out to c4. From there it looks at f7 along the diagonal, right across the board.',
          instruction: 'Play the bishop to c4',
          hint: 'The bishop on f1 comes out along the diagonal: e2, d3, c4.',
        },
        e3: {
          say: 'Black has developed a knight, but it does not defend f7. Now bring your queen to h5: she aims at f7 as well. Two attackers against a single defender.',
          instruction: 'Play the queen to h5',
          hint: 'The queen on d1 runs down the diagonal to h5.',
        },
        e4: {
          say: 'Black brings out their second knight. The move looks natural — it develops a piece and it attacks your queen — and it loses the game on the next move.',
        },
        e5: {
          say: 'Your turn. The queen takes on f7, and the bishop defends her.',
          instruction: 'Find the mate',
          hint: 'The queen on h5 comes down to eat the f7 pawn.',
        },
        e6: {
          say: 'Checkmate. The king cannot take the queen, the bishop on c4 protects her. Nor can he flee: the queen forbids him e7 and d7, and his own pieces occupy d8 and f8.',
        },
        e7: {
          say: 'The first variation, and it is the main defence. Instead of the knight, Black pushes the g6 pawn. It chases the queen away and blocks her diagonal in a single move. There is no mate any more.',
        },
        e8: {
          say: 'A second defence, just as good: the black queen to e7. She defends f7 a second time, and two attackers against two defenders achieve nothing at all.',
        },
        e9: {
          say: 'A third variation, and this one punishes. If Black has brought their knight out to f6 straight away, whatever you do, do not play the queen to h5: that knight covers h5, and it would simply eat her.',
        },
        e10: {
          say: 'And here is what awaits you once the defence arrives. Your queen has had to retreat to f3, she has lost two moves, Black has developed two knights and pushed g6. You are three tempi down with a queen that gets in your own knight’s way.',
        },
        e11: {
          say: 'So remember both sides. If a queen aims at your f7 square, answer g6 or defend with your queen on e7. And do not count on this mate yourself: as soon as your opponent knows it, all you have done is bring your queen out too early, and you will spend the game running away with her.',
        },
      },
      'mat-shilling': {
        title: 'The Shilling trap',
        summary:
          'Black offers a pawn. Whoever takes it is mated in seven moves, by their own pieces.',
        opening: 'Italian Game',
        risk: 'A pawn',
        theme: 'Smothered mate',
        caution:
          'The move Nd4 is objectively dubious. If White plays Nxd4 instead of taking on e5, you are a pawn down for nothing.',
        e1: {
          say: 'The Italian Game, the most played of all. You have Black. This trap used to sell for a shilling in the chess cafés of London: you bet that coin on the game, and you won it.',
        },
        e2: {
          say: 'Play your knight to d4. It looks lost in the middle of nowhere, and that is the whole bait: it attacks the knight on f3 and it leaves your e5 pawn undefended.',
          instruction: 'Play the knight to d4',
          hint: 'The knight on c6 makes an L to d4.',
        },
        e3: {
          say: 'And White takes the pawn. It is the natural move: the pawn is free, and their knight was attacked anyway. It is also the move that loses.',
        },
        e4: {
          say: 'Your queen comes out to g5. She attacks the knight on e5 and the pawn on g2 at the same time, and White cannot defend both.',
          instruction: 'Play the queen to g5',
          hint: 'The queen on d8 runs down the diagonal: e7, f6, g5.',
        },
        e5: {
          say: 'White goes looking for complications: their knight takes on f7 and attacks your queen and your rook in one move. Save neither.',
        },
        e6: {
          say: 'Take the g2 pawn with your queen. She now threatens the rook on h1, and she has moved into the white camp.',
          instruction: 'Take the pawn on g2',
          hint: 'The queen on g5 goes all the way down her file to g2.',
        },
        e7: {
          say: 'White puts their rook on f1, where their king defends it. Look carefully at the square they have just blocked: f1. Their king needed it.',
        },
        e8: {
          say: 'Take back the e4 pawn with check. Your queen lands on the white king’s file.',
          instruction: 'Take the pawn on e4',
          hint: 'The queen on g2 takes along the diagonal: f3, e4.',
        },
        e9: {
          say: 'White interposes with their bishop on e2. And that bishop is pinned: it stands between your queen and their king, and it cannot move again all game.',
        },
        e10: {
          say: 'Your knight on d4, the one everybody took for a blunder, jumps to f3.',
          instruction: 'Play the knight to f3',
          hint: 'The knight on d4 makes an L to f3.',
        },
        e11: {
          say: 'Checkmate. Count the squares around the white king: d1 his queen, d2 his pawn, e2 his bishop, f1 his rook, f2 his pawn. All occupied by his own men. And nobody can take your knight — the bishop on e2 is pinned, the rook on f1 is blocked by its own pawn.',
        },
        e12: {
          say: 'It is the same picture as the smothered mate, seen from the other side: a king killed by his own defenders, with a knight. You will recognise it both ways round from now on.',
        },
        e13: {
          say: 'And the variation that declines the trap, the one to know from the other side: taking the knight instead of the pawn. White exchanges on d4, there is no queen on g5, no mate, and it is White who stands better.',
        },
        e14: {
          say: 'Two rules to take away. When someone offers you a pawn in the opening, ask yourself why before you take it. And when you are already in the trap, give material back at once — the bishop on f7 with check — rather than chasing the enemy queen.',
        },
      },
      'mat-legal': {
        title: 'Légal’s mate',
        summary: 'A pinned piece can move. Whoever forgets it loses in seven moves.',
        opening: 'Philidor Defence',
        risk: 'Your queen',
        theme: 'Smothered mate',
        caution:
          'You really do give up your queen. If Black declines and retreats the bishop, you have sacrificed for nothing — check that every mating piece is in place before playing Nxe5.',
        e1: {
          say: 'The black bishop on g4 aims at your knight on f3, and behind that knight sits your queen on d1. So the knight is pinned: if it moves, you lose your queen.',
        },
        e2: {
          say: 'Except that this pin is not absolute. It is not your king behind it, it is your queen — the knight has every right to leave. The only question is whether it is worth nine points.',
        },
        e3: {
          say: 'The pinned knight takes the e5 pawn. At the same time it attacks the knight on c6 and it opens your bishop’s diagonal towards f7.',
          instruction: 'Take the pawn on e5 with the knight',
          hint: 'The knight on f3 jumps onto the e5 pawn.',
        },
        e4: {
          say: 'Black has taken the queen. Nine points up, and the game is lost in two moves. That is the whole trap: the greedy move is the losing one.',
        },
        e5: {
          say: 'The bishop gives itself up on f7. The king cannot take it, your knight on e5 defends the square.',
          instruction: 'Take the pawn on f7 with the bishop',
          hint: 'The bishop on c4 eats the f7 pawn.',
        },
        e6: {
          say: 'The black king had only one legal move. He goes up to e7, in the middle of his own pieces, and there he is shut in.',
        },
        e7: {
          say: 'Your third attacker arrives. The knight from c3 lands on d5, and nobody can drive it away.',
          instruction: 'Play the knight to d5',
          hint: 'The knight on c3 makes an L to d5.',
        },
        e8: {
          say: 'Checkmate, with a bishop and two knights, against a queen. The black king is hemmed in by his own side: his queen occupies d8, his bishop occupies f8, and your three pieces hold everything else.',
        },
        e9: {
          say: 'And the variation that saves everything, the only one: taking back the knight instead of taking the queen. Black gives the piece back, they keep their king, and the game goes on about level. All they had to do was refuse the present.',
        },
        e10: {
          say: 'Two things to keep. When an enemy piece is pinned against something other than the king, it can move — always check what it threatens on the way out. And when someone offers you a queen in the opening, count the pieces looking at your king before you take it.',
        },
      },
    },
    pieges: {
      title: 'Setting and dodging traps',
      description:
        'Fourteen opening traps, learned from both sides: you set it through to the win, then you see it coming and you dodge it. Each one lives in an opening people actually play, and every brief tells you what it costs when they do not bite.',
      'piege-fegatello': {
        title: 'The Fegatello',
        summary:
          'Two pieces on f7, a knight given up, and the black king out in the open on move seven. Then the single move that refutes it all.',
        opening: 'Italian Game, Two Knights Defence',
        risk: 'A knight',
        theme: 'King dragged out',
        caution:
          'You give a piece for an attack, not for material. If Black knows the Na5 defence, you are simply a piece down with nothing to show for it.',
        e1: {
          say: 'The Fegatello, or “fried liver” in Italian. White gives up a knight on f7 to drag the black king out. We start by setting it.',
        },
        e2: {
          say: 'King’s pawn, as usual.',
          instruction: 'Play e4',
        },
        e3: {
          say: 'Knight f3, attacking e5.',
          instruction: 'Play the knight to f3',
        },
        e4: {
          say: 'And the bishop to c4. Look carefully at its diagonal: it ends on f7.',
          instruction: 'Play the bishop to c4',
        },
        e5: {
          say: 'Black develops their knight and ignores f7. It is playable, but it means knowing what comes next.',
        },
        e6: {
          say: 'Knight g5. Now two pieces attack f7, and f7 is defended only by the king.',
          instruction: 'Play the knight to g5',
        },
        e7: {
          say: 'Black counter-attacks in the centre. Take the pawn.',
          instruction: 'Take on d5 with the e-pawn',
        },
        e8: {
          say: 'There is the mistake. Taking back on d5 with the knight leaves f7 without enough defence. The whole trap rests on that one move.',
        },
        e9: {
          say: 'Knight takes f7. You give up a piece, and you know why.',
          instruction: 'Take on f7 with the knight',
        },
        e10: {
          say: 'Queen f3. Check, and at the same time she attacks the pinned knight on d5.',
          instruction: 'Play the queen to f3',
        },
        e11: {
          say: 'The black king is in the middle of the board on move eight, the knight on d5 is attacked twice, and White still has every piece to develop. That is more than enough for a piece.',
        },
        e12: {
          say: 'Now we swap sides. You play Black, and you have to avoid all of that.',
        },
        e13: {
          say: 'Answer in the centre.',
          instruction: 'Play e5',
        },
        e14: {
          say: 'Defend your pawn.',
          instruction: 'Play the knight to c6',
        },
        e15: {
          say: 'Develop your king’s knight.',
          instruction: 'Play the knight to f6',
        },
        e16: {
          say: 'The knight arrives on g5. The only answer is to strike in the centre.',
          instruction: 'Play d5',
          hint: 'The d7 pawn advances two squares: it attacks the bishop on c4 on the way.',
        },
        e17: {
          say: 'And here is the move that refutes the whole trap: knight a5. It attacks the bishop on c4 instead of taking back on d5.',
          instruction: 'Play the knight from c6 to a5',
          hint: 'Do not take the pawn back: that is exactly what White is waiting for. Go after the bishop.',
        },
        e18: {
          say: 'The bishop has to flee, f7 is attacked by only one piece now, and Black will at worst give the d5 pawn back. One move, and the Fegatello no longer exists.',
        },
      },
      'piege-elephant': {
        title: 'The Elephant trap',
        summary:
          'A pawn that looks like it is falling off, and a queen given up to win a piece. The most profitable trap in the Queen’s Gambit.',
        opening: 'Queen’s Gambit Declined',
        risk: 'Nothing',
        theme: 'Overloaded defender',
        caution:
          'You provoke nothing: you wait for a capture on d5 that White has no reason to play. This is a trap you profit from, not one you set.',
        e1: {
          say: 'This one gets suffered more often than it gets set. You play Black, and you are going to let White take a pawn they cannot take.',
        },
        e2: {
          say: 'Answer symmetrically.',
          instruction: 'Play d5',
        },
        e3: {
          say: 'The Queen’s Gambit. Support your d5 pawn with the e-pawn.',
          instruction: 'Play e6',
        },
        e4: {
          say: 'Develop your king’s knight.',
          instruction: 'Play the knight to f6',
        },
        e5: {
          say: 'The bishop pins your knight on f6 against your queen. It is that pin White is going to believe in.',
        },
        e6: {
          say: 'Knight b8 to d7. It adds a defender to f6 — and it sets the trap.',
          instruction: 'Play the knight from b8 to d7',
          hint: 'The knight from b8 goes to d7, nowhere else.',
        },
        e7: {
          say: 'Take back with your e-pawn.',
          instruction: 'Take on d5 with the e6 pawn',
        },
        e8: {
          say: 'There. White takes on d5 because your knight on f6 is pinned. Except that it is not really pinned: what stands behind it is worth less than what you are about to win.',
        },
        e9: {
          say: 'Take the knight with your knight on f6. Yes, you lose the queen.',
          instruction: 'Take on d5 with the f6 knight',
          hint: 'The pinned knight moves anyway. Do it.',
        },
        e10: {
          say: 'And now the move the whole trap is about: bishop b4, check.',
          instruction: 'Play the bishop from f8 to b4',
        },
        e11: {
          say: 'White has to interpose with their queen. Take her.',
          instruction: 'Take the queen on d2',
        },
        e12: {
          say: 'And you recover the bishop camped on your d8 square.',
          instruction: 'Take on d8 with the king',
        },
        e13: {
          say: 'Count it up: you gave a queen and a bishop, you recovered a queen, a knight and a bishop. A piece up, and the game is won. Remember the general lesson: a pin against the queen does not forbid moving, it calls for calculation.',
        },
      },
      'piege-kieninger': {
        title: 'The Kieninger trap',
        summary:
          'A smothered mate on move eight, in the middle of the opening, because a pawn taken on the wing opens a file nobody had looked at.',
        opening: 'Budapest Gambit',
        risk: 'A pawn',
        theme: 'Smothered mate',
        caution:
          'The Budapest gives up a pawn on move two and does not always get it back. Against a correct defence you play a slightly worse position.',
        e1: {
          say: 'The Budapest Gambit, and the prettiest opening mate there is. You play Black.',
        },
        e2: {
          say: 'Knight f6 first.',
          instruction: 'Play the knight to f6',
        },
        e3: {
          say: 'And now the gambit: e5. You offer a pawn to activate your pieces.',
          instruction: 'Play e5',
        },
        e4: {
          say: 'Knight g4. It is going back after the e5 pawn.',
          instruction: 'Play the knight from f6 to g4',
        },
        e5: {
          say: 'White defends their pawn. Bring up a second attacker.',
          instruction: 'Play the knight to c6',
        },
        e6: {
          say: 'Bishop b4, check. It is not an idle move: it is going to force White to block with their b1 knight.',
          instruction: 'Play the bishop to b4',
        },
        e7: {
          say: 'Queen e7. She takes up the e-file — remember that file, the whole mate is there.',
          instruction: 'Play the queen to e7',
        },
        e8: {
          say: 'White attacks your bishop with a3. A natural move, and it is the mistake: they are busy on the wing while their king is still in the centre.',
        },
        e9: {
          say: 'Ignore the bishop. Take the e5 pawn back with the knight from g4.',
          instruction: 'Take on e5 with the g4 knight',
          hint: 'It is the knight from g4 that takes, not the one on c6.',
        },
        e10: {
          say: 'White takes the bishop. Now: knight d3. Checkmate.',
          instruction: 'Play the knight from e5 to d3',
          hint: 'The knight on e5 jumps to d3. Look at the e-file before you doubt it.',
        },
        e11: {
          say: 'Smothered mate. The king has no square: his queen, his bishop and his knight surround him. And the e2 pawn cannot take the knight, because leaving e2 would open the file onto your queen on e7.',
        },
      },
      'piege-lasker': {
        title: 'The Lasker trap',
        summary:
          'The only opening trap where promoting to a queen loses and promoting to a knight wins. An underpromotion, on move seven.',
        opening: 'Queen’s Gambit Declined, Albin Counter-Gambit',
        risk: 'A pawn',
        theme: 'Underpromotion',
        caution:
          'The Albin is a gambit: you give a pawn with no guarantee. The trap only fires if White plays the natural Bd2 on move five.',
        e1: {
          say: 'The Albin Counter-Gambit. You play Black, and you are going to end up promoting a pawn to a knight — not to a queen.',
        },
        e2: {
          say: 'Answer d5.',
          instruction: 'Play d5',
        },
        e3: {
          say: 'And the Albin: e5.',
          instruction: 'Play e5',
        },
        e4: {
          say: 'Push your d-pawn to d4. It will be very hard to dislodge there.',
          instruction: 'Play d4',
        },
        e5: {
          say: 'White plays e3 to get rid of the d4 pawn. That is the trap’s mistake: the move opens a diagonal towards their king.',
        },
        e6: {
          say: 'Bishop b4, check.',
          instruction: 'Play the bishop to b4',
        },
        e7: {
          say: 'Take on e3 with your d4 pawn.',
          instruction: 'Take on e3',
        },
        e8: {
          say: 'White takes your bishop and thinks they are doing well. Your e3 pawn, meanwhile, is two squares from promotion, and f2 is held only by the king.',
        },
        e9: {
          say: 'Take on f2, check.',
          instruction: 'Take on f2 with the e3 pawn',
        },
        e10: {
          say: 'And now the move this lesson is about: take the knight on g1 and promote to a **knight**. With check.',
          instruction: 'Take on g1 and promote to a knight',
          hint: 'The g1 square holds the white knight. Choose the knight in the promotion picker, not the queen.',
        },
        e11: {
          say: 'The rook takes back. Bishop g4, check — and the white queen is lost.',
          instruction: 'Play the bishop to g4',
        },
        e12: {
          say: 'The king is in check along the diagonal, and whatever he does the bishop takes the queen on d1. Promoting to a queen would have given check too — but White would have taken her, and nothing would be left. It is the one opening underpromotion you need to know.',
        },
      },
      'piege-arche-de-noe': {
        title: 'Noah’s Ark',
        summary:
          'Three black pawns advance, and the white bishop finds itself without a single square. The oldest trap in the Ruy Lopez.',
        opening: 'Ruy Lopez',
        risk: 'Nothing',
        theme: 'Trapped piece',
        caution:
          'It needs the white bishop to retreat to b3 and your a- and b-pawns to advance without counterplay. That does not happen against everyone.',
        e1: {
          say: 'The Ruy Lopez. You play Black, and you are going to shut the white bishop in with pawns. It is called Noah’s Ark because the trap is as old as the flood.',
        },
        e2: {
          say: 'Answer e5.',
          instruction: 'Play e5',
        },
        e3: {
          say: 'Defend your pawn.',
          instruction: 'Play the knight to c6',
        },
        e4: {
          say: 'The bishop on b5 attacks the defender of e5. Chase it away with a6.',
          instruction: 'Play a6',
        },
        e5: {
          say: 'Support your e5 pawn a second time.',
          instruction: 'Play d6',
        },
        e6: {
          say: 'White opens the centre. Answer b5: the bishop is already short of squares.',
          instruction: 'Play b5',
        },
        e7: {
          say: 'The bishop takes shelter on b3. Look at its escape squares: a2 and c2 are occupied by its own pawns, a4 and c4 will be held by yours. It has nothing left.',
        },
        e8: {
          say: 'Exchange in the centre: knight takes d4.',
          instruction: 'Take on d4 with the knight',
        },
        e9: {
          say: 'Take back with your pawn.',
          instruction: 'Take on d4 with the e5 pawn',
        },
        e10: {
          say: 'There is the mistake: the queen takes back on d4, instead of seeing to the bishop. Now you chase her, and every chasing move pushes your pawns towards the bishop.',
        },
        e11: {
          say: 'Pawn c5: it attacks the queen.',
          instruction: 'Play c5',
        },
        e12: {
          say: 'Bishop e6: you chase her again, and develop while doing it.',
          instruction: 'Play the bishop to e6',
        },
        e13: {
          say: 'Block the check with your bishop.',
          instruction: 'Play the bishop to d7',
        },
        e14: {
          say: 'And the last pawn: c4. The bishop on b3 is caught in the net.',
          instruction: 'Play c4',
        },
        e15: {
          say: 'The bishop has no square: its own pawns block a2 and c2, your pawns hold a4 and c4. It falls next move. Remember the mechanism rather than the move order: pawns can trap a piece, and a bishop retreating on a wing is often already lost.',
        },
      },
      'piege-englund': {
        title: 'The Englund trap',
        summary:
          'You give a pawn on move one, and if White develops the bishop naturally, they are mated on move eight.',
        opening: 'Englund Gambit',
        risk: 'A pawn',
        theme: 'Back-rank mate',
        caution:
          'This trap costs a pawn immediately, and a good player does not give it back. If they play Nc3 on move six you have a worse position and nothing in return. Keep it for fast games.',
        e1: {
          say: 'White opens d4. The Englund Gambit answers by offering a pawn straight away — and setting a trap that ends in mate.',
        },
        e2: {
          say: 'Push e5. White will take it, and that is exactly what we want.',
          instruction: 'Play e5',
        },
        e3: {
          say: 'The pawn is gone. We do not win it back: we attack. Knight to c6, hitting the pawn on e5.',
          instruction: 'Play the knight to c6',
        },
        e4: {
          say: 'They defend with the knight on f3. Add another attacker: queen to e7.',
          instruction: 'Play the queen to e7',
        },
        e5: {
          say: 'They defend again with the bishop on f4. Now the queen strikes on b4: check, and she hits the bishop on f4 and the pawn on b2 at the same time.',
          instruction: 'Play the queen to b4, with check',
        },
        e6: {
          say: 'They block with the bishop on d2. Take the pawn on b2 — your queen walks into their camp.',
          instruction: 'Take on b2 with the queen',
        },
        e7: {
          say: 'Here is the mistake. The bishop comes to c3 to attack your queen and block the file. It looks strong. It loses.',
        },
        e8: {
          say: 'Bishop b4. You pin the bishop on c3 against the king: it cannot move, and your queen is safe.',
          instruction: 'Play the bishop to b4',
          hint: 'The f8 bishop comes out to b4, on the diagonal leading to the white king on e1.',
        },
        e9: {
          say: 'They defend the bishop with the queen. Take it anyway.',
          instruction: 'Take on c3 with the bishop',
        },
        e10: {
          say: 'They recapture with the queen, and the c1 square is empty. Queen c1: checkmate.',
          instruction: 'Play the queen to c1',
          hint: 'White’s back rank is blocked by their own knight on b1. The a1 rook cannot come to the rescue.',
        },
        e11: {
          say: 'Look at why it mates: the knight on b1 never moved, and it stops their own rook on a1 from reaching c1. The king has neither escape nor defender. A back-rank mate, in eight moves.',
        },
        e12: {
          say: 'Now you play White, with the black queen on b2. The bishop to c3 loses. There is a move that holds.',
        },
        e13: {
          say: 'Knight c3. It blocks the diagonal just like the bishop, but it cannot be pinned against the king in the same fatal way.',
          instruction: 'Play the knight to c3',
          hint: 'A minor piece has to come to c3. Not the one you think.',
        },
        e14: {
          say: 'The bishop still comes to b4, but the pin is no longer fatal: your rook on a1 keeps the back rank and your queen is not boxed in. You stay a pawn up. The general lesson: when someone offers you a pawn very early, the danger is not the pawn, it is the piece they invite you to move.',
        },
      },
      'piege-canne-a-peche': {
        title: 'The Fishing Pole',
        summary:
          'You hang a knight on g4 as bait, add the pawn to h5, and whoever bites gets mated down the h-file.',
        opening: 'Ruy Lopez',
        risk: 'A knight',
        theme: 'Open file onto the castled king',
        caution:
          'If White does not take the knight, you have a knight hanging and an advanced h-pawn for nothing. The trap only works against someone who captures on reflex.',
        e1: {
          say: 'The Fishing Pole: a knight parked on g4 is the bait, and the h5 pawn is the line. Whoever bites opens the h-file onto their own king.',
        },
        e2: {
          say: 'We start with a perfectly normal Ruy Lopez. Answer in the centre.',
          instruction: 'Play e5',
        },
        e3: {
          say: 'Defend your pawn with the knight.',
          instruction: 'Play the knight to c6',
        },
        e4: {
          say: 'The bishop comes to b5. Develop your king’s knight.',
          instruction: 'Play the knight to f6',
        },
        e5: {
          say: 'White castles. Now the bait: knight to g4. It threatens almost nothing, and it can be attacked.',
          instruction: 'Play the knight to g4',
        },
        e6: {
          say: 'The h3 pawn attacks your knight. A normal player would retreat it. You are going to leave it there.',
        },
        e7: {
          say: 'Push h5. You defend the knight once, and above all you prepare to open the h-file.',
          instruction: 'Play h5',
          hint: 'The h7 pawn moves two squares. The knight stays where it is.',
        },
        e8: {
          say: 'They took the knight. Recapture with the h-pawn: the h-file opens, and your rook on h8 is already looking at their king.',
          instruction: 'Recapture on g4 with the h-pawn',
        },
        e9: {
          say: 'Their knight retreats to e1 to cover h4. Bring the queen to h4 anyway.',
          instruction: 'Play the queen to h4',
        },
        e10: {
          say: 'They play f3 to chase your pawn. Push it to g3: it attacks h2, the square your queen wants.',
          instruction: 'Play g3',
          hint: 'The g4 pawn moves one square. It captures nothing — it defends.',
        },
        e11: {
          say: 'Queen h2. The g3 pawn defends her, the king cannot take, and he has no square. Mate.',
          instruction: 'Play the queen to h2',
        },
        e12: {
          say: 'The mechanism matters far beyond this trap: a pawn defending the square the queen lands on turns an ordinary check into mate. Here it is the g3 pawn, and it came from a knight given up three moves earlier.',
        },
        e13: {
          say: 'You play White. The knight on g4 is attacked and defended by h5. Taking it opens your own h-file. Do not take it.',
        },
        e14: {
          say: 'Play d4, in the centre. You ignore the bait and open your position — always the right answer to a premature wing attack.',
          instruction: 'Play d4',
          hint: 'Answer a wing attack with a move in the centre.',
        },
        e15: {
          say: 'The knight goes hunting on f2, but that is only a pawn, and your position is sound. Remember the rule: answer a wing attack in the centre. It works both ways.',
        },
      },
      'piege-damiano': {
        title: 'The Damiano Defence',
        summary:
          'Black defends the pawn with f6. You give up a knight and get a rook back four moves later.',
        opening: 'Open Game',
        risk: 'Nothing',
        theme: 'King with no escape square',
        caution:
          'This is not a trap you set: it is a punishment you need to know how to deliver when it appears. f6 is a bad move, not bait.',
        e1: {
          say: 'The Damiano Defence is not a defence, it is a mistake. But it is so common below 1000 that you have to know how to punish it.',
        },
        e2: {
          say: 'King’s pawn.',
          instruction: 'Play e4',
        },
        e3: {
          say: 'Knight f3, attacking e5.',
          instruction: 'Play the knight to f3',
        },
        e4: {
          say: 'And there is f6. Black defends the pawn — with the one move that shuts f6 off from their own king and opens your queen’s diagonal towards e8.',
        },
        e5: {
          say: 'Take on e5 with the knight. You are giving it up, and you know why.',
          instruction: 'Take on e5 with the knight',
          hint: 'The f3 knight captures the e5 pawn. Yes, it gets taken right back.',
        },
        e6: {
          say: 'They recaptured. Queen h5, check. The king has no square: f6 is occupied by their own pawn.',
          instruction: 'Play the queen to h5, with check',
        },
        e7: {
          say: 'They block with g6. Take the e5 pawn with check — and look at the diagonal: your queen now eyes the rook on h8.',
          instruction: 'Take on e5 with the queen',
        },
        e8: {
          say: 'They block the check with the queen. Take the rook.',
          instruction: 'Take on h8 with the queen',
          hint: 'The queen on e5 runs through f6 and g7 to h8.',
        },
        e9: {
          say: 'Count it: you gave a knight, you took two pawns and a rook. That is a clear gain, and Black’s position is in ruins.',
        },
        e10: {
          say: 'Now you play Black, and the knight has just taken on e5. Recapturing with the pawn loses. There is a move that holds.',
        },
        e11: {
          say: 'Queen e7. You do not recapture: you attack the knight by pinning it against the e4 pawn, and you keep your king covered.',
          instruction: 'Play the queen to e7',
          hint: 'Do not take the knight. Attack it.',
        },
        e12: {
          say: 'The knight has to leave, and you win the e4 pawn afterwards. You are still slightly worse, but you are alive. The lesson: when a piece is handed to you near your king, first work out what happens if you do not take it.',
        },
      },
      'piege-petroff': {
        title: 'The Petroff trap',
        summary:
          'Black copies your moves one move too many. A discovered check, and their queen falls.',
        opening: 'Petroff Defence',
        risk: 'Nothing',
        theme: 'Discovered check',
        caution:
          'Black has a simple, well-known defence. Do not count on this against someone who really plays the Petroff: it is a trap against imitation, not against theory.',
        e1: {
          say: 'The Petroff: Black answers a knight with a knight. The idea is sound — but copying one move too many costs the queen.',
        },
        e2: {
          say: 'King’s pawn.',
          instruction: 'Play e4',
        },
        e3: {
          say: 'Knight f3. They reply knight f6: they do not defend their pawn, they attack yours.',
          instruction: 'Play the knight to f3',
        },
        e4: {
          say: 'Take on e5. They will be tempted to recapture symmetrically.',
          instruction: 'Take on e5 with the knight',
        },
        e5: {
          say: 'And they took on e4. That is the classic mistake: both knights are in the centre, but it is your move.',
        },
        e6: {
          say: 'Queen e2. She lands on the black king’s file, with your own knight in between — which is exactly what you want.',
          instruction: 'Play the queen to e2',
          hint: 'Line your queen up with their king on the e-file.',
        },
        e7: {
          say: 'They retreat the knight to f6. Now the only thing between your queen and their king is your knight on e5. If it moves, it is check.',
        },
        e8: {
          say: 'Knight c6. Discovered check — and on arrival the knight attacks their queen.',
          instruction: 'Play the knight to c6',
          hint: 'The e5 knight leaves attacking the queen on d8, and uncovers your queen’s check.',
        },
        e9: {
          say: 'They have to answer the check. The queen is still hanging.',
          instruction: 'Take the queen on d8',
        },
        e10: {
          say: 'Queen for a knight. The mechanism to remember: a piece that leaves with check can go anywhere, including onto a defended square.',
        },
        e11: {
          say: 'You play Black. Your knight is on e4, their queen on e2, and your king is behind it. Retreating the knight loses the queen.',
        },
        e12: {
          say: 'Queen e7. You put your queen in front of your king: now, if their knight leaves, there is no discovery on the king — only a queen trade.',
          instruction: 'Play the queen to e7',
          hint: 'Do not move the knight. Protect the e-file another way.',
        },
        e13: {
          say: 'They have to retreat, you win the pawn back, and the game is level. Remember: when your piece is pinned by a distant queen, the answer is often to interpose your own queen, not to run.',
        },
      },
      'piege-mortimer': {
        title: 'The Mortimer trap',
        summary:
          'You deliberately retreat a developed knight to offer a pawn. Whoever takes it loses a piece.',
        opening: 'Ruy Lopez',
        risk: 'A pawn and a tempo',
        theme: 'Double attack with check',
        caution:
          'Retreating the knight to e7 is objectively a bad move: you lose a tempo and block your own bishop. If White declines, you are simply worse.',
        e1: {
          say: 'The Mortimer trap asks you to play an ugly move: retreat a developed knight, to offer a pawn that cannot be taken.',
        },
        e2: {
          say: 'A normal Ruy Lopez. Answer in the centre.',
          instruction: 'Play e5',
        },
        e3: {
          say: 'Defend your pawn.',
          instruction: 'Play the knight to c6',
        },
        e4: {
          say: 'Bishop to b5. Develop your king’s knight.',
          instruction: 'Play the knight to f6',
        },
        e5: {
          say: 'They play d3, quietly. Look carefully: the d2 square is now empty, and the a5-e1 diagonal runs all the way to their king. The whole trap is right there.',
        },
        e6: {
          say: 'Retreat your c6 knight to e7. You give up the e5 pawn. That is deliberate.',
          instruction: 'Play the knight from c6 to e7',
          hint: 'The knight that retreats is the one on c6, not the one on f6.',
        },
        e7: {
          say: 'They took the pawn. Play c6: you attack their bishop, and above all you clear the a5 square for your queen.',
          instruction: 'Play c6',
          hint: 'The c7 pawn moves one square and attacks the bishop on b5.',
        },
        e8: {
          say: 'The bishop retreats to c4, and b5 is free. Queen a5: check, and she looks at the knight on e5 along the fifth rank.',
          instruction: 'Play the queen to a5, with check',
        },
        e9: {
          say: 'They block with the knight on c3. Take the knight on e5.',
          instruction: 'Take on e5 with the queen',
        },
        e10: {
          say: 'A piece for a pawn. The move that makes it all possible is their d3: without it, a5 was not check, and the trap did not exist.',
        },
        e11: {
          say: 'You play White. The black knight has just retreated to e7 and the e5 pawn is free. Do not take it.',
        },
        e12: {
          say: 'Castle. You ignore the poisoned pawn and tuck your king away — what Black has just given you is a tempo, not a pawn.',
          instruction: 'Castle kingside',
          hint: 'The e5 pawn is bait. Play the soundest move in the position.',
        },
        e13: {
          say: 'Your king is safe, their knight has lost two moves, and the e5 pawn will fall later on good terms. The rule: a pawn offered by a move that looks bad is almost always poisoned.',
        },
      },
      'piege-siberien': {
        title: 'The Siberian trap',
        summary:
          'Against the Smith-Morra Gambit, your queen and a knight meet on h2. Mate arrives on move ten.',
        opening: 'Sicilian, Smith-Morra Gambit',
        risk: 'Nothing — you are already a pawn up',
        theme: 'Supported queen mate',
        caution:
          'The trap only fires if White plays h3 on move nine. Anyone who knows the Smith-Morra plays g3 and you get nothing — but you keep your pawn.',
        e1: {
          say: 'The Smith-Morra Gambit: White gives a pawn for development. The Siberian trap is the punishment for playing it without knowing it.',
        },
        e2: {
          say: 'The Sicilian.',
          instruction: 'Play c5',
        },
        e3: {
          say: 'They push d4. Take.',
          instruction: 'Take on d4 with the c-pawn',
        },
        e4: {
          say: 'And there is the gambit: c3, offering a second pawn to open lines. We accept.',
        },
        e5: {
          say: 'Take on c3.',
          instruction: 'Take on c3 with the d-pawn',
        },
        e6: {
          say: 'They recapture with the knight. Develop yours.',
          instruction: 'Play the knight to c6',
        },
        e7: {
          say: 'Play e6. Solid, and it frees your king’s bishop.',
          instruction: 'Play e6',
        },
        e8: {
          say: 'Their bishop arrives on c4. Queen c7: she sits on the diagonal that runs straight to h2, behind their future castled king.',
          instruction: 'Play the queen to c7',
          hint: 'The queen comes out to c7, on the c7-h2 diagonal.',
        },
        e9: {
          say: 'They castle. Develop your king’s knight.',
          instruction: 'Play the knight to f6',
        },
        e10: {
          say: 'Queen e2 for them. Now the bait: knight to g4. It defends the h2 square, where your queen wants to go.',
          instruction: 'Play the knight to g4',
          hint: 'The f6 knight jumps to g4. Look at which square it defends on arrival.',
        },
        e11: {
          say: 'They play h3 to chase it. That is the mistake: the pawn leaves h2, and your queen only has to land there — provided you win a tempo.',
        },
        e12: {
          say: 'Knight d4. You do not retreat: you attack their queen, and you win exactly the tempo you need.',
          instruction: 'Play the knight from c6 to d4',
          hint: 'The c6 knight jumps to d4 and attacks the queen on e2.',
        },
        e13: {
          say: 'They take your knight. Queen h2: the knight on g4 defends her, the king cannot take. Mate.',
          instruction: 'Play the queen to h2',
        },
        e14: {
          say: 'Two pieces are enough, if one defends the square the other lands on. It is the most profitable pattern in chess, and you will see it everywhere.',
        },
        e15: {
          say: 'You play White. Their knight has just landed on g4 and their queen eyes h2. h3 loses on the spot.',
        },
        e16: {
          say: 'Play g3. The pawn steps into the c7-h2 diagonal: the queen has no road left, and the trap no longer exists.',
          instruction: 'Play g3',
          hint: 'Do not chase the knight. Cut the queen’s diagonal.',
        },
        e17: {
          say: 'The threat is dead and you can carry on with your gambit. Remember the general answer: against a queen-and-piece battery, blocking the line beats chasing the piece.',
        },
      },
      'piege-francaise-avance': {
        title: 'The French Advance trap',
        summary:
          'You attack the d4 pawn three times. If they develop the bishop to d3, the chain collapses and you win a pawn.',
        opening: 'French Defence, Advance Variation',
        risk: 'Nothing',
        theme: 'Overloaded defender',
        caution:
          'This trap wins a pawn, not a piece. On the other hand it comes up constantly, and the losing move Bd3 is perfectly natural.',
        e1: {
          say: 'The French Advance. White locks the centre, and the whole game revolves around a single pawn: the one on d4.',
        },
        e2: {
          say: 'The French starts with e6.',
          instruction: 'Play e6',
        },
        e3: {
          say: 'And d5, challenging the centre.',
          instruction: 'Play d5',
        },
        e4: {
          say: 'They push e5 and close the centre. Their e5 pawn is defended by d4 — and d4 is the real target of the whole variation.',
        },
        e5: {
          say: 'Attack the base: c5.',
          instruction: 'Play c5',
        },
        e6: {
          say: 'They defend with c3. Add an attacker: knight c6.',
          instruction: 'Play the knight to c6',
        },
        e7: {
          say: 'And the third: queen b6. The d4 pawn is attacked three times and defended twice.',
          instruction: 'Play the queen to b6',
          hint: 'The queen comes out to b6, on the diagonal aiming at d4 and f2.',
        },
        e8: {
          say: 'Here is the mistake: bishop to d3. It looks like development, but it takes the knight’s square on b1 and defends nothing on d4.',
        },
        e9: {
          say: 'Take on d4.',
          instruction: 'Take on d4 with the c-pawn',
        },
        e10: {
          say: 'They recapture with the c-pawn. Take again, with the knight.',
          instruction: 'Take on d4 with the knight',
          hint: 'The c6 knight captures on d4, even though it gets taken straight back.',
        },
        e11: {
          say: 'And you recapture with the queen. She lands on d4 hitting the bishop on d3 along the way.',
          instruction: 'Recapture on d4 with the queen',
        },
        e12: {
          say: 'A clean pawn, and their bishop still has to move. The mechanism: count the attackers and defenders of a pawn, and strike the moment the count tips.',
        },
        e13: {
          say: 'You play White. The d4 pawn is attacked three times. Bd3 loses a pawn. Find the move that keeps the count.',
        },
        e14: {
          say: 'Bishop e2. Modest, but it leaves d3 for the knight and removes no defender from d4.',
          instruction: 'Play the bishop to e2',
          hint: 'The f1 bishop comes out — but not to the square that looks most active.',
        },
        e15: {
          say: 'The count holds and the position stays playable. Remember: in a closed structure the most active square is not always the right one — the number of defenders decides.',
        },
      },
      'piege-gambit-dame-accepte': {
        title: 'The Queen’s Gambit Accepted trap',
        summary:
          'Black takes your c4 pawn and tries to hold it with b5. Two moves later you take their rook.',
        opening: 'Queen’s Gambit Accepted',
        risk: 'A pawn',
        theme: 'Open long diagonal',
        caution:
          'The trap only fires if Black plays b5 and then recaptures on b5 with the c-pawn. A correct player gives the pawn back and nothing happens.',
        e1: {
          say: 'The Queen’s Gambit: you offer the c4 pawn. Taking it is perfectly playable — trying to keep it is not.',
        },
        e2: {
          say: 'We start with d4.',
          instruction: 'Play d4',
        },
        e3: {
          say: 'And c4, the gambit. They take.',
          instruction: 'Play c4',
        },
        e4: {
          say: 'Play e3, quietly. You prepare to win the pawn back with your bishop, and you wait to see whether they try to hold it.',
          instruction: 'Play e3',
          hint: 'A modest pawn move that opens the f1 bishop’s diagonal.',
        },
        e5: {
          say: 'And there is b5. They want to keep the pawn at all costs. Look at what that just did: the b7 square is empty, and the long diagonal runs to their rook on a8.',
        },
        e6: {
          say: 'a4. You attack the chain at its base.',
          instruction: 'Play a4',
        },
        e7: {
          say: 'They defend with c6. Take on b5.',
          instruction: 'Take on b5 with the a-pawn',
        },
        e8: {
          say: 'They recapture with the c-pawn — and that is the decisive mistake. The c6 square is now empty too: the f3-a8 diagonal is completely clear.',
        },
        e9: {
          say: 'Queen f3. She looks at the rook on a8 right across the board.',
          instruction: 'Play the queen to f3',
          hint: 'The queen comes out to f3, on the diagonal through e4, d5, c6 and b7.',
        },
        e10: {
          say: 'They block with the knight on c6, but nothing defends it. Take it with check.',
          instruction: 'Take on c6 with the queen',
        },
        e11: {
          say: 'They block with the bishop on d7. Take the rook.',
          instruction: 'Take on a8 with the queen',
        },
        e12: {
          say: 'A rook for a pawn. The lesson holds for every gambit: the pawn you took is not the problem, it is the string of pawn moves you invent to keep it.',
        },
        e13: {
          say: 'You play Black, you have the c4 pawn, and White plays a4. Defending with c6 will open the diagonal. There is far better.',
        },
        e14: {
          say: 'Play e6. You let the pawn go and you develop: that is how the Queen’s Gambit Accepted has always been played.',
          instruction: 'Play e6',
          hint: 'Stop defending the pawn. Open your king’s bishop.',
        },
        e15: {
          say: 'They win their pawn back, you have a sound position, and your a8 rook is still there. A pawn returned at the right moment beats a pawn kept at the wrong one.',
        },
      },
      'piege-ecossaise': {
        title: 'The Scotch trap',
        summary:
          'They trade on c6 too early. Your queen hits f2 and the knight at once, and you come out a pawn up with their king stuck in the middle.',
        opening: 'Scotch Game',
        risk: 'Nothing',
        theme: 'Queen double attack',
        caution:
          'This trap wins a pawn and their castling rights, not a piece. White has a better defence than the one shown here — the gain is modest, but real.',
        e1: {
          say: 'The Scotch opens the centre very early. That gives both sides play, and it leaves one fragile square: f2.',
        },
        e2: {
          say: 'Answer in the centre.',
          instruction: 'Play e5',
        },
        e3: {
          say: 'Defend your pawn.',
          instruction: 'Play the knight to c6',
        },
        e4: {
          say: 'They push d4, the Scotch. Take.',
          instruction: 'Take on d4 with the e-pawn',
        },
        e5: {
          say: 'They recapture with the knight. Bishop c5: it comes out aiming at f2, the weakest square in their camp.',
          instruction: 'Play the bishop to c5',
        },
        e6: {
          say: 'And here is the mistake: they trade on c6. It looks harmless — it abandons the defence of f2 and leaves a knight unprotected.',
        },
        e7: {
          say: 'Queen f6. She attacks f2 and the knight on c6 in one move.',
          instruction: 'Play the queen to f6',
          hint: 'The queen comes out to f6: look at the f-file and the sixth rank.',
        },
        e8: {
          say: 'They defend f2 with the queen on d2. The knight on c6 is now completely undefended — but there is something better than taking it.',
        },
        e9: {
          say: 'Take on f2 with check. You are giving up your queen, and you know what you get back.',
          instruction: 'Take on f2 with the queen, with check',
          hint: 'Count the pieces that are going to fall before you judge the move.',
        },
        e10: {
          say: 'They recapture. Bishop f2, check again — and this time you take their queen.',
          instruction: 'Take on f2 with the bishop',
        },
        e11: {
          say: 'The king recaptures. And now you win the knight back on c6.',
          instruction: 'Take on c6 with the d-pawn',
        },
        e12: {
          say: 'Add it up: one pawn more, their king in the middle and unable to castle ever again. That is little and it is a lot — at this level, a king that never castles often loses on its own.',
        },
        e13: {
          say: 'You play White, knight on d4, black bishop on c5. Trading on c6 gives away a pawn. Develop instead.',
        },
        e14: {
          say: 'Bishop e3. You defend your knight on d4, you shore up f2 indirectly, and you offer to trade the bishop that bothers you.',
          instruction: 'Play the bishop to e3',
          hint: 'Develop the queen’s bishop while supporting the d4 knight.',
        },
        e15: {
          say: 'The black queen comes to f6, but f2 is held and nothing is hanging. Remember: a trade that “simplifies” is often a gift of tempo — check what it stops defending.',
        },
      },
    },
    repertoire: {
      title: 'Understanding the openings',
      description:
        'The six openings you meet most often, explained by their ideas and not by their variations. The aim: knowing what to do on move 8, even when your opponent has played something other than the book.',
      italienne: {
        title: 'The Italian Game',
        summary: 'The oldest, the most natural. Every piece towards the centre, no detours.',
        e1: {
          say: 'The Italian is the most direct development there is. Pawn in the centre, knight, bishop. Three moves, three principles respected.',
        },
        e2: {
          say: 'Start with the king’s pawn.',
          instruction: 'Play e4',
        },
        e3: {
          say: 'Knight f3. It attacks the e5 pawn and eyes the centre.',
          instruction: 'Play the knight to f3',
        },
        e4: {
          say: 'And now the move that gives the opening its name: bishop c4. It points at f7, the weakest square in the black camp as long as the king has not castled.',
          instruction: 'Play the bishop to c4',
          hint: 'The bishop on f1 comes out along the diagonal to c4.',
        },
        e5: {
          say: 'There is the typical position. Both sides have a pawn in the centre, a knight and a bishop out. This is the Giuoco Piano — “the quiet game”.',
        },
        e6: {
          say: 'White’s idea from here: castle, play c3 and d4 to build a big pawn centre. Black’s idea: the same thing mirrored, with c6 and d5.',
        },
        e7: {
          say: 'The trap to know: never play the queen to h5 hoping for a quick mate. Black parries and chases the queen while developing. You lose three tempi, they gain three.',
        },
      },
      espagnole: {
        title: 'The Ruy Lopez',
        summary: 'The most played opening at the highest level for a hundred and fifty years.',
        e1: {
          say: 'The same start as the Italian, but the bishop goes to b5 instead of c4. That small change transforms the whole game.',
        },
        e2: {
          say: 'Play the bishop to b5. It attacks the knight on c6, which defends the e5 pawn.',
          instruction: 'Play the bishop to b5',
        },
        e3: {
          say: 'Black almost always answers a6 to chase the bishop. That is the Morphy move, and it is a question: does the bishop take, or retreat?',
        },
        e4: {
          say: 'Taking on c6 gives Black doubled pawns but the bishop pair: that is the Exchange Variation, playable and simple. Retreating to a4 keeps the tension: that is the main line, and the one every world champion has played.',
        },
        e5: {
          say: 'The deep idea of the Ruy Lopez: the threat against c6 is not immediate — taking the e5 pawn straight away loses a piece on d4. It is a **long-term** pressure that troubles Black for twenty moves.',
        },
        e6: {
          say: 'Remember this above all: in the Ruy Lopez, White plays slowly. c3, d3, Nbd2, Nf1, Ng3 — the knight travels right round the board to join the attack. It is called the Spanish manoeuvre.',
        },
      },
      sicilienne: {
        title: 'The Sicilian Defence',
        summary: 'The most combative answer to 1.e4. Unbalanced from the very first move.',
        e1: {
          say: 'Against 1.e4, the Sicilian answers c5. Not e5, which gives a symmetrical game: c5, which creates an immediate imbalance.',
        },
        e2: {
          say: 'Play c5. This single move opens the door to thousands of variations — but the idea behind it is always the same.',
          instruction: 'Play the pawn to c5',
        },
        e3: {
          say: 'Why c5 rather than e5? Because the c-pawn attacks d4 without blocking the black bishop’s diagonal, and above all because after the exchange on d4, Black ends up with two central pawns against one.',
        },
        e4: {
          say: 'After d4 cxd4, White takes back with the knight. Look at the structure: Black has traded a wing pawn for a central pawn. That is a small permanent gain.',
        },
        e5: {
          say: 'In return, White is ahead in development and has the open d-file. The Sicilian is a wager: structural material against time.',
        },
        e6: {
          say: 'White usually attacks on the kingside, Black on the queenside along the c-file. They are two parallel races, and that is what makes these games so sharp.',
        },
        e7: {
          say: 'If you are starting out, just remember: play c5, d6, Nf6, Nc6, e6, then Be7 and castle. That is the Scheveningen set-up, and it holds up against everything.',
        },
      },
      francaise: {
        title: 'The French Defence',
        summary: 'Solid as a rock, with one single flaw — and a plan to fix it.',
        e1: {
          say: 'The French answers e6 to 1.e4. A modest move, which prepares d5 to challenge the centre at once.',
        },
        e2: {
          say: 'Play e6. A quiet move, but one that prepares the real answer on the next one.',
          instruction: 'Play the pawn to e6',
        },
        e3: {
          say: 'And now d5, the real move of the French: Black attacks the white centre head on.',
          instruction: 'Play the pawn to d5',
        },
        e4: {
          say: 'The structure is very solid: two pawns defending each other. But it has a famous flaw — the light-squared bishop is shut in behind its own pawns on e6 and d5.',
        },
        e5: {
          say: 'It is called the “bad French bishop”. Black’s whole plan is to find it a way out: either through b6 and Ba6, or by pushing f6 to open the diagonal.',
        },
        e6: {
          say: 'Black’s other plan, a systematic one: attack the base of the white pawn chain with c5. In the French, c5 comes sooner or later almost every time.',
        },
      },
      'gambit-dame': {
        title: 'The Queen’s Gambit',
        summary: 'A pawn offered that is not really offered. The most solid opening after 1.d4.',
        e1: {
          say: 'After 1.d4 d5, White plays c4. We call it a gambit, but that is a loose use of the word: the pawn is not really given away.',
        },
        e2: {
          say: 'Play c4, attacking the d5 pawn from the side. That is the Queen’s Gambit.',
          instruction: 'Play the pawn to c4',
        },
        e3: {
          say: 'If Black takes on c4, White recovers the pawn effortlessly with e3 and then Bxc4. Meanwhile they will have occupied the centre. So taking is not winning a pawn, it is giving up the centre.',
        },
        e4: {
          say: 'The real question put to Black is: how to defend d5? With e6, that is the Queen’s Gambit Declined, solid but it shuts the bishop in. With c6, that is the Slav, which keeps the bishop free.',
        },
        e5: {
          say: 'White’s plan in all these lines is the same: Nc3, Nf3, Bg5 to pin, e3, Bd3, castle, then push e4 at the right moment to open the centre.',
        },
        e6: {
          say: 'Remember the general principle of 1.d4: these games are slower than 1.e4 games. You manoeuvre, you improve your pieces, and the advantage is built over twenty moves instead of ten.',
        },
      },
      'est-indienne': {
        title: 'The King’s Indian Defence',
        summary: 'Letting your opponent have the centre… the better to destroy it afterwards.',
        e1: {
          say: 'The King’s Indian turns everything we have learned upside down: Black deliberately lets White take the whole centre.',
        },
        e2: {
          say: 'Knight f6 first.',
          instruction: 'Play the knight to f6',
        },
        e3: {
          say: 'Then g6, to prepare the bishop’s fianchetto.',
          instruction: 'Play the pawn to g6',
        },
        e4: {
          say: 'And the bishop to g7. It sweeps the long diagonal, straight at the centre and the white queenside.',
          instruction: 'Play the bishop to g7',
        },
        e5: {
          say: 'There is the idea: the bishop on g7 and the knight on f6 put pressure on the white centre from a distance. Black does not occupy it, they aim at it.',
        },
        e6: {
          say: 'Black’s classic plan: castle, play d6, then e5 to strike at the centre. If White closes with d5, Black launches f5, f4, g5 and attacks the king. These are among the most violent games in chess.',
        },
        e7: {
          say: 'Careful: this is a demanding opening. It asks you to wait while your opponent builds, without panicking. Only take it up when you are comfortable in closed positions.',
        },
      },
    },
    ouverture: {
      title: 'Opening well',
      description:
        'Three principles are enough to play the first ten moves of any game properly — without learning a single variation by heart.',
      'principes-ouverture': {
        title: 'The three principles',
        summary: 'Centre, development, king safety. Everything else follows from those.',
        e1: {
          say: 'The opening has three aims, and only three. Occupy the centre. Bring out your pieces. Put your king in safety. If your first ten moves serve those three ends, you are playing well.',
        },
        e2: {
          say: 'First principle: the centre. Advance a central pawn two squares. Play e4.',
          instruction: 'Play the pawn to e4',
          hint: 'The e2 pawn advances two squares.',
        },
        e3: {
          say: 'Excellent. That pawn controls d5 and f5, and it frees your bishop’s diagonal and your queen’s. One move, three benefits.',
        },
        e4: {
          say: 'Second principle: development. Bring a minor piece out towards the centre. The knight to f3 is the most natural move — it already attacks the e5 pawn.',
          instruction: 'Play the knight to f3',
          hint: 'The knight on g1 jumps to f3.',
        },
        e5: {
          say: 'Carry on: bring out your bishop. On c4 it aims at f7, the weakest point in the black camp early in the game.',
          instruction: 'Play the bishop to c4',
          hint: 'The bishop on f1 comes out along the diagonal.',
        },
        e6: {
          say: 'Third principle: safety. Both your kingside pieces are out, so you can castle. Do it now.',
          instruction: 'Castle kingside',
          hint: 'Take the king and put him on g1.',
        },
        e7: {
          say: 'In four moves you have a pawn in the centre, two pieces developed and a king in safety. That is a perfect opening, and you have learned nothing by heart.',
        },
      },
      'erreurs-ouverture': {
        title: 'The four classic mistakes',
        summary: 'What every beginner does — and why it costs so much.',
        e1: {
          say: 'Mistake number one: bringing the queen out too early. It is tempting, she is powerful. Let us see what happens.',
        },
        e2: {
          say: 'White plays the queen to h5. She threatens mate on f7 — but Black parries easily, and then chases her while developing their pieces with gain of time.',
        },
        e3: {
          say: 'Black brings out a knight while defending. They develop, White does not. Every move that chases the queen wins Black a tempo.',
        },
        e4: {
          say: 'Mistake number two: moving the same piece twice in the opening. Every move should bring out a **new** piece. There are eight pieces to develop and only about ten moves to do it in.',
        },
        e5: {
          say: 'Mistake number three: pointless pawn moves on the wings. a3 and h3 develop nothing, take no centre, and slightly weaken the position. Two moves wasted.',
        },
        e6: {
          say: 'Mistake number four: moving the king. Not only does he stay in the centre, he permanently loses the right to castle. The game will be very uncomfortable.',
        },
        e7: {
          say: 'Just remember: a new piece every move, towards the centre, and castling before move ten. That alone will spare you eighty per cent of bad openings.',
        },
      },
    },
    milieu: {
      title: 'The middlegame',
      description:
        'The pieces are out, the king is safe… and now what? Here is how to find a plan instead of playing at random.',
      'colonnes-ouvertes': {
        title: 'Open files',
        summary: 'A file with no pawn on it is a motorway. It belongs to the rooks.',
        e1: {
          say: 'An open file is a file with no pawn at all on it, white or black. Here the d-file has just opened: it is the way into the enemy camp.',
        },
        e2: {
          say: 'Put your rook on it. In the middlegame and the endgame, a rook on an open file is worth far more than a rook stuck behind its pawns.',
          instruction: 'Play a rook to d1',
          hint: 'Bring one of your rooks to d1, behind your queen.',
        },
        e3: {
          say: 'The principle goes further: two rooks doubled on the same open file are almost irresistible. And a rook that reaches the seventh rank devours pawns there.',
        },
        e4: {
          say: 'When no file is open, look for a **half-open** file: no pawn of yours, but an enemy pawn on it. That pawn becomes a fixed target.',
        },
      },
      'avant-poste': {
        title: 'The outpost',
        summary: 'An advanced square where your knight is untouchable. Every piece’s dream.',
        e1: {
          say: 'An outpost is an advanced square in the enemy camp, protected by one of your pawns, which no enemy pawn can ever attack.',
        },
        e2: {
          say: 'The knight on e5 is on an outpost here: no black pawn will ever be able to chase it away, because the black d- and f-pawns have already gone past or are missing. It will stay there all game.',
        },
        e3: {
          say: 'A knight on an outpost in the heart of the enemy camp is often worth a rook. Look for these squares systematically: they appear as soon as an opponent advances their pawns.',
        },
      },
      'securite-roi': {
        title: 'King safety',
        summary: 'Three untouched pawns in front of him, or the attack arrives.',
        e1: {
          say: 'A castled king with his three pawns untouched in front of him is very hard to attack. That is the set-up to preserve.',
        },
        e2: {
          say: 'Every pawn that advances in front of the king creates a permanent weakness. Here g6 has weakened the f6 and h6 squares, and above all the long diagonal.',
        },
        e3: {
          say: 'A simple rule: only advance the pawns in front of your king if you are forced to, or to make an escape square. Every push is a door you open.',
        },
        e4: {
          say: 'And the corollary: when you attack a king, count his defenders. If you have more attacking pieces than he has defenders around him, launch the attack. Otherwise, improve your pieces first.',
        },
      },
    },
    finale: {
      title: 'Endgames',
      description:
        'Few pieces, a great deal of precision. This is where level games are won — and where most club players have never learned a thing.',
      'roi-actif': {
        title: 'The king becomes a piece',
        summary: 'All game he was hiding. In the endgame, he goes to the front.',
        e1: {
          say: 'As long as the queens are on the board, the king hides. As soon as they disappear, everything changes: the king becomes an attacking piece, about as strong as a knight.',
        },
        e2: {
          say: 'In the endgame the first reflex is always the same: centralise your king. A king in the centre reaches both wings; a king in his corner always arrives too late.',
        },
        e3: {
          say: 'Walk your king towards the centre.',
          instruction: 'Advance the king',
          hint: 'The king steps one square towards the centre.',
        },
        e4: {
          say: 'A player who forgets to activate their king in the endgame loses perfectly holdable positions. It is probably the costliest mistake from 1200 Elo upwards.',
        },
      },
      opposition: {
        title: 'The opposition',
        summary: 'The duel of kings that decides every pawn endgame.',
        e1: {
          say: 'Two kings facing each other, one square apart: that is the opposition. And here is the paradox: whoever **has** to move loses it, because they are obliged to give ground.',
        },
        e2: {
          say: 'Here it is White to move, so Black has the opposition. The white king will have to step aside, and the black king will advance.',
        },
        e3: {
          say: 'That is why it is decisive. King and pawn against king: if the defending king keeps the opposition in front of the pawn, the game is drawn. If he loses it, the pawn goes through.',
        },
        e4: {
          say: 'The winning technique: push your **king** before your pawn. The king clears the way, the pawn follows. Pushing the pawn first is the classic mistake that turns a win into a draw.',
        },
        e5: {
          say: 'Remember the formula: in a pawn endgame, the king goes first. Always.',
        },
      },
      'regle-du-carre': {
        title: 'The rule of the square',
        summary: 'One glance tells you whether a king catches a pawn.',
        e1: {
          say: 'Your pawn on a2 wants to queen. The black king on h4 is far away. Does he catch it? There is a trick for answering in a second, without counting.',
        },
        e2: {
          say: 'Draw a square with one side running from the pawn to its promotion square. Here, from a2 to a8: six squares. So the square is six by six, from a2 to f8.',
        },
        e3: {
          say: 'The rule: if the enemy king is **inside** that square, or can step into it, he catches the pawn. If he is outside and it is your move, the pawn goes through.',
        },
        e4: {
          say: 'Here the black king is on h4, outside the square. If you push the pawn, he will never catch it. A geometric rule, no calculation.',
        },
        e5: {
          say: 'Careful: the square shrinks with every pawn push, but a pawn starting from its second rank can advance two squares — so the square is then counted from the third rank.',
        },
      },
      'pion-passe': {
        title: 'The passed pawn',
        summary:
          'No enemy pawn can stop it any more. In the endgame it is worth its weight in gold.',
        e1: {
          say: 'A passed pawn is a pawn no enemy pawn can stop any more: not on its file, not on the neighbouring files. All it has to do is run.',
        },
        e2: {
          say: 'In the endgame, a passed pawn forces your opponent to tie a piece down to watching it. That is an enormous advantage, even if it never queens.',
        },
        e3: {
          say: 'Better still: the **protected** passed pawn, supported by another pawn. Your opponent can neither take it nor blockade it lastingly with their king.',
        },
        e4: {
          say: 'And Tarrasch’s rule, absolutely one to remember: rooks belong **behind** passed pawns. Behind yours to push it, behind your opponent’s to hold it back.',
        },
      },
    },
    tactique: {
      title: 'Tactics',
      description:
        'The patterns that win material. This is the chapter that improves a player below 1500 the most: most games are lost on one of these six things.',
      'piece-en-prise': {
        title: 'The hanging piece',
        summary: 'The number one cause of lost games. A two-second reflex is enough.',
        e1: {
          say: 'A hanging piece is an attacked piece that nobody defends. Here, the black pawn on e5 is attacked by the knight, and no black piece protects it.',
        },
        e2: {
          say: 'Take it. It is free.',
          instruction: 'Capture the pawn on e5',
          hint: 'The knight jumps from f3 to e5.',
        },
        e3: {
          say: 'That is the reflex to build. Before **every** move, ask yourself two questions. One: what is my opponent attacking? Two: what are they leaving undefended?',
        },
        e4: {
          say: 'Careful all the same: here Black has defended the pawn with the knight on c6. Taking would now be a plain exchange, not a present. A piece that is attacked **and defended** is not hanging.',
        },
      },
      fourchette: {
        title: 'The fork',
        summary: 'One piece, two targets. You cannot save everything.',
        e1: {
          say: 'A fork is one piece attacking two at once. The knight is the champion in every category, because it jumps and you see it coming badly.',
        },
        e2: {
          say: 'Look: if the knight reaches c7, it attacks the king on e8 and the rook on a8 at the same time.',
        },
        e3: {
          say: 'Your move. The knight is now on b5, one jump from c7. Put it on the square and watch what happens to Black.',
          instruction: 'Play the knight to c7',
          hint: 'From b5 the knight jumps to c7: check to the king, and the rook is hit at the same time.',
        },
        e4: {
          say: 'The black king had to answer the check — he had no choice, and that is the whole strength of the royal fork: while he saves himself, he abandons the rook. Take it.',
          instruction: 'Take the rook on a8',
          hint: 'The knight on c7 goes to eat the rook on a8.',
        },
        e5: {
          say: 'Here is the other situation: the fork you **suffer**. That black knight on c6 is one jump from e5 and d4. Every time an enemy knight approaches your pieces, look for the squares from which it could touch two of them.',
        },
        e6: {
          say: 'The most profitable fork is the one that hits the king: your opponent is **obliged** to answer the check, and the other piece falls. That is what we call a royal fork.',
        },
      },
      clouage: {
        title: 'The pin',
        summary: 'A piece stuck in front of a more valuable one cannot move any more.',
        e1: {
          say: 'The pin. A piece is stuck in front of a more valuable one: if it moves, the other falls.',
        },
        e2: {
          say: 'Play the bishop to g5. It aims at the knight on f6, and right behind that knight sits the black queen on d8.',
          instruction: 'Play the bishop to g5',
          hint: 'The bishop on c1 goes up the diagonal: d2, e3, f4, g5.',
        },
        e3: {
          say: 'There is the pin. The knight on f6 can no longer move without handing over the queen. It has become a motionless target: you can attack it as often as you like, it will not escape.',
        },
        e4: {
          say: 'There are two kinds of pin. The **relative** pin, like the knight in front of the queen: the piece may legally move, but it costs dearly.',
        },
        e5: {
          say: 'And the **absolute** pin: when it is the king behind. The piece then cannot move at all, it would be illegal. Here the knight on c3 is pinned by the black queen on b4.',
        },
        e6: {
          say: 'A reflex to acquire: when an enemy piece is pinned, attack it once more. It cannot flee, and it will end up falling.',
        },
      },
      enfilade: {
        title: 'The skewer',
        summary: 'The pin in reverse: the valuable piece is in front, and it has to move.',
        e1: {
          say: 'The skewer is the pin inverted: the valuable piece is in front, the less valuable one behind. You attack the first, it has to step aside, and you take the second.',
        },
        e2: {
          say: 'Here, black king on e8 and black rook on d8, both on the same rank. A white rook arriving on that rank gives check to the king… and eyes the rook behind him.',
        },
        e3: {
          say: 'The same thing along a line. The white rook on a1 aims at the black rook on d1, but it is the white king who is behind. This is what you must never let happen.',
        },
        e4: {
          say: 'In practice you look for a skewer whenever two enemy pieces are lined up: same rank, same file, same diagonal. Build the reflex of checking those alignments every move.',
        },
      },
      decouverte: {
        title: 'The discovered attack',
        summary: 'One piece steps aside and unmasks another. Two threats in one move.',
        e1: {
          say: 'Look at this alignment: the white rook on e1, the knight on e5, and the black king on e8. All three on the e-file.',
        },
        e2: {
          say: 'The knight blocks the rook’s line. But if it steps aside, the rook gives check instantly. And the knight goes wherever it likes: it can go and capture something while your opponent deals with the check.',
        },
        e3: {
          say: 'Send the knight to c6: it gives discovered check while attacking from its new square.',
          instruction: 'Play the knight to c6',
          hint: 'Any knight move frees the file. Pick one.',
        },
        e4: {
          say: 'It is the most profitable tactic in the game, because your opponent can only answer one threat at a time — and a check always comes first.',
        },
        e5: {
          say: 'The peak of the genre is the double check: the knight gives check **and** unmasks the rook. There, no defence works at all. No capture, no interposition: the king has to move, and that is that.',
        },
      },
      'elimination-defenseur': {
        title: 'Removing the defender',
        summary: 'A well-defended piece? Start by getting rid of its guard.',
        e1: {
          say: 'The e5 pawn is defended by the knight on c6. So you cannot simply take it. But what happens if that knight disappears?',
        },
        e2: {
          say: 'That is the whole idea: instead of attacking the target, you go after its defender. Once the guard has gone, the target falls on its own.',
        },
        e3: {
          say: 'That is why the Ruy Lopez starts with the bishop to b5: it attacks the knight on c6, which defends the e5 pawn. It is an indirect threat, and it shapes the whole opening.',
        },
        e4: {
          say: 'When an enemy piece blocks you, do not batter away at it. Ask yourself instead: who protects it? And attack that one.',
        },
      },
      sacrifice: {
        title: 'The sacrifice',
        summary: 'Giving up material to get something better: time, lines, a bare king.',
        e1: {
          say: 'A sacrifice is deliberately giving up material to get something else: opening a line, exposing a king, gaining three tempi of development.',
        },
        e2: {
          say: 'The classic sacrifice on f7: the bishop gives itself up to draw the black king out of his shelter. Three points against a pawn — but the king is going to end up in the middle of the board.',
        },
        e3: {
          say: 'How do you know whether a sacrifice is sound? Count what you get **in moves**, not in points. If your opponent has to spend three moves bringing their king back, you have three moves in hand to bring your pieces up.',
        },
        e4: {
          say: 'A rule of caution for a beginner: only sacrifice if you can see it through to the end. A sacrifice you cannot justify is not a sacrifice, it is a piece down.',
        },
      },
    },
  },
  prompt: {
    system:
      'You are a chess coach: warm and direct.\n\nWhat you are given is reliable: the evaluation comes from the Stockfish engine and the written explanation comes from the application. Your job is to build on it to help the person understand — never to recompute it.\n\nRules:\n- Never invent a line, a move or an evaluation. If something was not given to you, say plainly that you do not have it.\n- Start from what the person already knows: their question shows where they are stuck.\n- Three sentences is enough. This is read between moves, not in a textbook.\n- Name patterns the way players do: fork, pin, skewer, back-rank mate, weak square.\n- Do not open with a greeting.',
    answerIn: 'Answer in {langue}, whatever the language of these instructions.',
    spoken: '(Answer in two sentences at most — this will be read aloud.)',
    goDeeper:
      'Go further than the explanation above: what is the idea behind the engine’s move, and what should I look at next time to spot it myself?',
    relayIncomplete: 'Incomplete request.',
    relaySchemeOnly: 'Only http and https are relayed.',
    relayWrongProvider: 'This address does not match this provider.',
    relayUnknownHost: 'Host name not found.',
    relayPrivateNetwork: 'This address points to a private network.',
    relayRedirect: 'The provider answered with a redirect, which the relay does not follow.',
  },
  meta: {
    rootTitle: 'Le Coup Parfait — learn, play, improve at chess',
    rootDesc:
      'A free and libre chess platform: voice-guided lessons, analysis explained move by move, 18 levels of opponents and games between friends. No advertising, no account required.',
    ogTitle: 'Le Coup Parfait — chess, finally explained',
    ogDesc:
      'An engine that explains why, a voice that keeps you company, and zero euros. Free software you can host yourself.',
    about: 'About',
    aboutDesc:
      'What Le Coup Parfait is, why it is free, and what becomes of your data. Short answer: nothing, it stays with you.',
    admin: 'Administration',
    friends: 'Friends',
    friendsDesc: 'Your address book, the challenges received and the ones you sent.',
    analysis: 'Analyse a game',
    analysisDesc: 'Replay a game move by move, with every mistake explained.',
    sharedAnalysis: 'An analysed game',
    listen: 'Listen to the syllabus',
    listenDesc:
      'The lessons read aloud, with nothing to touch: the coach speaks, the board follows. For revising while doing something else.',
    learn: 'Learn',
    learnDesc: 'The guided lessons, from the rules of the game to the endgames.',
    levelTest: 'Level test',
    levelTestDesc:
      'Twelve positions to place your level, and the list of what earns you points afterwards.',
    tier: 'Your tier',
    tierDesc:
      'The syllabus ordered by what costs the most points at your level, and the motifs you really do miss.',
    principles: 'Principles and checklist',
    principlesDesc:
      'Four questions to ask before every move, and the guiding principles of the three phases — each with its exception.',
    career: 'Career',
    careerDesc: 'Your journey, chapter after chapter.',
    leaderboard: 'Leaderboard',
    leaderboardDesc: 'The best players on this instance.',
    community: 'Community',
    communityDesc: 'The leaderboard, your friends, your correspondence games and your statistics.',
    signIn: 'Sign in',
    correspondence: 'Correspondence',
    correspondenceDesc: 'The games that are played over several days.',
    credits: 'Credits & licences',
    creditsDesc:
      'The free software, datasets and graphic assets Le Coup Parfait is built on, with their authors and their licences.',
    devMail: 'Test mail',
    editor: 'Position editor',
    editorDesc: 'Compose a position and play it.',
    train: 'Train',
    trainDesc: 'Puzzles at your level, a timed round and the daily challenge.',
    study: 'Study',
    studies: 'Studies',
    studiesDesc: 'Annotated journeys, to read and to share.',
    endgames: 'Endgames',
    endgamesDesc: 'The elementary endgames, to play against the tablebase.',
    glossary: 'Glossary',
    glossaryDesc: 'The vocabulary of chess, explained simply.',
    opponents: 'The artificial opponents',
    opponentsDesc:
      'Seven opponents, seven genuinely different styles of play — their story, their measured leanings, and how to beat each of them.',
    playFriend: 'Play against someone',
    play: 'Play',
    playDesc: 'Against the computer, against a friend, or on the same screen.',
    local: 'Game on the same screen',
    computer: 'Against the computer',
    computerDesc: 'Calibrated opponents, from the very first move to grandmaster.',
    liveGame: 'Live game',
    lesson: 'Teaching session',
    lessonDesc:
      'A game against a calibrated opponent, a theme announced before you start, and a review that says where it appeared.',
    watch: 'Watch a game',
    watchDesc: 'The games in progress on this instance.',
    watchSomeone: '{pseudo}’s game',
    watchSomeoneDesc: 'Follow {pseudo}’s game against the computer, move by move.',
    forgotten: 'Forgotten password',
    elo: 'Elo calculator',
    eloDesc:
      'What a tournament earns or costs you, game by game, and your performance — on the FIDE scale.',
    arbitration: 'Arbitration checklist',
    arbitrationDesc:
      'Touch-move, illegal move, flag, claimed draw, phones: what the FIDE Laws of Chess say, on one page.',
    tools: 'Tools',
    toolsDesc:
      'The clock, the Elo calculator, the random draw and the arbitration checklist: what is useful around a real board.',
    draw: 'Random draw',
    drawDesc:
      'The colours of a game, the pairings of a round, the playing order: a draw everybody can see.',
    stakes: 'What is at stake in the openings',
    stakesDesc:
      'Twenty-five openings explained by their idea, their pawn structure, each side’s plan and the trap in the first ten moves.',
    openings: 'Openings',
    openingsDesc: 'The explorer: 3,970 openings catalogued.',
    more: 'More',
    moreDesc: 'The community, the tools, your account and the settings.',
    settings: 'Settings',
    profileDesc: 'Ratings, progress and latest games of {pseudo}.',
    puzzles: 'Puzzles',
    puzzlesDesc: 'Find the best move, one exercise at a time.',
    rush: 'Puzzle rush',
    rushDesc: 'As many puzzles as possible before time runs out.',
    reset: 'New password',
    stats: 'Statistics',
    statsDesc: 'What your games say about your play.',
    tournament: 'Tournament',
    tournaments: 'Tournaments',
    tournamentsDesc: 'The arenas in progress and to come.',
    computerTournament: 'Tournament against the computer',
    verify: 'Address confirmation',
    vision: 'Vision',
    visionDesc: 'The exercise that teaches you to see the squares without counting them.',
    lessonNotFound: 'Lesson not found',
  },
  crash: {
    title: 'Le Coup Parfait could not start',
    blurb: 'The application itself ran into a problem. Trying again restarts the whole load.',
    retry: 'Try again',
    reference: 'Incident reference:',
  },
  bits: {
    challengeFrom: '{pseudo} challenges you to a game',
    unrecognisedFormat: 'Format not recognised',
    paste: 'Paste',
    asImage: 'Image',
    flip: 'Flip',
    clear: 'Empty',
    remove: 'Remove',
    toMove: 'To move',
    beforeEachMove: 'Before every move',
    except: 'Except',
    syllabus: 'Syllabus',
    noMessage: 'No message',
    refresh: 'Refresh',
    chapter: 'Chapter',
    undo: 'Undo',
    options: 'Options',
    seeMyTier: 'See my tier',
    whichGames: 'Which games to show',
    watch: 'Watch',
    back: 'Back',
    startPosition: 'Starting position',
    aNameAndPassword: 'a username and a password',
    freeNoEmail: 'free, and with no email required',
    playArrow: 'Play →',
    nextMove: 'Next move',
    toEnd: 'End',
    capturedPieces: 'Captured pieces',
    send: 'Send',
    goDeeper: 'Go deeper',
    service: 'Service',
    load: 'Load',
    mainNav: 'Main navigation',
    sections: 'Sections',
    needsAccount: 'needs an account',
    quickNav: 'Quick navigation',
    secondaryLinks: 'Secondary links',
    erase: 'Clear',
    invitation: 'Invitation',
    notification: 'Notification',
    giveUp: 'Give up',
    reset: 'Reset',
    analyse: 'Analyse',
    goPlay: 'Go and play',
    deadLinkShort: 'Unusable link',
    newRecord: 'New record!',
    show: 'Show',
    hide: 'Hide',
  },
  rest: {
    boardFixSquares: 'To fix on the board: {cases}.',
    immortal0: 'The King’s Gambit: White offers a pawn to open lines towards the enemy king.',
    immortal1: 'Black is collecting material while White develops. Two philosophies are clashing.',
    immortal2: 'A second pawn falls. The evaluation has Black winning easily — and yet.',
    immortal3: 'Black has just taken the rook on a1. They are a queen and two rooks ahead.',
    immortal4:
      'Knight takes g7, check. The black king is bare in the centre: material no longer protects it.',
    immortal5: 'Queen sacrifice! Anderssen gives up his last heavy piece.',
    immortal6: 'Bishop e7, mate. Three minor pieces are enough when the king has no square left.',
    doorLearn: 'Learn chess from scratch',
    doorAnalyse: 'Analyse a game',
    doorComputer: 'Play against the computer',
    devOnly: 'Development only',
    devOnlyHint:
      'This mailbox does not exist in production: the list of sent mail would reveal members’ addresses.',
    mailbox: 'Mailbox',
    mailboxHint: 'Messages do not go out: they are written to disk, in data/courriels.',
    mailboxEmptyHint: 'Create an account with an address: the welcome message will appear here.',
    createAccount: 'Create an account',
    community: 'Community',
    communityIntro:
      'The other players, and what you do with them: compare yourself, find each other, and look at what your games say about your play.',
    leaderboardBlurb:
      'Who plays here, and at what level. Each time control has its own, and puzzles count separately.',
    friendsBlurb:
      'Your address book: who is online, who has challenged you, and the invitation link to send to somebody without an account yet.',
    statsBlurb:
      'What your games say about your play: the opening where you score least, the time control that suits you, the hour when you play badly.',
    serverDown: 'The server is unreachable.',
    changeAvatar: 'Change avatar',
    pickAvatar: 'Pick an avatar',
    yourAvatar: 'Your avatar',
    subscribeFailed: 'The subscription could not be saved.',
    browserRefused: 'The browser refused the subscription.',
    settingNotSaved: 'The setting was not saved.',
    sendFailed: 'Sending failed.',
    requestFailed: 'The request failed.',
    replayAnswer: 'Play the answer again',
    askPlaceholder: 'Ask your question…',
    askAboutPosition: 'Ask your question about this position',
    driverChessnut: 'Chessnut',
    driverChessnutModels: 'Air, Air+, Pro, Go, Evo',
    driverChessnutUsb: 'Chessnut by cable',
    driverChessnutUsbModels: 'Air, Air+, Pro (experimental)',
    driverMillennium: 'Millennium ChessLink',
    driverMillenniumModels: 'Exclusive, Supreme Tournament 55, King Performance, eONE',
    driverMillenniumUsb: 'Millennium by cable',
    driverMillenniumUsbModels: 'ChessLink over USB',
    driverPegasus: 'DGT Pegasus',
    driverPegasusModels: 'presence detection, with LEDs',
    driverDgt: 'DGT',
    driverDgtModels: 'e-Board, Smart Board, USB-C (no LEDs)',
    driverCertabo: 'Certabo',
    driverCertaboModels: 'Certabo, TabuTronic Cerno and Sentio',
    noBluetooth: 'This browser does not expose Bluetooth.',
    noHid: 'This browser does not expose WebHID.',
    noSerial: 'This browser does not expose Web Serial.',
    noStreams: 'The serial port provides neither reading nor writing.',
    connectFailed: 'Cannot connect.',
    gattFailed: 'GATT connection failed.',
    noCardChosen: 'No board chosen.',
    cardDisconnected: 'Board disconnected.',
    cardDisconnectedWhy: 'Board disconnected — {raison}',
    boardMismatch: 'The board does not match the game. Put the pieces back in place.',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediate',
    levelAdvanced: 'Advanced',
    copyPosition: 'Copy the position (Ctrl+Shift+C)',
    positionCopied: 'Position copied',
    copyFailed: 'Cannot copy',
    clipboardRefused: 'The browser did not allow access to the clipboard.',
    searchPlayer: 'Search for a player…',
    searchPlayerAria: 'Search for a player in the directory',
    nobodyByThatName: 'Nobody by that name in the directory.',
    whiteToMove: 'White to move',
    blackToMove: 'Black to move',
    whiteFlagged: 'Time out — White’s flag falls.',
    blackFlagged: 'Time out — Black’s flag falls.',
    promotionChoice: 'Choice of promotion piece',
    chapterDone: 'Chapter complete',
    wellPlayed: 'Well played',
    hideOpening: 'Hide the opening name',
    hideOpeningTitle: 'Hide — can be turned back on in the settings',
    won: 'won',
    lost: 'lost',
    drawn: 'drawn',
    noResult: 'no result',
    white: 'White',
    black: 'Black',
    rowStart: 'See the start of the row',
    rowNext: 'See the rest of the row',
    maiaDown: 'Maia is unreachable.',
    engineCouldntPlay: 'The engine could not play. Try again or reload the page.',
    unreadableResponse: 'Unreadable answer from the provider.',
    noStream: 'The provider returned no stream.',
    evalOverTime: 'How the evaluation changed over the game',
    previousMove: 'Previous move',
    seeYouSoon: 'See you soon!',
    installApp: 'Install the application',
    theOpponent: 'the opponent',
    theComputer: 'the computer',
    justNow: 'just now',
    liveServerDown:
      'The game server is unreachable. Check that it is running, or play against the computer meanwhile.',
    cannotFetchGames: 'Cannot fetch the games.',
    explorer: 'The explorer',
    openingExplorer: 'Opening explorer',
    importCommand: 'Import command:',
    computerTournament: 'Tournament against the computer',
    today: 'today,',
    ratingCurveAria:
      '{categorie} rating: {depart} at the start, {arrivee} today, over {parties} games.',
    askEngineConfirm:
      'Ask the engine for the best move?\n\nYour opponent will be told in the game chat.',
  },
  catalog: {
    setStaunton: 'Staunton',
    setStauntonHint: 'The tournament standard since 1849.',
    setMerida: 'Merida',
    setMeridaHint: 'Crisp outlines, very legible at small sizes.',
    setAlpha: 'Alpha',
    setAlphaHint: 'Solid silhouettes, no superfluous detail.',
    setChessnut: 'Chessnut',
    setChessnutHint: 'Spare and contemporary.',
    setFantasy: 'Fantasy',
    setFantasyHint: 'Sculpted volumes, soft shadows.',
    setCeltic: 'Celtic',
    setCelticHint: 'Interlacing and engraved lines.',
    setSpatial: 'Spatial',
    setSpatialHint: 'Futuristic shapes in perspective.',
    setRhos: 'Rhos',
    setRhosHint: 'Flat colours, public domain.',
    setPixel: 'Pixel',
    setPixelHint: 'A tribute to 8-bit chessboards.',
    setLetter: 'Letters',
    setLetterHint: 'Initials alone — maximum legibility.',
    boardAurore: 'Aurora',
    boardNoyer: 'Walnut',
    boardMarbre: 'Marble',
    boardArdoise: 'Slate',
    boardMousse: 'Moss',
    boardPapier: 'Paper',
    boardNeon: 'Neon',
    boardSepia: 'Sepia',
    matIvory: 'Ivory',
    matMarble: 'Marble',
    matGlass: 'Glass',
    colClassic: 'Ivory & ebony',
    colClassicHint: 'The colours of a real tournament set.',
    colPure: 'White & black',
    colPureHint: 'Maximum contrast, no ambiguity.',
    colWood: 'Maple & walnut',
    colWoodHint: 'Two kinds of wood, warm.',
    colMarble: 'Marble',
    colMarbleHint: 'Cold and mineral.',
    colTheme: 'Follow the theme',
    colThemeHint: 'The pieces take the colours of the board.',
    colCustom: 'Custom',
    colCustomHint: 'Choose the two colours yourself.',
    careerGate: 'The career needs an account',
    careerGateWhy:
      'Twelve chapters and progress that is kept: it would make no sense if it vanished when you closed the tab.',
    careerGain1: 'Your stars, your rank and your feats kept',
    careerGain2: 'Resuming where you left off, on any device',
    careerGain3: 'An opponent calibrated to your real level, chapter after chapter',
    tourneyGate: 'Tournaments need an account',
    tourneyGateWhy:
      'An arena pairs players across several rounds: it has to be able to find you again between games.',
    tourneyGain1: 'Create an arena and enrol other players in it',
    tourneyGain2: 'A standing that carries from one round to the next',
    tourneyGain3: 'Solo tournaments against the computer, with their table',
    friendsGate: 'The friends list needs an account',
    friendsGateWhy: 'Friends find each other by username: so you need to have one.',
    friendsGain1: 'Challenge someone in one click, without going through a link',
    friendsGain2: 'See who is online and who is waiting for your move',
    friendsGain3: 'An invitation link in your name',
    corrGate: 'Correspondence needs an account',
    corrGateWhy:
      'A game that lasts days has to recognise you each time you come back, otherwise it is lost the first time a tab closes.',
    corrGain1: 'Several games in progress, at your own pace',
    corrGain2: 'A counter that tells you where it is your turn',
    corrGain3: 'Nothing to leave open between two moves',
    statsGate: 'Statistics need an account',
    statsGateWhy:
      'They are computed on your recorded games: without an account, no game belongs to anybody.',
    statsGain1: 'Your accuracy and estimated Elo, game after game',
    statsGain2: 'Your most played openings and their results',
    statsGain3: 'The phase of the game that costs you the most points',
    studiesGate: 'Studies need an account',
    studiesGateWhy:
      'A study belongs to you and is found again from one session to the next: we have to know whose it is.',
    studiesGain1: 'Annotated positions, kept and resumed',
    studiesGain2: 'Your variations kept with their comments',
    dailyGate: 'The daily challenge needs an account',
    dailyGateWhy:
      'The same position for everybody, once a day: it is a streak, and a streak is counted over time.',
    dailyGain1: 'Your run of consecutive days, and your record',
    dailyGain2: 'The goals of the day and the points that go with them',
    dailyGain3: 'Ordinary puzzles, for their part, stay free and unlimited',
  },
  announce: {
    fromTeam: 'A word from the team',
    forYou: 'Message for you',
    signed: 'from {auteur}',
    dismiss: 'Dismiss this message',
  },

  admin: {
    gigabytes: '{n} GB',
    hourOfDay: '{n}:00',
    title: 'Administration',
    blurb:
      'What you do here applies to real people. Irreversible acts require typing the username, and all of them are recorded in the log.',
    tabDashboard: 'Dashboard',
    tabAccounts: 'Accounts',
    tabAnnouncements: 'Announcements',
    tabContent: 'Content',
    tabLog: 'Log',
    tabSystem: 'System',
    tabTools: 'Tools',

    // ── Announcements ─────────────────────────────────────────────────────
    announceNew: 'Write to players',
    announceHint:
      'With no recipient, the message is shown to everyone. With a username, only that person sees it.',
    announcePlaceholder: 'The message, as it will be read…',
    announceTarget: 'Recipient',
    announceTargetHint: 'Type two letters to search. Leave empty to address everyone.',
    announceEveryone: 'Everyone',
    announceNoMatch: 'No account starts with that.',
    announceDisabled: 'disabled',
    halfMovesGames: '{n} games',
    announceDays: 'Display for, in days',
    announceDaysHint: '0 to keep it up until you withdraw it.',
    announceToneInfo: 'Information',
    announceToneImportant: 'Important',
    announceSend: 'Send',
    announceSendAll: 'Announce to all',
    announceScopeOne: 'Only {pseudo} will see this message.',
    announceScopeAll: 'Every player will see this message, signed in or not.',
    announceSent: 'What has been said',
    announceSentHint: 'The last forty messages, and how many times they were read.',
    announceNone: 'No message sent',
    announceReads: '{n} read(s)',
    announceWithdraw: 'Withdraw this message',
    announceWithdrawn: 'Message withdrawn.',
    announceOff: 'Off',
    announceSentTo: 'Message sent to {pseudo}.',
    announceSentAll: 'Announcement published.',
    announceEmpty: 'An empty message is not sent.',
    announceTooLong: 'The message is over six hundred characters.',
    announceNoSuchUser: 'No account has that username.',
    notFound: 'This page does not exist',
    notFoundHint: 'Check the address, or go back to the home page.',
    readFailed: 'Cannot read.',
    tryAgain: 'Try again in a moment.',
    serverDown: 'The server is unreachable.',
    badResponse: 'Unexpected response from the server ({code}).',
    done: 'Done.',
    loggedInJournal: 'The act is recorded in the log.',
    modeComputer: 'Against the computer',
    modeFriend: 'Between players',
    modeLocal: 'Two on the same screen',
    modePuzzle: 'Puzzle',
    modeLesson: 'Lesson',
    modeTournament: 'Tournament',
    modeCorrespondence: 'Correspondence',
    paceRapid: 'Rapid',
    paceClassical: 'Classical',
    days7: '7 d',
    days30: '30 d',
    days90: '90 d',
    days365: '1 yr',
    statsFailed: 'Cannot compute',
    statsFailedHint: 'The database did not answer. The other tabs remain usable.',
    activity: 'Activity',
    activityHint:
      'Each point is one day, Paris time. A day with nothing counts as zero, not as a gap.',
    games: 'Games',
    puzzles: 'Puzzles',
    signups: 'Sign-ups',
    perDayAverage: '{n} a day on average',
    puzzlesTried: 'Puzzles attempted',
    solvedFirstTry: '{part} solved first try',
    accountsCreated: '{n} accounts created over the period',
    medianPerPuzzle: 'Median time per puzzle',
    distinctPlayers: '{n} distinct players',
    overPeriod: 'Over the chosen period.',
    gameModes: 'Game modes',
    paces: 'Time controls',
    pacesHint: 'A rated time control counts towards the Glicko rating; a casual one does not.',
    rated: 'rated',
    casual: 'casual',
    endings: 'How games ended',
    endingsHint: '“In progress” also counts games abandoned mid-way and never resumed.',
    openings: 'Most played openings',
    openingsHint:
      'Over the whole history of the site: an opening repertoire is not judged on one month.',
    hours: 'Playing hours',
    hoursHint:
      'Games started, by local hour. That is the hour when you should avoid restarting the server.',
    statusPlaying: 'In progress',
    statusCheckmate: 'Checkmate',
    statusResign: 'Resignation',
    statusTimeout: 'Time out',
    statusDraw: 'Draw agreed',
    statusStalemate: 'Stalemate',
    statusRepetition: 'Repetition',
    statusFiftyMoves: 'Fifty-move rule',
    statusInsufficient: 'Insufficient material',
    statusAborted: 'Aborted',
    retention: 'What becomes of new accounts',
    retentionHint:
      'Computed on accounts created during the period only: a rate measured over the whole history would never move again.',
    playedOnce: 'Played at least one game',
    outOfSignups: '{n} out of {total} sign-ups',
    cameBack: 'Came back at least a day later',
    cameBackNote: '{n} accounts seen again the next day or later',
    leftAddress: 'Left an address',
    leftAddressNote: '{n} confirmed — the others will not be able to recover their password',
    lessonsDone: 'Lessons completed',
    lessonsDoneNote: '{n} started by {joueurs} players',
    levels: 'Rating distribution',
    levelsHint:
      'In hundred-point bands, all time controls together, accounts with at least one rated game.',
    noRatedGame: 'No rated game yet.',
    topPlayers: 'Most active players',
    topPlayersHint:
      'The accounts that played the most over the period. A game counts for both its players.',
    noGameInPeriod: 'No game over the period.',
    seenOn: 'seen on {date}',
    filterAll: 'All',
    filterOnline: 'Online',
    filterAdmins: 'Administrators',
    filterDisabled: 'Disabled',
    filterNeverPlayed: 'Never played',
    filterNoAddress: 'No confirmed address',
    sortLastSeen: 'last visit',
    sortSignup: 'sign-up',
    sortUsername: 'username',
    actionImpossible: 'Action impossible.',
    search: 'Search',
    searchPlaceholder: 'username or address',
    reload: 'Reload',
    sortBy: 'sort by',
    descending: 'Descending',
    ascending: 'Ascending',
    noAccount: 'No account',
    noResultForFilter: 'No result for this filter.',
    accountsKept: '{n} accounts kept',
    accountKept: '{n} account kept',
    outOfTotal: 'out of {n}',
    previous: 'Previous',
    nextOnes: 'Next',
    pageOf: 'page {page} of {total}',
    onlineNow: 'online right now',
    seenAt: 'seen at {heure}',
    admin: 'admin',
    disabled: 'disabled',
    you: 'you',
    online: 'online',
    confirmed: 'confirmed',
    unconfirmed: 'not confirmed',
    noAddress: 'no address',
    gamesCount: '{n} games',
    gameCount: '{n} game',
    bestRating: 'best rating {n}',
    signedUpOn: 'signed up on {date}',
    devicesOpen: '{n} devices open',
    deviceOpen: '{n} device open',
    reactivate: 'Reactivate',
    deactivate: 'Deactivate',
    demote: 'Demote',
    promote: 'Promote',
    password: 'Password',
    anonymise: 'Anonymise',
    passwordBlurb:
      'Choose a temporary password and pass it on to the person. All their sessions close. This is the emergency door when mail is not configured.',
    passwordPlaceholder: '8 characters minimum',
    apply: 'Apply',
    anonymiseWarning:
      'The username, address and password are erased with no way back. The games remain — they belong to the opponents too, and removing them would dig holes in their history.',
    anonymisePlaceholder: 'type “{pseudo}” to confirm',
    purgeSessions: 'Expired sessions',
    purgeSessionsHint: 'Rows nobody reads any more. No visible effect.',
    purgeEvaluations: 'Evaluations too shallow',
    purgeEvaluationsHint:
      'Under 14 plies: the analysis asks for 18, so these entries take up space without ever saving a computation. The engine will redo the work if needed.',
    purgeEmpty: 'Empty, inactive accounts',
    purgeEmptyHint: 'No game, no analysis, not seen for six months. Administrators are spared.',
    purgeImpossible: 'Purge impossible.',
    linesRemoved: '{n} row(s) removed',
    accounts: 'Accounts',
    thisWeek: '+{n} this week',
    sinceYesterday: '+{n} since yesterday',
    onlineMeasure: 'Online',
    onlineNote: '{vus} seen in the last 24 h · {sessions} sessions open',
    analysesKept: 'Analyses kept',
    puzzlesInStock: '{n} puzzles in stock',
    services: 'Services',
    database: 'Database',
    analysisEngine: 'Analysis engine',
    engineAnswers: 'answers the diagnostic',
    engineDown: 'unreachable — analyses fall back to the browser',
    outgoingMail: 'Outgoing mail',
    senderUnset: 'sender not specified',
    mailUnset: 'SMTP_URL missing — password recovery is hidden',
    housekeeping: 'Housekeeping',
    housekeepingHint: 'None of these touches a game, an active account or a kept analysis.',
    purge: 'Purge',
    adminAccess: 'Administrator access',
    adminNamesSet:
      'designates {pseudos}. These accounts stay administrators whatever happens in the database — that is what stops you locking yourself out after restoring a backup.',
    adminNamesUnset:
      'is not set: your rights come from the database alone. If a restore brings back a dump from before your promotion, nobody will be able to open this page.',
    rereadState: 'Reread the state',
    sizeUnknown: 'size unknown',
    sizeTotal: '{taille} in total',
    sizeWithTables: '{taille} in total, of which {tables} of tables ({part} %)',
    ok: 'ok',
    missing: 'missing',
    toolsTracked: 'Tools tracked',
    toolsTrackedNote: 'engines, data, assets, libraries',
    libraries: 'Libraries',
    librariesNote: 'runtime dependencies',
    toFix: 'To fix',
    toFixNone: 'catalogue and repository agree',
    toFixSome: 'detail below',
    updates: 'Updates',
    updatesFound: 'more recent versions published',
    updatesNotSought: 'not looked for yet',
    toFixHint: 'The same check runs in `npm test`: these gaps make the build fail.',
    uncredited: '{n} uncredited package(s)',
    uncreditedHint:
      'Declared in a package.json, absent from the catalogue. Their licence may require attribution.',
    orphans: '{n} orphan credit(s)',
    orphansHint: 'The catalogue cites a package that no workspace declares any more.',
    drifted: '{n} version(s) that drifted',
    driftedHint: 'The version shown is no longer found in the file that has authority.',
    notFoundIn: 'not found in {fichier}',
    unreadableHere: '{fichier} unreadable here',
    workspacesUnreadable:
      '{espaces} could not be read from this server — the production image does not carry every manifest. The test check, for its part, sees the whole repository.',
    workspacesUnreadablePlural:
      '{espaces} could not be read from this server — the production image does not carry every manifest. The test check, for its part, sees the whole repository.',
    undecidable:
      'Without that manifest, {credits} could not be traced to a workspace: the catalogue is not at fault, and the test check will settle it.',
    seekUpdates: 'Look for updates',
    outboundNote:
      'Queries the npm registry and GitHub from the server. Nothing other than public package names leaves this machine.',
    publishedByAuthor: 'Version published by the author',
    latestPublished: 'Latest published version',
    upToDate: 'up to date',
    licenceDiverges: 'The package declares “{licence}” — the catalogue says otherwise.',
    recentGames: 'Latest games',
    recentGamesHint: 'A rated game cannot be erased: it moved its opponent’s rating.',
    noGame: 'No game',
    white: 'White',
    black: 'Black',
    halfMoves: '{n} plies',
    openGameInNewTab: 'Open the game in another tab',
    ratedNotDeletable: 'Rated game: not deletable',
    deleteGame: 'Delete this game',
    deleteImpossible: 'Deletion impossible.',
    deleted: 'Deleted.',
    recentAnalyses: 'Latest analyses',
    recentAnalysesHint: 'The analyses kept by players. Deleting does not erase the original game.',
    noAnalysisKept: 'No analysis kept',
    belongsTo: 'to {pseudo}',
    noOwner: 'no owner',
    deleteAnalysis: 'Delete this analysis',
    actDeactivate: 'deactivated',
    actReactivate: 'reactivated',
    actPromote: 'promoted to administrator',
    actDemote: 'demoted',
    actPassword: 'changed the password of',
    actAnonymise: 'anonymised',
    actDeleteGame: 'deleted the game',
    actDeleteAnalysis: 'deleted the analysis',
    actPurge: 'purged',
    filterLabelDeactivate: 'deactivated',
    filterLabelReactivate: 'reactivated',
    filterLabelPromote: 'promoted to administrator',
    filterLabelDemote: 'demoted',
    filterLabelPassword: 'changed the password of',
    filterLabelAnonymise: 'anonymised',
    filterLabelDeleteGame: 'deleted the game',
    filterLabelDeleteAnalysis: 'deleted the analysis',
    filterLabelPurge: 'purged',
    filterTitle: 'Filter',
    filterHint:
      'The log cannot be erased from this page: a trace you can remove in one click is worth nothing as a trace.',
    allActs: 'all acts',
    allAuthors: 'all authors',
    emptyLog: 'Nothing in the log',
    emptyLogHint: 'No administration act has been recorded yet — or none matches this filter.',
    seeFurtherBack: 'See further back',
    noReturn: 'no way back',
    rights: 'rights',
    becameRole: 'became {role}',
    wasAdmin: 'was an administrator',
    wasDisabled: 'was already disabled',
    curveLabel: 'Change over {n} days of: {series}',
    overThePeriod: 'over the period',
    nothingThisPeriod: 'Nothing to show over this period.',
  },
  parts: {
    avatarChess: 'Chess',
    avatarChessHint: 'The pieces of the game, to stay in keeping.',
    avatarAnimals: 'Animals',
    avatarAnimalsHint: 'The most recognisable when small.',
    avatarCreatures: 'Creatures',
    avatarCreaturesHint: 'For those who prefer the imaginary.',
    avatarNature: 'Nature',
    avatarNatureHint: 'Plain, legible, asserting nothing.',
    avatarObjects: 'Objects',
    avatarObjectsHint: 'A little character without a mascot.',
    checkmate: 'Checkmate',
    gains: 'Gains {n} points',
    gainsOne: 'Gains {n} point',
    loses: 'Loses {n} points',
    losesOne: 'Loses {n} point',
    evenTrade: 'Even trade',
    safeSquare: 'Safe square',
    withCheck: ' · check',
    defaultVoice: 'default voice',
    systemDefaultVoice: 'system default voice',
    neuralDown: 'The neural voice server is not answering.',
    engineSlow: 'The engine is taking too long to start.',
    engineStopped: 'Engine stopped',
    engineNotStarted: 'Engine not started',
    analysisCancelled: 'Analysis cancelled',
    positionRejected: 'Invalid position: the engine cannot analyse it.',
    iaUnreadable: 'Unreadable answer from the provider.',
    iaNoStream: 'The provider returned no stream.',
    loading3d: 'Loading 3D…',
    iaModelUnavailable: 'This model is not available for your key. Pick another from the list.',
    iaKeyRefused: 'Your key was refused. Check it in the settings.',
    iaOutOfCredit: 'Your credit is exhausted with this provider.',
    iaNoSuchModel: 'This model does not exist with this provider. Pick another.',
    iaTooMany: 'Too many requests in a row. Let a few seconds pass.',
    iaUnreachable:
      'Service unreachable. If it runs on your machine, allow it to answer web pages (the OLLAMA_ORIGINS variable for Ollama).',
    iaTimeout: 'The provider took too long to answer.',
    iaPickModel: 'Pick a model first.',
    iaEnterKey: 'Enter your key first.',
    iaServerError: 'The provider is struggling (error {code}). Try again in a moment.',
    iaNoProvider: 'No provider configured.',
  },
  common: {
    moveNumber: 'Move {n}',
    moveNumberLower: 'move {n}',
    by: 'by {nom}',
    to: 'to {adresse}',
    assistant: 'Assistant',
    evaluation: 'Evaluation: {valeur}',
    ultraBullet: 'UltraBullet',
    minutes: '{n} min',
    minutesPlusSeconds: '{min} min + {s} s',
    seconds: '{n} s',
    gamesShort: '{n} g.',
    white: 'White',
    black: 'Black',
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    correspondence: 'Correspondence',
    puzzle: 'Puzzles',
    versus: 'vs {nom}',
    loading: 'Loading…',
    error: 'Error',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    save: 'Save',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    copy: 'Copy',
    copied: 'Copied!',
    share: 'Share',
    yes: 'Yes',
    no: 'No',
    of: 'of',
    you: 'You',
    computer: 'Computer',
    guest: 'Guest',
    anonymous: 'Anonymous',
  },
}
