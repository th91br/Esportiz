import { useEffect } from 'react';
import { useProfile } from '@/hooks/queries/useProfile';

/**
 * Função para converter HEX para componentes HSL (H S% L%)
 * exigidos pelo sistema de temas do Tailwind no Esportiz.
 */
function hexToHslComponents(hex: string): string {
  // Fallback se não for um hex válido
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    // Se for o verde padrão do Esportiz, retorna o HSL dele
    if (hex === '#1DB874') return '154 73% 42%';
    // Fallback padrão (verde Esportiz)
    return '154 73% 42%';
  }

  // Remover # se existir
  hex = hex.replace(/^#/, '');

  // Se for short hex (ex: #123), converter para #112233
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  // Converter para RGB
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getContrastColor(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '216 60% 10%' : '0 0% 100%'; // Dark text or Light text
}

export function BrandStyles() {
  const { profile } = useProfile();

  useEffect(() => {
    if (!profile) {
      console.log('BrandStyles: Perfil não carregado ainda.');
      return;
    }

    // Cores Padrão (Esportiz)
    const defaultPrimary = '#1DB874';
    const defaultSecondary = '#0A1628';

    const primary = profile.primary_color || defaultPrimary;
    const secondary = profile.secondary_color || defaultSecondary;
    
    console.log('BrandStyles: Aplicando cores:', { primary, secondary });

    try {
      const primaryHsl = hexToHslComponents(primary);
      const secondaryHsl = hexToHslComponents(secondary);
      const primaryForeground = getContrastColor(primary);
      const secondaryForeground = getContrastColor(secondary);

      // Injetar ou atualizar tag <style> para garantir prioridade total
      let styleTag = document.getElementById('dynamic-branding-styles');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-branding-styles';
        document.head.appendChild(styleTag);
      }

      styleTag.innerHTML = `
        :root, 
        html, 
        html.dark, 
        body, 
        #root,
        [data-theme] {
          --primary: ${primaryHsl} !important;
          --primary-foreground: ${primaryForeground} !important;
          --secondary: ${secondaryHsl} !important;
          --secondary-foreground: ${secondaryForeground} !important;
          --accent: ${primaryHsl} !important;
          --accent-foreground: ${primaryForeground} !important;
          --ring: ${primaryHsl} !important;
          
          /* Sincronização do Menu/Sidebar */
          --sidebar-background: ${secondaryHsl} !important;
          --sidebar-foreground: ${secondaryForeground} !important;
          --sidebar-primary: ${primaryHsl} !important;
          --sidebar-primary-foreground: ${primaryForeground} !important;
          --sidebar-accent: ${primaryHsl} !important;
          --sidebar-accent-foreground: ${primaryForeground} !important;
          --sidebar-border: ${secondaryHsl} !important;
          
          --gradient-primary: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%) !important;
          --gradient-hero: linear-gradient(135deg, ${secondary} 0%, ${primary} 100%) !important;
          --gradient-card: linear-gradient(180deg, #ffffff 0%, hsl(${secondaryHsl} / 0.05) 100%) !important;
          --gradient-beach: linear-gradient(135deg, hsl(${secondaryHsl} / 0.05) 0%, hsl(${primaryHsl} / 0.05) 100%) !important;
        }

        /* Forçar aplicação em classes utilitárias e componentes */
        .bg-primary { background-color: hsl(${primaryHsl}) !important; color: hsl(${primaryForeground}) !important; }
        .text-primary { color: hsl(${primaryHsl}) !important; }
        .border-primary { border-color: hsl(${primaryHsl}) !important; }
        
        .bg-secondary { background-color: hsl(${secondaryHsl}) !important; color: hsl(${secondaryForeground}) !important; }
        .text-secondary { color: hsl(${secondaryHsl}) !important; }
        
        .btn-primary-gradient, 
        .bg-primary-gradient,
        .bg-gradient-hero,
        .text-gradient-primary {
          background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%) !important;
          color: hsl(${primaryForeground}) !important;
        }

        /* Ajustes de Header e Navegação */
        header {
          background-color: hsl(${secondaryHsl} / 0.95) !important;
        }
        header span, header a, header button:not(.btn-primary-gradient) {
          color: hsl(${secondaryForeground}) !important;
        }

        /* Sobrescrever a cor de texto padrão se for muito próxima do azul marinho antigo */
        body {
          color: hsl(${getContrastColor('#ffffff')}) !important; /* Garante que o texto principal seja legível */
        }
      `;
      
      console.log('BrandStyles: Estilos injetados com sucesso.');
    } catch (error) {
      console.error('BrandStyles: Erro ao aplicar branding:', error);
    }
  }, [profile]);

  return null;
}
