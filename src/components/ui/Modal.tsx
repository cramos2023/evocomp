import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/modules/job-evaluation/lib/utils"
import { LAYERS } from "@/constants/layers"

const Modal = DialogPrimitive.Root
const ModalTrigger = DialogPrimitive.Trigger
const ModalPortal = DialogPrimitive.Portal

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 bg-slate-950/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={{ zIndex: LAYERS.MODAL_OVERLAY }}
    {...props}
  />
))
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  }
>(({ className, children, size = 'md', ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] grid w-full translate-x-[-50%] translate-y-[-50%] gap-0 border bg-[rgb(var(--surface-card))] shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl overflow-hidden flex flex-col max-h-[90vh]",
        size === 'sm' && "max-w-sm",
        size === 'md' && "max-w-md",
        size === 'lg' && "max-w-2xl",
        size === 'xl' && "max-w-4xl",
        size === 'fullscreen' && "max-w-[95vw] h-[95vh]",
        className
      )}
      style={{ zIndex: LAYERS.MODAL_CONTENT }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg opacity-40 ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-800 p-2 text-[rgb(var(--text-primary))] hover:bg-slate-800">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ModalPortal>
))
ModalContent.displayName = DialogPrimitive.Content.displayName

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-left p-6 border-b border-[rgb(var(--border))]",
      className
    )}
    {...props}
  />
)
ModalHeader.displayName = "ModalHeader"

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-[rgb(var(--text-primary))]",
      className
    )}
    {...props}
  />
))
ModalTitle.displayName = DialogPrimitive.Title.displayName

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-[rgb(var(--text-secondary))]", className)}
    {...props}
  />
))
ModalDescription.displayName = DialogPrimitive.Description.displayName

const ModalBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto p-6 custom-scrollbar", className)} {...props} />
)
ModalBody.displayName = "ModalBody"

const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 border-t border-[rgb(var(--border))]",
      className
    )}
    {...props}
  />
)
ModalFooter.displayName = "ModalFooter"

export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalBody,
}
