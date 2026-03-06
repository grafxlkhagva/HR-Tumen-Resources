'use client';

import React, { useState } from 'react';
import {
  AppDialog,
  AppDialogContent,
  AppDialogTitle,
  AppDialogFooter,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { AlertCircle, LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldCardProps {
  /** Icon displayed in the top-right corner */
  icon: LucideIcon;
  /** Field label/title */
  title: string;
  /** Optional helper text shown under title */
  subtitle?: string;
  /** Current value to display */
  value: React.ReactNode;
  /** Show warning indicator when value is empty/missing */
  isEmpty?: boolean;
  /** Whether this field is editable */
  editable?: boolean;
  /** Whether the position is approved (locks some fields) */
  isLocked?: boolean;
  /** Content to render inside the edit dialog - can be ReactNode or render function with close callback */
  editContent?: React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Called when save is clicked - return promise to show loading state */
  onSave?: () => Promise<void> | void;
  /** Custom dialog title (defaults to field title) */
  dialogTitle?: string;
  /** Disable the card interaction */
  disabled?: boolean;
  /** Additional className for the card */
  className?: string;
  /** Hide the footer with save/cancel buttons */
  hideFooter?: boolean;
}

export function FieldCard({
  icon: Icon,
  title,
  subtitle,
  value,
  isEmpty = false,
  editable = true,
  isLocked = false,
  editContent,
  onSave,
  dialogTitle,
  disabled = false,
  className,
  hideFooter = false,
}: FieldCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = editable && !isLocked && !disabled && editContent;

  // Support render function for editContent
  const closeDialog = () => setIsOpen(false);
  const renderedContent = typeof editContent === 'function' ? editContent(closeDialog) : editContent;

  const handleSave = async () => {
    if (!onSave) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      setIsOpen(false);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setIsOpen(true)}
        disabled={!canEdit}
        style={{
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          if (canEdit) {
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)';
        }}
        className={cn(
          'relative flex flex-col items-start p-5 rounded-2xl border border-transparent bg-white dark:bg-slate-900 text-left transition-all duration-200',
          'min-h-[120px]',
          canEdit && 'hover:border-primary/20 cursor-pointer',
          !canEdit && 'cursor-default opacity-80',
          isLocked && 'bg-slate-50 dark:bg-slate-800/50',
          className
        )}
      >
        {/* Icon in top-right */}
        <div className="absolute top-4 right-4">
          <Icon className={cn('w-6 h-6', isEmpty ? 'text-slate-300 dark:text-slate-600' : 'text-primary')} />
        </div>

        {/* Title */}
        <div className="pr-10 mb-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>

        {/* Value */}
        <div className={cn('text-sm flex-1', isEmpty ? 'text-muted-foreground italic' : 'text-muted-foreground')}>
          {value}
        </div>

        {/* Empty indicator */}
        {isEmpty && (
          <div className="absolute bottom-4 right-4">
            <AlertCircle className="w-4 h-4 text-amber-500" aria-label="Мэдээлэл дутуу" />
          </div>
        )}

        {/* Locked indicator */}
        {isLocked && (
          <div className="absolute bottom-4 left-4">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Түгжээтэй</span>
          </div>
        )}
      </button>

      {/* Edit Dialog */}
      {canEdit && (
        <AppDialog open={isOpen} onOpenChange={setIsOpen}>
          <AppDialogContent size="sm" closeTone="primary" className="p-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-8 pb-5">
              <AppDialogTitle className="text-xl font-semibold text-center">
                {dialogTitle || title}
              </AppDialogTitle>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-4">{renderedContent}</div>

            {/* Footer */}
            {!hideFooter && (
              <AppDialogFooter className="bg-slate-50 dark:bg-slate-800/50">
                <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} disabled={isSaving}>
                  Цуцлах
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving} className="min-w-[110px]">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Хадгалах'}
                </Button>
              </AppDialogFooter>
            )}
          </AppDialogContent>
        </AppDialog>
      )}
    </>
  );
}

// Labeled input for use inside FieldCard dialogs
interface LabeledInputProps {
  label: string;
  children: React.ReactNode;
}

export function LabeledInput({ label, children }: LabeledInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

