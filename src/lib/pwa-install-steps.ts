import {
  Compass,
  Share2,
  SquarePlus,
  Smartphone,
  Globe,
  MoreVertical,
  Download,
} from "lucide-react";

// Compartilhado entre a landing page (seção "Instalar no celular") e a tela
// de cadastro (/auth), pra não duplicar o texto e os dois lugares ficarem
// sempre em sincronia.
export const installSteps = [
  {
    platform: "No iPhone",
    badge: "Safari",
    hint: "iPhone e iPad · precisa ser pelo Safari",
    steps: [
      {
        icon: Compass,
        title: "Abra no Safari",
        desc: "Acesse fisiogo.online pelo Safari (só ele instala no iPhone).",
      },
      {
        icon: Share2,
        title: "Toque em Compartilhar",
        desc: "É o ícone de quadrado com uma seta pra cima, na barra de baixo.",
      },
      {
        icon: SquarePlus,
        title: "Adicionar à Tela de Início",
        desc: "Role a lista e toque nessa opção.",
      },
      {
        icon: Smartphone,
        title: "Toque em Adicionar",
        desc: "Pronto! Abra o FisioGO pelo ícone novo na tela inicial.",
      },
    ],
  },
  {
    platform: "No Android",
    badge: "Chrome",
    hint: "Android · pelo Chrome (ou Edge/Samsung Internet)",
    steps: [
      {
        icon: Globe,
        title: "Abra no Chrome",
        desc: "Acesse fisiogo.online pelo navegador.",
      },
      {
        icon: MoreVertical,
        title: "Toque no menu (⋮)",
        desc: "São os três pontinhos no canto superior direito.",
      },
      {
        icon: Download,
        title: "Adicionar à tela inicial",
        desc: "Toque em \"Adicionar à tela inicial\" (o nome exato pode variar um pouco conforme a versão do Chrome).",
      },
      {
        icon: Smartphone,
        title: "Confirme e abra pelo ícone",
        desc: "Toque em \"Adicionar\". O atalho aparece na sua tela inicial.",
      },
    ],
  },
];
