def edit(p, pairs):
    s=open(p,encoding='utf-8').read()
    for a,b in pairs:
        assert a in s, (p, a[:70])
        s=s.replace(a,b,1)
    open(p,'w',encoding='utf-8').write(s)

edit('src/components/accueil/AccueilConnecte.tsx', [
("""    <div className="entree mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">""",
"""    <div className="entree mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 lg:py-6">"""),
("""      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="titre-affiche text-[2.3rem] sm:text-[3rem] lg:text-[3.6rem]">""",
"""      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="titre-affiche text-[2rem] sm:text-[2.4rem] lg:text-[2.75rem]">"""),
("""      {/* ── 1. Maintenant ─────────────────────────────────────────────── */}
      <Maintenant choses={choses} chargement={chargement} positionDuJour={defi.fen} />

      {/* ── 2. Les deux états : la journée, et le chemin ────────────────
          Côte à côte et de poids égal, parce qu'ils répondent à la même
          question à deux échelles — « où j'en suis ? ». Ils s'empilent sous
          `md`, la journée d'abord : c'est elle qui expire. */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Aujourdhui defiFait={defiFait === true} tranche={defi.tranche} niveauDefi={defi.niveau} />

        {progression === undefined ? (""",
"""      {/* ── Une grille, et elle tient dans l'écran ─────────────────────
          Les blocs s'empilaient : « Maintenant » sur toute la largeur, puis
          deux rangées de deux cartes — et sur un écran de bureau il fallait
          faire défiler pour voir ses dernières parties. Un tableau de bord
          qu'on fait défiler n'en est plus un.

          Douze colonnes, deux rangées. En haut, « Maintenant » sur huit et
          les quêtes sur quatre — l'action et la journée, côte à côte. En
          bas, trois cartes de quatre : le parcours, les parties, les
          analyses. Chaque carte remplit sa case (`h-full`), pour que les
          rangées se lisent comme des rangées. Sous `lg`, tout s'empile dans
          l'ordre d'urgence, comme avant. */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Maintenant choses={choses} chargement={chargement} positionDuJour={defi.fen} />
        </div>

        <div className="lg:col-span-4">
          <Aujourdhui defiFait={defiFait === true} tranche={defi.tranche} niveauDefi={defi.niveau} />
        </div>

        {progression === undefined ? ("""),
("""          <Skeleton className="h-48 w-full" />
        ) : carriereEnCours && chapitre && progression ? (
          <Card className="overflow-hidden">""",
"""          <Skeleton className="h-48 w-full lg:col-span-4" />
        ) : carriereEnCours && chapitre && progression ? (
          <Card className="overflow-hidden lg:col-span-4">"""),
("""            <div className="p-5">
              {/* Le numéro du chapitre, en grand, à côté de son titre : c'est""",
"""            <div className="p-4">
              {/* Le numéro du chapitre, en grand, à côté de son titre : c'est"""),
("""                  className="chiffre-affiche shrink-0 text-[3rem] leading-none text-[var(--rub-jouer)]\"""",
"""                  className="chiffre-affiche shrink-0 text-[2.4rem] leading-none text-[var(--rub-jouer)]\""""),
("""                <div className="min-w-0 pt-1">
                  <p className="font-display text-[1.15rem] font-bold leading-tight">""",
"""                <div className="min-w-0 pt-0.5">
                  <p className="font-display text-[1.05rem] font-bold leading-tight">"""),
("""              <div
                className="mt-4 grid gap-1\"""",
"""              <div
                className="mt-3 grid gap-1\""""),
("""              <ul className="mt-4 space-y-1.5">""",
"""              <ul className="mt-3 space-y-1">"""),
("""              <ButtonLink href="/carriere" variant="secondary" size="sm" fullWidth className="mt-4">""",
"""              <ButtonLink href="/carriere" variant="secondary" size="sm" fullWidth className="mt-3">"""),
("""        ) : (
          <Card className="p-4">
            <p className="font-display text-base font-bold leading-tight">""",
"""        ) : (
          <Card className="p-4 lg:col-span-4">
            <p className="font-display text-base font-bold leading-tight">"""),
("""            </ButtonLink>
          </Card>
        )}
      </div>

      {/* ── 3. Ce qu'on a fait ─────────────────────────────────────────
          En bas, et c'est sa place : on ne rouvre pas l'application pour
          relire ce qu'on a joué hier. Mais les lignes mènent à l'analyse, et
          le disent maintenant — un chevron gris ne l'annonçait pas. */}
      {(parties === null || parties.length > 0 || (analyses?.length ?? 0) > 0) && (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Card className="overflow-hidden">""",
"""            </ButtonLink>
          </Card>
        )}

      {/* ── Ce qu'on a fait ────────────────────────────────────────────
          En bas, et c'est sa place : on ne rouvre pas l'application pour
          relire ce qu'on a joué hier. Mais les lignes mènent à l'analyse, et
          le disent maintenant — un chevron gris ne l'annonçait pas. */}
      {(parties === null || parties.length > 0 || (analyses?.length ?? 0) > 0) && (
        <>
          <Card className="h-full overflow-hidden lg:col-span-4">"""),
("""                      className="group flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-surface-hover\"""",
"""                      className="group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-hover\""""),
("""                          <PortraitAdversaire
                            personality={personnalite}
                            size={44}
                            className="shrink-0 rounded-[10px]"
                          />""",
"""                          <PortraitAdversaire
                            personality={personnalite}
                            size={38}
                            className="shrink-0 rounded-[9px]"
                          />"""),
("""                          className="grid h-11 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-strong font-display text-lg font-bold text-muted\"""",
"""                          className="grid h-[38px] w-8 shrink-0 place-items-center rounded-[9px] bg-surface-strong font-display text-base font-bold text-muted\""""),
("""                          <span className="block truncate text-[15px]">
                            contre{' '}""",
"""                          <span className="block truncate text-[14px]">
                            contre{' '}"""),
("""          {analyses && analyses.length > 0 ? (
            <Card className="overflow-hidden">""",
"""          {analyses && analyses.length > 0 ? (
            <Card className="h-full overflow-hidden lg:col-span-4">"""),
("""                    className="flex items-center gap-3.5 border-b border-line/40 px-4 py-3 text-[15px] last:border-0\"""",
"""                    className="flex items-center gap-3 border-b border-line/40 px-4 py-2 text-[14px] last:border-0\""""),
("""            <Card className="flex flex-col overflow-hidden">
              {/* Le même bandeau que ses voisines, alors que ce n'est pas une""",
"""            <Card className="flex h-full flex-col overflow-hidden lg:col-span-4">
              {/* Le même bandeau que ses voisines, alors que ce n'est pas une"""),
("""            </Card>
          )}
        </div>
      )}
    </div>
  )
}""",
"""            </Card>
          )}
        </>
      )}
      </div>
    </div>
  )
}"""),
])

