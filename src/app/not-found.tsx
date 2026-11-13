import Link from 'next/link';
import { CyberButton } from '@/components/ui/CyberButton';
import { CyberCard } from '@/components/ui/CyberCard';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-24 flex flex-col justify-center font-mono text-center">
      <CyberCard glow="magenta" headerAccent="404 // SIGNAL LOST">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold uppercase text-cyber-text">
            NODE NOT FOUND
          </h2>

          <p className="text-xs text-gray-400">
            The requested cyber address or tournament link does not exist in Night City.
          </p>

          <div className="pt-2">
            <Link href="/">
              <CyberButton variant="yellow" size="sm" icon={<Home className="w-3.5 h-3.5" />}>
                RETURN TO GRID
              </CyberButton>
            </Link>
          </div>
        </div>
      </CyberCard>
    </div>
  );
}
