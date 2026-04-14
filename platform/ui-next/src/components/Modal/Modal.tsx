import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../Dialog';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  contentClassName?: string;
  shouldCloseOnEsc?: boolean;
  shouldCloseOnOverlayClick?: boolean;
  containerClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  shouldCloseOnEsc = true,
  shouldCloseOnOverlayClick = true,
  containerClassName,
}) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      shouldCloseOnEsc={shouldCloseOnEsc}
      shouldCloseOnOverlayClick={shouldCloseOnOverlayClick}
    >
      <DialogContent
        className={containerClassName}
        {...(!description ? { 'aria-describedby': undefined } : {})}
      >
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={cn('mt-2')}>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