edit('src/components/accueil/Maintenant.tsx', [
("""    <Card
      glow
      className={clsx(
        'overflow-hidden',""",
"""    <Card
      glow
      className={clsx(
        'flex h-full flex-col overflow-hidden',"""),
("""      <div className={clsx('p-5 sm:p-6', plateau && 'grid gap-6 md:grid-cols-[1fr_auto] md:items-center')}>
        <div>
          {/* La phrase, en grand. C'est elle qu'on lit en arrivant, et elle
              doit se suffire : on doit savoir quoi faire sans lire la ligne
              d'après. */}
          <h2 className="titre-affiche text-[1.6rem] sm:text-[2rem]">{principale.titre}</h2>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
            {principale.detail}
          </p>

          <Link href={principale.lien} className="mt-6 block sm:inline-block">
            <Button variant="primary" size="lg" icon={<ArrowRight size={16} />} fullWidth>
              {principale.action}
            </Button>
          </Link>
        </div>""",
"""      <div
        className={clsx(
          'flex-1 p-5',
          plateau && 'grid gap-5 md:grid-cols-[1fr_auto] md:items-center',
        )}
      >
        <div>
          {/* La phrase, en grand. C'est elle qu'on lit en arrivant, et elle
              doit se suffire : on doit savoir quoi faire sans lire la ligne
              d'après. */}
          <h2 className="titre-affiche text-[1.45rem] sm:text-[1.75rem]">{principale.titre}</h2>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-muted">
            {principale.detail}
          </p>

          <Link href={principale.lien} className="mt-4 block sm:inline-block">
            <Button variant="primary" size="md" icon={<ArrowRight size={16} />} fullWidth>
              {principale.action}
            </Button>
          </Link>
        </div>"""),
("""            className="group mx-auto block w-full max-w-[280px] md:w-[260px] lg:w-[300px]\"""",
"""            className="group mx-auto block w-full max-w-[240px] md:w-[200px] lg:w-[216px]\""""),
("""            <p className="mt-2 text-center text-[12px] text-faint">""",
"""            <p className="mt-1.5 text-center text-[12px] text-faint">"""),
("""        <div className="border-t border-line/60">
          <p className="px-5 pt-3 text-[12px] font-semibold text-faint">{t('last.andAlso')}</p>
          <ul className="space-y-1 px-2 pb-2">""",
"""        <div className="border-t border-line/60">
          <p className="px-5 pt-2 text-[12px] font-semibold text-faint">{t('last.andAlso')}</p>
          <ul className="px-2 pb-1.5">"""),
("""                    'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors',""",
"""                    'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-1.5 transition-colors',"""),
])

edit('src/components/ui/EnTeteDeCarte.tsx', [
("""    'bandeau flex w-full items-center gap-2.5 px-5 pb-3 pt-4 text-left',""",
"""    'bandeau flex w-full items-center gap-2.5 px-4 pb-2.5 pt-3 text-left',"""),
])
print('ok')
