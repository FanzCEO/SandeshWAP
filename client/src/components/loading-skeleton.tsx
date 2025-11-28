import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'text' | 'card' | 'file' | 'code';
  animate?: boolean;
}

export function Skeleton({ 
  className, 
  lines = 1, 
  variant = 'text',
  animate = true 
}: SkeletonProps) {
  const baseClass = cn(
    'rounded-md bg-muted',
    animate && 'animate-pulse',
    className
  );

  if (variant === 'card') {
    return (
      <div className={cn('p-4 space-y-3', className)}>
        <div className={cn(baseClass, 'h-4 w-3/4')} />
        <div className={cn(baseClass, 'h-3 w-full')} />
        <div className={cn(baseClass, 'h-3 w-5/6')} />
      </div>
    );
  }

  if (variant === 'file') {
    return (
      <div className="flex items-center space-x-2 p-2">
        <div className={cn(baseClass, 'w-4 h-4')} />
        <div className={cn(baseClass, 'h-3 flex-1')} />
      </div>
    );
  }

  if (variant === 'code') {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex space-x-2">
            <div className={cn(baseClass, 'h-4 w-12')} />
            <div className={cn(baseClass, 'h-4', `w-${Math.random() > 0.5 ? 'full' : '3/4'}`)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn(baseClass, 'h-3', i === lines - 1 && 'w-3/4')} />
      ))}
    </div>
  );
}

export function FileTreeSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={i} 
          className="animate-fadeIn"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton variant="file" animate />
        </div>
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="h-full bg-background p-4">
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={i}
            className="flex space-x-2 animate-fadeIn"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="w-10 h-4 bg-muted rounded animate-pulse" />
            <div className={cn(
              'h-4 bg-muted rounded animate-pulse',
              i % 3 === 0 ? 'w-full' : i % 2 === 0 ? 'w-3/4' : 'w-1/2'
            )} />
          </div>
        ))}
      </div>
    </div>
  );
}