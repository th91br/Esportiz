import React from 'react';

// Logo.tsx — Esportiz identidade oficial
interface LogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
}

export const Logo = ({ size = "md", showTagline = false }: LogoProps) => {
  const iconSize = { sm: 28, md: 40, lg: 64 }[size]
  const textSize = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" }[size]

  return (
    <div className="flex items-center gap-3">
      <EsportizIcon size={iconSize} />
      <div>
        <span className={`font-medium tracking-tight ${textSize}`}>
          esport<span style={{ color: "#1DB874" }}>iz</span>
        </span>
        {showTagline && (
          <p className="text-xs tracking-widest text-muted-foreground mt-1 font-medium">
            gestão esportiva inteligente
          </p>
        )}
      </div>
    </div>
  )
}

export const EsportizIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="16" fill="#0D1F3C"/>
    <path d="M42 18 L22 18 L22 46 L42 46"
      stroke="#1DB874" strokeWidth="4"
      strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 32 L38 32"
      stroke="#1DB874" strokeWidth="4"
      strokeLinecap="round"/>
    <circle cx="44" cy="32" r="4.5" fill="#378ADD"/>
  </svg>
)
