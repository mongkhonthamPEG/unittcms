import { cn } from '@heroui/react';
import { ReactNode } from 'react';

interface TreeItemProps {
  style: React.CSSProperties;
  isSelected: boolean | null;
  onClick: () => void;
  toggleButton?: ReactNode;
  icon: ReactNode;
  label: string;
  actions?: ReactNode;
  className?: string;
}

export default function TreeItem({
  style,
  isSelected,
  onClick,
  toggleButton,
  icon,
  label,
  actions,
  className,
}: TreeItemProps) {
  const baseClass = '';
  const selectedClass = `${baseClass} bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 hover:bg-neutral-300`;

  return (
    <div style={style} className="box-border overflow-hidden pr-2">
      <div
        className={cn(
          'flex h-full w-full min-w-0 items-center overflow-hidden rounded-md py-1 pr-2 cursor-pointer transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-600',
          isSelected ? selectedClass : baseClass,
          className
        )}
        onClick={onClick}
      >
        <div className="shrink-0">{toggleButton || <div className="ml-2 w-6" />}</div>
        <span className="shrink-0">{icon}</span>
        <span className="ml-1.5 min-w-0 flex-1 truncate">{label}</span>
        {actions && <div className="ml-2 flex shrink-0 items-center">{actions}</div>}
      </div>
    </div>
  );
}
