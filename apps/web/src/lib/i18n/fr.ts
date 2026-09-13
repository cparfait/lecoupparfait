/**
 * Le dictionnaire français, la langue de référence.
 *
 * C'est lui qui **définit le type** : `Dictionary` vaut `typeof fr`, si bien
 * qu'une clé ajoutée ici et oubliée dans `en.ts` est une erreur de compilation
 * et non un texte manquant découvert par un lecteur.
 *
 * Séparé de l'anglais depuis que le fichier unique dépassait sept cent
 * soixante lignes : on ne trouvait plus une clé sans faire défiler la moitié
 * de l'autre langue.
 */

export const fr = {
  app: {
    name: 'Le Coup Parfait',
    tagline: 'Trouve-le. À chaque fois.',
    description:
      'La plateforme d’échecs libre : leçons guidées à la voix, analyse expliquée coup par coup, parties contre l’ordinateur ou entre amis. Gratuite, sans publicité, sans compte obligatoire.',
  },

  nav: {
    home: 'Accueil',
    play: 'Jouer',
    career: 'Carrière',
    careerHint: 'Douze chapitres, du premier coup à la première victoire nette',
    learn: 'Apprendre',
    puzzles: 'Puzzles',
    openings: 'Ouvertures',
    endgames: 'Finales',
    analysis: 'Analyse',
    vision: 'Vision',
    glossary: 'Glossaire',
    glossaryIntro:
      '{n} termes définis en langage clair — les règles, le matériel, les phases de la partie, et les motifs que le coach sait reconnaître et nommer dans tes parties. {illustres} d’entre eux se montrent sur un échiquier : leur nom porte une pastille. Le haut-parleur, à droite de chaque mot, lit la définition à voix haute.',
    famRegles: 'Règles',
    famPieces: 'Pièces et matériel',
    famPhases: 'Phases de la partie',
    famEvaluation: 'Évaluation et jeu',
    famMotifs: 'Motifs tactiques',
    leaderboard: 'Classement',
    friends: 'Amis',
    editor: 'Éditeur',
    studies: 'Études',
    profile: 'Profil',
    settings: 'Préférences',
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
    signOut: 'Se déconnecter',
    menu: 'Menu',
    search: 'Rechercher',

    // Sections du menu principal. « Jouer », « Apprendre » et « Analyse »
    // servent à la fois de titre de section et d'entrée, d'où leur absence ici.
    train: 'S’entraîner',
    community: 'Communauté',
    tools: 'Outils',
    more: 'Plus',
    moreHint: 'Communauté, outils, compte et réglages',
    account: 'Compte',
    about: 'À propos',
    credits: 'Crédits & licences',
    admin: 'Administration',

    // Entrées de section.
    vsComputer: 'Contre l’ordinateur',
    vsFriend: 'Contre quelqu’un',
    localGame: 'À deux sur cet écran',
    correspondence: 'Mes correspondances',
    tournaments: 'Tournois',
    watch: 'Regarder une partie',
    lessons: 'Leçons guidées',
    palier: 'Ton palier',
    principes: 'Principes et mémo',
    seance: 'Séance pédagogique',
    puzzleRush: 'Puzzle rush',
    dailyChallenge: 'Défi du jour',
    analyseGame: 'Analyser une partie',
    stats: 'Statistiques',
    myProfile: 'Mon profil',
    clock: 'Pendule',
    eloCalculator: 'Calculateur Elo',
    draw: 'Tirage au sort',
    arbiter: 'Aide-mémoire d’arbitrage',

    // Repères affichés sous les entrées, dans les panneaux déroulants.
    vsComputerHint: '25 niveaux, 7 personnalités',
    vsFriendHint: 'un lien, ou plusieurs jours par coup',
    localGameHint: 'à deux, sur le même appareil',
    clockHint: 'la pendule de ta partie sur échiquier réel',
    eloCalculatorHint: 'ce qu’un tournoi te rapporte ou te coûte',
    drawHint: 'couleurs, paires, ordre de passage',
    arbiterHint: 'les règles qu’on se dispute, en une page',
    correspondenceHint: 'les parties où c’est ton tour',
    watchHint: 'les parties en cours',
    tournamentsHint: 'une arène, on arrive et on repart quand on veut',
    leaderboardHint: 'qui joue ici, et à quel niveau',
    friendsHint: 'ton carnet, les défis reçus',
    statsHint: 'ce que tes parties disent de ton jeu',
    lessonsHint: '48 leçons, de zéro au répertoire',
    palierHint: 'ce qui te coûte des points à ton niveau',
    principesHint: 'le mémo d’avant chaque coup, et les principes',
    seanceHint: 'un thème annoncé, un adversaire à ton niveau',
    openingsHint: '3 810 ouvertures nommées',
    endgamesHint: '3 568 positions classées',
    visionHint: 'reconnaître les cases à vue',
    glossaryHint: 'le vocabulaire, expliqué',
    puzzlesHint: 'tactique, à ton niveau',
    puzzleRushHint: 'le plus possible, en temps limité',
    dailyChallengeHint: 'la même position pour tous',
    analyseGameHint: 'coup par coup, avec les raisons',
    studiesHint: 'tes positions annotées',
    editorHint: 'composer une position',
  },

  home: {
    heroTitle: 'Les échecs, enfin expliqués.',
    heroSubtitle:
      'Un moteur qui ne se contente pas de dire quel coup jouer, mais **pourquoi**. Une voix qui t’accompagne. Et zéro euro, pour toujours.',
    ctaPlay: 'Jouer maintenant',
    ctaLearn: 'Commencer à apprendre',
    ctaGuest: 'Sans inscription',
    features: {
      coachTitle: 'Un coach qui parle',
      coachBody:
        'Chaque coup est commenté à voix haute, en français. Le clouage, la fourchette, le mat du couloir : tu les entends nommer au moment où ils apparaissent sur ton échiquier.',
      analysisTitle: 'Analyse expliquée',
      analysisBody:
        'Stockfish 18 tourne sur le serveur en pleine puissance. Chaque erreur est classée, le meilleur coup est montré, et surtout : la raison est écrite en toutes lettres.',
      levelsTitle: '25 niveaux, 7 caractères',
      levelsBody:
        'De 100 à 3200 Elo. Des adversaires qui ont un style — l’un fonce, l’autre étouffe, un troisième sacrifie tout. Choisis ton sparring-partner.',
      dataTitle: 'Des millions de positions',
      dataBody:
        '3 810 ouvertures nommées, six millions de puzzles notés et étiquetés, les finales parfaites jusqu’à sept pièces. Tout est libre de droits.',
      friendsTitle: 'Tes amis, en un lien',
      friendsBody:
        'Crée une partie, partage l’adresse, jouez. Pas d’inscription pour l’invité, pas de publicité, pas de limite.',
      freeTitle: '100 % gratuit, 100 % libre',
      freeBody:
        'Aucune fonctionnalité payante, aucun traqueur, aucune donnée revendue. Le code est sous licence AGPL : héberge-le toi-même si tu veux.',
    },
    badge: '100 % gratuit · code libre · sans publicité',
    heroTitleTop: 'Les échecs,',
    heroTitleBottom: 'enfin expliqués.',
    noSignup: 'Aucune inscription nécessaire pour jouer ou apprendre.',
    accountBefore: 'Un compte —',
    accountLink: 'gratuit, un pseudo et un mot de passe',
    accountAfter:
      '— ajoute le défi du jour, ta série, ton classement par cadence et l’historique de tes parties.',
    demoCaption: 'Le coach commente · Anderssen – Kieseritzky, Londres 1851',
    goFurther: 'Aller plus loin',

    statsGames: 'parties jouées',
    statsPuzzles: 'puzzles disponibles',
    statsOpenings: 'ouvertures répertoriées',
  },

  opponent: {
    notFound: 'Adversaire introuvable',
    metaTitle: '{nom} — adversaire artificiel',
    all: 'Tous les adversaires',
    galleryIntro:
      'Sept caractères, répartis sur les vingt-cinq niveaux. Leur style n’est pas un habillage : chacun évalue les coups avec une préférence propre, et sa fiche montre les nombres qui la produisent — avec ce qu’il faut faire pour le battre.',
    whereYouMeet: 'Où tu le rencontres',
    atLevel: 'Au niveau',
    atLevels: 'Aux niveaux',
    ofTwentyFive: 'des vingt-cinq, soit de',
    to: 'à',
    playAgainst: 'Jouer contre {nom}',
    character: 'Son caractère',
    characterHint:
      'Ce que son évaluation ajoute — ou retire — à un coup, en centièmes de pion. Ce n’est pas une étiquette : c’est le nombre qui le fait jouer comme il joue.',
    noBias:
      'Aucun biais, sur aucun axe. C’est le seul de la série dans ce cas, et c’est ce qui le rend si désagréable.',
    howToBeat: 'Comment le battre',
  },

  credits: {
    title: 'Crédits & licences',
    intro:
      'Le Coup Parfait n’aurait pas pu exister sans le travail libre d’autres personnes. Tout ce qui suit est réutilisé dans le respect de sa licence — et cette page en fait partie : plusieurs de ces licences exigent explicitement l’attribution.',
    licenceTitle: 'La licence du Coup Parfait',
    licenceBefore: 'Le Coup Parfait est publié sous licence',
    licenceStrong: 'GNU Affero General Public License v3 ou ultérieure',
    licenceAfter:
      '. Ce choix n’est pas arbitraire : Stockfish est sous GPL, et toute œuvre qui l’intègre doit adopter une licence compatible. L’AGPL ajoute une clause décisive pour un service en ligne — quiconque héberge une version modifiée doit en publier le code source.',
    licenceConcretely:
      'Concrètement : tu peux l’utiliser, le modifier, l’héberger pour tes amis, le redistribuer. La seule obligation est de laisser les suivants faire pareil.',
    nonCommercialBefore: 'Les jeux de pièces publiés sous licence',
    nonCommercialAfter:
      '(usage non commercial) ont été délibérément écartés du projet, aussi beaux soient-ils : leur clause rendrait la redistribution libre impossible.',
    moreAboutProject: 'En savoir plus sur le projet',
    by: 'par {auteur}',
    librariesCount: 'Les {n} bibliothèques embarquées dans l’application.',
  },

  play: {
    title: 'Jouer',
    career: 'Le mode carrière',
    careerBlurb: 'Douze chapitres, du premier coup à la première victoire nette.',
    seance: 'Séance pédagogique',
    seanceBlurb:
      'Un thème annoncé avant de commencer, un adversaire à ton niveau, et un bilan qui dit où ce thème est apparu.',
    vsComputer: 'Contre l’ordinateur',
    vsComputerBlurb: 'Des adversaires calibrés, du tout premier coup au grand maître.',
    vsFriend: 'Contre quelqu’un',
    vsFriendBlurb: 'De quinze secondes à quatorze jours par coup. Un lien, ou un ami.',
    localGame: 'Sur le même écran',
    localBlurb: 'Deux joueurs, un seul appareil.',
    watchGame: 'Regarder une partie',
    watchBlurb: 'Suis en direct les parties commencées par d’autres, coup par coup.',
    correspondence: 'Par correspondance',
    correspondenceBlurb:
      'Un coup quand tu peux, sur des jours. Personne n’attend devant son écran.',
    arena: 'Arène',
    arenaBlurb:
      'Un tournoi où l’on arrive et repart quand on veut, réapparié à chaque fin de partie.',
    lobbyIntro:
      'Contre la machine pour t’entraîner à ton rythme, contre un ami pour le plaisir, ou à deux sur le même écran.',
    vsComputerDetail: '25 niveaux · 7 personnalités · de 100 à 3200 Elo',
    seanceDetail: '10 thèmes · adversaire calibré sur ton palier · mode commenté',
    vsFriendDetail: 'De 15 secondes à 14 jours par coup · un lien, ou un ami',
    correspondenceDetail: 'Un coup quand tu peux · de 1 à 14 jours par coup',
    localDetail: 'L’échiquier se retourne à chaque coup si tu le souhaites',
    arenaDetail: 'On arrive quand on veut, on repart quand on veut',
    watchDetail: 'Les parties commencées, suivies coup par coup',
    careerDetail: '12 chapitres · une leçon, des puzzles et un duel par chapitre',
    opponentsTitle: 'Tes adversaires artificiels',
    opponentsHint:
      'Chacun a un style de jeu réellement différent : leur façon de choisir un coup est biaisée en faveur de ce qu’ils aiment.',
    allPortraits: 'Tous les portraits',

    quickPairing: 'Partie rapide',
    level: 'Niveau',
    difficulty: 'Difficulté',
    playAs: 'Jouer avec',
    white: 'les Blancs',
    black: 'les Noirs',
    random: 'au hasard',
    timeControl: 'Cadence',
    rated: 'Partie classée',
    casual: 'Partie amicale',
    start: 'Commencer la partie',
    createLink: 'Créer le lien de partie',
    linkCopied: 'Lien copié',
    waitingOpponent: 'En attente de ton adversaire…',
    shareThisLink: 'Envoie ce lien à ton ami :',
  },

  computer: {
    back: 'Retour au choix du mode',
    intro: '{n} niveaux, {p} personnalités. Choisis un adversaire un peu au-dessus de toi.',
    badFen: 'Cette position n’est pas jouable.',
    badFenHint:
      'Il manque peut-être un roi, ou un camp est déjà en échec. La partie commence normalement.',
    resume: 'Tu as une partie en cours',
    resumeDetail:
      'Contre {moteur}, niveau {niveau} · avec les {couleur} · {coups} demi-coups joués, {depuis}.',
    forget: 'Oublier',
    step1: 'Qui affrontes-tu ?',
    opponentGroup: 'Adversaire',
    scaleLow: '1 · débutant complet (100)',
    scaleHigh: '25 · surhumain (3200)',
    presetBeginner: 'Je débute',
    presetCasual: 'Occasionnel',
    presetClub: 'Club',
    presetStrong: 'Fort',
    presetRuthless: 'Sans pitié',
    noneBeaten:
      'Aucun niveau battu pour l’instant. Commence par le premier — il apprend en même temps que toi.',
    bestBeaten: 'Plus haut niveau battu :',
    winsOf: '{victoires} victoires sur {parties} parties.',
    oneWinOf: '{victoires} victoire sur {parties} parties.',
    nextToBeat: 'Affronter le niveau {niveau}, le prochain à battre',
    playStyle: 'Style de jeu',
    styleHuman: 'Humain (Maia)',
    styleHumanHint: 'Réseau entraîné sur des millions de parties réelles',
    styleEngine: 'Moteur (Stockfish)',
    styleEngineHint: 'Le plus fort du monde, bridé au niveau voulu',
    styleHumanNote: 'Maia se trompe comme on se trompe vraiment à ce niveau.',
    styleEngineNote: 'Stockfish joue juste, puis lâche un coup faible d’un coup.',
    styleOutOfRange:
      'Maia a appris sur des parties humaines de {min} à {max} Elo et ne sait rien jouer en dehors : au niveau {niveau}, c’est Stockfish qui joue. Pour affronter Maia, choisis un niveau entre {premier} et {dernier}.',
    step2: 'Ta couleur et la cadence',
    yourColour: 'Ta couleur',
    colour: 'Couleur',
    whiteStarts: 'Les Blancs commencent. Pour apprendre, alterne.',
    randomColour: 'Couleur au hasard',
    timeControlExample: '« 5 | 3 » : cinq minutes au départ, trois secondes gagnées à chaque coup.',
    step3: 'Pendant la partie',
    ratedNeedsAccount: 'Demande un compte : c’est lui qui porte le classement.',
    ratedHint:
      'Le résultat met à jour ton classement dans cette cadence. En échange, pas d’annulation, pas d’indice, pas de commentaires.',
    commentaryEach: 'Commenter chaque coup',
    commentaryRated: 'Indisponible en partie classée : le commentaire montre le meilleur coup.',
    commentaryHint:
      'Ce que vaut ton coup, les meilleures options et leur raison, lus à voix haute. Recommandé pour débuter.',
    commentaryOpponent: 'Commenter aussi l’adversaire',
    commentaryOpponentHint:
      'Deux fois plus de commentaires. Pour décortiquer une partie plutôt que la jouer.',
    summaryRated: 'partie classée',
    summaryCoach: 'coach activé',
    summaryPlain: 'sans commentaire',
    engineLoading: 'Chargement du moteur…',
    thinking: 'réfléchit…',
    engineLevel: '{moteur} · niveau {niveau}',
    backToGame: 'Retour à la partie',
    continuePlays: 'Continuer — {adversaire} joue',
    gameOptions: 'Options de la partie',
    yourMove: 'Ton coup',
    advisedMove: 'Coup conseillé (n°{rang})',
    evaluation: 'Évaluation : {score}.',
    expectedLine: 'Suite prévue : {coups}.',
    engineTop: 'Le moteur le place en tête à cette profondeur.',
    hintFailed: 'Impossible de calculer un indice pour le moment.',
    hintTitle: 'Demander le meilleur coup au moteur',
    undoTitle: 'Annule ton dernier coup et la réponse de l’ordinateur',
    undoAria: 'Annuler ton dernier coup',
    backToChapter: 'Retour au chapitre {n}',
    backToTournament: 'Retour au tournoi',
    otherSession: 'Autre séance',
    usedHint:
      'tu as demandé un indice au moteur. Ni classement, ni carrière, ni quête du jour — et rien n’est retiré à personne non plus.',
    usedTakeback:
      'tu as repris un coup. Ni classement, ni carrière, ni quête du jour — et rien n’est retiré à personne non plus.',

    // ── Pourquoi une partie annoncée classée ne l'est pas ────────────────
    // Le serveur rend un code, ces phrases le disent. Elles se lisent à la
    // suite de « Partie non classée : », d'où la minuscule initiale.
    ratedAnnounceFailed: 'cette partie ne sera pas classée',
    ratedAnnounceFailedHint:
      'Le serveur n’a pas pu enregistrer l’annonce. Reviens en arrière et relance la partie pour qu’elle compte.',
    unratedNoOpponent: 'l’adversaire n’a pas de classement annoncé.',
    unratedUnverifiable:
      'une victoire au temps ou par abandon de l’ordinateur ne se lit pas sur l’échiquier : rien ne permet de la vérifier.',
    unratedSetupPosition: 'la partie ne commençait pas à la position initiale.',
    unratedNotAnnounced:
      'elle n’avait pas été annoncée avant de commencer. Relance-la depuis l’écran de réglages.',
    unratedMismatch:
      'elle ne correspond pas à ce qui avait été annoncé — niveau, cadence ou couleur ont changé en route.',
    unratedTooFast: 'elle s’est déroulée trop vite pour avoir été jouée.',
    unratedTooShort: 'elle fait moins de dix demi-coups.',
    unratedTooSoon: 'une seule partie classée par minute.',
    unratedUnavailable:
      'le classement était indisponible. La partie est archivée, elle ne compte pas.',
    unratedUnknown: 'le serveur ne l’a pas comptée.',
  },

  live: {
    connecting: 'Connexion à la partie…',
    gameLabel: 'Partie {slug}',
    serverDown: 'Serveur de parties injoignable',
    serverDownHint:
      'Le service temps réel ne répond pas. Vérifie qu’il est démarré, ou joue contre l’ordinateur en attendant — cela fonctionne entièrement dans ton navigateur.',
    reconnecting:
      'Connexion perdue — reconnexion en cours. Ta place est gardée : tu ne perds la partie que si ton adversaire attend, et pas avant la moitié de la cadence.',
    waitingPlayer: 'En attente…',
    disconnected: 'déconnecté',
    reviewOver: 'Tu revois un coup passé. La partie est terminée, rien ne presse.',
    reviewLive: 'Tu revois un coup passé. La pendule, elle, continue.',
    backToLive: 'Revenir au direct',
    hintFailed: 'Impossible de calculer un indice pour le moment.',
    hintAlreadyTold: 'Ton adversaire a déjà été prévenu. Demander un autre indice.',
    hintWillTell: 'Demander le meilleur coup au moteur. Ton adversaire en sera informé.',
    hintAria: 'Demander un indice',
    resignConfirm: 'Abandonner la partie ?',
    resignAria: 'Abandonner la partie',
    drawOffered: 'Ton adversaire propose la nulle.',
    drawOfferedHint: 'Accepte ou refuse ci-dessous.',
    chat: 'Tchat',
    chatDialog: 'Tchat de la partie',
    chatClose: 'Fermer le tchat',
    chatEmpty: 'Dis bonjour à ton adversaire.',
    chatPlaceholder: 'Message…',
    chatAria: 'Message de tchat',
    chatSend: 'Envoyer',
    waitingOpponent: 'En attente de ton adversaire…',
    waitingOpponentHint: 'Partage l’adresse de cette page. La partie démarrera dès qu’il arrivera.',
    copyLink: 'Copier le lien',
  },

  friendGame: {
    title: 'Jouer contre quelqu’un',
    introLive: 'Choisis une cadence, puis envoie un lien ou défie quelqu’un de ton carnet.',
    introDays:
      'Un coup tous les {jours} jours. Il faut un compte des deux côtés — la partie doit pouvoir t’attendre.',
    introOneDay:
      'Un coup par jour. Il faut un compte des deux côtés — la partie doit pouvoir t’attendre.',
    timeControl: 'Cadence',
    timeControlHint:
      '« 3 | 2 » se lit : 3 minutes au départ, et 2 secondes ajoutées à ta pendule à chaque coup que tu joues.',
    orOverDays: 'Ou sur plusieurs jours',
    daysShort: 'corresp.',
    dayUnit: '{n} j',
    sendLink: 'Envoyer un lien de partie',
    sendLinkDetail:
      'Une partie avec n’importe qui. Ton adversaire n’a besoin d’aucun compte : il clique, il joue.',
    sendLinkImpossible: 'Sur plusieurs jours, il faut désigner quelqu’un du carnet.',
    inviteSomeone: 'Inviter quelqu’un à te rejoindre',
    inviteSomeoneDetail:
      'Envoie ton lien de parrainage : il s’inscrit, et vous êtes amis sans rien de plus à faire.',
    signInToChallenge: 'Se connecter pour défier un ami',
    signInToChallengeDetail:
      'Sans compte, la partie par lien fonctionne très bien — mais il n’y a pas de carnet où ranger quelqu’un.',
    yourFriends: 'Tes amis',
    nobodyYet: 'personne pour l’instant',
    manageBook: 'Gérer le carnet',
    emptyBookBefore: 'Ton carnet est vide. Envoie le lien d’invitation ci-dessus, ou',
    emptyBookLink: 'cherche quelqu’un par son pseudo',
    emptyBookAfter: 's’il est déjà inscrit.',
    online: 'en ligne',
    offline: 'hors ligne',
    challenge: 'Défier',
    yourColour: 'Ta couleur',
    colourRandom: '🎲 Hasard',
    colourWhite: '♔ Blancs',
    colourBlack: '♚ Noirs',
    colourNote:
      'Ton adversaire prendra l’autre couleur. Une fois la partie ouverte, elle est fixée.',
    guestName: 'Ton pseudo (facultatif)',
    guestNameHint: 'Sert uniquement à ce que ton adversaire sache qui il affronte.',
    ratedLabel: 'Partie classée',
    ratedHint:
      'Le classement des deux joueurs sera mis à jour. Nécessite que vous ayez tous les deux un compte.',
    noAccountBefore:
      'Tu joues sans compte : la partie fonctionnera, mais elle ne sera ni classée ni retrouvable ensuite.',
    noAccountLink: 'Se connecter ou créer un compte',
    noAccountAfter: '— un pseudo, un mot de passe, c’est tout.',
    categoryNote:
      'La catégorie se déduit de la durée qu’aurait une partie de quarante coups : moins de trois minutes c’est du bullet, moins de huit du blitz, moins de vingt-cinq du rapide, au-delà du classique. Chacune tient son propre classement : on peut voir clair en rapide et s’effondrer en blitz.',
    ready: 'La partie est prête',
    readyHint: 'Envoie ce lien à ton adversaire. La partie commencera dès qu’il l’ouvrira.',
    enterGame: 'Entrer dans la partie',
    rated: 'Classée',
    casual: 'Amicale',
    shareTitle: 'Partie d’échecs sur Le Coup Parfait',
    shareText: 'Viens jouer une partie !',
    inviteTitle: 'Rejoins-moi sur Le Coup Parfait',
    inviteText: 'Viens jouer aux échecs avec moi.',
    linkCopied: 'Lien copié',
    linkCopiedHint: 'Envoie-le à ton adversaire.',
    inviteCopied: 'Lien d’invitation copié',
    copyFailed: 'Copie impossible',
    copyFailedHint: 'Sélectionne le lien et copie-le à la main.',
    challengeFailed: 'Défi impossible.',
    challengeSent: 'Défi envoyé à {pseudo}.',
    challengeSentHint: 'On attend sa réponse.',
    createFailed: 'Création impossible.',
    started: 'Partie lancée.',
    startedHint: 'Les couleurs ont été tirées au sort.',
    serverUnreachable: 'Le serveur est injoignable.',
  },

  board3d: {
    noWebgl:
      'Ce navigateur n’offre pas l’accélération graphique dont elle a besoin. La vue 2D joue exactement la même partie.',
    switchTo2d: 'Passer en 2D',
    contextLost:
      'Ton appareil a repris la mémoire graphique. La partie continue : rien n’est perdu.',
    backTo2d: 'Revenir en 2D',
  },

  vision: {
    intro:
      'Une case est annoncée, tu cliques dessus. Trente secondes. Tant qu’il faut réfléchir pour trouver « f6 », ce temps-là est pris sur le calcul — c’est le réflexe le plus rentable à installer quand on débute.',
    over: 'Manche terminée.',
    ready: 'Prêt ? La première case s’affichera ici.',
    time: 'Temps',
    found: 'Trouvées',
    record: 'Record',
    fromBlack: 'Voir depuis les Noirs',
    fromBlackHint:
      'Un exercice différent, et celui qui manque le plus : on connaît son côté par cœur, jamais l’autre.',
    noPenalty:
      'Une erreur ne coûte pas de temps : l’objectif est d’installer un réflexe, pas de se mettre la pression. Vise trente cases en trente secondes — à ce rythme, tu ne cherches plus, tu vois.',
  },

  next: {
    someoneWaits: 'Quelqu’un t’attend',
    yourTurnAgainst: 'C’est à toi de jouer contre {adversaire}',
    opponentOnline: 'Il est en ligne, devant l’échiquier.',
    opponentOffline: 'Il s’est déconnecté, mais la partie tient toujours.',
    playMyMove: 'Jouer mon coup',
    gamesWaiting: '{n} parties attendent ton coup',
    oneGameWaiting: 'Une partie attend ton coup',
    correspondenceDetail: 'En correspondance, on joue quand on veut — mais on joue.',
    goThere: 'Y aller',
    gameInProgress: 'Partie en cours',
    gameContinues: 'Ta partie contre {adversaire} continue',
    gameWaitsOpponent: 'Ta partie attend un adversaire',
    thinking: 'Il réfléchit. Ta place reste gardée.',
    nobodyOpened: 'Personne n’a encore ouvert ton lien.',
    backToBoard: 'Revenir à l’échiquier',
    gameLeftOpen: 'Partie en plan',
    computerLeftOpen: 'Ta partie contre l’ordinateur est restée ouverte',
    halfMovesPlayed: '{n} demi-coups joués. Elle t’attend telle quelle.',
    oneHalfMovePlayed: '{n} demi-coup joué. Elle t’attend telle quelle.',
    resume: 'Reprendre',
    dailyChallenge: 'Le défi du jour',
    onePositionOnly: 'Une position, et une seule, jusqu’à minuit',
    otherQuestsWait: '{n} autres quêtes attendent en dessous.',
    oneOtherQuestWaits: '{n} autre quête attend en dessous.',
    lastQuest: 'C’est ta dernière quête de la journée.',
    findTheMove: 'Chercher le coup',
    aDailyQuest: 'Une quête du jour',
    pointsOfDay: '{xp} / {total} points du jour.',
    questsLeft: ' Encore {n} quêtes avant minuit.',
    lastQuestBefore: ' Dernière quête avant minuit.',
    careerResumes: 'Ton parcours reprend là où tu l’as laissé.',
    nothingUrgent: 'Rien ne presse',
    allUpToDate: 'Tout est à jour',
    allUpToDateDetail: 'Le défi est résolu, aucune partie n’attend. Reste le plaisir de jouer.',
    playAGame: 'Jouer une partie',
  },

  local: {
    flipBoard: 'Retourner l’échiquier',
    undoLast: 'Annuler le dernier coup',
    gameOver: 'Partie terminée',
    boardTurning: 'Coup joué — l’échiquier pivote…',
    turnTo: 'Trait aux {couleur}',
    toMove: 'Au trait',
    autoFlip: 'Rotation automatique',
    autoFlipHint:
      'L’échiquier se retourne après chaque coup, pour que chaque joueur voie de son côté. Il marque une seconde d’arrêt avant de pivoter, le temps de voir le coup qui vient d’être joué. Pratique sur un téléphone posé entre vous.',
  },

  today: {
    done: 'Journée faite',
    yourQuests: 'Tes quêtes du jour',
    pointsAria: 'Points du jour',
  },

  myGames: {
    vsComputer: 'Contre l’ordinateur',
    local: 'À deux sur le même écran',
    vsSomeone: 'Contre quelqu’un',
    won: 'Gagnée',
    lost: 'Perdue',
    title: 'Tes parties',
    hint: 'Celles que tu as jouées ici. Un clic la charge ; il ne reste qu’à lancer l’analyse.',
    collapse: 'Réduire la liste',
  },

  moveReport: {
    title: 'Pertinence des coups',
    acplTitle: 'Perte moyenne par coup, en centipions : un pion en vaut cent.',
    hideDetail: 'Masquer le détail',
    showDetail: 'Voir le détail des coups',
  },

  guided2: {
    foundIt: 'Trouvé — c’était bien ce coup-là.',
    startPosition: 'La position de départ. Appuie sur « Suivant » pour commencer.',
    otherSide: 'Voir l’échiquier de l’autre côté',
    seeAnswer: 'Voir la réponse',
    endOfGame: 'Fin de la partie',
    skip: 'Passer',
    next: 'Suivant',
  },

  next2: {
    title: 'Et maintenant ?',
    andMistakes: ' et {n} fautes sérieuses.',
    andOneMistake: ' et {n} faute sérieuse.',
    noSeriousMistake: ' sans faute grave mais sans précision.',
    costliestPhase: 'C’est la phase qui t’a coûté le plus cher.',
    whereItRecurs: 'Les positions où ce motif revient',
    whatProgresses: 'Ce qui te fait progresser à ton niveau',
  },

  guided: {
    lostGround: 'Ici, tu as perdu du terrain. À toi de trouver mieux.',
    tryFirst: 'Joue le coup que tu aurais dû jouer, directement sur l’échiquier.',
    trySecond: 'Pas celui-là. Regarde ce que l’adversaire menace, et ce qui est en prise.',
    tryMore: 'Toujours pas — {n} essais. La réponse t’attend si tu préfères la voir.',
  },

  career2: {
    pointsSuffix: 'pts de carrière',
    rankProgress: 'Avancement dans le rang',
    lastRank: 'Dernier rang : il n’y a plus rien au-dessus.',
    oldScale:
      'Points enregistrés sous un barème antérieur, que le détail ci-dessus ne sait pas reconstituer.',
    dayPointsNote:
      'Les « points du jour » de la carte Aujourd’hui sont un autre compteur : ils comptent tes quêtes de la journée, sur {total}, et repartent de zéro à minuit.',
    seeCareerMap: 'Voir la carte de carrière',
  },

  moves: {
    start: 'Début',
    previous: 'Coup précédent',
    stopPlayback: 'Interrompre la lecture',
    playThrough: 'Dérouler la partie',
    playThroughLong: 'Dérouler la partie coup par coup',
    list: 'Liste des coups',
    empty: 'Les coups joués apparaîtront ici.',
    reviewGroup: 'Revoir les coups',
    firstMove: 'Premier coup (Début)',
    previousArrow: 'Coup précédent (flèche gauche)',
    nextArrow: 'Coup suivant (flèche droite)',
    lastMove: 'Dernier coup (Fin)',
  },

  gate: {
    stillFree:
      'Jouer, apprendre, résoudre des puzzles et analyser tes parties restent entièrement libres, sans rien créer. Le compte est gratuit : un pseudo, un mot de passe, et l’adresse est facultative.',
    lookAnyway: 'Voir quand même',
  },

  install: {
    alreadyDone: 'C’est déjà fait : tu lis ceci depuis l’application installée.',
    ios: 'Sur iPhone et iPad, l’installation passe par le navigateur : touche le bouton de partage, puis « Sur l’écran d’accueil ». C’est aussi ce qui débloque les notifications.',
    blurb:
      'Une icône sur ton écran d’accueil, plein écran, sans barre d’adresse — et rien à télécharger sur un magasin d’applications : c’est le même site.',
    manual:
      'Ce navigateur ne propose pas l’installation depuis la page. Cherche « Installer » ou « Ajouter à l’écran d’accueil » dans son menu — ou l’icône d’installation à droite de la barre d’adresse.',
  },

  leaderboard: {
    unavailable: 'Classement indisponible',
    unavailableHint:
      'La base de données n’est pas joignable. Le reste de la plateforme fonctionne normalement.',
    empty: 'Personne au classement pour l’instant',
    emptyHint:
      'Joue {n} parties classées dans cette cadence pour y apparaître. Il faut être deux comptes inscrits pour qu’une partie compte.',
    conservativeBefore: 'Le tri ne se fait pas sur le classement brut mais sur un classement',
    conservativeStrong: 'conservateur',
    conservativeAfter:
      ' : on retranche deux écarts-types. Concrètement, un joueur qui vient de gagner trois parties a une incertitude énorme sur son vrai niveau, et n’occupe donc pas la première place pour autant. Il faut jouer régulièrement pour que l’incertitude descende — et donc pour monter.',
    provisionalNote:
      'Le point d’interrogation à côté d’un classement signifie qu’il est encore provisoire : l’incertitude reste large, et l’estimation bouge beaucoup. Il faut une dizaine de parties pour la resserrer — davantage si les adversaires sont loin de son niveau, puisqu’un résultat couru d’avance n’apprend rien.',
  },

  verify: {
    incompleteLink: 'Ce lien est incomplet.',
    serverUnreachable: 'Le serveur est injoignable.',
    alreadyDone: 'C’était déjà fait',
    confirmed: 'Adresse confirmée',
    accountWorks: 'Ton compte fonctionne : seule l’adresse reste à confirmer.',
  },

  stakesList: {
    pageIntro:
      '{n} ouvertures expliquées par ce qu’elles cherchent, et non par leurs variantes : l’idée, la structure de pions, le plan de chaque camp, et le piège des dix premiers coups.',
    afterE4: 'Après 1.e4',
    afterE4Sub: 'Le centre pris tout de suite, et les six façons d’y répondre.',
    afterD4: 'Après 1.d4',
    afterD4Sub: 'Plus lent, plus fermé, et des plans qui durent trente coups.',
    noCentrePawn: 'Sans pion au centre',
    noCentrePawnSub: 'L’anglaise et le Réti : on contrôle le centre de loin, avec des pièces.',
    title: 'Les enjeux des ouvertures',
    intro:
      'Aucune variante à mémoriser. Connaître dix coups de théorie ne sert à rien si l’on ne sait pas ce qu’on cherche au onzième — et l’adversaire sort du livre au quatrième, presque toujours. Ce qui reste, c’est le plan : il tient en trois phrases par ouverture, et il vaut pour toute la partie.',
    searchPlaceholder: 'Chercher une ouverture, un code ECO, un piège…',
    searchAria: 'Chercher dans les fiches d’ouverture',
    noMatch:
      'Aucune fiche ne correspond à « {recherche} ». L’explorateur, lui, connaît les 3 810 ouvertures nommées.',
    explorerNote:
      'Ton ouverture n’est pas là ? L’explorateur en connaît 3 810, les reconnaît par transposition, et donne les statistiques par tranche de niveau.',
  },

  game: {
    yourTurn: 'À toi de jouer',
    opponentTurn: 'L’adversaire réfléchit…',
    thinking: 'Réflexion…',
    check: 'Échec !',
    checkmate: 'Échec et mat',
    stalemate: 'Pat — partie nulle',
    draw: 'Partie nulle',
    resign: 'Abandonner',
    offerDraw: 'Proposer nulle',
    drawOffered: 'Nulle proposée',
    acceptDraw: 'Accepter la nulle',
    declineDraw: 'Refuser',
    takeback: 'Reprendre le coup',
    takebackRequested: 'Reprise demandée',
    rematch: 'Revanche',
    newGame: 'Nouvelle partie',
    flipBoard: 'Retourner l’échiquier',
    analyse: 'Analyser la partie',
    moves: 'Coups',
    captured: 'Pièces prises',
    hint: 'Indice',
    showThreats: 'Montrer les menaces',
    youWon: 'Tu as gagné !',
    youLost: 'Tu as perdu',
    itsADraw: 'Partie nulle',
    byCheckmate: 'par échec et mat',
    byResignation: 'par abandon',
    byTimeout: 'au temps',
    byStalemate: 'par pat',
    byRepetition: 'par répétition',
    byFiftyMoves: 'par la règle des cinquante coups',
    byInsufficientMaterial: 'matériel insuffisant',
    ratingChange: 'Classement',
    over: {
      whiteWins: 'Les Blancs gagnent',
      blackWins: 'Les Noirs gagnent',
      win: 'Victoire !',
      loss: 'Défaite',
      draw: 'Partie nulle',
      close: 'Fermer',
      halfMoves: '{n} demi-coups joués',
      notRated: 'Partie non classée :',
      timeoutNoMate: 'temps écoulé, mais l’adversaire ne pouvait plus mater',
      pgnEvent: 'Partie Le Coup Parfait',
      seanceTheme: 'Thème de la séance',
      seanceNever:
        'Le thème ne s’est pas présenté une seule fois dans cette partie. Ça arrive — une ouverture fermée ne produit pas de colonne ouverte. La même séance sur une autre partie donnera autre chose.',
      seanceFor: 'pour toi',
      seanceAgainst: 'contre toi',
      seanceMovesBefore: 'Apparu à tes coups',
      seanceMovesAfter: '— retrouve-les dans la liste, ou en analyse.',
      questTitle: 'Quête du jour',
      questDone: '— c’est fait',
      questAllDone: 'Toutes les quêtes du jour sont faites.',
      questRemaining: 'Il te reste {n} quête aujourd’hui.',
      questRemainingPlural: 'Il te reste {n} quêtes aujourd’hui.',
      questTodo: 'Pas encore : il faut une victoire. Une autre partie, et c’est joué.',
      backToQuests: 'Retour aux quêtes du jour',
      playAgain: 'Rejouer une partie',
      backToMenu: 'Retour au menu',
    },
    reasons: {
      checkmate: 'par échec et mat',
      stalemate: 'par pat — le roi n’est pas en échec mais aucun coup n’est possible',
      resign: 'par abandon',
      timeout: 'au temps',
      draw: 'par accord mutuel',
      insufficientMaterial: 'matériel insuffisant pour mater',
      threefold: 'par répétition de la position',
      fiftyMoves: 'par la règle des cinquante coups',
      aborted: 'partie annulée',
      abandoned: 'partie abandonnée',
    },

    view2D: 'Vue 2D',
    view3D: 'Vue 3D',
    switchView: 'Changer de vue',
  },

  analysis: {
    title: 'Analyse',
    pageTitle: 'Analyse expliquée',
    tagShort: 'Coup par coup, ce qui a basculé et le meilleur coup, expliqué.',
    tagLong:
      'Colle une partie et découvre, coup par coup, ce qui a basculé — avec le meilleur coup montré sur l’échiquier et la raison écrite en toutes lettres.',
    noMove: 'Aucun coup reconnu.',
    noMoveHint: 'Colle un PGN, une FEN ou une liste de coups.',
    failed: 'L’analyse a échoué.',
    tryAgainSoon: 'Réessaie dans un instant.',
    notFound: 'Analyse introuvable.',
    notFoundHint: 'Elle a peut-être été supprimée.',
    reopenFailed: 'Impossible de rouvrir cette analyse.',
    handedOverEmpty: 'La partie transmise ne contenait aucun coup.',
    handedOverEmptyHint: 'Colle le PGN à la main, ou rejoue une partie.',
    clipboardUnavailable: 'Le presse-papiers est inaccessible.',
    clipboardUnavailableHint: 'Colle le texte à la main.',
    onlineGames: 'Tes parties en ligne',
    onlineGamesHint:
      'Chess.com ou Lichess, à partir du seul pseudo. Aucun compte n’est nécessaire ici, et rien n’est enregistré.',
    gameToAnalyse: 'Partie à analyser',
    halfMoves: '{n} demi-coups',
    pastePlaceholder: 'Colle un PGN, une liste de coups ou une FEN',
    whichSide: 'Tu joues quel camp ?',
    neitherSide: 'Ni l’un ni l’autre',
    sideHint:
      'Les explications s’adresseront à ce joueur, y compris sur les coups de son adversaire.',
    depthLabel: 'Profondeur d’analyse',
    depthHint:
      'Plus profond = plus fiable, mais plus long. 18 suffit pour repérer toutes les fautes d’un joueur de club ; 24 pour départager deux bons coups.',
    handedOverReady:
      'Ta partie est prête, avec ton camp déjà retenu. Règle la profondeur si tu veux, puis lance l’analyse.',
    sharedServer:
      'Le moteur analyse chaque position à la profondeur demandée, sur un serveur partagé — comptez une trentaine de secondes pour une partie complète. C’est le prix du service gratuit : aucune limite de nombre, aucune formule payante, mais une seule machine.',
    phasePositionsServer: 'Évaluation des positions (moteur serveur)',
    phasePositionsBrowser: 'Évaluation des positions (moteur navigateur)',
    phaseWriting: 'Rédaction des explications',
    abort: 'Abandonner l’analyse',
    engineNote:
      'L’analyse tourne d’abord sur le Stockfish natif du serveur. S’il est indisponible, elle se poursuit dans ton navigateur, un peu moins profondément.',
    pgnEvent: 'Analyse Le Coup Parfait',
    pgnCopied: 'PGN copié',
    pgnCopiedHint: 'Colle-le où tu veux : il porte les annotations.',
    copyRefused: 'Copie refusée par le navigateur',
    copyRefusedHint: 'Utilise « PGN » pour le fichier.',
    imageFailed: 'Image impossible',
    imageFailedHint: 'Le navigateur a refusé de dessiner la position.',
    imageSaved: 'Image enregistrée',
    imageSavedHint: 'La position, avec le dernier coup souligné.',
    gameResult: 'Résultat de la partie',
    backToDashboard: 'Revenir au tableau de bord : courbe, alternatives, moments clés',
    stepByStepTitle: 'Relire pas à pas : un échiquier, une phrase, un bouton',
    stepByStep: 'Pas à pas',
    voiceOn: 'Voix activée',
    voiceOff: 'Voix coupée',
    copyPgnTitle: 'Copier le PGN annoté, pour l’analyser ailleurs',
    downloadPgnTitle: 'Télécharger la partie annotée au format PGN',
    saveImageTitle: 'Enregistrer la position affichée en image PNG',
    analyseAGame: 'Analyser une partie',
    otherGame: 'Autre partie',
    recommendedLine: 'Suite recommandée',
    notReplayable:
      'Ce coup ne se rejoue pas sur cette position : impossible de l’expliquer sans risquer d’inventer.',
    whatYouCouldPlay: 'Ce que tu pouvais jouer',
    rankTitle: 'Coup classé {rang} sur {total} par le moteur',
    moveNotationTitle: 'Le coup, en notation d’échecs',
    scoreTitle:
      'Évaluation de la position après ce coup, en pions. Positif : les Blancs sont mieux.',
    engineLineTitle: 'Suite prévue par le moteur : {coups}',
    playedTitle: 'Le coup que tu as joué dans la partie',
    played: 'joué',
    bestTitle: 'Le premier choix du moteur dans cette position — celui qu’il fallait jouer',
    best: 'meilleur',
    summary: 'Bilan de la partie',
    accuracy: 'précision',
    noTurningPoint:
      'Aucun coup n’a fait basculer la partie : l’avantage n’a jamais changé de camp brutalement.',
    keyMoments: 'Moments clés',
    winner: 'Vainqueur de la partie',
    averageLossOf: 'perte moyenne {acpl} centipions ·',
    performanceOf: 'performance sur cette partie ≈ {elo} Elo',
    performanceTitle:
      'Ce que valent les coups joués dans cette partie, pas ton classement. Une seule gaffe suffit à perdre une partie par ailleurs bien jouée, et un adversaire faible flatte la mesure.',

    import: 'Importer une partie',
    importPlaceholder: 'Colle ici un PGN, une FEN, ou une liste de coups…',
    analyse: 'Lancer l’analyse',
    analysing: 'Analyse en cours…',
    depth: 'Profondeur',
    bestMove: 'Meilleur coup',
    yourMove: 'Ton coup',
    evaluation: 'Évaluation',
    evalBar: 'Barre d’évaluation',
    whyBetter: 'Pourquoi c’est mieux',
    engineLines: 'Variantes du moteur',
    openingPlayed: 'Ouverture jouée',
    estimatedLevel: 'Niveau estimé',
    averageLoss: 'Perte moyenne',
    exportPgn: 'Exporter en PGN',
    speak: 'Lire à voix haute',
    stopSpeaking: 'Arrêter la lecture',
  },

  ia: {
    title: 'Assistant IA',
    optional: 'Facultatif. Tout le reste de l’application fonctionne sans.',
    blurbBefore:
      'Les explications de chaque coup sont écrites par l’application, hors ligne et sans clé. En branchant ton propre compte, tu ajoutes une chose de plus :',
    blurbStrong: 'pouvoir poser une question de suivi',
    blurbAfter: '— « et si j’avais joué autre chose ? », « pourquoi cette case est faible ? ».',
    enable: 'Activer l’assistant',
    enableHint: 'Tu utilises ton propre compte chez le fournisseur de ton choix.',
    provider: 'Fournisseur',
    onYourMachine: 'sur ta machine',
    keyRequired: 'clé requise',
    keyOptional: 'clé facultative',
    apiKey: 'Clé d’API',
    pasteKey: 'Colle ta clé ici',
    keyOptionalPlaceholder: 'Laisse vide si le service n’en demande pas',
    keyStorage:
      'Enregistrée dans ce navigateur uniquement — jamais sur nos serveurs, jamais liée à ton compte.',
    model: 'Modèle',
    refreshList: 'Actualiser la liste',
    pickModel: '— choisis un modèle —',
    savedModel: '{modele} (enregistré)',
    noModelLocal: 'Aucun modèle détecté. Lance le service et télécharge un modèle, puis actualise.',
    noModelRemote:
      'Saisis ta clé pour voir la liste, ou tape l’identifiant du modèle chez ton fournisseur.',
    retiredModel:
      'Ce modèle appartient à une génération retirée. Il échouera au premier appel — choisis-en un plus récent.',
    seeModels: 'Voir les modèles proposés par {fournisseur} ↗',
    answerLength: 'Longueur des réponses',
    lengthShort: 'très bref',
    lengthMedium: 'mesuré',
    lengthLong: 'développé',
    testConnection: 'Tester la connexion',
    testOk: 'ça répond',
    testKo: 'échec',
    answers: 'L’assistant répond.',
    noAnswer: 'L’assistant ne répond pas.',
    remoteKeyBefore: 'Ta clé est enregistrée dans ce navigateur, et elle n’est envoyée qu’à',
    remoteKeyMiddle:
      '. Comme les navigateurs interdisent d’appeler ces services directement, la requête',
    remoteKeyStrong: 'transite par ce serveur',
    remoteKeyAfter:
      ', qui la recopie sans rien en conserver. Sur une instance que tu n’héberges pas toi-même, cela suppose de faire confiance à l’hébergeur — un service local n’a pas cet inconvénient.',
    localKeyBefore: 'Ce service tourne sur ta machine : ton navigateur lui parle directement, et',
    localKeyStrong: 'rien ne passe par nos serveurs',
    localKeyAfter:
      '. Si l’appel échoue, c’est en général qu’il faut l’autoriser à répondre aux pages web (variable',
    localKeyEnd: 'pour Ollama).',
    keysCleared: 'Clés effacées de ce navigateur.',
    clearKeys: 'Effacer toutes mes clés de ce navigateur',
    otherService: 'Autre service',
    removeProvider: 'Retirer {nom}',
    customName: 'Nom',
    customUrl: 'Adresse de l’API',
    customUrlHint: 'La racine compatible OpenAI, sans « /chat/completions ».',
    customAdd: 'Ajouter',
    addOpenAiService: 'Ajouter un service compatible OpenAI',
    badAddress: 'Adresse invalide.',
    badAddressHint: 'Exemple : https://api.groq.com/openai/v1',
    defaultCustomName: 'Service compatible OpenAI',
  },

  commentary: {
    playInstead: '{coup} — à jouer à la place',
    notReplayable: 'Ce coup ne se rejoue pas sur cette position.',
    notReplayableHint: 'Impossible de l’expliquer sans risquer d’inventer.',
    placeholder:
      'Mode commenté actif. Après chaque coup, tu verras ce que tu aurais pu jouer, avec les trois meilleures options et la raison de chacune.',
    staleBefore: 'Porte sur ton coup',
    staleAfter: '— la position a changé depuis.',
    check: 'Échec',
    mate: 'Mat',
    review: 'Revoir',
    analysing: 'Analyse du coup…',
    muteVoice: 'Couper la voix',
    unmuteVoice: 'Activer la voix',
    replayFull: 'Réécouter l’explication complète',
    replay: 'Réécouter l’explication',
    hideBestMove: 'Masquer le coup proposé sur l’échiquier',
    showBestMove: 'Montrer le coup proposé sur l’échiquier',
    bestMoveAria: 'Afficher le coup proposé',
    resume: 'Reprendre la partie',
    pauseToRead: 'Mettre en pause pour lire',
    resumeShort: 'Reprendre',
    pauseShort: 'Pause',
    whatYouCouldPlay: 'Ce que tu pouvais jouer',
    played: 'joué',
    yourMoveBest: 'Ton coup — le meilleur',
    nothingBetter: 'Le moteur n’avait rien de mieux.',
    disable: 'Désactiver le mode commenté',
    toggleTitle: 'Commenter chaque coup en direct',
    mode: 'Mode commenté',
  },

  quality: {
    brilliant: 'Brillant',
    great: 'Coup unique',
    best: 'Meilleur coup',
    excellent: 'Excellent',
    good: 'Bon coup',
    book: 'Théorie',
    forced: 'Coup forcé',
    inaccuracy: 'Imprécision',
    mistake: 'Erreur',
    blunder: 'Gaffe',
    miss: 'Occasion manquée',
  },

  legend: {
    aria: 'Signification des flèches',
    safeWins: 'Tu gagnes du matériel',
    safeWinsTitle: 'Ce coup remporte plus qu’il ne risque.',
    safeSquare: 'Case sûre',
    safeSquareTitle: 'La pièce n’y est pas attaquée, ou elle y est défendue.',
    evenTrade: 'Échange équilibré',
    evenTradeTitle: 'Tu perds autant que tu prends.',
    losesPiece: 'Tu perds la pièce',
    losesPieceTitle: 'La pièce y serait prise sans compensation suffisante.',
    played: 'Ton coup',
    playedTitle: 'Le coup que tu viens de jouer.',
    playedBad: 'Ton coup (erreur)',
    playedBadTitle: 'Le coup joué : le moteur le juge nettement inférieur.',
    best: 'À jouer à la place',
    bestTitle: 'Ce qu’il fallait jouer au lieu de ton coup, dans la position d’avant.',
    hint: 'Indice',
    hintTitle: 'Le coup suggéré par l’indice.',
    look: 'À observer',
    lookTitle: 'Ce que le coach te montre.',
    danger: 'Menace',
    dangerTitle: 'Un coup adverse dont il faut se méfier.',
    solution: 'La solution',
    solutionTitle: 'Le coup attendu.',
    yourMoveNamed: '{coup} — ton coup',
    insteadNamed: '{coup} — à la place de ton coup',
    playedNamed: '{coup} — le coup joué',
    mistakeNamed: '{coup} — erreur',
  },

  learn: {
    title: 'Apprendre',
    subtitle: 'Des leçons guidées, à ton rythme, avec un échiquier et une voix.',
    pageTitle: 'Apprendre les échecs',
    intro:
      '{lecons} leçons guidées, {etapes} étapes, une voix qui explique chaque coup. Tu peux commencer sans rien connaître — la première leçon part de l’échiquier vide.',
    yourProgress: 'Ta progression',
    lessonsOf: '{faites} / {total} leçons',
    resumeWhere: 'Reprendre où tu en étais',
    whereToStart: 'Par où commencer',
    chapterN: 'chapitre {n}',
    stepOf: 'étape {n} sur {total}',
    stepsCount: '{n} étapes',
    chaptersCount: '{n} chapitres',
    expandAll: 'Tout déplier',
    collapseAll: 'Tout replier',
    palierTitle: 'Ton palier',
    palierBlurb:
      'Le programme rangé par ce qui coûte le plus de points à ton niveau, et les motifs que tu rates vraiment.',
    palierDetail: 'D’après ton classement, ou un test de douze positions',
    principesTitle: 'Principes et mémo',
    principesBlurb:
      'Quatre questions à se poser avant chaque coup, et les principes des trois phases — chacun avec son exception.',
    principesDetail: 'Le mémo s’affiche aussi pendant tes parties',
    ecouteTitle: 'Écouter le programme',
    ecouteBlurb:
      'Les leçons lues à voix haute, sans rien à toucher. Pour réviser en faisant autre chose.',
    ecouteDetail: '{etapes} étapes, enchaînées tout seul',
    seanceTitle: 'Séance pédagogique',
    seanceBlurb:
      'Une partie avec un thème annoncé avant de commencer, et un bilan qui dit où ce thème est apparu.',
    seanceDetail: 'Adversaire calibré sur ton palier',

    chapters: 'Chapitres',
    lessons: 'leçons',
    minutes: 'min',
    start: 'Commencer',
    resume: 'Reprendre',
    completed: 'Terminée',
    locked: 'À débloquer',
    nextLesson: 'Leçon suivante',
    previousLesson: 'Leçon précédente',
    yourTurnToPlay: 'À toi : joue le coup indiqué.',
    correct: 'Exact !',
    tryAgain: 'Pas tout à fait — réessaie.',
    showMe: 'Montre-moi',
    replay: 'Revoir',
    progress: 'Progression',
    levels: {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Confirmé',
    },
  },

  train: {
    title: 'S’entraîner',
    intro:
      'Les mêmes positions, quatre façons de s’en servir : chercher le coup juste, le reconnaître vite, en résoudre une par jour — ou s’en servir pour mesurer son niveau.',
    puzzles: 'Puzzles',
    puzzlesBlurb:
      'Une position, un coup à trouver. Le niveau suit le tien, et une erreur ne ferme pas l’exercice.',
    puzzlesDetail: '6 millions de positions · 12 thèmes · classement personnel',
    rush: 'Puzzle rush',
    rushBlurb:
      'Le plus de positions possible avant la fin du temps. On ne réfléchit plus, on reconnaît.',
    rushDetail: '3 minutes, 5 minutes ou survie · trois erreurs et la manche s’arrête',
    daily: 'Défi du jour',
    dailyBlurb:
      'Une seule position, la même pour tout le monde de ton niveau. La prochaine arrive à minuit.',
    dailyDetail: 'Compte pour la série et pour les quêtes du jour',
    dailyDone: 'relevé',
    levelTest: 'Test de niveau',
    levelTestBlurb:
      'Douze positions, plus dures ou plus simples selon tes réponses. À la fin, un niveau estimé et ce qu’il faut travailler.',
    levelTestDetail: 'Six minutes · ne touche ni à ton Elo ni à ta cote de puzzles',
  },

  level: {
    title: 'Test de niveau',
    intro:
      'Douze positions, de plus en plus dures ou de plus en plus simples selon tes réponses. À la fin, un niveau estimé et la liste de ce qui te fait gagner des points maintenant.',
    howItWorks: 'Comment ça marche',
    how1: 'Une position, un coup à trouver, et on passe à la suivante. Si tu trouves, la suivante est plus dure ; sinon, plus simple. Il n’y a pas d’indice et pas de second essai — c’est ce qui rend la mesure utilisable.',
    how2: 'Les positions viennent du catalogue de Lichess, et chacune porte sa propre cote, établie sur des millions de tentatives. Ce n’est donc pas un avis sur ton jeu, c’est une mesure.',
    how3: 'Rien n’est envoyé au classement : ce test ne touche ni à ta cote de puzzles, ni à ton Elo. Compte six minutes.',
    lastTest: 'Dernier test : {elo} le {date}. Le refaire remplacera ce résultat.',
    start: 'Commencer le test',
    seeMyTier: 'Voir mon palier',
    loadFailed: 'Impossible de charger une position.',
    serviceDown: 'Le service de puzzles est injoignable.',
    needsCatalogue:
      'Le test a besoin du catalogue de puzzles. S’il n’est pas encore importé, la commande est dans le fichier README.',
    levelSetFailed: 'Ton niveau est mesuré, mais l’adversaire de départ n’a pas pu être réglé.',
    positionOf: 'Position {n} sur {total}',
    positionRating: 'cote {cote}',
    whiteToPlay: 'Les Blancs jouent — trouve le meilleur coup.',
    blackToPlay: 'Les Noirs jouent — trouve le meilleur coup.',
    found: 'Trouvé',
    missed: 'Raté',
    theMoveWas: 'Le coup était',
    nothingToFix:
      'Rien à corriger maintenant : le test mesure, il n’enseigne pas. Tu retrouveras ce motif dans la liste de la fin.',
    nextPosition: 'Position suivante',
    seeMyLevel: 'Voir mon niveau',
    whereWeAre: 'Où en est la mesure',
    nextAround: 'Prochaine position visée autour de',
    narrowing: 'L’estimation se resserre à chaque réponse.',
    yourLevel: 'Ton niveau estimé',
    foundOf: '{reussies} / {total} trouvés',
    inGame: 'en partie, environ — l’échelle du classement de l’application',
    range: 'entre {bas} et {haut}',
    pickedUp: 'Ton test de niveau a été repris',
    pickedUpHint:
      'Ton classement de départ est {elo} au lieu de repartir de zéro. Tes premières parties l’ajusteront.',
    unknownPosition: 'Une des positions du relevé est introuvable.',
    incoherentRun: 'Ce relevé ne ressemble pas à un test passé jusqu’au bout.',
    onPuzzleScale: 'sur l’échelle des puzzles',
    twoNumbers:
      'Les deux nombres diffèrent et c’est normal : un puzzle annonce qu’il y a quelque chose à trouver, une partie ne l’annonce jamais. Le premier est celui à retenir pour choisir ses adversaires ; le second pour choisir ses exercices.',
    yourTier: 'Ton palier',
    firstOpponentBefore: 'Premier adversaire proposé contre l’ordinateur :',
    firstOpponentAfter:
      'Les {paliers} paliers restent accessibles au curseur, dans les deux sens, et ton classement, lui, ne bouge qu’en jouant.',
    whatProgresses: 'Ce qui me fait progresser maintenant',
    playAtThisLevel: 'Jouer à ce niveau',
    retake: 'Refaire le test',
  },

  tier: {
    title: 'Ton palier',
    intro:
      'Le programme rangé non plus par chapitres, mais par ce qui coûte le plus de points à ton niveau. Rien de nouveau à apprendre ici — seulement l’ordre dans lequel le faire.',
    yourLevel: 'Ton niveau',
    nextTierFrom: 'Palier suivant à partir de {min} : {nom}.',
    takeTest: 'Faire le test de niveau',
    retake: 'Refaire le test',
    fromDeclaration:
      'Ce nombre vient de ta réponse à l’inscription, pas d’une mesure. Douze positions suffisent à le vérifier.',
    stale:
      'Ta mesure date de {jours} jours. Si tu as travaillé depuis, ce programme n’est plus le tien.',
    testNeutral:
      'Douze positions, six minutes. Le test ne touche ni à ton classement ni à ta cote de puzzles.',
    unknown:
      'On ne sait pas encore où tu en es — aucune partie classée, aucun puzzle. Douze positions suffisent à le savoir, et le test ne touche à aucun classement.',
    showAnyway: 'Je débute, montre-moi quand même',
    weaknesses: 'Ce que tu rates vraiment',
    weaknessesCount: '{n} motifs mesurés',
    weaknessesHint:
      'Calculé sur tes puzzles, motif par motif. Les motifs vus moins de cinq fois ne sont pas comptés : deux échecs sur deux ne veulent rien dire.',
    bestReturn: 'Ce qui rapporte le plus, maintenant',
    tierNamed: 'Palier',
    eloAndAbove: '{min} Elo et plus',
    eloRange: '{min} – {max} Elo',
    leversCount: '{n} leviers, dans l’ordre de rendement',
    practise: 'Le mettre en pratique',
    practiseHint:
      'Une partie pédagogique à ton palier : un adversaire calibré, un thème annoncé avant de commencer, le mode commenté allumé, et un bilan qui dit où le thème est apparu.',
    session: 'Séance pédagogique',
    sixTiers: 'Les six paliers',
    backToMine: 'Revenir à mon palier',
    alreadySeen: 'déjà vue',
    lessonNamed: 'Leçon · {titre}',
    guidedLesson: 'Leçon guidée',
    puzzlesOnTheme: 'Puzzles sur ce thème',
    inGameSpeed: 'en {cadence}, sur {parties} parties',
    inGameSpeedOne: 'en {cadence}, sur {parties} partie',
    provisional: '— encore provisoire',
    provisionalLeft: '— encore provisoire : au moins {n} parties pour le stabiliser',
    testedOn: ' du {date}',
  },

  principles: {
    title: 'Principes et mémo',
    intro:
      'Quatre questions à se poser avant de jouer, et {n} principes de conduite — chacun avec le cas où il ne s’applique pas.',
    theMemo: 'le mémo',
    beforeEveryMove: 'Avant chaque coup.',
    memoHint:
      'Dix secondes, dans cet ordre. La première question est la plus importante et la plus négligée : à tous les niveaux faibles, la faute la plus fréquente est de jouer son propre plan sans avoir regardé le coup d’en face.',
    showInGame: 'Afficher le mémo pendant mes parties',
    showInGameHint:
      'Un panneau repliable sous l’échiquier, contre l’ordinateur. À couper dès que le réflexe est pris — c’est le but de toutes les aides.',
    listTitle: 'Les principes, et leurs exceptions',
    shownCount: '{n} affichés',
    opening: 'Ouverture',
    endgame: 'Finale',
    positional: 'Jeu positionnel',
    phase: 'Phase de la partie',
    allPhases: 'Tout',
    middlegameShort: 'Milieu',
    spokenPrinciple: '{regle} {pourquoi} Sauf : {sauf}',
    spokenMemo: '{rang}. {question} {comment}',
    practise: 'Les mettre en pratique',
    practiseHint:
      'Un principe qu’on lit ne change rien ; un principe qu’on a dû appliquer vingt fois de suite change tout. Les séances pédagogiques annoncent justement un thème avant de commencer.',
    readAloud: 'Chaque principe se lit à voix haute — le haut-parleur, à droite.',
  },

  elo: {
    title: 'Calculateur Elo',
    intro:
      'Ta cote, ton coefficient, tes parties : ce que le tournoi te rapporte ou te coûte, partie par partie, et ta performance. Le barème est celui de la FIDE.',
    yourRating: 'Ta cote',
    ratingRange: 'Entre 1000 et 3500.',
    coefficient: 'Coefficient K',
    k40: 'moins de 30 parties classées, ou moins de 18 ans sous 2300',
    k20: 'le cas général, sous 2400',
    k10: 'une fois 2400 atteint, même redescendu',
    win: 'Victoire',
    drawResult: 'Nulle',
    loss: 'Défaite',
    gamesHint: 'cote de l’adversaire, puis le résultat',
    yourGames: 'Tes parties',
    opponentRating: 'Cote de l’adversaire {n}',
    gameResult: 'Résultat de la partie {n}',
    removeGame: 'Retirer la partie {n}',
    addGame: 'Ajouter une partie',
    summary: 'Bilan',
    change: 'Variation',
    newRating: 'nouvelle cote',
    score: 'Score',
    expected: 'attendu',
    performance: 'Performance',
    opponentsAt: 'adversaires à',
    onAverage: 'en moyenne',
    formulaNote:
      'Score attendu par la formule logistique, écart plafonné à 400 points comme à la FIDE ; performance lue dans sa table de conversion, bornée à ±800. La FFE applique le même barème à sa cote nationale.',
  },

  listen: {
    title: 'Écouter le programme',
    intro:
      'Le programme lu à voix haute, sans rien à toucher : le coach parle, l’échiquier suit, l’étape suivante arrive quand la phrase est finie. Pour réviser en faisant autre chose.',
    revisionBefore:
      'Les étapes qui demandent normalement de jouer un coup sont jouées pour toi : tu écoutes la solution au lieu de la chercher. C’est donc une',
    revisionStrong: 'révision',
    revisionMiddle: ', pas un apprentissage — reviens sur',
    revisionLink: 'les leçons guidées',
    revisionAfter: 'pour la première fois, et écoute-les ensuite.',
    wholeCurriculum: 'Tout le programme',
    wouldAskYou:
      'En leçon, c’est ici qu’on te demanderait : {consigne}. Le coup est joué pour toi.',
    previousStep: 'Étape précédente',
    nextStep: 'Étape suivante',
    pause: 'Pause',
    listen: 'Écouter',
    previousLesson: 'Leçon précédente',
    nextLesson: 'Leçon suivante',
    playedNotHeard: '. On retient ce qu’on a joué, pas ce qu’on a entendu.',
  },

  puzzles: {
    title: 'Puzzles',
    subtitle: 'Six millions de positions tactiques, triées par thème et par niveau.',
    yourRating: 'Ton classement puzzles',
    findTheMove: 'Trouve le meilleur coup',
    whiteToPlay: 'Les Blancs jouent',
    blackToPlay: 'Les Noirs jouent',
    correct: 'Bien vu !',
    incorrect: 'Ce n’est pas ça.',
    solved: 'Résolu',
    next: 'Puzzle suivant',
    retry: 'Réessayer',
    showSolution: 'Voir la solution',
    themes: 'Thèmes',
    allThemes: 'Tous les thèmes',
    streak: 'Série',
    loadFailed: 'Impossible de charger un puzzle.',
    unusable: 'Ce puzzle est inutilisable',
    unusableHint:
      'La position de ce puzzle ne correspond pas à sa solution — il est inutilisable. Le suivant sera bon.',
    noneAvailable: 'Aucun puzzle disponible',
    emptyBase:
      'La base de puzzles est vide. Lance l’import depuis le serveur pour récupérer les six millions de positions de Lichess.',
    serviceDown: 'Le service de puzzles est injoignable.',
    spokenWhite: 'Les Blancs jouent. Trouve le meilleur coup.',
    spokenBlack: 'Les Noirs jouent. Trouve le meilleur coup.',
    onlyOne: 'Trouve le meilleur coup. Il y en a un seul.',
    findBest: '— trouve le meilleur coup',
    notIt: 'Ce n’est pas ça. Encore un essai.',
    solutionIs: 'Solution :',
    dailyDone: 'Défi du jour relevé !',
    dailyAlreadyDone: 'déjà relevé aujourd’hui',
    dailyOnlyOne: 'une seule position',
    timedRun: 'Manche chronométrée',
    solvedTitle: 'Résolu !',
    solvedDaily:
      'C’était la position du jour, la même pour tout le monde de ton niveau. La prochaine arrive à minuit.',
    solvedFirstTry: 'Trouvé du premier coup. C’est exactement ce qu’il fallait voir.',
    solvedAfterTries: 'Bien joué. Refais-en un du même thème pour ancrer le motif.',
    failedTitle: 'Raté',
    shouldHavePlayed: 'Il fallait jouer',
    replayRevealed:
      'Rejoue la position : c’est en refaisant le coup soi-même qu’on finit par reconnaître le motif d’instinct.',
    replayOrReveal:
      'Rejoue la position, ou demande la solution si tu sèches : c’est en refaisant le coup soi-même qu’on finit par reconnaître le motif d’instinct.',
    whatToSee: 'Ce qu’il fallait voir',
    puzzleRating: 'Niveau du puzzle : {cote}',
    skip: 'Passer',
    restart: 'Recommencer',
    myQuests: 'Mes quêtes',
    leaveDaily: 'Autres puzzles',
    seeCategory: 'Voir la catégorie',
    accountHint:
      'Crée un compte pour suivre ton classement puzzles et éviter de revoir les mêmes positions.',
    themeNames: {
      all: 'Tous',
      fork: 'Fourchette',
      pin: 'Clouage',
      skewer: 'Enfilade',
      discoveredAttack: 'Découverte',
      hangingPiece: 'Pièce en prise',
      mateIn1: 'Mat en 1',
      mateIn2: 'Mat en 2',
      backRankMate: 'Mat du couloir',
      sacrifice: 'Sacrifice',
      promotion: 'Promotion',
      zugzwang: 'Zugzwang',
    },

    dailyPuzzle: 'Puzzle du jour',
  },

  session: {
    title: 'Séance pédagogique',
    intro:
      'Une partie contre l’ordinateur, avec un adversaire calibré sur ton niveau, un thème annoncé avant de commencer, et un bilan qui dit où ce thème est apparu dans ta partie.',
    whichLevel: 'À quel niveau',
    opponentBefore: 'Ton adversaire sera',
    opponentAfter:
      ', annoncé à {elo} Elo — c’est-à-dire à peu près ton niveau. Une séance n’est pas un exercice de force : si l’adversaire est trop fort, le thème n’a jamais le temps d’apparaître.',
    whichTheme: 'Sur quel thème',
    pickForMe: 'Choisis pour moi',
    beforeStarting: 'Avant de commencer',
    commentEachMove: 'Commenter chaque coup',
    commentEachMoveHint:
      'Après chacun de tes coups, les trois meilleures options avec la raison de chacune, et le coup proposé fléché. C’est ce qui fait d’une partie une séance — mais elle reste jouable sans.',
    whatYouWatch: 'Ce que tu regardes',
    atTheEnd: 'À la fin',
    debriefPromise:
      'Le bilan comptera les positions où « {theme} » est apparu dans ta partie — pour toi et contre toi — et dira à quels coups.',
    start: 'Commencer la séance',
    pickTheme: 'Choisis un thème',
  },

  rush: {
    title: 'Manche chronométrée',
    hint: 'Enchaîne les puzzles, de plus en plus durs. Trois erreurs et la manche s’arrête.',
    threeMinutes: '3 minutes',
    threeMinutesHint: 'La plus tendue. On ne réfléchit plus, on reconnaît.',
    fiveMinutes: '5 minutes',
    fiveMinutesHint: 'De quoi trouver son rythme avant que ça morde.',
    survival: 'Survie',
    survivalHint: 'Pas de chronomètre. Trois erreurs, et c’est fini.',
    preparing: 'Préparation…',
    start: 'Commencer',
    footer:
      'Les puzzles ordinaires apprennent à trouver ; celui-ci apprend à reconnaître. C’est ce qui manque le plus en partie rapide.',
    backToPuzzles: 'Revenir aux puzzles',
    solvedCount: 'puzzles résolus',
    solvedOne: 'puzzle résolu',
    recordIs: 'Ton record :',
    puzzlesWord: 'puzzles.',
    solvedWord: 'résolus',
    newRecord: 'Nouveau record',
    recordStays: 'Ton record reste à {n}.',
    playAgain: 'Rejouer',
    changeMode: 'Changer de mode',
    stopRun: 'Arrêter la manche',
  },

  correspondence: {
    title: 'Correspondance',
    hint: 'Un coup quand tu peux. Personne n’attend devant son écran.',
    needsAccount: 'La correspondance demande un compte',
    needsAccountHint: 'Une partie qui dure des semaines doit te retrouver d’une session à l’autre.',
    moveRefused: 'Coup refusé.',
    noGame: 'Aucune partie. Lance-en une avec quelqu’un de ton carnet.',
    newGame: 'Nouvelle partie',
    newGameHint: 'Elle se lance depuis l’écran de partie, en choisissant une cadence en jours.',
    playSomeone: 'Jouer contre quelqu’un',
    yourTurnIn: 'À toi — {temps}',
    waiting: 'En attente',
    finished: 'terminée · {resultat}',
    yourTurnShort: 'à toi · {temps}',
    waitingShort: 'en attente',
    overdue: 'délai dépassé',
    hoursLeft: '{n} h restantes',
    resignConfirm: 'Abandonner cette partie ?',
    pickAGame: 'Choisis une partie à gauche, ou lance-en une avec quelqu’un de ton carnet.',
  },

  endgames: {
    missingBase: 'Base de finales absente',
    missingBaseHint:
      'Le fichier des positions n’a pas été trouvé. Lance la compilation depuis le dépôt.',
    title: 'Entraînement aux finales',
    intro:
      '{n} positions classées. On te donne un objectif — gagner ou tenir la nulle — et l’ordinateur défend au mieux. Il faut jouer jusqu’au bout : aucune solution à réciter.',
    yourObjective: 'Ton objectif',
    piecesCount: '{n} pièces',
    solved: 'finale résolue',
    difficultyOf: 'difficulté {n}/5',
    spokenDraw: 'Tu joues {couleur}. Tiens la nulle.',
    spokenMate: ' Il y a mat en {n} coups au mieux.',
    playAndWin: 'Tu joues {couleur}. Gagne cette position.{mat}',
    allFamilies: 'Toutes les familles',
    win: 'Gagner',
    holdDraw: 'Tenir la nulle',
    mateIn: ' · mat en {n}',
    winWithMate: 'Gagner — mat en {n} coups au mieux',
    wonMessage: 'Gagné. La technique est acquise.',
    drawnMessage: 'Nulle tenue. Exactement ce qu’il fallait.',
    thisExercise: 'cet exercice',
    listenInstruction: 'Écouter la consigne',
    youPlay:
      'Tu joues les {couleur}. L’ordinateur défend au maximum de ses moyens — il ne te fera aucun cadeau.',
    won: 'Gagné !',
    drawn: 'Nulle tenue',
    missed: 'Objectif manqué',
    lost: 'Position perdue',
    retryWin:
      'La position était gagnante. Reprends-la : en finale, une seule imprécision suffit à tout annuler.',
    retryDraw: 'Il fallait tenir. Retente en cherchant la case exacte où ton roi doit se placer.',
    acquired: 'Technique acquise. Passe à la position suivante, un cran plus difficile.',
    fiftyMoves:
      'La règle des cinquante coups s’applique : si tu n’avances pas, la partie sera déclarée nulle — ce qui est une défaite quand l’objectif est de gagner.',
  },

  clock: {
    noMove: 'Aucun coup noté.',
    noMoveHint: 'Branche un échiquier électronique pour que la partie s’écrive.',
    intro:
      'Pose l’appareil entre les deux joueurs. Chacun tape son propre côté après avoir joué — comme sur une pendule mécanique. Avec un échiquier électronique branché, tu n’as rien à toucher : la carte voit le coup, la pendule bascule, et la partie s’écrit toute seule.',
    start: 'Démarrer — les Blancs jouent',
    startHint: 'Le premier appui lance la pendule des Blancs sans rien leur décompter.',
    analyse: 'Analyser la partie',
    asSeenByBoard: 'La partie, telle que la carte l’a vue',
  },

  savedAnalyses: {
    title: 'Tes analyses',
    unshare: 'Retirer le partage : le lien cessera de fonctionner',
    share: 'Partager par un lien, sans compte requis',
    forget: 'Oublier cette analyse',
    forgetNamed: 'Oublier l’analyse {blancs} – {noirs}',
    removeFailed: 'Retrait impossible.',
    linkRemoved: 'Lien retiré',
    linkRemovedHint: 'L’analyse n’est plus accessible par ce lien.',
    shareFailed: 'Partage impossible.',
    linkCopied: 'Lien copié',
    shareLink: 'Lien de partage',
    deleteFailed: 'Suppression impossible.',
    hint: 'Déjà calculées : les rouvrir est immédiat, le moteur ne retravaille pas.',
  },

  streak: {
    goToDaily: 'jours consécutifs — aller au défi du jour',
    seeStreak: 'jours consécutifs — voir ta série',
    streakOf: 'Série de {n}',
    lastSevenDays: 'les sept derniers jours · aujourd’hui à droite',
    resetsToZero: 'Un jour sans rien, et la flamme repart de zéro.',
    todayBefore: 'Aujourd’hui :',
    questsOf: 'quêtes sur {total}.',
    questOf: 'quête sur {total}.',
    atStake: ' Ta série est en jeu.',
    dailyAlreadyDone: 'Défi du jour déjà relevé',
    takeDaily: 'Relever le défi du jour',
  },

  stakes: {
    listenStakes: 'Écouter les enjeux de {nom}',
    spoken:
      '{nom}. {idee} La structure : {structure} Le plan des Blancs : {planBlancs} Le plan des Noirs : {planNoirs} Le piège : {piege}',
    forWhite: 'pour les Blancs',
    forBlack: 'pour les Noirs',
    whitePlan: 'Le plan des Blancs',
    blackPlan: 'Le plan des Noirs',
    structure: 'La structure',
    trap: 'Le piège',
    guidedLesson: 'La leçon guidée',
    seeOnBoard: 'Voir sur l’échiquier',
  },

  errors: {
    somethingWrong: 'Quelque chose s’est mal passé',
    somethingWrongHint:
      'L’écran n’a pas pu s’afficher. Ce n’est pas de ta faute, et ce n’est probablement pas définitif : réessayer suffit le plus souvent.',
    notFound: 'Cette page n’existe pas',
    notFoundHint:
      'L’adresse est peut-être ancienne, ou la partie, le profil ou l’étude que tu cherches a été supprimé.',
    incidentRef: 'Référence de l’incident :',
    backHome: 'Retour à l’accueil',
    playAGame: 'Jouer une partie',
  },

  arenas: {
    running: 'En cours',
    scheduled: 'À venir',
    finished: 'Terminé',
    createFailed: 'Création impossible.',
    created: 'Arène créée.',
    createdHint: 'Elle commence dans cinq minutes.',
    soloBlurb:
      'Tu es le seul humain. Trois à sept adversaires, de force choisie ou variée, et un classement aux points.',
    title: 'Arènes',
    hint: 'On arrive quand on veut, on part quand on veut. Dès qu’une partie finit, on est réapparié.',
    namePlaceholder: 'Nom de l’arène — « Blitz du jeudi »',
    nameAria: 'Nom de la nouvelle arène',
    create: 'Créer',
    createHint: '3 minutes par partie, 45 minutes d’arène, départ dans 5 minutes.',
    none: 'Aucune arène',
    noneSignedIn:
      'Crée-en une : elle commencera dans cinq minutes, le temps que les autres arrivent.',
    noneSignedOut: 'Connecte-toi pour en créer une.',
    footer:
      'Une arène n’a d’intérêt qu’à plusieurs : à trois joueurs, c’est un salon d’attente déguisé. Préviens tes amis avant d’en lancer une.',
  },

  openings: {
    title: 'Ouvertures',
    subtitle: '3 810 ouvertures répertoriées, expliquées et jouables.',
    explorer: 'Explorateur',
    searchPlaceholder: 'Chercher une ouverture, un code ECO…',
    variations: 'variantes',
    playThis: 'Jouer cette ligne',
    mainLine: 'Ligne principale',
    popularity: 'Popularité',
    whiteWins: 'Blancs',
    draws: 'Nulles',
    blackWins: 'Noirs',
    catalogued: '{n} ouvertures répertoriées.',
    bothColours: 'Tu joues les deux couleurs',
    bothColoursAfter:
      '— personne ne répond à ta place : c’est un plateau d’étude, pas une partie. Avance coup par coup, sur l’échiquier ou en cliquant dans les listes, et vois où mène chaque branche.',
    stakesLink: 'Les enjeux des 25 ouvertures qui se jouent en club →',
    exactlyListed: 'Position exactement répertoriée.',
    lastKnown: 'Dernière position connue au coup {n}. Tu es sorti de la théorie.',
    startHint:
      'Joue un premier coup sur l’échiquier, ou choisis une ouverture dans la liste. Chaque branche porte son nom et son code : tu verras l’ouverture se préciser à mesure que tu avances.',
    unlisted:
      'Cette position n’est pas répertoriée. Joue un coup connu, ou choisis une ouverture dans la liste.',
    continuations: 'Continuations théoriques',
    searchOpening: 'Chercher une ouverture ou un code ECO…',
    searchAria: 'Rechercher une ouverture',
    searchTitle: 'Cherche une ouverture',
    searchHint:
      'Tape un nom — sicilienne, française, gambit dame — ou choisis un volume ECO ci-dessus.',
    datasetNote: 'Jeu de données {source}, domaine public (CC0).',
    dataset: 'Jeu de données',
    bandBeginner: 'Débutant',
    bandClub: 'Club',
    bandStrong: 'Fort',
    whatIsPlayed: 'Ce qu’on joue ici',
    coverageBefore: 'Les statistiques couvrent les',
    coverageStrong: '{n} premiers coups',
    coverageAfter:
      '. Au-delà, chaque position devient trop rare pour qu’un pourcentage veuille dire quelque chose.',
    tooRare:
      'Moins de quarante parties à ce niveau depuis cette position : trop peu pour dire quoi que ce soit d’honnête. Tu es déjà sorti des sentiers battus.',
    footer:
      '{parties} parties · coup {coup} sur {total} couverts · le second pourcentage est le score du camp au trait, nulle comptée pour un demi-point.',

    masterGames: 'Parties de maîtres',
  },

  career: {
    tag: 'Mode carrière',
    title: 'Douze chapitres, un chemin',
    intro:
      'De « savoir bouger les pièces » à « une partie entière sans filet ». Chaque chapitre a une leçon, cinq puzzles et un adversaire choisi pour ce qu’il t’oblige à travailler.',
    needsAccount: 'La carrière garde ta place.',
    needsAccountHint:
      'C’est la seule rubrique qui demande un compte, et pour une raison simple : une progression sur douze chapitres n’a aucun sens si elle disparaît en fermant l’onglet. Le compte est gratuit — un pseudo, un mot de passe, et rien d’autre.',
    restartConfirm: 'Recommencer la carrière depuis le premier chapitre ?',
    restarted: 'Carrière remise à zéro.',
    restartFailed: 'Impossible de recommencer.',
    finished: 'Carrière terminée.',
    finishedHint:
      'Les douze chapitres sont derrière toi. La suite se joue contre des humains — c’est là que les vraies surprises commencent.',
    challengeSomeone: 'Défier quelqu’un',
    doItAllAgain: 'Tout refaire',
    restart: 'Recommencer',
    starsTitle: 'Étoiles décrochées sur l’ensemble des chapitres',
    badgesTitle: 'Hauts faits débloqués',
    losingStreak: '{n} défaites d’affilée — ça arrive.',
    easedBefore: 'L’adversaire passe à',
    easedAfter:
      'pour cette tentative, le temps de reprendre pied. Revoir la leçon aide souvent plus qu’une partie de plus : c’est là qu’est expliqué ce qui te coûte des points.',
    reviewLesson: 'Revoir la leçon',
    playAnyway: 'Rejouer quand même',
    comingUp: 'à venir',
    starsOf3: '{n} étoiles sur 3',
    chapterOf: 'Chapitre {n} sur {total}',
    allDone: 'Tout est fait — le chapitre suivant s’ouvre.',
    streakNote: '{n} défaite — ça ne compte pas contre toi, seules les victoires avancent.',
    streakNotePlural: '{n} défaites — ça ne compte pas contre toi, seules les victoires avancent.',
    badges: 'Hauts faits · {obtenus} / {total}',
  },

  friends: {
    title: 'Mes amis',
    hint: 'Ajoute les gens avec qui tu joues, et lance une partie en un clic.',
    needsAccount: 'Le carnet demande un compte',
    needsAccountHint:
      'Les amis se retrouvent par leur pseudo : il faut donc en avoir un. La création prend dix secondes et ne demande pas d’adresse électronique.',
    challengeSent: 'Défi envoyé à {pseudo}.',
    challengeSentHint: 'On attend sa réponse.',
    copyRefused: 'Copie refusée par le navigateur.',
    copyRefusedHint: 'Sélectionne le lien à la main.',
    inviteTitle: 'Inviter quelqu’un qui n’est pas encore là',
    inviteHint:
      'Envoie ce lien. La personne crée son compte et vous êtes amis directement, sans demande à accepter.',
    oneRequest: 'Une demande d’ami',
    manyRequests: '{n} demandes d’ami',
    accept: 'Accepter',
    decline: 'Refuser',
    addExisting: 'Ajouter quelqu’un déjà inscrit',
    searchPlaceholder: 'Pseudo…',
    searchAria: 'Chercher un joueur',
    nobodyNamed: 'Personne de ce nom. Envoie plutôt le lien d’invitation ci-dessus.',
    add: 'Ajouter',
    myBook: 'Mon carnet',
    timeControl: 'Cadence',
    emptyBook:
      'Personne pour l’instant. Envoie le lien d’invitation à quelqu’un, ou cherche son pseudo s’il est déjà inscrit.',
    cancelChallenge: 'Retirer ce défi',
    challengeSomeone: 'Défier {pseudo}',
    play: 'Jouer',
    removeFromBook: 'Retirer {pseudo} du carnet',
    remove: 'Retirer {pseudo}',
    pendingRequests: 'Demandes d’ami en attente :',
    pendingGames: 'Parties en attente',
    linkGame: 'Partie par lien',
    ratedSuffix: ' · classée',
    join: 'Rejoindre',
    deleteGame: 'Supprimer cette partie',
    expired: 'expirée',
    expiresIn: 'expire dans {temps}',
    online: 'En ligne',
    offline: 'Hors ligne',
  },

  password: {
    title: 'Mot de passe oublié',
    disabled: 'La récupération par courriel n’est pas active sur ce serveur.',
    intro: 'Indique l’adresse de ton compte : nous t’enverrons un lien pour en choisir un nouveau.',
    notPossible: 'Pas encore possible ici',
    notPossibleHint:
      'Ce serveur n’envoie pas de courriel pour le moment : il n’y a donc aucun moyen de t’envoyer un lien de réinitialisation.',
    askTheHost:
      'Écris à la personne qui héberge cette instance — elle peut redonner la main à ton compte directement. Ton mot de passe, lui, n’a pas changé.',
    backToSignIn: 'Retour à la connexion',
    sent: 'C’est envoyé',
    sentBefore: 'Si un compte utilise cette adresse',
    sentStrong: 'et qu’elle a été confirmée',
    sentAfter: ', un lien vient d’y être envoyé. Il est valable une heure.',
    nothingReceived:
      'Rien reçu ? L’adresse n’est peut-être pas celle du compte, ou n’a jamais été confirmée — auquel cas elle ne peut pas servir à reprendre la main.',
    emailLabel: 'Adresse électronique',
    emailHint: 'Celle que tu as renseignée à l’inscription.',
    sending: 'Envoi…',
    sendLink: 'Envoyer le lien',
    requestFailed: 'Demande impossible.',
    serverUnreachable: 'Le serveur est injoignable.',
    noEmailNote:
      'Pas d’adresse sur ton compte ? Un compte sans adresse confirmée ne peut pas être récupéré — c’est le prix de ne rien demander à l’inscription.',
  },

  profile: {
    title: 'Profil',
    rating: 'Classement',
    provisional: 'provisoire',
    gamesPlayed: 'parties',
    winRate: 'Victoires',
    bestWin: 'Meilleure victoire',
    statistics: 'Statistiques',
    ratingHistory: 'Évolution du classement',
    strengths: 'Points forts',
    weaknesses: 'À travailler',
    memberSinceDate: 'Membre depuis {date}',
    sinceGames: 'depuis {date}, sur {parties} parties classées.',
    seeYouSoon: 'À bientôt !',
    deleteFailed: 'Suppression impossible.',
    gameNotFound: 'Partie introuvable.',
    gameNotFoundHint: 'Elle a peut-être été effacée.',
    analysisFailed: 'Analyse impossible.',
    noSuchAccount: 'Aucun compte au pseudo « {pseudo} ».',
    serviceDown: 'Le service de profils ne répond pas. Réessaie dans un instant.',
    seeLeaderboard: 'Voir le classement',
    yourRatings: 'Tes classements',
    theirRatings: 'Ses classements',
    detailedStats: 'Statistiques détaillées',
    noRatedGame: 'Aucune partie classée',
    noRatedGameHint:
      'Les classements apparaîtront après la première partie classée contre un autre compte.',
    challengeFriend: 'Défier un ami',
    ratingHistoryTitle: 'Évolution du classement',
    recentGames: 'Parties récentes',
    noGameSaved: 'Aucune partie enregistrée',
    unlistedOpening: 'ouverture non répertoriée',
    halfMoves: '{n} demi-coups',
    accuracySuffix: ' · {n} % de précision',
    analyseThisGame: 'Analyser cette partie',
    analyseAgainst: 'Analyser la partie contre {adversaire}',
    forgetThisGame: 'Effacer cette partie de ton historique',
    forgetAgainst: 'Effacer la partie contre {adversaire}',
    collapseList: 'Réduire la liste',
    showOthers: 'Voir les {n} autres parties',
    yourAccount: 'Ton compte',
    signOut: 'Se déconnecter',
    highestLowest: 'Plus haut : {max} · plus bas : {min}',
    today: 'aujourd’hui',
    yesterday: 'hier',
    daysAgo: 'il y a {n} j',
    weeksAgo: 'il y a {n} sem.',
    emailToConfirm: 'Adresse à confirmer',
    emailNoMail:
      ' Ce serveur n’envoie pas encore de courriel : la confirmation n’est pas possible pour l’instant, et l’adresse ne sert donc à rien. Rien n’est perdu, elle reste enregistrée.',
    emailUntilThen:
      ' Tant que ce n’est pas fait, elle ne pourra pas servir à retrouver ton mot de passe.',
    linkResent: 'Lien renvoyé.',
    linkResentHint: 'Regarde ta boîte de réception.',
    emailSent: 'Envoyé',
    emailUnavailable: 'Indisponible',
    emailConfirm: 'Confirmer',

    memberSince: 'Membre depuis',
  },

  stats: {
    title: 'Mes statistiques',
    hint: 'Sur tes {n} parties terminées.',
    needsAccount: 'Les statistiques demandent un compte',
    needsAccountHint:
      'Elles se calculent sur tes parties enregistrées : il faut donc savoir lesquelles sont les tiennes.',
    noGame: 'Pas encore de partie classée',
    noGameHint:
      'Joue quelques parties contre un ami : tes statistiques apparaîtront ici, ouverture par ouverture.',
    days30: '30 jours',
    year1: '1 an',
    all: 'Tout',
    allGames: 'Toutes parties',
    asWhite: 'Avec les Blancs',
    asBlack: 'Avec les Noirs',
    gamesCount: '{n} parties',
    weakSpot: 'Ton point faible :',
    thisOpening: 'cette ouverture',
    unlistedOpening: 'Ouverture non répertoriée',
    weakSpotAfter:
      '— tu y marques {taux} % sur {parties} parties. C’est la ligne qui rapporte le plus à travailler.',
    byOpening: 'Par ouverture',
    noOpening:
      'Aucune ouverture jouée au moins trois fois : trop tôt pour en tirer quoi que ce soit.',
    bySpeed: 'Par cadence',
    howGamesEnd: 'Comment tes parties finissent',
    wonCount: '{n} gagnées',
    wonOne: '{n} gagnée',
    scoreBefore: 'Tu marques',
    scoreAround: 'vers {heure} h, contre',
    scoreAgainst: 'vers {heure} h.',
    serverHour:
      'Heure du serveur, et non la tienne : le fuseau des joueurs n’est pas enregistré. L’écart reste parlant, l’heure exacte moins.',
    clickToExplain:
      'Un nom d’ouverture, de cadence ou de fin de partie s’ouvre : on y trouve ce qu’il veut dire.',
    endings: {
      checkmate: 'Échec et mat',
      resigned: 'Abandon',
      timeout: 'Temps écoulé',
      draw: 'Nulle',
      stalemate: 'Pat',
      abandoned: 'Adversaire parti',
      aborted: 'Annulée',
    },
  },

  notifications: {
    title: 'Notifications',
    thisDeviceOnly: 'Sur cet appareil uniquement.',
    iosNeedsInstall:
      'Sur iPhone et iPad, les notifications ne fonctionnent qu’une fois l’application installée. Touche le bouton de partage, puis « Sur l’écran d’accueil », et reviens ici depuis l’icône.',
    unsupported: 'Ce navigateur ne sait pas recevoir de notifications.',
    needsAccount: 'Il faut un compte : une invitation s’adresse à quelqu’un.',
    refused:
      'Les notifications ont été refusées pour ce site. Le navigateur ne redemandera pas — il faut les réautoriser dans ses réglages, à côté de l’adresse du site.',
    active: 'Cet appareil est prévenu.',
    whenWaiting: 'Quand quelqu’un t’attend',
    whenWaitingHint:
      'Une partie proposée, une demande d’ami, un coup joué contre toi en correspondance.',
    dailyChallenge: 'Défi du jour',
    dailyChallengeHint: 'Un rappel en fin de journée, si tu n’y as pas encore touché.',
    sendTest: 'Envoyer un essai',
    stop: 'Ne plus recevoir',
    blurb:
      'Être prévenu quand un ami t’invite à jouer, et rappelé du défi du jour. Rien d’autre : ni actualités, ni relances.',
    enable: 'Activer les notifications',
  },

  settings: {
    title: 'Préférences',
    subtitle: 'Tout s’applique immédiatement et reste enregistré dans ton navigateur.',
    tabsLabel: 'Familles de réglages',
    tabs: {
      apparence: 'Apparence',
      echiquier: 'Échiquier',
      son: 'Son et voix',
      ia: 'Assistant IA',
      notifications: 'Notifications',
    },

    appearance: 'Apparence',
    theme: 'Thème',
    themeHint: 'Change l’ambiance de toute l’application.',
    themes: {
      aurora: 'Sombre',
      clair: 'Clair',
    },

    board: 'Échiquier',
    boardTexture: 'Damier',
    pieceSet: 'Jeu de pièces',
    pieceSetHint: 'Tous sous licence libre — voir la page Crédits.',
    display: 'Affichage',
    defaultView: 'Vue par défaut',
    pieceMaterial: 'Matériau des pièces',
    material: 'Matériau',
    pieceColours: 'Couleur des pièces',
    whitePiecesColour: 'Couleur des pièces blanches',
    blackPiecesColour: 'Couleur des pièces noires',
    white: 'Blancs',
    black: 'Noirs',
    colours3dOnly:
      'Ne concerne que la vue 3D : les pièces 2D sont des dessins vectoriels aux couleurs fixes.',

    coordinates: 'Coordonnées',
    coordinatesHint: 'Lettres et chiffres sur les bords de l’échiquier.',
    legalMoveHints: 'Coups légaux',
    legalMoveHintsHint: 'Affiche les cases où la pièce sélectionnée peut aller.',
    safetyHints: 'Coups colorés selon le danger',
    safetyHintsHint:
      'Vert : la pièce y est en sécurité. Rouge : elle serait perdue. Doré : le coup gagne du matériel. Une béquille d’apprentissage — désactive-la dès que tu vois ces choses tout seul.',
    memo: 'Mémo avant chaque coup',
    memoHint:
      'Quatre questions sous l’échiquier : ce que son coup a changé, ce qu’il attaque, ce que ton coup laisse en prise, ce que tient son coup le plus méchant. Aucune réponse donnée — c’est une discipline, pas une assistance, et elle reste disponible en partie classée.',
    openingName: 'Nom de l’ouverture en partie',
    openingNameHint:
      'Affiche le nom de l’ouverture jouée, mis à jour à chaque coup. C’est la façon la plus efficace d’apprendre les noms : on les voit sur ses propres parties.',
    announceOpening: 'Annoncer l’ouverture à voix haute',
    announceOpeningHint: 'Le coach prononce le nom quand il change.',
    commentary: 'Mode commenté',
    commentaryHint:
      'Après chaque coup, le moteur montre ce que tu aurais pu jouer, avec les trois meilleures options et la raison de chacune. Indisponible en partie contre un ami.',
    commentaryPause: 'Attendre que tu aies lu',
    commentaryPauseHint:
      'En mode commenté, l’adversaire patiente après chaque coup jusqu’à ce que tu dises « Continuer ». Sans cette pause il répond en une seconde, et le commentaire décrit une position déjà dépassée.',
    lastMoveHighlight: 'Surligner le dernier coup',
    notation: 'Écriture des coups',
    notationLetters: 'Lettres — Cf3, Dxd5+',
    notationFigurine: 'Figurine — ♘f3, ♕xd5+',
    notationHint:
      'La notation figurine est celle des livres et des revues : elle ne dépend d’aucune langue, et on apprend au passage des symboles qu’on retrouve partout.',
    whiteAlwaysBottom: 'Les Blancs toujours en bas',
    whiteAlwaysBottomHint:
      'Fige le sens de l’échiquier au lieu de le retourner selon ta couleur. Les diagrammes des livres et des leçons sont presque tous vus des Blancs.',
    highlightCheck: 'Signaler l’échec',
    highlightCheckHint: 'Halo rouge autour du roi attaqué.',
    premove: 'Pré-coups',
    premoveHint: 'Jouer pendant le tour de l’adversaire ; le coup part dès qu’il a joué.',
    evalBarInGame: 'Barre d’évaluation en partie',
    evalBarInGameHint:
      'Déconseillé : voir l’évaluation pendant qu’on joue empêche d’apprendre à évaluer soi-même.',
    animationSpeed: 'Vitesse d’animation',
    animationInstant: 'instantané',

    effects: 'Effets visuels',
    effectsHint: 'Réduis les effets si l’interface saccade.',
    effectsHigh: 'Spectaculaires',
    effectsLow: 'Performance',
    effectsDetail:
      'En mode spectaculaire : verre dépoli, ombres portées, halos, reflets et ombres de contact en 3D. En mode performance, tout cela est désactivé — l’application reste identique, simplement plus sobre et beaucoup plus légère.',

    sound: 'Son et voix',
    soundEffects: 'Bruitages',
    soundEffectsHint: 'Un son différent selon qu’on déplace, capture ou donne échec.',
    voiceEnabled: 'Commentaire vocal',
    voiceEnabledHint: 'Le coach lit ses explications à voix haute pendant les leçons et l’analyse.',
    volume: 'Volume',
    speechEngine: 'Moteur de synthèse',
    engineNeural: 'Voix neuronale (recommandé)',
    engineSystem: 'Voix du navigateur',
    engineHint:
      'La voix neuronale est calculée par ton propre serveur, hors ligne et sans service tiers. Elle est nettement plus naturelle, mais démarre avec une fraction de seconde de retard.',
    neuralVoice: 'Voix neuronale',
    neuralVoiceFirst: 'Première voix disponible',
    browserVoiceFallback: 'Voix du navigateur (secours)',
    voiceSelect: 'Voix',
    systemDefaultVoice: 'Voix par défaut du système',
    voiceOnline: '(en ligne)',
    noVoices:
      'Aucune voix détectée pour cette langue. Installe un pack vocal depuis les réglages de ton système.',
    voiceRate: 'Débit',
    voicePitch: 'Hauteur',
    announceMoves: 'Annoncer chaque coup',
    announceMovesHint:
      'Lit à voix haute le coup joué — « cavalier f3 », « prend en e5 », « échec ». Utile pour jouer sans regarder l’écran en permanence.',
    testVoice: 'Tester la voix',
    testVoiceNeural: 'Voix neuronale',
    testVoiceBrowser: 'Voix du navigateur',
    neuralUnavailable:
      'Voix neuronale indisponible : le serveur ne propose aucune voix installée. Lance',
    neuralUnavailableAfter: 'puis redémarre le serveur.',

    language: 'Langue',
    languageHint:
      'L’interface. Les leçons, les explications de coups et le glossaire restent en français ou en anglais — ce sont des textes rédigés, pas des étiquettes.',
    languageGroupLabel: 'Langue de l’interface',
    languageCoverage:
      'Le français et l’anglais sont complets. Les autres langues sont en cours : ce qui n’est pas encore traduit s’affiche en anglais, phrase par phrase.',

    account: 'Compte',
    reset: 'Rétablir les réglages par défaut',
    resetConfirm: 'Rétablir tous les réglages par défaut ?',
    preview: 'Aperçu en direct',
    previewHint:
      'Damier « {damier} », pièces « {pieces} ». Clique une pièce pour voir les indications de coups légaux.',
  },

  editor: {
    title: 'Éditeur de position',
    hint: 'Reproduis une position vue ailleurs, puis analyse-la ou joue-la.',
    needAKing: 'Il faut un roi de chaque couleur.',
    oneKingEach: 'Il ne peut y avoir qu’un roi par couleur.',
    pawnOnEdge: 'Un pion ne peut pas être sur la première ni la dernière rangée.',
    impossible: 'Position impossible : un roi est peut-être déjà en prise.',
    incomplete: 'Position incomplète.',
    startingPosition: 'Position de départ',
    analyseThis: 'Analyser cette position',
    playVsComputer: 'La jouer contre l’ordinateur',
    pieceToPlace: 'Pièce à poser',
    fenAria: 'Position au format FEN',
  },

  board: {
    title: 'Échiquier électronique',
    hint: 'Jouez sur votre plateau, la partie suit.',
    connect: 'Brancher un échiquier électronique',
    disconnect: 'Débrancher',
    upsideDown: 'Plateau posé à l’envers — c’est pris en compte, rien à changer.',
    noLeds:
      'Cette carte n’a pas de LEDs : les cases à corriger sont listées ici plutôt que montrées sur le plateau.',
    toFix: 'À corriger',
    pieceInHand: 'Pièce en main',
    ready: 'Prêt',
  },

  explain: {
    noExplanation:
      'Pas d’explication pour « {cle} » — c’est un cas que l’application ne sait pas encore nommer.',
    yourGamesBefore: 'Tes parties :',
    yourGamesAfter: ', pour',
    pointsScored: '% de points marqués.',
    endedThusBefore: 'Tes parties finies ainsi :',
    endedThusMiddle: ', dont',
    wonSuffix: 'gagnées.',
    wonSuffixOne: 'gagnée.',
    definingMoves: 'Les coups qui la définissent',
    youPlayedItBefore: 'Tu l’as jouée',
    youPlayedItAfter: 'fois — dont',
    inGlossary: 'Voir « {terme} » dans le glossaire',
    readingBook: 'Lecture du livre d’ouvertures…',
    notInBook:
      'Cette ouverture n’est pas dans le livre : elle vient du nom enregistré avec la partie.',
    withWhite: '{n} avec les Blancs — pour',
    exploreOpening: 'Explorer cette ouverture',
  },

  homeIn: {
    won: 'Gagnée',
    lost: 'Perdue',
    seeTheMap: 'Voir la carte',
    streakTitle: 'Jours d’affilée avec au moins une quête faite',
    yourPath: 'Ton parcours',
    careerDone: 'Carrière terminée 👑',
    startCareer: 'Commence ta carrière',
    careerBlurb: 'Douze chapitres, du premier coup à la première victoire nette.',
    reviewPath: 'Revoir le parcours',
    start: 'Commencer',
    lastGames: 'Tes dernières parties',
    noGameSaved: 'Aucune partie enregistrée.',
    playAGame: 'Jouer une partie',
    unlistedOpening: 'ouverture non répertoriée',
    halfMoves: '{n} demi-coups',
    yourAnalyses: 'Tes analyses',
    noOpeningListed: 'sans ouverture répertoriée',
    getAnalysed: 'Fais analyser une partie',
    getAnalysedHint:
      'Coup par coup, ce qui a basculé et pourquoi — avec le meilleur coup montré sur l’échiquier. Tes analyses restent ici.',
    analyseAGame: 'Analyser une partie',
  },

  daily: {
    title: 'Le défi du jour',
    questsDone:
      '{faites} quêtes sur {total} · {xp} / {max} points · la prochaine position arrive à minuit',
    oneQuestDone:
      '{faites} quête sur {total} · {xp} / {max} points · la prochaine position arrive à minuit',
    drawing: 'Tirage du jour…',
    unavailable:
      'Le défi du jour n’est pas disponible — la base de puzzles n’est peut-être pas encore importée.',
    hint: 'La même position pour tout le monde de ton niveau, jusqu’à minuit.',
    doneToday: 'Défi du jour relevé',
    harder: 'Plus dur :',
    otherQuests: 'Les autres quêtes du jour',
    pointsAria: 'Points du jour',
    collapse: 'Replier le défi du jour',
    done: 'Défi relevé',
    findTheMove: 'Trouve le coup gagnant',
    tierLevel: '{tranche} · niveau {cote}',
    levelOnly: 'Niveau {cote}',
    comeBackTomorrow: ' · reviens demain',
    onePosition: ' · une seule position',
    needsAccount: 'Le défi du jour demande un compte — gratuit, et sans publicité.',
    needsAccountHint:
      'Il est le même pour tout le monde et compte pour ta série : sans compte, on ne saurait ni à qui l’attribuer, ni la retrouver demain. Jouer, apprendre et analyser restent accessibles sans rien créer.',
  },

  auth: {
    signIn: 'Connexion',
    signUp: 'Créer un compte',
    username: 'Pseudo',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    passwordConfirm: 'Confirme le mot de passe',
    submitSignIn: 'Se connecter',
    submitSignUp: 'Créer mon compte',
    noAccount: 'Pas encore de compte ?',
    hasAccount: 'Déjà inscrit ?',
    orGuest: 'ou continue sans compte',
    emailOptional: 'facultatif — sert uniquement à récupérer ton mot de passe',
    usernameHint: '3 à 20 caractères : lettres, chiffres, tiret et souligné.',
    passwordHint: '8 caractères minimum.',
    signInTitle: 'Content de te revoir',
    signUpTitle: 'Rejoins **Le Coup Parfait**',
    signInBlurb: 'Retrouve ton classement, tes parties et ta progression.',
    signUpBlurb: 'Un pseudo, un mot de passe. C’est tout, et c’est gratuit pour toujours.',
    usernameHintLong: '3 à 20 caractères : lettres, chiffres, tiret, souligné.',
    passwordHintLong: '8 caractères minimum. La longueur compte plus que les symboles.',
    forgotPassword: 'Mot de passe oublié ?',
    emailHint:
      'Facultatif. Uniquement pour récupérer ton mot de passe si tu l’oublies — tu la confirmeras depuis ton profil, quand tu voudras. Jamais transmise à personne.',
    emailHintNoMail:
      'Facultatif — et pour l’instant sans usage : ce serveur n’envoie pas encore de courriel, donc un mot de passe perdu ne peut pas être récupéré. Choisis-en un dont tu te souviendras.',
    trySuggestion: 'Essayer « {pseudo} »',
    continueWithout: 'ou continue sans compte →',
    whatAccountAdds:
      'Jouer, apprendre, résoudre des puzzles et analyser tes parties fonctionne entièrement sans inscription. Le compte ajoute le mode carrière, tes analyses conservées, le défi du jour, ta série, ton classement par cadence et l’historique de tes parties.',
    invitesYou: '{pseudo} t’invite à jouer',
    pickNameAndPlay: 'Choisis un pseudo et entre dans la partie. Pas besoin de compte.',
    yourName: 'Ton pseudo',
    play: 'Jouer',
    orSignUpBelow:
      'Ou crée un compte ci-dessous : {pseudo} entrera dans ton carnet, et tu garderas ton classement d’une partie à l’autre.',
    gameFailed: 'Impossible de lancer la partie.',
    serverUnreachable: 'Le serveur est injoignable.',
    accountsUnreachable:
      'Le service de comptes est injoignable. Tu peux continuer à jouer sans compte.',
    welcome: 'Bienvenue, {pseudo}.',
    welcomeBack: 'Content de te revoir, {pseudo}.',
    language: 'Langue',
    languageHint:
      'Celle de ton compte : tu la retrouveras sur n’importe quel appareil où tu te connectes. Modifiable à tout moment dans les préférences.',
    welcomeHint: 'Ton compte est créé. Quelques réglages, et tu joues.',
    skipAll: 'Passer, je réglerai plus tard',
    nothingFinal: 'Tout se retrouve dans tes préférences et sur ton profil. Rien n’est définitif.',
    avatarTitle: 'Voici ton avatar',
    avatarHint:
      'Tiré au sort, pour que ta ligne se repère dans une liste d’amis dès le premier jour. Touche-en un autre si celui-là ne te va pas.',
    avatarYours: 'Ton avatar',
    avatarPick: 'Choisir cet avatar',
    avatarFailed: 'Changement impossible.',
    levelTitle: 'Tu en es où, à peu près ?',
    levelHint:
      'Ça règle l’adversaire qu’on te proposera en premier. Sans réponse, on part du plus faible — ce qui n’a aucun intérêt si tu joues déjà. Ton classement, lui, se gagnera en jouant.',
    levelBeginner: 'Je débute',
    levelBeginnerHint: 'Je découvre, ou je connais juste les règles.',
    levelCasual: 'Je joue de temps en temps',
    levelCasualHint: 'En famille, entre amis, sans travailler.',
    levelRegular: 'Je joue régulièrement',
    levelRegularHint: 'En ligne, je gagne à peu près une partie sur deux.',
    levelClub: 'Je joue en club',
    levelClubHint: 'J’ai des ouvertures, je vois les tactiques courantes.',
    levelStrong: 'Je suis un joueur fort',
    levelStrongHint: 'Classé, ou l’équivalent en ligne.',
    eloTitle: 'Quel est ton classement ?',
    eloHint:
      'Ton Elo, si tu le connais — celui de ta fédération, ou celui d’un autre site. Il règle l’adversaire qu’on te proposera en premier, et rien d’autre : ton classement ici se gagnera en jouant.',
    eloField: 'Mon classement',
    orPlaceYourself: 'Ou situe-toi à peu près',
    orYourRating: 'Ou ton classement :',
    yourEloAria: 'Ton classement Elo',
    dontKnow: 'Je ne sais pas — mesure-le',
    dontKnowHint:
      'Douze positions, six minutes. Aucune réponse à trouver sur soi-même, et rien n’est envoyé à ton classement.',
    firstOpponentBefore: 'Premier adversaire proposé :',
    firstOpponentLevel: 'niveau {niveau}',
    firstOpponentElo: 'environ {elo} Elo',
    firstOpponentAfter: 'Les {paliers} paliers restent accessibles au curseur, dans les deux sens.',
    themeTitle: 'Choisis ton ambiance',
    themeHint:
      'Le changement est immédiat, tu vois ce que tu choisis. « Contraste » est là pour les écrans en plein soleil et pour les vues fatiguées.',
    coachTitle: 'Le coach doit-il t’accompagner ?',
    coachHint:
      'C’est ce qui distingue cette application d’un simple échiquier : après chaque coup, ce qu’il valait, ce que tu pouvais jouer, et pourquoi.',
    coachCommentaryHint:
      'Recommandé pour débuter. Ça se coupe en pleine partie, d’un clic sur le panneau.',
    coachVoice: 'Lire les explications à voix haute',
    coachVoiceHint:
      'Pratique pour garder les yeux sur l’échiquier. Sans effet si ton appareil est en silencieux.',
    notificationsTitle: 'Être prévenu quand un ami t’invite',
    notificationsHint:
      'Une invitation expire en cinq minutes : sans notification, elle meurt dans un téléphone resté dans une poche. Rien d’autre ne te sera envoyé — ni actualités, ni relances.',
    notificationsOn: 'C’est activé sur cet appareil.',
    notificationsEnable: 'Activer les notifications',
    notificationsRefused:
      'Ton navigateur les a refusées pour ce site et ne redemandera pas. Ça se réautorise à côté de l’adresse du site.',
    installManualTitle: 'Pose-la sur ton écran d’accueil',
    installManualHint:
      'Touche le bouton de partage de ton navigateur, puis « Sur l’écran d’accueil ». Sur iPhone et iPad, c’est aussi ce qui débloque les notifications — sans quoi tu ne sauras pas qu’un ami t’a invité.',
    installNoStore:
      'Rien à télécharger sur un magasin : c’est le même site, posé à côté de tes autres applications.',
    installTitle: 'Installe l’application',
    installHint:
      'Une icône sur ton écran d’accueil, plein écran, sans barre d’adresse. Rien à télécharger sur un magasin : c’est le même site.',
    install: 'Installer',
    installDone: 'C’est fait, ou ton navigateur s’en charge depuis son propre menu.',

    errors: {
      usernameTaken: 'Ce pseudo est déjà pris.',
      invalidCredentials: 'Pseudo ou mot de passe incorrect.',
      weakPassword: 'Mot de passe trop court (8 caractères minimum).',
      invalidUsername: 'Pseudo invalide : 3 à 20 caractères alphanumériques.',
      usernameTooShort: 'Pseudo trop court : trois caractères au minimum.',
      usernameTooLong: 'Pseudo trop long : vingt caractères au maximum.',
      // Le pseudo sert d'adresse au profil : le dire explique la restriction
      // au lieu de la faire subir.
      usernameCharacters:
        'Un pseudo n’accepte ni espace ni accent : il sert d’adresse à ton profil. Lettres, chiffres, tiret et souligné uniquement.',
      linkExpired: 'Ce lien a expiré ou ne correspond à rien. Demande-en un nouveau.',
      emailTaken: 'Cette adresse est déjà utilisée.',
      generic: 'Quelque chose s’est mal passé. Réessaie.',
    },
  },

  about: {
    licence: 'Logiciel libre · AGPL-3.0',
    title: 'À propos du Coup Parfait',
    whatBefore: 'Le Coup Parfait est une plateforme d’échecs conçue pour',
    whatStrong: 'apprendre',
    whatAfter:
      ', pas seulement pour jouer. La différence tient en une chose : quand tu fais une erreur, l’outil ne se contente pas d’afficher un nombre — il te dit ce que tu as raté, avec les mots que les joueurs d’échecs utilisent entre eux.',
    freeTitle: 'Pourquoi c’est gratuit',
    free1:
      'Parce que rien ici ne coûte cher. Le moteur — Stockfish — est libre et gratuit. Les jeux de données d’ouvertures et de puzzles sont dans le domaine public, offerts par Lichess. Les pièces et les sons sont sous licence libre. La synthèse vocale est celle de ton système d’exploitation, elle ne passe par aucun service payant.',
    free2:
      'Il ne reste que l’hébergement, et cette application est faite pour tourner sur une machine modeste. Il n’y a donc aucune fonctionnalité payante, aucun abonnement, aucune limite quotidienne — et rien de tout cela n’est prévu pour plus tard.',
    dataTitle: 'Ce qu’il advient de tes données',
    data1:
      'Aucun traqueur, aucune publicité, aucun outil d’analyse d’audience. Aucune requête n’est envoyée à un domaine tiers : même les polices de caractères sont servies depuis ce serveur, précisément pour que ton adresse IP ne parte pas ailleurs.',
    data2:
      'Tes préférences vivent dans ton navigateur. Si tu crées un compte, on stocke un pseudo, une empreinte de mot de passe, tes classements et tes parties — rien d’autre. L’adresse e-mail est facultative et ne sert qu’à récupérer un mot de passe oublié.',
    howTitle: 'Comment ça marche',
    how1: 'Deux moteurs travaillent ensemble. Dans ton navigateur, une version WebAssembly de Stockfish donne un avis instantané après chaque coup, sans rien envoyer nulle part. Sur le serveur, une version native tourne à pleine puissance pour les analyses de partie complètes.',
    how2Before: 'Les explications, elles, ne viennent pas d’un modèle de langue mais d’un',
    how2Strong: 'analyseur géométrique',
    how2After:
      'écrit pour ce projet : il reconnaît sur l’échiquier les fourchettes, clouages, enfilades, pions passés, avant-postes — une quarantaine de motifs — et rédige à partir de là. Conséquence directe : ce qu’il affirme est toujours vérifiable sur l’échiquier, et la même position produit toujours la même explication.',
    selfHostTitle: 'Héberge-le toi-même',
    selfHostBefore:
      'Le code est sous licence AGPL. Tu peux le télécharger, le modifier et le faire tourner chez toi — un',
    selfHostAfter:
      'suffit. C’est même l’usage prévu : une instance pour toi et tes amis, sans dépendre de personne.',
    numbersTitle: 'En quelques chiffres',
    openings: 'ouvertures nommées',
    puzzles: 'puzzles tactiques',
    lessons: 'leçons guidées',
    levels: 'niveaux d’adversaires',
    personalities: 'personnalités, chacune son style',
    chapters: 'chapitres de carrière',
    words: 'mots définis en langage clair',
    tablebases: 'pièces : les finales jouées à la perfection',
    credits: 'Crédits & licences des ressources utilisées',
  },

  lesson: {
    stepOf: 'Étape {n} / {total}',
    wrongMove: 'Ce n’est pas le coup attendu. Réessaie.',
    cannotShow: 'Impossible de montrer le coup ici.',
    notFound: 'Leçon introuvable',
    notFoundHint: 'Cette leçon n’existe pas ou a été renommée.',
    backToCurriculum: 'Retour au programme',
    yourTurn: 'À toi de jouer.',
    coach: 'Le coach',
    muteCoach: 'Couper la voix du coach',
    unmuteCoach: 'Activer la voix du coach',
    replay: 'Réécouter',
    previous: 'Précédent',
    nextLesson: 'Leçon suivante',
    replayStep: 'Rejouer cette étape',
  },

  lessonExtra: {
    theMoveWas: 'Le coup était {coup}. Joue-le pour continuer.',
    showMe: 'Montre-moi',
    finish: 'Terminer',
    carryOn: 'Continuer',
  },

  draw: {
    title: 'Tirage au sort',
    intro:
      'Les couleurs d’une partie, les paires d’une ronde, l’ordre de passage. Un tirage que tout le monde voit, et personne ne conteste.',
    what: 'Quoi tirer',
    colours: 'Couleurs',
    pairs: 'Paires',
    firstPlayer: 'Premier joueur',
    secondPlayer: 'Second joueur',
    player1: 'Joueur 1',
    player2: 'Joueur 2',
    drawAgain: 'Retirer',
    white: 'Blancs',
    black: 'Noirs',
    hasColour: 'a les {couleur}',
    playersCount: '{n} joueurs',
    onePlayer: '{n} joueur',
    table: 'Table {n}',
    sitsOut: 'ne joue pas cette ronde.',
    drawOrder: 'Tirer l’ordre',

    order: 'Ordre de passage',
    drawColours: 'Tirer les couleurs',
    result: 'Résultat du tirage',
    playersOnePerLine: 'Les joueurs, un par ligne',
    noName: 'Aucun nom pour l’instant.',
    oddNumber: '— nombre impair, il y aura un exempt.',
    redoPairs: 'Refaire les paires',
    makePairs: 'Former les paires',
    tables: 'Les tables',
    reshuffle: 'Remélanger',
  },

  arena: {
    soloTitle: 'Tournoi contre l’ordinateur',
    howMany: 'Combien d’adversaires',
    opponentsCount: '{n} adversaires',
    gamesToPlay: '{n} parties à jouer',
    theirStrength: 'Leur force',
    level: 'Niveau',
    randomRange: 'Les adversaires seront tirés entre {min} et {max} Elo environ.',
    sameStrength: 'Tous les adversaires vaudront environ {elo} Elo.',
    opponentMissing: 'Adversaire introuvable.',
    roundOf: 'Ronde {n} sur {total}',
    rankOf: '{rang}ᵉ sur {total}, avec {points} points.',
    rankOfOne: '{rang}ᵉ sur {total}, avec {points} point.',
    newTournament: 'Nouveau tournoi',
    standings: 'Classement',
    gamesPlayed: '{n} parties',
    oneGamePlayed: '{n} partie',
    yourRound: 'Ronde {n} · ta partie',
    youPlay: '{elo} Elo · tu joues les {couleur}',
    round: 'Ronde {n}',

    back: '← Retour aux tournois',
    onlyHuman:
      'Tu es le seul humain. Tu affrontes chaque adversaire une fois, et le classement se fait aux points — comme dans un vrai toutes rondes.',
    levelHint: 'Le niveau sert de repère : en aléatoire, chaque adversaire est tiré autour de lui.',
    variedStrengths: 'Forces variées',
    sameLevel: 'Tous au même niveau',
    aroundLevel: 'Autour du niveau',
    composeField: 'Composer le plateau',
    recompose: 'Recompose le plateau.',
    yourTournament: 'Ton tournoi',
    youWin: 'Tu gagnes le tournoi.',
    tryStronger: 'Reprends avec un plateau plus fort — c’est là qu’on apprend.',
    fullStandings: 'Le classement complet est ci-dessous, partie par partie.',
    abandon: 'Abandonner ce tournoi',
    playThisGame: 'Jouer cette partie',
    results: 'Résultats',
    simulatedTitle: 'Résultat tiré selon l’écart de classement, la partie n’a pas été jouée.',
    simulated: 'simulé',
  },

  studies: {
    title: 'Mes études',
    hint: 'Range des positions commentées : tes ouvertures, une partie à comprendre, un thème de finale.',
    needsAccount: 'Les études demandent un compte',
    needsAccountHint:
      'Une étude t’appartient et se retrouve d’une session à l’autre : il faut donc savoir à qui elle est.',
    createFailed: 'Création impossible.',
    newTitlePlaceholder: 'Titre de l’étude — « Ma défense contre 1.e4 »',
    newTitleAria: 'Titre de la nouvelle étude',
    create: 'Créer',
    empty:
      'Aucune étude pour l’instant. Commence par celle qui te servira le plus : l’ouverture que tu joues et que tu ne comprends pas encore.',
    chapters: '{n} chapitres',
    oneChapter: '{n} chapitre',
    updatedOn: ' · modifiée le ',
    shareable: 'Partageable par lien',
    private: 'Privée',
    shareableShort: 'Partageable',
    linkCopied: 'Lien copié.',
    linkCopiedHint: 'L’étude est désormais accessible à qui l’ouvre.',
    copyRefused: 'Copie refusée.',
    copyRefusedHint: 'Sélectionne l’adresse à la main.',
    notFound: 'Étude introuvable',
    notFoundHint: 'Elle n’existe pas, ou son auteur ne l’a pas partagée.',
    noMoveYet: 'Aucun coup pour l’instant.',
    noNoteOnMove: 'Pas de note sur ce coup.',
    copiedShort: 'Lien copié',
    share: 'Partager',
    playMoves: 'Joue les coups sur l’échiquier : ils s’ajoutent au chapitre.',
    browseMoves: 'Navigue dans les coups du chapitre.',
    addChapter: 'Ajoute un chapitre pour commencer : chaque chapitre est une position et sa suite.',
    noChapter: 'Cette étude ne contient encore aucun chapitre.',
    commentedMove: 'Ce coup est commenté',
    noteOnStart: 'Note sur la position de départ',
    noteOnMove: 'Note sur ce coup',
    notePlaceholder: 'Pourquoi ce coup ? Qu’est-ce qu’il prépare ?',
    noteAria: 'Commentaire du coup',
    deleteChapter: 'Supprimer ce chapitre',
  },

  reset: {
    incompleteLink: 'Lien incomplet',
    incompleteLinkHint: 'Ouvre le lien tel qu’il apparaît dans le courriel, sans le retaper.',
    askNewLink: 'Demander un nouveau lien',
    title: 'Nouveau mot de passe',
    rule: 'Huit caractères au minimum. C’est la seule règle.',
    newPassword: 'Nouveau mot de passe',
    repeat: 'Répète-le',
    mismatch: 'Les deux mots de passe ne sont pas identiques.',
    failed: 'Réinitialisation impossible.',
    changed: 'Mot de passe changé.',
    changedHint: 'Connecte-toi avec le nouveau.',
    serverUnreachable: 'Le serveur est injoignable.',
    sessionsClosed:
      'Toutes les sessions ouvertes seront fermées, y compris sur les autres appareils. Tu devras te reconnecter partout.',
    saving: 'Enregistrement…',
    submit: 'Changer mon mot de passe',
  },

  tournament: {
    notFound: 'Arène introuvable',
    notFoundHint: 'Elle n’existe pas, ou son adresse est incomplète.',
    allArenas: 'Toutes les arènes',
    nobodyRegistered: 'Personne d’inscrit pour l’instant.',
    over: 'Arène terminée. Le classement ci-dessous est définitif.',
    signIn: 'Connecte-toi',
    signInAfter: 'pour participer. Tu peux suivre le classement sans compte.',
    started: 'L’arène a commencé : tu peux rejoindre en cours, tu seras apparié au prochain tour.',
    startsAt: 'Départ {heure}.',
    gameRunning: 'Ta partie est en cours — tu y es conduit automatiquement.',
    inQueue: 'En file d’attente. Dès qu’un adversaire est libre, tu es apparié.',
    registered: 'Inscrit. L’arène démarrera à l’heure prévue.',
    takeABreak: 'Faire une pause',
    paused: 'En pause. Tes points sont conservés — reviens quand tu veux.',
    scoring:
      'Deux points par victoire, un par nulle. À partir de la deuxième victoire d’affilée, les points doublent — c’est ce qui rend l’arène rattrapable jusqu’au bout.',
  },

  watch: {
    intro:
      'Les parties en cours, celles qui cherchent un adversaire, et ce que tes amis jouent contre l’ordinateur.',
    serverDown: 'Serveur de parties injoignable',
    serverDownHint:
      'Impossible de savoir qui joue en ce moment. Vérifie que le serveur temps réel tourne.',
    noFriendPlaying: 'Aucun de tes amis ne joue en ce moment',
    noFriendPlayingHint:
      'Dès que l’un d’eux commence une partie, elle apparaîtra ici, et tu pourras la suivre coup par coup.',
    seeAllGames: 'Voir toutes les parties',
    nobodyPlaying: 'Personne ne joue en ce moment',
    nobodyPlayingHint:
      'Les parties commencées apparaîtront ici, et tu pourras les suivre coup par coup.',
    freeSeat: ' · une place libre',
    rated: ' · classée',
    gameGone:
      'La partie est peut-être terminée, ou elle date de plus de vingt minutes. Seules les parties de tes amis, fraîches, sont visibles ici.',
    notPlaying: '{pseudo} ne joue pas en ce moment',
    youAreWatching: 'Tu regardes la partie de',
    seeWhoPlays: 'Voir qui joue',
    readOnly: '. Lecture seule : tu ne peux pas jouer à sa place.',
  },

  tools: {
    clockBlurb:
      'Deux temps, un incrément, on tape son côté après avoir joué. Branchée sur un échiquier électronique, elle note la partie.',
    eloBlurb:
      'Ta cote, ton coefficient, tes parties : ce que le tournoi te rapporte ou te coûte, et ta performance. Au barème de la FIDE.',
    drawTitle: 'Tirage au sort',
    drawBlurb:
      'Qui a les Blancs, qui joue contre qui, dans quel ordre on passe. Un tirage que tout le monde voit.',
    arbiterTitle: 'Aide-mémoire d’arbitrage',
    arbiterBlurb:
      'Pièce touchée, coup illégal, drapeau, nulle réclamée : ce que disent les Règles du jeu de la FIDE, en une page.',
    intro:
      'Ce qui sert autour de l’échiquier plutôt que dessus : de quoi accompagner une partie jouée sur un vrai plateau, en face de quelqu’un.',
    seeThePage: 'Voir la page',
  },

  community: {
    title: 'Communauté',
    leaderboardBlurb:
      'Qui joue ici, et à quel niveau. Chaque cadence a le sien, et les puzzles comptent à part.',
    friendsBlurb:
      'Ton carnet : qui est en ligne, qui t’a défié, et le lien d’invitation à envoyer à quelqu’un qui n’a pas encore de compte.',
    statsBlurb:
      'Ce que tes parties disent de ton jeu : l’ouverture où tu marques le moins, la cadence qui te réussit, l’heure où tu joues mal.',
    intro:
      'Les autres joueurs, et ce que tu fais avec eux : se comparer, se retrouver, et regarder ce que tes parties disent de ton jeu.',
  },

  misc: {
    collapse: 'Réduire',
    readMore: 'Lire la suite',
    searchGlossary: 'Chercher un mot, ou une idée dans les définitions…',
    searchGlossaryAria: 'Chercher dans le glossaire',
    loading3d: 'Chargement de la 3D…',
    exitFullscreen: 'Quitter le plein écran',
    fullscreen: 'Plein écran',
    dailyQuest: 'Quête du jour',
    allQuestsDone: 'Toutes les quêtes du jour sont faites. La suivante arrive à minuit.',
    seeMyDay: 'Voir ma journée',
    backToQuests: 'Retour aux quêtes',
    opponentThinking: 'L’adversaire réfléchit…',
    yourTurn: 'À toi de jouer',
    whiteToMove: 'Trait aux Blancs',
    blackToMove: 'Trait aux Noirs',
    noRecentGame: 'Aucune partie standard récente sur ce compte.',
    fetchFailed: 'Récupération impossible.',
    readingPublic: 'Lecture des parties publiques…',
    notSaved: 'Ces parties ne sont pas enregistrées : elles disparaissent en quittant la page.',
    wonShort: 'gagnée',
    noResult: 'sans résultat',
    seeAtSource: 'Voir la partie chez la source',
    stopReading: 'Arrêter la lecture',
    listenDefinitionOf: 'Écouter la définition de « {quoi} »',
    listenDefinition: 'Écouter la définition',
    threeD: {
      unavailable: 'La vue 3D n’est pas disponible ici',
      interrupted: 'La vue 3D s’est interrompue',
    },
    yourAccountsElsewhere: 'Tes comptes ailleurs',
    accountsElsewhereHint:
      'L’analyse retrouve tes parties Chess.com et Lichess à partir du pseudo. Note-les ici une fois ; tu pourras toujours en chercher un autre sur le moment.',
    chesscomHandle: 'ton pseudo Chess.com',
    lichessHandle: 'ton pseudo Lichess',
    analyseOneOfThese: 'Analyser une de ces parties',
    challengeExpired: 'Défi expiré.',
    busyPlaying: 'Tu joues une partie : accepter t’emmène ailleurs.',
    careerSuffix: 'de carrière',
    nothingYet: 'Rien encore. La première leçon en rapporte {n}.',
    whereTheyComeFrom: 'D’où ils viennent',
    undetailed: 'non détaillés',
    footer:
      'Le Coup Parfait — logiciel libre sous licence AGPL-3.0. Aucune publicité, aucun traqueur, aucune donnée revendue.',
    wholeSection: 'toute la rubrique, présentée en grand',
  },

  quests: {
    daily: 'Résoudre le défi du jour',
    dailyAction: 'Chercher le coup',
    play: 'Jouer une partie',
    win: 'Gagner une partie',
    threePuzzles: 'Enchaîner 3 puzzles',
    threePuzzlesDetail: 'trois résolus dans la journée',
    solvePuzzles: 'Résoudre des puzzles',
  },

  last: {
    hide: 'Réduire',
    readMore: 'Lire la suite',
    wholeSection: 'toute la rubrique, présentée en grand',
    installTitle: 'Installe Le Coup Parfait',
    installIos:
      'Touche le bouton de partage, puis « Sur l’écran d’accueil ». C’est aussi ce qui débloque les notifications sur iPhone.',
    installBlurb:
      'Une icône sur ton écran d’accueil, plein écran, sans barre d’adresse. Rien à télécharger sur un magasin.',
    notifyTitle: 'Être prévenu quand un ami t’invite',
    notifyBlurb:
      'Une invitation expire en cinq minutes. Rien d’autre ne te sera envoyé, et ça se coupe d’un clic.',
    later: 'Plus tard',
    askWhatToSee: 'Qu’est-ce que j’aurais dû voir ?',
    askWhatThreatens: 'Que menace mon adversaire maintenant ?',
    askThePlan: 'Quel est le plan à partir d’ici ?',
    askWhatToWatch: 'À quoi dois-je faire attention ?',
    muteCoach: 'Couper la voix du coach',
    unmuteCoach: 'Activer la voix du coach',
    seatKept:
      'Ta place est gardée tant que ton adversaire n’attend pas devant l’échiquier. S’il est là, la partie se perd par abandon au bout de la moitié de la cadence.',
    clickOn: 'Clique sur',
    train: 's’entraîner',
    board: 'Échiquier',
    pointsCount: '{n} points',
    careerWord: 'de carrière',
    careerSuffix2: 'pts de carrière',

    deadLink: 'Ce lien ne mène à rien',
    deadLinkHint: 'L’analyse a peut-être cessé d’être partagée, ou le lien est incomplet.',
    howRatingWorks: 'Comment ce classement est calculé',
    seeThePage: 'Voir la page',
    confirming: 'Confirmation en cours…',
    andAlso: 'Et aussi',
    beforeYouPlay: 'Avant de jouer',
    tenSeconds: 'Dix secondes, dans cet ordre.',
    theirTurn: 'C’est à lui de jouer — profites-en pour faire le tour.',
    whatEachLooksAt: 'Ce que chaque question regarde',
    whyThisMove: 'Pourquoi ce coup ?',
    replayMove: 'Rejouer le coup',
    ratedShort: ' · classée',
    nowYourFriend: '{pseudo} est maintenant ton ami.',
    friendRequests: '{n} demandes d’ami',
    youCanChallenge: 'Tu peux le défier.',
    oneFriendRequest: 'Une demande d’ami',
    online: 'En ligne',
    friendsVsComputer: 'Tes amis, contre l’ordinateur',
    followGame: 'suivre la partie →',
    gameInProgress: 'Partie en cours',
    liveGameContinues: 'Ta partie en direct continue',
    gameGone:
      'La partie est peut-être terminée, ou elle date de plus de vingt minutes. Seules les parties de tes amis, fraîches, sont visibles ici.',
    seeWhoPlays: 'Voir qui joue',
    readOnly: '. Lecture seule : tu ne peux pas jouer à sa place.',
  },

  mail: {
    verifySubject: 'Confirme ton adresse, {pseudo}',
    hello: 'Bonjour {pseudo},',
    verifyCreated: 'Ton compte est créé : tu peux jouer et apprendre dès maintenant.',
    verifyOpenLink: 'Il reste à confirmer ton adresse, en ouvrant ce lien :',
    verifyValidity:
      'Le lien est valable vingt-quatre heures. Sans lui ton compte marche très bien, mais ton adresse ne pourra pas servir à retrouver ton mot de passe si tu le perds.',
    verifyNoTracking: 'Aucune lettre d’information, aucun traqueur, aucune donnée revendue.',
    verifyNotYou: 'Si tu n’es pas à l’origine de cette inscription, ignore ce message.',
    signature: 'Le Coup Parfait — logiciel libre sous licence AGPL-3.0.',
    resetSubject: 'Réinitialiser ton mot de passe',
    resetAsked:
      'Quelqu’un a demandé à réinitialiser le mot de passe de ce compte. Si c’est toi, ouvre ce lien pour en choisir un nouveau :',
    resetValidity: 'Le lien est valable une heure, et ne sert qu’une fois.',
    resetNotYou:
      'Si tu n’as rien demandé, ignore ce message : tant que le lien n’est pas ouvert, ton mot de passe reste inchangé.',
  },
  api: {
    unreadable: 'Requête illisible.',
    unknownAction: 'Action inconnue.',
    signInRequired: 'Connexion requise.',
    notFound: 'Introuvable.',
    unavailable: 'Indisponible.',
    readFailed: 'Lecture impossible.',
    actionFailed: 'Action impossible.',
    createFailed: 'Création impossible.',
    saveFailed: 'Enregistrement impossible.',
    deleteFailed: 'Suppression impossible.',
    nothingToDelete: 'Rien à supprimer.',
    computeFailed: 'Calcul impossible.',
    accountNotFound: 'Compte introuvable.',
    notYourOwnAccount: 'Cette action ne s’applique pas à ton propre compte.',
    passwordTooShort: 'Mot de passe trop court (8 caractères minimum).',
    gameNotFoundOrRated: 'Partie introuvable, ou classée — une partie classée ne s’efface pas.',
    unknownPurge: 'Purge inconnue.',
    purgeFailed: 'Purge impossible.',
    requestNotFound: 'Demande introuvable.',
    relationNotFound: 'Relation introuvable.',
    noMoveToAnalyse: 'Aucun coup à analyser.',
    gameTooLongAnalysis: 'Partie trop longue (300 demi-coups maximum).',
    fenRequired: 'Le champ « fen » est requis.',
    textRequired: 'Le champ « text » est requis.',
    tooManyRequests: 'Trop de demandes. Réessaie dans quelques minutes.',
    tooManyResends: 'Trop de renvois. Réessaie dans quelques minutes.',
    tooManyAttempts: 'Trop de tentatives. Réessaie dans quelques minutes.',
    tooManyInvites: 'Trop d’invitations envoyées. Réessaie dans quelques minutes.',
    noAddressOnFile: 'Aucune adresse enregistrée.',
    noMailYet: 'Ce serveur n’envoie pas encore de courriel.',
    unknownAvatar: 'Avatar inconnu.',
    unknownLanguage: 'Langue inconnue.',
    nameAndPasswordRequired: 'Pseudo et mot de passe sont requis.',
    accountsDown: 'Le service de comptes est indisponible. Tu peux continuer à jouer sans compte.',
    leaderboardDown: 'Le classement est momentanément indisponible.',
    gameNotFound: 'Partie introuvable.',
    notInYourList: 'Cette personne n’est pas dans ton carnet.',
    playerNotFound: 'Joueur introuvable.',
    dailyUnavailable: 'Le défi du jour est indisponible.',
    noPuzzleNpm: 'Aucun puzzle en base. Lance l’import :  npm run data:puzzles',
    noPuzzleNode: 'Aucun puzzle en base. Lance l’import :  node scripts/import-puzzles.mjs',
    pickAName: 'Choisis un pseudo.',
    inviteMatchesNobody: 'Ce lien d’invitation ne correspond à personne.',
    gameNotSaved: 'Partie non enregistrée.',
    challengeGoneOrExpired: 'Défi introuvable ou expiré.',
    challengeNotFound: 'Défi introuvable.',
    chapterNotFound: 'Chapitre introuvable.',
    studyNotFound: 'Étude introuvable.',
    requestTooLarge: 'Requête trop volumineuse.',
    unknownSource: 'Source inconnue.',
    invalidName: 'Pseudo invalide : lettres, chiffres, tirets et soulignés seulement.',
    directoryDown: 'Annuaire indisponible.',
    positionMissing: 'Position manquante.',
    gameServerDown: 'Le serveur de jeu est injoignable.',
    pushFailed: 'L’envoi a échoué. Vérifie les notifications dans les réglages du téléphone.',
    subscriptionIncomplete: 'Abonnement incomplet.',
    subscriptionAddressMissing: 'Adresse d’abonnement manquante.',
    notificationsUnconfigured: 'Les notifications ne sont pas configurées sur ce serveur.',
    deviceNotSubscribed: 'Cet appareil n’est pas abonné.',
    diagnosticUnavailable: 'Diagnostic indisponible.',
    noMoveToSave: 'Aucun coup à enregistrer.',
    gameTooLong: 'Partie trop longue.',
    stateMissing: 'État manquant.',
    gameMissing: 'Partie manquante.',
    gamesServerDown: 'Le serveur de parties est injoignable.',
    profilesDown: 'Le service de profils est indisponible.',
    levelMissing: 'Niveau manquant.',
    puzzlesDown: 'Le service de puzzles est indisponible.',
    fieldsMissing: 'Champs manquants.',
    unknownPuzzle: 'Puzzle inconnu.',
    invalidDay: 'Jour invalide.',
    statsUnavailable: 'Statistiques indisponibles.',
    tournamentNotFound: 'Tournoi introuvable.',
    tournamentGoneOrOver: 'Tournoi introuvable ou terminé.',
    neuralVoiceUnavailable: 'Voix neuronale indisponible.',
    neuralVoiceDown: 'Voix neuronale injoignable.',
    purgedSessions: 'sessions expirées',
    purgedEvaluations: 'évaluations sous 14 demi-coups, trop peu profondes pour resservir',
    purgedEmptyAccounts: 'comptes sans aucune partie ni analyse, inactifs depuis six mois',
  },
  motifs: {
    hangingPiece: {
      name: 'Pièce en prise',
      definition:
        "Une pièce attaquée qui n'est pas suffisamment défendue : l'adversaire peut la prendre en gagnant du matériel.",
    },
    fork: {
      name: 'Fourchette',
      definition:
        'Une seule pièce attaque simultanément deux cibles ou plus. Comme on ne peut sauver qu’une chose à la fois, on gagne l’autre.',
    },
    pin: {
      name: 'Clouage',
      definition:
        'Une pièce ne peut pas bouger sans exposer une pièce plus précieuse placée derrière elle. Si c’est le roi qui est derrière, elle ne peut légalement pas bouger du tout.',
    },
    skewer: {
      name: 'Enfilade',
      definition:
        'L’inverse du clouage : la pièce de valeur est devant. Elle doit fuir, et en fuyant elle abandonne celle qui se trouvait derrière.',
    },
    discoveredAttack: {
      name: 'Attaque à la découverte',
      definition:
        'En déplaçant une pièce, on dégage la ligne d’une autre qui frappe soudain une cible. Deux menaces naissent d’un seul coup.',
    },
    doubleCheck: {
      name: 'Échec double',
      definition:
        'Deux pièces donnent échec en même temps. Aucune parade ne suffit : le roi est obligé de bouger.',
    },
    removingTheDefender: {
      name: 'Élimination du défenseur',
      definition:
        'On capture ou on chasse la pièce qui défendait une cible, laquelle tombe au coup suivant.',
    },
    overloadedPiece: {
      name: 'Pièce surchargée',
      definition:
        'Une pièce assure seule deux tâches défensives. Détourne-la d’un côté et l’autre s’effondre.',
    },
    trappedPiece: {
      name: 'Pièce piégée',
      definition:
        'Une pièce attaquée qui n’a plus aucune case de fuite sûre : elle est perdue, même si personne ne l’a encore prise.',
    },
    backRankMate: {
      name: 'Mat du couloir',
      definition:
        'Le roi roqué est enfermé par ses propres pions sur sa dernière rangée. Une tour ou une dame qui arrive sur cette rangée fait mat.',
    },
    smotheredMate: {
      name: 'Mat étouffé',
      definition:
        'Le roi est totalement entouré de ses propres pièces ; seul un cavalier peut alors le mater, car lui seul saute par-dessus.',
    },
    mateIn1: {
      name: 'Mat en un',
      definition: 'Un seul coup met fin à la partie.',
    },
    mateIn2: {
      name: 'Mat en deux',
      definition: 'Un mat forcé en deux coups, quelles que soient les réponses adverses.',
    },
    mateIn3: {
      name: 'Mat en trois',
      definition: 'Un mat forcé en trois coups : aucune défense ne le repousse.',
    },
    mateThreat: {
      name: 'Menace de mat',
      definition: 'Un mat arrive au coup suivant si rien n’est fait.',
    },
    sacrifice: {
      name: 'Sacrifice',
      definition:
        'On abandonne volontairement du matériel pour obtenir autre chose : une attaque, une ligne ouverte, un roi exposé.',
    },
    promotion: {
      name: 'Promotion',
      definition: 'Un pion qui atteint la dernière rangée se transforme, presque toujours en dame.',
    },
    underPromotion: {
      name: 'Sous-promotion',
      definition:
        'Promouvoir en autre chose qu’une dame — souvent un cavalier pour donner un échec décisif, ou une tour pour éviter le pat.',
    },
    enPassant: {
      name: 'Prise en passant',
      definition:
        'Un pion qui avance de deux cases peut être capturé par un pion adverse comme s’il n’en avait avancé qu’une — et seulement au coup suivant.',
    },
    passedPawn: {
      name: 'Pion passé',
      definition:
        'Un pion qu’aucun pion adverse ne peut plus arrêter ni sur sa colonne, ni sur les colonnes voisines. Il vaut de l’or en finale.',
    },
    protectedPassedPawn: {
      name: 'Pion passé protégé',
      definition:
        'Un pion passé soutenu par un autre pion : l’adversaire ne peut même pas le bloquer avec son roi sans perdre.',
    },
    isolatedPawn: {
      name: 'Pion isolé',
      definition:
        'Un pion sans voisin sur les colonnes adjacentes : aucun pion ne peut le défendre, il faut une pièce pour ça.',
    },
    doubledPawns: {
      name: 'Pions doublés',
      definition:
        'Deux pions sur la même colonne : ils se gênent, avancent mal et défendent moins bien.',
    },
    backwardPawn: {
      name: 'Pion arriéré',
      definition:
        'Un pion resté en arrière que ses voisins ne peuvent plus soutenir, et dont la case d’avance est contrôlée par l’adversaire.',
    },
    outpost: {
      name: 'Avant-poste',
      definition:
        'Une case avancée, défendue par un pion, qu’aucun pion adverse ne peut attaquer. Un cavalier y est presque intouchable.',
    },
    bishopPair: {
      name: 'Paire de fous',
      definition:
        'Posséder les deux fous alors que l’adversaire n’en a qu’un : ils couvrent toutes les cases et deviennent redoutables en position ouverte.',
    },
    badBishop: {
      name: 'Mauvais fou',
      definition: 'Un fou bloqué par ses propres pions, tous placés sur des cases de sa couleur.',
    },
    openFile: {
      name: 'Colonne ouverte',
      definition:
        'Une colonne sans aucun pion : c’est l’autoroute des tours, qui y pénètrent dans le camp adverse.',
    },
    semiOpenFile: {
      name: 'Colonne semi-ouverte',
      definition: 'Une colonne sans pion à soi mais avec un pion adverse : une cible à attaquer.',
    },
    seventhRank: {
      name: 'Tour à la septième',
      definition:
        'Une tour sur la 7ᵉ rangée (2ᵉ pour les Noirs) mange les pions et enferme le roi. Deux tours y sont souvent gagnantes à elles seules.',
    },
    exposedKing: {
      name: 'Roi exposé',
      definition:
        'Un roi sans bouclier de pions et entouré de cases contrôlées par l’adversaire : l’attaque est en route.',
    },
    kingSafety: {
      name: 'Roi en sécurité',
      definition: 'Un roi roqué, protégé par ses pions, loin des lignes ouvertes.',
    },
    development: {
      name: 'Retard de développement',
      definition:
        'Des pièces encore sur leur case de départ. Chaque coup d’ouverture devrait en sortir une nouvelle.',
    },
    centreControl: {
      name: 'Contrôle du centre',
      definition:
        'Les quatre cases centrales : qui les tient dirige la partie, parce que les pièces y rayonnent dans toutes les directions.',
    },
    oppositeCastling: {
      name: 'Roques opposés',
      definition:
        'Les rois ont roqué de côtés opposés : chacun peut lancer ses pions à l’assaut du roi adverse sans exposer le sien. Les parties deviennent très tranchantes.',
    },
    fianchetto: {
      name: 'Fianchetto',
      definition:
        'Un fou développé en b2/g2 (ou b7/g7), derrière un pion avancé, qui balaie la grande diagonale.',
    },
    opposition: {
      name: 'Opposition',
      definition:
        'En finale de rois et pions, les rois se font face à une case d’écart. Celui qui n’a pas le trait gagne du terrain — c’est souvent tout ce qui décide la partie.',
    },
    rookBehindPasser: {
      name: 'Tour derrière le pion passé',
      definition:
        'Règle de Tarrasch : les tours se placent derrière les pions passés — les siens pour les pousser, ceux de l’adversaire pour les retenir.',
    },
    wrongBishop: {
      name: 'Fou de mauvaise couleur',
      definition:
        'Avec un pion de colonne « a » ou « h » et un fou qui ne contrôle pas la case de promotion, la finale est nulle même avec un pion de plus.',
    },
    kingActivity: {
      name: 'Roi actif',
      definition:
        'En finale, le roi devient une pièce d’attaque. Le centraliser vaut souvent plus qu’un pion.',
    },
    zugzwang: {
      name: 'Zugzwang',
      definition:
        'Être obligé de jouer alors que tout coup dégrade sa position. Passer son tour sauverait — mais c’est interdit.',
    },
    blockade: {
      name: 'Blocus',
      definition:
        'Poser une pièce juste devant un pion passé adverse pour l’immobiliser. Le cavalier est le meilleur bloqueur.',
    },
    spaceAdvantage: {
      name: 'Avantage d’espace',
      definition:
        'Contrôler plus de cases que l’adversaire : ses pièces se marchent dessus, les tiennes manœuvrent.',
    },
    xRayAttack: {
      name: 'Attaque en rayon X',
      definition:
        'Une pièce à longue portée agit à travers une autre : la menace existe déjà, avant même que la ligne soit dégagée.',
    },
  },
  qualites: {
    brilliant: {
      label: 'Brillant',
      description: 'Un sacrifice sain : du matériel donné, et la position le rend au centuple.',
    },
    great: {
      label: 'Coup unique',
      description: "Le seul coup qui tenait — toute autre option perdait une part de l'avantage.",
    },
    best: {
      label: 'Meilleur coup',
      description: 'Le premier choix du moteur.',
    },
    excellent: {
      label: 'Excellent',
      description: 'Aussi bon que le meilleur, à un écart imperceptible.',
    },
    good: {
      label: 'Bon coup',
      description: 'Un coup correct, qui ne coûte presque rien.',
    },
    book: {
      label: 'Théorie',
      description: "Un coup de la théorie d'ouverture, joué et rejoué depuis longtemps.",
    },
    forced: {
      label: 'Coup forcé',
      description: "Le seul coup légal : il n'y avait pas de choix à faire.",
    },
    inaccuracy: {
      label: 'Imprécision',
      description: "Jouable, mais inférieur : une part de l'avantage s'en va.",
    },
    mistake: {
      label: 'Erreur',
      description: "Une faute nette : l'évaluation bascule sensiblement.",
    },
    blunder: {
      label: 'Gaffe',
      description: "Une gaffe : du matériel perdu, ou la position compromise d'un coup.",
    },
    miss: {
      label: 'Occasion manquée',
      description: 'Une occasion manquée : un gain ou un mat était à portée.',
    },
  },
  bots: {
    novice: {
      devise: 'Je peux la prendre ?',
      contre:
        'Laisse-lui du matériel là où tu le reprends au coup suivant : il mord presque à chaque fois. Et développe tes pièces pendant qu’il ramasse — c’est la seule chose qu’il oublie de faire.',
      lore1:
        'Le premier tirage de la série, et le seul qu’on n’ait pas retouché. Le tilleul porte encore les traces de la gouge, les oreilles sont trop grandes pour l’encolure, et l’ensemble penche vers l’avant. Le sculpteur n’a rien corrigé : c’est de ce déséquilibre que vient l’air de vouloir avancer.',
      lore2:
        'Au tableau, cela donne quelqu’un qui voit une pièce à prendre et qui la prend. Pas par gourmandise — par confiance. Il n’a pas encore appris qu’une pièce peut être posée là exprès. C’est l’adversaire des premières parties, et il apprendra en même temps que toi.',
      name: 'Pion',
      blurb:
        'Apprend en même temps que toi. Il adore prendre des pièces, même quand il ne devrait pas.',
    },
    prudent: {
      devise: 'Après vous.',
      contre:
        'Ne lui donne pas les échanges qu’il attend : garde tes pièces, prends de l’espace, et ouvre un second front. Sa solidité tient tant qu’il n’a qu’un seul endroit à défendre.',
      lore1:
        'Taillé dans un bloc de granit gris-bleu qui avait passé l’hiver dehors ; la mousse prise dans les creux n’a pas été retirée. Les plaques de fer rivetées sur l’encolure n’ont jamais servi à rien — rien n’est jamais arrivé jusqu’à lui.',
      lore2:
        'Il roque tôt, échange dès qu’on le lui propose, et refuse tout ce qui ressemble à un risque. On ne perd pas contre Rempart sur une combinaison : on perd de fatigue, après avoir cherché pendant quarante coups une ouverture qui n’existait pas.',
      name: 'Rempart',
      blurb: 'Solide et patient. Il roque tôt, échange volontiers et ne prend aucun risque.',
    },
    fonceur: {
      devise: 'On verra après.',
      contre:
        'Ne recule pas devant les pions qui montent : chaque pion poussé est un pion qui ne reviendra pas défendre. Échange ses attaquants, tiens le centre, et son assaut devient une rangée de faiblesses.',
      lore1:
        'Coulé trop chaud, refroidi trop vite. Le bronze s’est fendu en séchant et la lumière sort encore des fissures. Le sculpteur a gardé la pièce ratée : aucune des suivantes n’avait ce mouvement — oreilles couchées, naseaux ouverts, déjà lancé.',
      lore2:
        'Il pousse ses pions vers ton roi sans se demander ce qu’il laisse derrière. Souvent cela passe, parce qu’une attaque qui arrive vite trouve rarement une défense prête. Quand cela ne passe pas, il ne lui reste plus de position du tout.',
      name: 'Brasier',
      blurb:
        "Attaque d'abord, réfléchit ensuite. Il pousse ses pions vers ton roi sans se retourner.",
    },
    tacticien: {
      devise: 'Tu as vu ce que tu viens de laisser ?',
      contre:
        'Une seule discipline suffit : après chacun de ses coups, regarde ce qui est en prise et ce qui vise quoi. Il ne crée pas les failles, il les ramasse.',
      lore1:
        'Cristal givré, taillé à facettes franches. Une seule fêlure traverse l’encolure de part en part : elle est arrivée au démoulage, elle n’était pas prévue, et c’est elle qu’on regarde en premier.',
      lore2:
        'Il ne cherche pas à mieux placer ses pièces — il attend. Une pièce non défendue, deux pièces sur la même diagonale, un roi qui a bougé une fois de trop : il trouve, et il trouve avant toi. Contre une position saine il n’a rien de particulier à dire ; c’est le désordre qu’il mange.',
      name: 'Éclair',
      blurb: 'Voit les combinaisons partout. Laisse une pièce en prise et tu le regretteras.',
    },
    positionnel: {
      devise: 'Rien ne presse.',
      contre:
        'Ne le laisse pas ranger tranquillement. Prends de l’espace tôt, crée un déséquilibre pendant qu’il finit son développement : il joue mal les positions qu’on ne peut pas mettre en ordre.',
      lore1:
        'Laiton patiné et palissandre sombre, monté d’aplomb au fil à plomb. Une rose des vents est gravée sur le côté de l’encolure ; elle indique une direction que rien, dans la sculpture, ne suit. C’est un instrument, pas un voyageur.',
      lore2:
        'Il ne t’attaquera pas. Il améliorera une pièce, puis une autre, puis prendra une case dont tu ne voyais pas l’intérêt. Trente coups plus tard, tu chercheras un coup à jouer et il n’y en aura plus.',
      name: 'Boussole',
      blurb:
        "Joue lentement, améliore ses pièces une à une, et t'étouffe sans que tu t'en aperçoives.",
    },
    gambiteur: {
      devise: 'Prends-le donc.',
      contre:
        'Tu peux accepter, à une condition : rendre le matériel dès qu’il commence à te coûter des temps. Un pion de plus ne vaut rien contre trois pièces développées et une colonne ouverte sur ton roi.',
      lore1:
        'Résine fumée, coulée deux fois : le contour se dédouble, la couleur se décale d’un cheveu, et l’arrière de l’encolure se dissout dans l’air. Personne n’a jamais su dire exactement où l’objet s’arrête — le détourage automatique non plus.',
      lore2:
        'Il offre un pion dès l’ouverture, parfois une pièce. Ce n’est pas de la générosité : ce qu’il achète, ce sont des lignes ouvertes et deux temps d’avance, et il sait quoi en faire. Refuser est souvent le bon choix. C’est rarement celui qu’on fait.',
      name: 'Mirage',
      blurb: "Offre du matériel dès l'ouverture pour ouvrir des lignes. Accepte à tes risques.",
    },
    machine: {
      devise: 'Rien à ajouter.',
      contre:
        'Il n’y a pas de défaut de style à exploiter, et c’est tout l’intérêt : baisse le niveau si tu veux gagner, garde-le au plus haut si tu veux savoir où tu en es. Une défaite contre Oracle ne dit rien de toi.',
      lore1:
        'Obsidienne polie, sans grain, sans une trace d’outil. C’est le seul de la série qui regarde droit devant, et le seul rigoureusement symétrique : il n’existe aucun angle sous lequel il soit plus flatteur qu’un autre.',
      lore2:
        'Aucun biais, aucune préférence, aucun mauvais jour. Il joue le meilleur coup que le moteur trouve, ni plus ni moins, et il le joue aussi bien contre toi que contre n’importe qui. Les six autres ont été bridés pour te ressembler un peu. Lui, non.',
      name: 'Oracle',
      blurb: 'Aucun style, aucune pitié. Le meilleur coup, à chaque fois. Bonne chance.',
    },
  },
  axes: {
    capture: {
      attire: 'prendre du matériel',
      repousse: 'laisser passer une prise',
    },
    check: {
      attire: 'donner échec',
      repousse: 'éviter les échecs',
    },
    pawnPush: {
      attire: 'pousser ses pions',
      repousse: 'garder ses pions en place',
    },
    development: {
      attire: 'sortir ses pièces',
      repousse: 'négliger son développement',
    },
    sacrifice: {
      attire: 'sacrifier du matériel',
      repousse: 'refuser tout sacrifice',
    },
    quiet: {
      attire: 'jouer des coups tranquilles',
      repousse: 'ne jamais rester tranquille',
    },
  },
  arbitrage: {
    title: 'Aide-mémoire d’arbitrage',
    intro:
      'Les situations qui reviennent en tournoi, et ce qu’en disent les Règles du jeu de la FIDE, édition 2023. Le règlement du tournoi peut préciser certains points : il prime. Dans le doute, on arrête les pendules et on appelle l’arbitre.',
    sections: 'Sections',
    disclaimer:
      'Résumé, pas texte officiel : les Règles du jeu d’échecs de la FIDE font foi, dans leur version en vigueur, et le règlement de chaque compétition peut y ajouter ses propres dispositions.',
    paceSlow: 'Lente',
    paceRapid: 'Rapide',
    paceBlitz: 'Blitz',
    'touche-joue': {
      titre: 'Pièce touchée, pièce jouée',
      p1: 'Une pièce touchée volontairement doit être jouée si c’est la sienne, prise si c’est celle de l’adversaire — dès lors qu’un coup légal le permet.',
      p2: 'Pour recentrer une pièce, on dit « j’adoube » avant de la toucher, et seulement quand c’est à soi de jouer.',
      p3: 'Un coup est joué quand la pièce est lâchée sur sa case ; il est achevé quand on a appuyé sur la pendule. Entre les deux, on ne revient pas en arrière.',
      p4: 'Pour roquer, on touche le roi d’abord, ou le roi et la tour ensemble. Tour touchée en premier : on ne peut plus roquer avec elle ce coup-ci, on doit la jouer.',
      p5: 'Un coup se joue d’une seule main, et c’est cette main qui appuie sur la pendule.',
    },
    'coup-illegal': {
      titre: 'Coup illégal',
      p1: 'Roi laissé en échec, pièce hors de sa marche, roque interdit, promotion oubliée : on revient à la position d’avant le coup, et la règle de la pièce touchée s’applique à ce qu’on a touché.',
      p2: 'Premier coup illégal achevé : deux minutes de plus à l’adversaire. Second coup illégal du même joueur : partie perdue — nulle si l’adversaire ne peut pas mater.',
      p3: 'Dès qu’on s’en aperçoit, même plusieurs coups plus tard : on remonte à la position d’avant.',
      p4: 'Seulement si l’adversaire n’a pas encore joué son coup suivant. Après, le coup illégal reste et la partie continue.',
      p5: 'Le roi ne se prend jamais : prendre le roi est un coup illégal, pas une victoire.',
      p6: 'Jouer à deux mains, ou appuyer sur la pendule sans avoir joué, se sanctionne comme un coup illégal.',
    },
    pendule: {
      titre: 'Pendule et drapeau',
      p1: 'Drapeau tombé, partie perdue — sauf si l’adversaire ne peut mater par aucune suite de coups légaux : nulle.',
      p2: 'L’arbitre constate la chute du drapeau et l’annonce.',
      p3: 'Sans arbitre à chaque échiquier, c’est au joueur de réclamer la chute ; l’arbitre ne la signale pas.',
      p4: 'Deux drapeaux tombés sans savoir lequel le premier : nulle dans la dernière période de jeu, et toujours en rapide ou blitz.',
      p5: 'On n’appuie pas sur la pendule avant d’avoir joué, on ne garde pas le doigt dessus, on ne la soulève pas, on ne la frappe pas.',
      p6: 'Pour appeler l’arbitre, on arrête les deux pendules. Aucune autre raison ne permet de les arrêter.',
    },
    nulle: {
      titre: 'La nulle : proposer, réclamer, constater',
      p1: 'On propose la nulle après avoir joué son coup et avant d’appuyer sur la pendule. L’adversaire accepte en le disant, refuse en jouant. Proposer sans arrêt est une gêne, et se sanctionne.',
      p2: 'Triple répétition : la même position, même trait, mêmes droits de roque et de prise en passant, apparue trois fois — pas forcément de suite.',
      p3: 'Cinquante coups : cinquante coups de chaque camp sans prise ni coup de pion.',
      p4: 'Pour réclamer l’une ou l’autre : le joueur au trait écrit le coup qui produit la position, ne le joue pas, arrête les pendules et appelle l’arbitre. Réclamation juste : nulle. Réclamation fausse : deux minutes à l’adversaire, et le coup écrit doit être joué.',
      p5: 'Sans réclamation, l’arbitre constate la nulle à la cinquième répétition ou au soixante-quinzième coup sans prise ni coup de pion.',
      p6: 'Position morte : plus aucun mat possible, pour personne (roi seul, roi et fou, roi et cavalier). La partie est nulle à l’instant, même si un drapeau tombe ensuite.',
      p7: 'Ici, en ligne : la triple répétition et les cinquante coups sont constatés automatiquement, sans réclamation, dès que la position les atteint. La chute du drapeau applique bien la réserve de l’article 6.9 : nulle si l’adversaire ne pouvait plus mater.',
    },
    'coups-speciaux': {
      titre: 'Roque, promotion, prise en passant',
      p1: 'Pas de roque si le roi ou la tour a déjà bougé, si le roi est en échec, ou s’il traverse ou arrive sur une case attaquée. La tour, elle, peut être attaquée ou passer sur une case attaquée.',
      p2: 'La promotion est obligatoire et la pièce est au choix — pas forcément une dame. Le choix est fait dès que la nouvelle pièce touche la case.',
      p3: 'Une tour retournée est une tour. S’il manque la pièce voulue, on arrête les pendules et on la demande à l’arbitre.',
      p4: 'La prise en passant n’est possible qu’au coup qui suit immédiatement la double avancée du pion.',
    },
    notation: {
      titre: 'Noter la partie',
      p1: 'On note coup après coup, lisiblement, en notation algébrique, son coup et celui de l’adversaire. Interdit d’écrire son coup avant de le jouer — sauf pour réclamer une nulle.',
      p2: 'Moins de cinq minutes au cadran et pas d’incrément d’au moins trente secondes : on peut cesser de noter. On complète sa feuille dès que le contrôle est passé.',
      p3: 'Pas d’obligation de noter.',
      p4: 'La feuille appartient à l’organisateur. À la fin, les deux joueurs y inscrivent le résultat et la signent.',
    },
    telephone: {
      titre: 'Téléphone, sorties, conduite',
      p1: 'Téléphone et tout appareil qui communique : interdits dans l’aire de jeu. Le règlement du tournoi peut autoriser un appareil éteint, rangé dans un sac, hors de portée.',
      p2: 'Un téléphone qui sonne ou qu’on manipule : partie perdue, sauf sanction moindre prévue par le règlement. L’adversaire gagne — nulle s’il ne peut pas mater.',
      p3: 'Le joueur au trait ne quitte pas l’aire de jeu. Personne ne la quitte sans l’accord de l’arbitre.',
      p4: 'Pas de notes, pas d’analyse dans la salle, pas de conseil d’un tiers, rien qui gêne l’adversaire. Refuser de suivre l’arbitre est une faute en soi.',
    },
    resultat: {
      titre: 'Retard, abandon, résultat',
      p1: 'Retard : la tolérance est celle du règlement du tournoi — zéro par défaut à la FIDE, souvent trente minutes ou une heure dans les règlements français. Au-delà, forfait, sauf décision de l’arbitre.',
      p2: 'Le mat termine la partie à l’instant où il est joué, si le coup est légal : un drapeau qui tombe ensuite ne change rien.',
      p3: 'On abandonne en le disant. Coucher son roi ou tendre la main n’est pas un résultat : on l’annonce, puis on l’écrit.',
      p4: 'Les sanctions dont dispose l’arbitre, de la plus légère à la plus lourde : avertissement, temps ajouté à l’adversaire, temps retiré, partie perdue, exclusion du tournoi.',
    },
  },
  glossaire: {
    cadence: {
      name: 'Cadence',
      definition:
        "Le temps dont chaque joueur dispose. Elle s'écrit avec deux nombres : **« 3 | 2 » veut dire 3 minutes au départ, plus 2 secondes ajoutées à ta pendule à chaque coup joué**. Un seul nombre — « 5 min » — signifie qu'il n'y a rien à récupérer : quand la pendule tombe, la partie est perdue, même avec une dame de plus. La cadence détermine aussi la catégorie de la partie, et chacune tient son propre classement : bullet sous 3 minutes, blitz jusqu'à 10, rapide jusqu'à 60, classique au-delà. On progresse beaucoup plus vite en jouant lentement.",
    },
    increment: {
      name: 'Incrément',
      definition:
        "Les secondes rendues à chaque coup, le second nombre d'une cadence. Elles servent à une chose précise : éviter de perdre au temps dans une position gagnante, faute des quelques secondes qu'il faut pour jouer les coups évidents de la fin. Avec 2 secondes d'incrément, une partie de trente coups te rend une minute en route.",
    },
    roque: {
      name: 'Roque',
      definition:
        "Le seul coup qui déplace deux pièces à la fois : le roi fait deux pas vers une tour, qui saute par-dessus lui. Il faut que ni l'un ni l'autre n'ait bougé, que les cases entre eux soient libres, et que le roi ne soit ni en échec, ni ne traverse une case attaquée. Petit roque du côté du roi, grand roque du côté de la dame.",
    },
    'prise-en-passant': {
      name: 'Prise en passant',
      definition:
        "Quand un pion avance de deux cases et arrive à côté d'un pion adverse, celui-ci peut le prendre comme s'il n'avait avancé que d'une. La prise doit se faire **immédiatement**, au coup suivant, sinon le droit est perdu. C'est la règle la plus souvent ignorée des débutants.",
    },
    promotion: {
      name: 'Promotion',
      definition:
        "Un pion qui atteint la dernière rangée se transforme, obligatoirement, en dame, tour, fou ou cavalier — au choix, et sans rapport avec les pièces déjà capturées. On prend presque toujours la dame ; le cavalier est le seul autre choix parfois utile, car lui seul fait des coups qu'une dame ne peut pas faire.",
    },
    'echec-et-mat': {
      name: 'Échec et mat',
      definition:
        "Le roi est attaqué et aucun coup légal ne peut y remédier : ni fuir, ni capturer l'attaquant, ni s'interposer. La partie s'arrête immédiatement. C'est le seul but du jeu — tout le reste n'est qu'un moyen.",
    },
    pat: {
      name: 'Pat',
      definition:
        "Le camp au trait n'a **aucun coup légal**, mais son roi n'est pas en échec. La partie est nulle, quelle que soit la différence de matériel. C'est la déception classique du débutant qui a une dame de plus : le pat est la planche de salut de celui qui perd.",
    },
    'nulle-par-repetition': {
      name: 'Nulle par répétition',
      definition:
        "La même position, avec le même joueur au trait et les mêmes droits de roque, apparaît trois fois : la partie est nulle. Souvent obtenue par échec perpétuel, quand un camp donne échec sans fin parce qu'il perdrait autrement.",
    },
    'regle-des-cinquante': {
      name: 'Règle des cinquante coups',
      definition:
        'Cinquante coups de chaque camp sans prise ni mouvement de pion : la partie est nulle. Elle évite de faire durer indéfiniment une finale que personne ne sait gagner.',
    },
    'valeur-des-pieces': {
      name: 'Valeur des pièces',
      definition:
        "Le repère universel : pion 1, cavalier et fou 3, tour 5, dame 9. Le roi n'a pas de valeur — on ne peut pas l'échanger. Ces nombres sont une approximation utile, pas une vérité : un cavalier bien placé vaut souvent plus qu'une tour enfermée.",
    },
    'paire-de-fous': {
      name: 'Paire de fous',
      definition:
        "Posséder les deux fous quand l'adversaire n'en a qu'un. Chaque fou ne voit qu'une couleur de cases ; à deux, ils couvrent tout l'échiquier. On estime l'avantage à environ un demi-pion, davantage en position ouverte.",
    },
    'mauvais-fou': {
      name: 'Mauvais fou',
      definition:
        "Un fou dont les propres pions occupent la couleur de cases. Il ne peut ni les défendre ni passer devant : c'est une pièce payée trois points qui n'en vaut plus qu'un. En finale, un fou de mauvaise couleur annule des positions pourtant gagnées d'un pion.",
    },
    qualite: {
      name: 'Qualité',
      definition:
        "L'écart entre une tour et une pièce légère, soit environ deux pions. « Gagner la qualité », c'est prendre une tour contre un fou ou un cavalier. « Sacrifier la qualité » se fait volontairement, en échange d'une position supérieure.",
    },
    'pion-passe': {
      name: 'Pion passé',
      definition:
        "Un pion qu'aucun pion adverse ne peut plus arrêter : ni sur sa colonne, ni sur les deux voisines. Il menace d'aller à dame, ce qui oblige l'adversaire à le surveiller. En finale, c'est souvent l'unique facteur qui décide.",
    },
    'pions-doubles': {
      name: 'Pions doublés',
      definition:
        "Deux pions du même camp sur la même colonne, conséquence d'une prise. Ils ne peuvent pas se défendre l'un l'autre et avancent mal. Le défaut est réel mais rarement décisif — la colonne ouverte qu'ils accompagnent compense souvent.",
    },
    'pion-isole': {
      name: 'Pion isolé',
      definition:
        "Un pion sans voisin sur les colonnes adjacentes : aucun pion ne pourra jamais le défendre. Faiblesse en finale, mais l'espace et les cases qu'il donne au milieu de partie en font une arme pour qui sait attaquer.",
    },
    ouverture: {
      name: 'Ouverture',
      definition:
        "Les dix à quinze premiers coups, où l'on applique trois principes plutôt que de calculer : occuper le centre, sortir ses pièces, mettre son roi à l'abri. Les ouvertures portent des noms parce qu'elles ont été étudiées pendant des siècles.",
    },
    developpement: {
      name: 'Développement',
      definition:
        "Sortir ses pièces de leur case de départ vers des cases où elles agissent. Une pièce restée au fond ne compte pas, même si elle est sur l'échiquier. Perdre du temps en ouverture, c'est jouer à trois pièces contre cinq.",
    },
    'milieu-de-partie': {
      name: 'Milieu de partie',
      definition:
        "La phase où la théorie s'arrête et où l'on doit trouver des plans par soi-même. C'est là que se produisent presque toutes les tactiques, et là qu'un débutant gagne le plus à travailler ses puzzles.",
    },
    finale: {
      name: 'Finale',
      definition:
        "Peu de pièces restent, et le roi cesse d'être une cible pour devenir une pièce forte qu'on avance vers le centre. Les règles du milieu de partie s'inversent : la précision remplace l'initiative.",
    },
    transposition: {
      name: 'Transposition',
      definition:
        "Arriver à une position connue par un ordre de coups différent de l'habituel. C'est pourquoi une ouverture se reconnaît à la position atteinte, jamais à la suite de coups jouée.",
    },
    evaluation: {
      name: 'Évaluation',
      definition:
        "La note que donne le moteur, comptée en pions : +1,0 signifie « les Blancs ont l'équivalent d'un pion d'avance ». Positif favorise les Blancs, négatif les Noirs. « M3 » annonce un mat en trois coups. En dessous d'un demi-pion, l'écart ne veut rien dire.",
    },
    centipion: {
      name: 'Centipion',
      definition:
        "Un centième de pion, l'unité interne des moteurs. Une « perte moyenne de 40 centipions » veut dire que chaque coup a coûté en moyenne quatre dixièmes de pion par rapport au meilleur.",
    },
    precision: {
      name: 'Précision',
      definition:
        "Un pourcentage qui résume une partie : à quel point les coups joués se rapprochent des meilleurs. Elle se calcule sur les chances de victoire, pas sur l'évaluation brute — perdre un pion dans une position gagnée ne compte pas comme perdre un pion dans une position égale.",
    },
    elo: {
      name: 'Elo',
      definition:
        'Le classement des joueurs. Battre plus fort que soi en rapporte beaucoup, perdre contre plus faible en coûte autant. Un débutant tourne autour de 400 à 800, un joueur de club vers 1600, un grand maître au-delà de 2500.',
    },
    'glicko-2': {
      name: 'Glicko-2',
      definition:
        "Une version plus fine de l'Elo, qui suit aussi l'**incertitude** sur ton niveau. Après une longue absence, le classement bouge plus vite : le système sait qu'il te connaît moins bien. C'est celui utilisé ici.",
    },
    zugzwang: {
      name: 'Zugzwang',
      definition:
        "Une situation où l'on est obligé de jouer alors que tout coup dégrade sa position : on perdrait moins en passant son tour, ce que les règles interdisent. Fréquent en finale, c'est souvent le mécanisme même du gain.",
    },
    initiative: {
      name: 'Initiative',
      definition:
        "Mener le jeu : forcer l'adversaire à répondre à tes menaces au lieu de développer les siennes. Elle ne se compte pas en matériel mais se transforme souvent en matériel.",
    },
    tempo: {
      name: 'Tempo',
      definition:
        "Un coup, vu comme une unité de temps. « Gagner un tempo », c'est faire avancer son jeu tout en obligeant l'adversaire à un coup qui ne l'avance pas — par exemple en attaquant une pièce en développant la sienne.",
    },
  },
  paliers: {
    regles: {
      nom: 'Tenir une partie de bout en bout',
      promesse:
        'Tu connais les déplacements. Ce qui te fait perdre n’est pas encore la stratégie : c’est une règle oubliée, ou une partie gagnée qu’on ne sait pas finir.',
      leviers: {
        'les-trois-regles': {
          titre: 'Les trois règles qu’on oublie',
          pourquoi:
            'Le roque, la prise en passant et la promotion décident plus de parties à ce niveau que tout le reste. Une prise en passant qu’on croit illégale, c’est un pion perdu et la conviction que l’adversaire a triché.',
        },
        'mater-avec-roi': {
          titre: 'Mater avec roi et tour',
          pourquoi:
            'C’est la finale qu’on atteint le plus souvent sans savoir la gagner. Une dame de plus et une nulle par cinquante coups : ça arrive, et c’est évitable en dix minutes.',
        },
        'mater-avec-la': {
          titre: 'Mater avec la dame sans faire pat',
          pourquoi:
            'Le pat est la déception classique de celui qui a une dame de plus. On l’évite avec une seule méthode, toujours la même.',
        },
        'combien-vaut-chaque': {
          titre: 'Combien vaut chaque pièce',
          pourquoi:
            'Échanger une tour contre un cavalier parce que « ça fait un échange » coûte deux pions. Le barème ne se devine pas, il s’apprend une fois.',
        },
        'reconnaitre-un-mat': {
          titre: 'Reconnaître un mat en un',
          pourquoi:
            'Avant de chercher un plan, il faut voir le mat quand il est là. C’est aussi le plus rapide à muscler : cinquante positions et l’œil le fait tout seul.',
        },
      },
    },
    'pieces-en-prise': {
      nom: 'Ne plus donner de pièces',
      promesse:
        'Tu tiens une partie et tu sais mater. Ce qui te coûte le plus de points maintenant n’a rien de subtil : une pièce laissée sur une case attaquée, et la partie change de camp.',
      leviers: {
        'voir-ce-qui': {
          titre: 'Voir ce qui est en prise',
          pourquoi:
            'À ce palier, la majorité des parties se décide sur une pièce laissée sans défense — pas sur une combinaison. C’est le seul réflexe qui rapporte plusieurs centaines de points.',
        },
        'la-fourchette-de': {
          titre: 'La fourchette de cavalier',
          pourquoi:
            'Le cavalier est la pièce dont les débutants voient le moins les coups, et celle qui punit le plus. Une fourchette décide une partie sur trois à ce niveau.',
        },
        'les-quatre-mats': {
          titre: 'Les quatre mats qu’on subit',
          pourquoi:
            'Le berger, l’imbécile, Légal, le Shilling : on les prend tous dans ses dix premières parties, et on ne sait pas ce qui s’est passé. Les connaître, c’est les parer sans y penser.',
        },
        'le-mat-du': {
          titre: 'Le mat du couloir',
          pourquoi:
            'Trois pions devant le roi qui a roqué, et une tour qui arrive sur la dernière rangée. C’est le motif de mat le plus fréquent de toutes les échelles de niveau.',
        },
        'les-trois-principes': {
          titre: 'Les trois principes de l’ouverture',
          pourquoi:
            'Pas de théorie à mémoriser : un pion au centre, les pièces dehors, le roi à l’abri. Trois idées suffisent à ne plus jamais être perdu au coup dix.',
        },
      },
    },
    'voir-ladversaire': {
      nom: 'Voir ce que l’adversaire prépare',
      promesse:
        'Tu ne donnes plus de pièces sans raison. Ce qui bloque maintenant, c’est que tu regardes tes coups et pas les siens : les tactiques qui te coûtent cher sont celles que tu n’as pas vu venir.',
      leviers: {
        'le-clouage': {
          titre: 'Le clouage',
          pourquoi:
            'Une pièce devant le roi ne peut plus bouger, et tout le monde peut l’attaquer. C’est le motif que les joueurs à 1 000 subissent le plus souvent sans le nommer.',
        },
        'l-attaque-a': {
          titre: 'L’attaque à la découverte',
          pourquoi:
            'Un coup qui ouvre la ligne d’une autre pièce : deux menaces pour un coup. Impossible à parer si on ne l’a jamais vue.',
        },
        'le-memo-avant': {
          titre: 'Le mémo avant chaque coup',
          pourquoi:
            'Quatre questions, dix secondes : qu’est-ce qu’il vient de changer, qu’attaque-t-il, qu’est-ce que je laisse en prise, mon coup tient-il. C’est la différence mesurable entre un 1 000 et un 1 300.',
        },
        'le-mat-en': {
          titre: 'Le mat en deux',
          pourquoi:
            'Deux coups à voir d’avance, en forçant. C’est l’exercice qui apprend à calculer, et il se transfère directement aux positions où il n’y a pas de mat.',
        },
        'les-quatre-erreurs': {
          titre: 'Les quatre erreurs classiques de l’ouverture',
          pourquoi:
            'Sortir la dame trop tôt, bouger deux fois la même pièce, pousser les pions de l’aile, oublier de roquer. Quatre habitudes, et chacune coûte un tempo par partie.',
        },
      },
    },
    'un-plan': {
      nom: 'Jouer avec un plan',
      promesse:
        'Tu vois les tactiques des deux côtés. Le problème est ailleurs : quand il n’y a rien à prendre, tu ne sais pas quoi faire, et tu attends que l’autre se trompe.',
      leviers: {
        'les-colonnes-ouvertes': {
          titre: 'Les colonnes ouvertes',
          pourquoi:
            'La première question d’un milieu de partie calme : où mettre mes tours ? La réponse est presque toujours la même, et elle se voit sur la structure de pions.',
        },
        'l-avant-poste': {
          titre: 'L’avant-poste',
          pourquoi:
            'Un cavalier sur une case qu’aucun pion ne peut attaquer vaut plus qu’une tour mal placée. C’est le premier concept positionnel qui change vraiment les parties.',
        },
        'les-enjeux-de': {
          titre: 'Les enjeux de ton ouverture',
          pourquoi:
            'À ce palier, connaître dix coups de théorie ne sert à rien si on ne sait pas ce qu’on cherche au coup onze. Le plan tient en trois phrases par ouverture.',
        },
        'eliminer-le-defenseur': {
          titre: 'Éliminer le défenseur',
          pourquoi:
            'La tactique qui sert un plan plutôt que de tomber du ciel : on retire la pièce qui tient tout, et la position s’effondre d’elle-même.',
        },
        'la-securite-du': {
          titre: 'La sécurité du roi des deux côtés',
          pourquoi:
            'Savoir quand attaquer le roi adverse — et quand c’est le sien qui est en danger. Les attaques prématurées coûtent plus cher que les attaques manquées.',
        },
      },
    },
    technique: {
      nom: 'Convertir et tenir',
      promesse:
        'Tu joues avec des plans et tu ne te fais plus surprendre. Ce qui te manque est de la technique : les positions gagnantes qui finissent nulles, et les finales qu’on joue à l’instinct.',
      leviers: {
        'l-opposition': {
          titre: 'L’opposition',
          pourquoi:
            'La notion sans laquelle aucune finale de pions ne se gagne ni ne se tient. Elle s’apprend en une leçon et sert toute une vie.',
        },
        'la-regle-du': {
          titre: 'La règle du carré',
          pourquoi:
            'Savoir d’un regard si le roi rattrape le pion. Elle remplace un calcul de six coups par un coup d’œil, et elle ne se trompe jamais.',
        },
        'les-finales-objectif': {
          titre: 'Les finales, objectif annoncé',
          pourquoi:
            'Trois mille cinq cent soixante-huit positions classées, avec l’objectif donné — gagner ou tenir la nulle — et un ordinateur qui défend au mieux. C’est l’entraînement le plus rentable de ce palier.',
        },
        'le-sacrifice-qui': {
          titre: 'Le sacrifice qui se calcule',
          pourquoi:
            'À 1 600, on rate moins les sacrifices qu’on n’en joue de mauvais. L’exercice apprend à vérifier avant de donner.',
        },
        'le-roi-devient': {
          titre: 'Le roi devient une pièce',
          pourquoi:
            'En finale, le roi attaque. Les joueurs qui stagnent à ce palier le gardent au chaud par réflexe, et perdent une pièce de tempo à chaque coup.',
        },
      },
    },
    prophylaxie: {
      nom: 'Empêcher avant de faire',
      promesse:
        'Tu as la technique et les plans. Ce qui sépare encore de 2 200, c’est de jouer contre les idées de l’autre plutôt que pour les siennes — et de ne plus perdre une seule partie gagnée.',
      leviers: {
        'les-enfilades-et': {
          titre: 'Les enfilades et les rayons X',
          pourquoi:
            'Les motifs qui restent coûteux à haut niveau, parce qu’ils agissent à travers les pièces et qu’on les vérifie mal sous pression de pendule.',
        },
        'le-zugzwang': {
          titre: 'Le zugzwang',
          pourquoi:
            'Le seul mécanisme de gain de beaucoup de finales : l’adversaire est obligé de jouer, et tout coup le dégrade. Il se prépare, il ne se trouve pas.',
        },
        'relire-ses-propres': {
          titre: 'Relire ses propres parties',
          pourquoi:
            'À ce palier, les leçons génériques n’apportent plus grand-chose : ce qui reste à corriger est personnel, et il n’y a qu’un endroit où le lire — ses parties.',
        },
        'les-positions-ou': {
          titre: 'Les positions où tout est défendu',
          pourquoi:
            'Le sacrifice positionnel et l’attaque à long terme : ce qui reste quand il n’y a aucune tactique. C’est là que se gagnent les points au-dessus de 1 900.',
        },
      },
    },
  },
  seances: {
    'rien-en-prise': {
      nom: 'Ne rien laisser en prise',
      consigne:
        'Avant chaque coup, fais le tour de tes pièces : lesquelles sont attaquées, et par quoi. Tu ne joues pas tant que tu n’as pas répondu.',
      aRegarder:
        'Chaque fois que le commentaire parle d’une pièce en prise — à toi ou à lui — c’est le thème qui se présente.',
    },
    fourchettes: {
      nom: 'Les fourchettes',
      consigne:
        'Cherche les cases d’où un cavalier atteindrait deux pièces à la fois — les tiennes comme les siennes. Les dames et les pions en font aussi.',
      aRegarder:
        'Repère les paires de pièces sur des cases de même couleur, à distance de cavalier l’une de l’autre.',
    },
    clouages: {
      nom: 'Clouages et enfilades',
      consigne:
        'Aligne tes pièces lourdes sur ses pièces, et évite d’aligner les tiennes devant ton roi ou ta dame.',
      aRegarder:
        'Les diagonales et les colonnes où se trouvent son roi et sa dame : c’est là que les clouages naissent.',
    },
    couloir: {
      nom: 'La dernière rangée',
      consigne:
        'Surveille les deux dernières rangées : la sienne pour y entrer, la tienne pour ne pas s’y faire enfermer. Une case d’air pour ton roi, tôt.',
      aRegarder:
        'Après chaque échange de pièces lourdes, demande-toi qui contrôle la huitième rangée.',
    },
    developpement: {
      nom: 'Sortir toutes ses pièces',
      consigne:
        'Un pion au centre, puis une pièce nouvelle à chaque coup jusqu’à ce que tout soit dehors et le roi à l’abri. Aucune pièce jouée deux fois.',
      aRegarder:
        'Compte tes pièces développées au coup dix. Huit, c’est gagné ; quatre, c’est le thème de la prochaine séance aussi.',
    },
    colonnes: {
      nom: 'Les colonnes ouvertes',
      consigne:
        'Trouve la colonne sans pion et mets-y une tour. Puis la seconde derrière la première, et entre sur la septième rangée.',
      aRegarder:
        'La structure de pions : la colonne ouverte est déjà dessinée dessus, il n’y a rien à calculer.',
    },
    'avant-poste': {
      nom: 'L’avant-poste',
      consigne:
        'Cherche une case avancée qu’aucun de ses pions ne peut attaquer, et installes-y un cavalier. Il y restera jusqu’à la fin.',
      aRegarder:
        'Les cases devant ses pions arriérés, et celles que sa structure a définitivement abandonnées.',
    },
    'roi-expose': {
      nom: 'Attaquer le roi',
      consigne:
        'Avant de lancer l’attaque, compte les attaquants et les défenseurs. Trois contre deux suffit ; deux contre trois ne marche jamais.',
      aRegarder: 'Son abri de pions : dès qu’une case s’ouvre devant son roi, le thème est là.',
    },
    'pion-passe': {
      nom: 'Le pion passé',
      consigne:
        'Crée un pion passé du côté où tu as la majorité, pousse-le, et mets ta tour derrière. Bloque le sien avec un cavalier.',
      aRegarder:
        'Dès que les dames partent, compte les pions de chaque aile : la majorité dit de quel côté jouer.',
    },
    'deux-faiblesses': {
      nom: 'Le principe des deux faiblesses',
      consigne:
        'Fixe une première faiblesse, puis ouvre un second front à l’autre bout. Sa défense ne peut pas couvrir les deux.',
      aRegarder:
        'Les pions isolés, doublés et arriérés des deux camps : ce sont les faiblesses qu’on fixe.',
    },
  },
  positions: {
    roque: {
      legende:
        'Le petit roque des Blancs : le roi va de e1 à g1, et la tour de h1 saute par-dessus lui pour se poser en f1. Un seul coup, deux pièces.',
    },
    'prise-en-passant': {
      legende:
        'Le pion noir vient d’avancer de deux cases pour éviter le pion blanc. Celui-ci le prend quand même — en se posant sur la case qu’il a sautée, comme s’il n’avait avancé que d’une.',
    },
    promotion: {
      legende:
        'Le pion atteint la dernière rangée et se transforme. Presque toujours en dame — mais le choix est libre, et le cavalier est parfois le seul coup qui gagne.',
    },
    'echec-et-mat': {
      legende:
        'Le mat du couloir : le roi noir est enfermé par ses propres pions, la tour arrive sur la huitième rangée, et il n’y a ni fuite, ni parade, ni capture.',
    },
    pat: {
      legende:
        'Les Noirs doivent jouer et n’ont aucun coup légal — leur roi n’est pourtant pas en échec. La partie est nulle : c’est la dame blanche qui s’est privée de sa victoire.',
    },
    'pion-passe': {
      legende:
        'Plus aucun pion noir ne peut l’arrêter : ni devant lui, ni sur les colonnes voisines. Son chemin jusqu’à la promotion est libre, et c’est ce qui fait sa valeur en finale.',
    },
    'pions-doubles': {
      legende:
        'Deux pions sur la même colonne : celui de derrière ne protégera jamais celui de devant, et ils avancent l’un derrière l’autre. Le prix ordinaire d’une capture vers le centre.',
    },
    'pion-isole': {
      legende:
        'Aucun pion ami sur les colonnes voisines : personne ne pourra jamais le défendre. Il faudra une pièce pour cela, et une pièce occupée à défendre ne fait rien d’autre.',
    },
    'mauvais-fou': {
      legende:
        'Le fou joue sur les cases claires, et ses propres pions occupent les cases claires devant lui. Il regarde par-dessus ses barreaux : la moitié de l’échiquier lui est fermée par son camp.',
    },
    zugzwang: {
      legende:
        'Les Noirs ne sont pas perdus par la position, mais par l’obligation de jouer : tout coup de leur roi laisse passer le pion blanc. Pouvoir passer son tour les sauverait.',
    },
    'paire-de-fous': {
      legende:
        'Un fou sur les cases claires, un sur les sombres : à eux deux, plus aucune case ne leur échappe. C’est ce qui vaut mieux qu’un fou et un cavalier en position ouverte.',
    },
    fork: {
      legende:
        'Une pièce, deux cibles à la fois : le cavalier donne échec au roi et attaque la tour. Le roi doit parer, et la tour tombe au coup suivant.',
    },
    pin: {
      legende:
        'Le cavalier ne peut plus bouger : il découvrirait son propre roi. Il reste sur place, sans défense, et l’on peut prendre son temps pour l’attaquer.',
    },
    skewer: {
      legende:
        'Le clouage à l’envers : la pièce de valeur est devant, elle doit s’écarter de l’échec, et ce qu’elle protégeait derrière elle se prend.',
    },
    discoveredAttack: {
      legende:
        'Le cavalier s’écarte et démasque la tour, qui donne échec. Il en profite pour attaquer la dame : on doit parer l’échec, et la dame n’a personne pour la sauver.',
    },
    doubleCheck: {
      legende:
        'Deux pièces donnent échec en même temps. Aucune capture, aucune interposition ne peut parer les deux : le roi doit bouger, quoi qu’il en coûte.',
    },
    smotheredMate: {
      legende:
        'Le roi est enfermé par ses propres pièces, et le cavalier — la seule qui saute — vient le mater dans son coin. Rien ne peut prendre le cavalier.',
    },
    backRankMate: {
      legende:
        'Les trois pions n’ont jamais bougé, et le roi n’a pas de fenêtre : la tour arrive sur la rangée et la partie s’arrête. C’est le mat le plus fréquent entre débutants.',
    },
    mateIn1: {
      legende:
        'Un seul coup, et c’est fini. Chercher les mats en un est l’exercice qui apprend le plus vite à voir les cases que le roi adverse n’a pas.',
    },
    removingTheDefender: {
      legende:
        'La tour noire tenait la dernière rangée : on l’échange, le cavalier reprend loin de la case qui comptait, et la seconde tour entre. On ne s’attaque pas à la cible, mais à ce qui la garde.',
    },
    hangingPiece: {
      legende:
        'Le cavalier est attaqué par le fou et personne ne le défend : il se prend gratuitement. C’est le premier motif à chercher, à chaque coup, dans les deux camps.',
    },
    xRayAttack: {
      legende:
        'Les deux tours se regardent à travers la colonne : ce qui viendra s’intercaler entre elles sera attaqué des deux côtés, et l’attaque « traverse » la pièce.',
    },
    underPromotion: {
      legende:
        'Promouvoir en cavalier plutôt qu’en dame : ici, lui seul donne échec. Rare, mais c’est exactement pour ces cas-là que la règle laisse le choix.',
    },
    opposition: {
      legende:
        'Les rois se font face, une case entre eux, et c’est aux Noirs de jouer : ils doivent s’écarter, et le roi blanc avancera. L’opposition appartient à celui qui n’a pas le trait.',
    },
    fianchetto: {
      legende:
        'Le fou s’installe sur la grande diagonale, derrière son pion avancé d’une case. Il y tient la plus longue ligne de l’échiquier, et garde le roi roqué à côté de lui.',
    },
    outpost: {
      legende:
        'Un cavalier posé dans le camp adverse, protégé par un pion, et qu’aucun pion ne peut chasser. Il vaut là bien plus qu’une tour mal placée.',
    },
    openFile: {
      legende:
        'Plus aucun pion sur la colonne : la tour y voit d’un bout à l’autre. C’est là qu’on met ses tours, et c’est souvent par là qu’on entre chez l’adversaire.',
    },
    seventhRank: {
      legende:
        'La tour s’installe sur la rangée des pions adverses : elle les attaque tous à la fois et enferme le roi sur sa dernière rangée. Une tour à la septième vaut souvent un pion.',
    },
    protectedPassedPawn: {
      legende:
        'Un pion passé que défend un autre pion : le roi adverse ne peut ni le prendre ni le laisser. C’est l’avantage le plus décisif des finales de pions.',
    },
    rookBehindPasser: {
      legende:
        'La tour pousse son pion par-derrière : elle gagne en portée à mesure qu’il avance, quand la tour adverse, elle, en perd. Règle de Tarrasch, et elle tient.',
    },
    backwardPawn: {
      legende:
        'Le pion c3 est resté derrière ses voisins et ne peut plus avancer sans se perdre : aucun pion ami ne le défendra jamais. La case devant lui est un avant-poste offert.',
    },
  },
  explications: {
    checkmate: {
      titre: 'Échec et mat',
      texte:
        'Le roi est attaqué et aucun coup légal ne peut y remédier : ni fuir, ni capturer l’attaquant, ni s’interposer. La partie s’arrête immédiatement.',
      terme: 'Échec et mat',
    },
    stalemate: {
      titre: 'Pat',
      texte:
        'Le camp au trait n’a **aucun coup légal**, mais son roi n’est pas en échec : la partie est nulle, quelle que soit la différence de matériel. Dans tes statistiques, c’est la ligne à surveiller — un pat est presque toujours une victoire qu’on a laissée filer en fin de partie, faute d’avoir laissé une case au roi adverse.',
      terme: 'Pat',
    },
    resigned: {
      titre: 'Abandon',
      texte:
        'Un joueur s’est reconnu perdu et a arrêté la partie avant le mat. C’est la fin la plus courante entre joueurs expérimentés : une fois la position sans espoir, jouer les vingt coups qui restent n’apprend plus rien à personne. **Abandonner trop tôt, en revanche, est une habitude coûteuse** — beaucoup de positions « perdues » se sauvent encore contre un adversaire de son propre niveau.',
    },
    timeout: {
      titre: 'Temps écoulé',
      texte:
        'La pendule est tombée. La partie est perdue même avec une dame de plus — sauf si l’adversaire n’a plus de quoi mater, auquel cas elle est nulle. **Beaucoup de défaites au temps dans une même colonne veulent dire une cadence trop courte pour ta façon de jouer**, pas un manque de rapidité : on ne gagne pas de temps en jouant plus vite, on en gagne en hésitant moins.',
      terme: 'Cadence',
    },
    draw: {
      titre: 'Nulle',
      texte:
        'Personne ne gagne : accord entre les joueurs, répétition de la même position trois fois, cinquante coups sans prise ni poussée de pion, ou matériel insuffisant pour mater. Chacun repart avec un demi-point.',
      terme: 'Nulle par répétition',
    },
    abandoned: {
      titre: 'Adversaire parti',
      texte:
        'Un joueur a quitté la partie sans la terminer, et le temps d’attente s’est écoulé. Le résultat suit la position et le règlement de la partie : **ce n’est donc pas toujours une victoire**, c’est pourquoi cette ligne compte ses parties et ses gains séparément.',
    },
    aborted: {
      titre: 'Annulée',
      texte:
        'La partie s’est arrêtée avant d’avoir vraiment commencé — trop peu de coups joués pour qu’elle compte. Elle ne touche ni au classement ni au score, et n’est là que pour l’inventaire.',
    },
    ultraBullet: {
      titre: 'Ultra-bullet',
      texte:
        'Moins de 30 secondes pour toute la partie. C’est un jeu d’adresse plus qu’un jeu d’échecs : on y joue au motif reconnu et à la main, jamais au calcul.',
      terme: 'Cadence',
    },
    bullet: {
      titre: 'Bullet',
      texte:
        'Moins de 3 minutes par joueur. On n’y calcule plus, on reconnaît : c’est la cadence qui récompense le mieux l’entraînement aux puzzles, et la plus mauvaise pour apprendre une ouverture.',
      terme: 'Cadence',
    },
    blitz: {
      titre: 'Blitz',
      texte:
        'De 3 à 10 minutes par joueur. Assez pour un plan, trop peu pour le vérifier. C’est la cadence la plus jouée en ligne, et celle où l’écart entre ce qu’on sait et ce qu’on joue est le plus grand.',
      terme: 'Cadence',
    },
    rapid: {
      titre: 'Rapide',
      texte:
        'De 10 à 60 minutes par joueur. La première cadence où l’on a le temps de calculer une variante jusqu’au bout. **C’est celle où l’on progresse le plus vite** : une partie y contient plus de décisions réfléchies que dix parties de bullet.',
      terme: 'Cadence',
    },
    classical: {
      titre: 'Classique',
      texte:
        'Plus d’une heure par joueur. La cadence des tournois sur échiquier : on y joue peu de parties, mais chacune s’analyse ensuite ligne par ligne.',
      terme: 'Cadence',
    },
    correspondence: {
      titre: 'Correspondance',
      texte:
        'De un à quatorze jours par coup. On joue sa partie entre deux occupations, et l’on a le droit de bouger les pièces pour chercher — c’est le format qui apprend le mieux les finales.',
      terme: 'Cadence',
    },
  },
  creditsNotes: {
    stockfish: {
      note: 'Le moteur d’échecs le plus fort au monde. Il tourne côté serveur en version native, et dans le navigateur en WebAssembly.',
    },
    'stockfish-js': {
      note: 'La compilation WebAssembly de Stockfish, qui permet d’analyser sans rien envoyer à un serveur.',
    },
    'chess-js': {
      note: 'Les règles du jeu : génération des coups légaux, détection du mat, lecture du PGN.',
    },
    maia: {
      note: 'Neuf réseaux entraînés sur des parties humaines : à 1100, l’adversaire fait les erreurs qu’un joueur de 1100 fait vraiment.',
    },
    'leela-chess-zero': {
      note: 'Le moteur qui fait tourner les réseaux de Maia — les poids seuls ne jouent pas.',
    },
    piper: {
      note: 'La voix du coach, synthétisée sur le serveur et hors ligne : rien de ce qui est dit ne sort de la machine.',
    },
    'base-d-ouvertures': {
      note: '3 810 ouvertures nommées et classées, traduites en français pour ce projet.',
    },
    'base-de-puzzles': {
      note: '6 057 356 positions tactiques, notées et étiquetées par thème, extraites de vraies parties.',
    },
    'base-de-positions': {
      note: '3 568 positions de finales classées par matériel, de « mater avec une dame » à « tenir la nulle avec une tour de moins », traduites et re-cotées en difficulté pour ce projet.',
    },
    'tables-de-finales': {
      note: 'Le jeu parfait dans toutes les finales à sept pièces ou moins. Une certitude, pas une évaluation.',
    },
    'voix-piper': {
      note: 'Les modèles de voix française et anglaise du coach.',
    },
    'pieces-staunton-cburnett': {
      note: 'Le jeu de pièces vectoriel le plus utilisé du monde libre.',
    },
    'pieces-merida': {
      note: 'Contours nets, excellente lisibilité en petite taille.',
    },
    'pieces-fantasy-spatial': {
      note: 'Trois jeux de caractère, aux volumes sculptés.',
    },
    'pieces-chessnut': {
      note: 'Épuré et contemporain.',
    },
    'pieces-rhos': {
      note: 'Aplats colorés, domaine public.',
    },
    'pieces-alpha-pixel': {
      note: 'Trois approches minimalistes, dont un jeu en lettres pour la lisibilité maximale.',
    },
    bruitages: {
      note: 'Déplacement, capture, échec, fin de partie.',
    },
    'next-js': {
      note: 'Le cadre de l’application web : routage, rendu serveur, empaquetage.',
    },
    react: {
      note: 'La bibliothèque d’interface.',
    },
    'react-dom': {
      note: 'Le rendu de React dans le navigateur.',
    },
    'server-only': {
      note: 'Un garde-fou : il fait échouer la construction si un module serveur part vers le navigateur.',
    },
    'three-js': {
      note: 'Le rendu en trois dimensions de l’échiquier.',
    },
    'react-three-fiber': {
      note: 'Le pont entre React et three.js.',
    },
    drei: {
      note: 'Les aides de la scène 3D : caméra, lumières, chargement des modèles.',
    },
    zustand: {
      note: 'Le magasin des préférences, partagé par toute l’interface.',
    },
    lucide: {
      note: 'Les icônes de toute l’interface.',
    },
    clsx: {
      note: 'L’assemblage des classes CSS conditionnelles.',
    },
    'socket-io': {
      note: 'Le temps réel des parties en direct, côté serveur.',
    },
    'socket-io-client': {
      note: 'Le même, côté navigateur.',
    },
    'drizzle-orm': {
      note: 'Le schéma et les requêtes SQL, typés.',
    },
    postgres: {
      note: 'Le pilote PostgreSQL.',
    },
    nodemailer: {
      note: 'L’envoi des courriels — la récupération de mot de passe, et rien d’autre.',
    },
    'web-push': {
      note: 'Les notifications poussées : un défi, une demande d’ami, un coup joué contre toi.',
    },
  },
  memo: {
    'qu-est-ce-que': {
      question: 'Qu’est-ce que son dernier coup a changé ?',
      comment:
        'Une case libérée, une ligne ouverte, une pièce qui attaque maintenant ce qu’elle n’attaquait pas. Un coup sert toujours à quelque chose — même mauvais.',
    },
    'qu-est-ce-qu': {
      question: 'Qu’est-ce qu’il attaque ?',
      comment:
        'Fais le tour de tes pièces : lesquelles sont attaquées, lesquelles sont défendues, et par quoi. Une pièce attaquée deux fois et défendue une fois est perdue.',
    },
    'qu-est-ce-que-mon': {
      question: 'Qu’est-ce que mon coup laisse en prise ?',
      comment:
        'La pièce que tu déplaces ne défend plus ce qu’elle défendait, et la case où tu la poses peut être attaquée. C’est l’erreur qui coûte le plus de points sous 1 200.',
    },
    's-il-joue-le': {
      question: 'S’il joue le coup le plus méchant, ça tient ?',
      comment:
        'Un seul coup à examiner : le plus agressif qu’il ait. Échec, prise, menace de mat. Si ça tient contre celui-là, ça tient.',
    },
  },
  principesListe: {
    'occupe-le-centre-avec': {
      regle: 'Occupe le centre avec un pion.',
      pourquoi:
        'Un pion au centre prend de l’espace, ouvre des lignes à tes pièces et leur donne deux fois plus de cases qu’en bord d’échiquier.',
      sauf: 'Les ouvertures qui le contrôlent de loin — est-indienne, sicilienne — le rendent volontairement pour le frapper ensuite.',
    },
    'sors-les-cavaliers-avant': {
      regle: 'Sors les cavaliers avant les fous.',
      pourquoi:
        'Un cavalier n’a qu’une bonne case dans la plupart des ouvertures, un fou en a trois ou quatre. On joue d’abord ce qu’on sait, on garde le choix pour après.',
      sauf: 'Les systèmes où le fou sort en premier sont précisément construits pour cela — Londres, fianchetto.',
    },
    'ne-bouge-pas-deux': {
      regle: 'Ne bouge pas deux fois la même pièce sans raison.',
      pourquoi:
        'Chaque coup perdu est un coup offert. Développer huit pièces en huit coups, c’est arriver au milieu de partie avec une armée entière.',
      sauf: 'Si un coup de l’adversaire attaque cette pièce et que la reculer est le moindre mal, il faut la reculer.',
    },
    'roque-tot-et-du': {
      regle: 'Roque tôt, et du bon côté.',
      pourquoi:
        'Le roi au centre est la cible de toutes les ouvertures de lignes. Roquer met le roi à l’abri et la tour au travail d’un seul coup.',
      sauf: 'Quand l’adversaire a déjà roqué à l’opposé et que la course aux pions est lancée, le roi peut rester au centre pour ne pas offrir de cible.',
    },
    'ne-sors-pas-la': {
      regle: 'Ne sors pas la dame trop tôt.',
      pourquoi:
        'Elle vaut neuf points : tout ce qui l’attaque gagne un temps. Une dame sortie au troisième coup passe les dix suivants à fuir.',
      sauf: 'Quelques ouvertures la sortent immédiatement et l’assument — la scandinave, par exemple, où elle s’installe en a5 avec un plan.',
    },
    'ne-pousse-pas-les': {
      regle: 'Ne pousse pas les pions de l’aile avant d’avoir développé.',
      pourquoi:
        'Un pion qui avance ne revient pas, et il laisse derrière lui des cases que personne ne défendra plus.',
      sauf: 'Un gain de temps ou d’espace clair — h3 pour empêcher un clouage, a4 pour bloquer l’expansion adverse — vaut le coup.',
    },
    'connecte-tes-tours': {
      regle: 'Connecte tes tours.',
      pourquoi:
        'Quand il n’y a plus rien entre elles, le développement est fini : c’est le signal qu’on peut commencer à jouer pour gagner.',
      sauf: 'Rien, ou presque. C’est le principe le plus fiable de la liste.',
    },
    'ne-cherche-pas-le': {
      regle: 'Ne cherche pas le mat en quatre coups.',
      pourquoi:
        'Le mat du berger et ses cousins perdent contre n’importe qui les connaît, et on y laisse trois temps de développement.',
      sauf: 'Il faut les connaître pour les parer : c’est l’objet du chapitre « Les mats de l’ouverture ».',
    },
    'ameliore-ta-pire-piece': {
      regle: 'Améliore ta pire pièce.',
      pourquoi:
        'Quand aucun plan ne s’impose, la question « laquelle de mes pièces travaille le moins ? » en produit un à tous les coups.',
      sauf: 'Si une tactique est disponible, elle passe devant : un plan ne rattrape pas une pièce gagnée laissée de côté.',
    },
    'les-tours-vont-sur': {
      regle: 'Les tours vont sur les colonnes ouvertes.',
      pourquoi:
        'Une tour ne vaut ses cinq points que si elle voit loin. Sur une colonne fermée, elle regarde son propre pion.',
      sauf: 'Une colonne semi-ouverte où l’adversaire a un pion faible vaut mieux qu’une colonne ouverte qui ne mène nulle part.',
    },
    'attaque-du-cote-ou': {
      regle: 'Attaque du côté où tu as plus d’espace.',
      pourquoi:
        'L’espace se compte en pions avancés. Attaquer là où l’on est à l’étroit, c’est attaquer avec deux pièces contre quatre.',
      sauf: 'Un roi adverse exposé justifie d’attaquer n’importe où, même à un contre trois.',
    },
    'avant-d-attaquer-sur': {
      regle: 'Avant d’attaquer sur une aile, assure le centre.',
      pourquoi:
        'Une attaque d’aile se réfute par un coup au centre : les lignes s’ouvrent là où ton roi se trouve, et l’attaque n’a plus le temps d’aboutir.',
      sauf: 'Avec les rois roqués à l’opposé, la course est lancée et compter les temps remplace le principe.',
    },
    'n-echange-pas-sans': {
      regle: 'N’échange pas sans savoir ce que l’échange te laisse.',
      pourquoi:
        'Chaque échange simplifie, et la simplification favorise celui qui a l’avantage matériel. Si c’est l’autre, elle te coûte.',
      sauf: 'Échanger pour se débarrasser de la pièce qui attaque ton roi est presque toujours bon, même en étant moins bien.',
    },
    'deux-faiblesses-valent-mieux': {
      regle: 'Deux faiblesses valent mieux qu’une.',
      pourquoi:
        'Une position ne tombe presque jamais sur un seul point faible : on en crée un second à l’autre bout, et la défense ne peut plus couvrir les deux.',
      sauf: 'Si la première faiblesse suffit à gagner du matériel tout de suite, ne cherche pas la seconde.',
    },
    'regarde-le-coup-le': {
      regle: 'Regarde le coup le plus méchant avant de jouer le tien.',
      pourquoi:
        'C’est la version courte du mémo. Un seul coup examiné — le plus agressif qu’il ait — écarte la quasi-totalité des gaffes.',
      sauf: 'Rien. Celui-là ne souffre aucune exception.',
    },
    'quand-tu-as-gagne': {
      regle: 'Quand tu as gagné du matériel, simplifie.',
      pourquoi:
        'Une pièce de plus sur un échiquier vide décide la partie ; la même pièce dans une position compliquée se perd en un coup.',
      sauf: 'Ne simplifie pas vers une finale nulle par nature — fou de mauvaise couleur, pion a ou h isolé.',
    },
    'active-ton-roi': {
      regle: 'Active ton roi.',
      pourquoi:
        'Sans dames, le roi devient une pièce forte et gratuite. Celui qui le garde au fond joue avec une pièce de moins.',
      sauf: 'Tant qu’il reste des dames ou deux tours chacun, le roi reste une cible.',
    },
    'la-tour-se-place': {
      regle: 'La tour se place derrière le pion passé.',
      pourquoi:
        'Derrière, elle gagne de l’espace à mesure que le pion avance — qu’il soit à toi ou à lui. Devant, elle se fait pousser.',
      sauf: 'Sur la septième rangée, une tour qui mange des pions fait souvent mieux que la règle.',
    },
    'cree-un-pion-passe': {
      regle: 'Crée un pion passé du côté où tu as la majorité.',
      pourquoi:
        'Deux pions contre un produisent un pion passé par la force des choses. C’est le plan le plus mécanique de toutes les finales.',
      sauf: 'Si ta majorité est du côté du roi adverse, elle ne produira qu’un pion passé qu’il arrêtera du pied.',
    },
    'prends-l-opposition': {
      regle: 'Prends l’opposition.',
      pourquoi:
        'Dans les finales de rois et de pions, celui qui oblige l’autre à céder le passage gagne. L’opposition est la façon de le savoir à l’avance.',
      sauf: 'Les positions à plusieurs pions se décident d’abord au calcul des temps ; l’opposition ne tranche que les cas simples.',
    },
    'compte-avant-de-courir': {
      regle: 'Compte avant de courir.',
      pourquoi:
        'La règle du carré, ou deux colonnes de calcul : on sait en cinq secondes si le roi rattrape le pion. C’est plus fiable que n’importe quelle intuition.',
      sauf: 'Les pions qui se gênent entre eux cassent le carré : il faut alors calculer pour de vrai.',
    },
    'ne-te-precipite-pas': {
      regle: 'Ne te précipite pas.',
      pourquoi:
        'Une finale gagnante se gagne en améliorant sa position coup après coup. La hâte est la première cause de nulle dans les positions gagnées.',
      sauf: 'La règle des cinquante coups existe : si rien ne bouge, il faudra bien pousser un pion.',
    },
    'cherche-le-pat-quand': {
      regle: 'Cherche le pat quand tu perds.',
      pourquoi:
        'C’est la planche de salut de celui qui est derrière, et elle fonctionne d’autant mieux que l’autre se croit gagnant.',
      sauf: 'Ne joue pas pour le pat au prix d’une position encore tenable : on ne sacrifie pas une nulle probable pour une nulle miraculeuse.',
    },
    'echange-les-pieces-pas': {
      regle: 'Échange les pièces, pas les pions.',
      pourquoi:
        'Avec un pion de plus, chaque pièce échangée te rapproche du gain ; chaque pion échangé t’en éloigne.',
      sauf: 'Inverse exact quand tu as un pion de moins : échange les pions et garde les pièces.',
    },
    'un-cavalier-veut-un': {
      regle: 'Un cavalier veut un avant-poste.',
      pourquoi:
        'Une case avancée qu’aucun pion ne peut attaquer, défendue par l’un des tiens : le cavalier qui s’y installe ne partira plus.',
      sauf: 'Un avant-poste qui ne regarde rien d’important n’est qu’une jolie case.',
    },
    'un-fou-veut-des': {
      regle: 'Un fou veut des diagonales ouvertes.',
      pourquoi: 'Il ne coûte rien à placer et tout à débloquer : on déplace les pions, pas le fou.',
      sauf: 'Un fou peut rester derrière ses pions pour les tenir, le temps que la position s’ouvre.',
    },
    'la-paire-de-fous': {
      regle: 'La paire de fous aime les positions ouvertes.',
      pourquoi:
        'À deux, ils couvrent les deux couleurs de cases : l’avantage vaut environ un demi-pion, et plus la position est ouverte, plus il compte.',
      sauf: 'Dans une position bloquée, un bon cavalier vaut mieux que deux fous qui ne voient rien.',
    },
    'ne-cree-pas-de': {
      regle: 'Ne crée pas de faiblesse de pion sans compensation.',
      pourquoi:
        'Un pion isolé, doublé ou arriéré est une cible permanente : il ne bouge plus et il faut le garder.',
      sauf: 'Le pion isolé donne de l’espace et des cases au milieu de partie. C’est un défaut de finale payé en activité.',
    },
    'les-cases-faibles-se': {
      regle: 'Les cases faibles se prennent, pas se regrettent.',
      pourquoi:
        'Une case que plus aucun pion adverse ne défend est à occuper avec une pièce, pas à contempler.',
      sauf: 'Occuper une case faible avec sa seule pièce active peut la rendre passive à son tour.',
    },
    'empeche-avant-de-faire': {
      regle: 'Empêche avant de faire.',
      pourquoi:
        'La prophylaxie : voir ce que l’adversaire veut faire et le rendre impossible. C’est la compétence qui sépare 1 900 de 2 200.',
      sauf: 'À trop empêcher, on ne fait rien. Il faut un plan à soi en plus.',
    },
    'le-pion-passe-protege': {
      regle: 'Le pion passé protégé est un avantage durable.',
      pourquoi:
        'Il ne peut pas être pris, il doit être surveillé, et il fixe une pièce adverse pour le reste de la partie.',
      sauf: 'Il ne gagne rien tout seul : il faut une seconde faiblesse ailleurs.',
    },
    'une-colonne-se-prend': {
      regle: 'Une colonne se prend avec deux tours.',
      pourquoi:
        'La première tour occupe, la seconde double. C’est la façon de transformer une colonne ouverte en pénétration sur la septième.',
      sauf: 'Si l’adversaire contrôle la case d’entrée, doubler ne sert à rien tant qu’on ne l’a pas contestée.',
    },
    'les-pions-ne-reviennent': {
      regle: 'Les pions ne reviennent pas.',
      pourquoi:
        'Chaque poussée est définitive. C’est pour cela qu’une structure de pions raconte la suite de la partie mieux que la position des pièces.',
      sauf: 'Rien. C’est une règle du jeu, pas un principe.',
    },
    'bloque-le-pion-passe': {
      regle: 'Bloque le pion passé de l’adversaire, de préférence avec un cavalier.',
      pourquoi:
        'Un pion bloqué ne va plus à dame, et le cavalier qui le bloque garde toute son activité — contrairement à une tour.',
      sauf: 'Si tu peux le gagner plutôt que le bloquer, gagne-le.',
    },
    'un-roi-expose-change': {
      regle: 'Un roi exposé change tous les calculs.',
      pourquoi:
        'Face à un roi sans abri, le matériel compte moins que le nombre de pièces qui le regardent. C’est la seule situation où sacrifier se fait à l’instinct.',
      sauf: 'Un roi exposé mais bien défendu tient très bien : compte les attaquants et les défenseurs avant de donner.',
    },
    'les-roques-opposes-veulent': {
      regle: 'Les roques opposés veulent des pions, pas des pièces.',
      pourquoi:
        'Quand chacun attaque de son côté, les pions arrivent sans affaiblir son propre roi. Le plus rapide gagne.',
      sauf: 'Si son attaque est plus rapide que la tienne, il faut défendre — et ce calcul-là se fait coup par coup.',
    },
    'echange-le-fou-qui': {
      regle: 'Échange le fou qui défend la couleur de cases que tu attaques.',
      pourquoi:
        'Supprimer le défenseur des cases noires autour du roi rend toutes tes pièces noires soudainement utiles.',
      sauf: 'Pas au prix de deux temps si l’attaque est une course.',
    },
    'quand-tu-ne-sais': {
      regle: 'Quand tu ne sais pas quoi faire, regarde les pions.',
      pourquoi:
        'La structure dit où attaquer, de quel côté l’espace se trouve et quelle finale t’attend. Elle répond quand plus rien ne répond.',
      sauf: 'Rien — c’est le principe de secours, il sert précisément quand les autres se taisent.',
    },
  },
  fiches: {
    italienne: {
      nom: 'Partie italienne',
      alias: 'italienne, giuoco piano, partie italienne',
      idee: 'Le développement le plus direct qui existe : pion au centre, cavalier, fou, et le fou regarde f7 — la case la plus faible tant que le roi noir n’a pas roqué.',
      structure:
        'Pions e4 contre e5, centre symétrique et fermé tant que personne ne joue d4 ou d5. Tout se décide sur le moment où ce centre s’ouvre.',
      planBlancs:
        'Roquer, puis c3 et d4 pour construire un gros centre de pions. À défaut, la version lente : d3, Nbd2, Nf1-g3 et une attaque de pions sur l’aile roi.',
      planNoirs:
        'La même chose en miroir — c6, d5 — ou bien ...Nf6 pour aller vers la défense des deux cavaliers, qui est plus tranchante.',
      piege:
        'Ne joue jamais Dh5 en espérant le mat du berger : les Noirs parent en développant, et tu passes trois coups à ramener ta dame.',
    },
    espagnole: {
      nom: 'Partie espagnole',
      alias: 'espagnole, ruy lopez, partie espagnole',
      idee: 'Attaquer le défenseur plutôt que le pion : le fou en b5 ne prend pas e5, il neutralise le cavalier qui le garde.',
      structure:
        'Centre e4 contre e5, souvent refermé par d3 et c3 côté blanc. Les parties se jouent longtemps sans aucun échange de pions.',
      planBlancs:
        'c3, d3, Nbd2, puis la manœuvre de cavalier vers f1 et g3 ou e3. On réarrange lentement et on attaque ensuite sur l’aile roi.',
      planNoirs:
        'a6 pour chasser le fou, puis d6, Be7, 0-0, et la poussée ...b5 qui gagne de l’espace sur l’aile dame.',
      piege:
        'L’arche de Noé : après a6, b5 et c4, les pions noirs enferment le fou blanc sur b3 et le gagnent purement et simplement.',
    },
    'deux-cavaliers': {
      nom: 'Défense des deux cavaliers',
      alias: 'défense des deux cavaliers, deux cavaliers, fegatello, fried liver',
      idee: 'Les Noirs ignorent la menace sur f7 et développent. C’est un pari sur le calcul : la position devient immédiatement tranchante.',
      structure:
        'Centre ouvert dès que d4 ou d5 arrive. Les pions comptent moins que le temps, dans les dix premiers coups.',
      planBlancs:
        'Ng5 pour taper f7 tout de suite, ou le d4 tranquille. Le premier mène au Fegatello, le second à une partie ordinaire.',
      planNoirs:
        'Après Ng5, la réponse est d5 — et surtout pas de reprendre en d5 avec le cavalier.',
      piege:
        'Le Fegatello : 4.Cg5 d5 5.exd5 Cxd5 perd sur 6.Cxf7 Rxf7 7.Df3+. Le coup juste est 5…Ca5, qui chasse le fou et garde tout.',
    },
    ecossaise: {
      nom: 'Partie écossaise',
      alias: 'écossaise, partie écossaise',
      idee: 'Ouvrir le centre au troisième coup, avant que les Noirs n’aient fini de s’installer. Rien à mémoriser : les pièces sortent sur des cases évidentes.',
      structure:
        'Le centre s’ouvre tout de suite. Les pions blancs et noirs s’échangent en d4, et il reste deux camps avec des pièces libres.',
      planBlancs:
        'Reprendre en d4 avec le cavalier, puis développer vite et occuper les colonnes ouvertes. Les positions sont simples et les pièges rares.',
      planNoirs:
        '...Bc5 ou ...Nf6 pour attaquer le cavalier d4 et obtenir le même développement libre.',
      piege:
        'Après 4…Fc5, ne joue pas Cxc6 machinalement : les Noirs reprennent en dxc6 et leur fou c5 devient très fort sur la diagonale.',
    },
    'gambit-roi': {
      nom: 'Gambit du roi',
      alias: 'gambit du roi',
      idee: 'Donner un pion pour prendre tout le centre et ouvrir la colonne f vers le roi noir. C’est la plus romantique des ouvertures et la plus risquée.',
      structure:
        'Colonne f ouverte pour les Blancs, pion noir en plus et diagonale e1-h4 dangereusement dégarnie.',
      planBlancs:
        'Nf3, d4, Bc4 et attaquer en colonne f avant que les Noirs ne consolident leur pion de plus.',
      planNoirs:
        'Rendre le pion au bon moment et viser le roi blanc — la case g3 et la diagonale vers e1 sont les points faibles.',
      piege:
        'Après 2.f4 exf4, ne joue pas 3.Cf3 g5 4.h4 sans savoir où va ta tour : la colonne h s’ouvre dans les deux sens.',
    },
    petroff: {
      nom: 'Défense russe',
      alias: 'défense russe, petroff, pétroff',
      idee: 'Répondre à l’attaque par une attaque symétrique. L’ouverture la plus solide contre 1.e4, et celle qui mène au plus grand nombre de nulles.',
      structure:
        'Souvent un échange de pions centraux et une position presque symétrique, où le moindre avantage se joue sur une colonne.',
      planBlancs: 'Cxe5 puis d4, ou le calme Cc3. L’avantage est minime et se travaille longtemps.',
      planNoirs:
        'Après 3.Cxe5, jouer d6 pour chasser le cavalier avant de reprendre en e4. Jamais 3…Cxe4 tout de suite.',
      piege:
        '3.Cxe5 Cxe4 perd du matériel sur 4.De2 : le cavalier noir est attaqué et la colonne e se retourne contre lui.',
    },
    philidor: {
      nom: 'Défense Philidor',
      alias: 'philidor, défense philidor',
      idee: 'Tenir e5 avec un pion plutôt qu’avec une pièce. Solide, et volontairement passif — il faudra un plan actif plus tard.',
      structure:
        'Pions noirs en e5 et d6, qui enferment le fou f8. Les Blancs ont plus d’espace pour rien.',
      planBlancs:
        'd4 pour ouvrir, Nc3, Bc4, et profiter de l’espace pendant que les Noirs se débrouillent avec leur fou.',
      planNoirs:
        'Nf6, Be7, 0-0, puis chercher ...c6 et ...d5 pour se libérer. Sans cette poussée, la position reste étroite.',
      piege:
        'Le mat de Légal : après 3…d6 4.Fc4 Fg4 5.h3 Fh5, prendre le cavalier f3 offre un mat en trois. On ne cloue pas un cavalier qu’on ne peut pas garder.',
    },
    sicilienne: {
      nom: 'Défense sicilienne',
      alias: 'sicilienne, défense sicilienne',
      idee: 'Refuser la symétrie dès le premier coup. Les Noirs échangent un pion d’aile contre un pion central et obtiennent la colonne c.',
      structure:
        'Après l’échange en d4, les Blancs ont un pion e4 et une colonne d ; les Noirs une colonne c ouverte et une majorité au centre.',
      planBlancs:
        'Attaquer sur l’aile roi : f4, g4, et souvent le roque long pour lancer les pions. La course est le thème de l’ouverture.',
      planNoirs:
        'La colonne c vers le roi blanc, la poussée ...b5, et un cavalier en c4 ou d4. Compter les temps avant de défendre.',
      piege:
        'Ne prends pas le pion b2 avec la dame sans avoir compté : elle se fait souvent enfermer, et les Blancs gagnent l’attaque pour un pion.',
    },
    najdorf: {
      nom: 'Sicilienne Najdorf',
      alias: 'najdorf',
      idee: 'Le coup a6 avant tout le reste : il enlève la case b5 aux pièces blanches et prépare ...b5 et ...e5 sans concession.',
      structure:
        'Centre ouvert, pions noirs en d6 et e6 ou e5, et un trou permanent en d5 que les Blancs visent.',
      planBlancs:
        'Fe3, f3, Dd2, roque long, puis g4 et h4. Ou le Fg5 classique, qui attaque tout de suite.',
      planNoirs:
        '...e5 ou ...e6, ...b5, et la contre-attaque en colonne c. La case d5 se défend avec des pièces, pas avec des pions.',
      piege:
        'L’attaque anglaise arrive vite : si tu laisses g4 et h4 venir sans jouer, ton roque tombe en dix coups.',
    },
    francaise: {
      nom: 'Défense française',
      alias: 'française, défense française',
      idee: 'Préparer ...d5 pour frapper e4 au coup suivant, en acceptant un inconvénient connu : le fou c8 reste longtemps enfermé.',
      structure:
        'Chaîne de pions e6-d5 contre e4-d4, souvent bloquée après e5. Les Blancs ont de l’espace à l’aile roi, les Noirs la colonne c et la base d4 à attaquer.',
      planBlancs: 'e5 pour fermer, puis attaquer le roi : f4, Nf3, et les pièces vers h5 et g5.',
      planNoirs:
        'Frapper la base de la chaîne avec ...c5, et trouver une case au fou c8 — b7 après ...b6, ou a6.',
      piege:
        'Après 2.d4 d5 3.Cc3 Cf6 4.e5, ne laisse pas ton cavalier f6 sans case : il se retrouve en d7 et le jeu noir s’étouffe.',
    },
    'caro-kann': {
      nom: 'Défense Caro-Kann',
      alias: 'caro-kann, caro kann',
      idee: 'La française sans son défaut : on prépare ...d5 avec le pion c6 plutôt qu’avec e6, et le fou c8 garde sa diagonale.',
      structure:
        'Souvent un pion noir en d5 échangé contre e4, une structure saine et aucune faiblesse. Les finales y sont bonnes pour les Noirs.',
      planBlancs:
        'L’avance c’est e5 et la poussée c4 ; l’échange c’est exd5 puis une bataille d’espace. Dans les deux cas, jouer vite pour empêcher la consolidation.',
      planNoirs:
        'Sortir le fou c8 en f5 ou g4 avant de jouer e6, développer proprement, et viser la finale.',
      piege:
        'Après 2.d4 d5 3.exd5 cxd5 4.Fd3, ne réponds pas Fg4 : le fou se fait chasser par f3 et tu perds le temps que tu venais de gagner.',
    },
    scandinave: {
      nom: 'Défense scandinave',
      alias: 'scandinave, défense scandinave',
      idee: 'Échanger tout de suite le pion central, au prix d’une sortie de dame assumée. La plus simple des défenses à apprendre contre 1.e4.',
      structure:
        'Pion blanc en d4, aucun pion noir au centre, et une dame noire active sur a5 ou d6.',
      planBlancs:
        'Cc3 pour gagner un temps sur la dame, puis d4, Cf3, Fc4 et le roque : un développement plus rapide, c’est tout l’avantage.',
      planNoirs:
        'Dame en a5 ou d6 — une case où elle ne se fait plus chasser — puis Cf6, c6, Ff5, e6 et le roque. Le plan est le même à chaque partie.',
      piege:
        'Dame en d8 après 3.Cc3 concède deux temps pour rien. Et si la dame va en a5, attention au clouage Fd2 suivi de Cd5.',
    },
    pirc: {
      nom: 'Défense Pirc',
      alias: 'pirc, défense pirc',
      idee: 'Laisser les Blancs prendre tout le centre, puis le frapper à coups de ...e5 ou ...c5 quand il est trop grand pour être tenu.',
      structure:
        'Gros centre blanc e4-d4, fou noir en g7 sur la longue diagonale, et un roque noir solide.',
      planBlancs:
        'f4 et l’attaque autrichienne, ou le calme Fe2 et 0-0. Tenir le centre est la seule obligation.',
      planNoirs:
        'Fg7, 0-0, puis ...c5 ou ...e5 selon ce que les Blancs ont joué. Le fou g7 doit finir par voir d4.',
      piege:
        'Si tu oublies de frapper le centre, les Blancs jouent e5 et ton fou g7 regarde son propre cavalier jusqu’à la fin.',
    },
    alekhine: {
      nom: 'Défense Alekhine',
      alias: 'alekhine, défense alekhine',
      idee: 'Provoquer e5 pour donner au pion blanc une avance qu’il devra défendre, et le harceler ensuite avec ...d6.',
      structure:
        'Pions blancs très avancés, souvent e5 et d4 voire c4 : beaucoup d’espace, et autant de points à tenir.',
      planBlancs:
        'Les quatre pions — e5, d4, c4, f4 — si l’on aime le risque ; sinon Cf3, Fe2 et un jeu d’espace tranquille.',
      planNoirs:
        '...d6 pour attaquer e5, échanger, et exploiter les cases que les pions blancs ont laissées derrière eux.',
      piege:
        'Le cavalier noir est chassé trois fois de suite au début : compte bien ses cases de repli avant de t’y engager.',
    },
    'gambit-dame': {
      nom: 'Gambit dame',
      alias: 'gambit dame, gambit de la dame',
      idee: 'Ce n’est pas un vrai gambit : si les Noirs prennent en c4, les Blancs récupèrent le pion quand ils veulent avec e3 ou Da4.',
      structure:
        'Tension au centre entre c4 et d5. Tout dépend de qui prend le premier, et avec quoi.',
      planBlancs:
        'Cc3, Cf3, Fg5, e3 : on développe, on garde la tension, et la minorité à l’aile dame attaque plus tard.',
      planNoirs:
        'Tenir d5 avec e6 ou c6, ou prendre en c4 et rendre le centre contre du développement.',
      piege:
        'Le piège de l’éléphant : après Fg5 Cbd7, la prise Cxd5 perd une pièce sur Cxd5 Fxd8 Fb4+. Ne prends pas un pion « cloué » qui ne l’est pas.',
    },
    'gambit-dame-accepte': {
      nom: 'Gambit dame accepté',
      alias: 'gambit dame accepté',
      idee: 'Rendre le centre tout de suite pour gagner du temps et placer ses pièces. Les Noirs ne garderont pas le pion, et ce n’est pas le but.',
      structure:
        'Pions blancs e3-d4 contre un pion noir en c-quelque-chose ; les Blancs ont un centre mobile, les Noirs la colonne c.',
      planBlancs:
        'e3 ou e4, reprendre c4, et pousser d4-d5 au bon moment. Le pion isolé qui en résulte est une arme, pas un défaut.',
      planNoirs: '...e6, ...c5 et ...Cc6 pour attaquer d4. Le fou c8 sort avant d’être enfermé.',
      piege:
        'Ne cherche pas à garder le pion c4 avec ...b5 : les Blancs jouent a4 et ta structure d’aile dame s’effondre.',
    },
    slave: {
      nom: 'Défense slave',
      alias: 'slave, défense slave',
      idee: 'Défendre d5 avec c6 plutôt qu’avec e6 : le fou c8 garde sa sortie, et c’est toute la différence avec le gambit dame ordinaire.',
      structure:
        'Pions c6 et d5 très solides. Les Noirs n’ont aucune faiblesse, et aucun jeu avant d’avoir joué ...dxc4 ou ...e6.',
      planBlancs: 'Cf3, Cc3, e3, puis Fd3 et 0-0 ; on cherche ensuite e4 pour ouvrir le centre.',
      planNoirs:
        '...dxc4 suivi de ...Ff5 ou ...b5, ou le plan lent ...e6, ...Cbd7 et ...dxc4 plus tard.',
      piege:
        'Le piège de l’échange : après 3…c6 4.cxd5 cxd5, la position est rigoureusement symétrique et ne donne rien aux Blancs. Ne joue cet échange que si tu veux la nulle.',
    },
    londres: {
      nom: 'Système de Londres',
      alias: 'système de londres, londres',
      idee: 'Sortir le fou avant de jouer e3, pour ne pas l’enfermer. Un système : les mêmes six coups quoi que jouent les Noirs.',
      structure:
        'Pions blancs d4 et e3, pion noir d5, centre fermé. La partie se joue sur la case e5 et sur l’aile roi.',
      planBlancs:
        'e3, Fd3, Cbd2, c3, puis Ce5 et une attaque lente sur le roque noir. Rien à mémoriser, tout à comprendre.',
      planNoirs:
        'Contester e5 avec ...Cbd7 et ...c5, ou échanger le fou f4 par ...Fd6. Une fois ce fou parti, le système perd son tranchant.',
      piege:
        'Ne joue pas Fd3 avant que le fou c8 ne soit sorti : les Noirs répondent Ff5 et échangent ton meilleur attaquant.',
    },
    'nimzo-indienne': {
      nom: 'Défense nimzo-indienne',
      alias: 'nimzo-indienne, nimzo indienne, nimzo',
      idee: 'Clouer le cavalier c3 pour empêcher e4. Les Noirs échangent un fou contre un cavalier et obtiennent le contrôle des cases claires.',
      structure:
        'Souvent des pions blancs doublés en c après ...Fxc3 : une faiblesse contre la paire de fous. Tout le jeu part de cet échange.',
      planBlancs:
        'a3 pour forcer l’échange, ou Dc2 pour l’éviter. Ensuite e4 à tout prix, et la paire de fous dans une position ouverte.',
      planNoirs:
        'Empêcher e4 le plus longtemps possible, fixer les pions c doublés et jouer ...c5, ...d6, ...Cc6.',
      piege:
        'Ne rends pas le fou en b4 sans contrepartie : s’il part sans avoir provoqué a3 ni doublé les pions, les Noirs ont perdu la paire pour rien.',
    },
    'est-indienne': {
      nom: 'Défense est-indienne',
      alias: 'est-indienne, est indienne, indienne du roi',
      idee: 'Laisser les Blancs prendre le centre entier, roquer derrière le fou g7, puis tout faire sauter avec ...e5.',
      structure:
        'Gros centre blanc, chaîne de pions, et une bataille d’ailes : Blancs à l’aile dame, Noirs à l’aile roi.',
      planBlancs:
        'e4, Fe2, 0-0, puis d5 et la poussée c5 à l’aile dame. Tenir le centre et ne pas s’occuper de l’attaque noire trop tôt.',
      planNoirs:
        '...e5, puis ...f5, ...g4 et les pions sur le roi blanc. L’ouverture la plus tranchante qui existe contre 1.d4.',
      piege:
        'Si le centre se ferme par d5 et que tu n’as pas joué ...f5, ton attaque n’a pas de munitions : la course est perdue avant de commencer.',
    },
    grunfeld: {
      nom: 'Défense Grünfeld',
      alias: 'grünfeld, grunfeld',
      idee: 'Frapper le centre avant même de roquer. Les Noirs donnent le centre pour l’attaquer à la pièce — c’est l’ouverture hypermoderne par excellence.',
      structure:
        'Grand centre de pions blanc en c3-d4-e4 contre un fou g7 et les pions ...c5. Tout se joue sur la solidité de ce centre.',
      planBlancs:
        'Construire e4-d4-c3 et avancer : si le centre tient, il écrase. Fe3, Cf3, Fe2, 0-0.',
      planNoirs:
        '...Fg7, ...c5, ...Cc6 et la pression sur d4. Le fou g7 est la pièce de toute la partie.',
      piege:
        'Ne prends pas le pion d4 avec la dame trop tôt : les Blancs gagnent deux temps et ton roi n’a pas encore roqué.',
    },
    catalane: {
      nom: 'Ouverture catalane',
      alias: 'catalane, ouverture catalane',
      idee: 'Un fou en g2 qui regarde d5 à travers tout l’échiquier. Pression lente, sans risque, et très difficile à jouer contre sans plan.',
      structure:
        'Pion blanc d4, pion noir d5 souvent échangé en c4, et une longue diagonale blanche ouverte.',
      planBlancs:
        'Fg2, 0-0, Dc2 ou Da4 pour récupérer c4, puis e4 ou la pression en colonne c et sur d5.',
      planNoirs:
        'Tenir c4 avec ...b5 et ...Fb7, ou rendre le pion et jouer ...c5 pour ouvrir la diagonale de son propre fou.',
      piege:
        'Rendre le pion c4 sans obtenir ...c5 en échange laisse les Noirs sans le moindre jeu pour vingt coups.',
    },
    hollandaise: {
      nom: 'Défense hollandaise',
      alias: 'hollandaise, défense hollandaise',
      idee: 'Jouer pour ...e5 dès le premier coup et obtenir une attaque sur l’aile roi. Le prix est connu : la case e6 et la diagonale vers le roi s’affaiblissent.',
      structure:
        'Pions noirs f5 et e6 ou g6, centre fermé, et une colonne f qui sert aux deux camps.',
      planBlancs:
        'g3 et Fg2 pour exploiter les cases claires, ou le gambit Staunton e4 pour ouvrir tout de suite.',
      planNoirs:
        '...Cf6, ...e6, ...Fe7, 0-0, puis ...De8 et ...e5. La poussée e5 est la raison d’être de l’ouverture.',
      piege:
        'Attention à Dh5+ et au fou en g5 dans les premiers coups : le trou en e6 et la diagonale h5-e8 sont le défaut du premier coup.',
    },
    anglaise: {
      nom: 'Ouverture anglaise',
      alias: 'anglaise, ouverture anglaise',
      idee: 'Une sicilienne à l’envers, avec un temps de plus. On prend d5 sous contrôle sans engager le moindre pion central.',
      structure:
        'Très variable : elle transpose dans presque tout. C’est sa force et la raison pour laquelle on la joue par système plutôt que par théorie.',
      planBlancs:
        'Cc3, g3, Fg2, Cf3, 0-0, puis la poussée d4 ou b4 selon ce que les Noirs ont construit.',
      planNoirs:
        '...e5 pour la symétrie, ...Cf6 et ...e6 pour transposer vers le gambit dame, ou ...c5 pour une bataille d’aile dame.',
      piege:
        'Ne joue pas d4 trop tôt : la transposition vers le gambit dame annule l’intérêt de l’ouverture et te fait affronter une théorie que l’anglaise évitait.',
    },
    reti: {
      nom: 'Ouverture Réti',
      alias: 'réti, reti',
      idee: 'Attaquer le pion d5 de loin, sans poser un seul pion au centre. Le centre se prend avec des pièces, pas avec des pions.',
      structure:
        'Aucun pion blanc au centre au début, un fou en g2, et une pression durable sur d5 et c6.',
      planBlancs:
        'g3, Fg2, 0-0, b3 et Fb2 : deux fous sur les longues diagonales, puis d4 ou e4 quand la position est mûre.',
      planNoirs:
        'Tenir d5 avec ...c6 et ...e6, ou prendre en c4 et jouer ...Ff5 pour sortir le fou avant de fermer.',
      piege:
        'Prendre en c4 et vouloir garder le pion coûte l’aile dame : les Blancs jouent a4 et la structure noire se démonte.',
    },
  },
  lecons: {
    bases: {
      title: 'Les bases',
      description:
        'L’échiquier, les six pièces, les trois règles spéciales. En une heure, tu sauras jouer une partie complète sans jamais te demander si un coup est autorisé.',
      echiquier: {
        title: 'L’échiquier et ses cases',
        summary: 'Soixante-quatre cases, et un nom pour chacune. C’est la langue du jeu.',
        e1: {
          say: 'Voici un échiquier. Soixante-quatre cases, huit colonnes et huit rangées. Une règle avant tout : la case en bas à droite doit toujours être claire.',
        },
        e2: {
          say: 'Les colonnes portent des lettres, de a à h, en partant de la gauche. Les rangées portent des chiffres, de 1 à 8, en partant du bas.',
        },
        e3: {
          say: "Chaque case a donc un nom : la lettre de sa colonne, puis le chiffre de sa rangée. Voici e4, au cœur de l'échiquier.",
        },
        e4: {
          say: "Ces quatre cases centrales — d4, d5, e4, e5 — sont les plus importantes de l'échiquier. Une pièce placée au centre contrôle beaucoup plus de cases qu'une pièce dans un coin. Retiens-le, c'est la première règle de stratégie.",
        },
        e5: {
          say: 'Voici la position de départ. Les Blancs en bas, les Noirs en haut. Petit truc pour ne jamais se tromper : la dame se place sur une case de sa couleur. Dame blanche sur case claire, dame noire sur case sombre.',
        },
      },
      tour: {
        title: 'La tour',
        summary: 'Elle va tout droit, aussi loin qu’elle veut. La plus simple, et redoutable.',
        e1: {
          say: "La tour se déplace en ligne droite : le long de sa colonne, ou le long de sa rangée. Aussi loin qu'elle veut, tant que la route est libre.",
        },
        e2: {
          say: 'À toi. Déplace la tour tout en haut de sa colonne, sur la case d8.',
          instruction: 'Joue la tour en d8',
          hint: 'Prends la tour et fais-la glisser vers le haut, jusqu’à la case d8.',
        },
        e3: {
          say: "La tour ne saute jamais par-dessus une pièce. Ici, ce pion noir en g4 lui barre la route : elle peut aller jusqu'en g4 pour le capturer, mais pas au-delà.",
        },
        e4: {
          say: 'Capture ce pion. Pour prendre une pièce, on pose simplement la sienne à sa place.',
          instruction: 'Capture le pion en g4',
          hint: 'Glisse la tour de d4 jusqu’en g4, sur le pion.',
        },
        e5: {
          say: "Voilà. La tour vaut cinq pions : c'est une pièce lourde, précieuse. Elle devient très forte quand les colonnes s'ouvrent, en fin de partie.",
        },
      },
      fou: {
        title: 'Le fou',
        summary: 'Il file en diagonale — et reste toute sa vie sur des cases de la même couleur.',
        e1: {
          say: "Le fou se déplace en diagonale, aussi loin qu'il veut. Lui non plus ne saute par-dessus rien.",
        },
        e2: {
          say: "Regarde bien : ce fou est sur une case sombre, et toutes les cases qu'il peut atteindre sont sombres. Un fou ne change jamais de couleur de case. De toute la partie.",
        },
        e3: {
          say: "C'est pour ça qu'on parle de la paire de fous : avec les deux, on couvre toutes les cases de l'échiquier. Avec un seul, la moitié seulement lui échappe pour toujours.",
        },
        e4: {
          say: 'À toi. Capture le pion noir en f6.',
          instruction: 'Capture le pion en f6',
          hint: 'Suis la diagonale vers le haut à droite : d4, e5, f6.',
        },
        e5: {
          say: 'Le fou vaut environ trois pions, comme le cavalier. En position ouverte, avec peu de pions au centre, il est souvent le plus fort des deux.',
        },
      },
      dame: {
        title: 'La dame',
        summary: 'Tour et fou réunis. La pièce la plus puissante — et donc la plus fragile.',
        e1: {
          say: "La dame combine la tour et le fou : lignes droites et diagonales, aussi loin qu'elle veut. Depuis le centre, elle contrôle vingt-sept cases.",
        },
        e2: {
          say: "Elle vaut neuf pions. C'est énorme, et c'est justement le problème : n'importe quelle pièce adverse peut la prendre, et on perd immédiatement la partie. Une dame se protège.",
        },
        e3: {
          say: "Cette tour noire en d8 n'est défendue par personne, et elle est sur la colonne de ta dame. Prends-la.",
          instruction: 'Capture la tour en d8',
          hint: 'La dame monte tout droit le long de la colonne d.',
        },
        e4: {
          say: 'Une erreur très courante chez les débutants : sortir la dame dès les premiers coups. Elle se fait alors chasser par des pièces adverses moins précieuses, et on perd du temps à la sauver. Sors-la tard.',
        },
      },
      cavalier: {
        title: 'Le cavalier',
        summary: 'Le seul qui saute. Déroutant au début, redoutable une fois apprivoisé.',
        e1: {
          say: 'Le cavalier se déplace en L : deux cases dans une direction, puis une case perpendiculairement. Depuis d4, il peut atteindre huit cases.',
        },
        e2: {
          say: "Le truc pour ne jamais se tromper : le cavalier change toujours de couleur de case. D'une case sombre il va sur une case claire, et inversement. Toujours.",
        },
        e3: {
          say: "Et surtout : c'est la seule pièce qui saute par-dessus les autres. Ici le cavalier est complètement entouré, et pourtant il peut sortir. Regarde.",
        },
        e4: {
          say: 'À toi. Fais-le sortir de ce mur : joue le cavalier en c6, par-dessus les pions.',
          instruction: 'Joue le cavalier en c6',
          hint: 'Deux cases vers le haut, une vers la gauche. Le cavalier passe par-dessus tout.',
        },
        e5: {
          say: 'Le cavalier vaut trois pions. Il est excellent dans les positions fermées, encombrées de pions, là où les fous et les tours étouffent.',
        },
      },
      pion: {
        title: 'Le pion',
        summary: 'Il avance tout droit mais capture en diagonale. Et il ne recule jamais.',
        e1: {
          say: "Le pion est la pièce la plus étrange. Il avance d'une case, tout droit, et jamais en arrière. Un pion qui avance ne revient pas.",
        },
        e2: {
          say: "Exception : depuis sa case de départ, il peut avancer de deux cases d'un coup. Une seule fois, à son premier déplacement.",
        },
        e3: {
          say: "Avance le pion de deux cases, jusqu'en d4.",
          instruction: 'Joue le pion en d4',
          hint: 'Attrape le pion et pose-le deux cases plus haut.',
        },
        e4: {
          say: 'Voici ce qui déroute tout le monde au début : le pion avance tout droit, mais il capture **en diagonale**. Ces deux pions noirs sont à sa portée.',
        },
        e5: {
          say: 'Regarde : le pion blanc en d2 peut capturer en c3 ou en e3, mais il ne peut pas capturer une pièce qui serait juste devant lui en d3. Elle le bloquerait, tout simplement.',
        },
        e6: {
          say: "Capture l'un des deux pions.",
          instruction: 'Capture un pion en diagonale',
          hint: 'Le pion prend en diagonale, d’une seule case.',
        },
        e7: {
          say: "Le pion vaut un. C'est l'unité de mesure de tout le jeu. Mais un pion qui atteint le bout de l'échiquier se transforme en dame — on y revient dans deux leçons.",
        },
      },
      roi: {
        title: 'Le roi',
        summary: 'Il se déplace d’une seule case — mais toute la partie tourne autour de lui.',
        e1: {
          say: "Le roi se déplace d'une seule case, mais dans toutes les directions. Huit cases possibles depuis le centre.",
        },
        e2: {
          say: "Le roi ne se capture jamais. Quand il est attaqué, on dit qu'il est en échec, et il faut absolument parer. Trois façons de le faire : bouger le roi, capturer l'attaquant, ou interposer une pièce.",
        },
        e3: {
          say: "Si aucune de ces trois parades n'existe, c'est échec et mat : la partie est finie. C'est le seul but du jeu.",
        },
        e4: {
          say: 'Dernière règle : deux rois ne peuvent jamais se toucher. Ils doivent toujours garder au moins une case entre eux, sans quoi ils se mettraient mutuellement en échec.',
        },
      },
      roque: {
        title: 'Le roque',
        summary: 'Deux pièces qui bougent en un coup : le seul de tout le jeu.',
        e1: {
          say: "Le roque met le roi à l'abri. C'est le seul coup où deux pièces bougent en même temps : le roi et une tour.",
        },
        e2: {
          say: 'Le petit roque, du côté du roi : le roi fait deux pas vers la tour, et la tour saute par-dessus lui pour se poser juste à côté. Regarde.',
        },
        e3: {
          say: 'Fais le petit roque. Prends le roi et amène-le sur la case g1 : la tour suivra toute seule.',
          instruction: 'Joue le petit roque',
          hint: 'Attrape le roi en e1 et pose-le en g1.',
        },
        e4: {
          say: 'Parfait. Ton roi est maintenant derrière trois pions intacts, et ta tour est sortie de son coin. Deux problèmes réglés en un coup.',
        },
        e5: {
          say: "Quatre conditions pour pouvoir roquer. Le roi n'a jamais bougé. La tour concernée n'a jamais bougé. Les cases entre eux sont vides. Et le roi n'est pas en échec, ne traverse pas une case attaquée, et n'arrive pas sur une case attaquée.",
        },
        e6: {
          say: "Il existe aussi le grand roque, du côté de la dame : le roi va en c1, la tour de a1 vient en d1. Il met le roi un peu moins à l'abri, mais active la tour plus vite.",
        },
      },
      'regles-speciales': {
        title: 'Prise en passant et promotion',
        summary: 'Les deux règles que personne ne devine tout seul.',
        e1: {
          say: "La prise en passant. Le pion noir vient d'avancer de deux cases d'un coup, en passant à côté de ton pion. La règle dit que tu peux le capturer comme s'il n'en avait avancé qu'une.",
        },
        e2: {
          say: 'Ton pion en e5 capture donc en d6, et le pion noir disparaît de d5. Essaie.',
          instruction: 'Capture en passant : joue le pion en d6',
          hint: 'Pose ton pion e5 sur la case d6, juste derrière le pion noir.',
        },
        e3: {
          say: "Attention : cette prise n'est possible qu'**immédiatement**. Si tu joues autre chose, l'occasion est perdue pour toujours.",
        },
        e4: {
          say: "La promotion, maintenant. Un pion qui atteint la dernière rangée se transforme. On choisit ce qu'on veut : dame, tour, fou ou cavalier.",
        },
        e5: {
          say: "Avance le pion en d8 et prends une dame — c'est le choix dans plus de quatre-vingt-dix-neuf pour cent des cas.",
          instruction: 'Promeus le pion en dame',
          hint: 'Avance le pion d’une case, puis choisis la dame dans le menu.',
        },
        e6: {
          say: "Un pion qui vaut un devient une pièce qui en vaut neuf. C'est pour ça qu'en finale, chaque pion compte énormément : c'est une dame en puissance.",
        },
      },
      'echec-mat-pat': {
        title: 'Échec, mat et pat',
        summary: 'Comment on gagne, et comment on rate la victoire d’un cheveu.',
        e1: {
          say: "Une tour sur la colonne du roi adverse : c'est un échec. Le roi noir est attaqué, il doit réagir.",
        },
        e2: {
          say: "Avec deux tours, on peut mater. Voici la technique de l'escalier : celle de h7 barre déjà la rangée 7, il ne reste plus qu'à donner échec sur la dernière.",
        },
        e3: {
          say: "Joue la tour en a8 : elle donne échec sur la dernière rangée, et l'autre tour lui interdit de descendre.",
          instruction: 'Joue la tour en a8',
          hint: 'La tour de a1 monte tout en haut de sa colonne.',
        },
        e4: {
          say: "Échec et mat. Le roi noir est attaqué, il ne peut pas fuir en rangée 7 parce que l'autre tour la contrôle, et il n'a rien pour capturer ou interposer. Partie terminée.",
        },
        e5: {
          say: "Maintenant le piège qui fait rager tous les débutants : le pat. Ici, c'est aux Noirs de jouer. Leur roi n'est **pas** en échec. Mais toutes ses cases sont contrôlées, et il n'a aucune autre pièce.",
        },
        e6: {
          say: "Aucun coup légal, et pas d'échec : c'est un pat, et la partie est nulle. Les Blancs avaient une dame de plus et n'ont rien gagné. Retiens bien : quand ton adversaire n'a presque plus rien, laisse-lui toujours une case.",
        },
      },
      valeurs: {
        title: 'Combien vaut chaque pièce',
        summary: 'Un barème simple qui te dira, à chaque échange, si tu y gagnes.',
        e1: {
          say: "Le barème universel. Le pion vaut un. Le cavalier et le fou valent trois. La tour vaut cinq. La dame vaut neuf. Le roi n'a pas de valeur : il est au-dessus de tout, on ne l'échange jamais.",
        },
        e2: {
          say: "À quoi ça sert ? À décider en une seconde si un échange est bon. Donner un cavalier pour une tour, c'est trois contre cinq : excellent. On appelle ça gagner la qualité.",
        },
        e3: {
          say: "Mais ces chiffres ne sont qu'un point de départ. Un cavalier bien placé au centre vaut plus qu'une tour coincée dans un coin. Et si tu peux mater, le matériel ne compte plus du tout.",
        },
        e4: {
          say: "Exemple : les Blancs viennent de donner leur fou, trois points, contre un simple pion. À première vue c'est absurde. Mais le roi noir est attiré hors de son abri, et l'attaque qui suit vaut bien plus que trois points.",
        },
        e5: {
          say: 'Voilà toute la beauté du jeu : le matériel est une boussole, pas une loi. Tu apprendras à savoir quand la suivre et quand la trahir.',
        },
      },
    },
    mats: {
      title: 'Savoir mater',
      description:
        'Gagner une dame ne sert à rien si l’on ne sait pas conclure. Les cinq techniques qui terminent une partie, du couloir aux deux fous.',
      'mat-couloir': {
        title: 'Le mat du couloir',
        summary: 'Le mat le plus fréquent de tous. Et le plus facile à subir.',
        e1: {
          say: "Regarde le roi noir. Il a roqué, il est bien à l'abri… sauf que ses propres pions lui bouchent toute sortie. Il est enfermé sur sa dernière rangée.",
        },
        e2: {
          say: 'Une tour qui arrive sur cette rangée fait mat immédiatement. Vas-y.',
          instruction: 'Trouve le mat en un coup',
          hint: 'La tour monte tout en haut de sa colonne.',
        },
        e3: {
          say: "Échec et mat. Le roi ne peut pas monter — il est déjà en haut — et pas descendre, ses pions occupent les cases. Ça s'appelle le mat du couloir.",
        },
        e4: {
          say: "La parade tient en un coup : avancer un pion pour créer une case d'air. Ici les Noirs ont joué h6, et leur roi peut désormais s'échapper en h7.",
        },
        e5: {
          say: "Prends l'habitude, dès que tes tours quittent la dernière rangée : fais une case d'air à ton roi. Ça t'évitera de perdre des parties gagnées.",
        },
      },
      'mat-escalier': {
        title: 'Le mat de l’escalier',
        summary: 'Deux tours, aucun calcul : la technique se répète jusqu’au mat.',
        e1: {
          say: "Deux tours suffisent à mater un roi nu, sans même l'aide du sien. Le principe : une tour repousse le roi, l'autre l'empêche de revenir.",
        },
        e2: {
          say: 'Commence par donner échec avec la tour de a2, sur la rangée 7. Le roi noir devra monter.',
          instruction: 'Joue la tour en a7',
          hint: 'La tour de a2 monte jusqu’en a7.',
        },
        e3: {
          say: "Le roi noir n'a d'autre choix que de monter en rangée 8. La tour de a7 lui interdit désormais de redescendre.",
        },
        e4: {
          say: "Maintenant l'autre tour vient donner échec sur la rangée 8. C'est mat.",
          instruction: 'Joue la tour en b8',
          hint: 'La tour de b1 monte tout en haut.',
        },
        e5: {
          say: "Voilà l'escalier : les tours montent une marche à tour de rôle, le roi recule, et il finit acculé. Aucun calcul, juste la méthode. Quand le roi s'approche d'une tour, on l'éloigne à l'autre bout de sa rangée.",
        },
      },
      'mat-tour-roi': {
        title: 'Mater avec le roi et la tour',
        summary:
          'La finale la plus fréquente. Une tour ne mate jamais seule : tout est dans le roi.',
        e1: {
          say: 'Roi et tour contre roi seul. Une tour ne mate jamais toute seule : essaie autant que tu veux, il te manquera toujours une case. C’est ton roi qui fait le travail, la tour ne donne que le coup final.',
        },
        e2: {
          say: 'La méthode tient en trois temps. La tour coupe une rangée pour interdire au roi noir de redescendre. Ton roi monte le rejoindre. Et quand les deux rois se font face, la tour mate.',
        },
        e3: {
          say: 'Voici la position à reconnaître, et c’est la seule à retenir. Les deux rois se font face, une case entre eux. Ton roi interdit à lui seul les trois cases devant lui : d7, e7 et f7. Il ne reste au roi noir que d8 et f8, sur sa rangée.',
        },
        e4: {
          say: 'Et une tour prend une rangée entière d’un seul coup. Vas-y.',
          instruction: 'Trouve le mat en un coup',
          hint: 'La tour monte tout en haut de sa colonne, le plus loin possible du roi noir.',
        },
        e5: {
          say: 'Échec et mat. La tour tient d8, e8 et f8 ; ton roi tient d7, e7 et f7. Six cases à deux, et il n’en faut pas une de plus.',
        },
        e6: {
          say: 'Première faute, et de loin la plus courante : donner échec trop tôt. Ici les rois ne se font pas face, ils sont décalés. La tour en h8 ferait échec, oui, mais le roi noir filerait en c7 et tout serait à refaire.',
        },
        e7: {
          say: 'Alors ne donne pas cet échec. Avance d’abord ton roi pour le mettre en face, puis mate. Un échec qui ne mate pas ne fait rien avancer dans cette finale : il rend juste sa liberté au roi adverse.',
        },
        e8: {
          say: 'Seconde faute, et elle coûte la partie entière : coller la tour contre le roi. Regarde. Le roi noir n’est pas en échec, et il n’a aucun coup. C’est un pat. Nulle, avec une tour de plus.',
        },
        e9: {
          say: 'D’où la règle : la tour mate depuis l’autre bout de l’échiquier, jamais à côté du roi. Loin, elle est intouchable et elle tient toute la rangée. Près, elle se fait manger ou elle fait nulle.',
        },
      },
      'mat-dame-roi': {
        title: 'Mater avec la dame',
        summary: 'La finale la plus fréquente après une promotion. À maîtriser absolument.',
        e1: {
          say: 'Roi et dame contre roi seul. La méthode : on rétrécit la cage autour du roi adverse avec la dame, puis on amène son propre roi pour donner le coup final.',
        },
        e2: {
          say: "Une astuce de repérage, et elle porte un nom trompeur : **le saut de cavalier**. Il n'y a aucun cavalier ici — c'est de sa **forme de déplacement** qu'on parle, le L. Les huit cases marquées sont à un saut de cavalier du roi noir. Une dame posée sur l'une d'elles lui retire presque tout, sans jamais l'enfermer complètement : c'est ce qui évite le pat.",
        },
        e3: {
          say: "Parmi ces huit cases, ta dame en d1 n'en atteint que quatre : d3, f3, g4 et d7. Prends **d3** — deux cases droit devant elle.",
          instruction: 'Joue la dame en d3',
          hint: 'La dame monte de deux cases sur sa colonne : de d1 à d3.',
        },
        e4: {
          say: "Regarde le résultat : le roi noir avait huit cases, il n'en a plus que trois — e6, f6 et f4. Et il n'est pas en échec, donc pas de pat. Tu répètes l'opération à chaque fois qu'il bouge, et la cage se referme d'elle-même.",
        },
        e5: {
          say: "Attention au piège : ici, la dame en f2 colle le roi noir, mais c'est aux Noirs de jouer et ils n'ont aucun coup. Pat. Nulle. Une dame de plus, et zéro point.",
        },
        e6: {
          say: "La règle d'or : ne colle jamais ta dame au roi adverse sans que ton propre roi la défende. Amène-le d'abord, mate ensuite.",
        },
      },
      'mat-deux-fous': {
        title: 'Mater avec les deux fous',
        summary:
          'Deux fous côte à côte font un mur qu’aucun roi ne franchit. Encore faut-il le voir.',
        e1: {
          say: 'Deux fous matent un roi seul, et c’est la seule paire de pièces légères qui y arrive à coup sûr. Le principe : chacun ne voit qu’une couleur de cases, mais à deux ils voient tout.',
        },
        e2: {
          say: 'Le mat ne tombe que dans un coin ou tout au bord. Ici le roi noir est déjà en h8, et ton roi en g6 lui interdit g7 et h7. Il ne lui reste qu’une case : g8.',
        },
        e3: {
          say: 'Et cette case-là, ton fou de c4 la surveille déjà, depuis l’autre bout de sa diagonale. Le roi noir est donc enfermé sans être en échec. Il ne manque plus que l’échec.',
        },
        e4: {
          say: 'Ton second fou, celui des cases noires, n’a qu’à se poser sur la grande diagonale pour toucher h8.',
          instruction: 'Joue le fou en c3',
          hint: 'Le fou de d2 recule d’une case en diagonale, vers c3.',
        },
        e5: {
          say: 'Échec et mat. Voilà le mur : un fou donne l’échec sur une diagonale, l’autre couvre la case de fuite sur la diagonale voisine, et ton roi tient les deux cases qui restent. Les trois pièces sont indispensables.',
        },
        e6: {
          say: 'La technique, en une phrase : rapproche tes deux fous côte à côte, ils forment une barrière que le roi ne peut pas traverser, puis avance la barrière vers un bord en amenant ton roi derrière. Ne sépare jamais les fous, c’est tout le secret.',
        },
      },
      'mat-etouffe': {
        title: 'Le mat étouffé',
        summary: 'Un cavalier mate un roi que ses propres pièces ont enfermé. Le plus beau du jeu.',
        e1: {
          say: 'Regarde le roi noir. Il a roqué, il est à l’abri, et il est enfermé — par sa propre tour en g8 et par ses propres pions en g7 et h7. Il n’a pas une seule case libre.',
        },
        e2: {
          say: 'Contre un roi comme celui-là, le cavalier est la seule pièce qui compte. Une tour ou une dame, on peut les prendre ou s’interposer devant. Un cavalier, non : il saute, et son échec ne se bloque jamais.',
        },
        e3: {
          say: 'Le cavalier saute en f7. De là il touche h8, et rien ne peut ni le prendre ni s’interposer.',
          instruction: 'Joue le cavalier en f7',
          hint: 'Le cavalier de g5 fait un L vers f7.',
        },
        e4: {
          say: 'Échec et mat avec un cavalier et rien d’autre. C’est ce qu’on appelle un mat étouffé : le roi meurt étouffé par ses propres défenseurs.',
        },
        e5: {
          say: 'Maintenant la version célèbre, et il y manque une chose. Les pions enferment toujours le roi, mais la tour est en f8 : la case g8 est libre. Le cavalier en f7 ne serait plus qu’un échec.',
        },
        e6: {
          say: 'Il faut donc boucher g8, et la seule pièce qui peut y aller est ta dame. On va l’y donner.',
        },
        e7: {
          say: 'La dame va en g8 et se laisse prendre. Elle n’est pas perdue : ton cavalier de h6 surveille g8, donc le roi ne peut pas la manger. Seule la tour peut.',
          instruction: 'Joue la dame en g8',
          hint: 'La dame de b3 file en diagonale jusqu’en g8.',
        },
        e8: {
          say: 'La tour a dû prendre — c’était son unique coup légal. Et en prenant, elle vient de se poser exactement sur la case par laquelle son roi pouvait s’échapper.',
        },
        e9: {
          say: 'La cage est refermée, par les Noirs eux-mêmes. Finis.',
          instruction: 'Trouve le mat',
          hint: 'Le cavalier de h6 saute en f7.',
        },
        e10: {
          say: 'Une dame contre un mat. Ça s’appelle le legs de Philidor, et c’est la plus vieille combinaison notée du jeu. Le réflexe à garder : dès qu’un roi adverse a roqué et qu’il n’a aucune case d’air, cherche un cavalier.',
        },
      },
    },
    'mats-ouverture': {
      title: 'Les mats de l’ouverture',
      description:
        'Les mats qui tombent dans les dix premiers coups. Chacun avec ses variantes : la ligne qui mate, les réponses qui l’annulent, et le prix à payer quand on l’a tenté pour rien.',
      'mat-imbecile': {
        title: 'Le mat de l’imbécile',
        summary: 'Deux coups. Le mat le plus rapide possible — et celui qu’il faut savoir éviter.',
        e1: {
          say: 'Le mat le plus rapide du jeu tient en deux coups. Tu ne le donneras probablement jamais — il faut que l’adversaire s’y prête — mais il t’apprend la diagonale la plus dangereuse de l’échiquier.',
        },
        e2: {
          say: 'Les Blancs ont avancé le pion f. Regarde ce qu’il vient d’ouvrir : une diagonale qui part de h4 et qui arrive droit sur leur roi, en passant par g3 et f2.',
        },
        e3: {
          say: 'Tu as les Noirs. Réponds e5, un coup tout à fait normal — il occupe le centre, et il libère ta dame sur cette même diagonale.',
          instruction: 'Joue le pion en e5',
          hint: 'Le pion e7 avance de deux cases.',
        },
        e4: {
          say: 'Et les Blancs avancent le pion g. C’est le second coup fatal : g3 n’est plus défendu par personne, f2 est vide, et la diagonale est grande ouverte de h4 jusqu’au roi blanc.',
        },
        e5: {
          say: 'À toi. Ta dame n’a qu’à parcourir la diagonale.',
          instruction: 'Trouve le mat',
          hint: 'La dame de d8 file en diagonale : e7, f6, g5, h4.',
        },
        e6: {
          say: 'Échec et mat en deux coups. Le roi blanc est attaqué et il ne peut rien faire : f2 est la seule case libre autour de lui, et ta dame la couvre. Rien ne peut s’interposer en g3 ni en f2, et rien n’atteint ta dame.',
        },
        e7: {
          say: 'Les variantes ne changent rien à l’affaire. f3 puis g4, f4 puis g4, ou g4 puis f3 : le mat est le même. Ce qui compte n’est pas l’ordre des coups mais le résultat — les deux pions f et g partis, et plus personne sur la diagonale du roi.',
        },
        e8: {
          say: 'Maintenant retourne l’échiquier, parce que c’est là que la leçon sert. Tu as les Blancs, et les Noirs viennent de jouer f6 puis g5. Ils ont commis exactement la même faute, un coup plus tard.',
        },
        e9: {
          say: 'Punis-les.',
          instruction: 'Trouve le mat',
          hint: 'La dame de d1 file en diagonale jusqu’en h5.',
        },
        e10: {
          say: 'Voilà la vraie leçon, et elle tient en une phrase : n’avance jamais les pions f et g ensemble avant d’avoir roqué. Ce sont eux qui gardent ton roi, et ils le gardent à deux ou pas du tout.',
        },
      },
      'mat-berger': {
        title: 'Le mat du berger',
        summary:
          'Quatre coups, et la partie est finie. Le connaître, c’est surtout ne plus le subir.',
        e1: {
          say: 'Au tout début de la partie, une case est plus faible que toutes les autres : f7. Regarde qui la défend. Personne, sauf le roi lui-même.',
        },
        e2: {
          say: 'Le fou sort en c4. De là, il regarde f7 en diagonale, par-dessus tout l’échiquier.',
          instruction: 'Joue le fou en c4',
          hint: 'Le fou de f1 sort en diagonale : e2, d3, c4.',
        },
        e3: {
          say: 'Les Noirs ont développé un cavalier, mais il ne défend pas f7. Amène maintenant ta dame en h5 : elle vise f7 elle aussi. Deux attaquants contre un seul défenseur.',
          instruction: 'Joue la dame en h5',
          hint: 'La dame de d1 file en diagonale jusqu’en h5.',
        },
        e4: {
          say: 'Les Noirs sortent leur second cavalier. Le coup a l’air naturel — il développe une pièce et il attaque ta dame — et il perd la partie sur le coup suivant.',
        },
        e5: {
          say: 'À toi. La dame prend en f7, et le fou la défend.',
          instruction: 'Trouve le mat',
          hint: 'La dame de h5 descend manger le pion f7.',
        },
        e6: {
          say: 'Échec et mat. Le roi ne peut pas prendre la dame, le fou c4 la protège. Il ne peut pas fuir non plus : la dame lui interdit e7 et d7, et ses propres pièces occupent d8 et f8.',
        },
        e7: {
          say: 'Première variante, et c’est la parade principale. Au lieu du cavalier, les Noirs avancent le pion g6. Il chasse la dame et il bouche sa diagonale d’un seul coup. Il n’y a plus de mat.',
        },
        e8: {
          say: 'Seconde parade, tout aussi bonne : la dame noire en e7. Elle défend f7 une seconde fois, et deux attaquants contre deux défenseurs ne font plus rien du tout.',
        },
        e9: {
          say: 'Troisième variante, et celle-là punit. Si les Noirs ont sorti leur cavalier en f6 d’entrée, ne joue surtout pas la dame en h5 : ce cavalier-là couvre h5, et il la mangerait tout simplement.',
        },
        e10: {
          say: 'Et voilà ce qui t’attend quand la parade arrive. Ta dame a dû reculer en f3, elle a perdu deux coups, les Noirs ont développé deux cavaliers et poussé g6. Tu as trois temps de retard et une dame qui gêne ton propre cavalier.',
        },
        e11: {
          say: 'Retiens donc les deux côtés. Si une dame vise ta case f7, réponds g6 ou défends avec ta dame en e7. Et ne compte pas sur ce mat toi-même : dès que ton adversaire le connaît, tu as juste sorti ta dame trop tôt, et tu vas passer la partie à la faire fuir.',
        },
      },
      'mat-shilling': {
        title: 'Le piège du Shilling',
        summary:
          'Les Noirs offrent un pion. Celui qui le prend est maté en sept coups, par ses propres pièces.',
        e1: {
          say: 'Partie italienne, la plus jouée de toutes. Tu as les Noirs. Ce piège se vendait un shilling dans les cafés d’échecs de Londres : on pariait cette pièce sur la partie, et on la gagnait.',
        },
        e2: {
          say: 'Joue ton cavalier en d4. Il a l’air perdu au milieu de rien, et c’est tout l’appât : il attaque le cavalier f3 et il laisse ton pion e5 sans défense.',
          instruction: 'Joue le cavalier en d4',
          hint: 'Le cavalier de c6 fait un L vers d4.',
        },
        e3: {
          say: 'Et les Blancs prennent le pion. C’est le coup naturel : le pion est gratuit, et leur cavalier était attaqué de toute façon. C’est aussi le coup qui perd.',
        },
        e4: {
          say: 'Ta dame sort en g5. Elle attaque le cavalier e5 et le pion g2 en même temps, et les Blancs ne peuvent pas défendre les deux.',
          instruction: 'Joue la dame en g5',
          hint: 'La dame de d8 file en diagonale : e7, f6, g5.',
        },
        e5: {
          say: 'Les Blancs cherchent la complication : leur cavalier prend en f7 et attaque ta dame et ta tour d’un seul coup. Ne sauve ni l’une ni l’autre.',
        },
        e6: {
          say: 'Prends le pion g2 avec ta dame. Elle menace maintenant la tour h1, et elle s’installe dans le camp blanc.',
          instruction: 'Prends le pion en g2',
          hint: 'La dame de g5 descend toute sa colonne jusqu’en g2.',
        },
        e7: {
          say: 'Les Blancs mettent leur tour en f1, où leur roi la défend. Regarde bien la case qu’ils viennent de boucher : f1. Leur roi en avait besoin.',
        },
        e8: {
          say: 'Reprends le pion e4 avec échec. Ta dame se met sur la colonne du roi blanc.',
          instruction: 'Prends le pion en e4',
          hint: 'La dame de g2 prend en diagonale : f3, e4.',
        },
        e9: {
          say: 'Les Blancs s’interposent avec leur fou en e2. Et ce fou est cloué : il est entre ta dame et leur roi, il ne peut plus bouger de la partie.',
        },
        e10: {
          say: 'Ton cavalier de d4, celui que tout le monde prenait pour une bêtise, saute en f3.',
          instruction: 'Joue le cavalier en f3',
          hint: 'Le cavalier de d4 fait un L vers f3.',
        },
        e11: {
          say: 'Échec et mat. Compte les cases autour du roi blanc : d1 sa dame, d2 son pion, e2 son fou, f1 sa tour, f2 son pion. Toutes occupées par les siens. Et personne ne peut prendre ton cavalier — le fou e2 est cloué, la tour f1 est bloquée par son propre pion.',
        },
        e12: {
          say: 'C’est la même figure que le mat étouffé, vue de l’autre côté : un roi tué par ses propres défenseurs, avec un cavalier. Tu la reconnaîtras désormais dans les deux sens.',
        },
        e13: {
          say: 'Et la variante qui refuse le piège, celle qu’il faut connaître dans l’autre sens : prendre le cavalier au lieu du pion. Les Blancs échangent en d4, il n’y a plus de dame en g5, plus de mat, et ce sont eux qui sont mieux.',
        },
        e14: {
          say: 'Deux règles à en tirer. Quand on t’offre un pion en plein début de partie, demande-toi pourquoi avant de le prendre. Et quand tu es déjà dans le piège, rends du matériel tout de suite — le fou en f7 avec échec — plutôt que de courir après la dame adverse.',
        },
      },
      'mat-legal': {
        title: 'Le mat de Légal',
        summary: 'Une pièce clouée peut bouger. Celui qui l’oublie perd en sept coups.',
        e1: {
          say: 'Le fou noir en g4 vise ton cavalier f3, et derrière ce cavalier il y a ta dame en d1. Le cavalier est donc cloué : s’il bouge, tu perds ta dame.',
        },
        e2: {
          say: 'Sauf que ce clouage-là n’est pas absolu. Ce n’est pas ton roi qui est derrière, c’est ta dame — le cavalier a parfaitement le droit de partir. La seule question est de savoir si ça vaut neuf points.',
        },
        e3: {
          say: 'Le cavalier cloué prend le pion e5. Il attaque en même temps le cavalier c6 et il ouvre la diagonale de ton fou vers f7.',
          instruction: 'Prends le pion en e5 avec le cavalier',
          hint: 'Le cavalier de f3 saute sur le pion e5.',
        },
        e4: {
          say: 'Les Noirs ont pris la dame. Neuf points d’avance, et la partie est perdue en deux coups. C’est tout le piège : le coup gourmand est celui qui perd.',
        },
        e5: {
          say: 'Le fou se donne en f7. Le roi ne peut pas le prendre, ton cavalier e5 défend la case.',
          instruction: 'Prends le pion en f7 avec le fou',
          hint: 'Le fou de c4 mange le pion f7.',
        },
        e6: {
          say: 'Le roi noir n’avait qu’un seul coup légal. Il monte en e7, au milieu de ses propres pièces, et il y est enfermé.',
        },
        e7: {
          say: 'Ton troisième attaquant arrive. Le cavalier de c3 se pose en d5, et personne ne peut l’en chasser.',
          instruction: 'Joue le cavalier en d5',
          hint: 'Le cavalier de c3 fait un L vers d5.',
        },
        e8: {
          say: 'Échec et mat, avec un fou et deux cavaliers, contre une dame. Le roi noir est cerné par son propre camp : sa dame occupe d8, son fou occupe f8, et tes trois pièces tiennent tout le reste.',
        },
        e9: {
          say: 'Et la variante qui sauve tout, la seule : reprendre le cavalier au lieu de prendre la dame. Les Noirs rendent la pièce, ils gardent leur roi, et la partie continue à peu près à égalité. Ils n’avaient qu’à refuser le cadeau.',
        },
        e10: {
          say: 'Deux choses à garder. Quand une pièce adverse est clouée sur autre chose que le roi, elle peut bouger — vérifie toujours ce qu’elle menace en partant. Et quand on t’offre une dame en plein début de partie, compte les pièces qui regardent ton roi avant de la prendre.',
        },
      },
    },
    pieges: {
      title: 'Tendre et déjouer les pièges',
      description:
        'Cinq pièges d’ouverture qui gagnent une pièce, appris des deux côtés : on le tend jusqu’au gain, puis on le voit venir et on le déjoue. Ce sont eux qui décident les parties en club, bien avant la théorie.',
      'piege-fegatello': {
        title: 'Le Fegatello',
        summary:
          'Deux pièces sur f7, un cavalier donné, et le roi noir dehors au septième coup. Puis le coup unique qui annule tout.',
        e1: {
          say: 'Le Fegatello, ou « foie frit » en italien. Les Blancs donnent un cavalier sur f7 pour sortir le roi noir. On commence par le tendre.',
        },
        e2: {
          say: 'Pion roi, comme d’habitude.',
          instruction: 'Joue e4',
        },
        e3: {
          say: 'Cavalier f3, qui attaque e5.',
          instruction: 'Joue le cavalier en f3',
        },
        e4: {
          say: 'Et le fou en c4. Regarde bien sa diagonale : elle finit sur f7.',
          instruction: 'Joue le fou en c4',
        },
        e5: {
          say: 'Les Noirs développent leur cavalier et ignorent f7. C’est jouable, mais ça demande de connaître la suite.',
        },
        e6: {
          say: 'Cavalier g5. Maintenant deux pièces attaquent f7, et f7 n’est défendu que par le roi.',
          instruction: 'Joue le cavalier en g5',
        },
        e7: {
          say: 'Les Noirs contre-attaquent au centre. Prends le pion.',
          instruction: 'Prends en d5 avec le pion e',
        },
        e8: {
          say: 'Voilà la faute. Reprendre en d5 avec le cavalier laisse f7 sans défense suffisante. Tout le piège tient dans ce coup-là.',
        },
        e9: {
          say: 'Cavalier prend f7. Tu donnes une pièce, et tu sais pourquoi.',
          instruction: 'Prends en f7 avec le cavalier',
        },
        e10: {
          say: 'Dame f3. Échec, et elle attaque en même temps le cavalier cloué en d5.',
          instruction: 'Joue la dame en f3',
        },
        e11: {
          say: 'Le roi noir est au milieu de l’échiquier au huitième coup, le cavalier d5 est attaqué deux fois, et les Blancs ont encore toutes leurs pièces à sortir. C’est largement suffisant pour une pièce.',
        },
        e12: {
          say: 'Maintenant on change de camp. Tu joues les Noirs, et tu dois éviter tout ça.',
        },
        e13: {
          say: 'Réponds au centre.',
          instruction: 'Joue e5',
        },
        e14: {
          say: 'Défends ton pion.',
          instruction: 'Joue le cavalier en c6',
        },
        e15: {
          say: 'Développe ton cavalier roi.',
          instruction: 'Joue le cavalier en f6',
        },
        e16: {
          say: 'Le cavalier arrive sur g5. La seule réponse est de frapper au centre.',
          instruction: 'Joue d5',
          hint: 'Le pion d7 avance de deux cases : il attaque le fou c4 en passant.',
        },
        e17: {
          say: 'Et voici le coup qui déjoue tout le piège : cavalier a5. Il attaque le fou c4 au lieu de reprendre en d5.',
          instruction: 'Joue le cavalier de c6 en a5',
          hint: 'Ne reprends pas le pion : c’est exactement ce que les Blancs attendent. Va chercher le fou.',
        },
        e18: {
          say: 'Le fou doit fuir, f7 n’est plus attaqué que par une pièce, et les Noirs rendront le pion d5 au pire. Un seul coup, et le Fegatello n’existe plus.',
        },
      },
      'piege-elephant': {
        title: 'Le piège de l’éléphant',
        summary:
          'Un pion qui a l’air de tomber tout seul, et une dame qui se donne pour gagner une pièce. Le piège le plus rentable du gambit dame.',
        e1: {
          say: 'Celui-ci se subit plus souvent qu’il ne se tend. Tu joues les Noirs, et tu vas laisser les Blancs prendre un pion qu’ils ne peuvent pas prendre.',
        },
        e2: {
          say: 'Réponds symétriquement.',
          instruction: 'Joue d5',
        },
        e3: {
          say: 'Le gambit dame. Soutiens ton pion d5 avec le pion e.',
          instruction: 'Joue e6',
        },
        e4: {
          say: 'Développe ton cavalier roi.',
          instruction: 'Joue le cavalier en f6',
        },
        e5: {
          say: 'Le fou cloue ton cavalier f6 contre ta dame. C’est ce clouage que les Blancs vont croire réel.',
        },
        e6: {
          say: 'Cavalier b8 en d7. Il ajoute un défenseur à f6 — et il tend le piège.',
          instruction: 'Joue le cavalier de b8 en d7',
          hint: 'Le cavalier de b8 va en d7, pas ailleurs.',
        },
        e7: {
          say: 'Reprends avec ton pion e.',
          instruction: 'Prends en d5 avec le pion e6',
        },
        e8: {
          say: 'Voilà. Les Blancs prennent en d5 parce que ton cavalier f6 est cloué. Sauf qu’il ne l’est pas vraiment : ce qui est derrière vaut moins que ce qu’on va gagner.',
        },
        e9: {
          say: 'Prends le cavalier avec ton cavalier f6. Oui, tu perds la dame.',
          instruction: 'Prends en d5 avec le cavalier f6',
          hint: 'Le cavalier cloué bouge quand même. Fais-le.',
        },
        e10: {
          say: 'Et maintenant le coup de tout le piège : fou b4, échec.',
          instruction: 'Joue le fou de f8 en b4',
        },
        e11: {
          say: 'Les Blancs doivent s’interposer avec leur dame. Prends-la.',
          instruction: 'Prends la dame en d2',
        },
        e12: {
          say: 'Et tu récupères le fou qui campe sur ta case d8.',
          instruction: 'Prends en d8 avec le roi',
        },
        e13: {
          say: 'Compte : tu as donné la dame et un fou, tu as récupéré une dame, un cavalier et un fou. Une pièce de plus, et la partie est gagnée. Retiens la leçon générale : un clouage contre la dame n’interdit pas de bouger, il faut calculer.',
        },
      },
      'piege-kieninger': {
        title: 'Le piège de Kieninger',
        summary:
          'Un mat étouffé au huitième coup, en pleine ouverture, parce qu’un pion pris à l’aile ouvre une colonne qu’on n’avait pas regardée.',
        e1: {
          say: 'Le gambit Budapest, et le plus joli mat d’ouverture qui existe. Tu joues les Noirs.',
        },
        e2: {
          say: 'Cavalier f6 d’abord.',
          instruction: 'Joue le cavalier en f6',
        },
        e3: {
          say: 'Et maintenant le gambit : e5. Tu offres un pion pour activer tes pièces.',
          instruction: 'Joue e5',
        },
        e4: {
          say: 'Cavalier g4. Il va rechercher le pion e5.',
          instruction: 'Joue le cavalier de f6 en g4',
        },
        e5: {
          say: 'Les Blancs défendent leur pion. Amène un deuxième attaquant.',
          instruction: 'Joue le cavalier en c6',
        },
        e6: {
          say: 'Fou b4, échec. Ce n’est pas un coup en l’air : il va forcer les Blancs à boucher avec leur cavalier b1.',
          instruction: 'Joue le fou en b4',
        },
        e7: {
          say: 'Dame e7. Elle se met sur la colonne e — retiens cette colonne, tout le mat est là.',
          instruction: 'Joue la dame en e7',
        },
        e8: {
          say: 'Les Blancs attaquent ton fou avec a3. Un coup naturel, et c’est la faute : ils s’occupent de l’aile alors que leur roi est encore au centre.',
        },
        e9: {
          say: 'Ignore le fou. Reprends le pion e5 avec le cavalier de g4.',
          instruction: 'Prends en e5 avec le cavalier g4',
          hint: 'C’est le cavalier de g4 qui prend, pas celui de c6.',
        },
        e10: {
          say: 'Les Blancs prennent le fou. Maintenant : cavalier d3. Échec et mat.',
          instruction: 'Joue le cavalier de e5 en d3',
          hint: 'Le cavalier de e5 saute en d3. Regarde la colonne e avant de douter.',
        },
        e11: {
          say: 'Mat étouffé. Le roi n’a aucune case : sa dame, son fou et son cavalier l’entourent. Et le pion e2 ne peut pas prendre le cavalier, parce qu’en quittant e2 il ouvrirait la colonne sur ta dame e7.',
        },
      },
      'piege-lasker': {
        title: 'Le piège de Lasker',
        summary:
          'Le seul piège d’ouverture où promouvoir en dame perd et promouvoir en cavalier gagne. Une sous-promotion, au septième coup.',
        e1: {
          say: 'Le gambit Albin. Tu joues les Noirs, et tu vas finir par promouvoir un pion en cavalier — pas en dame.',
        },
        e2: {
          say: 'Réponds d5.',
          instruction: 'Joue d5',
        },
        e3: {
          say: 'Et le gambit Albin : e5.',
          instruction: 'Joue e5',
        },
        e4: {
          say: 'Pousse ton pion d en d4. Il y sera très difficile à déloger.',
          instruction: 'Joue d4',
        },
        e5: {
          say: 'Les Blancs jouent e3 pour se débarrasser du pion d4. C’est la faute du piège : ce coup ouvre une diagonale vers leur roi.',
        },
        e6: {
          say: 'Fou b4, échec.',
          instruction: 'Joue le fou en b4',
        },
        e7: {
          say: 'Prends en e3 avec ton pion d4.',
          instruction: 'Prends en e3',
        },
        e8: {
          say: 'Les Blancs prennent ton fou et se croient bien. Ton pion e3, lui, est à deux cases de la promotion, et la case f2 n’est tenue que par le roi.',
        },
        e9: {
          say: 'Prends en f2, échec.',
          instruction: 'Prends en f2 avec le pion e3',
        },
        e10: {
          say: 'Et maintenant le coup de la leçon : prends le cavalier g1 et promeus en **cavalier**. Avec échec.',
          instruction: 'Prends en g1 et promeus en cavalier',
          hint: 'La case g1 porte le cavalier blanc. Choisis le cavalier dans le sélecteur de promotion, pas la dame.',
        },
        e11: {
          say: 'La tour reprend. Fou g4, échec — et la dame blanche est perdue.',
          instruction: 'Joue le fou en g4',
        },
        e12: {
          say: 'Le roi est en échec sur la diagonale, et quoi qu’il fasse le fou prend la dame en d1. Promouvoir en dame aurait donné échec aussi — mais les Blancs l’auraient prise, et il ne resterait rien. C’est la seule sous-promotion d’ouverture qu’il faut connaître.',
        },
      },
      'piege-arche-de-noe': {
        title: 'L’arche de Noé',
        summary:
          'Trois pions noirs qui avancent, et le fou blanc se retrouve sans une seule case. Le piège le plus vieux de l’espagnole.',
        e1: {
          say: 'L’espagnole. Tu joues les Noirs, et tu vas enfermer le fou blanc avec des pions. On appelle ça l’arche de Noé parce que le piège est aussi vieux que le déluge.',
        },
        e2: {
          say: 'Réponds e5.',
          instruction: 'Joue e5',
        },
        e3: {
          say: 'Défends ton pion.',
          instruction: 'Joue le cavalier en c6',
        },
        e4: {
          say: 'Le fou en b5 attaque le défenseur de e5. Chasse-le avec a6.',
          instruction: 'Joue a6',
        },
        e5: {
          say: 'Soutiens ton pion e5 une deuxième fois.',
          instruction: 'Joue d6',
        },
        e6: {
          say: 'Les Blancs ouvrent le centre. Réponds b5 : le fou n’a déjà plus beaucoup de cases.',
          instruction: 'Joue b5',
        },
        e7: {
          say: 'Le fou se réfugie en b3. Regarde ses cases de fuite : a2 et c2 sont occupées par ses propres pions, a4 et c4 seront tenues par tes pions. Il ne lui reste rien.',
        },
        e8: {
          say: 'Échange au centre : cavalier prend d4.',
          instruction: 'Prends en d4 avec le cavalier',
        },
        e9: {
          say: 'Reprends avec ton pion.',
          instruction: 'Prends en d4 avec le pion e5',
        },
        e10: {
          say: 'Voilà la faute : la dame reprend en d4, au lieu de s’occuper du fou. Maintenant tu la chasses, et chaque coup de chasse avance tes pions vers le fou.',
        },
        e11: {
          say: 'Pion c5 : il attaque la dame.',
          instruction: 'Joue c5',
        },
        e12: {
          say: 'Fou e6 : tu la chasses encore, en développant.',
          instruction: 'Joue le fou en e6',
        },
        e13: {
          say: 'Bouche l’échec avec ton fou.',
          instruction: 'Joue le fou en d7',
        },
        e14: {
          say: 'Et le dernier pion : c4. Le fou b3 est pris au filet.',
          instruction: 'Joue c4',
        },
        e15: {
          say: 'Le fou n’a aucune case : ses propres pions lui bouchent a2 et c2, tes pions tiennent a4 et c4. Il tombera au coup suivant. Retiens le mécanisme plutôt que la suite de coups : des pions peuvent enfermer une pièce, et un fou qui recule sur une aile est souvent déjà perdu.',
        },
      },
    },
    repertoire: {
      title: 'Comprendre les ouvertures',
      description:
        'Les six ouvertures qu’on rencontre le plus, expliquées par leurs idées et non par leurs variantes. Objectif : savoir quoi faire au coup 8, même quand l’adversaire a joué autre chose que le livre.',
      italienne: {
        title: 'La partie italienne',
        summary:
          'La plus ancienne, la plus naturelle. Toutes les pièces vers le centre, sans détour.',
        e1: {
          say: "L'italienne, c'est le développement le plus direct qui existe. Pion au centre, cavalier, fou. Trois coups, trois principes respectés.",
        },
        e2: {
          say: 'Commence par le pion roi.',
          instruction: 'Joue e4',
        },
        e3: {
          say: 'Cavalier f3. Il attaque le pion e5 et vise le centre.',
          instruction: 'Joue le cavalier en f3',
        },
        e4: {
          say: "Et maintenant le coup qui donne son nom à l'ouverture : fou c4. Il pointe vers f7, la case la plus faible du camp noir tant que le roi n'a pas roqué.",
          instruction: 'Joue le fou en c4',
          hint: 'Le fou de f1 sort en diagonale jusqu’en c4.',
        },
        e5: {
          say: "Voilà la position type. Les deux camps ont un pion au centre, un cavalier et un fou dehors. C'est le Giuoco Piano — « le jeu tranquille ».",
        },
        e6: {
          say: "L'idée blanche pour la suite : roquer, jouer c3 et d4 pour construire un gros centre de pions. L'idée noire : la même chose en miroir, avec c6 et d5.",
        },
        e7: {
          say: 'Le piège à connaître : ne joue jamais la dame en h5 pour tenter un mat rapide. Les Noirs parent et chassent la dame en développant. Tu perds trois temps, ils en gagnent trois.',
        },
      },
      espagnole: {
        title: 'La partie espagnole',
        summary: 'L’ouverture la plus jouée au plus haut niveau depuis cent cinquante ans.',
        e1: {
          say: "Même début que l'italienne, mais le fou va en b5 au lieu de c4. Ce petit changement transforme toute la partie.",
        },
        e2: {
          say: 'Joue le fou en b5. Il attaque le cavalier c6, qui défend le pion e5.',
          instruction: 'Joue le fou en b5',
        },
        e3: {
          say: "Les Noirs répondent presque toujours a6 pour chasser le fou. C'est le coup Morphy, et c'est une question : le fou prend-il, ou recule-t-il ?",
        },
        e4: {
          say: "Prendre en c6 donne aux Noirs des pions doublés mais la paire de fous : c'est la variante d'échange, jouable et simple. Reculer en a4 garde la tension : c'est la ligne principale, et celle de tous les champions du monde.",
        },
        e5: {
          say: "L'idée profonde de l'espagnole : la menace sur c6 n'est pas immédiate — reprendre le pion e5 tout de suite perd une pièce sur d4. C'est une pression **à long terme** qui gêne les Noirs pendant vingt coups.",
        },
        e6: {
          say: "Retiens surtout ceci : dans l'espagnole, les Blancs jouent lentement. c3, d3, Cbd2, Cf1, Cg3 — le cavalier fait tout le tour de l'échiquier pour rejoindre l'attaque. On appelle ça la manœuvre espagnole.",
        },
      },
      sicilienne: {
        title: 'La défense sicilienne',
        summary: 'La réponse la plus combative à 1.e4. Déséquilibrée dès le premier coup.',
        e1: {
          say: 'Face à 1.e4, la sicilienne répond c5. Pas e5, qui donne une partie symétrique : c5, qui crée un déséquilibre immédiat.',
        },
        e2: {
          say: "Joue c5. Ce coup unique ouvre la porte à des milliers de variantes — mais l'idée derrière est toujours la même.",
          instruction: 'Joue le pion en c5',
        },
        e3: {
          say: "Pourquoi c5 plutôt que e5 ? Parce que le pion c attaque d4 sans bloquer la diagonale du fou noir, et surtout parce qu'après l'échange en d4, les Noirs se retrouvent avec deux pions centraux contre un.",
        },
        e4: {
          say: "Après d4 cxd4, les Blancs reprennent avec le cavalier. Regarde la structure : les Noirs ont échangé un pion d'aile contre un pion central. C'est un petit gain permanent.",
        },
        e5: {
          say: "En contrepartie, les Blancs ont de l'avance au développement et la colonne d ouverte. La sicilienne est un pari : du matériel structurel contre du temps.",
        },
        e6: {
          say: "Les Blancs attaquent généralement sur l'aile roi, les Noirs sur l'aile dame le long de la colonne c. Ce sont deux courses parallèles, et c'est ce qui rend ces parties si tranchantes.",
        },
        e7: {
          say: "Si tu débutes, retiens simplement : joue c5, d6, Cf6, Cc6, e6, puis Fe7 et roque. C'est le dispositif Scheveningue, et il tient face à tout.",
        },
      },
      francaise: {
        title: 'La défense française',
        summary: 'Solide comme un roc, avec un seul défaut — et un plan pour le corriger.',
        e1: {
          say: 'La française répond e6 à 1.e4. Un coup modeste, qui prépare d5 pour contester le centre immédiatement.',
        },
        e2: {
          say: 'Joue e6. Un coup discret, mais qui prépare la vraie réponse au coup suivant.',
          instruction: 'Joue le pion en e6',
        },
        e3: {
          say: 'Et maintenant d5, le vrai coup de la française : les Noirs attaquent le centre blanc de front.',
          instruction: 'Joue le pion en d5',
        },
        e4: {
          say: "La structure est très solide : deux pions qui se défendent l'un l'autre. Mais elle a un défaut célèbre — le fou de cases claires est enfermé derrière ses propres pions e6 et d5.",
        },
        e5: {
          say: "On l'appelle le « mauvais fou français ». Tout le plan noir consiste à lui trouver une sortie : soit par b6 et Fa6, soit en poussant f6 pour ouvrir la diagonale.",
        },
        e6: {
          say: "L'autre plan noir, systématique : attaquer la base de la chaîne de pions blanche avec c5. En française, on joue presque toujours c5 tôt ou tard.",
        },
      },
      'gambit-dame': {
        title: 'Le gambit dame',
        summary: 'Un pion offert qui n’en est pas un. L’ouverture la plus solide après 1.d4.',
        e1: {
          say: "Après 1.d4 d5, les Blancs jouent c4. On appelle ça un gambit, mais c'est un abus de langage : le pion n'est pas vraiment donné.",
        },
        e2: {
          say: "Joue c4, en attaquant le pion d5 depuis le côté. C'est le gambit dame.",
          instruction: 'Joue le pion en c4',
        },
        e3: {
          say: "Si les Noirs prennent en c4, les Blancs récupèrent le pion sans effort avec e3 puis Fxc4. Pendant ce temps ils auront occupé le centre. Prendre n'est donc pas gagner un pion, c'est céder le centre.",
        },
        e4: {
          say: "La vraie question posée aux Noirs est : comment défendre d5 ? Avec e6, c'est le gambit dame refusé, solide mais qui enferme le fou. Avec c6, c'est la slave, qui garde le fou libre.",
        },
        e5: {
          say: 'Le plan blanc dans toutes ces lignes est le même : Cc3, Cf3, Fg5 pour clouer, e3, Fd3, roque, puis pousser e4 au bon moment pour ouvrir le centre.',
        },
        e6: {
          say: "Retiens le principe général de 1.d4 : ces parties sont plus lentes que celles de 1.e4. On manœuvre, on améliore ses pièces, et l'avantage se construit sur vingt coups au lieu de dix.",
        },
      },
      'est-indienne': {
        title: 'La défense est-indienne',
        summary: 'Laisser le centre à l’adversaire… pour mieux le détruire ensuite.',
        e1: {
          say: "L'est-indienne renverse tout ce qu'on a appris : les Noirs laissent volontairement les Blancs prendre tout le centre.",
        },
        e2: {
          say: "Cavalier f6 d'abord.",
          instruction: 'Joue le cavalier en f6',
        },
        e3: {
          say: 'Puis g6, pour préparer le fianchetto du fou.',
          instruction: 'Joue le pion en g6',
        },
        e4: {
          say: "Et le fou en g7. Il balaie la grande diagonale, droit sur le centre et l'aile dame blanche.",
          instruction: 'Joue le fou en g7',
        },
        e5: {
          say: "Voilà l'idée : le fou g7 et le cavalier f6 exercent une pression à distance sur le centre blanc. Les Noirs ne l'occupent pas, ils le visent.",
        },
        e6: {
          say: 'Le plan noir classique : roquer, jouer d6, puis e5 pour frapper le centre. Si les Blancs ferment avec d5, les Noirs lancent f5, f4, g5 et attaquent le roi. Ce sont parmi les parties les plus violentes du jeu.',
        },
        e7: {
          say: "Attention : c'est une ouverture exigeante. Elle demande de savoir attendre pendant que l'adversaire construit, sans paniquer. Ne l'adopte que quand tu es à l'aise avec les positions fermées.",
        },
      },
    },
    ouverture: {
      title: 'Bien ouvrir',
      description:
        'Trois principes suffisent à jouer correctement les dix premiers coups de n’importe quelle partie — sans apprendre une seule variante par cœur.',
      'principes-ouverture': {
        title: 'Les trois principes',
        summary: 'Centre, développement, sécurité du roi. Tout le reste en découle.',
        e1: {
          say: "L'ouverture a trois objectifs, et trois seulement. Occuper le centre. Sortir ses pièces. Mettre son roi à l'abri. Si tes dix premiers coups servent ces trois buts, tu joues bien.",
        },
        e2: {
          say: 'Premier principe : le centre. Avance un pion central de deux cases. Joue e4.',
          instruction: 'Joue le pion en e4',
          hint: 'Le pion e2 avance de deux cases.',
        },
        e3: {
          say: 'Excellent. Ce pion contrôle d5 et f5, et il libère la diagonale de ton fou et celle de ta dame. Un seul coup, trois bénéfices.',
        },
        e4: {
          say: 'Deuxième principe : le développement. Sors une pièce mineure vers le centre. Le cavalier en f3 est le coup le plus naturel — il attaque déjà le pion e5.',
          instruction: 'Joue le cavalier en f3',
          hint: 'Le cavalier de g1 saute en f3.',
        },
        e5: {
          say: 'Continue : sors ton fou. En c4 il vise f7, le point le plus faible du camp noir en début de partie.',
          instruction: 'Joue le fou en c4',
          hint: 'Le fou de f1 sort en diagonale.',
        },
        e6: {
          say: 'Troisième principe : la sécurité. Tes deux pièces du côté roi sont sorties, tu peux roquer. Fais-le maintenant.',
          instruction: 'Joue le petit roque',
          hint: 'Attrape le roi et pose-le en g1.',
        },
        e7: {
          say: "En quatre coups tu as un pion au centre, deux pièces développées et un roi en sécurité. C'est une ouverture parfaite, et tu n'as rien appris par cœur.",
        },
      },
      'erreurs-ouverture': {
        title: 'Les quatre erreurs classiques',
        summary: 'Ce que font tous les débutants — et pourquoi ça se paie cher.',
        e1: {
          say: "Erreur numéro un : sortir la dame trop tôt. C'est tentant, elle est puissante. Voyons ce qui se passe.",
        },
        e2: {
          say: 'Les Blancs jouent la dame en h5. Elle menace le mat en f7 — mais les Noirs parent facilement, et ensuite ils vont la chasser en développant leurs pièces avec gain de temps.',
        },
        e3: {
          say: 'Les Noirs sortent leur cavalier en défendant. Ils développent, les Blancs non. Chaque coup qui chasse la dame fait gagner un temps aux Noirs.',
        },
        e4: {
          say: 'Erreur numéro deux : bouger deux fois la même pièce en ouverture. Chaque coup devrait sortir une pièce **nouvelle**. Il y a huit pièces à développer et seulement une dizaine de coups pour le faire.',
        },
        e5: {
          say: 'Erreur numéro trois : les coups de pions inutiles sur les ailes. a3 et h3 ne développent rien, ne prennent pas le centre, et affaiblissent légèrement la position. Deux coups perdus.',
        },
        e6: {
          say: 'Erreur numéro quatre : bouger le roi. Non seulement il reste au centre, mais il perd définitivement le droit de roquer. La partie sera très inconfortable.',
        },
        e7: {
          say: 'Retiens simplement : une pièce nouvelle à chaque coup, vers le centre, et le roque avant le dixième coup. Tu éviteras déjà quatre-vingts pour cent des mauvaises ouvertures.',
        },
      },
    },
    milieu: {
      title: 'Le milieu de partie',
      description:
        'Les pièces sont sorties, le roi est à l’abri… et maintenant ? Voici comment trouver un plan au lieu de jouer au hasard.',
      'colonnes-ouvertes': {
        title: 'Les colonnes ouvertes',
        summary: 'Une colonne sans pion, c’est une autoroute. Elle appartient aux tours.',
        e1: {
          say: "Une colonne ouverte est une colonne sans aucun pion, ni blanc ni noir. Ici, la colonne d vient de s'ouvrir : c'est le chemin d'entrée dans le camp adverse.",
        },
        e2: {
          say: "Place ta tour dessus. En finale et en milieu de partie, une tour sur colonne ouverte vaut bien plus qu'une tour coincée derrière ses pions.",
          instruction: 'Joue une tour en d1',
          hint: 'Amène une de tes tours sur la case d1, derrière ta dame.',
        },
        e3: {
          say: 'Le principe se prolonge : deux tours doublées sur la même colonne ouverte sont presque irrésistibles. Et une tour qui atteint la septième rangée y dévore les pions.',
        },
        e4: {
          say: "Quand aucune colonne n'est ouverte, cherche une colonne **semi-ouverte** : sans pion à toi, mais avec un pion adverse. Ce pion devient une cible fixe.",
        },
      },
      'avant-poste': {
        title: 'L’avant-poste',
        summary: 'Une case avancée où ton cavalier est intouchable. Le rêve de toute pièce.',
        e1: {
          say: "Un avant-poste, c'est une case avancée dans le camp adverse, protégée par un de tes pions, et qu'aucun pion adverse ne peut jamais attaquer.",
        },
        e2: {
          say: 'Le cavalier en e5 est ici sur un avant-poste : aucun pion noir ne pourra jamais venir le chasser, parce que les pions d et f noirs sont déjà passés ou absents. Il restera là toute la partie.',
        },
        e3: {
          say: "Un cavalier sur avant-poste au cœur du camp adverse vaut souvent une tour. Cherche systématiquement ces cases : elles apparaissent dès qu'un adversaire avance ses pions.",
        },
      },
      'securite-roi': {
        title: 'La sécurité du roi',
        summary: 'Trois pions intacts devant lui, ou l’attaque arrive.',
        e1: {
          say: "Un roi roqué avec ses trois pions intacts devant lui est très difficile à attaquer. C'est la configuration à préserver.",
        },
        e2: {
          say: 'Chaque pion qui avance devant le roi crée une faiblesse permanente. Ici g6 a affaibli les cases f6 et h6, et surtout la grande diagonale.',
        },
        e3: {
          say: "Règle simple : n'avance les pions devant ton roi que si tu y es obligé, ou pour faire une case d'air. Chaque poussée est une porte que tu ouvres.",
        },
        e4: {
          say: "Et le corollaire : quand tu attaques un roi, compte ses défenseurs. Si tu as plus de pièces attaquantes qu'il n'a de défenseurs autour de son roi, lance l'attaque. Sinon, améliore d'abord tes pièces.",
        },
      },
    },
    finale: {
      title: 'Les finales',
      description:
        'Peu de pièces, beaucoup de précision. C’est là que se gagnent les parties égales — et là que la plupart des joueurs de club n’ont jamais rien appris.',
      'roi-actif': {
        title: 'Le roi devient une pièce',
        summary: 'Toute la partie il se cachait. En finale, il monte au front.',
        e1: {
          say: "Tant que les dames sont sur l'échiquier, le roi se cache. Dès qu'elles disparaissent, tout change : le roi devient une pièce d'attaque, à peu près aussi forte qu'un cavalier.",
        },
        e2: {
          say: 'En finale, le premier réflexe est toujours le même : centraliser son roi. Un roi au centre atteint les deux ailes ; un roi dans son coin arrive toujours trop tard.',
        },
        e3: {
          say: 'Avance ton roi vers le centre.',
          instruction: 'Avance le roi',
          hint: 'Le roi monte d’une case vers le centre.',
        },
        e4: {
          say: "Un joueur qui oublie d'activer son roi en finale perd des positions parfaitement tenables. C'est sans doute l'erreur la plus coûteuse à partir de 1200 Elo.",
        },
      },
      opposition: {
        title: 'L’opposition',
        summary: 'Le duel de rois qui décide toutes les finales de pions.',
        e1: {
          say: "Deux rois face à face, une case entre eux : c'est l'opposition. Et voici le paradoxe : celui qui **doit** jouer la perd, parce qu'il est obligé de céder du terrain.",
        },
        e2: {
          say: "Ici c'est aux Blancs de jouer, donc les Noirs ont l'opposition. Le roi blanc va devoir s'écarter, et le roi noir avancera.",
        },
        e3: {
          say: "Voilà pourquoi c'est décisif. Roi et pion contre roi : si le roi défenseur garde l'opposition devant le pion, la partie est nulle. S'il la perd, le pion passe.",
        },
        e4: {
          say: "La technique gagnante : pousse ton **roi** avant ton pion. Le roi ouvre la voie, le pion suit. Pousser le pion en premier est l'erreur classique qui transforme un gain en nulle.",
        },
        e5: {
          say: 'Retiens la formule : en finale de pions, le roi passe devant. Toujours.',
        },
      },
      'regle-du-carre': {
        title: 'La règle du carré',
        summary: 'Un coup d’œil suffit pour savoir si un roi rattrape un pion.',
        e1: {
          say: 'Ton pion en a2 veut aller à dame. Le roi noir en h4 est loin. Le rattrape-t-il ? Il existe une astuce pour répondre en une seconde, sans compter.',
        },
        e2: {
          say: "Trace un carré dont un côté va du pion jusqu'à sa case de promotion. Ici, du pion a2 jusqu'à a8 : six cases. Le carré fait donc six sur six, de a2 à f8.",
        },
        e3: {
          say: "La règle : si le roi adverse est **dans** ce carré, ou peut y entrer en jouant, il rattrape le pion. S'il est dehors et que c'est à toi de jouer, le pion passe.",
        },
        e4: {
          say: "Ici le roi noir est en h4, à l'extérieur du carré. Si tu pousses le pion, il ne le rattrapera jamais. Une règle géométrique, aucun calcul.",
        },
        e5: {
          say: 'Attention : le carré rétrécit à chaque poussée du pion, mais le pion qui part de sa deuxième rangée peut avancer de deux cases — le carré se compte alors depuis la troisième rangée.',
        },
      },
      'pion-passe': {
        title: 'Le pion passé',
        summary: 'Aucun pion adverse ne peut plus l’arrêter. En finale, il vaut de l’or.',
        e1: {
          say: "Un pion passé est un pion qu'aucun pion adverse ne peut plus arrêter : ni sur sa colonne, ni sur les colonnes voisines. Il n'a plus qu'à courir.",
        },
        e2: {
          say: "En finale, un pion passé oblige l'adversaire à immobiliser une pièce pour le surveiller. C'est un avantage énorme, même s'il ne va jamais à dame.",
        },
        e3: {
          say: "Encore mieux : le pion passé **protégé**, soutenu par un autre pion. L'adversaire ne peut ni le prendre ni le bloquer durablement avec son roi.",
        },
        e4: {
          say: "Et la règle de Tarrasch, à retenir absolument : les tours se placent **derrière** les pions passés. Derrière le tien pour le pousser, derrière celui de l'adversaire pour le retenir.",
        },
      },
    },
    tactique: {
      title: 'La tactique',
      description:
        'Les figures qui gagnent du matériel. C’est le chapitre qui fait le plus progresser un joueur en dessous de 1500 : la plupart des parties se perdent sur l’une de ces six choses.',
      'piece-en-prise': {
        title: 'La pièce en prise',
        summary: 'La cause numéro un des parties perdues. Un réflexe de deux secondes suffit.',
        e1: {
          say: "Une pièce en prise, c'est une pièce attaquée que personne ne défend. Ici, le pion noir en e5 est attaqué par le cavalier, et aucune pièce noire ne le protège.",
        },
        e2: {
          say: "Prends-le. C'est gratuit.",
          instruction: 'Capture le pion en e5',
          hint: 'Le cavalier saute de f3 en e5.',
        },
        e3: {
          say: "Voilà le réflexe à prendre. Avant **chaque** coup, pose-toi deux questions. Un : qu'est-ce que mon adversaire attaque ? Deux : qu'est-ce qu'il laisse sans défense ?",
        },
        e4: {
          say: "Attention quand même : ici les Noirs ont défendu leur pion avec le cavalier c6. Reprendre serait maintenant un simple échange, plus un cadeau. Une pièce attaquée **et défendue** n'est pas en prise.",
        },
      },
      fourchette: {
        title: 'La fourchette',
        summary: 'Une pièce, deux cibles. On ne peut pas tout sauver.',
        e1: {
          say: "Une fourchette, c'est une pièce qui en attaque deux d'un coup. Le cavalier est le champion toutes catégories, parce qu'il saute et qu'on le voit mal venir.",
        },
        e2: {
          say: 'Regarde : si le cavalier atteint la case c7, il attaque en même temps le roi en e8 et la tour en a8.',
        },
        e3: {
          say: 'À toi de jouer. Le cavalier est maintenant en b5, à un saut de c7. Pose-le sur la case et regarde ce qui arrive aux Noirs.',
          instruction: 'Joue le cavalier en c7',
          hint: 'Depuis b5, le cavalier saute en c7 : échec au roi, et la tour est visée en même temps.',
        },
        e4: {
          say: "Le roi noir a dû parer l'échec — il n'avait pas le choix, et c'est là toute la force de la fourchette royale : pendant qu'il se sauve, il abandonne la tour. Prends-la.",
          instruction: 'Prends la tour en a8',
          hint: 'Le cavalier de c7 va manger la tour en a8.',
        },
        e5: {
          say: "Voici l'autre situation : la fourchette qu'on **subit**. Ce cavalier noir en c6 est à un saut de e5 et d4. Chaque fois qu'un cavalier adverse approche de tes pièces, cherche les cases d'où il pourrait en toucher deux.",
        },
        e6: {
          say: "La fourchette la plus rentable est celle qui touche le roi : l'adversaire est **obligé** de parer l'échec, et l'autre pièce tombe. C'est ce qu'on appelle une fourchette royale.",
        },
      },
      clouage: {
        title: 'Le clouage',
        summary: 'Une pièce coincée devant une plus précieuse ne peut plus bouger.',
        e1: {
          say: "Le clouage. Une pièce est coincée devant une pièce plus précieuse : si elle bouge, l'autre tombe.",
        },
        e2: {
          say: 'Joue le fou en g5. Il vise le cavalier f6, et juste derrière ce cavalier se trouve la dame noire en d8.',
          instruction: 'Joue le fou en g5',
          hint: 'Le fou de c1 monte en diagonale : d2, e3, f4, g5.',
        },
        e3: {
          say: "Voilà le clouage. Le cavalier f6 ne peut plus bouger sans livrer la dame. Il est devenu une cible immobile : tu peux l'attaquer autant que tu veux, il ne s'échappera pas.",
        },
        e4: {
          say: 'Il existe deux sortes de clouages. Le clouage **relatif**, comme celui du cavalier devant la dame : la pièce peut légalement bouger, mais ça coûte cher.',
        },
        e5: {
          say: "Et le clouage **absolu** : quand c'est le roi qui est derrière. La pièce ne peut alors pas bouger du tout, ce serait illégal. Ici le cavalier c3 est cloué par la dame noire en b4.",
        },
        e6: {
          say: 'Réflexe à acquérir : quand une pièce adverse est clouée, attaque-la une fois de plus. Elle ne peut pas fuir, elle finira par tomber.',
        },
      },
      enfilade: {
        title: 'L’enfilade',
        summary: 'Le clouage à l’envers : la pièce de valeur est devant, et elle doit fuir.',
        e1: {
          say: "L'enfilade, c'est le clouage inversé : la pièce précieuse est devant, la moins précieuse derrière. On attaque la première, elle doit s'écarter, et on prend la seconde.",
        },
        e2: {
          say: 'Ici, roi noir en e8 et tour noire en d8, tous deux sur la même rangée. Une tour blanche qui arrive sur cette rangée donne échec au roi… et vise la tour derrière.',
        },
        e3: {
          say: "Variante en ligne. La tour blanche en a1 vise la tour noire en d1, mais c'est le roi blanc qui est derrière. Voilà ce qu'il ne faut jamais laisser arriver.",
        },
        e4: {
          say: "En pratique, l'enfilade se cherche quand deux pièces adverses sont alignées : même rangée, même colonne, même diagonale. Prends le réflexe de regarder ces alignements à chaque coup.",
        },
      },
      decouverte: {
        title: 'L’attaque à la découverte',
        summary: 'Une pièce s’écarte et démasque une autre. Deux menaces d’un seul coup.',
        e1: {
          say: 'Regarde cet alignement : la tour blanche en e1, le cavalier en e5, et le roi noir en e8. Tous les trois sur la colonne e.',
        },
        e2: {
          say: "Le cavalier bloque la ligne de la tour. Mais s'il s'écarte, la tour donne échec instantanément. Et le cavalier, lui, part où il veut : il peut aller capturer quelque chose pendant que l'adversaire pare l'échec.",
        },
        e3: {
          say: 'Fais partir le cavalier en c6 : il donne échec par découverte tout en attaquant depuis sa nouvelle case.',
          instruction: 'Joue le cavalier en c6',
          hint: 'N’importe quel déplacement du cavalier libère la colonne. Choisis-en un.',
        },
        e4: {
          say: "C'est la tactique la plus rentable du jeu, parce que l'adversaire ne peut parer qu'une menace à la fois — et l'échec est toujours prioritaire.",
        },
        e5: {
          say: "Le sommet du genre est l'échec double : le cavalier donne échec **et** démasque la tour. Là, plus aucune parade ne fonctionne. Ni capture, ni interposition : le roi doit bouger, un point c'est tout.",
        },
      },
      'elimination-defenseur': {
        title: 'Éliminer le défenseur',
        summary: 'Une pièce bien défendue ? Commence par supprimer son gardien.',
        e1: {
          say: 'Le pion e5 est défendu par le cavalier c6. On ne peut donc pas simplement le prendre. Mais que se passe-t-il si ce cavalier disparaît ?',
        },
        e2: {
          say: "C'est toute l'idée : au lieu d'attaquer la cible, on s'en prend à son défenseur. Une fois le gardien parti, la cible tombe d'elle-même.",
        },
        e3: {
          say: "Voilà pourquoi la partie espagnole commence par le fou en b5 : il attaque le cavalier c6, qui défend le pion e5. C'est une menace indirecte, et elle structure toute l'ouverture.",
        },
        e4: {
          say: "Quand une pièce adverse te bloque, ne t'acharne pas dessus. Demande-toi plutôt : qui la protège ? Et attaque celui-là.",
        },
      },
      sacrifice: {
        title: 'Le sacrifice',
        summary: 'Donner du matériel pour obtenir mieux : du temps, des lignes, un roi à nu.',
        e1: {
          say: "Un sacrifice, c'est donner volontairement du matériel pour obtenir autre chose : ouvrir une ligne, exposer un roi, gagner trois temps de développement.",
        },
        e2: {
          say: "Le sacrifice classique en f7 : le fou se donne pour attirer le roi noir hors de son abri. Trois points contre un pion — mais le roi va se retrouver au milieu de l'échiquier.",
        },
        e3: {
          say: "Comment savoir si un sacrifice est correct ? Compte ce que tu obtiens **en coups**, pas en points. Si l'adversaire doit passer trois coups à ramener son roi, tu as trois coups d'avance pour amener tes pièces.",
        },
        e4: {
          say: "Règle de prudence pour un débutant : ne sacrifie que si tu vois la suite jusqu'au bout. Un sacrifice qu'on ne sait pas justifier n'est pas un sacrifice, c'est une pièce en moins.",
        },
      },
    },
  },
  prompt: {
    system:
      'Tu es un entraîneur d’échecs, chaleureux et direct.\n\nCe que tu reçois est fiable : l’évaluation vient du moteur Stockfish et l’explication écrite vient de l’application. Ton rôle est de t’appuyer dessus pour aider la personne à comprendre — jamais de la recalculer.\n\nRègles :\n- N’invente aucune variante, aucun coup et aucune évaluation. Si une information ne t’a pas été fournie, dis simplement que tu ne l’as pas.\n- Pars de ce que la personne sait déjà : sa question dit où elle bloque.\n- Trois phrases suffisent. On lit ça entre deux coups, pas dans un manuel.\n- Nomme les motifs avec les mots des joueurs : fourchette, clouage, enfilade, mat du couloir, case faible.\n- Tutoie, et n’ouvre pas par une formule de politesse.',
    answerIn: 'Réponds en {langue}, quelle que soit la langue de cette consigne.',
    spoken: '(Réponds en deux phrases maximum : ta réponse sera lue à voix haute.)',
    goDeeper:
      'Va plus loin que l’explication ci-dessus : quelle est l’idée derrière le coup du moteur, et que devrais-je regarder la prochaine fois pour la trouver moi-même ?',
    relayIncomplete: 'Requête incomplète.',
    relaySchemeOnly: 'Seuls http et https sont relayés.',
    relayWrongProvider: 'Cette adresse ne correspond pas à ce fournisseur.',
    relayUnknownHost: 'Nom d’hôte introuvable.',
    relayPrivateNetwork: 'Cette adresse pointe vers un réseau privé.',
  },
  meta: {
    rootTitle: 'Le Coup Parfait — apprendre, jouer, progresser aux échecs',
    rootDesc:
      'Plateforme d’échecs libre et gratuite : leçons guidées à la voix, analyse expliquée coup par coup, 25 niveaux d’adversaires et parties entre amis. Sans publicité, sans compte obligatoire.',
    ogTitle: 'Le Coup Parfait — les échecs, enfin expliqués',
    ogDesc:
      'Un moteur qui explique pourquoi, une voix qui accompagne, et zéro euro. Libre et auto-hébergeable.',
    about: 'À propos',
    aboutDesc:
      'Ce qu’est Le Coup Parfait, pourquoi c’est gratuit, et ce qu’il advient de tes données. Réponse courte : rien, elles restent chez toi.',
    admin: 'Administration',
    friends: 'Amis',
    friendsDesc: 'Ton carnet, les défis reçus et ceux que tu as lancés.',
    analysis: 'Analyser une partie',
    analysisDesc: 'Rejoue une partie coup par coup, avec l’explication de chaque erreur.',
    sharedAnalysis: 'Une partie analysée',
    listen: 'Écouter le programme',
    listenDesc:
      'Les leçons lues à voix haute, sans rien à toucher : le coach parle, l’échiquier suit. Pour réviser en faisant autre chose.',
    learn: 'Apprendre',
    learnDesc: 'Les leçons guidées, de la règle du jeu aux finales.',
    levelTest: 'Test de niveau',
    levelTestDesc:
      'Douze positions pour situer ton niveau, et la liste de ce qui te fait gagner des points ensuite.',
    tier: 'Ton palier',
    tierDesc:
      'Le programme rangé par ce qui coûte le plus de points à ton niveau, et les motifs que tu rates vraiment.',
    principles: 'Principes et mémo',
    principlesDesc:
      'Quatre questions à se poser avant chaque coup, et les principes de conduite des trois phases — chacun avec son exception.',
    career: 'Carrière',
    careerDesc: 'Ton parcours, chapitre après chapitre.',
    leaderboard: 'Classement',
    leaderboardDesc: 'Les meilleurs joueurs de cette instance.',
    community: 'Communauté',
    communityDesc: 'Le classement, tes amis, tes parties par correspondance et tes statistiques.',
    signIn: 'Connexion',
    correspondence: 'Correspondance',
    correspondenceDesc: 'Les parties qui se jouent sur plusieurs jours.',
    credits: 'Crédits & licences',
    creditsDesc:
      'Les logiciels, jeux de données et ressources graphiques libres sur lesquels Le Coup Parfait est construit, avec leurs auteurs et leurs licences.',
    devMail: 'Courriels de test',
    editor: 'Éditeur de position',
    editorDesc: 'Compose une position et joue-la.',
    train: 'S’entraîner',
    trainDesc: 'Puzzles à ton niveau, manche chronométrée et défi du jour.',
    study: 'Étude',
    studies: 'Études',
    studiesDesc: 'Des parcours commentés, à lire et à partager.',
    endgames: 'Finales',
    endgamesDesc: 'Les finales élémentaires, à jouer contre la table.',
    glossary: 'Glossaire',
    glossaryDesc: 'Le vocabulaire des échecs, expliqué simplement.',
    opponents: 'Les adversaires artificiels',
    opponentsDesc:
      'Sept adversaires, sept styles de jeu réellement différents — leur histoire, leurs penchants chiffrés, et comment battre chacun d’eux.',
    playFriend: 'Jouer contre quelqu’un',
    play: 'Jouer',
    playDesc: 'Contre l’ordinateur, contre un ami, ou sur le même écran.',
    local: 'Partie sur le même écran',
    computer: 'Contre l’ordinateur',
    computerDesc: 'Des adversaires calibrés, du tout premier coup au grand maître.',
    liveGame: 'Partie en direct',
    lesson: 'Séance pédagogique',
    lessonDesc:
      'Une partie contre un adversaire calibré, un thème annoncé avant de commencer, et un bilan qui dit où il est apparu.',
    watch: 'Regarder une partie',
    watchDesc: 'Les parties en cours sur cette instance.',
    watchSomeone: 'La partie de {pseudo}',
    watchSomeoneDesc: 'Suis la partie de {pseudo} contre l’ordinateur, coup par coup.',
    forgotten: 'Mot de passe oublié',
    elo: 'Calculateur Elo',
    eloDesc:
      'Ce qu’un tournoi te rapporte ou te coûte, partie par partie, et ta performance — au barème de la FIDE.',
    arbitration: 'Aide-mémoire d’arbitrage',
    arbitrationDesc:
      'Pièce touchée, coup illégal, drapeau, nulle réclamée, téléphone : ce que disent les Règles du jeu de la FIDE, en une page.',
    tools: 'Outils',
    toolsDesc:
      'La pendule, le calculateur Elo, le tirage au sort et l’aide-mémoire d’arbitrage : ce qui sert autour d’un vrai échiquier.',
    draw: 'Tirage au sort',
    drawDesc:
      'Les couleurs d’une partie, les paires d’une ronde, l’ordre de passage : un tirage que tout le monde voit.',
    stakes: 'Les enjeux des ouvertures',
    stakesDesc:
      'Vingt-cinq ouvertures expliquées par leur idée, leur structure de pions, le plan de chaque camp et le piège des dix premiers coups.',
    openings: 'Ouvertures',
    openingsDesc: 'L’explorateur : 3 970 ouvertures répertoriées.',
    more: 'Plus',
    moreDesc: 'La communauté, les outils, ton compte et les réglages.',
    settings: 'Préférences',
    profileDesc: 'Classements, progression et dernières parties de {pseudo}.',
    puzzles: 'Puzzles',
    puzzlesDesc: 'Trouve le meilleur coup, un exercice à la fois.',
    rush: 'Puzzle rush',
    rushDesc: 'Le plus de puzzles possible avant la fin du temps.',
    reset: 'Nouveau mot de passe',
    stats: 'Statistiques',
    statsDesc: 'Ce que tes parties disent de ton jeu.',
    tournament: 'Tournoi',
    tournaments: 'Tournois',
    tournamentsDesc: 'Les arènes en cours et à venir.',
    computerTournament: 'Tournoi contre l’ordinateur',
    verify: 'Confirmation de l’adresse',
    vision: 'Vision',
    visionDesc: 'L’exercice qui apprend à voir les cases sans les compter.',
    lessonNotFound: 'Leçon introuvable',
  },
  crash: {
    title: 'Le Coup Parfait n’a pas pu démarrer',
    blurb:
      'L’application elle-même a rencontré un problème. Réessayer relance le chargement complet.',
    retry: 'Réessayer',
    reference: 'Référence de l’incident :',
  },
  bits: {
    unrecognisedFormat: 'Format non reconnu',
    paste: 'Coller',
    asImage: 'Image',
    flip: 'Retourner',
    clear: 'Vider',
    remove: 'Enlever',
    toMove: 'Trait',
    beforeEachMove: 'Avant chaque coup',
    except: 'Sauf',
    syllabus: 'Programme',
    noMessage: 'Aucun message',
    refresh: 'Actualiser',
    chapter: 'Chapitre',
    undo: 'Annuler',
    options: 'Options',
    seeMyTier: 'Voir mon palier',
    whichGames: 'Quelles parties afficher',
    watch: 'Regarder',
    back: 'Reculer',
    startPosition: 'Position initiale',
    aNameAndPassword: 'un pseudo et un mot de passe',
    freeNoEmail: 'gratuit, et sans courriel obligatoire',
    playArrow: 'Jouer →',
    nextMove: 'Coup suivant',
    toEnd: 'Fin',
    capturedPieces: 'Pièces capturées',
    send: 'Envoyer',
    goDeeper: 'Approfondir',
    service: 'Service',
    load: 'Charger',
    mainNav: 'Navigation principale',
    sections: 'Rubriques',
    needsAccount: 'demande un compte',
    quickNav: 'Navigation rapide',
    secondaryLinks: 'Liens secondaires',
    erase: 'Effacer',
    invitation: 'Invitation',
    notification: 'Notification',
    giveUp: 'Laisser tomber',
    reset: 'Remettre',
    analyse: 'Analyser',
    fineLevel: 'Niveau fin',
    goPlay: 'Aller jouer',
    deadLinkShort: 'Lien inutilisable',
    newRecord: 'Nouveau record !',
    show: 'Montrer',
    hide: 'Masquer',
  },
  rest: {
    immortal0:
      'Le gambit du roi : les Blancs offrent un pion pour ouvrir des lignes vers le roi adverse.',
    immortal1:
      'Les Noirs ramassent du matériel pendant que les Blancs développent. Deux philosophies s’affrontent.',
    immortal2:
      'Un deuxième pion tombe. L’évaluation donne les Noirs largement gagnants — et pourtant.',
    immortal3: 'Les Noirs viennent de prendre la tour a1. Ils ont une dame et deux tours d’avance.',
    immortal4:
      'Cavalier prend g7, échec. Le roi noir est nu au centre : le matériel ne le protège plus.',
    immortal5: 'Sacrifice de la dame ! Anderssen abandonne sa dernière pièce lourde.',
    immortal6: 'Fou e7, mat. Trois pièces mineures suffisent quand le roi n’a plus une seule case.',
    doorLearn: 'Apprendre les échecs de zéro',
    doorAnalyse: 'Analyser une partie',
    doorComputer: 'Jouer contre l’ordinateur',
    devOnly: 'Réservé au développement',
    devOnlyHint:
      'Cette boîte n’existe pas en production : la liste des courriels envoyés révélerait les adresses des inscrits.',
    mailbox: 'Boîte aux lettres',
    mailboxHint:
      'Les messages ne partent pas : ils sont écrits sur le disque, dans data/courriels.',
    mailboxEmptyHint:
      'Crée un compte en renseignant une adresse : le courriel de bienvenue apparaîtra ici.',
    createAccount: 'Créer un compte',
    community: 'Communauté',
    communityIntro:
      'Les autres joueurs, et ce que tu fais avec eux : se comparer, se retrouver, et regarder ce que tes parties disent de ton jeu.',
    leaderboardBlurb:
      'Qui joue ici, et à quel niveau. Chaque cadence a le sien, et les puzzles comptent à part.',
    friendsBlurb:
      'Ton carnet : qui est en ligne, qui t’a défié, et le lien d’invitation à envoyer à quelqu’un qui n’a pas encore de compte.',
    statsBlurb:
      'Ce que tes parties disent de ton jeu : l’ouverture où tu marques le moins, la cadence qui te réussit, l’heure où tu joues mal.',
    serverDown: 'Le serveur est injoignable.',
    changeAvatar: 'Changer d’avatar',
    pickAvatar: 'Choisir un avatar',
    yourAvatar: 'Ton avatar',
    subscribeFailed: 'L’abonnement n’a pas pu être enregistré.',
    browserRefused: 'Le navigateur a refusé l’abonnement.',
    settingNotSaved: 'Le réglage n’a pas été enregistré.',
    sendFailed: 'L’envoi a échoué.',
    requestFailed: 'La demande a échoué.',
    replayAnswer: 'Réécouter la réponse',
    askPlaceholder: 'Pose ta question…',
    askAboutPosition: 'Pose ta question sur cette position',
    driverChessnut: 'Chessnut',
    driverChessnutModels: 'Air, Air+, Pro, Go, Evo',
    driverChessnutUsb: 'Chessnut par câble',
    driverChessnutUsbModels: 'Air, Air+, Pro (expérimental)',
    driverMillennium: 'Millennium ChessLink',
    driverMillenniumModels: 'Exclusive, Supreme Tournament 55, King Performance, eONE',
    driverMillenniumUsb: 'Millennium par câble',
    driverMillenniumUsbModels: 'ChessLink en USB',
    driverPegasus: 'DGT Pegasus',
    driverPegasusModels: 'détection de présence, avec LEDs',
    driverDgt: 'DGT',
    driverDgtModels: 'e-Board, Smart Board, USB-C (sans LEDs)',
    driverCertabo: 'Certabo',
    driverCertaboModels: 'Certabo, TabuTronic Cerno et Sentio',
    noBluetooth: 'Ce navigateur n’expose pas le Bluetooth.',
    noHid: 'Ce navigateur n’expose pas WebHID.',
    noSerial: 'Ce navigateur n’expose pas Web Serial.',
    noStreams: 'Le port série ne fournit ni lecture ni écriture.',
    connectFailed: 'Connexion impossible.',
    gattFailed: 'Connexion GATT impossible.',
    noCardChosen: 'Aucune carte choisie.',
    cardDisconnected: 'Carte déconnectée.',
    cardDisconnectedWhy: 'Carte déconnectée — {raison}',
    boardMismatch: 'Le plateau ne correspond pas à la partie. Remettez les pièces en place.',
    levelBeginner: 'Débutant',
    levelIntermediate: 'Intermédiaire',
    levelAdvanced: 'Confirmé',
    copyPosition: 'Copier la position (Ctrl+Maj+C)',
    positionCopied: 'Position copiée',
    copyFailed: 'Copie impossible',
    clipboardRefused: 'Le navigateur n’a pas autorisé l’accès au presse-papiers.',
    searchPlayer: 'Chercher un joueur…',
    searchPlayerAria: 'Chercher un joueur dans l’annuaire',
    nobodyByThatName: 'Personne de ce nom dans l’annuaire.',
    whiteToMove: 'Aux Blancs',
    blackToMove: 'Aux Noirs',
    whiteFlagged: 'Temps écoulé — les Blancs tombent.',
    blackFlagged: 'Temps écoulé — les Noirs tombent.',
    promotionChoice: 'Choix de la pièce de promotion',
    chapterDone: 'Chapitre terminé',
    wellPlayed: 'Bien joué',
    hideOpening: 'Masquer le nom de l’ouverture',
    hideOpeningTitle: 'Masquer — réactivable dans les préférences',
    won: 'gagnée',
    lost: 'perdue',
    drawn: 'nulle',
    noResult: 'sans résultat',
    white: 'Blancs',
    black: 'Noirs',
    rowStart: 'Voir le début de la rangée',
    rowNext: 'Voir la suite de la rangée',
    maiaDown: 'Maia est injoignable.',
    engineCouldntPlay: 'Le moteur n’a pas pu jouer. Réessaie ou recharge la page.',
    unreadableResponse: 'Réponse illisible du fournisseur.',
    noStream: 'Le fournisseur n’a renvoyé aucun flux.',
    evalOverTime: 'Évolution de l’évaluation au fil de la partie',
    previousMove: 'Coup précédent',
    seeYouSoon: 'À bientôt !',
    installApp: 'Installer l’application',
    theOpponent: 'l’adversaire',
    theComputer: 'l’ordinateur',
    justNow: 'à l’instant',
    liveServerDown:
      'Le serveur de parties est injoignable. Vérifie qu’il est démarré, ou joue contre l’ordinateur en attendant.',
    cannotFetchGames: 'Impossible de récupérer les parties.',
    explorer: 'L’explorateur',
    openingExplorer: 'Explorateur d’ouvertures',
    importCommand: 'Commande d’import :',
    computerTournament: 'Tournoi contre l’ordinateur',
    today: 'aujourd’hui,',
    ratingCurveAria:
      'Classement {categorie} : {depart} au départ, {arrivee} aujourd’hui, sur {parties} parties.',
    askEngineConfirm:
      'Demander le meilleur coup au moteur ?\n\nTon adversaire en sera informé dans le tchat de la partie.',
  },
  catalog: {
    setStaunton: 'Staunton',
    setStauntonHint: 'Le standard des tournois depuis 1849.',
    setMerida: 'Merida',
    setMeridaHint: 'Contours nets, très lisible en petite taille.',
    setAlpha: 'Alpha',
    setAlphaHint: 'Silhouettes pleines, sans détail superflu.',
    setChessnut: 'Chessnut',
    setChessnutHint: 'Épuré et contemporain.',
    setFantasy: 'Fantasy',
    setFantasyHint: 'Volumes sculptés, ombres douces.',
    setCeltic: 'Celtique',
    setCelticHint: 'Entrelacs et lignes gravées.',
    setSpatial: 'Spatial',
    setSpatialHint: 'Formes futuristes en perspective.',
    setRhos: 'Rhos',
    setRhosHint: 'Aplats colorés, domaine public.',
    setPixel: 'Pixel',
    setPixelHint: 'Hommage aux échiquiers 8 bits.',
    setLetter: 'Lettres',
    setLetterHint: 'Initiales seules — lisibilité maximale.',
    boardAurore: 'Aurore',
    boardNoyer: 'Noyer',
    boardMarbre: 'Marbre',
    boardArdoise: 'Ardoise',
    boardMousse: 'Mousse',
    boardPapier: 'Papier',
    boardNeon: 'Néon',
    boardSepia: 'Sépia',
    matIvory: 'Ivoire',
    matMarble: 'Marbre',
    matGlass: 'Verre',
    colClassic: 'Ivoire & ébène',
    colClassicHint: 'Les couleurs d’un vrai jeu de tournoi.',
    colPure: 'Blanc & noir',
    colPureHint: 'Contraste maximal, aucune ambiguïté.',
    colWood: 'Érable & noyer',
    colWoodHint: 'Deux essences de bois, chaleureux.',
    colMarble: 'Marbre',
    colMarbleHint: 'Froid et minéral.',
    colTheme: 'Suivre le thème',
    colThemeHint: 'Les pièces prennent les couleurs du damier.',
    colCustom: 'Personnalisé',
    colCustomHint: 'Choisis toi-même les deux couleurs.',
    careerGate: 'La carrière demande un compte',
    careerGateWhy:
      'Douze chapitres et une progression qui se garde : elle n’aurait aucun sens si elle disparaissait en fermant l’onglet.',
    careerGain1: 'Tes étoiles, ton rang et tes hauts faits conservés',
    careerGain2: 'La reprise là où tu t’es arrêté, sur n’importe quel appareil',
    careerGain3: 'Un adversaire calibré sur ton niveau réel, chapitre après chapitre',
    tourneyGate: 'Les tournois demandent un compte',
    tourneyGateWhy:
      'Une arène apparie des joueurs sur plusieurs rondes : il faut pouvoir te retrouver entre deux parties.',
    tourneyGain1: 'Créer une arène et y inscrire d’autres joueurs',
    tourneyGain2: 'Un classement qui suit d’une ronde à l’autre',
    tourneyGain3: 'Les tournois solo contre l’ordinateur, avec leur tableau',
    friendsGate: 'Le carnet d’amis demande un compte',
    friendsGateWhy: 'Les amis se retrouvent par leur pseudo : il faut donc en avoir un.',
    friendsGain1: 'Défier quelqu’un d’un clic, sans repasser par un lien',
    friendsGain2: 'Voir qui est en ligne et qui attend ton coup',
    friendsGain3: 'Un lien d’invitation à ton nom',
    corrGate: 'La correspondance demande un compte',
    corrGateWhy:
      'Une partie qui dure des jours doit te reconnaître à chaque retour, sinon elle est perdue au premier onglet fermé.',
    corrGain1: 'Plusieurs parties en cours, à ton rythme',
    corrGain2: 'Un compteur qui te dit où c’est à toi de jouer',
    corrGain3: 'Rien à laisser ouvert entre deux coups',
    statsGate: 'Les statistiques demandent un compte',
    statsGateWhy:
      'Elles se calculent sur tes parties enregistrées : sans compte, aucune partie n’est à personne.',
    statsGain1: 'Ta précision et ton Elo estimé, partie après partie',
    statsGain2: 'Tes ouvertures les plus jouées et leurs résultats',
    statsGain3: 'La phase de jeu qui te coûte le plus de points',
    studiesGate: 'Les études demandent un compte',
    studiesGateWhy:
      'Une étude t’appartient et se retrouve d’une session à l’autre : il faut savoir à qui elle est.',
    studiesGain1: 'Des positions annotées, conservées et reprises',
    studiesGain2: 'Tes variantes gardées avec leurs commentaires',
    dailyGate: 'Le défi du jour demande un compte',
    dailyGateWhy:
      'La même position pour tout le monde, une fois par jour : c’est une série, et une série se compte dans le temps.',
    dailyGain1: 'Ta série de jours consécutifs, et ton record',
    dailyGain2: 'Les objectifs du jour et les points qui vont avec',
    dailyGain3: 'Les puzzles ordinaires, eux, restent libres et illimités',
  },
  /*
    Le bandeau qui porte un message de l'équipe.

    Quatre clés seulement : le message lui-même n'est pas traduisible — il est
    écrit à la main depuis l'administration, dans la langue de son auteur. Tout
    ce que le dictionnaire peut faire, c'est dire au lecteur d'où il vient.
  */
  announce: {
    fromTeam: 'Mot de l’équipe',
    forYou: 'Message pour toi',
    signed: 'de {auteur}',
    dismiss: 'Fermer ce message',
  },

  admin: {
    title: 'Administration',
    blurb:
      'Ce que tu fais ici s’applique à de vraies personnes. Les actes irréversibles demandent d’écrire le pseudo, et tous sont consignés dans le journal.',
    tabDashboard: 'Tableau de bord',
    tabAccounts: 'Comptes',
    tabAnnouncements: 'Annonces',
    tabContent: 'Contenus',
    tabLog: 'Journal',
    tabSystem: 'Système',
    tabTools: 'Outils',

    // ── Annonces ──────────────────────────────────────────────────────────
    announceNew: 'Écrire aux joueurs',
    announceHint:
      'Sans destinataire, le message s’affiche à tout le monde. Avec un pseudo, il n’est vu que par cette personne.',
    announcePlaceholder: 'Le message, tel qu’il sera lu…',
    announceTarget: 'Destinataire',
    announceTargetHint: 'Laisse vide pour t’adresser à tout le monde.',
    announceEveryone: 'Tout le monde',
    announceDays: 'Durée d’affichage, en jours',
    announceDaysHint: '0 pour l’afficher jusqu’à ce que tu le retires.',
    announceToneInfo: 'Information',
    announceToneImportant: 'Important',
    announceSend: 'Envoyer',
    announceSendAll: 'Annoncer à tous',
    announceScopeOne: 'Seul {pseudo} verra ce message.',
    announceScopeAll: 'Tous les joueurs verront ce message, connectés ou non.',
    announceSent: 'Ce qui a été dit',
    announceSentHint: 'Les quarante derniers messages, et le nombre de fois qu’ils ont été lus.',
    announceNone: 'Aucun message envoyé',
    announceReads: '{n} lecture(s)',
    announceWithdraw: 'Retirer ce message',
    announceWithdrawn: 'Message retiré.',
    announceOff: 'Éteint',
    announceSentTo: 'Message envoyé à {pseudo}.',
    announceSentAll: 'Annonce publiée.',
    announceEmpty: 'Un message vide ne s’envoie pas.',
    announceTooLong: 'Le message dépasse six cents caractères.',
    announceNoSuchUser: 'Aucun compte ne porte ce pseudo.',
    notFound: 'Cette page n’existe pas',
    notFoundHint: 'Vérifie l’adresse, ou reviens à l’accueil.',
    readFailed: 'Lecture impossible.',
    tryAgain: 'Réessaie dans un instant.',
    serverDown: 'Le serveur est injoignable.',
    done: 'C’est fait.',
    loggedInJournal: 'L’acte est consigné dans le journal.',
    modeComputer: 'Contre l’ordinateur',
    modeFriend: 'Entre joueurs',
    modeLocal: 'À deux sur le même écran',
    modePuzzle: 'Puzzle',
    modeLesson: 'Leçon',
    modeTournament: 'Tournoi',
    modeCorrespondence: 'Correspondance',
    paceRapid: 'Rapide',
    paceClassical: 'Classique',
    days7: '7 j',
    days30: '30 j',
    days90: '90 j',
    days365: '1 an',
    statsFailed: 'Calcul impossible',
    statsFailedHint: 'La base n’a pas répondu. Les autres onglets restent utilisables.',
    activity: 'Activité',
    activityHint:
      'Chaque point est une journée, à l’heure de Paris. Un jour sans rien vaut zéro, pas un trou.',
    games: 'Parties',
    puzzles: 'Puzzles',
    signups: 'Inscriptions',
    perDayAverage: '{n} par jour en moyenne',
    puzzlesTried: 'Puzzles tentés',
    solvedFirstTry: '{part} résolus du premier coup',
    accountsCreated: '{n} comptes créés sur la période',
    medianPerPuzzle: 'Temps médian par puzzle',
    distinctPlayers: '{n} joueurs distincts',
    overPeriod: 'Sur la période choisie.',
    gameModes: 'Modes de jeu',
    paces: 'Cadences',
    pacesHint: 'Une cadence classée compte pour le classement Glicko ; une amicale non.',
    rated: 'classée',
    casual: 'amicale',
    endings: 'Fins de partie',
    endingsHint: '« En cours » compte aussi les parties abandonnées en plan, jamais reprises.',
    openings: 'Ouvertures les plus jouées',
    openingsHint:
      'Sur toute l’histoire du site : un répertoire d’ouvertures ne se juge pas sur un mois.',
    hours: 'Heures de jeu',
    hoursHint:
      'Les parties commencées, par heure locale. C’est l’heure où il faut éviter de redémarrer le serveur.',
    statusPlaying: 'En cours',
    statusCheckmate: 'Échec et mat',
    statusResign: 'Abandon',
    statusTimeout: 'Temps écoulé',
    statusDraw: 'Nulle convenue',
    statusStalemate: 'Pat',
    statusRepetition: 'Répétition',
    statusFiftyMoves: 'Règle des cinquante coups',
    statusInsufficient: 'Matériel insuffisant',
    statusAborted: 'Interrompue',
    retention: 'Ce que deviennent les nouveaux comptes',
    retentionHint:
      'Calculé sur les seuls comptes créés pendant la période : un taux mesuré sur tout l’historique ne bougerait plus jamais.',
    playedOnce: 'Ont joué au moins une partie',
    outOfSignups: '{n} sur {total} inscrits',
    cameBack: 'Revenus au moins un jour après',
    cameBackNote: '{n} comptes revus le lendemain ou plus tard',
    leftAddress: 'Ont laissé une adresse',
    leftAddressNote: '{n} confirmées — les autres ne pourront pas récupérer leur mot de passe',
    lessonsDone: 'Leçons terminées',
    lessonsDoneNote: '{n} entamées par {joueurs} joueurs',
    levels: 'Répartition des niveaux',
    levelsHint:
      'Par tranches de cent points, toutes cadences confondues, comptes ayant au moins une partie classée.',
    noRatedGame: 'Aucune partie classée pour l’instant.',
    topPlayers: 'Joueurs les plus actifs',
    topPlayersHint:
      'Les comptes qui ont le plus joué sur la période. Une partie compte pour ses deux joueurs.',
    noGameInPeriod: 'Aucune partie sur la période.',
    seenOn: 'vu le {date}',
    filterAll: 'Tous',
    filterOnline: 'En ligne',
    filterAdmins: 'Administrateurs',
    filterDisabled: 'Désactivés',
    filterNeverPlayed: 'Jamais joué',
    filterNoAddress: 'Sans adresse confirmée',
    sortLastSeen: 'dernière visite',
    sortSignup: 'inscription',
    sortUsername: 'pseudo',
    actionImpossible: 'Action impossible.',
    search: 'Chercher',
    searchPlaceholder: 'pseudo ou adresse',
    reload: 'Relire',
    sortBy: 'trier par',
    descending: 'Décroissant',
    ascending: 'Croissant',
    noAccount: 'Aucun compte',
    noResultForFilter: 'Aucun résultat pour ce filtre.',
    accountsKept: '{n} comptes retenus',
    accountKept: '{n} compte retenu',
    outOfTotal: 'sur {n}',
    previous: 'Précédents',
    nextOnes: 'Suivants',
    pageOf: 'page {page} sur {total}',
    onlineNow: 'en ligne à l’instant',
    seenAt: 'vu à {heure}',
    admin: 'admin',
    disabled: 'désactivé',
    you: 'toi',
    online: 'en ligne',
    confirmed: 'confirmée',
    unconfirmed: 'non confirmée',
    noAddress: 'aucune adresse',
    gamesCount: '{n} parties',
    gameCount: '{n} partie',
    bestRating: 'meilleur classement {n}',
    signedUpOn: 'inscrit le {date}',
    devicesOpen: '{n} appareils ouverts',
    deviceOpen: '{n} appareil ouvert',
    reactivate: 'Réactiver',
    deactivate: 'Désactiver',
    demote: 'Rétrograder',
    promote: 'Promouvoir',
    password: 'Mot de passe',
    anonymise: 'Anonymiser',
    passwordBlurb:
      'Choisis un mot de passe provisoire et transmets-le à la personne. Toutes ses sessions se ferment. C’est la porte de secours quand la messagerie n’est pas configurée.',
    passwordPlaceholder: '8 caractères minimum',
    apply: 'Appliquer',
    anonymiseWarning:
      'Le pseudo, l’adresse et le mot de passe sont effacés sans retour possible. Les parties restent — elles appartiennent aussi aux adversaires, et les retirer creuserait des trous dans leur historique.',
    anonymisePlaceholder: 'écris « {pseudo} » pour confirmer',
    purgeSessions: 'Sessions expirées',
    purgeSessionsHint: 'Des lignes que plus personne ne relit. Sans effet visible.',
    purgeEvaluations: 'Évaluations trop peu profondes',
    purgeEvaluationsHint:
      'Sous 14 demi-coups : l’analyse en demande 18, ces entrées occupent de la place sans jamais éviter un calcul. Le moteur refera le travail si besoin.',
    purgeEmpty: 'Comptes vides et inactifs',
    purgeEmptyHint:
      'Aucune partie, aucune analyse, pas revus depuis six mois. Les administrateurs sont épargnés.',
    purgeImpossible: 'Purge impossible.',
    linesRemoved: '{n} ligne(s) retirée(s)',
    accounts: 'Comptes',
    thisWeek: '+{n} cette semaine',
    sinceYesterday: '+{n} depuis hier',
    onlineMeasure: 'En ligne',
    onlineNote: '{vus} vus depuis 24 h · {sessions} sessions ouvertes',
    analysesKept: 'Analyses conservées',
    puzzlesInStock: '{n} puzzles en réserve',
    services: 'Services',
    database: 'Base de données',
    analysisEngine: 'Moteur d’analyse',
    engineAnswers: 'répond au diagnostic',
    engineDown: 'injoignable — les analyses repassent par le navigateur',
    outgoingMail: 'Messagerie sortante',
    senderUnset: 'expéditeur non précisé',
    mailUnset: 'SMTP_URL absente — la récupération de mot de passe est masquée',
    housekeeping: 'Ménage',
    housekeepingHint: 'Aucune ne touche à une partie, un compte actif ou une analyse conservée.',
    purge: 'Purger',
    adminAccess: 'Accès administrateur',
    adminNamesSet:
      'désigne {pseudos}. Ces comptes restent administrateurs quoi qu’il arrive en base — c’est ce qui empêche de s’enfermer dehors après une restauration de sauvegarde.',
    adminNamesUnset:
      'n’est pas renseignée : tes droits viennent de la base seule. Si une restauration ramène un dump antérieur à ta promotion, plus personne ne pourra ouvrir cette page.',
    rereadState: 'Relire l’état',
    sizeUnknown: 'taille inconnue',
    sizeTotal: '{taille} au total',
    sizeWithTables: '{taille} au total, dont {tables} de tables ({part} %)',
    ok: 'ok',
    missing: 'absent',
    toolsTracked: 'Outils suivis',
    toolsTrackedNote: 'moteurs, données, ressources, bibliothèques',
    libraries: 'Bibliothèques',
    librariesNote: 'dépendances d’exécution',
    toFix: 'À corriger',
    toFixNone: 'catalogue et dépôt d’accord',
    toFixSome: 'détail ci-dessous',
    updates: 'Mises à jour',
    updatesFound: 'versions plus récentes publiées',
    updatesNotSought: 'pas encore cherchées',
    toFixHint: 'Le même contrôle tourne dans `npm test` : ces écarts font échouer la construction.',
    uncredited: '{n} paquet(s) non crédité(s)',
    uncreditedHint:
      'Déclarés dans un package.json, absents du catalogue. Leur licence exige peut-être l’attribution.',
    orphans: '{n} crédit(s) orphelin(s)',
    orphansHint: 'Le catalogue cite un paquet que plus aucun espace de travail ne déclare.',
    drifted: '{n} version(s) qui a dérivé',
    driftedHint: 'La version affichée ne se trouve plus dans le fichier qui fait autorité.',
    notFoundIn: 'introuvable dans {fichier}',
    unreadableHere: '{fichier} illisible ici',
    workspacesUnreadable:
      '{espaces} n’a pas pu être lu depuis ce serveur — l’image de production n’embarque pas tous les manifestes. Le contrôle des tests, lui, voit le dépôt entier.',
    workspacesUnreadablePlural:
      '{espaces} n’ont pas pu être lus depuis ce serveur — l’image de production n’embarque pas tous les manifestes. Le contrôle des tests, lui, voit le dépôt entier.',
    seekUpdates: 'Chercher les mises à jour',
    outboundNote:
      'Interroge le registre npm et GitHub depuis le serveur. Rien d’autre que des noms de paquets publics ne sort d’ici.',
    publishedByAuthor: 'Version publiée par l’auteur',
    latestPublished: 'Dernière version publiée',
    upToDate: 'à jour',
    licenceDiverges: 'Le paquet déclare « {licence} » — le catalogue dit autre chose.',
    recentGames: 'Dernières parties',
    recentGamesHint:
      'Une partie classée ne peut pas être effacée : elle a bougé le classement de son adversaire.',
    noGame: 'Aucune partie',
    white: 'Blancs',
    black: 'Noirs',
    halfMoves: '{n} demi-coups',
    openGameInNewTab: 'Ouvrir la partie dans un autre onglet',
    ratedNotDeletable: 'Partie classée : non supprimable',
    deleteGame: 'Supprimer cette partie',
    deleteImpossible: 'Suppression impossible.',
    deleted: 'Supprimé.',
    recentAnalyses: 'Dernières analyses',
    recentAnalysesHint:
      'Les analyses conservées par les joueurs. Supprimer n’efface pas la partie d’origine.',
    noAnalysisKept: 'Aucune analyse conservée',
    belongsTo: 'à {pseudo}',
    noOwner: 'sans propriétaire',
    deleteAnalysis: 'Supprimer cette analyse',
    actDeactivate: 'a désactivé',
    actReactivate: 'a réactivé',
    actPromote: 'a promu administrateur',
    actDemote: 'a rétrogradé',
    actPassword: 'a changé le mot de passe de',
    actAnonymise: 'a anonymisé',
    actDeleteGame: 'a supprimé la partie',
    actDeleteAnalysis: 'a supprimé l’analyse',
    actPurge: 'a purgé',
    filterLabelDeactivate: 'désactivé',
    filterLabelReactivate: 'réactivé',
    filterLabelPromote: 'promu administrateur',
    filterLabelDemote: 'rétrogradé',
    filterLabelPassword: 'changé le mot de passe de',
    filterLabelAnonymise: 'anonymisé',
    filterLabelDeleteGame: 'supprimé la partie',
    filterLabelDeleteAnalysis: 'supprimé l’analyse',
    filterLabelPurge: 'purgé',
    filterTitle: 'Filtrer',
    filterHint:
      'Le journal ne s’efface pas depuis cette page : une trace qu’on peut retirer d’un clic ne vaut pas comme trace.',
    allActs: 'tous les actes',
    allAuthors: 'tous les auteurs',
    emptyLog: 'Rien dans le journal',
    emptyLogHint:
      'Aucun acte d’administration n’a encore été enregistré — ou aucun ne correspond à ce filtre.',
    seeFurtherBack: 'Voir plus loin dans le passé',
    noReturn: 'sans retour',
    rights: 'droits',
    becameRole: 'devenu {role}',
    wasAdmin: 'était administrateur',
    wasDisabled: 'était déjà désactivé',
    curveLabel: 'Évolution sur {n} jours de : {series}',
    overThePeriod: 'sur la période',
    nothingThisPeriod: 'Rien à montrer sur cette période.',
  },
  parts: {
    avatarChess: 'Échecs',
    avatarChessHint: 'Les pièces du jeu, pour rester dans le ton.',
    avatarAnimals: 'Animaux',
    avatarAnimalsHint: 'Les plus reconnaissables en petit.',
    avatarCreatures: 'Créatures',
    avatarCreaturesHint: 'Pour qui préfère l’imaginaire.',
    avatarNature: 'Nature',
    avatarNatureHint: 'Sobres, lisibles, sans rien affirmer.',
    avatarObjects: 'Objets',
    avatarObjectsHint: 'Un peu de caractère sans mascotte.',
    checkmate: 'Échec et mat',
    gains: 'Gagne {n} points',
    gainsOne: 'Gagne {n} point',
    loses: 'Perd {n} points',
    losesOne: 'Perd {n} point',
    evenTrade: 'Échange équilibré',
    safeSquare: 'Case sûre',
    withCheck: ' · échec',
    defaultVoice: 'voix par défaut',
    systemDefaultVoice: 'voix par défaut du système',
    neuralDown: 'Le serveur de voix neuronale ne répond pas.',
    engineSlow: 'Le moteur met trop de temps à démarrer.',
    engineStopped: 'Moteur arrêté',
    engineNotStarted: 'Moteur non démarré',
    analysisCancelled: 'Analyse annulée',
    iaUnreadable: 'Réponse illisible du fournisseur.',
    iaNoStream: 'Le fournisseur n’a renvoyé aucun flux.',
    loading3d: 'Chargement de la 3D…',
    iaModelUnavailable:
      'Ce modèle n’est pas disponible pour ta clé. Choisis-en un autre dans la liste.',
    iaKeyRefused: 'Ta clé a été refusée. Vérifie-la dans les préférences.',
    iaOutOfCredit: 'Ton crédit est épuisé chez ce fournisseur.',
    iaNoSuchModel: 'Ce modèle n’existe pas chez ce fournisseur. Choisis-en un autre.',
    iaTooMany: 'Trop de demandes d’affilée. Laisse passer quelques secondes.',
    iaUnreachable:
      'Service injoignable. S’il tourne sur ta machine, autorise-le à répondre aux pages web (variable OLLAMA_ORIGINS pour Ollama).',
    iaTimeout: 'Le fournisseur a mis trop de temps à répondre.',
    iaPickModel: 'Choisis d’abord un modèle.',
    iaEnterKey: 'Saisis d’abord ta clé.',
    iaServerError: 'Le fournisseur est en difficulté (erreur {code}). Réessaie dans un instant.',
    iaNoProvider: 'Aucun fournisseur configuré.',
  },
  common: {
    loading: 'Chargement…',
    error: 'Erreur',
    retry: 'Réessayer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',
    save: 'Enregistrer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    copy: 'Copier',
    copied: 'Copié !',
    share: 'Partager',
    yes: 'Oui',
    no: 'Non',
    of: 'sur',
    you: 'Toi',
    computer: 'Ordinateur',
    guest: 'Invité',
    anonymous: 'Anonyme',
  },
}

/**
 * Type du dictionnaire : l'anglais doit s'y conformer exactement.
 *
 * Pas de `as const` sur `fr` : on veut que le *type* d'une entrée soit `string`,
 * pas la valeur littérale française. Sans cela, TypeScript exigerait que
 * l'anglais reproduise mot pour mot le texte français.
 */

export type Dictionary = typeof fr
