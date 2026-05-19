import React from 'react';

// Logo.tsx — Esportiz identidade oficial
type LogoVariant = 'default' | 'white' | 'light';

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
  variant?: LogoVariant
}

interface EsportizIconProps {
  size?: number
  variant?: LogoVariant
}

export const Logo = ({ size = "md", showTagline = false, variant = "default" }: LogoProps) => {
  const iconSize = { sm: 28, md: 40, lg: 64 }[size]
  const textSize = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" }[size]
  const textTone = variant === "white" ? "text-white" : "text-foreground"
  const taglineTone = variant === "white" ? "text-white/75" : "text-muted-foreground"

  return (
    <div className="flex items-center gap-3">
      <EsportizIcon size={iconSize} variant={variant} />
      <div>
        <span className={`font-medium tracking-tight ${textSize} ${textTone}`}>
          esport<span style={{ color: "#1DB874" }}>iz</span>
        </span>
        {showTagline && (
          <p className={`text-xs tracking-widest mt-1 font-medium ${taglineTone}`}>
            gestão esportiva inteligente
          </p>
        )}
      </div>
    </div>
  )
}

export const EsportizIcon = ({ size = 40, variant = "default" }: EsportizIconProps) => {
  const palette = variant === "default"
    ? { background: "#0D1F3C", primary: "#1DB874", accent: "#378ADD" }
    : { background: "rgba(255,255,255,0.18)", primary: "#FFFFFF", accent: "#BAE6FD" }

  return (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="16" fill={palette.background}/>
    <path d="M42 18 L22 18 L22 46 L42 46"
      stroke={palette.primary} strokeWidth="4"
      strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 32 L38 32"
      stroke={palette.primary} strokeWidth="4"
      strokeLinecap="round"/>
    <circle cx="44" cy="32" r="4.5" fill={palette.accent}/>
  </svg>
  )
}
