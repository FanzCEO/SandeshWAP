import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  variant = 'default' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex gap-1', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'bg-primary rounded-full',
              size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'
            )}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={cn(
          'bg-primary rounded-full',
          sizeClasses[size],
          className
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.3, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex gap-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'bg-primary',
              size === 'sm' ? 'w-1 h-4' : size === 'lg' ? 'w-2 h-12' : 'w-1.5 h-8'
            )}
            animate={{
              scaleY: [1, 1.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        'border-2 border-primary/20 border-t-primary rounded-full',
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}

export function LoadingOverlay({ 
  message = "Loading...",
  fullScreen = false 
}: { 
  message?: string;
  fullScreen?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : "p-8"
      )}
    >
      <LoadingSpinner size="lg" />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}