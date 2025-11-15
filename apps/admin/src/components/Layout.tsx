import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-full w-full safe-area-insets overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}





