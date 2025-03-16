// Tremor Switch [v0.0.1]

import React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { ClassValue, tv, VariantProps } from "tailwind-variants"
import { twMerge } from "tailwind-merge"
import clsx from "clsx"

export function cx(...args: ClassValue[]) {
    return twMerge(clsx(...args))
  }
  
  // Tremor Raw focusInput [v0.0.1]
  
  export const switchFocusRing = [
    // base
    "outline outline-offset-2 outline-0 focus-visible:outline-2",
    // outline color
    "outline-blue-500 dark:outline-blue-500",
  ]

const switchVariants = tv({
  slots: {
    root: [
      // base
      "group relative isolate inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-inner outline-none transition-all",
      "bg-[#5D3014]",
      // ring color
      "ring-black/5 dark:ring-gray-800",
      // checked
      "data-[state=checked]:bg-[#121212]",
      // disabled
      "data-[disabled]:cursor-default",
      switchFocusRing,
    ],
    thumb: [
      // base
      "pointer-events-none relative inline-block transform appearance-none rounded-full border-none shadow-lg outline-none transition-all duration-150 ease-in-out",
      "bg-[#000000]",
      "data-[state=checked]:bg-[#FFD44F]", // Green for checked
      "group-data-[disabled]:shadow-none",
    ],
  },
  variants: {
    size: {
      default: {
        root: "h-6 w-14",
        thumb: "h-7 w-7 data-[state=checked]:translate-x-8 data-[state=unchecked]:translate-x-0",
      },
      small: {
        root: "h-4 w-7",
        thumb: "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
      }
    },
  },
  defaultVariants: {
    size: "default",
  },
})

interface SwitchProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
      "asChild"
    >,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size, ...props }: SwitchProps, forwardedRef) => {
  const { root, thumb } = switchVariants({ size })
  return (
    <SwitchPrimitives.Root
      ref={forwardedRef}
      className={cx(root(), className)}
      tremor-id="tremor-raw"
      {...props}
    >
      <SwitchPrimitives.Thumb className={cx(thumb())} />
    </SwitchPrimitives.Root>
  )
})

Switch.displayName = "Switch"

export { Switch }
