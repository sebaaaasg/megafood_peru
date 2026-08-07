import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface ModuleCardProps {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

export default function ModuleCard({
  title,
  description,
  href,
  icon: Icon,
}: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group relative bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-brand-orange transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
      aria-label={`Módulo de ${title}: ${description}`}
    >
      <div>
        <div className="w-12 h-12 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green group-hover:bg-brand-orange/10 group-hover:text-brand-orange transition-colors mb-4">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-brand-orange transition-colors mb-1">
          {title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-1">
          {description}
        </p>
      </div>

      <div className="mt-6 flex items-center text-xs font-medium text-brand-green group-hover:text-brand-orange transition-colors">
        <span>Acceder al módulo</span>
        <span className="ml-1.5 group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </Link>
  )
}