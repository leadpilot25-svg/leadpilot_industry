interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { img: 'h-6 w-6', text: 'text-[13px]' },
  md: { img: 'h-8 w-8', text: 'text-[15px]' },
  lg: { img: 'h-12 w-12', text: 'text-2xl'   },
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const s = sizes[size]
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/Logo.png" alt="LeadPilot" className={`${s.img} object-contain`} />
      {showText && (
        <span className={`${s.text} font-bold tracking-tight text-gray-900`}>
          Lead<span className="text-emerald-500">Pilot</span>
        </span>
      )}
    </div>
  )
}