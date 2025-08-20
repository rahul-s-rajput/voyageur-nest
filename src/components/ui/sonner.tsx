import { Toaster as Sonner, toast } from "sonner"
import type { ComponentProps } from "react"

type ToasterProps = ComponentProps<typeof Sonner>

// Resolve theme without relying on next-themes (works in Vite)
const resolveTheme = (): ToasterProps["theme"] => {
  if (typeof document !== "undefined") {
    const html = document.documentElement
    const attr = html.getAttribute("data-theme")
    if (attr === "dark" || attr === "light") return attr as ToasterProps["theme"]
    if (html.classList.contains("dark")) return "dark"
    if (window?.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark"
    return "light"
  }
  return "system"
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = resolveTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
