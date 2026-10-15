/** French Privacy Policy (coded fallback for the Admin-managed /privacy-policy page). */
export type PrivacySection = {
  number: number;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string[];
};

export const PRIVACY_LAST_UPDATED_FR = "1er juin 2026";

export function privacySectionsFr(siteFullName: string): PrivacySection[] {
  return [
    {
      number: 1,
      title: "Qui nous sommes",
      paragraphs: [
        `${siteFullName} (ci-après « CAISBE », « nous », « notre » ou « nos ») est un institut international de connaissances, de formation et de développement professionnel dont le siège est situé au 815-4AVE SW, Calgary (Alberta) T2P 5N7, Canada.`,
        "Nous nous engageons à respecter votre vie privée et à protéger vos renseignements personnels conformément à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada et aux lois provinciales applicables en matière de protection de la vie privée.",
      ],
    },
    {
      number: 2,
      title: "Renseignements que nous recueillons",
      paragraphs: ["Nous pouvons recueillir les catégories suivantes de renseignements personnels :"],
      bullets: [
        "Données d’identité et de contact : nom, adresse courriel, adresse postale, numéro de téléphone, organisation et titre du poste.",
        "Données de compte : identifiants de connexion et détails du profil lorsque vous vous inscrivez au portail étudiant ou aux services d’adhésion.",
        "Données financières : détails de carte de paiement traités de façon sécurisée par notre fournisseur de paiement tiers; nous ne conservons pas les numéros complets de carte.",
        "Historique d’inscription et d’adhésion : cours, programmes, adhésions, montants, dates et dossiers de transaction connexes.",
        "Données de communication : messages que vous nous envoyez au moyen de notre formulaire de contact, par courriel, par l’inscription à l’infolettre ou sur les médias sociaux.",
        "Données techniques : adresse IP, type de navigateur, système d’exploitation, pages consultées et temps passé sur le site, recueillis automatiquement au moyen de témoins et d’outils d’analyse.",
      ],
    },
    {
      number: 3,
      title: "Comment nous utilisons vos renseignements",
      paragraphs: ["Nous utilisons vos renseignements personnels pour :"],
      bullets: [
        "Traiter les inscriptions aux cours, les adhésions et les paiements, et émettre des reçus ou des certificats, le cas échéant.",
        "Envoyer des mises à jour de programmes, des communications d’apprentissage, des avis d’événements et des infolettres institutionnelles (uniquement avec votre consentement ou lorsque la loi le permet).",
        "Répondre à vos demandes et offrir du soutien aux apprenants ou aux membres.",
        "Respecter nos obligations légales, y compris les exigences de déclaration financière et réglementaire.",
        "Améliorer notre site Web, nos cours et nos communications grâce à des analyses anonymisées.",
        "Prévenir la fraude et assurer la sécurité de nos systèmes.",
      ],
    },
    {
      number: 4,
      title: "Fondement juridique du traitement",
      paragraphs: [
        "Nous traitons vos renseignements personnels sur les fondements suivants : a) votre consentement explicite lorsqu’il est requis; b) l’exécution d’un contrat (traitement de votre inscription, de votre adhésion ou de votre paiement); c) le respect d’une obligation légale; et d) nos intérêts légitimes à exploiter un institut éducatif et professionnel efficace, dans la mesure où ces intérêts ne l’emportent pas sur vos droits.",
      ],
    },
    {
      number: 5,
      title: "Communication de vos renseignements",
      paragraphs: [
        "Nous ne vendons, ne louons ni n’échangeons vos renseignements personnels. Nous pouvons les communiquer à :",
      ],
      bullets: [
        "Des fournisseurs de paiement (p. ex., Stripe) pour effectuer votre paiement en toute sécurité.",
        "Des plateformes de courriel que nous utilisons pour envoyer des infolettres, des reçus et des communications de cours, sous réserve d’ententes de traitement des données.",
        "Des conseillers professionnels (vérificateurs, conseillers juridiques) tenus à des obligations strictes de confidentialité.",
        "Des autorités réglementaires lorsque la loi l’exige.",
      ],
      closing: [
        "Tous les fournisseurs de services tiers sont tenus de protéger vos renseignements et de ne les utiliser qu’aux fins que nous précisons.",
      ],
    },
    {
      number: 6,
      title: "Témoins et technologies de suivi",
      paragraphs: [
        "Notre site Web utilise des témoins et des technologies similaires pour améliorer votre expérience et analyser la fréquentation du site. Vous pouvez gérer les témoins dans les paramètres de votre navigateur; toutefois, la désactivation de certains témoins peut nuire au fonctionnement du site.",
        "Nous utilisons Google Analytics (avec l’anonymisation des adresses IP activée) pour comprendre la façon dont les visiteurs interagissent avec notre site. Vous pouvez vous désinscrire au moyen du module complémentaire de navigateur de désactivation de Google Analytics.",
      ],
    },
    {
      number: 7,
      title: "Conservation des données",
      paragraphs: [
        "Nous conservons vos renseignements personnels aussi longtemps que nécessaire pour réaliser les fins décrites dans la présente politique, ou comme l’exige la loi. Les dossiers d’inscription, d’adhésion et de paiement sont conservés pendant au moins sept (7) ans afin de respecter les exigences financières et réglementaires applicables. Lorsqu’elles ne sont plus nécessaires, les données sont supprimées de façon sécurisée ou anonymisées.",
      ],
    },
    {
      number: 8,
      title: "Vos droits",
      paragraphs: ["Vous avez le droit de :"],
      bullets: [
        "Accéder aux renseignements personnels que nous détenons à votre sujet.",
        "Corriger les renseignements inexacts ou incomplets.",
        "Retirer votre consentement en tout temps lorsque le traitement repose sur celui-ci (p. ex., vous désabonner des courriels de marketing).",
        "Demander la suppression de vos données, sous réserve des obligations légales de conservation.",
        "Déposer une plainte auprès du Commissariat à la protection de la vie privée du Canada (CPVP) si vous estimez que nous avons traité vos renseignements de façon inappropriée.",
      ],
      closing: ["Pour exercer l’un de ces droits, veuillez nous écrire à info@caisbe.org."],
    },
    {
      number: 9,
      title: "Sécurité",
      paragraphs: [
        "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos renseignements personnels contre l’accès non autorisé, la perte ou la destruction. Les transactions de paiement sont chiffrées au moyen de la technologie TLS/SSL conforme aux normes de l’industrie.",
      ],
    },
    {
      number: 10,
      title: "Liens vers des sites tiers",
      paragraphs: [
        "Notre site Web peut contenir des liens vers des sites tiers. Nous ne sommes pas responsables des pratiques de ces sites en matière de confidentialité et vous encourageons à consulter leurs politiques de confidentialité avant de leur fournir des renseignements personnels.",
      ],
    },
    {
      number: 11,
      title: "Vie privée des enfants",
      paragraphs: [
        "Notre site Web ne s’adresse pas aux enfants de moins de 16 ans. Nous ne recueillons pas sciemment de renseignements personnels auprès d’enfants sans le consentement parental vérifiable. Si vous croyez qu’un enfant nous a fourni des renseignements personnels, veuillez communiquer avec nous afin que nous les supprimions.",
      ],
    },
    {
      number: 12,
      title: "Modifications de la présente politique",
      paragraphs: [
        "Nous pouvons mettre à jour la présente politique de confidentialité de temps à autre. La version révisée sera publiée sur cette page avec une date de « dernière mise à jour » actualisée. Les modifications importantes seront communiquées par courriel aux utilisateurs inscrits dont nous détenons l’adresse courriel.",
      ],
    },
    {
      number: 13,
      title: "Nous joindre",
      paragraphs: [
        "Si vous avez des questions, des préoccupations ou des demandes concernant la présente politique de confidentialité ou nos pratiques en matière de données, veuillez communiquer avec notre responsable de la protection de la vie privée :",
        `${siteFullName} (CAISBE)\n815-4AVE SW, Calgary (Alberta) T2P 5N7\nCanada\nCourriel : info@caisbe.org`,
        "Vous pouvez aussi communiquer avec le Commissariat à la protection de la vie privée du Canada si vos préoccupations en matière de vie privée demeurent sans réponse.",
      ],
    },
  ];
}
