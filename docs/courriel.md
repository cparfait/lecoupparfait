# Le courriel

Le Coup Parfait n'envoie que deux messages, et jamais rien d'autre :

- la **confirmation d'adresse**, à l'inscription, quand une adresse est saisie —
  elle est facultative ;
- le **lien de réinitialisation**, quand un mot de passe est perdu.

Aucune lettre d'information, aucun traqueur d'ouverture, aucune image distante.
Les messages sont en texte brut, ce qui n'est pas une coquetterie : un message
sans partie HTML traverse mieux les filtres, et il n'y a rien à mettre en forme.

## Sans rien configurer

**En développement**, il n'y a rien à faire. Les messages sont écrits dans
`data/courriels` et se lisent sur `/dev/courriels`. C'est ce qui permet
d'éprouver une inscription de bout en bout sans serveur de messagerie, sans
adresse jetable, et sans risquer d'écrire à quelqu'un pour de vrai en essayant.

**En production sans `SMTP_URL`**, rien ne part — et l'application le sait. Elle
masque le lien « Mot de passe oublié ? », répond franchement à qui atteint la
page malgré tout, et prévient à l'inscription que l'adresse ne servira à rien.
C'est délibéré : l'écran promettait auparavant « un lien vient d'être envoyé » à
quelqu'un pour qui rien n'était parti, et qui restait bloqué sans le savoir.

Une instance peut donc très bien tourner ainsi. Le prix est clair et il est dit
à celui qui le paie : un mot de passe perdu ne se récupère pas.

## Le MTA de la pile

```bash
docker compose --profile courriel up -d
```

Trois variables dans `.env` :

```ini
MAIL_DOMAIN=coupparfait.example
MAIL_FROM=Le Coup Parfait <ne-pas-repondre@coupparfait.example>
SMTP_URL=smtp://mail:587
```

Le service ne reçoit rien, n'expose aucun port, et n'est joignable que depuis le
réseau privé de la pile. Il est branché sur les deux réseaux, et il faut les
deux : `internal` est le seul par lequel l'application le joint, mais il est
déclaré `internal: true` donc sans route vers Internet — un MTA branché là seul
accepterait les messages sans jamais pouvoir les livrer. La façade lui donne la
sortie.

## Les quatre enregistrements DNS

Sans eux, les messages partent et se font refuser. Ce n'est pas une
optimisation : Gmail et Outlook rejettent ou classent en indésirable tout ce qui
n'est pas authentifié.

Relève d'abord la clé publique générée au premier démarrage :

```bash
docker compose exec mail cat /etc/opendkim/keys/coupparfait.example.txt
```

| Sous-domaine | Type | Valeur |
|---|---|---|
| `mail` | A | l'IP publique du serveur |
| `@` | TXT | `v=spf1 ip4:<ton-IP> -all` |
| `mail._domainkey` | TXT | la clé relevée ci-dessus |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:postmaster@coupparfait.example` |

Et un cinquième, qui ne se pose pas dans la zone : le **PTR** (DNS inverse) de
l'IP doit pointer sur `mail.coupparfait.example`. Il se règle chez l'hébergeur,
dans la fiche de l'IP — chez OVH, dans l'espace client, section « IP ». Une IP
sans PTR cohérent est refusée d'entrée par une bonne partie des serveurs, avant
même que SPF ou DKIM ne soient regardés.

Commence par `p=none` sur DMARC, qui n'applique aucune sanction et se contente
de faire remonter des rapports. On durcit en `p=quarantine` puis `p=reject`
une fois qu'on a vérifié que les rapports sont propres.

## Ce qu'il faut vérifier avant tout le reste

**Le port 25 sortant.** OVH le bloque par défaut sur les VPS. Ça se lève depuis
l'espace client, mais tant que ce n'est pas fait, rien ne partira et le MTA
accumulera silencieusement une file d'attente.

```bash
docker compose exec mail nc -zv gmail-smtp-in.l.google.com 25
```

**La file d'attente**, quand un message ne semble pas arriver :

```bash
docker compose exec mail mailq
docker compose logs mail --tail 50
```

## Ce qu'un MTA dédié ne règle pas

La délivrabilité se joue d'abord sur la réputation de l'**IP sortante**, pas sur
le conteneur ni sur le domaine. Deux applications hébergées sur la même machine
partagent cette IP : leur donner des MTA distincts leur donne des identités DKIM
séparées, jamais des réputations séparées. Si l'une des deux émet du courrier
mal reçu, l'autre en hérite.

Quand cette séparation compte vraiment, il faut une seconde IP — « IP
additionnelle » chez OVH — et lier le service dessus. C'est la seule frontière
que les serveurs de réception regardent.

## Brancher un relais existant

`SMTP_URL` accepte n'importe quel relais, auquel cas le profil `courriel` est
inutile :

```ini
SMTP_URL=smtp://utilisateur:motdepasse@hote:587
SMTP_TLS_STRICT=1
```

`SMTP_TLS_STRICT=1` rétablit la vérification du certificat, à mettre dès que le
relais est distant. Elle est relâchée par défaut parce que le MTA de la pile
présente un certificat auto-signé sur un réseau privé, où l'exiger
n'apporterait rien et empêcherait simplement la connexion.
