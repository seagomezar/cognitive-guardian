// extension/i18n.js
const I18n = {
  defaultLocale: "en",
  locales: ["en", "es", "pt", "fr"],
  messages: {
    en: {
      subtitle: "Your digital immune system.",
      status_inactive: "Inactive",
      status_monitoring: "Monitoring...",
      btn_start: "Start Guardian",
      btn_stop: "Stop Guardian",
      lang_label: "Language:",
      mock_procrastination:
        "You've been doomscrolling for a while. Do you want to return to your task?",
      mock_phishing:
        "Looks like Phishing: Check the sender. This email asks for credentials.",
      mock_fakenews: "Low validity news: We detected sensationalist language.",
      mock_burnout:
        "You've been focused too long without a break. Maybe you should take a 5-minute break.",
      feedback_ask: "Was this helpful?",
      feedback_yes: "Yes",
      feedback_no: "No",
      feedback_thanks: "Thanks for your feedback!",
      feedback_placeholder: "How can we improve? (Optional)",
      feedback_submit: "Send",
      consent_label: "I agree to share my screen and tab info for analysis.",
      consent_error: "You must accept the terms to start the Guardian.",
      terms_link: "Terms & About",
      about_title: "About Cognitive Guardian",
      about_content:
        "Cognitive Guardian acts as your digital immune system. It takes anonymous snapshots of your active tab solely to detect manipulation patterns (Phishing, Fake News) and burnout. Data is sent to an ADK model and discarded immediately after analysis. We do not store your browsing history. This project was built for the Gemini Live Agent Challenge.",
      btn_analytics: "View Analytics",
      analytics_title: "Your Stats",
      stat_helped: "Times Helped",
      stat_rejected: "Rejected Advice",
      mute_label: "Mute audio alerts",
    },
    es: {
      subtitle: "Tu sistema inmunológico digital.",
      status_inactive: "Inactivo",
      status_monitoring: "Monitoreando...",
      btn_start: "Iniciar Guardián",
      btn_stop: "Detener Guardián",
      lang_label: "Idioma:",
      mock_procrastination:
        "Llevas un rato haciendo doomscrolling. ¿Quieres volver a tu tarea?",
      mock_phishing:
        "Parece Phishing: Revisa el remitente. Este correo pide credenciales.",
      mock_fakenews:
        "Noticia de validez baja: Detectamos lenguaje sensacionalista.",
      mock_burnout:
        "Llevas demasiado tiempo enfocado sin descanso. Quizá deberías tomar un break de 5 minutos.",
      feedback_ask: "¿Te resultó útil?",
      feedback_yes: "Sí",
      feedback_no: "No",
      feedback_thanks: "¡Gracias por tu feedback!",
      feedback_placeholder: "¿En qué podemos mejorar? (Opcional)",
      feedback_submit: "Enviar",
      consent_label:
        "Acepto compartir mi pantalla y pestañas para el análisis.",
      consent_error: "Debes aceptar los términos para iniciar el Guardián.",
      terms_link: "Términos y Acerca de",
      about_title: "Acerca de Cognitive Guardian",
      about_content:
        "Cognitive Guardian actúa como tu sistema inmunológico digital. Toma capturas anónimas de tu pestaña activa únicamente para detectar patrones de manipulación (Phishing, Fake News) y burnout. Los datos se envían a un modelo ADK y se descartan inmediatamente después del análisis. No guardamos tu historial de navegación. Este proyecto fue construido para el Gemini Live Agent Challenge.",
      btn_analytics: "Ver Estadísticas",
      analytics_title: "Tus Estadísticas",
      stat_helped: "Veces de Ayuda",
      stat_rejected: "Rechazados",
      mute_label: "Silenciar alertas de audio",
    },
    pt: {
      subtitle: "Seu sistema imunológico digital.",
      status_inactive: "Inativo",
      status_monitoring: "Monitorando...",
      btn_start: "Iniciar Guardião",
      btn_stop: "Parar Guardião",
      lang_label: "Idioma:",
      mock_procrastination:
        "Você está fazendo doomscrolling há algum tempo. Quer voltar à sua tarefa?",
      mock_phishing:
        "Parece Phishing: Verifique o remetente. Este e-mail pede credenciais.",
      mock_fakenews:
        "Notícia de baixa validade: Detectamos linguagem sensacionalista.",
      mock_burnout:
        "Você está focado há muito tempo sem descanso. Talvez você deva fazer uma pausa de 5 minutos.",
      feedback_ask: "Isso foi útil?",
      feedback_yes: "Sim",
      feedback_no: "Não",
      feedback_thanks: "Obrigado pelo seu feedback!",
      feedback_placeholder: "Como podemos melhorar? (Opcional)",
      feedback_submit: "Enviar",
      consent_label:
        "Concordo em compartilhar minha tela e guias para análise.",
      consent_error: "Você deve aceitar os termos para iniciar o Guardião.",
      terms_link: "Termos e Sobre",
      about_title: "Sobre o Cognitive Guardian",
      about_content:
        "O Cognitive Guardian atua como seu sistema imunológico digital. Ele tira capturas anônimas da sua guia ativa apenas para detectar padrões de manipulação (Phishing, Fake News) e esgotamento. Os dados são enviados para um modelo ADK e descartados imediatamente após a análise. Não armazenamos seu histórico de navegação. Este projeto foi desenvolvido para o Gemini Live Agent Challenge.",
      btn_analytics: "Ver Estatísticas",
      analytics_title: "Suas Estatísticas",
      stat_helped: "Vezes Ajudou",
      stat_rejected: "Conselhos Rejeitados",
      mute_label: "Silenciar alertas de áudio",
    },
    fr: {
      subtitle: "Votre système immunitaire numérique.",
      status_inactive: "Inactif",
      status_monitoring: "Surveillance...",
      btn_start: "Démarrer le Gardien",
      btn_stop: "Arrêter le Gardien",
      lang_label: "Langue :",
      mock_procrastination:
        "Vous faites du doomscrolling depuis un moment. Voulez-vous retourner à votre tâche ?",
      mock_phishing:
        "Cela ressemble à du Phishing : Vérifiez l'expéditeur. Cet e-mail demande des identifiants.",
      mock_fakenews:
        "Nouvelle de faible validité : Nous avons détecté un langage sensationnaliste.",
      mock_burnout:
        "Vous êtes concentré depuis trop longtemps sans pause. Vous devriez peut-être prendre une pause de 5 minutes.",
      feedback_ask: "Était-ce utile ?",
      feedback_yes: "Oui",
      feedback_no: "Non",
      feedback_thanks: "Merci pour vos commentaires !",
      feedback_placeholder:
        "Comment pouvons-nous nous améliorer ? (Facultatif)",
      feedback_submit: "Envoyer",
      consent_label:
        "J'accepte de partager mon écran et mes onglets pour l'analyse.",
      consent_error:
        "Vous devez accepter les conditions pour démarrer le Gardien.",
      terms_link: "Conditions et À propos",
      about_title: "À propos de Cognitive Guardian",
      about_content:
        "Cognitive Guardian agit comme votre système immunitaire numérique. Il prend des captures anonymes de votre onglet actif uniquement pour détecter des modèles de manipulation (Phishing, Fake News) et d'épuisement. Les données sont envoyées à un modèle ADK et supprimées immédiatement après analyse. Nous ne conservons pas votre historique de navigation. Ce projet a été créé pour le Gemini Live Agent Challenge.",
      btn_analytics: "Voir Statistiques",
      analytics_title: "Vos Statistiques",
      stat_helped: "Fois Aidé",
      stat_rejected: "Avis Rejetés",
      mute_label: "Désactiver les alertes audio",
    },
  },

  async getCurrentLocale() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["cg_language"], (result) => {
        if (result.cg_language) {
          resolve(result.cg_language);
        } else {
          try {
            const browserLang = chrome.i18n.getUILanguage().split("-")[0];
            const lang = this.locales.includes(browserLang)
              ? browserLang
              : this.defaultLocale;
            resolve(lang);
          } catch (e) {
            resolve(this.defaultLocale);
          }
        }
      });
    });
  },

  async setLocale(locale) {
    if (this.locales.includes(locale)) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ cg_language: locale }, resolve);
      });
    }
  },

  tSync(locale, key) {
    return (
      this.messages[locale]?.[key] ||
      this.messages[this.defaultLocale]?.[key] ||
      key
    );
  },
};
