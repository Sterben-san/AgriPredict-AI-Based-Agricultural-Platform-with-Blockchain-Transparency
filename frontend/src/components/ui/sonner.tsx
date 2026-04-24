import { Toaster as SonnerToaster } from "sonner"

const Toaster = (props: React.ComponentProps<typeof SonnerToaster>) => {
  return <SonnerToaster theme="system" className="toaster group" {...props} />
}

export { Toaster }
